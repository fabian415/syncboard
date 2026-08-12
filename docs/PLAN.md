# SyncBoard 改版計畫：拿掉登入、以「天」為單位的條列式進度報告

## Context

SyncBoard 目前已是一個可運作的完整系統（Node.js/Express/Prisma + Vue3/Vite/Pinia，PostgreSQL 透過 Docker Compose），具備 JWT 登入（manager/RD 角色）、RD 撰寫 Markdown 週報＋AI Refactor 生成兩頁 HTML 簡報、主管 Combine 彙整多人週報、全螢幕簡報檢視器等功能，且已在瀏覽器中完整驗證過。

使用者提供了團隊實際在用的報告檔 `docs/2026-08-07_BiWeeklyReport.xlsx`，並希望依照這份真實資料重新設計：

- 拿掉登入帳號機制。
- 以「專案」為第一層，點入專案後，才是每個人可編輯自己要報告的部分。
- 每人的報告改為「以天為單位」的條列式進度（而不是「一週」的敘事型週報），並提供一個對應 Excel 欄位（Status / Task Type / Description / Progress / Comment）的填寫模板。
- RD 填完後按 Refactor 生成簡報；主管（或任何人）可以再把當天所有人的報告合併生成彙總簡報。
- AI 產生的內容一律可再次手動編輯（此點沿用現有設計，不變）。

**解析 `docs/2026-08-07_BiWeeklyReport.xlsx` 的結果**（用 Python 直接解壓 xlsx 讀取 `xl/sharedStrings.xml` + `xl/worksheets/sheet1.xml`，因環境未安裝 openpyxl/pandas/xlsx 套件）：
- 欄位：`Member | Status | Task Type | Description | Start Date | End Date | Progress | Comment`
- 資料以「只有 A 欄有值」的列作為專案分段標題：`Physical AI`、`GenAI Studio & LLM`、`DeviceOn`、`EPD`、`Project & Others`
- 分段底下每一列＝一個任務項目，例如 `Member=Alex, Status=Done, Task Type=New Feature, Description="• Phison inference integration\n > Merge to backend..."`，`Status` 有 Done/Ongoing/Pending，`Task Type` 有 New Feature/Enhancement/Support/Others，`Progress` 是 0–1 的小數，`Comment` 有時是文件連結。同一人在同一專案下可能有多筆任務列（如 Alex 在 GenAI Studio & LLM 底下有 3 筆）。

現有系統「一筆報告 = (project, user, date)」的儲存結構本來就已經是「以天為單位」，這部分不需要改；真正要改的是：**移除登入／權限系統**、**把 API 的身份來源從 JWT 改成 URL 參數**、**把預設 Markdown 模板與 AI prompt 的一次性範例，從「一週敘事」改成「當天多個條列任務項目」**、**前端拿掉登入頁與角色守衛，改成「專案列表→點成員名字→進入該成員的編輯頁」**。

架構性決策（技術棧、Prisma/檔案儲存分工、Docker Compose、頁面兩頁封頂＋`<!-- SLIDE -->`分頁協定、AI tag/class 白名單）維持不變，只調整身份/權限與內容模板部分。

---

## 1. Prisma Schema 變更

**檔案：`server/prisma/schema.prisma`**

- `User`：拿掉 `passwordHash` 欄位。保留 `role`（`MANAGER`/`RD`）與 `email`——`role` 純粹做顯示/篩選用途（不再用於任何權限判斷），`email` 只當內部唯一鍵給 `seed.js` upsert 用，UI 上不會顯示。
- `CombinedReport.generatedBy`：`String` → `String?`（可為 null）。原本從 `req.user.id` 帶入，拿掉登入後「誰按了 Combine」已無身份可記，直接存 `null`。
- `Project`、`ProjectMember`、`Report`：**不需要改**，本來就已經是 `(projectId, userId, reportDate)` / `(projectId, userId)` / `(projectId, reportDate)` 的每日／專案／成員鍵值結構。

