const EXAMPLE_MARKDOWN = `# 🗓 Rafael 的每日進度｜2026-08-11

## 項目一：DeviceOn Java17 升級 + OTA 更新流程
- **狀態**：Ongoing
- **類型**：New Feature
- **內容**：
  - App 端：完成 RESTful API 串接
  - Docker Compose：完成資料表 schema 設計
  - 下一步：串接 OTA 更新觸發流程
- **進度**：60%
- **備註**：無

## 項目二：Installer 安全性檢查
- **狀態**：Done
- **類型**：Enhancement
- **內容**：
  - 完成 installer 完整性檢查機制
  - 通過 runtime 測試
- **進度**：100%
- **備註**：詳見 [KMS 文件](#)

---

## 🔥 阻礙 / 需協助事項
- 需要 DevOps 協助釋出 staging 環境的 OTA 測試機

## 🔗 相關連結
- 設計文件：[點擊前往 Confluence](#)`;

const EXAMPLE_HTML = `<h1>🗓 Rafael 的每日進度｜2026-08-11</h1>
<h2>1. 今日任務項目 (Task Items)</h2>
<ul>
  <li><strong>[Ongoing・New Feature]</strong> DeviceOn Java17 升級 + OTA 更新流程：App 端 RESTful API 已完成、Docker Compose 資料表 schema 已完成，進度 60%</li>
  <li><strong>[Done・Enhancement]</strong> Installer 安全性檢查：完成完整性檢查機制並通過 runtime 測試，進度 100%</li>
</ul>
<h2>2. 重點說明 (Highlights)</h2>
<div class="card">
  <ul>
    <li><strong>進度重點</strong>：OTA 更新流程主體開發完成過半，Installer 安全性項目已收尾。</li>
    <li><strong>下一步</strong>：串接 OTA 更新觸發流程。</li>
  </ul>
</div>
<!-- SLIDE -->
<h1>📌 阻礙事項與相關連結</h1>
<h2>1. 🔥 需協助 / 阻礙事項 (Blockers)</h2>
<div class="card warning">
  <ul>
    <li><strong>資源請求</strong>：需要 DevOps 協助釋出 staging 環境的 OTA 測試機</li>
  </ul>
</div>
<h2>2. 🔗 相關文件連結 (Links)</h2>
<div class="kms-link">
  <ul>
    <li>設計文件：<a href="#">點擊前往 Confluence</a></li>
  </ul>
</div>`;

const SYSTEM_PROMPT = `你是 SyncBoard 平台的簡報排版引擎，負責把一位團隊成員撰寫的 Markdown 每日進度記錄，轉換成全螢幕簡報用的 HTML 片段。

嚴格規則：
1. 只能輸出純 HTML 片段本體，不可包含 <html>、<head>、<body> 標籤，也不可用 markdown code fence（\`\`\`）包住輸出。
2. 輸出恰好 1 到 2 個投影片片段，片段之間用一行 "<!-- SLIDE -->" 分隔。絕不能輸出 3 個以上片段。
3. 若原始報告內容包含多個任務項目與阻礙/連結資訊，第一頁＝今日任務項目與重點說明，第二頁＝阻礙事項與相關文件連結。若內容單純，可只輸出 1 頁。
4. 只能使用以下標籤與 class，不得使用其他標籤、class 或 inline style、script：
   <h1>, <h2>, <ul>, <li>, <strong>, <div class="card">, <div class="card warning">, <div class="kms-link">, <div class="grid">（內部僅能包純 <div>）, <a href="...">。
5. 內容要精煉、去除贅字，保留關鍵數字與名詞，讓聽眾一眼看懂重點與價值。

以下是一組範例，示範如何把 Markdown 轉換成符合規則的 HTML：

<markdown-example>
${EXAMPLE_MARKDOWN}
</markdown-example>

<html-output-example>
${EXAMPLE_HTML}
</html-output-example>

現在請將使用者提供的 Markdown 每日進度記錄轉換成同樣格式的 HTML 輸出。`;

const RETRY_SUFFIX = `\n\n上一次的輸出未通過格式驗證（片段數量不是 1-2，或缺少標題標籤）。請重新輸出，務必嚴格遵守規則：只用 <!-- SLIDE --> 分隔、恰好 1-2 個片段、每個片段至少包含一個 <h1> 或 <h2>。`;

export function buildRefactorMessages(markdown, { retry = false } = {}) {
  const system = retry ? SYSTEM_PROMPT + RETRY_SUFFIX : SYSTEM_PROMPT;
  return [
    { role: 'system', content: system },
    { role: 'user', content: markdown },
  ];
}
