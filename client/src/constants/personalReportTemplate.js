export function buildProductBlock(projectName) {
  return `## 📦 Product：${projectName}

### - 核心重點 (Key Highlights, 至多 5 項, 貢獻度最高的擺前面)
* **1. [功能/模組]**：...
* **2. [修復/優化]**：...

### - 項目的補充說明 (ex, 為什麼需要做, Optional)
<div class="card">

* **背景/痛點**：...
* **價值**：...
</div>

### - 下週計畫 (Ongoing/Todo, Optional)
- [ ] ...

### - 🔥 討論 / 阻礙 (非技術層面, 跨組織/跨資源, Optional)
<div class="card warning">

* 無明顯阻礙
</div>

### - 🔗 相關連結/附件 (Optional)
<div class="kms-link">

* 無
</div>`;
}

export function buildPersonalReportTemplate({ name, periodStart, periodEnd }) {
  return `# 🚀 Presenter：${name}｜雙週報 ${periodStart} ~ ${periodEnd}
> 本次涵蓋 Product：[請填入 Product 名稱]

---

## 🌐 其他事項 (Event Support or Others Project)

* ...
`;
}
