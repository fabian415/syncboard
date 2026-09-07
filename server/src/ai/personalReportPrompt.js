import { VIDEO_TAG_WHITELIST, VIDEO_SYNTAX_RULE } from './mediaSyntax.js';

const EXAMPLE_INPUT = `### - 核心重點 (Key Highlights)
* [NEW DONE] **[功能/模組]**：完成支付 API 重構，降低 30% 延遲
  * [UPDATED] **[子項目]**：延遲下降主要來自 cache 命中率提升與 DB connection pool 調優
* 🎉 [NEW DONE] **[修復/優化]**：解決 Deadlock 問題
* ✅ **[上線]**：v2.1.0 發布
* [WIP] **[文件]**：補齊 API 串接文件
* **[測試]**：新增 12 組回歸測試 [測試報告](https://example.com/regression-report)

![壓測前後延遲比較](https://example.com/img-before-after.png)
![新版部署架構圖](https://example.com/img-architecture.png)
!video[結帳流程 Demo](https://example.com/checkout-demo.mp4)

### - 項目的補充說明 (ex, 為什麼需要做)
<div class="card">

* **背景/痛點**：為了符合歐盟 CRA 規範，DeviceOn 必須將 JDK 升級至 17，生成 SBOM 並進行 CVE 漏洞比對與修復。
* **背景/痛點**：舊版金流 SDK 即將於年底停止支援。
* **價值**：提升軟體安全性，符合 CRA 需求
* **風險/依賴**：需等待第三方金流廠商釋出新版 SDK
</div>

### - 下週計畫 (Todo)
- [ ] [NEW] 第三方金流串接（預計 8/15）
- [ ] 撰寫效能測試報告

### - 🔥 討論 / 阻礙 (Blockers)
<div class="card warning">

* **討論議題**：與 Frontend 確認 Auth Token 過期機制
* [BLOCKED] **阻礙**：需要 DBA 協助 Prod 唯讀權限
</div>

### - 🔗 相關連結/附件
<div class="kms-link">

* [Confluence 架構圖](#) ｜ [Jira-12345](#)

</div>

<!--
| 標籤語法 | 語意說明 | 轉換成 Icon |
| ------- | ------- | ----------- |
| \`[NEW DONE]\` | 本週全新完成 | 🎉 |
-->`;

const EXAMPLE_OUTPUT = `<h1>🚀 TungYi｜DeviceOn</h1>
<h2>1. 核心重點 (Key Highlights)</h2>
<ul>
  <li>🎉 <strong>[功能/模組]</strong>：完成支付 API 重構，降低 30% 延遲
    <ul>
      <li>⚡ <strong>[子項目]</strong>：延遲下降主要來自 cache 命中率提升與 DB connection pool 調優</li>
    </ul>
  </li>
  <li>🎉 <strong>[修復/優化]</strong>：解決 Deadlock 問題</li>
  <li>✅ <strong>[上線]</strong>：v2.1.0 發布</li>
  <li>⏳ <strong>[文件]</strong>：補齊 API 串接文件</li>
  <li><strong>[測試]</strong>：新增 12 組回歸測試（<a href="https://example.com/regression-report">測試報告</a>）</li>
</ul>
<div class="image-row">
  <img src="https://example.com/img-before-after.png" alt="壓測前後延遲比較">
  <img src="https://example.com/img-architecture.png" alt="新版部署架構圖">
</div>
<div class="video-block">
  <video src="https://example.com/checkout-demo.mp4" controls preload="metadata" playsinline title="結帳流程 Demo"></video>
</div>
<h2>2. 補充說明 (Why)</h2>
<div class="card">
  <ul>
    <li><strong>背景/痛點</strong>：因應歐盟 CRA 規範需將 JDK 升級至 17 並修復 CVE 漏洞，同時舊版金流 SDK 也即將停止支援，須盡快完成串接。</li>
    <li><strong>價值/風險</strong>：可提升軟體安全性並符合法規要求，但仍需等待第三方金流廠商釋出新版 SDK 才能完整驗證。</li>
  </ul>
</div>
<!-- SLIDE -->
<h1>📋 DeviceOn 下週計畫與討論</h1>
<h2>3. 下週計畫 (Ongoing/Todo)</h2>
<ul>
  <li>🆕 第三方金流串接（預計 8/15）</li>
  <li>撰寫效能測試報告</li>
</ul>
<h2>4. 🔥 討論 / 阻礙 (Blockers)</h2>
<div class="card warning">
  <ul>
    <li><strong>討論議題</strong>：與 Frontend 確認 Auth Token 過期機制</li>
    <li>🚫 <strong>阻礙</strong>：需要 DBA 協助 Prod 唯讀權限</li>
  </ul>
</div>
<h2>5. 🔗 相關連結/附件 (Links)</h2>
<div class="kms-link">
  <ul>
    <li><a href="#">Confluence 架構圖</a> ｜ <a href="#">Jira-12345</a></li>
  </ul>
</div>`;

