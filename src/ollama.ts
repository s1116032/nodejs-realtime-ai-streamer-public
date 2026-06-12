import { Ollama } from 'ollama';

// 從環境變數讀取設定，預設 fallback
const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });
const modelName = process.env.MODEL_NAME || 'llama3.1:8b';

// 定義串流事件的型別，方便前端辨識
export interface StreamEvent {
  type: 'ttft' | 'token' | 'done' | 'error';
  data: string;
}

export async function* streamChat(prompt: string): AsyncGenerator<StreamEvent> {
  const startTime = performance.now();
  let firstTokenReceived = false;

  try {
    // 呼叫 ollama chat API，啟用 stream
    const response = await ollama.chat({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      options: {
        temperature: 0 // 確保溫度為 0
      }
    });

    // 使用 for await 迭代串流
    for await (const chunk of response) {
      // 計算首字延遲
      if (!firstTokenReceived) {
        const ttft = performance.now() - startTime;
        yield { type: 'ttft', data: `${ttft.toFixed(0)} ms` };
        firstTokenReceived = true;
      }

      // 回傳文字 token
      if (chunk.message.content) {
        yield { type: 'token', data: chunk.message.content };
      }
    }

    // 串流結束，計算總耗時
    const totalTime = performance.now() - startTime;
    yield { type: 'done', data: `${totalTime.toFixed(0)} ms` };

  } catch (error: any) {
    // 錯誤處理
    yield { type: 'error', data: error.message || 'Ollama 串流發生未知錯誤' };
  }
}