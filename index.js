const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// دالة المحاولة مع النماذج المتاحة
async function askGemini(parts, apiKey) {
  // قائمة النماذج المتاحة للتنقل بينها في حال وجود ضغط على أحدها
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: parts }] })
        }
      );

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return { success: true, text: data.candidates[0].content.parts[0].text };
      }
    } catch (e) {
      continue;
    }
  }

  return { success: false };
}

app.post('/api/chat', async (req, res) => {
  const { message, media } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ reply: 'خطأ: لم يتم إضافة GEMINI_API_KEY في إعدادات Vercel!' });
  }

  try {
    const parts = [];
    if (message) parts.push({ text: message });

    if (media && Array.isArray(media)) {
      media.forEach(item => {
        const matches = item.data.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          parts.push({
            inline_data: {
              mime_type: matches[1],
              data: matches[2]
            }
          });
        }
      });
    }

    if (parts.length === 0) parts.push({ text: 'مرحبا' });

    const result = await askGemini(parts, apiKey);

    if (result.success) {
      return res.status(200).json({ reply: result.text });
    } else {
      return res.status(500).json({ reply: 'السيرفر مشغول حالياً، يرجى المحاولة بعد لحظات.' });
    }

  } catch (error) {
    return res.status(500).json({ reply: 'خطأ في الاتصال: ' + error.message });
  }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Server running on port 3000'));
}
