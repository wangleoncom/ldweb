/**
 * 鹿 QA 核心邏輯 - app.js (v5.2 Sound & Events)
 */

// 輕量級點擊音效 (Base64 編碼，無需額外檔案)
const CLICK_SOUND_SRC = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAEA//8BAAAAAAEA//8="; // 極短的空音效，實際運作建議用下方更有感的
const POP_SOUND_SRC = "data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgBUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzb21tcDQyAFRTU0UAAAAPAAADTGF2ZjU3LjgzLjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAZAAABqwA0ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888//uQZAAABHp5UAAAAAAJHJSAAAAAAEZkY8AAACAmclQAAAAAD/8z+CgAAAM888888888888888888888888888888888888888888888888888888888888888888888888"; // 這是一個很短的「啵」聲

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
        allQuizData: window.DEER_QUIZ || [],
        
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
        
        // 音效設定
        isMuted: false, // 預設開啟音效
        audioElement: null,

        // 主題與背景
        themes: THEMES,
        currentTheme: THEMES[0],
        backgrounds: ['./images/backgrounds/bg1.jpg', './images/backgrounds/bg2.jpg', './images/backgrounds/bg3.jpg'],
        
        // 身分證變數
        idCardName: '', selectedBg: './images/backgrounds/bg1.jpg', generatedIdNumber: '',
        
        // 分享與截圖
        showShareModal: false, 
        randomShareBg: '',
        
        // 系統狀態
        appVersion: '5.2.0',
        showUpdateModal: false,
        showTutorial: false,
        tutorialStep: 0,
        tutorialSteps: [
            { title: "語音對話", desc: "現在按一下麥克風，就可以直接用講的問 AI 喔！" },
            { title: "紀念日追蹤", desc: "首頁新增了重要時刻，一起倒數鹿🦌的生日！" },
            { title: "互動音效", desc: "點擊按鈕會有可愛的音效，也可以在右上角靜音。" }
        ],
        
        fanXP: 0,
        
        // AI 聊天變數
        chatInput: '', chatHistory: [], isTyping: false, aiStatus: 'offline', aiStatusText: 'Offline', wakeUpCount: 0, aiBackground: '',
        isListening: false, 
        
        // 測驗變數
        quizStarted: false, quizEnded: false, 
        quizTakerName: '', 
        currentQuizSet: [], 
        currentQuizIndex: 0, 
        quizScore: 0, 
        hasAnswered: false, 
        selectedOption: null,
        examDate: '',

        initApp() {
            // 初始化音效
            this.audioElement = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'); // 使用簡單的 Pop 音效連結
            this.audioElement.volume = 0.5;

            // 讀取設定
            const savedTheme = localStorage.getItem('deer_theme');
            if (savedTheme) this.currentTheme = JSON.parse(savedTheme);

            const savedXP = localStorage.getItem('deer_xp');
            if (savedXP) this.fanXP = parseInt(savedXP);

            const savedMute = localStorage.getItem('deer_muted');
            if (savedMute !== null) this.isMuted = savedMute === 'true';
            
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) this.toggleDarkMode();
            
            window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.installPrompt = e; });
            
            this.aiBackground = this.backgrounds[0];
            this.updateAIStatusText();
            this.addXP(10);

            const storedVersion = localStorage.getItem('deer_app_version');
            if (storedVersion !== this.appVersion) {
                this.showUpdateModal = true;
            } else if (!localStorage.getItem('deer_tutorial_done')) {
                setTimeout(() => this.startTutorial(), 500);
            }

            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', () => {
                    document.body.style.height = window.visualViewport.height + 'px';
                });
            }
        },

        // --- 🔊 音效控制 ---
        toggleMute() {
            this.isMuted = !this.isMuted;
            localStorage.setItem('deer_muted', this.isMuted);
            if (!this.isMuted) this.playSound(); // 測試聲音
        },
        playSound() {
            if (this.isMuted || !this.audioElement) return;
            // 重置音效以便快速連點
            this.audioElement.currentTime = 0;
            this.audioElement.play().catch(e => console.log('Audio play blocked'));
        },

        // --- 📅 日期與紀念日邏輯 ---
        get dateInfo() {
            const today = new Date();
            const currentYear = today.getFullYear();
            
            // 1. 生日邏輯 (10/03)
            const birthday = new Date(currentYear, 9, 3); // 月份從0開始，9是10月
            if (today > birthday) birthday.setFullYear(currentYear + 1); // 如果今年過了，算明年
            const diffBirthday = Math.ceil((birthday - today) / (1000 * 60 * 60 * 24));
            
            // 2. TikTok 出道日 (2024/8/7)
            const tiktokStart = new Date(2024, 7, 7);
            const daysTikTok = Math.floor((today - tiktokStart) / (1000 * 60 * 60 * 24));

            // 3. Instagram 出道日 (2024/6/2)
            const igStart = new Date(2024, 5, 2);
            const daysIG = Math.floor((today - igStart) / (1000 * 60 * 60 * 24));

            return {
                birthdayDiff: diffBirthday,
                isBirthdayClose: diffBirthday <= 60, // 60天內才顯示倒數
                daysTikTok,
                daysIG
            };
        },

        // --- 核心：智慧搜尋 ---
        smartSearch(query) {
            if (!query) return [];
            let rawQuery = query.toLowerCase();
            let cleanQuery = rawQuery
                .replace(/[.,?!。，？！、]/g, '')
                .replace(/啊|喔|哦|耶|吧|呢|嗎|嘛|哈|啦|欸|誒|阿|呀/g, '')
                .replace(/請問|想問|有沒有|知道|覺得|各位|大家|幫我/g, '');

            let normalizedQuery = cleanQuery
                .replace(/主播|妳|你|她|老婆|姐姐|鹿鹿|主包|鹿比醬|鹿🦌/g, '鹿') 
                .replace(/男朋友|男友/g, '男朋友');

            if (!normalizedQuery.trim()) return [];

            if (typeof Fuse !== 'undefined') {
                const fuse = new Fuse(this.allData, {
                    keys: [{ name: 'tags', weight: 0.6 }, { name: 'q', weight: 0.3 }, { name: 'a', weight: 0.1 }],
                    includeScore: true, threshold: 0.5, ignoreLocation: true, useExtendedSearch: true
                });
                return fuse.search(normalizedQuery).map(res => ({ ...res.item, score: 1 }));
            } else {
                return []; 
            }
        },

        get filteredQuestions() { 
            if (this.search.trim() === '') return this.allData; 
            return this.smartSearch(this.search);
        },
        
        get paginatedData() { const start = (this.currentPage - 1) * this.itemsPerPage; return this.filteredQuestions.slice(start, start + this.itemsPerPage); },
        get totalPages() { return Math.ceil(this.filteredQuestions.length / this.itemsPerPage); },
        nextPage() { 
            this.playSound();
            if (this.currentPage < this.totalPages) this.currentPage++; 
            window.scrollTo(0,0); 
        },
        prevPage() { 
            this.playSound();
            if (this.currentPage > 1) this.currentPage--; 
            window.scrollTo(0,0); 
        },

        // --- UI 操作 ---
        closeUpdateModal() {
            this.playSound();
            this.showUpdateModal = false;
            localStorage.setItem('deer_app_version', this.appVersion);
            if (!localStorage.getItem('deer_tutorial_done')) setTimeout(() => this.startTutorial(), 500);
        },
        startTutorial() { this.showTutorial = true; this.tutorialStep = 1; window.scrollTo(0, 0); this.changeTab('home'); },
        nextTutorialStep() {
            this.playSound();
            if (this.tutorialStep < this.tutorialSteps.length) {
                this.tutorialStep++;
                if (this.tutorialStep === 3) this.changeTab('ai');
                else this.changeTab('home');
            } else { this.endTutorial(); }
        },
        endTutorial() { this.playSound(); this.showTutorial = false; this.tutorialStep = 0; this.changeTab('home'); localStorage.setItem('deer_tutorial_done', 'true'); },
        setTheme(t) { this.playSound(); this.currentTheme = t; localStorage.setItem('deer_theme', JSON.stringify(t)); },
        handleScroll() { this.scrollY = window.scrollY; },
        
        calculateLevel(xp) { return Math.floor(xp / 100); },
        addXP(amount) { this.fanXP += amount; localStorage.setItem('deer_xp', this.fanXP); },
        get currentLevelInfo() {
            const level = this.calculateLevel(this.fanXP);
            let title = "路人粉 🌱"; let next = 500;
            if (this.fanXP >= 5000) { title = "傳說鹿神 👑"; next = "MAX"; }
            else if (this.fanXP >= 2000) { title = "骨灰級鐵粉 🔥"; next = 5000; }
            else if (this.fanXP >= 1000) { title = "資深鹿迷 💖"; next = 2000; }
            else if (this.fanXP >= 500) { title = "實習麋鹿 🦌"; next = 1000; }
            return { title, next };
        },
        get xpPercentage() { return (this.fanXP % 100); },

        // --- AI & 語音功能 ---
        updateAIStatusText() {
            if (this.aiStatus === 'offline') {
                const statusTexts = ['呼呼大睡中... 😴', '正在跟哺嚕玩🐱', '正在打傳說 🎮'];
                this.aiStatusText = statusTexts[Math.floor(Math.random() * statusTexts.length)];
            } else { this.aiStatusText = 'Online'; }
        },
        wakeUpAI() { 
            this.playSound();
            if (this.aiStatus === 'online') return; 
            this.wakeUpCount++; 
            if (this.wakeUpCount >= 5) { 
                this.aiStatus = 'online'; 
                this.addBotMessage("哈囉！我是 AI 麋鹿，你可以打字或用語音問我問題喔！🎤"); 
                this.wakeUpCount = 0; 
                confetti({ particleCount: 30, spread: 50, origin: { y: 0.5 } }); 
            } 
        },
        startVoiceInput() {
            this.playSound();
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                this.showNotification("您的瀏覽器不支援語音輸入 😢");
                return;
            }
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'zh-TW'; 
            recognition.interimResults = false;
            recognition.onstart = () => { this.isListening = true; this.showNotification("正在聆聽中... 👂"); };
            recognition.onend = () => { this.isListening = false; };
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.chatInput = transcript;
                this.sendMessage(); 
            };
            recognition.start();
        },
        sendMessage() { 
            if(!this.chatInput) return; 
            this.playSound();
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
                } else {
                    const results = this.smartSearch(userText);
                    if (results.length > 0) {
                        const prefixes = ["這題我知道！✨", "根據資料顯示... 📚", "幫你查到了！💡", "嗯... 是這樣的："];
                        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                        response = `${prefix}\n${results[0].a}`;
                    } else {
                        response = "這題超綱了！我去翻翻筆記... 🤔 (您可以試著換個問法)";
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
            this.playSound();
            this.showShareModal = true;
            const container = document.getElementById('shareResultContainer');
            container.innerHTML = '<div class="flex flex-col items-center justify-center h-64"><div class="w-8 h-8 border-4 border-theme border-t-transparent rounded-full animate-spin mb-4"></div><div class="text-gray-400 font-bold animate-pulse">正在沖洗照片... ✨</div></div>';
            
            setTimeout(() => {
                const el = document.getElementById(templateId);
                el.style.display = 'flex'; 
                
                html2canvas(el, { 
                    backgroundColor: null, 
                    useCORS: true, 
                    scale: 3, 
                    logging: false,
                    allowTaint: true
                }).then(canvas => {
                    container.innerHTML = '';
                    const img = new Image();
                    img.src = canvas.toDataURL("image/png");
                    img.className = "w-full h-auto rounded-xl shadow-lg object-contain max-h-[70vh]";
                    img.alt = "長按儲存圖片";
                    container.appendChild(img);
                    el.style.display = 'none';
                    this.addXP(20);
                }).catch(err => { 
                    console.error(err);
                    container.innerHTML = '<div class="text-red-500 text-center p-4 font-bold">圖片生成失敗 😭<br>請稍後再試</div>'; 
                });
            }, 500);
        },
        generateIDCard() {
            this.playSound();
            if (!this.idCardName) { this.showNotification("請輸入暱稱！"); return; }
            this.generatedIdNumber = 'MOOSE-' + Math.floor(1000 + Math.random() * 9000);
            this.generateImageFromTemplate('idCardTemplate');
        },
        openShareModal(item) {
            this.playSound();
            this.randomShareBg = this.backgrounds[Math.floor(Math.random() * this.backgrounds.length)];
            document.getElementById('shareCardQ').innerText = item.q;
            document.getElementById('shareCardA').innerText = item.short || item.a;
            this.generateImageFromTemplate('shareCardTemplate');
        },

        // --- 大會考 2.0 ---
        startQuizMode() { this.changeTab('quiz'); this.quizStarted = false; this.quizEnded = false; },
        startQuiz() { 
            this.playSound();
            if (!this.quizTakerName || this.quizTakerName.trim() === '') {
                this.showNotification("請先輸入你的名字！✍️（不一定要本名）");
                return;
            }

            this.quizStarted = true; 
            this.quizEnded = false; 
            this.currentQuizIndex = 0; 
            this.quizScore = 0;
            
            if (this.allQuizData.length > 0) {
                this.currentQuizSet = this.allQuizData.sort(() => 0.5 - Math.random()).slice(0, 10);
            } else {
                this.currentQuizSet = this.allData.sort(() => 0.5 - Math.random()).slice(0, 10).map(item => ({
                    q: item.q, a: item.short || item.a,
                    options: [item.short || item.a, '不知道', '秘密', '去問AI'].sort(() => 0.5 - Math.random())
                }));
            }
            this.prepareQuestion(); 
        },
        prepareQuestion() { 
            this.hasAnswered = false; 
            const q = this.currentQuestion;
            if (!q.options) {
                this.currentOptions = [q.a, 'AOV', 'Sleep', 'Pink'].sort(() => 0.5 - Math.random());
            } else {
                this.currentOptions = [...q.options].sort(() => 0.5 - Math.random());
            }
        },
        get currentQuestion() { return this.currentQuizSet[this.currentQuizIndex]; },
        checkAnswer(opt) { 
            this.playSound();
            this.hasAnswered = true; 
            this.selectedOption = opt; 
            if(opt === this.currentQuestion.a) { 
                this.quizScore++; 
                this.addXP(10); 
            } 
        },
        nextQuestion() { 
            this.playSound();
            if(this.currentQuizIndex < this.currentQuizSet.length - 1) { 
                this.currentQuizIndex++; 
                this.prepareQuestion(); 
            } else { 
                this.endQuiz();
            } 
        },
        endQuiz() {
            this.quizEnded = true;
            if(this.quizScore === this.currentQuizSet.length) this.addXP(100);
            this.randomShareBg = this.backgrounds[Math.floor(Math.random() * this.backgrounds.length)];
            this.examDate = new Date().toISOString().split('T')[0];
            setTimeout(() => {
                this.generateImageFromTemplate('examPaperTemplate');
            }, 1000);
        },

        async installPWA() { if (this.installPrompt) { this.installPrompt.prompt(); const { outcome } = await this.installPrompt.userChoice; if (outcome === 'accepted') this.installPrompt = null; } },
        
        changeTab(tab) { 
            this.playSound();
            this.currentTab = tab; 
            window.scrollTo(0,0); 
            if(tab === 'ai') { 
                this.wakeUpCount = 0; 
                this.aiBackground = this.backgrounds[Math.floor(Math.random() * this.backgrounds.length)]; 
                this.updateAIStatusText(); 
                if (Math.random() < 0.7) this.aiStatus = 'offline'; else this.aiStatus = 'online'; 
            } 
        },
        toggleDarkMode() { 
            this.playSound();
            this.isDark = !this.isDark; 
            document.documentElement.classList.toggle('dark', this.isDark); 
        },
        toggleCard(id) { 
            this.playSound();
            if (this.flippedCards.includes(id)) this.flippedCards = this.flippedCards.filter(cid => cid !== id); 
            else this.flippedCards.push(id); 
        },
        showNotification(msg) { this.toastMessage = msg; this.showToast = true; setTimeout(() => this.showToast = false, 3000); },
        tabClass(tab) { const active = "bg-white/90 text-theme shadow-md font-bold scale-105"; const inactive = "text-gray-500 hover:text-gray-900"; return `px-5 py-2 rounded-full text-sm transition-all whitespace-nowrap ${this.currentTab === tab ? active : inactive}`; },
        getOptionClass(opt) { 
            if (!this.hasAnswered) return "bg-white/60 dark:bg-gray-800/60 hover:bg-white border-transparent"; 
            if (opt === this.currentQuestion.a) return "bg-green-100 border-green-500 text-green-800 shadow-[0_0_15px_rgba(34,197,94,0.4)]"; 
            if (opt === this.selectedOption) return "bg-red-100 border-red-500 text-red-800"; 
            return "opacity-40"; 
        },
        triggerEasterEgg(type) { if (type === 'profile') { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); this.showNotification("🎉 XP +50!"); this.addXP(50); } }
    }
}