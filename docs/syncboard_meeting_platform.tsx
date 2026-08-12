import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, User, FileText, Sparkles, ChevronRight, ChevronLeft, 
  X, LayoutDashboard, LogOut, Maximize2, GitMerge, ArrowLeft, Folder,
  Clock, CheckCircle2
} from 'lucide-react';

// --- 模擬資料與預設 Markdown ---
const DEFAULT_MARKDOWN = `---
marp: true
theme: default
paginate: true
project: DeviceOn
---

<!-- PAGE 1: 本週重點與價值 -->
# 🚀 報告人：[RD 姓名]｜週報 [YYYY-Wxx]

## 1. 本週核心交付 (Key Highlights)
* **[功能/模組名稱]**：完成支付 API 重構，降低 30% 延遲
* **[修復/優化]**：解決資料庫 Deadlock 問題，提升系統穩定度
* **[上線/交付]**：v2.1.0 順利部署至 Staging 環境

## 2. 為什麼要做這件事？ (Why We Do It)
<div class="card">
* **背景與痛點**：舊版 API 於高峰期存取過慢，導致使用者結帳失敗率提升 5%。
* **商業/技術價值**：提升使用者體驗，為 Q3 高流量活動預做準備。
</div>

---
<!-- PAGE 2: 下週 Todo & 討論議題 -->
# 📋 下週計畫與議題討論

## 1. 下週待辦事項 (Next Week Todo)
- [ ] 支援第三方支付金流串接 (預計 8/15 完成)
- [ ] 撰寫 API 效能測試報告

## 2. 🔥 需跨團隊討論 / 阻礙事項 (Discussion & Blockers)
<div class="card warning">
* **討論議題**：與 Frontend 團隊確認新版 Auth Token 過期機制
* **目前阻礙**：需要 DBA 協助釋出 Prod 唯讀資料庫權限以釐清效能瓶頸
</div>

## 3. 🔗 詳細開發文檔 (KMS / Confluence Links)
<div class="kms-link">
* 系統架構圖與 API 文件：[點擊前往 Confluence / Notion](#)
* 需求 Task 追蹤：[Jira-12345](#)
</div>`;

// 擴充為多個專案的資料結構
const PROJECTS = [
  {
    id: 'prj-deviceon',
    name: 'DeviceOn',
    description: '企業級 IoT 裝置管理平台 v2.0 開發',
    tag: 'Q3 重點',
    rds: [
      { id: 'rd-01', name: 'Alice Chen', role: 'Backend Engineer', status: 'Submitted', time: '2 小時前' },
      { id: 'rd-02', name: 'Bob Lin', role: 'Frontend Engineer', status: 'Submitted', time: '5 小時前' },
      { id: 'rd-03', name: 'Charlie Wang', role: 'DevOps', status: 'Drafting', time: '草稿中' }
    ]
  },
  {
    id: 'prj-smartretail',
    name: 'SmartRetail',
    description: '智慧零售 POS 與庫存同步系統',
    tag: '維護階段',
    rds: [
      { id: 'rd-04', name: 'David Lee', role: 'Fullstack', status: 'Submitted', time: '昨天' },
      { id: 'rd-05', name: 'Eva Wu', role: 'UI/UX', status: 'Submitted', time: '昨天' }
    ]
  }
];

