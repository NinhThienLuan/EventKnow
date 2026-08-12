import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'EventKnow', version: '1.0.0' });
  });

  // AI Event Analysis Endpoint powered by Gemini Server-Side
  app.post('/api/analyze', async (req, res) => {
    try {
      const { prompt, sourceIds } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt in request body' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY not configured. Returning local fallback synthesis.');
        return res.json({
          status: 'fallback',
          message: 'Trích xuất dữ liệu từ Kho lưu trữ địa phương EventKnow DB (Offline/Fallback mode).',
          prompt
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `Bạn là Trợ lý Tri thức Sự kiện Chuyên nghiệp "EventKnow" dành cho quản lý dữ liệu sự kiện, hội thảo khoa học và tổ chức công nghệ tại Việt Nam.
Khi nhận được câu hỏi phân tích, hãy tạo ra báo cáo phân tích tổng hợp bằng Tiếng Việt mang phong cách báo cáo công vụ/doanh nghiệp cao cấp.
Bạn phải trả về kết quả dưới dạng JSON tuân thủ cấu trúc sau:
{
  "title": "Tiêu đề báo cáo phân tích ngắn gọn",
  "summaryParagraphs": ["Đoạn văn 1 có chèn mã trích dẫn dạng [EVT-2024-08] hoặc [VN-AI-CONF-01]...", "Đoạn văn 2..."],
  "keyInsights": ["Điểm nổi bật 1", "Điểm nổi bật 2", "Điểm nổi bật 3"],
  "recommendedActions": ["Khuyến nghị 1", "Khuyến nghị 2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summaryParagraphs: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              keyInsights: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              recommendedActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['title', 'summaryParagraphs', 'keyInsights']
          }
        }
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText);

      return res.json({
        status: 'success',
        prompt,
        data: parsed
      });
    } catch (err: any) {
      console.error('Error generating AI analysis:', err);
      return res.status(500).json({
        error: 'Failed to generate AI analysis',
        details: err?.message || String(err)
      });
    }
  });

  // Vite Middleware in Development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EventKnow server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});