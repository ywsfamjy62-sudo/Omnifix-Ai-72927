const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { message, images, plan } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!message && (!images || images.length === 0)) {
      return res.status(400).json({ reply: 'يرجى إدخال نص أو وسائط.' });
    }

    if (!apiKey) {
      return res.status(500).json({ reply: 'خطأ: لم يتم ضبط GEMINI_API_KEY في Vercel.' });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // استخدام موديل gemini-1.5-flash لمنع خطأ 404
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: `أنت مساعد OmniFix AI. الباقة الحالية: ${plan || 'العادية'}. أجب بدقة وبشكل ممتد وحل المشاكل الأكواد والنصوص.`
      });

      const contents = [];
      if (message) contents.push(message);

      if (images && Array.isArray(images)) {
        images.forEach(img => {
          if (img.startsWith('data:image')) {
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
      return res.status(500).json({ reply: 'خطأ بالسيرفر: ' + error.message });
    }
  }

  return res.status(200).send('OmniFix AI API Server Ready');
};