**執行方式**（本機單人開發用 Postgres，目前資料都是 demo 資料，无需保留）：
1. 改完 schema 後，於 `server/` 產生一般的遞增 migration（`npx prisma migrate dev` 在此非互動環境會卡住，改為手動寫入等效的 `migration.sql` 檔案）。
2. 因為第 7 節整套換掉種子資料（新的 5 個專案、新的成員名單），接著執行 `npx prisma migrate reset --force`（重建 DB、重放所有 migration、並依 `server/package.json` 的 `prisma.seed` 設定自動跑新的 `seed.js`），一次讓 DB 狀態乾淨對齊新 schema + 新名單。
3. 手動清空 `storage/*`（保留 `.gitkeep`）——舊資料夾是用已被刪除的 demo `projectId`/`userId` UUID 命名，reset 後永遠不會再被參照到，直接刪除即可（非 Prisma 範疇），再重跑一次 `node prisma/seed.js` 讓範例報告的實體檔案落地。

---

## 2. 後端刪除／調整

### 直接刪除的檔案
- `server/src/middleware/auth.js`
- `server/src/middleware/requireRole.js`
- `server/src/modules/auth/`（`auth.controller.js` / `auth.routes.js` / `auth.service.js` 全部，含目錄本身）

### `server/package.json`
移除 `bcrypt`、`jsonwebtoken` 依賴。

### `server/src/config/env.js`、`server/.env.example`、`server/.env`
拿掉 `JWT_SECRET`／`JWT_EXPIRES_IN`。

### `server/src/middleware/requireProjectMember.js`（保留檔名，改身份來源）
`userId` 改從 `req.params.userId` 讀（不再是 `req.user.id`），查無成員時回 404（不是 403，因為已經沒有「未授權」的概念，只是「這個網址對應不到真實成員」）。

### `server/src/app.js`
拿掉 `authRouter` 的 import 與掛載，其餘（cors、json、`/api/health`、production 靜態檔案、`errorHandler`）不變。

### API 路由對照表（舊 → 新）

| 舊路由 | 新路由 |
|---|---|
| `POST /api/auth/login`、`GET /api/auth/me` | 刪除 |
| `GET /api/projects`（限 `req.user.id` 所屬專案） | `GET /api/projects`（回傳全部專案，不篩選） |
| `GET /api/projects/:projectId`（需成員資格） | `GET /api/projects/:projectId`（任何人可看） |
| `GET/PUT/POST /api/projects/:projectId/reports/:date/...`（RD 專用，身份來自 JWT） | `GET/PUT/POST /api/projects/:projectId/members/:userId/reports/:date/...` |
| `GET /api/projects/:projectId/members/:userId/reports/:date`（MANAGER 專用，需 SUBMITTED） | 併入上一列，無角色限制、無狀態限制 |
| `GET/PUT/POST /api/projects/:projectId/combined/:date...`（MANAGER 專用） | 相同路徑，拿掉角色限制 |

`server/src/modules/projects/projects.routes.js` 新內容：
```js
projectsRouter.get('/', listProjectsHandler);
projectsRouter.get('/:projectId', getProjectHandler);
projectsRouter.use('/:projectId/members/:userId/reports', requireProjectMember, reportsRouter);
projectsRouter.use('/:projectId/combined', combinedRouter);
```
不再有 `authenticate`／`requireRole`／獨立的 `memberReportHandler`。

`server/src/modules/reports/reports.routes.js`：拿掉每行的 `requireRole('RD')`，保留 `{mergeParams:true}`。

### `projects.service.js` / `projects.controller.js`
`listProjectsForUser(userId, date)` → `listProjects(date)`：改成 `prisma.project.findMany()` 撈全部專案，不再依成員資格過濾。

`getProjectDetail(projectId, date)` 簽名不變，成員清單多回傳一個 `hasPresentation: report?.htmlPath != null` 欄位，供前端判斷「預覽」按鈕是否可按（不再用 `status === 'SUBMITTED'` 當條件，因為現在誰都能看誰的草稿）。