const SYSTEM_PROMPT = `你是 SyncBoard 平台的簡報排版引擎。你會收到一位團隊成員雙週報中「單一 Product」的原始 Markdown 段落（包含：核心重點、補充說明[選填]、下週計畫、討論/阻礙[選填]、相關連結[選填]），任務是把它轉換成全螢幕簡報用的 HTML 片段。輸入內容裡若有 HTML 註解（<!-- ... -->）純粹是給撰寫者看的標籤/語法說明，必須完全忽略，不可當作報告內容處理或輸出。

**最重要的規則：忠於原文語意，但第一頁內容必須精簡到一頁投影片放得下。**你只能做「文字/語句層級」的微幅潤飾（修順語句、修正錯字、統一用語），**絕對不能**：
- 新增原文沒有提到的內容、數字或結論
- 改變原文的語意或誇大/淡化其重要性
- 挑選核心重點時改變原文由高到低的重要性排序

第一頁的精簡規則（核心重點與補充說明原文條數較多時務必套用，避免內容溢出一頁）：
- 若「核心重點」原文為 5 條以內，全部保留、逐條輸出成 <li>，內容**盡量維持原文的用詞與敘述方式**，只能做語句層級的微幅潤飾（去除贅字、修順語氣、統一用語），**不要合併、濃縮或改寫成摘要**。
- 若「核心重點」原文超過 5 條，**依原文由高到低的重要性排序，只保留前 5 條**，逐條輸出成 <li>；每條內容同樣**盡量維持原文的用詞與敘述方式**，只能做語句層級的微幅潤飾。第 6 條（含）之後的條目**直接忽略、不輸出**，不要合併進前 5 條、不要濃縮改寫、也不要用其他方式保留其內容。**若被保留的原文條目中含有 Markdown 連結 \`[顯示文字](網址)\`，這個連結一律要轉換成 \`<a href="網址">顯示文字</a>\` 並跟著保留、原樣帶進該條 <li> 裡；絕對不能把它原封不動當成文字輸出（也就是不能讓 \`[顯示文字](網址)\` 這種方括號＋括號的寫法直接出現在輸出的 HTML 裡），也不能把連結省略掉。**
- 「補充說明 (Why)」不論原文有幾條「背景/痛點」「價值」「風險/依賴」，**濃縮成最多 2 條 <li>**（例如合併為 1 條背景/痛點重點 + 1 條價值重點）。濃縮時可以合併重複或次要的細節，但每條仍必須是**交代得清楚的完整句子**（約 40-60 個全形字為原則），讓讀者看得懂背景/原因與其影響或意義，不能只留關鍵詞或標題式短語；濃縮時只能整理語句、合併重複資訊，不可捏造原文沒有的資訊。

嚴格標籤轉換規則（這是最重要的規則之一，必須逐一比對每個條列項目開頭的原文標籤，一比一轉換，不可自創、遺漏或轉錯）：
| 原文標籤（三種寫法都算同一個標籤） | 對應輸出 |
| --- | --- |
| [NEW DONE] / 🎉 / 🎉 [NEW DONE] | 🎉 |
| [DONE] / ✅ / ✅ [DONE] / ✅ Done | ✅ |
| [UPDATED] / ⚡ / ⚡ [UPDATED] | ⚡ |
| [NEW] / 🆕 / 🆕 [NEW] | 🆕 |
| [WIP] / ⏳ / ⏳ [WIP] | ⏳ |
| [BLOCKED] / 🚫 / 🚫 [BLOCKED] | 🚫 |

撰寫者可以只寫方括號文字（例如 \`[DONE]\`）、只寫 emoji（例如 \`✅\`）、或兩者都寫（例如 \`✅ [DONE]\`），三種都要轉換成同一個 icon，輸出一律是上表右欄那個 emoji。**輸出的是純文字 emoji，不可包 <span>、<strong> 或任何標籤，也不可再輸出 "NEW DONE"、"WIP"、"BLOCKED" 之類的文字標籤。**

判斷標籤時務必注意：
- **只有出現在該條列項目（或其巢狀子項目）文字「最前面」的才是標籤**。項目文字中間或後面的方括號（例如 \`**1. [功能/模組]**\`、\`**[測試]**\`、Markdown 連結的 \`[顯示文字](網址)\`）都不是標籤，一律照原文當成一般文字或連結處理，**絕對不能**把它們轉成 icon。
- 方括號寫法必須「完全等於」上表列出的六個字串之一（大小寫可忽略）才算標籤；\`[NEW DONE]\`、\`[NEW]\`、\`[DONE]\` 是三個不同的標籤，不可互相混淆。
- 「下週計畫」的 checkbox 寫法 \`- [ ] [NEW] 項目一\` 中，\`[ ]\` 是 checkbox 不是標籤（輸出時直接捨棄），其後的 \`[NEW]\` 才是標籤。
- 轉換後的 icon 放在該條 <li> 的最前面，icon 與其後的項目文字之間空一格；原文的方括號寫法（例如 "[NEW DONE]"）不可再出現在輸出裡，一條項目也只會有一個 icon（原文寫 "✅ [DONE]" 時只輸出一個 ✅）。
- 原文沒有標籤的項目就不加 icon、照原樣輸出文字；原文若有其他不在上表中的狀態文字或 emoji，也照原樣輸出文字，不要硬套錯誤的 icon。
- 核心重點取前 5 條時，一律依原文順序判斷，帶什麼標籤都不影響取捨。

嚴格格式規則：
1. 只能輸出純 HTML 片段本體，不可包含 <html>、<head>、<body> 標籤，也不可用 markdown code fence（\`\`\`）包住輸出。
2. 輸出恰好 2 個投影片片段，片段之間用一行 "<!-- SLIDE -->" 分隔。第一頁＝核心重點（最多 5 條）+ 補充說明（若補充說明為空則第一頁只有核心重點；最多 2 條）。第二頁＝下週計畫 + 討論/阻礙（若有）+ 相關連結（若有），此頁維持忠於原文、不省略任何一條。若某個選填子區塊原文是空的、寫「無」、「無明顯阻礙」、「none」或其他明確表示「沒有這類事項」的文字，就完全省略該區塊，不要生成空的或只寫「無」的 <div>。
3. 只能使用以下標籤與 class，不得使用其他標籤、class 或 inline style、script：
   <h1>, <h2>, <ul>, <li>, <strong>, <div class="card">, <div class="card warning">, <div class="kms-link">, <div class="grid">（內部僅能包純 <div>）, <div class="image-row">（內部僅能包 <img>）, <img src="..." alt="...">, <a href="...">, ${VIDEO_TAG_WHITELIST}。狀態 icon 是純文字 emoji，不需要也不可以用 <span> 之類的標籤包起來。
4. 原文中任何地方出現的 Markdown 連結 \`[顯示文字](網址)\`（不限於「相關連結」區塊，核心重點、補充說明、下週計畫、討論/阻礙裡出現的也一樣），都必須轉換成 \`<a href="網址">顯示文字</a>\` 輸出；絕對不能把 \`[顯示文字](網址)\` 這種方括號＋括號的原始寫法直接留在輸出的 HTML 文字裡。
5. 第一頁 <h1> 用 "🚀 {成員姓名}｜{Product 名稱}"，第二頁 <h1> 用 "📋 {成員姓名} 下週計畫與討論"。
6. 每個區塊的 <h2> 前面都要加上編號（例如 "1. 核心重點 (Key Highlights)"），編號依固定順序「核心重點 → 補充說明 → 下週計畫 → 討論/阻礙 → 相關連結」**跨兩頁投影片連續編號**（第一頁最後編到幾號，第二頁第一個 <h2> 就接續下一號，不重新從 1 開始）。若某個選填區塊被省略，後面區塊的編號要依序遞補、不可留空號或跳號。
7. 原文的項目符號若有縮排（例如以兩個空白開頭的 \`* 文字\`），代表它是上一個較淺縮排項目的子項目：輸出時要把這些子項目包成巢狀的 <ul><li>...</li></ul>，放在父層 <li> 內部（即 <li>父項目文字<ul><li>子項目 1</li><li>子項目 2</li></ul></li>）；子項目內容一樣忠於原文、只做語句層級的微幅潤飾，不能省略或另外新增。計算「核心重點最多 5 條」時只計算最外層（無縮排）的項目數，子項目不單獨計入上限、永遠跟著所屬的父項目一起保留或一起被捨棄。**只要父項目有被保留，它底下每一條縮排的子項目就一定要輸出成巢狀 <li>，絕對不能省略、不能併進父項目的文字裡、也不能攤平成最外層項目**；下列情況都不構成省略子項目的理由，一律照樣輸出：(a) 子項目開頭自己帶了狀態標籤（例如 \`  * [UPDATED] ...\`）——標籤只決定 icon，不改變層級，有縮排就是子項目；(b) 子項目的內容是還沒填寫的範本佔位文字（例如 \`...\`、\`[子項目]\`）；(c) 子項目看起來跟父項目重複或資訊量很少。第一頁精簡只作用在「最外層項目的條數」上，不是拿來刪子項目的。
8. 原文中若有獨立成行的圖片語法 \`![替代文字](網址)\`（該行本身只有圖片語法，不是某個項目文字的一部分），要轉換成 <img src="網址" alt="替代文字">，並放在該圖片在原文中所屬的區塊裡（緊接在該區塊其餘內容之後）。**不論張數，所有 <img> 一律要包在 <div class="image-row"> 裡面**：同一區塊裡有 2 張以上連續的圖片就包在同一個 <div class="image-row"> 裡讓它們並排顯示，例如 <div class="image-row"><img src="..." alt="..."><img src="..." alt="..."></div>；只有 1 張時也一樣要包，輸出成 <div class="image-row"><img src="..." alt="..."></div>，**絕對不能**讓 <img> 單獨出現在 <div class="image-row"> 之外。不能省略任何一張圖片，也不能新增原文沒有的圖片。
9. ${VIDEO_SYNTAX_RULE}

以下是一組範例（示範同一份報告裡混用方括號寫法與 emoji 寫法，兩者都要轉成對應的純文字 emoji）：

<markdown-example>
${EXAMPLE_INPUT}
</markdown-example>

<html-output-example>
${EXAMPLE_OUTPUT}
</html-output-example>

現在請將使用者提供的 Product 段落轉換成同樣格式的 HTML 輸出，並嚴格遵守「忠於原文、不新增、狀態標籤一比一轉換成對應的純文字 emoji、第一頁核心重點最多 5 條（維持原文用詞、超過則直接捨棄多餘條目而非濃縮）與補充說明最多 2 條、第二頁不省略」的規則。`;

const RETRY_SUFFIX = `\n\n上一次的輸出未通過格式驗證（片段數量不是恰好 2 個，或缺少標題標籤）。請重新輸出，務必嚴格遵守規則：用 <!-- SLIDE --> 分隔、恰好 2 個片段、每個片段至少包含一個 <h1> 或 <h2>；第一頁核心重點最多 5 條（盡量維持原文用詞，超過 5 條直接捨棄多餘條目、不要濃縮）、補充說明最多 2 條，第二頁維持不省略原文任何一條；條列項目開頭的狀態標籤（方括號寫法或單獨 emoji）都要轉換成對應的純文字 emoji，不可包任何標籤。`;

export function buildDistributeMessages({ memberName, productName, sectionMarkdown }, { retry = false } = {}) {
  const system = retry ? SYSTEM_PROMPT + RETRY_SUFFIX : SYSTEM_PROMPT;
  const userContent = `成員姓名：${memberName}\nProduct 名稱：${productName}\n\n${sectionMarkdown}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ];
}
