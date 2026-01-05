/**
 * 鹿 QA 核心邏輯 - app.js
 * 包含：搜尋邏輯(Fuse.js)、UI互動、資料處理
 */

// 定義主題色系
const THEMES = [
    { name: 'pink', color: '#ec4899', light: '#fce7f3' },
    { name: 'blue', color: '#3b82f6', light: '#dbeafe' },
    { name: 'purple', color: '#8b5cf6', light: '#ede9fe' },
    { name: 'orange', color: '#f97316', light: '#ffedd5' },
    { name: 'green', color: '#10b981', light: '#d1fae5' }
];

function deerApp() {
    return {
        // 資料源
        allData: window.DEER_QA || [],
        
        // 搜尋與分頁
        search: '',
        currentPage: 1, 
        itemsPerPage: 30,
        
        // UI 狀態
        currentTab: 'home',
        isDark: false,
        flippedCards: [],
        showToast: false,
        toastMessage: '',
        scrollY: 0,
        installPrompt: null,
        
        // 主題與背景
        themes: THEMES,
        currentTheme: THEMES[0],
        backgrounds: ['./images/backgrounds/bg1.jpg', './images/backgrounds/bg2.jpg', './images/backgrounds/bg3.jpg'],
        
        // 身分證功能變數
        idCardName: '', 
        selectedBg: './images/backgrounds/bg1.jpg', 
        generatedIdNumber: '',
        
        // 分享與截圖變數
        showShareModal: false, 
        randomShareBg: '',
        
        // 系統狀態
        appVersion: '4.1.0', // 版本號更新
        showUpdateModal: false,
        showTutorial: false,
        tutorialStep: 0,
        tutorialSteps: [
            { title: "智慧搜尋", desc: "找不到問題？直接輸入關鍵字，例如「身高」、「生日」。" },
            { title: "功能切換", desc: "點這裡切換到「AI 聊天」、「大會考」或「身分證」。" },
            { title: "AI 麋鹿", desc: "無聊時可以找 AI 聊天，它現在更聰明了！" }
        ],
        
        // 粉絲等級系統
        fanXP: 0,
        
        // AI 聊天變數
        chatInput: '', chatHistory: [], isTyping: false, aiStatus: 'offline', aiStatusText: 'Offline', wakeUpCount: 0, aiBackground: '',
        
        // 測驗變數
        quizStarted: false, quizEnded: false, quizData: [], currentQuizIndex: 0, currentOptions: [], hasAnswered: false, selectedOption: null, quizScore: 0, currentCorrectText: '',

        // 初始化
        initApp() {
            // 讀取主題
            const savedTheme = localStorage.getItem('deer_theme');
            if (savedTheme) this.currentTheme = JSON.parse(savedTheme);

            // 讀取經驗值
            const savedXP = localStorage.getItem('deer_xp');
            if (savedXP) this.fanXP = parseInt(savedXP);
            
            // 偵測深色模式
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) this.toggleDarkMode();
            
            // PWA 安裝攔截
            window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.installPrompt = e; });
            
            // AI 初始化
            this.aiBackground = this.backgrounds[0];
            this.updateAIStatusText();
            this.addXP(10); // 每日登入獎勵

            // 版本與教學檢查
            const storedVersion = localStorage.getItem('deer_app_version');
            if (storedVersion !== this.appVersion) {
                this.showUpdateModal = true;
            } else if (!localStorage.getItem('deer_tutorial_done')) {
                setTimeout(() => this.startTutorial(), 500);
            }

            // iOS 鍵盤遮擋修復
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', () => {
                    document.body.style.height = window.visualViewport.height + 'px';
                });
            }
        },

        // --- 把這段程式碼貼到 app.js 覆蓋原本的 smartSearch ---

