---
marp: true
theme: default
paginate: true
style: |
  section {
    font-family: 'PingFang TC', 'Microsoft JhengHei', sans-serif;
    padding: 40px;
  }
  h1 { color: #0366d6; font-size: 1.9rem; }
  h2 { color: #24292e; font-size: 1.35rem; border-bottom: 2px solid #e1e4e8; margin-top: 1.2rem; }
  h3 { color: #0366d6; font-size: 1.15rem; margin-top: 1rem; }
  .product-tag {
    display: inline-block;
    background: #0366d6;
    color: white;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 0.85rem;
    margin-right: 6px;
  }
  .card { background: #f6f8fa; padding: 14px; border-radius: 6px; border-left: 4px solid #0366d6; margin: 0.6rem 0; }
  .warning { border-left-color: #d73a49; background: #ffeef0; }
  .kms-link { font-size: 0.9rem; color: #586069; }
---
 
 
# 🚀 Presenter：[TungYi]｜雙週報 [2026-08-21]
> 本週涵蓋 Product：`DeviceOn`、`GenAI Studio`
 
---
<!-- ========== Product 區塊開始（可重複） ========== -->
 
## 📦 Product：DeviceOn
 
<!--Required 請挑出主要的核心重點，至多5項，最高的的貢獻擺前面，超過部分 Presentation 將不呈現 -->
### - 核心重點 (Key Highlights)
* **1. [功能/模組]**：完成支付 API 重構，降低 30% 延遲
* **2. [修復/優化]**：解決 Deadlock 問題
* **3. [上線]**：v2.1.0 發布
 
<!--Options 補充說明 -->
### - 項目的補充說明 (ex, 為什麼需要做)
<div class="card">
 
* **背景/痛點**：為了符合歐盟 CRA 規範，DeviceOn 必須將 JDK 升級至 17，生成 SBOM 並進行 CVE 漏洞比對與修復。
* **價值**：提升軟體安全性，符合 CRA 需求
</div>
 
<!--Options -->
### - 下週計畫 (Todo)
- [ ] 第三方金流串接（預計 8/15）
- [ ] 撰寫效能測試報告
 
<!--Options -->
### - 🔥 討論 / 阻礙 (Blockers)
<div class="card warning">
 
* **討論議題**：與 Frontend 確認 Auth Token 過期機制
* **阻礙**：需要 DBA 協助 Prod 唯讀權限
</div>
 
### - 🔗 相關連結/附件
<div class="kms-link">
 
* [Confluence 架構圖](#) ｜ [Jira-12345](#)
 
</div>
 
---
 
## 📦 Product：GenAI Studio
 
<!--Required 請挑出主要的核心重點，至多5項，最高的的貢獻擺前面，超過部分 Presentation 將不呈現 -->
### - 核心重點 (Key Highlights)
* **[功能]**：完成訂單狀態機重構
* **[優化]**：查詢 API 回應時間從 800ms → 220ms
 
<!--Options 補充說明 -->
### - 項目的補充說明 (ex, 為什麼需要做)
<div class="card">
 
* **背景**：舊狀態機邏輯複雜，維護成本高
* **價值**：降低後續功能開發時間約 40%
</div>
 
<!--Options -->
### - 下週計畫 (Todo)
- [ ] 補齊單元測試覆蓋率至 80%
- [ ] 與 QA 對接回歸測試案例
 
<!--Options -->
### - 🔥 討論 / 阻礙 (Blockers)
<div class="card warning">
 
* 無明顯阻礙
</div>
 
### 5. 🔗 相關連結/附件
<div class="kms-link">
 
* [Jira-67890](#)
</div>
 
---
 
<!-- ========== Others（Event Support） ========== -->
 
## 🌐 其他事項 (Event Support or Others Project)
 
* 協助新人 onboarding Product-A 與 Product-B 的架構
* 參與技術分享：如何設計可觀測性