const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// عرض الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// معالجة طلبات المحادثة لدعم مفاتيح AQ الجديدة بمرونة
app.post('/api/chat', async (req, res) => {
  const { message, images, plan } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ reply: 'خطأ: لم يتم إضافة GEMINI_API_KEY في إعدادات Vercel!' });
  }

  try {
    // تجهيز محتوى الرسائل
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

    // إرسال الطلب المباشر لتفادي أخطاء المكتبة مع المفاتيح الجديدة (AQ)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم استلام نص.';
    return res.status(200).json({ reply: replyText });

  } catch (error) {
    return res.status(500).json({ reply: 'خطأ في الاتصال: ' + error.message });
  }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Server running on port 3000'));
}
