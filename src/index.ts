import express, { Request, Response } from 'express'; // 引入 Request, Response 型別
import cors from 'cors';
import dotenv from 'dotenv';
import { streamChat } from './ollama';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中介軟體
app.use(cors());
app.use(express.json());

app.use(express.static('public'));

// 定義 Request Body 的型別介面
interface StreamRequestBody {
  prompt: string;
}

// SSE 串流 API
// 將泛型傳入 Request<Params, ResBody, ReqBody, Query>
// 這裡我們只關心 ReqBody (第三個泛型)，所以前兩個傳 undefined 或空物件即可
app.post('/api/stream', async (req: Request<{}, {}, StreamRequestBody>, res: Response) => {

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // 設定 SSE 必要的 Header
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = streamChat(prompt);

    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    const errorEvent = { type: 'error', data: 'Server stream iteration error' };
    res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});