// 模擬 AI 生成的 HTML 內容 (Page 1 & Page 2)
const MOCK_HTML_PAGES = [
  `
    <h1>🚀 報告人：Alice Chen｜週報 2026-W32</h1>
    <h2>1. 本週核心交付 (Key Highlights)</h2>
    <ul>
      <li><strong>[重構]</strong>：完成支付 API 重構，降低 30% 延遲</li>
      <li><strong>[優化]</strong>：解決資料庫 Deadlock 問題，提升系統穩定度</li>
      <li><strong>[部署]</strong>：v2.1.0 順利部署至 Staging 環境</li>
    </ul>
    <h2>2. 為什麼要做這件事？ (Why We Do It)</h2>
    <div class="card">
      <ul>
        <li><strong>背景與痛點</strong>：舊版 API 於高峰期存取過慢，導致使用者結帳失敗率提升 5%。</li>
        <li><strong>商業/技術價值</strong>：提升使用者體驗，為 Q3 高流量活動預做準備。</li>
      </ul>
    </div>
  `,
  `
    <h1>📋 下週計畫與議題討論</h1>
    <h2>1. 下週待辦事項 (Next Week Todo)</h2>
    <ul>
      <li>支援第三方支付金流串接 (預計 8/15 完成)</li>
      <li>撰寫 API 效能測試報告</li>
    </ul>
    <h2>2. 🔥 需跨團隊討論 / 阻礙事項 (Discussion & Blockers)</h2>
    <div class="card warning">
      <ul>
        <li><strong>討論議題</strong>：與 Frontend 團隊確認新版 Auth Token 過期機制</li>
        <li><strong>目前阻礙</strong>：需要 DBA 協助釋出 Prod 唯讀資料庫權限以釐清效能瓶頸</li>
      </ul>
    </div>
    <h2>3. 🔗 詳細開發文檔 (KMS / Confluence Links)</h2>
    <div class="kms-link">
      <ul>
        <li>系統架構圖與 API 文件：<a href="#">點擊前往 Confluence</a></li>
        <li>需求 Task 追蹤：<a href="#">Jira-12345</a></li>
      </ul>
    </div>
  `
];

const MOCK_COMBINED_PAGES = [
  `
    <h1>👑 專案進度統整 (AI Summary)</h1>
    <h2>1. 團隊核心交付 (Team Highlights)</h2>
    <ul>
      <li><strong>[Backend]</strong> 完成 API 重構，延遲下降 30%。</li>
      <li><strong>[Frontend]</strong> 完成新版 Dashboard UI 切版與 API 串接。</li>
      <li><strong>[DevOps]</strong> 建置全新的 CI/CD Pipeline，縮短 50% 部署時間。</li>
    </ul>
    <h2>2. 專案價值對齊 (Project Value Alignment)</h2>
    <div class="card">
      <ul>
        <li><strong>里程碑進度</strong>：目前 Q3 目標已達成 80%，整體系統乘載量預計可應付下月促銷活動。</li>
        <li><strong>技術投資回收</strong>：基礎架構的升級已成功降低了每週 15% 的維運工時。</li>
      </ul>
    </div>
  `,
  `
    <h1>🚨 跨部門阻礙與下週目標 (Blockers & Next Steps)</h1>
    <h2>1. 團隊下週目標 (Team Next Week Todo)</h2>
    <div class="grid">
      <div>
        <strong>Backend</strong>
        <ul><li>完成第三方支付金流</li></ul>
      </div>
      <div>
        <strong>Frontend</strong>
        <ul><li>實作 Dashboard 報表匯出</li></ul>
      </div>
    </div>
    <h2>2. 🔥 需主管/跨團隊協調事項 (Blockers)</h2>
    <div class="card warning">
      <ul>
        <li><strong>資源請求 (DBA)</strong>：需 DBA 協助釋出 Prod 唯讀資料庫權限以釐清效能瓶頸。</li>
        <li><strong>需求釐清 (PM)</strong>：報表匯出格式需 PM 再次確認 Excel 欄位定義。</li>
      </ul>
    </div>
  `
];

