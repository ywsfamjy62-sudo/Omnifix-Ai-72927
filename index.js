const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { message, image, plan } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!message && !image) {
      return res.status(400).json({ reply: 'يرجى إدخال نص أو إرفاق صورة.' });
    }

    if (!apiKey) {
      return res.status(500).json({ reply: 'خطأ: لم يتم ضبط مفتاح GEMINI_API_KEY في Vercel.' });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: `أنت مساعد OmniFix AI الذكي. الباقة الحالية للمستخدم هي: ${plan || 'الباقة العادية'}. أجب على كافة الأسئلة بدقة عالية واكتب الكود واشرحه وتحليل الصور عند إرفاقها.`
      });

      const contents = [];
      if (message) contents.push(message);

      if (image) {
        const base64Data = image.split(',')[1] || image;
        const mimeType = image.split(';')[0].split(':')[1] || 'image/jpeg';
        contents.push({
          inlineData: { data: base64Data, mimeType: mimeType }
        });
      }

      const result = await model.generateContent(contents);
      const response = await result.response;

      return res.status(200).json({ reply: response.text() || 'لم يتم استلام رد.' });
    } catch (error) {
      return res.status(500).json({ reply: 'خطأ بالسيرفر: ' + (error.message || 'خطأ غير معروف') });
    }
  }

  return res.status(200).send('OmniFix APK Server is running!');
};