### `combined.controller.js` / `combined.service.js`
`combineProject`/`saveCombinedHtml` 拿掉 `generatedByUserId`/`userId` 參數，upsert 時 `generatedBy` 不帶值（存 `null`）。其餘邏輯（只抓 `SUBMITTED` 的報告來源、串接 markdown、呼叫 AI）不變。

---

## 3. `reports.service.js` / `reports.controller.js` 變更

- 刪除 `getMemberReportForManager`（連同它的 SUBMITTED-only 404 限制）。
- `getOwnReport(projectId, userId, date)` 改名為 `getMemberReport(projectId, userId, date)`，內容不變（本來就沒有狀態限制，直接回傳目前檔案/DB 上的東西）。
- `saveMarkdown`／`submitReport`／`refactorReport`／`saveHtml` 簽名不變（已經是 `(projectId, userId, date, ...)`）。
- Controller 端把所有 `req.user.id` 換成 `req.params.userId`；刪除 `memberReportHandler`（邏輯併入 `getReportHandler`）。

---

## 4. 新的預設 Markdown 模板

**檔案：`client/src/constants/defaultMarkdown.js`** — 從「一週敘事」改成「當天多個條列任務項目」，直接對應 Excel 欄位（Status / Task Type / 內容 / 進度 / 備註），並保留阻礙事項與相關連結兩個固定段落。

---

## 5. AI Prompt 更新

`ai/pageSplitter.js`、`ai/slideGenerator.js`、HTML tag/class 白名單、`<!-- SLIDE -->` 分頁協定、1–2 頁上限**全部不變**，只改 `ai/refactorPrompt.js`／`ai/combinePrompt.js` 的一次性範例內容與「週報」相關措辭：

- `refactorPrompt.js`：範例改成 Rafael/DeviceOn 風格的「當天多個任務項目」，第一頁＝今日任務項目＋重點說明，第二頁＝阻礙事項＋相關連結。
- `combinePrompt.js`：範例改成多位成員「當天」進度彙總，輸入分隔改用 `## 成員: 姓名 (職稱)`（原本是 `## RD: ...`，因為現在不分角色），第一頁＝團隊今日核心進度＋專案價值對齊，第二頁＝各成員下一步＋需協調事項。

---

## 6. 前端路由／導覽重新設計

### 新路由表（無 `/login`、無角色守衛）

| 路徑 | 元件 | 說明 |
|---|---|---|
| `/` | redirect | → `/projects` |
| `/projects` | `views/ProjectListView.vue`（原 `ManagerProjectListView.vue` 改名） | 全域專案列表 |
| `/projects/:projectId` | `views/ProjectDetailView.vue`（原 `ManagerProjectDetailView.vue` 改名） | 成員名單＋Combine 區塊 |
| `/projects/:projectId/members/:userId` | `views/MemberEditorView.vue`（原 `RdEditorView.vue` 改名） | 該成員的編輯頁，預設今天 |

### 直接刪除
- `client/src/views/LoginView.vue`、`client/src/stores/auth.js`、`client/src/api/auth.js`

