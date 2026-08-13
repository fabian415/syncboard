# SyncBoard

會議簡報平台：無需登入，以專案為單位，每位成員撰寫當天的條列式進度 Markdown，AI 自動生成全螢幕、兩頁封頂的 HTML 簡報；任何人都能在專案頁裡把當天所有成員的報告合併生成彙總簡報。

技術棧：Node.js + Express + Prisma（純 JavaScript）／Vue 3 + Vite + Pinia + Tailwind CSS（純 JavaScript）／PostgreSQL（Docker Compose）。

完整架構設計請見 [docs/PLAN.md](docs/PLAN.md)。

## 環境需求

- Node.js 20+
- Docker（用於本機啟動 PostgreSQL）

## 第一次設定

```bash
# 1. 安裝所有 workspace 的依賴
npm install

# 2. 啟動 PostgreSQL（docker-compose.yml 只包含這一個 service）
npm run db:up

# 3. 設定 server 環境變數
cp server/.env.example server/.env
# 編輯 server/.env，填入：
#   - AI_BASE_URL / AI_API_KEY / AI_MODEL：OpenAI 相容的 Chat Completions API
#     （若尚未有可用的 AI 服務，Refactor / Combine 功能會回傳 502 錯誤，
#      其餘功能：Markdown 編輯、儲存、提交、專案列表都不受影響）

# 4. 建立資料表並灌入 migration
npm run prisma:migrate

# 5. 建立種子專案與成員名單
npm run prisma:seed
```

種子資料是依團隊實際的 `docs/2026-08-07_BiWeeklyReport.xlsx` 改寫：

| 專案 | 成員 |
|---|---|
| Physical AI | TungYi、Iris、Jim、Fabian |
| GenAI Studio & LLM | Alex、Scott、Fabian |
| DeviceOn | TungYi、Rafael、Scott、WunHuei、Fabian |
| Project & Others | WunHuei、Iris、Fabian |

（Fabian 為 MANAGER，其餘為 RD；種子腳本另外幫 Rafael、Alex 的「今天」各種了一筆範例報告內容，方便直接示範 AI Refactor / Combine。）

## 開發

```bash
npm run dev
```

會同時啟動：
- 後端 http://localhost:3000（`server/src/index.js`，nodemon 監看重啟）
- 前端 http://localhost:5173（Vite dev server，`/api` 會 proxy 到後端）

打開 http://localhost:5173 即直接進入專案列表，不需要登入。

## 常用指令

| 指令 | 說明 |
|---|---|
| `npm run dev` | 同時啟動前後端開發伺服器 |
| `npm run db:up` / `npm run db:down` | 啟動／停止 PostgreSQL container |
| `npm run prisma:migrate` | 執行 Prisma migration |
| `npm run prisma:seed` | 重新灌入種子資料 |
| `npx prisma studio`（於 `server/` 目錄下） | 開啟資料庫瀏覽介面 |

## 資料存放位置

- 結構化資料（使用者、專案、報告狀態、時間戳）存在 PostgreSQL。
- Markdown 原稿與 AI 生成的 HTML 簡報實體檔案存在 `storage/{projectId}/{userId}/{YYYY-MM-DD}/`，專案彙整簡報存在 `storage/{projectId}/combined/{YYYY-MM-DD}/`。此資料夾內容不進版控（見 `.gitignore`）。

## 正式環境建置

```bash
npm run build -w client
```

`server/src/app.js` 在 `NODE_ENV=production` 時會直接 serve `client/dist` 的靜態檔案（SPA fallback），可作為單一部署單位運行。
