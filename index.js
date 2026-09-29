const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// نقطة استقبال الرسائل من الواجهة
app.post('/api/chat', async (req, res) => {
  const { message, images, plan } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ reply: 'خطأ: لم يتم إضافة GEMINI_API_KEY في Vercel!' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `أنت مساعد OmniFix AI. الباقة الحالية: ${plan || 'العادية'}.`
    });

    const contents = [];
    if (message) contents.push(message);

    if (images && Array.isArray(images)) {
      images.forEach(img => {
        if (typeof img === 'string' && img.startsWith('data:image')) {
          const base64Data = img.split(',')[1];
          const mimeType = img.split(';')[0].split(':')[1] || 'image/jpeg';
          contents.push({ inlineData: { data: base64Data, mimeType } });
        }
      });
    }

    const result = await model.generateContent(contents);
    const response = await result.response;

    return res.status(200).json({ reply: response.text() });
  } catch (error) {
    return res.status(500).json({ reply: 'خطأ من الذكاء الاصطناعي: ' + error.message });
  }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Server running on port 3000'));
}
  