// --- 呈現簡報的 Modal 元件 ---
const PresentationModal = ({ isOpen, onClose, pages, title }) => {
  const [currentPage, setCurrentPage] = useState(0);

  // 重置頁碼
  useEffect(() => {
    if (isOpen) setCurrentPage(0);
  }, [isOpen]);

  // 鍵盤左右鍵切換
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowRight') {
      setCurrentPage((prev) => Math.min(prev + 1, pages.length - 1));
    } else if (e.key === 'ArrowLeft') {
      setCurrentPage((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [pages.length, onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; 
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900 text-white">
      {/* 頂部工具列 */}
      <div className="flex justify-between items-center px-6 py-4 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <Maximize2 className="text-gray-400 w-5 h-5" />
          <span className="font-medium text-gray-200">{title}</span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-sm font-mono text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
            Page {currentPage + 1} / {pages.length}
          </span>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors group"
          >
            <X className="w-6 h-6 text-gray-400 group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* 簡報內容區塊 (注入 CSS) */}
      <div className="flex-1 flex items-center justify-center bg-gray-950 p-8 relative overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          .presentation-slide {
            font-family: 'PingFang TC', 'Microsoft JhengHei', sans-serif;
            background: white;
            color: #24292e;
            width: 100%;
            max-width: 1100px;
            aspect-ratio: 16 / 9;
            padding: 50px 60px;
            border-radius: 12px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .presentation-slide h1 { color: #0366d6; font-size: 2.2rem; font-weight: 700; margin-bottom: 24px; }
          .presentation-slide h2 { color: #24292e; font-size: 1.5rem; font-weight: 600; border-bottom: 2px solid #e1e4e8; padding-bottom: 8px; margin-top: 32px; margin-bottom: 16px; }
          .presentation-slide h2:first-of-type { margin-top: 0; }
          .presentation-slide ul { list-style-type: none; padding-left: 0; margin-bottom: 16px; }
          .presentation-slide li { margin-bottom: 12px; line-height: 1.6; font-size: 1.15rem; display: flex; align-items: flex-start; }
          .presentation-slide li::before { content: '•'; color: #0366d6; font-weight: bold; display: inline-block; width: 1em; margin-left: -1em; }
          .presentation-slide strong { color: #111; font-weight: 600; }
          
          /* 核心亮點佈局 */
          .presentation-slide .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
          
          /* 卡片設計 */
          .presentation-slide .card { background: #f6f8fa; padding: 20px 24px; border-radius: 8px; border-left: 5px solid #0366d6; margin-bottom: 20px; }
          .presentation-slide .card ul { margin-bottom: 0; }
          .presentation-slide .card li:last-child { margin-bottom: 0; }
          
          /* 警告卡片 */
          .presentation-slide .warning { border-left-color: #d73a49; background: #ffeef0; }
          
          /* KMS 連結區 */
          .presentation-slide .kms-link { margin-top: auto; border-top: 1px dashed #e1e4e8; padding-top: 16px; font-size: 0.95rem; }
          .presentation-slide .kms-link li::before { content: '🔗'; color: #586069; font-size: 0.9rem; }
          .presentation-slide .kms-link a { color: #0366d6; text-decoration: none; font-weight: 500; }
          .presentation-slide .kms-link a:hover { text-decoration: underline; }
        `}} />

        <div 
          className="presentation-slide transform transition-all duration-500 ease-in-out"
          dangerouslySetInnerHTML={{ __html: pages[currentPage] }}
        />

        {/* 左右切換按鈕 */}
        <button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))}
          disabled={currentPage === 0}
          className={`absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all ${currentPage === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:scale-110'}`}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, pages.length - 1))}
          disabled={currentPage === pages.length - 1}
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all ${currentPage === pages.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:scale-110'}`}
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [role, setRole] = useState(null); // 'manager' | 'rd'
  const [selectedProjectId, setSelectedProjectId] = useState(null); // 用於 Manager 的專案階層
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [presentation, setPresentation] = useState({ isOpen: false, pages: [], title: '' });
  const [aiLoadingMessage, setAiLoadingMessage] = useState('');

  // 取得目前選擇的專案 (Manager View)
  const currentProject = PROJECTS.find(p => p.id === selectedProjectId);

  // 模擬 AI 生成簡報 (RD)
  const handleRefactor = () => {
    setAiLoadingMessage('✨ AI 正在提煉您的報告並生成高質感排版...');
    setIsProcessingAI(true);
    setTimeout(() => {
      setIsProcessingAI(false);
      setPresentation({
        isOpen: true,
        pages: MOCK_HTML_PAGES,
        title: 'RD 週報展示 - Alice Chen'
      });
    }, 1500);
  };

  // 模擬 AI 統整專案 (Manager)
  const handleCombine = () => {
    setAiLoadingMessage('🧠 AI 正在統整所有成員進度，生成專案總結...');
    setIsProcessingAI(true);
    setTimeout(() => {
      setIsProcessingAI(false);
      setPresentation({
        isOpen: true,
        pages: MOCK_COMBINED_PAGES,
        title: `專案彙總報告 - ${currentProject.name}`
      });
    }, 2000);
  };

  // 觀看個別 RD 報告 (Manager)
  const handleViewRD = (rdName) => {
    setPresentation({
      isOpen: true,
      pages: MOCK_HTML_PAGES, 
      title: `RD 週報展示 - ${rdName}`
    });
  };

  const logout = () => {
    setRole(null);
    setSelectedProjectId(null);
  };

  // --- 登入畫面 ---
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full flex">
          <div className="w-1/2 bg-blue-600 p-12 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-700 rounded-full blur-3xl opacity-50"></div>
            <div className="relative z-10">
              <Sparkles className="w-12 h-12 mb-6 text-blue-200" />
              <h1 className="text-4xl font-bold mb-4">SyncBoard</h1>
              <p className="text-blue-100 text-lg">
                智能會議開會平台。<br/>讓報告者專注內容，讓聽眾秒懂價值。
              </p>
            </div>
          </div>
          <div className="w-1/2 p-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">選擇您的登入身份</h2>
            <div className="space-y-4">
              <button 
                onClick={() => setRole('manager')}
                className="w-full group flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-800">專案主管 (Manager)</div>
                  <div className="text-sm text-gray-500">檢視團隊進度、AI 統整專案簡報</div>
                </div>
              </button>
              
              <button 
                onClick={() => setRole('rd')}
                className="w-full group flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-800">工程師 (RD)</div>
                  <div className="text-sm text-gray-500">撰寫 Markdown 報告、AI 自動生成排版</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* 頂部導覽列 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">SyncBoard</span>
            <span className="ml-4 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {role === 'manager' ? 'Manager View' : 'RD View'}
            </span>
          </div>
          <button 
            onClick={logout}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            登出
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* === 主管視角 (Manager) === */}
        {role === 'manager' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 狀態 1：專案列表 */}
            {!selectedProjectId && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">專案總覽</h1>
                  <p className="mt-1 text-sm text-gray-500">請選擇一個專案以查看本週的 AI 統整簡報與團隊進度。</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {PROJECTS.map((project) => {
                    const submittedCount = project.rds.filter(r => r.status === 'Submitted').length;
                    const totalCount = project.rds.length;
                    const progress = (submittedCount / totalCount) * 100;
                    
                    return (
                      <div 
                        key={project.id}
                        onClick={() => setSelectedProjectId(project.id)}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all p-6 group flex flex-col h-full"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Folder className="w-6 h-6" />
                          </div>
                          <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            {project.tag}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{project.name}</h3>
                        <p className="text-sm text-gray-500 mb-6 flex-1">{project.description}</p>
                        
                        <div>
                          <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>本週報告繳交進度</span>
                            <span className="font-medium">{submittedCount} / {totalCount}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 狀態 2：單一專案詳細內容 (AI Combine -> 個別成員) */}
            {selectedProjectId && currentProject && (
              <div className="space-y-8">
                {/* 麵包屑導覽 */}
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setSelectedProjectId(null)}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                      {currentProject.name} <span className="text-gray-400 mx-2">|</span> 2026-W32 週報
                    </h1>
                  </div>
                </div>

                {/* Section A: 專案層級 - AI 統整簡報 (優先展示) */}
                <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-2xl shadow-lg p-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
                  <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-white flex-1">
                      <div className="flex items-center space-x-2 mb-3">
                        <Sparkles className="w-5 h-5 text-teal-400" />
                        <span className="text-teal-400 font-semibold tracking-wide text-sm">AI 團隊洞察</span>
                      </div>
                      <h2 className="text-3xl font-bold mb-2">專案進度彙總簡報</h2>
                      <p className="text-gray-300">
                        AI 已自動分析 {currentProject.rds.filter(r=>r.status==='Submitted').length} 位成員提交的報告，並萃取出本週的核心價值、跨部門阻礙與下週目標。
                      </p>
                    </div>
                    
                    <button
                      onClick={handleCombine}
                      className="shrink-0 relative group overflow-hidden rounded-xl p-[2px]"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-teal-400 via-blue-500 to-purple-600 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></span>
                      <div className="relative flex items-center px-8 py-4 bg-slate-900 rounded-lg group-hover:bg-slate-800 transition-all duration-300">
                        <GitMerge className="w-6 h-6 mr-3 text-teal-400 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-lg text-white">
                          播放 AI 彙總簡報
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Section B: 成員層級 - 個別報告列表 */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-gray-500" />
                    團隊成員報告詳情
                  </h3>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-1 divide-y divide-gray-200">
                      {currentProject.rds.map((rd) => (
                        <div key={rd.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-700 font-bold">
                              {rd.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-gray-900">{rd.name}</h4>
                              <div className="flex items-center text-sm text-gray-500 mt-0.5">
                                <span>{rd.role}</span>
                                <span className="mx-2">•</span>
                                <Clock className="w-3.5 h-3.5 mr-1" />
                                <span>{rd.time}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            {rd.status === 'Submitted' ? (
                              <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 已提交
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                                草稿中
                              </span>
                            )}
                            
                            <button 
                              onClick={() => handleViewRD(rd.name)}
                              disabled={rd.status !== 'Submitted'}
                              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                                rd.status === 'Submitted' 
                                ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600' 
                                : 'border-transparent text-gray-400 bg-gray-50 cursor-not-allowed'
                              }`}
                            >
                              預覽簡報
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* === RD 視角 (維持不變) === */}
        {role === 'rd' && (
          <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FileText className="w-6 h-6 mr-3 text-gray-400" />
                  撰寫週報：{PROJECTS[0].name}
                </h1>
                <p className="mt-1 text-sm text-gray-500">專注撰寫 Markdown，AI 會自動為您生成符合團隊規範的兩頁簡報。</p>
              </div>

              {/* Refactor AI 按鈕 */}
              <button
                onClick={handleRefactor}
                className="relative group overflow-hidden rounded-lg p-[2px]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></span>
                <div className="relative flex items-center px-6 py-3 bg-white rounded-md group-hover:bg-opacity-95 transition-all duration-300">
                  <Sparkles className="w-5 h-5 mr-2 text-teal-600 group-hover:scale-110 transition-transform" />
                  <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-600">
                    AI Refactor (生成簡報)
                  </span>
                </div>
              </button>
            </div>

            {/* Markdown 編輯器區塊 */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="ml-4 text-xs font-mono text-gray-500">weekly_report.md</span>
              </div>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="flex-1 w-full p-6 bg-slate-900 text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 leading-relaxed"
                spellCheck="false"
              />
            </div>
          </div>
        )}
      </main>

      {/* AI 處理中的 Overlay */}
      {isProcessingAI && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full flex flex-col items-center shadow-2xl text-center transform animate-in zoom-in duration-300">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">處理中</h3>
            <p className="text-gray-500">{aiLoadingMessage}</p>
          </div>
        </div>
      )}

      {/* 簡報全螢幕元件 */}
      <PresentationModal 
        isOpen={presentation.isOpen}
        onClose={() => setPresentation({ ...presentation, isOpen: false })}
        pages={presentation.pages}
        title={presentation.title}
      />
    </div>
  );
}