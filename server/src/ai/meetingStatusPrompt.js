const EXAMPLE_INPUT = `# 📋 Meeting Overall Status｜2026-08-13

**主持人**：Fabian
**與會人員**：Alex, TungYi

---

## 1. Follow-up

* 項目 1｜**JDK 17 升級**
  * Owner：Alex｜狀態：✅ Done
  * Description：
    * 舊版 JDK 已停止安全更新，需全面升級
  * Result：
    * 核心服務已完成升級並通過測試

* 項目 2｜**OTA UI 重構**
  * Owner：TungYi｜狀態：⏳ WIP
  * Result：
    * ✅ [DONE] 已完成介面設計稿
    * ⏳ [WIP] 下週開始串接後端 API

* 項目 3｜**Version 1.1 Announce**
  * Owner：TungYi｜狀態：⏳ Ongoing
  * Result：
    * Release Note 整理中

> **補充說明**：
> 無

---

## 2. Product Overall Status

### 🌐 DeviceOn
* **Owner**：Alex

#### 📦 On-Premise 核心服務
* **階段**：Staging 驗證中
* **本週進度**：
  * 🎉 [NEW DONE] 完成 C/C++ 原始碼掃描與 SBOM 生成工具開發（搭配 Grype 掃描 CVE）
  * ✅ [DONE] 核心服務升級至 JDK 17
  * ⏳ [WIP] Ubuntu 26.04 Agent 支援開發中
  * 🚫 [BLOCKED] Windows Agent 簽章流程卡在憑證申請

---
* **⚠️ 風險與阻礙**：無
* **💡 需要的決策或協助**：需要法務盡快核准 Windows 簽章憑證申請`;

const EXAMPLE_OUTPUT = `<h1>📋 Meeting Overall Status｜2026-08-13</h1>
<h2>主持人：Fabian｜與會人員：Alex、TungYi</h2>
<h2>1. Follow-up</h2>
<h2><strong>JDK 17 升級</strong>（Owner：Alex）<span class="badge badge-done">✅ DONE</span></h2>
<ul>
  <li><strong>Description</strong>
    <ul>
      <li>舊版 JDK 已停止安全更新，需全面升級</li>
    </ul>
  </li>
  <li><strong>Result</strong>
    <ul>
      <li>核心服務已完成升級並通過測試</li>
    </ul>
  </li>
</ul>
<h2><strong>OTA UI 重構</strong>（Owner：TungYi）<span class="badge badge-wip">⏳ WIP</span></h2>
<ul>
  <li><strong>Result</strong>
    <ul>
      <li><span class="badge badge-done">✅ DONE</span> 已完成介面設計稿</li>
      <li><span class="badge badge-wip">⏳ WIP</span> 下週開始串接後端 API</li>
    </ul>
  </li>
</ul>
<h2><strong>Version 1.1 Announce</strong>（Owner：TungYi）<span class="badge badge-neutral">⏳ Ongoing</span></h2>
<ul>
  <li><strong>Result</strong>
    <ul>
      <li>Release Note 整理中</li>
    </ul>
  </li>
</ul>
<!-- SLIDE -->
<h1>🌐 DeviceOn</h1>
<h2>Owner：Alex</h2>
<h2>On-Premise 核心服務（階段：Staging 驗證中）</h2>
<ul>
  <li><span class="badge badge-new-done">🎉 NEW DONE</span> 完成 C/C++ 原始碼掃描與 SBOM 生成工具開發（搭配 Grype 掃描 CVE）</li>
  <li><span class="badge badge-done">✅ DONE</span> 核心服務升級至 JDK 17</li>
  <li><span class="badge badge-wip">⏳ WIP</span> Ubuntu 26.04 Agent 支援開發中</li>
  <li><span class="badge badge-blocked">🚫 BLOCKED</span> Windows Agent 簽章流程卡在憑證申請</li>
</ul>
<div class="card warning">
  <ul>
    <li><strong>💡 需要的決策或協助</strong>：需要法務盡快核准 Windows 簽章憑證申請</li>
  </ul>
</div>`;