### 其餘調整
- `main.js`：拿掉 `useAuthStore().init()`。
- `api/http.js`：拿掉 `setAuthToken`，只留 `axios.create({baseURL:'/api'})`。
- `components/common/AppHeader.vue`：拿掉角色徽章、使用者名稱、登出按鈕，變成純品牌標頭。
- `views/ProjectListView.vue`：文案拿掉「本週」→「今日」。
- `views/ProjectDetailView.vue`：拿掉 `.filter(m => m.role === 'RD')` 改顯示全部成員；「預覽」按鈕改用 `hasPresentation` 判斷是否可按；`MemberReportRow` 姓名區塊新增可點擊，emit `edit` → `router.push` 到該成員的編輯頁；文案「{date} 週報」→「{date} 進度」。
- `components/manager/MemberReportRow.vue`：disable 條件改用 `!member.hasPresentation`；姓名區塊包一層可點擊、emit `edit`；「預覽原版簡報」按鈕加 `@click.stop`。
- `components/manager/ProjectCard.vue`：文案「本週報告繳交進度」→「今日繳交進度」。
- `components/manager/CombineBanner.vue`：邏輯不需要改（角色限制原本就都在路由守衛與後端，拿掉後自然變成任何人可觸發），只更新說明文案的「本週/下週」→「今日」措辭。
- `views/MemberEditorView.vue`：拿掉 `useAuthStore`；`projectId`/`userId` 改從路由參數取得；用 `projects.loadDetail(projectId)` 找出對應成員的名字/職稱；標題文案「撰寫週報：{project.name}」→「撰寫今日進度：{project.name} - {member.name}」；新增返回專案詳情的連結；HTML 編輯器 chrome 檔名標籤 `weekly_report.md` → `daily_report.md`。
- `api/reports.js`：每個函式加上 `userId` 參數，網址改成 `/projects/:projectId/members/:userId/reports/:date/...`；`getOwnReport` 與原本 manager 專用的讀取函式合併成單一 `getMemberReport(projectId, userId, date)`。
- `stores/report.js`：state 新增 `userId`，所有 action 改用 `this.projectId`/`this.userId`/`this.date` 呼叫新版 API。

### 確認不需要改的檔案
`layouts/MainLayout.vue`、`App.vue`、`components/presentation/PresentationModal.vue`、`components/common/{AiProcessingOverlay,StatusBadge}.vue`、`components/rd/{MarkdownEditor(除檔名文案),HtmlSourceEditor,EditorTabs}.vue`、`stores/{presentation,projects,ui}.js`、`utils/{date,slides}.js`、`styles/presentation.css`、`server/src/ai/{pageSplitter,slideGenerator}.js`、`docker-compose.yml`、`client/package.json`。

`client/src/components/rd/` 與 `components/manager/` 資料夾名稱維持不變，只有 3 個 *view* 檔案改名。

---

## 7. 種子資料

整套換成依真實 Excel 內容改寫的種子資料（不保留舊的 DeviceOn/Alice/Bob/Charlie）：

- **專案**（5 個，對應 Excel 的分段標題）：`Physical AI`、`GenAI Studio & LLM`、`DeviceOn`、`EPD`、`Project & Others`。
- **成員**：`Fabian`（`MANAGER`）＋ `Alex`、`TungYi`、`Iris`、`Jim`、`Rafael`、`Scott`、`WunHuei`（`RD`），email 用 `xxx@syncboard.dev` 純內部識別、UI 不顯示。
- **ProjectMember**：依 Excel 實際出現的專案/成員對應關係建立，`Fabian`（MANAGER）掛所有 5 個專案。
- 額外幫 Rafael（DeviceOn）與 Alex（GenAI Studio & LLM）的「今天」各種一筆真實內容的 `Report`（含 `storage/` 下的 markdown 檔案），方便 clone 下來就能直接示範 AI Refactor／Combine。
- `seed.js` 拿掉所有 `bcrypt`/`passwordHash` 邏輯，改成單純的 `prisma.user.upsert({email, name, role})`，並直接呼叫 `fsStore.js` 的 `writeTextFile`/`reportMarkdownPath` 寫入範例報告檔案。

---

## 8. 執行順序（已完成）

1. Schema 變更 + migration。
2. 後端刪除／設定（auth 模組、JWT env、bcrypt/jsonwebtoken 依賴）。
3. 後端路由／服務改寫（`requireProjectMember`、`projects`/`reports`/`combined` 模組、`app.js`）。
4. AI 模板更新（`defaultMarkdown.js`、`refactorPrompt.js`、`combinePrompt.js`）。
5. 前端改寫（刪除登入、路由、3 個 view 改名、components、stores、api）。
6. 重寫 `seed.js`（5 專案／8 人名單，含範例 Report）。
7. `migrate reset` + 清空並重新種入 `storage/`。
8. 全流程手動驗證（見下方「驗證方式」，已用 browser-automation 全部跑過一次並通過）。

---

## 驗證方式（已執行並通過）

