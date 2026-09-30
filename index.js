const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  const { message, image } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ reply: 'خطأ: لم يتم إضافة GEMINI_API_KEY في إعدادات Vercel!' });
  }

  try {
    // قائمة بالنماذج المتاحة والمدعومة حالياً من Google Gemini
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro'];
    let replyText = null;
    let lastError = null;

    const parts = [];
    if (message) {
      parts.push({ text: message });
    }
    if (image) {
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inline_data: {
            mime_type: matches[1],
            data: matches[2]
          }
        });
      }
    }

    if (parts.length === 0) {
      parts.push({ text: 'مرحبا' });
    }

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: parts }]
            })
          }
        );

        const data = await response.json();
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          replyText = data.candidates[0].content.parts[0].text;
          break;
        } else {
          lastError = data.error?.message || `Status: ${response.status}`;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (replyText) {
      return res.status(200).json({ reply: replyText });
    } else {
      return res.status(500).json({ reply: 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي: ' + lastError });
    }

  } catch (error) {
    return res.status(500).json({ reply: 'خطأ في الاتصال بالسيرفر: ' + error.message });
  }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Server running on port 3000'));
}
