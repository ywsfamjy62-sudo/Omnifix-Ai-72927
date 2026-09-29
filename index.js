const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  const { message, images, plan } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ reply: 'خطأ: لم يتم إضافة GEMINI_API_KEY في إعدادات Vercel!' });
  }

  try {
    const parts = [];
    if (message) parts.push({ text: message });

    if (images && Array.isArray(images)) {
      images.forEach(img => {
        if (typeof img === 'string' && img.startsWith('data:image')) {
          const base64Data = img.split(',')[1];
          const mimeType = img.split(';')[0].split(':')[1] || 'image/jpeg';
          parts.push({
            inline_data: { mime_type: mimeType, data: base64Data }
          });
        }
      });
    }

    // 1. جلب قائمة النماذج المتاحة لمفتاحك تلقائياً لتفادي أخطاء 404
    const modelsListResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const modelsListData = await modelsListResp.json();

    if (!modelsListResp.ok) {
      return res.status(500).json({
        reply: `خطأ في المفتاح: ` + (modelsListData.error?.message || 'المفتاح غير صالح')
      });
    }

    // اختيار أول نموذج يدعم توليد المحتوى (GenerateContent)
    const availableModel = modelsListData.models?.find(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    );

    if (!availableModel) {
      return res.status(500).json({ reply: 'لم يتم العثور على نموذج يدعم توليد المحتوى في حسابك.' });
    }

    const activeModelName = availableModel.name; // مثل models/gemini-2.5-flash

    // 2. إرسال الطلب إلى النموذج المتاح تلقائياً
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${activeModelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          systemInstruction: {
            parts: [{ text: `أنت مساعد OmniFix AI. الباقة الحالية: ${plan || 'العادية'}.` }]
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        reply: `خطأ من جوجل (${response.status}): ` + (data.error?.message || 'تعذر معالجة الطلب')
      });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'تم استلام رد فارغ.';
    return res.status(200).json({ reply: replyText });

  } catch (error) {
    return res.status(500).json({ reply: 'خطأ في الاتصال: ' + error.message });
  }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Server running on port 3000'));
}
