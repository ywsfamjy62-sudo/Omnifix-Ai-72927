const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ reply: 'خطأ: لم يتم إضافة OPENROUTER_API_KEY في Vercel!' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://72927.vercel.app',
        'X-Title': 'OmniFix AI'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'user', content: message || 'مرحبا' }
        ]
      })
    });

    const data = await response.json();

    if (response.ok && data.choices && data.choices[0]?.message?.content) {
      return res.status(200).json({ reply: data.choices[0].message.content });
    } else {
      const errDetail = data.error?.message || 'تعذر استلام رد من النموذج.';
      return res.status(500).json({ reply: 'عذراً: ' + errDetail });
    }

  } catch (error) {
    return res.status(500).json({ reply: 'خطأ في الاتصال بالسيرفر: ' + error.message });
  }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Server running on port 3000'));
}