smartSearch(query) {
    if (!query) return [];
    
    // 1. 預先處理：轉小寫
    let rawQuery = query.toLowerCase();

    // 2. 第一層過濾：移除「語助詞」與「無意義標點」 (雜訊過濾器)
    // 讓 "主播幾歲啊" -> "主播幾歲"
    // 讓 "傳主播幾歲???" -> "傳主播幾歲"
    let cleanQuery = rawQuery
        .replace(/[.,?!。，？！、]/g, '') // 移除標點符號
        .replace(/啊|喔|哦|耶|吧|呢|嗎|嘛|哈|啦|欸|誒|阿|呀/g, '') // 移除語助詞
        .replace(/請問|想問|有沒有|知道|覺得|各位|大家|幫我/g, ''); // 移除客套話

    // 3. 第二層過濾：同義詞替換 (AI 理解邏輯)
    // 讓 "主播幾歲" -> "鹿幾歲"
    let normalizedQuery = cleanQuery
        .replace(/主播|妳|你|她|老婆|姐姐|鹿鹿/g, '鹿') 
        .replace(/男朋友|男友/g, '男朋友');

    // 如果過濾完變空字串 (例如使用者只打 "啊？")，就回傳空
    if (!normalizedQuery.trim()) return [];

    console.log(`搜尋除錯: 原本[${query}] -> 過濾後[${cleanQuery}] -> 最終[${normalizedQuery}]`);

    // 4. 使用 Fuse.js 進行模糊搜尋
    if (typeof Fuse !== 'undefined') {
        const fuse = new Fuse(this.allData, {
            keys: [
                { name: 'tags', weight: 0.6 }, // 提高標籤權重 (最準)
                { name: 'q', weight: 0.3 },    // 問題次之
                { name: 'a', weight: 0.1 }     // 答案最後
            ],
            includeScore: true,
            threshold: 0.5, //稍微放寬一點標準 (原本0.4，改0.5讓模糊匹配更容易)
            ignoreLocation: true,
            useExtendedSearch: true
        });
        
        const results = fuse.search(normalizedQuery);
        return results.map(res => ({ ...res.item, score: 1 })); 
    } else {
        // 回退邏輯 (若 CDN 失敗)
        const terms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
        return this.allData.map(item => {
            let score = 0;
            const qText = item.q.toLowerCase();
            const aText = item.a.toLowerCase();
            const tags = (item.tags || []).join(' ').toLowerCase();
            terms.forEach(term => {
                if (tags.includes(term)) score += 30; // 加分加重
                if (qText.includes(term)) score += 15;
                if (aText.includes(term)) score += 5;
            });
            return { ...item, score };
        }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    }
},

        get filteredQuestions() { 
            if (this.search.trim() === '') return this.allData; 
            return this.smartSearch(this.search);
        },
        
        // --- 分頁邏輯 ---
        get paginatedData() { const start = (this.currentPage - 1) * this.itemsPerPage; return this.filteredQuestions.slice(start, start + this.itemsPerPage); },
        get totalPages() { return Math.ceil(this.filteredQuestions.length / this.itemsPerPage); },
        nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; window.scrollTo(0,0); },
        prevPage() { if (this.currentPage > 1) this.currentPage--; window.scrollTo(0,0); },

        // --- 介面操作 ---
        closeUpdateModal() {
            this.showUpdateModal = false;
            localStorage.setItem('deer_app_version', this.appVersion);
            if (!localStorage.getItem('deer_tutorial_done')) {
                setTimeout(() => this.startTutorial(), 500);
            }
        },
        startTutorial() {
            this.showTutorial = true;
            this.tutorialStep = 1;
            window.scrollTo(0, 0);
            this.changeTab('home');
        },
        nextTutorialStep() {
            if (this.tutorialStep < this.tutorialSteps.length) {
                this.tutorialStep++;
                if (this.tutorialStep === 3) this.changeTab('ai');
                else this.changeTab('home');
            } else {
                this.endTutorial();
            }
        },
        endTutorial() {
            this.showTutorial = false;
            this.tutorialStep = 0;
            this.changeTab('home');
            localStorage.setItem('deer_tutorial_done', 'true');
        },
        setTheme(t) { this.currentTheme = t; localStorage.setItem('deer_theme', JSON.stringify(t)); },
        handleScroll() { this.scrollY = window.scrollY; },
        
        // --- 粉絲等級與 XP ---
        calculateLevel(xp) { return Math.floor(xp / 100); },
        addXP(amount) { this.fanXP += amount; localStorage.setItem('deer_xp', this.fanXP); },
        get currentLevelInfo() {
            const level = this.calculateLevel(this.fanXP);
            let title = "路人粉 🌱";
            let next = 500;
            if (this.fanXP >= 5000) { title = "傳說鹿神 👑"; next = "MAX"; }
            else if (this.fanXP >= 2000) { title = "骨灰級鐵粉 🔥"; next = 5000; }
            else if (this.fanXP >= 1000) { title = "資深鹿迷 💖"; next = 2000; }
            else if (this.fanXP >= 500) { title = "實習麋鹿 🦌"; next = 1000; }
            return { title, next };
        },
        get xpPercentage() { return (this.fanXP % 100); },

        // --- AI 邏輯 ---
        updateAIStatusText() {
            if (this.aiStatus === 'offline') {
                const statusTexts = ['呼呼大睡中... 😴', '正在直播！快來看 🎥', '正在打傳說 🎮'];
                this.aiStatusText = statusTexts[Math.floor(Math.random() * statusTexts.length)];
            } else {
                this.aiStatusText = 'Online';
            }
        },
        wakeUpAI() { 
            if (this.aiStatus === 'online') return; 
            this.wakeUpCount++; 
            if (this.wakeUpCount >= 5) { 
                this.aiStatus = 'online'; 
                this.addBotMessage("哈囉！我是 AI 麋鹿，關於鹿的事情我都略懂略懂 😎"); 
                this.wakeUpCount = 0; 
                confetti({ particleCount: 30, spread: 50, origin: { y: 0.5 } }); 
            } 
        },
        sendMessage() { 
            if(!this.chatInput) return; 
            const userText = this.chatInput;
            this.chatHistory.push({id: Date.now(), text: userText, isUser: true}); 
            this.chatInput = ''; this.isTyping = true; 
            this.addXP(5);

            setTimeout(() => { 
                this.isTyping = false; 
                let response = "";
                const lower = userText.toLowerCase();
                if (['hi', 'hello', '你好', '嗨', '安安'].some(w => lower.includes(w))) {
                    response = "哈囉！我是 AI 麋鹿，關於鹿的事情我都略懂略懂 😎";
                    if (this.idCardName) response += ` ${this.idCardName}！`;
                } else {
                    const results = this.smartSearch(userText);
                    if (results.length > 0) {
                        const prefixes = ["這題我知道！✨", "根據資料顯示... 📚", "幫你查到了！💡", "嗯... 是這樣的："];
                        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                        response = `${prefix}\n${results[0].a}`;
                    } else {
                        response = "這題超綱了！我去翻翻筆記... 🤔 (您可以試著換個問法，例如「身高」、「生日」)";
                    }
                }
                this.addBotMessage(response);
            }, 800); 
        },
        addBotMessage(text) { 
            this.chatHistory.push({ id: Date.now(), text: text, isUser: false }); 
            this.$nextTick(() => { document.getElementById('chatContainer').scrollTop = 99999; }); 
        },

        // --- 圖片生成 ---
        generateImageFromTemplate(templateId) {
            this.showShareModal = true;
            const container = document.getElementById('shareResultContainer');
            container.innerHTML = '<div class="p-8 text-center text-gray-400 animate-pulse">正在生成圖片... ✨</div>';
            setTimeout(() => {
                const el = document.getElementById(templateId);
                // 動態載入 html2canvas (若尚未載入) 或直接使用
                html2canvas(el, { backgroundColor: null, useCORS: true, scale: 3, logging: false }).then(canvas => {
                    container.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = canvas.toDataURL("image/png");
                    img.className = "w-full h-auto rounded-xl shadow-sm";
                    container.appendChild(img);
                    this.addXP(20);
                }).catch(err => { container.innerHTML = '<div class="text-red-500 text-center p-4 text-xs">生成失敗，請稍後再試</div>'; });
            }, 800);
        },
        generateIDCard() {
            if (!this.idCardName) { this.showNotification("請輸入暱稱！"); return; }
            this.generatedIdNumber = 'MOOSE-' + Math.floor(1000 + Math.random() * 9000);
            this.generateImageFromTemplate('idCardTemplate');
        },
        openShareModal(item) {
            this.randomShareBg = this.backgrounds[Math.floor(Math.random() * this.backgrounds.length)];
            document.getElementById('shareCardQ').innerText = item.q;
            document.getElementById('shareCardA').innerText = item.short || item.a;
            this.generateImageFromTemplate('shareCardTemplate');
        },

        // --- 大會考 ---
        startQuizMode() { this.changeTab('quiz'); this.quizStarted = false; this.quizEnded = false; },
        startQuiz() { this.quizStarted = true; this.quizEnded = false; this.currentQuizIndex = 0; this.quizScore = 0; this.prepareQuestion(); },
        prepareQuestion() { 
            this.hasAnswered = false; 
            this.currentCorrectText = this.currentQuestion.short || this.currentQuestion.a; 
            // 隨機產生選項邏輯
            this.currentOptions = [this.currentCorrectText, 'AOV', 'BlackPink', 'Sleep'].sort(() => 0.5 - Math.random()); 
        },
        get currentQuestion() { return this.allData[this.currentQuizIndex]; },
        checkAnswer(opt) { this.hasAnswered = true; this.selectedOption = opt; if(opt === this.currentCorrectText) { this.quizScore++; this.addXP(10); } },
        nextQuestion() { if(this.currentQuizIndex < 4) { this.currentQuizIndex++; this.prepareQuestion(); } else { this.quizEnded = true; if(this.quizScore===5) this.addXP(100); } },
        shareResult() {
            this.randomShareBg = this.backgrounds[Math.floor(Math.random() * this.backgrounds.length)];
            const score = this.quizScore * 20;
            setTimeout(() => {
                document.getElementById('shareScoreNum').innerText = score;
                const titleEl = document.getElementById('shareScoreTitle');
                const commentEl = document.getElementById('shareScoreComment');
                if (this.quizScore === 5) { titleEl.innerText = "Gold Moose Medal 🏆"; commentEl.innerText = "你是真正的傳說鹿粉！🔥"; } 
                else if (this.quizScore >= 3) { titleEl.innerText = "Silver Medal 🥈"; commentEl.innerText = "還不錯喔，繼續加油！"; } 
                else { titleEl.innerText = "Try Again 🤡"; commentEl.innerText = "去複習一下再來吧！"; }
                this.generateImageFromTemplate('quizResultTemplate');
            }, 100);
        },

        // --- 其他工具 ---
        async installPWA() { if (this.installPrompt) { this.installPrompt.prompt(); const { outcome } = await this.installPrompt.userChoice; if (outcome === 'accepted') this.installPrompt = null; } },
        changeTab(tab) { this.currentTab = tab; window.scrollTo(0,0); if(tab === 'ai') { this.wakeUpCount = 0; this.aiBackground = this.backgrounds[Math.floor(Math.random() * this.backgrounds.length)]; this.updateAIStatusText(); if (Math.random() < 0.7) this.aiStatus = 'offline'; else this.aiStatus = 'online'; } },
        toggleDarkMode() { this.isDark = !this.isDark; document.documentElement.classList.toggle('dark', this.isDark); },
        toggleCard(id) { if (this.flippedCards.includes(id)) this.flippedCards = this.flippedCards.filter(cid => cid !== id); else this.flippedCards.push(id); },
        showNotification(msg) { this.toastMessage = msg; this.showToast = true; setTimeout(() => this.showToast = false, 3000); },
        tabClass(tab) { const active = "bg-white text-theme shadow-sm font-bold"; const inactive = "text-gray-500 hover:text-gray-900"; return `px-5 py-2 rounded-full text-sm transition-all whitespace-nowrap ${this.currentTab === tab ? active : inactive}`; },
        getOptionClass(opt) { if (!this.hasAnswered) return "bg-white dark:bg-gray-800 hover:bg-theme-light border-transparent"; if (opt === this.currentCorrectText) return "bg-green-100 border-green-500 text-green-800"; if (opt === this.selectedOption) return "bg-red-100 border-red-500 text-red-800"; return "opacity-50"; },
        triggerEasterEgg(type) { if (type === 'profile') { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); this.showNotification("🎉 XP +50!"); this.addXP(50); } }
    }
}