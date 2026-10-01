const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// قائمة بأسماء النماذج بالترتيب للربط المباشر
const MODEL_ENDPOINTS = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
];

app.post('/api/chat', async (req, res) => {
  const { message, media } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ reply: 'خطأ: لم يتم إضافة GEMINI_API_KEY في Vercel!' });
  }

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

  let lastError = '';

  // تجربة النماذج المتاحة تلقائياً لحين الحصول على رد
  for (const endpoint of MODEL_ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      });

      const data = await response.json();

      if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({ reply: data.candidates[0].content.parts[0].text });
      } else if (data.error?.message) {
        lastError = data.error.message;
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(500).json({ reply: `عذراً، فشل الاتصال بالنماذج: ${lastError}` });
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Server running on port 3000'));
}
