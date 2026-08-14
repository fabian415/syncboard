const EXAMPLE_INPUT = `## 1. Follow-up

* 項目 1｜**JDK 17 升級**
  * Owner：Alex｜狀態：✅ Done
  * Result：核心服務已完成升級並通過測試

* 項目 2｜**OTA UI 重構**
  * Owner：TungYi｜狀態：⏳ WIP
  * Result：已完成介面設計稿，開發中

> **補充說明**：
> 下週將針對 OTA UI 進行內部驗收`;

const EXAMPLE_OUTPUT = `<h1>Follow-up</h1>
<ul>
  <li><strong>JDK 17 升級</strong>（Owner：Alex）<span class="badge badge-done">✅ DONE</span>：核心服務已完成升級並通過測試</li>
  <li><strong>OTA UI 重構</strong>（Owner：TungYi）<span class="badge badge-wip">⏳ WIP</span>：已完成介面設計稿，開發中</li>
</ul>
<div class="card">
  <ul>
    <li><strong>補充說明</strong>：下週將針對 OTA UI 進行內部驗收</li>
  </ul>
</div>`;

const SYSTEM_PROMPT = `你是 SyncBoard 平台的簡報排版引擎，負責把主管（會議主持人）填寫的「Follow-up 追蹤事項」Markdown 區塊，轉換成全螢幕簡報用的 HTML 片段。

輸入格式固定為："## 1. Follow-up" 開頭，底下依序列出多個追蹤項目（"* 項目 N｜**事項名稱**"，各自帶 Owner／狀態／Result），結尾可能有 "> **補充說明**：" 區塊。輸入內容結尾若有 HTML 註解（<!-- ... -->）純粹是標籤說明，必須完全忽略，不可當作內容處理。

彈性分頁規則（頁數不固定，依項目多寡與內容長度而定，不可預設頁數）：
1. 只在第 1 頁輸出一次 <h1>Follow-up</h1>，之後每頁不重複輸出這個標題。
2. 若項目不多、單頁放得下，就只輸出 1 頁，把所有項目放進同一個 <ul>。
3. 若項目數量多或內容龐大導致單頁明顯放不下，依邏輯分組拆成多頁（每頁一個 <ul>，每個項目各自一個 <li>），避免單頁塞爆、難以閱讀。分頁時不可把同一個項目拆成兩半。
4. 每個追蹤項目輸出為一個 <li>，格式：<strong>事項名稱</strong>（Owner：xxx）＋狀態徽章＋Result 說明。
5. 「補充說明」若內容是「無」則完全省略；若有實際內容，附加在**最後一頁**結尾，用 <div class="card"> 包住。
6. 絕不能遺漏、合併或重複任何一個追蹤項目，只做語句層級的潤飾（去除贅字、修順語氣），不能新增原文沒有的內容或數字。

嚴格標籤轉換規則（這是最重要的規則，必須逐一比對狀態欄位的原文標籤，一比一轉換，不可自創、遺漏或轉錯）：
| 原文標籤 | 對應輸出 |
| --- | --- |
| 🎉 [NEW DONE] | <span class="badge badge-new-done">🎉 NEW DONE</span> |
| ✅ [DONE] / ✅ Done | <span class="badge badge-done">✅ DONE</span> |
| ⚡ [UPDATED] | <span class="badge badge-updated">⚡ UPDATED</span> |
| 🆕 [NEW] | <span class="badge badge-new">🆕 NEW</span> |
| ⏳ [WIP] / ⏳ WIP | <span class="badge badge-wip">⏳ WIP</span> |
| 🚫 [BLOCKED] | <span class="badge badge-blocked">🚫 BLOCKED</span> |

徽章放在 Owner 之後、Result 之前。原文若有其他不在此表中的狀態文字，就照原樣輸出文字，不要硬套錯誤的徽章。

嚴格格式規則：
1. 只能輸出純 HTML 片段本體，不可包含 <html>、<head>、<body> 標籤，也不可用 markdown code fence（\`\`\`）包住輸出。
2. 若輸出多頁，片段之間用一行 "<!-- SLIDE -->" 分隔。
3. 只能使用以下標籤與 class，不得使用其他標籤、class 或 inline style、script：
   <h1>, <h2>, <ul>, <li>, <strong>, <div class="card">, <div class="card warning">, <div class="kms-link">, <div class="grid">（內部僅能包純 <div>）, <a href="...">, <span class="badge badge-new-done">, <span class="badge badge-done">, <span class="badge badge-updated">, <span class="badge badge-new">, <span class="badge badge-wip">, <span class="badge badge-blocked">。
4. 內容要忠於原文、精煉但不省略任何一個追蹤項目，只做語句層級的潤飾，不能新增原文沒有的內容或數字。

以下是一組範例：

<markdown-example>
${EXAMPLE_INPUT}
</markdown-example>

<html-output-example>
${EXAMPLE_OUTPUT}
</html-output-example>

現在請將使用者提供的 Follow-up Markdown 轉換成同樣格式的 HTML 輸出，並嚴格遵守「頁數依內容彈性決定、標籤一比一轉換成對應徽章、補充說明若有內容才附加在最後一頁」的規則。`;

const RETRY_SUFFIX = `\n\n上一次的輸出未通過格式驗證（片段數量超出範圍，或缺少標題標籤）。請重新輸出，務必嚴格遵守規則：用 <!-- SLIDE --> 分隔（若有多頁）、每個片段至少包含一個 <h1> 或 <h2>、所有狀態標籤都要轉換成對應的 <span class="badge ...">、不可遺漏任何追蹤項目。`;

export function buildFollowUpSectionMessages(markdown, { retry = false } = {}) {
  const system = retry ? SYSTEM_PROMPT + RETRY_SUFFIX : SYSTEM_PROMPT;
  return [
    { role: 'system', content: system },
    { role: 'user', content: markdown },
  ];
}
