export function buildProductBlock(projectName) {
  return `## 📦 Product：${projectName}

### - 核心重點 (Key Highlights)
* **1. [功能/模組]**：...
* **2. [修復/優化]**：...

### - 項目的補充說明 (ex, 為什麼需要做)
<div class="card">

* **背景/痛點**：...
* **價值**：...
</div>

### - 下週計畫 (Ongoing/Todo)
- [ ] ...

### - 🔥 討論 / 阻礙 (非技術層面, 跨組織/跨資源)
<div class="card warning">

* 無明顯阻礙
</div>

### - 🔗 相關連結/附件
<div class="kms-link">

* 無
</div>`;
}

const SAMPLE_PRODUCT_NAMES = ['DeviceOn', 'GenAI Studio & LLM'];

export function buildPersonalReportTemplate({ name, periodStart, periodEnd }) {
  const productBlocks = SAMPLE_PRODUCT_NAMES.map(buildProductBlock);

  return `# 🚀 Presenter：${name}｜雙週報 ${periodStart} ~ ${periodEnd}
> 本次涵蓋 Product：${SAMPLE_PRODUCT_NAMES.map((n) => `\`${n}\``).join('、')}

---

${productBlocks.join('\n\n---\n\n')}

---

## 🌐 其他事項 (Event Support or Others Project)

* ...
`;
}
