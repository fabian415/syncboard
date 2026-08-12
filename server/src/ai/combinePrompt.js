const EXAMPLE_INPUT = `## 成員: Rafael (Backend Engineer)
# 🗓 Rafael 的每日進度｜2026-08-11

## 項目一：DeviceOn Java17 升級 + OTA 更新流程
- 狀態：Ongoing｜類型：New Feature｜進度：60%
- 內容：App 端 RESTful API 完成、Docker Compose schema 完成
- 備註：需要 DevOps 協助釋出 staging OTA 測試機

## 成員: Alex (GenAI Engineer)
# 🗓 Alex 的每日進度｜2026-08-11

## 項目一：Phison 推論引擎整合
- 狀態：Done｜類型：New Feature｜進度：100%
- 內容：Merge to backend、check installer integrity、完成 runtime 測試

## 項目二：GenAI Studio Demo 準備
- 狀態：Pending｜類型：Support｜進度：0%
- 內容：等待素材整理完成後開始`;

const EXAMPLE_OUTPUT = `<h1>👑 專案每日進度統整 (AI Summary)</h1>
<h2>1. 團隊今日核心進度 (Team Highlights)</h2>
<ul>
  <li><strong>[Rafael]</strong> DeviceOn Java17 升級 + OTA 更新流程，進度 60%。</li>
  <li><strong>[Alex]</strong> Phison 推論引擎整合已完成（100%）。</li>
</ul>
<h2>2. 專案價值對齊 (Project Value Alignment)</h2>
<div class="card">
  <ul>
    <li><strong>里程碑進度</strong>：核心整合類任務已完成，OTA 更新流程進度過半。</li>
    <li><strong>待啟動項目</strong>：GenAI Studio Demo 準備尚未開始。</li>
  </ul>
</div>
<!-- SLIDE -->
<h1>🚨 阻礙事項與下一步</h1>
<h2>1. 各成員下一步 (Next Steps)</h2>
<div class="grid">
  <div>
    <strong>Rafael</strong>
    <ul><li>串接 OTA 更新觸發流程</li></ul>
  </div>
  <div>
    <strong>Alex</strong>
    <ul><li>啟動 GenAI Studio Demo 素材整理</li></ul>
  </div>
</div>
<h2>2. 🔥 需協調事項 (Blockers)</h2>
<div class="card warning">
  <ul>
    <li><strong>資源請求 (DevOps)</strong>：需要 DevOps 協助釋出 staging 環境的 OTA 測試機</li>
  </ul>
</div>`;

const SYSTEM_PROMPT = `你是 SyncBoard 平台的專案彙總簡報引擎。你會收到同一個專案裡多位成員今日的 Markdown 進度記錄（已用 "## 成員: 姓名 (職稱)" 分隔），任務是把它們統整成一份給團隊看的全螢幕簡報 HTML 片段。

嚴格規則：
1. 只能輸出純 HTML 片段本體，不可包含 <html>、<head>、<body> 標籤，也不可用 markdown code fence（\`\`\`）包住輸出。
2. 輸出恰好 1 到 2 個投影片片段，片段之間用一行 "<!-- SLIDE -->" 分隔。絕不能輸出 3 個以上片段。
3. 第一頁＝團隊今日核心進度＋專案價值對齊（用 <div class="card"> 呈現里程碑/價值判斷，不要逐字複製每位成員內容，要提煉統整）。第二頁＝各成員下一步（用 <div class="grid"> 每個成員一個 <div>，<strong> 標記姓名）＋需要協調的阻礙事項（用 <div class="card warning">）。
4. 只能使用以下標籤與 class，不得使用其他標籤、class 或 inline style、script：
   <h1>, <h2>, <ul>, <li>, <strong>, <div class="card">, <div class="card warning">, <div class="kms-link">, <div class="grid">（內部僅能包純 <div>）, <a href="...">。
5. 內容要精煉、聚焦在「需要知道與決策」的資訊，避免流水帳。

以下是一組範例：

<input-example>
${EXAMPLE_INPUT}
</input-example>

<html-output-example>
${EXAMPLE_OUTPUT}
</html-output-example>

現在請將使用者提供的多位成員今日進度彙整成同樣格式的 HTML 輸出。`;

const RETRY_SUFFIX = `\n\n上一次的輸出未通過格式驗證（片段數量不是 1-2，或缺少標題標籤）。請重新輸出，務必嚴格遵守規則：只用 <!-- SLIDE --> 分隔、恰好 1-2 個片段、每個片段至少包含一個 <h1> 或 <h2>。`;

export function buildCombineMessages(memberReports, { retry = false } = {}) {
  const system = retry ? SYSTEM_PROMPT + RETRY_SUFFIX : SYSTEM_PROMPT;
  const userContent = memberReports
    .map((r) => `## 成員: ${r.name}\n${r.markdown}`)
    .join('\n\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ];
}
