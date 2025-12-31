/**
 * 系統配置參數
 * 建議將 API 端點移至環境變數或獨立配置文件中以提升安全性
 */
const SYSTEM_CONFIG = {
    SITE_NAME: "鹿 QA 知識庫", // 已更新為您的新站名
    API_ENDPOINT: "https://api.example.com/v1/query", // 請替換為您實際的後端位置
    TIMEOUT_MS: 5000, // 連線逾時設定
    DEFAULT_ERROR_MSG: "系統暫時無法存取知識庫，請稍後再試或聯繫管理員。"
};

/**
 * 核心資料處理模組
 */
const KnowledgeEngine = {
    /**
     * 初始化系統
     */
    init: function() {
        console.log(`[System] ${SYSTEM_CONFIG.SITE_NAME} Engine Initialized`);
        this.bindEvents();
    },

    /**
     * 綁定介面事件
     */
    bindEvents: function() {
        const submitBtn = document.getElementById('submit-btn');
        const inputField = document.getElementById('user-input');

        if (submitBtn && inputField) {
            submitBtn.addEventListener('click', () => this.handleQuery(inputField.value));
        }
    },

    /**
     * 處理使用者查詢請求
     * @param {string} query - 使用者輸入的問題
     */
    handleQuery: async function(query) {
        if (!query || query.trim() === "") return;

        this.updateUIState('loading');

        try {
            const answer = await this.fetchAnswerFromDatabase(query);
            this.renderResponse(answer);
        } catch (error) {
            console.error("[Connection Error]", error);
            // 這裡不再顯示 "我是 Moose"，而是顯示專業的錯誤提示
            this.renderResponse(SYSTEM_CONFIG.DEFAULT_ERROR_MSG, true);
        } finally {
            this.updateUIState('idle');
        }
    },

    /**
     * 連接資料庫獲取答案 (模擬後端通訊)
     * @param {string} query 
     * @returns {Promise<string>}
     */
    fetchAnswerFromDatabase: async function(query) {
        // 建立 AbortController 以處理請求逾時
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SYSTEM_CONFIG.TIMEOUT_MS);

        try {
            // 實際串接時請取消以下註解並填入正確邏輯
            /*
            const response = await fetch(SYSTEM_CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: query }),
                signal: controller.signal
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.answer; 
            */

            // 模擬資料庫回傳 (測試用，正式上線請移除)
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(`這是來自「${SYSTEM_CONFIG.SITE_NAME}」資料庫的檢索結果：針對您的問題「${query}」，系統已找到相關紀錄。`);
                }, 1000);
            });

        } finally {
            clearTimeout(timeoutId);
        }
    },

    /**
     * 渲染回應至介面
     * @param {string} text - 顯示文字
     * @param {boolean} isError - 是否為錯誤訊息
     */
    renderResponse: function(text, isError = false) {
        const displayArea = document.getElementById('response-area');
        if (!displayArea) return;

        displayArea.innerHTML = text;
        displayArea.style.color = isError ? '#d32f2f' : '#333333'; // 錯誤時使用深紅色
    },

    /**
     * 更新介面狀態 (讀取中/閒置)
     * @param {string} state 
     */
    updateUIState: function(state) {
        const btn = document.getElementById('submit-btn');
        if (!btn) return;
        
        if (state === 'loading') {
            btn.disabled = true;
            btn.innerText = "資料檢索中...";
        } else {
            btn.disabled = false;
            btn.innerText = "送出提問";
        }
    }
};

// 確保 DOM 載入後啟動引擎
document.addEventListener('DOMContentLoaded', () => {
    KnowledgeEngine.init();
});