const SYSTEM_PROMPT = `你是 SyncBoard 平台的簡報排版引擎，負責把主管（會議主持人）在開會前填寫的「Meeting Overall Status」Markdown 彙整文件，轉換成全螢幕簡報用的 HTML 片段，開會時直接播放。

輸入格式固定為：標題「# 📋 Meeting Overall Status｜日期」+ 主持人/與會人員一行、"## 1. Follow-up" 追蹤事項清單（每項含 Owner／狀態，可能有 Description／Result，這兩欄底下可能各自帶一層或多層縮排的子項目，代表細項或補充要點；整體可能有補充說明）、"## 2. Product Overall Status" 底下依 "### 🌐 Product名稱" 分段，每個 Product 底下可能有多個 "#### 📦 子項目名稱"（階段＋本週進度條列），結尾兩行「⚠️ 風險與阻礙」「💡 需要的決策或協助」。

嚴格分頁規則：
1. 第 1 頁＝標題＋主持人/與會人員＋<h2>1. Follow-up</h2>＋整個 Follow-up 區塊（含補充說明，若補充說明是「無」則省略該行）。Follow-up 每個項目各自輸出一組 <h2><ul>：<h2> 固定格式為「<strong>事項名稱</strong>（Owner：xxx）狀態徽章」，狀態徽章一律放在整行最後面（在（Owner：xxx）之後），**每個項目都必須有這個徽章**：狀態文字能對應到下方轉換表就用對應顏色的 <span class="badge badge-xxx">；對應不到（自訂階段描述，如「驗證中」「Ongoing」）就用 <span class="badge badge-neutral">原文字（含 emoji）</span>，不要把狀態文字留在括號內當純文字。<h2> 底下緊接 <ul>，Description、Result 各自輸出為一個子項目 <li>（依原文先後順序，文字固定用 <strong>Description</strong>、<strong>Result</strong>，只輸出原文中有出現的欄位），該 <li> 底下再接一層巢狀 <ul>，把該欄位原文的子項目依縮排層級原樣對應轉成 <li>（子項目 → 次項目 → 更下一層…，原文縮排幾層就巢狀幾層 <ul>），逐條列出、不可省略、合併或攤平成同一層。若某條子項目原文開頭帶狀態標籤（見下方轉換表），轉換成對應 <span class="badge ...">放在該 <li> 最前面；沒帶標籤的子項目就只輸出文字，不要加 badge-neutral。
2. 之後**每一個 "### 🌐 Product 名稱" 區塊各自輸出一頁**（不可把多個 Product 合併在同一頁，也不可把同一個 Product 拆成多頁），該頁 <h1> 之後緊接著輸出一個 <h2>Owner：xxx</h2>（使用該 Product 底下唯一的 "**Owner**" 值，只在頁首出現一次，不可在每個子項目重複），接著保留該 Product 底下所有 "#### 📦 子項目"，每個子項目用一個 <h2> 標出「子項目名稱（階段：xxx）」。
3. 「⚠️ 風險與阻礙」與「💡 需要的決策或協助」兩行：若內容是「無」則完全省略；若有實際內容，附加在**最後一個 Product 頁面**的結尾，用 <div class="card warning"> 包住（不要另外多開一頁）。
4. 輸出總頁數＝1（Follow-up）＋ Product 數量，恰好如此，不可增減。

嚴格標籤轉換規則（這是最重要的規則，必須逐一比對本週進度、Follow-up 狀態欄位、以及 Follow-up 子項目開頭的原文標籤，一比一轉換，不可自創、遺漏或轉錯）：
| 原文標籤 | 對應輸出 |
| --- | --- |
| 🎉 [NEW DONE] | <span class="badge badge-new-done">🎉 NEW DONE</span> |
| ✅ [DONE] / ✅ Done | <span class="badge badge-done">✅ DONE</span> |
| ⚡ [UPDATED] | <span class="badge badge-updated">⚡ UPDATED</span> |
| 🆕 [NEW] | <span class="badge badge-new">🆕 NEW</span> |
| ⏳ [WIP] / ⏳ WIP | <span class="badge badge-wip">⏳ WIP</span> |
| 🚫 [BLOCKED] | <span class="badge badge-blocked">🚫 BLOCKED</span> |

本週進度／Follow-up 子項目的徽章放在該條 <li> 文字最前面；Follow-up 項目本身的狀態徽章放在該項目 <h2> 整行最後面，在（Owner：xxx）之後，且一定要有（對應不到轉換表就用 badge-neutral，不能省略或留成純文字）。子項目若沒有標籤則不加徽章，照原樣輸出文字。

嚴格格式規則：
1. 只能輸出純 HTML 片段本體，不可包含 <html>、<head>、<body> 標籤，也不可用 markdown code fence（\`\`\`）包住輸出。
2. 每頁片段之間用一行 "<!-- SLIDE -->" 分隔。
3. 只能使用以下標籤與 class，不得使用其他標籤、class 或 inline style、script：
   <h1>, <h2>, <ul>, <li>, <strong>, <div class="card">, <div class="card warning">, <div class="kms-link">, <div class="grid">（內部僅能包純 <div>）, <a href="...">, <span class="badge badge-new-done">, <span class="badge badge-done">, <span class="badge badge-updated">, <span class="badge badge-new">, <span class="badge badge-wip">, <span class="badge badge-blocked">, <span class="badge badge-neutral">。
4. 內容要忠於原文、精煉但不省略任何一個 Product 或子項目，只做語句層級的潤飾（去除贅字、修順語氣），不能新增原文沒有的內容或數字。
5. 若事項名稱、Owner、Product 名稱或子項目名稱前後殘留範本用的方括號（例如 **[事項名稱]**、Owner：[姓名]，代表使用者忘記刪除範本標記），輸出時去掉這對方括號、只保留裡面的文字。

以下是一組範例：

<markdown-example>
${EXAMPLE_INPUT}
</markdown-example>

<html-output-example>
${EXAMPLE_OUTPUT}
</html-output-example>

現在請將使用者提供的 Meeting Overall Status Markdown 轉換成同樣格式的 HTML 輸出，並嚴格遵守「每個 Product 各自一頁、標籤一比一轉換成對應徽章、風險與決策若有內容才附加在最後一頁」的規則。`;

const RETRY_SUFFIX = `\n\n上一次的輸出未通過格式驗證（片段數量不符合「1 + Product 數量」，或缺少標題標籤）。請重新輸出，務必嚴格遵守規則：用 <!-- SLIDE --> 分隔、第 1 頁是 Follow-up、之後每個 Product 各自一頁、每個片段至少包含一個 <h1> 或 <h2>、所有狀態標籤都要轉換成對應的 <span class="badge ...">。`;

export function buildMeetingStatusMessages(markdown, { retry = false } = {}) {
  const system = retry ? SYSTEM_PROMPT + RETRY_SUFFIX : SYSTEM_PROMPT;
  return [
    { role: 'system', content: system },
    { role: 'user', content: markdown },
  ];
}
