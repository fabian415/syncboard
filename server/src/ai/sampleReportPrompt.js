const BLOCK_SKELETON = `## 📦 Product：{productName}

### - 核心重點 (Key Highlights)
* **1. [標籤]**：具體描述（全區塊最重要的一項）
* **2. [標籤]**：具體描述
* **3. [標籤]**：具體描述
* **4. [標籤]**：具體描述
* **5. [標籤]**：具體描述
* **6. [標籤]**：具體描述（可依內容需要再往下增加，數字依重要性由高到低遞增）

### - 項目的補充說明 (ex, 為什麼需要做)
<div class="card">

* **背景/痛點**：...
* **背景/痛點**：...
* **價值**：...
* **價值**：...
* **風險/依賴**：...
</div>

### - 下週計畫 (Todo)
- [ ] ...
- [ ] ...

### - 🔥 討論 / 阻礙 (Blockers)
<div class="card warning">

* ...
</div>

### - 🔗 相關連結/附件
<div class="kms-link">

* [說明文字](https://example.com/...)
</div>`;

const SYSTEM_PROMPT = `你是 SyncBoard 平台的「測試假資料產生器」。你的任務是幫工程團隊產生一份**看起來真實、可信**的雙週工作報告範例中「單一 Product」的區塊，用來測試簡報系統的排版與 AI Refactor 流程，內容本身不需要對應任何真實專案進度。

嚴格規則：
1. 必須完全依照下面提供的 Markdown 骨架格式輸出，不能增減標題層級、不能省略任何一個 "###" 子標題、不能改變 <div class="..."> 的 class 名稱，只能輸出「這一個」Product 區塊，不要輸出其他 Product。
2. 這是壓力測試用途，內容量要「多」：「核心重點」**至少要 5 條、最多可到 8 條**，且必須依重要性「由高到低」排序（第 1 條是這個 Product 本期最重要的成果）；「項目的補充說明」也要多寫幾條，至少各 2 條「背景/痛點」與「價值」，可再加 1~2 條「風險/依賴」之類的補充標籤；「下週計畫」要有 2~3 條。內容需具體（像是真的工程師會寫的：效能數字、技術名詞、系統/模組名稱），避免空泛的「優化系統」這種說法。
3. 「討論/阻礙」與「相關連結」可以隨機出現 1 條，或（少數情況下）寫「無明顯阻礙」。
4. 全部使用繁體中文書寫（技術詞彙可保留英文，如 API、OAuth、CI/CD）。
5. 只能輸出 Markdown 本體，不要用 \`\`\` 包住輸出，不要加任何額外說明文字。
6. 每次產生的內容都要跟以往不同：更換情境、技術主題、數字，不要每次都寫同樣的效能優化/OAuth 修復老梗。

Markdown 骨架（{} 內是你要替換的內容）：

${BLOCK_SKELETON}`;

export function buildSampleProductMessages({ name, productName, variationSeed }, { retry = false } = {}) {
  const system = retry
    ? `${SYSTEM_PROMPT}\n\n上一次輸出的格式不符規則（可能是核心重點少於 5 條，或缺少子標題），請重新輸出，務必嚴格遵守骨架與最低條數要求。`
    : SYSTEM_PROMPT;

  const userContent = `成員姓名：${name}
Product 名稱：${productName}
本次產生的隨機情境提示（僅供你發想不同內容用，不要出現在輸出中）：${variationSeed}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ];
}
