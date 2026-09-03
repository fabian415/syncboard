export function buildProductBlock(projectName) {
  return `## 📦 Product：${projectName}

### - 核心重點 (Key Highlights, 至多 5 項, 貢獻度最高的擺前面)
* **1. [功能/模組]**：...
  * **1.1 [子項目]**：...
* **2. [修復/優化]**：...
![圖片標題1](https://picsum.photos/600/400?random=1)
![圖片標題2](https://picsum.photos/600/400?random=2)
![圖片標題3](https://picsum.photos/600/400?random=3)
!video[影片標題](請先到「整體進度上傳 → Deep Dive」上傳影片，再複製連結貼到這裡)

### - 項目的補充說明 (ex, 為什麼需要做, Optional)
<div class="card">

* **背景/痛點**：...
* **價值**：...
</div>

### - 下週計畫 (Ongoing/Todo, Optional)
- [ ] 項目一
  - [ ] 子項目

### - 🔥 討論 / 阻礙 (非技術層面, 跨組織/跨資源, Optional)
<div class="card warning">
* 無明顯阻礙
</div>

### - 🔗 相關連結/附件 (Optional)
<div class="kms-link">

* 無
</div>

<!--
| 連結模板 | 語法範例 | 簡報中的開啟方式 |
| ------- | ------- | --------------- |
| 一般連結 | \`[顯示文字](https://example.com)\` | 另開新分頁 |
| 圖片 | \`![圖片標題](圖片網址)\` | 內嵌顯示，點擊放大 |
| 影片 | \`!video[影片標題](影片網址)\` | 內嵌播放器，可點全螢幕 |

圖片與影片請先到「整體進度上傳 → Deep Dive」上傳，再用卡片上的「複製連結」／「複製 Markdown 語法」按鈕取得網址。
圖片與影片語法都要「獨立成一行」，不要接在條列文字後面。
-->`;
}

export function buildPersonalReportTemplate({ name, periodStart, periodEnd }) {
  return `# 🚀 Presenter：${name}｜雙週報 ${periodStart} ~ ${periodEnd}
> 本次涵蓋 Product：[請填入 Product 名稱]

---

## 🌐 其他事項 (Event Support or Others Project)

* ...
`;
}