- 開啟首頁直接進 `/projects`，**沒有**出現任何登入畫面。
- 看到 5 個種子專案，各自的今日繳交進度正確。
- 點一個專案進去，看到完整成員名單（含 MANAGER 與 RD，沒有被篩掉）。
- 點一個成員名字，進入 `/projects/:id/members/:userId`，看到新的「今日進度」條列式模板已預先帶入姓名與日期。
- 對已有種子內容的 Rafael／Alex 直接按「AI Refactor」，用真實 Azure OpenAI 端點驗證：產出恰為 1–2 頁、套用現有 CSS 樣式、內容措辭是「今日任務項目／阻礙事項」而非「本週／下週」。
- 提交報告後回到專案詳情頁，任何人都能直接按「產生/播放 AI 彙總簡報」（不需要任何角色判斷），彙總內容正確反映新的當日框架與各成員下一步。
- 全螢幕簡報檢視器的 Page x/y 計數與 ArrowRight 翻頁皆正常運作。

---

## 9. 後續改版：個人雙週報 + AI 分送到專案（2026-08-11）

在上述「拿掉登入、以天為單位」的版本上線後，使用者提供了團隊真正在用的簡報模板 `docs/template.md`（Marp 格式，`## 📦 Product：X` 分區、每區含核心重點／補充說明／下週計畫／討論阻礙／相關連結五個子區塊），並要求改成：

- **從個人角度出發**：每位成員依模板填寫「自己」這期的工作內容（可能橫跨多個 Product/專案），而不是進到某個專案才開始寫。
- **週期改為雙週**（對齊 template.md 標題「雙週報」）：新增 `currentPeriodStartISO()`（前後端各一份、共用 2024-01-01 Monday 起算的 14 天分桶邏輯），取代原本以「今天」為準的日期，`ProjectListView`/`ProjectDetailView`/`MemberEditorView` 全部改用這個「本期」日期。
- **新增「我的報告」入口**（`/members` → `/members/:userId/report`，與特定專案無關）：`MyReportView.vue` 讓成員填寫一份涵蓋「所有自己所屬專案」的 Markdown（模板依 `ProjectMember` 自動列出對應的 `## 📦 Product：X` 分區，見 `client/src/constants/personalReportTemplate.js`），存檔後按「AI Refactor 並分送到各專案」。
- **分送邏輯**（`server/src/modules/memberReports/`）：後端解析 Markdown 裡每個 `## 📦 Product：X` 分區（`parseProductSections`），依名稱比對成員實際所屬的專案，對每個比對成功的分區呼叫 AI（`server/src/ai/personalReportPrompt.js`，強調「忠於原文、僅做文字潤飾、不可省略或新增內容」，恰好輸出 2 頁），把結果寫進**原本就存在**的 `Report`（`projectId, userId, reportDate=periodStart`）的 `markdownPath`／`htmlPath`，所以專案頁看到的仍是同一套資料，不需要另外改 `ProjectDetailView` 的讀取邏輯。無法比對到專案的分區會列在 `unmatched` 回傳給前端提示。
- **新增資料表** `MemberReport`（`userId, periodStart, markdownPath`）只存放這份「個人來源文件」，跟各專案的 `Report` 是分開的兩份東西——前者是輸入來源，後者是（可再手動編輯的）輸出簡報，兩者透過分送動作連接。
- **維持原本專案內直接編輯 Markdown 的功能**（`MemberEditorView.vue` 不變，只是 date 改成期間起始日）：使用者可以用個人模板整批分送，也可以事後直接進某個專案手動修改該專案的內容，兩條路徑寫入的是同一筆 `Report`。
- 已用 browser-automation 實測：WunHuei 填寫涵蓋 DeviceOn／Project & Others 兩個 Product 的雙週報 → 存檔 → AI Refactor 並分送 → 兩個專案的成員報告皆正確更新，且 AI 輸出內容與原文一一對應（僅語句潤飾，如「url」→「URL」、「UIUX」→「UI/UX」），空白的「補充說明／阻礙」子區塊會被正確省略而非留空 `<div>`。
