# Realtime-AI-Streamer

一個輕量級的 **AI 即時串流回應 (Streaming Response)** 概念驗證 (PoC) 專案。展示如何使用 Node.js 後端結合 Ollama 實現低延遲的文字串流傳輸，並在前端進行流暢的即時 Markdown 渲染。

本專案**無需連接資料庫**，專注於解決 AI 應用開發中核心的串流邊界切割、首字延遲 (TTFT) 計算以及非同步中斷等工程細節。

---

## 🚀 核心功能

1. **穩定即時串流回應 (Stream Response)**
   - 後端透過 `ollama-js` 的 `AsyncGenerator` 穩定讀取模型輸出，並透過 **Server-Sent Events (SSE)** 協定推送到前端，解決純手工解析串流常見的資料斷開與邊界切割問題。
2. **關鍵效能指標監控 (Metrics)**
   - 精確計算並即時呈現**首字延遲 (TTFT, Time to First Token)** 以及**總生成耗時**，便於量化評估本地模型的推論效能。
3. **優化版即時 Markdown 渲染**
   - 前端整合 `marked.js` 並優化 `breaks` 參數，動態解析 AI 生成過程中的單次換行、雙次換行及粗體語法，提供如同 ChatGPT/Claude 般的平滑閱讀體驗。

---

## 🛠️ 技術棧

- **後端 (Backend):** Node.js, Express, TypeScript, `ollama-js`
- **前端 (Frontend):** Vanilla JavaScript (原生傳輸處理), `marked.js`
- **通訊協定 (Protocol):** Server-Sent Events (SSE) over HTTP POST
- **AI 模型 (LLM):** Ollama (`llama3.1:8b`，預設設定 `temperature = 0` 以確保生成內容的事實一致性與可預測性)

---

## 📋 環境需求

- **Node.js**: v18 或以上版本
- **Ollama**: 已安裝並於本地端運行 (預設網址為 `http://localhost:11434`)
- **本地模型**: 已下載 `llama3.1:8b`。若尚未下載，請執行：
  ```bash
  ollama pull llama3.1:8b

```

---

## 📦 安裝與執行步驟

### 1. 安裝依賴套件

```bash
npm install

```

### 2. 設定環境變數

複製 `.env.example` 並重新命名為 `.env`，根據需求調整設定（預設值適用於標準本地 Ollama 環境）：

```env
PORT=3000
OLLAMA_HOST=http://localhost:11434
MODEL_NAME=llama3.1:8b

```

### 3. 啟動開發伺服器

專案使用 `ts-node` 直接運行 TypeScript 進入點：

```bash
npx ts-node src/index.ts

```

### 4. 訪問前端介面

開啟瀏覽器並造訪 `http://localhost:3000` 即可開始體驗。

---

## 📂 專案結構

```text
Realtime-AI-Streamer/
├── src/
│   ├── index.ts         # Express 伺服器進入點、靜態檔案託管與 SSE 路由
│   └── ollama.ts        # 封裝 ollama-js 串流呼叫與 TTFT/總耗時計算邏輯
├── public/
│   └── index.html       # 前端 UI 介面與 Fetch ReadableStream 緩衝處理邏輯
├── package.json
├── tsconfig.json
└── .env                 # 環境變數設定檔

```

---

## 💡 技術細節與實作考量

### 1. 為什麼選擇 SSE over HTTP POST？

在 AI 文本生成的場景中，通常只需要後端單向、持續地將字元推送到前端。

* **捨棄 WebSocket**：WebSocket 屬於雙向全雙工通訊，架構較為沉重，需要處理連線心跳、斷線重連等複雜機制。
* **選擇 SSE (Server-Sent Events)**：SSE 是 HTML5 標準協定，原生支援單向串流輸出，輕量且基於常規 HTTP 協定，維護成本低。
* **結合 POST 方法**：傳統 SSE 多使用 GET 請求，但 AI 應用通常包含大量的系統提示詞 (System Prompt) 與歷史對話上下文。改用 **HTTP POST 搭配 Chunked Transfer Encoding**，能完美避開 GET 請求的 URL 長度限制。

### 2. 串流邊界處理與防碎裂機制 (Stream Buffer)

在網路傳輸過程中，TCP 封包的切片（Chunk）是隨機的，常會發生一個完整的 JSON 字串（例如 `{"response": "text"}`）在中間被硬生生切斷，導致前端直接進行 `JSON.parse()` 時拋出語法錯誤。

* **後端實作**：藉由 `ollama-js` 的 `AsyncGenerator` 迭代器特性，確保每次拿到的都是模型產出的完整 Token，再以 `data: ...\n\n` 的標準 SSE 格式寫入 Response 串流。
* **前端實作**：在 `public/index.html` 中透過 `ReadableStream` 的 Reader 讀取二進位資料，並建立一個字串緩衝區 (Buffer)。唯有當偵測到完整的 SSE 結束符號時才進行解碼與解析，確保極端的網路環境下連線依然強健。

### 3. Markdown 即時渲染與排版優化

標準的 Markdown 規範中，單一換行符（`\n`）在渲染時會被視為空格，必須連續輸入兩個換行符才會被視為換段。然而，大語言模型（LLM）在生成條列式內容或程式碼時，往往習慣直接輸出單一換行。

* 如果直接套用預設的 Markdown 渲染器，會導致 AI 輸出的換行排版全部擠在一起。
* **解決方案**：本專案在配置前端 `marked.js` 時，特別開啟了 `breaks: true` 參數。這讓 AI 生成的單次換行能被正確轉譯為 `<br>`，確保前端畫面與模型輸出的排版完全同步，大幅提升閱讀流暢度。