export function buildProductBlock(projectName) {
  return `## 📦 Product：${projectName}

### - 核心重點 (Key Highlights, 至多 5 項, 貢獻度最高的擺前面)
* ✅ **[功能/模組]**：...
  * ✅ **[子項目]**：...
* ⏳ **[修復/優化]**：...
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
- [ ] ⏳ 項目一
  - [ ] ⏳ 子項目

### - 🔥 討論 / 阻礙 (非技術層面, 跨組織/跨資源, Optional)
<div class="card warning">
* 無明顯阻礙
</div>

### - 🔗 相關連結/附件 (Optional)
<div class="kms-link">

* 無
</div>

<!--
| 標籤語法 | 語意說明 | 轉換成 Icon |
| --------| ------- | ---------------------------- |
| \`[NEW DONE]\` | **本週全新完成** | 🎉 |
| \`[UPDATED]\` | **本週有重要進展/狀態變更** | ⚡ |
| \`[NEW]\` | 本週新提出/新增的項目 | 🆕 |
| \`[WIP]\` | 正常進行中 | ⏳ |
| \`[BLOCKED]\` | 卡關 / 需跨團隊協助 | 🚫 |
| \`[DONE]\` | 之前就已完成（背景資訊） | ✅ |

寫 \`[DONE]\` 或直接寫 \`✅\` 都會渲染成同一個徽章，其餘標籤同理（\`[WIP]\` = \`⏳\`、\`[BLOCKED]\` = \`🚫\` …）。
標籤放在該條列項目文字的「最前面」（例如 \`* [NEW DONE] **1. [功能/模組]**：...\`），一條只放一個；
核心重點、下週計畫、討論/阻礙的每一條都可以加，沒有標籤的項目就維持純文字。

| 附件語法 | 語法範例 | 簡報中的呈現 |
| ------- | ------- | ----------- |
| 一般連結 | \`[顯示文字](https://example.com)\` | 另開新分頁 |
| 圖片 | \`![圖片標題](圖片網址)\` | 內嵌顯示，點擊放大 |
| 影片 | \`!video[影片標題](影片網址)\` | 內嵌播放器，可點全螢幕 |

圖片與影片請先到「整體進度上傳 → Deep Dive」上傳，再用卡片上的「複製連結」／「複製 Markdown 語法」取得網址；語法要獨立成一行。
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
