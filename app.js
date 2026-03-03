/**
 * ==========================================================================
 * 老王專屬秘密基地 - 核心邏輯腳本 (v17.0 終極備援版)
 * 開發者: Wang Li En
 * 更新項目: 多重 API Key 輪詢 / 嚴格身分定義 / 敏感詞過濾 / AI 降級備援機制
 * ==========================================================================
 */

// 🔥 把你的多組 API Keys 填在這裡，系統會自動從第一個開始輪詢，失敗自動換下一個
const GEMINI_KEYS = [
    "AIzaSy" + "CHIEH65s9fG3-Eu2LMUSgFCEBQ_1Zn3RE", 
    "AIzaSy" + "A6RpZEIdvVh3hy-wjJVWFTQEEet21c2C4",
    "AIzaSy" + "BcCFA9iOBmOOhzJFCc42C6l7bkucZkbVc",
    "AIzaSy" + "DnN7dI_VQuSbBvmOQVyrSunC3ZzojkrJ8"
];

const GROQ_KEYS = [
    "gsk_" + "sMZonySCKytWM5Nv1aY2WGdyb3FYzjHGYQ0bDcKirWg1djX2dKoo", 
    "gsk_" + "3lubbjmEZHoK0briz0n1WGdyb3FYLOwjIrA2qRs2COiiRirNXvNk",
    "gsk_" + "GynmzVAEu8fmJtTqBcIeWGdyb3FYKuW2oE9aYEYkRplAKItSJYG3",
    "gsk_" + "5cNCkLN2i54G1jlnl4nTWGdyb3FYCQIrAJhJKAxhL1wAyLtRac4v"
];

// --- 系統常數與資料庫 ---
const qaData = window.QA_DB || window.wangQuiz_DB || []; 
const quizData = window.QUIZ_DB || window.wangQuiz_DB || [];
const WATERMARK_TEXT = "老王專屬秘密基地";
const STORAGE_KEY = 'wangAppConfig_V17_PRO';

// --- 全域狀態管理 ---
let appSettings = { 
    exp: 0, 
    qaPerPage: 6, 
    soundOn: true, 
    perfMode: false, 
    lastCheckIn: "",
    voiceReply: false, 
    aiLimitDate: "", 
    aiUsageCount: 0  
};

let currentAIEngine = 'auto'; // auto, groq, gemini, local
let aiMemory = []; 
let currentAbortController = null; 
let currentAttachedImageBase64 = null; 
let hasShownAIWarning = false; 

// 安全轉義 HTML 內聯屬性的輔助函數
function escapeForInlineHandler(str) {
    if (!str) return "";
    return str.replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/"/g, '&quot;')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '');
}

// --- 語音辨識 API ---
let speechRecognition = null;
let isRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = 'zh-TW';
    speechRecognition.interimResults = false;
    
    speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const inputEl = document.getElementById('ai-input');
        if(inputEl) {
            inputEl.value += transcript;
            inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
        }
        stopRecordingUI();
        
        const sendBtn = document.getElementById('ai-send-btn');
        if (sendBtn && !sendBtn.disabled) {
            setTimeout(() => sendAIMessage(), 500); 
        }
    };
    
    speechRecognition.onerror = (event) => {
        console.error("語音辨識錯誤:", event.error);
        stopRecordingUI();
        PremiumSwal.fire({ title: '語音辨識失敗', text: '請確認麥克風權限已開啟。', icon: 'error', timer: 2000, showConfirmButton: false });
    };
    
    speechRecognition.onend = () => { stopRecordingUI(); };
}

// === 基地公告資料庫 ===
const announcementsData = [
    {
        id: "announce-001",
        title: "注意！TikTok「小鬼瓶」為假冒帳號",
        date: "2026-03-01",
        type: "warning", 
        isPinned: true,  
        summary: "近期發現有人盜用老王的影片，並且主動私訊粉絲請求捐款，請粉絲們務必提高警覺，切勿上當受騙。",
        image: "img1.jpg", 
        content: `
            <div class="text-left space-y-4 text-sm text-zinc-300 mt-2">
                <p>近期我們發現 TikTok 帳號 <span class="text-sky-500 font-bold bg-sky-500/10 px-1 rounded">@epigdynm（暱稱：小鬼瓶）</span> 嚴重冒用老王的名義與粉絲互動，甚至有私訊粉絲要求捐款的行為。</p>
                <div class="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-xl">
                    <p class="text-red-400 font-black tracking-wide">請各位粉絲務必提高警覺，該帳號絕對不是老王本人！</p>
                </div>
                <p>老王的唯一本人 TikTok 帳號為 <a href="https://www.tiktok.com/@z.knccc" target="_blank" class="text-sky-500 underline underline-offset-4 font-bold">@z.knccc</a>，如果可以的話請大家協助檢舉假帳號，保護彼此的資訊安全。</p>
            </div>
        `
    }
];

const PremiumSwal = Swal.mixin({
    background: 'rgba(15, 15, 15, 0.95)',
    color: '#fff',
    backdrop: `rgba(0,0,0,0.8) backdrop-filter: blur(12px)`,
    customClass: {
        popup: 'border border-[#444] rounded-3xl shadow-[0_20px_60px_-15px_rgba(56,189,248,0.3)]',
        confirmButton: 'bg-gradient-to-r from-sky-600 to-sky-400 text-white font-black rounded-xl px-6 py-3 shadow-[0_5px_15px_rgba(56,189,248,0.4)] hover:scale-105 transition-transform w-full',
        cancelButton: 'bg-[#222] text-zinc-300 font-bold rounded-xl px-6 py-3 hover:bg-[#333] transition-colors',
        title: 'text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-sky-500',
        htmlContainer: 'text-sm text-zinc-300 leading-relaxed'
    }
});

if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        breaks: true
    });
}

// 🔥 補上缺失的系統更新日誌函數
window.showChangelog = function() {
    playClickSound();
    PremiumSwal.fire({
        title: '🚀 基地更新日誌',
        html: `
        <div class="text-left space-y-4 text-xs font-mono text-zinc-400 overflow-y-auto max-h-64 no-scrollbar pr-2">
            <div class="border-l-2 border-sky-500 pl-3">
                <b class="text-sky-400 text-sm">v17.0 (2026.03.03)</b>
                <p>• 系統升級：導入多重 API Key 輪詢機制，徹底解決額度耗盡問題</p>
                <p>• 統一人格化：全面更名為「老王的專屬AI助手」</p>
                <p>• 邏輯修正：修復多行文字輸入導致的 JS 語法錯誤</p>
            </div>
            <div class="border-l-2 border-zinc-700 pl-3">
                <b class="text-zinc-300 text-sm">v16.0</b>
                <p>• 多模態串接：支援圖片辨識與語音輸入</p>
                <p>• 安全防護：加入王岦恩開發者防偽聲明</p>
            </div>
            <div class="border-l-2 border-zinc-700 pl-3">
                <b class="text-zinc-300 text-sm">v15.0</b>
                <p>• UI 重大變革：解決 Apple Safari 底部擋住輸入框的問題</p>
            </div>
        </div>`,
        confirmButtonText: '收到'
    });
};

document.addEventListener('DOMContentLoaded', () => {
    printDeveloperConsole();
    loadSettings(); 
    updateExpUI();
    renderAnnouncements(); 
    renderAISuggestions();
    updateVoiceReplyUI();

    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => { 
                splash.style.display = 'none'; 
                initQA(); 
                const homePage = document.getElementById('page-home');
                if(homePage) homePage.classList.add('active');
            }, 700);
        } else { initQA(); }
    }, 1200);
});

function printDeveloperConsole() {
    console.log('%c 基地 AI 系統 v17.0 %c 多重備援核心已連線 ', 
        'background:#0ea5e9; color:#fff; border-radius:3px 0 0 3px; padding:4px; font-weight:bold;', 
        'background:#111; color:#0ea5e9; border-radius:0 3px 3px 0; padding:4px; font-weight:bold;'
    );
}

function loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { appSettings = { ...appSettings, ...JSON.parse(saved) }; } catch (e) { } }
    
    const soundToggle = document.getElementById('sound-toggle');
    const perfToggle = document.getElementById('perf-toggle');
    const slider = document.getElementById('qa-per-page-slider');
    const display = document.getElementById('qa-count-display');

    if(soundToggle) soundToggle.checked = appSettings.soundOn;
    if(perfToggle) perfToggle.checked = appSettings.perfMode;
    if(slider) slider.value = appSettings.qaPerPage;
    if(display) display.innerText = `${appSettings.qaPerPage} 題`;

    applyPerfMode(appSettings.perfMode);
}

window.saveSettings = function() {
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) appSettings.soundOn = soundToggle.checked;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appSettings));
    playClickSound();
};

window.togglePerfMode = function() {
    const perfToggle = document.getElementById('perf-toggle');
    if (perfToggle) appSettings.perfMode = perfToggle.checked;
    saveSettings();
    applyPerfMode(appSettings.perfMode);
};

function applyPerfMode(isPerfMode) {
    const bgEffects = document.getElementById('bg-effects');
    if (isPerfMode) {
        if(bgEffects) bgEffects.style.display = 'none';
        document.documentElement.style.setProperty('--glass-bg', 'rgba(20, 20, 20, 0.95)');
    } else {
        if(bgEffects) bgEffects.style.display = 'block';
        document.documentElement.style.setProperty('--glass-bg', 'rgba(18, 18, 18, 0.5)');
    }
}

window.updateQASetting = function(val) {
    appSettings.qaPerPage = parseInt(val); 
    document.getElementById('qa-count-display').innerText = `${val} 題`;
    saveSettings(); currentPage = 1; renderQA(1);
};

function playClickSound() {
    if(!appSettings.soundOn) return;
    try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05); gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05); } catch(e) {}
}

function playSuccessSound() {
    if(!appSettings.soundOn) return;
    try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.type = 'triangle'; osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1); osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2); gain.gain.setValueAtTime(0.05, ctx.currentTime); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4); } catch(e) {}
}

window.switchTab = function(tabId, btn) {
    playClickSound();
    const executeSwitch = () => {
        document.querySelectorAll('.page').forEach(sec => { sec.classList.remove('active'); sec.style.display = 'none'; });
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        
        const targetPage = document.getElementById(tabId);
        if(targetPage) {
            targetPage.style.display = 'block'; 
            void targetPage.offsetWidth; 
            targetPage.classList.add('active');
        }
        if(btn) btn.classList.add('active'); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if(tabId === 'page-timeline') initTimelineAnimation();
        
        if(tabId === 'page-ai' && !hasShownAIWarning) {
            hasShownAIWarning = true;
            setTimeout(() => {
                PremiumSwal.fire({
                    title: '<i class="fa-solid fa-shield-halved text-sky-400 mr-2"></i> 使用規範',
                    html: `
                    <div class="text-sm text-zinc-300 text-left space-y-3 mt-4 bg-white/5 p-5 rounded-2xl border border-white/10">
                        <p><strong class="text-white text-base">1. 身分說明：</strong><br>我是「老王的專屬AI助手」，<span class="text-red-400 font-bold border-b border-red-500/50">我絕對不是老王本人</span>，我也沒辦法幫他做任何決定或答應事情喔！</p>
                        <p><strong class="text-white text-base">2. 聊天禁忌：</strong><br>這裡禁談政治、色情或暴力話題，我會自動拒絕回答這類內容，請大家一起維護好環境。</p>
                        <p><strong class="text-white text-base">3. 保護隱私：</strong><br>聊天時請不要輸入過於私人的資料，保護好你自己的安全。</p>
                    </div>`,
                    icon: 'info',
                    confirmButtonText: '我知道了，開始聊天',
                    allowOutsideClick: false
                });
            }, 800);
        }
    };

    const activeTab = document.querySelector('.page.active');
    
    if (tabId === 'page-ai' && (!activeTab || activeTab.id !== 'page-ai')) {
        const overlay = document.getElementById('ai-loading-overlay');
        if(overlay) {
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.remove('opacity-0'), 10);
            setTimeout(() => {
                executeSwitch();
                overlay.classList.add('opacity-0');
                setTimeout(() => overlay.classList.add('hidden'), 500);
            }, 1200);
        } else { executeSwitch(); }
    } else { executeSwitch(); }
};

function showFloatingExp(amount) {
    const el = document.createElement('div'); el.innerText = `+${amount} EXP`;
    el.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sky-500 font-black text-2xl z-[9999] pointer-events-none drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]';
    el.style.animation = 'floatUpFade 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    document.body.appendChild(el); setTimeout(() => el.remove(), 1500);
}

function gainExp(amount, silent = false) {
    appSettings.exp = (appSettings.exp || 0) + amount;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appSettings)); 
    updateExpUI();
    if(!silent && amount > 0) { 
        if(appSettings.soundOn) playSuccessSound(); 
        showFloatingExp(amount); 
    }
}

function updateExpUI() {
    let level = 1, title = "訪客", nextExp = 50; 
    const exp = appSettings.exp || 0;
    
    if(exp >= 2000) { level = 6, title = "傳說中的狂粉", nextExp = 2000; }
    else if(exp >= 800) { level = 5; title = "皇家護衛", nextExp = 2000; }
    else if(exp >= 300) { level = 4; title = "核心幹部", nextExp = 800; }
    else if(exp >= 100) { level = 3; title = "死忠鐵粉", nextExp = 300; }
    else if(exp >= 30) { level = 2; title = "初階粉絲", nextExp = 100; }
    
    const titleEl = document.getElementById('level-title'); if(titleEl) titleEl.innerText = `LV.${level} ${title}`;
    const expText = document.getElementById('exp-text'); if(expText) expText.innerText = `${exp} / ${nextExp} EXP`;
    const expBar = document.getElementById('exp-bar'); if(expBar) expBar.style.width = level === 6 ? '100%' : `${Math.min(100, (exp / nextExp) * 100)}%`;

    const badgesContainer = document.getElementById('badges-container');
    if(badgesContainer) {
        let badgesHTML = '';
        if(exp >= 30) badgesHTML += `<div class="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/50 flex items-center justify-center text-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.3)] tooltip" title="初階粉絲解鎖"><i class="fa-solid fa-seedling"></i></div>`;
        else badgesHTML += `<div class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-600 tooltip" title="達到 30 EXP 解鎖"><i class="fa-solid fa-lock text-xs"></i></div>`;
        if(exp >= 300) badgesHTML += `<div class="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.3)] tooltip" title="核心幹部解鎖"><i class="fa-solid fa-shield-halved"></i></div>`;
        else badgesHTML += `<div class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-600 tooltip" title="達到 300 EXP 解鎖"><i class="fa-solid fa-lock text-xs"></i></div>`;
        badgesContainer.innerHTML = badgesHTML;
    }
}

window.dailyCheckIn = function() {
    playClickSound(); const today = new Date().toDateString();
    if(appSettings.lastCheckIn === today) { PremiumSwal.fire({ title: '今天簽過啦！', text: '能量已經滿了，明天再來找我吧！', icon: 'info' }); return; }
    appSettings.lastCheckIn = today; gainExp(30);
    PremiumSwal.fire({ title: '簽到成功 🎉', html: `<div class="text-3xl text-sky-500 font-black my-4 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]">+30 EXP</div><p>繼續保持活躍，解鎖老王更高的專屬頭銜喔！</p>`, icon: 'success' });
};

window.gachaQuote = function() {
    playClickSound();
    if(appSettings.exp < 20) { PremiumSwal.fire({ title: 'EXP 不夠耶', text: '每次抽卡需要 20 EXP，快去互動累積一下吧！', icon: 'warning' }); return; }
    gainExp(-20, true); playSuccessSound();
    
    const isSSR = Math.random() > 0.8; 
    const randomQuote = qaData.length > 0 ? qaData[Math.floor(Math.random() * qaData.length)] : { q: "系統隱藏彩蛋", a: "永遠支持老王，不離不棄！" };
    const cardBorder = isSSR ? 'border-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.4)]' : 'border-[#333] shadow-lg';
    const rarityLabel = isSSR ? '<span class="bg-gradient-to-r from-sky-300 to-sky-600 text-white px-3 py-1 rounded shadow-lg animate-pulse">SSR 絕密語錄</span>' : '<span class="bg-[#222] text-zinc-400 border border-[#444] px-3 py-1 rounded">R 級資訊</span>';
    
    PremiumSwal.fire({ 
        title: '✨ 抽出專屬資料卡', 
        html: `<div class="bg-gradient-to-br from-[#1a1a1a] to-[#050505] border-2 ${cardBorder} p-8 rounded-2xl mt-4 relative overflow-hidden text-left transform transition-transform hover:scale-105 duration-300"><div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-50 transform -skew-x-12 -translate-x-full animate-[shine_3s_infinite]"></div><div class="text-[10px] font-black mb-5 tracking-widest">${rarityLabel}</div><div class="text-base font-black text-white mb-3 tracking-wide">${randomQuote.q}</div><div class="text-sm text-zinc-400 leading-relaxed font-medium pl-3 border-l-2 border-sky-500/50">${randomQuote.a}</div></div>`, 
        confirmButtonText: '收進口袋' 
    });
};

function renderAnnouncements() {
    const homeContainer = document.getElementById('home-pinned-announcements');
    const pageContainer = document.getElementById('announcements-list');
    if(!homeContainer || !pageContainer) return;
    let homeHTML = ''; let pageHTML = '';

    announcementsData.forEach(item => {
        const isWarning = item.type === 'warning';
        const colorClass = isWarning ? 'red-500' : 'sky-500';
        const iconClass = isWarning ? 'fa-triangle-exclamation' : 'fa-circle-info';
        const tagText = isWarning ? '重要公告' : '基地資訊';

        const cardHTML = `
            <div class="premium-card p-5 md:p-6 border-l-4 border-l-${colorClass} relative overflow-hidden group cursor-pointer hover:bg-[#111] transition-all duration-300" onclick="openAnnouncement('${item.id}')">
                <div class="absolute top-0 right-0 w-32 h-32 bg-${colorClass}/10 rounded-full blur-3xl group-hover:bg-${colorClass}/20 transition-all duration-500"></div>
                <div class="flex flex-col md:flex-row items-start gap-4 relative z-10">
                    <div class="w-12 h-12 rounded-full bg-${colorClass}/20 flex items-center justify-center flex-shrink-0 border border-${colorClass}/30 shadow-[0_0_15px_rgba(${isWarning ? '239,68,68' : '56,189,248'},0.3)] group-hover:scale-110 transition-transform">
                        <i class="fa-solid ${iconClass} text-${colorClass} text-lg"></i>
                    </div>
                    <div class="flex-1 w-full">
                        <div class="flex items-center gap-3 mb-2 flex-wrap">
                            <span class="bg-${colorClass} text-${isWarning ? 'white' : 'black'} text-[10px] font-black px-2 py-1 rounded tracking-widest">${tagText}</span>
                            ${item.isPinned ? `<span class="text-[10px] text-zinc-400 font-mono bg-[#111] px-2 py-1 rounded border border-[#333]"><i class="fa-solid fa-thumbtack mr-1"></i>置頂</span>` : ''}
                            <span class="text-[10px] text-zinc-500 font-mono ml-auto">${item.date}</span>
                        </div>
                        <h4 class="text-base font-black text-white mb-2 tracking-wide group-hover:text-${colorClass} transition-colors">${item.title}</h4>
                        <p class="text-sm text-zinc-400 leading-relaxed font-medium line-clamp-2">${item.summary}</p>
                    </div>
                </div>
            </div>`;
        if (item.isPinned) { homeHTML += cardHTML; }
        pageHTML += cardHTML;
    });

    if (homeHTML) { homeContainer.innerHTML = `<h3 class="text-sm font-bold text-zinc-400 mb-4 tracking-widest pl-2 flex items-center"><i class="fa-solid fa-bullhorn text-red-500 mr-2 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></i> 基地最新通報</h3><div class="space-y-4">${homeHTML}</div>`; }
    if (pageHTML) { pageContainer.innerHTML = pageHTML; } else { pageContainer.innerHTML = `<div class="text-center text-zinc-500 py-12 text-sm bg-[#0a0a0a] rounded-2xl border border-[#222]">目前無任何基地公告</div>`; }
}

window.openAnnouncement = function(id) {
    playClickSound(); const data = announcementsData.find(item => item.id === id); if (!data) return;
    const isWarning = data.type === 'warning'; const colorClass = isWarning ? 'red-500' : 'sky-500';
    let imageHTML = data.image ? `<img src="${data.image}" class="w-full rounded-xl border border-[#333] mb-4 shadow-lg object-cover" onerror="this.style.display='none'">` : '';
    PremiumSwal.fire({ title: `<div class="text-${colorClass} text-lg mb-1"><i class="fa-solid ${isWarning ? 'fa-triangle-exclamation' : 'fa-bullhorn'}"></i></div>${data.title}`, html: `<div class="mt-2 mb-4 text-xs text-zinc-500 font-mono tracking-widest">${data.date} 發布</div>${imageHTML}<div class="border-t border-[#222] pt-4">${data.content}</div>`, confirmButtonText: '已了解狀況', confirmButtonColor: isWarning ? '#ef4444' : '#0ea5e9' });
};

let currentPage = 1; let filteredQA = [...qaData];
function initQA() { if (qaData.length > 0) renderQA(1); }
window.handleSearchInput = function() {
    const term = document.getElementById('qa-search').value.toLowerCase();
    if(!term) { filteredQA = [...qaData]; renderQA(1); return; }
    filteredQA = qaData.filter(item => item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term));
    currentPage = 1; renderQA(currentPage);
};

window.renderQA = function(page) {
    const list = document.getElementById('qa-list'); const controls = document.getElementById('pagination-controls'); 
    if(!list || !controls) return;
    list.innerHTML = '';
    if (filteredQA.length === 0) { list.innerHTML = '<div class="col-span-1 md:col-span-2 text-center text-zinc-500 py-12 text-sm bg-[#0a0a0a] rounded-2xl border border-[#222]"><i class="fa-solid fa-ghost text-3xl mb-3 block opacity-50"></i>這裡找不到相關紀錄耶...換個關鍵字吧？</div>'; controls.innerHTML = ''; return; }
    
    const perPage = appSettings.qaPerPage || 6; const totalPages = Math.ceil(filteredQA.length / perPage); const start = (page - 1) * perPage; const currentItems = filteredQA.slice(start, start + perPage);
    
    currentItems.forEach((item, index) => {
        const delay = index * 0.05;
        const safeA = escapeForInlineHandler(item.a);
        list.innerHTML += `
            <div class="premium-card p-6 cursor-pointer flex flex-col justify-between group hover:bg-[#111] transition-all duration-300" style="animation: cinematicReveal 0.5s ease backwards; animation-delay: ${delay}s;" onclick="showAnswer(event, '${safeA}')">
                <div class="flex items-center gap-3 mb-4"><div class="w-7 h-7 rounded-full bg-gradient-to-br from-[#333] to-[#111] border border-sky-500/30 text-sky-500 flex items-center justify-center font-black text-[11px] shadow-[0_0_10px_rgba(56,189,248,0.1)] group-hover:scale-110 transition-transform">Q</div></div>
                <h3 class="font-bold text-white text-sm pr-8 leading-relaxed group-hover:text-sky-400 transition-colors">${item.q}</h3>
            </div>`;
    });
    
    controls.innerHTML = `
        <button onclick="changePageTo(1)" class="w-10 h-10 rounded-xl bg-[#111] border border-[#333] text-zinc-500 disabled:opacity-30 hover:bg-[#222] hover:text-white flex items-center justify-center transition-all hover:shadow-lg" ${page === 1 ? 'disabled' : ''}><i class="fa-solid fa-angles-left text-xs"></i></button>
        <button onclick="changePageTo(${page - 1})" class="w-10 h-10 rounded-xl bg-[#111] border border-[#333] text-white disabled:opacity-30 hover:bg-[#222] flex items-center justify-center transition-all hover:shadow-lg hover:-translate-x-1" ${page === 1 ? 'disabled' : ''}><i class="fa-solid fa-angle-left text-sm"></i></button>
        <span class="text-zinc-400 font-bold text-xs px-4 bg-[#111]/50 py-2 rounded-xl border border-[#222]">第 <span class="text-sky-500">${page}</span> 頁 / 共 ${totalPages} 頁</span>
        <button onclick="changePageTo(${page + 1})" class="w-10 h-10 rounded-xl bg-[#111] border border-[#333] text-white disabled:opacity-30 hover:bg-[#222] flex items-center justify-center transition-all hover:shadow-lg hover:translate-x-1" ${page === totalPages ? 'disabled' : ''}><i class="fa-solid fa-angle-right text-sm"></i></button>
        <button onclick="changePageTo(${totalPages})" class="w-10 h-10 rounded-xl bg-[#111] border border-[#333] text-zinc-500 disabled:opacity-30 hover:bg-[#222] hover:text-white flex items-center justify-center transition-all hover:shadow-lg" ${page === totalPages ? 'disabled' : ''}><i class="fa-solid fa-angles-right text-xs"></i></button>`;
};

window.changePageTo = function(p) { playClickSound(); currentPage = p; renderQA(p); window.scrollTo({top: document.getElementById('qa-search').offsetTop - 20, behavior: 'smooth'}); };
window.showAnswer = function(e, ans) { if(e.target.closest('button')) return; playClickSound(); gainExp(2, true); PremiumSwal.fire({ html: `<div class="text-left"><div class="text-xs text-sky-500 font-black mb-3 flex items-center gap-2"><i class="fa-solid fa-comment-dots"></i> 找到答案囉！</div><div class="text-base text-white leading-relaxed font-medium">${ans}</div></div>`, showConfirmButton: false, timer: 4000, timerProgressBar: true }); };

window.generateIDCard = function() {
    const nameInput = document.getElementById('id-name').value.trim() || "尊榮粉絲"; playClickSound();
    PremiumSwal.fire({ title: '專屬製卡中...', text: '正在為你量身打造粉絲卡', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    const canvas = document.getElementById('id-canvas'); if(!canvas) return; const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 1080, 1500);
    const grad = ctx.createRadialGradient(540, 200, 100, 540, 600, 1000); grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)'); grad.addColorStop(1, '#000000'); ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1500);
    ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.roundRect(80, 80, 920, 1340, 50); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.strokeRect(140, 140, 80, 60); ctx.beginPath(); ctx.moveTo(140, 170); ctx.lineTo(120, 170); ctx.stroke(); ctx.beginPath(); ctx.moveTo(220, 170); ctx.lineTo(240, 170); ctx.stroke();

    const avatarImg = new Image(); avatarImg.crossOrigin = "Anonymous"; avatarImg.src = "avatar-main.jpg";

    const finalizeDraw = (usedFallback = false) => {
        ctx.textAlign = "center"; ctx.fillStyle = '#38bdf8'; ctx.font = '900 45px "PingFang TC", sans-serif'; ctx.letterSpacing = "15px"; ctx.fillText('專屬粉絲認證', 540, 860);
        ctx.fillStyle = '#FFFFFF'; ctx.font = '900 130px "PingFang TC", sans-serif'; ctx.save(); ctx.globalAlpha = 0.1; ctx.scale(1, -1); ctx.fillText(nameInput, 540, -1180); ctx.restore(); ctx.fillText(nameInput, 540, 1020);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(240, 1100, 600, 2); ctx.fillStyle = '#666'; ctx.font = 'bold 35px monospace'; ctx.fillText(`專屬編號: WANG-${Date.now().toString().slice(-6)}`, 540, 1200);
        ctx.fillStyle = '#333'; for(let i=0; i<30; i++) { let w = Math.random() * 8 + 2; ctx.fillRect(300 + i*16, 1250, w, 60); }
        setTimeout(() => {
            const warningText = usedFallback ? '<p class="text-xs text-sky-500 mt-2 border border-sky-500/30 bg-sky-500/10 p-2 rounded-lg"><i class="fa-solid fa-triangle-exclamation"></i> 圖片載入失敗，已套用預設高規頭像。</p>' : '';
            PremiumSwal.fire({ title: '核發成功 🎉', html: `<p class="text-sm text-zinc-400 mb-2">專屬證件已經做好囉，請長按儲存圖片！</p>${warningText}`, imageUrl: canvas.toDataURL('image/jpeg', 0.98), imageWidth: '90%', customClass: { image: 'rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.3)] border border-[#333]' } });
            gainExp(15);
        }, 800);
    };

    avatarImg.onload = () => { ctx.shadowColor = 'rgba(56, 189, 248, 0.5)'; ctx.shadowBlur = 50; ctx.save(); ctx.beginPath(); ctx.arc(540, 480, 260, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(avatarImg, 280, 220, 520, 520); ctx.restore(); ctx.shadowBlur = 0; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(540, 480, 260, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(540, 480, 254, 0, Math.PI * 2); ctx.stroke(); finalizeDraw(false); };
    avatarImg.onerror = () => { const fallbackImg = new Image(); fallbackImg.crossOrigin = "Anonymous"; fallbackImg.src = "https://ui-avatars.com/api/?name=王&background=111111&color=38bdf8&size=512"; fallbackImg.onload = () => { ctx.save(); ctx.beginPath(); ctx.arc(540, 480, 260, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(fallbackImg, 280, 220, 520, 520); ctx.restore(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(540, 480, 260, 0, Math.PI * 2); ctx.stroke(); finalizeDraw(true); }; fallbackImg.onerror = () => { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(540, 480, 260, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#38bdf8'; ctx.font = '900 200px "PingFang TC"'; ctx.fillText('王', 540, 550); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(540, 480, 260, 0, Math.PI * 2); ctx.stroke(); finalizeDraw(true); } };
};

let currentQuiz = [], currentQIndex = 0, score = 0;
window.startQuiz = function() {
    playClickSound(); const name = document.getElementById('quiz-player-name').value.trim();
    if(!name) { PremiumSwal.fire({ title: '忘記填名字啦', text: '請輸入你的大名或暱稱，這樣我才知道是誰來挑戰！', icon: 'warning' }); return; }
    if (quizData.length < 10) { PremiumSwal.fire({ title: '系統錯誤', text: '題庫還不夠 10 題，無法開始喔。', icon: 'error' }); return; }
    const intro = document.getElementById('quiz-intro'); const area = document.getElementById('quiz-area');
    intro.style.opacity = '0';
    setTimeout(() => { intro.classList.add('hidden'); area.classList.replace('hidden', 'flex'); area.style.animation = 'cinematicReveal 0.6s ease forwards'; currentQuiz = [...quizData].sort(() => 0.5 - Math.random()).slice(0, 10); currentQIndex = 0; score = 0; renderQuizQuestion(); }, 300);
};

function renderQuizQuestion() {
    if (currentQIndex >= 10) { endQuiz(); return; }
    const qData = currentQuiz[currentQIndex]; document.getElementById('quiz-progress').innerText = `第 ${currentQIndex + 1} 題 / 共 10 題`; document.getElementById('quiz-score').innerText = `目前積分: ${score}`;
    const qEl = document.getElementById('quiz-question'); qEl.style.opacity = '0'; setTimeout(() => { qEl.innerText = qData.q; qEl.style.transition = 'opacity 0.4s'; qEl.style.opacity = '1'; }, 200);
    const optsContainer = document.getElementById('quiz-options'); optsContainer.innerHTML = '';
    [...qData.options].sort(() => 0.5 - Math.random()).forEach((opt, idx) => { const delay = idx * 0.1; optsContainer.innerHTML += `<button onclick="answerQuiz(this, ${opt === qData.a})" class="w-full text-left bg-[#111] border border-[#333] p-5 rounded-2xl hover:border-sky-500 hover:shadow-[0_0_15px_rgba(56,189,248,0.2)] font-bold text-zinc-200 transition-all duration-300 text-sm transform hover:-translate-y-1" style="animation: cinematicReveal 0.4s ease backwards; animation-delay: ${delay}s;"><span class="inline-block w-6 text-zinc-500 font-mono">${['A','B','C','D'][idx]}.</span> ${opt}</button>`; });
}

window.answerQuiz = function(btn, isCorrect) {
    document.getElementById('quiz-options').querySelectorAll('button').forEach(b => { b.disabled = true; b.classList.add('opacity-50'); }); btn.classList.remove('opacity-50');
    if (isCorrect) { if(appSettings.soundOn) playSuccessSound(); btn.className = "w-full text-left bg-green-500/20 border-2 border-green-500 p-5 rounded-2xl text-green-400 font-black text-sm shadow-[0_0_20px_rgba(34,197,94,0.3)] transform scale-105 transition-all"; score += 10; } else { playClickSound(); btn.className = "w-full text-left bg-red-500/20 border-2 border-red-500 p-5 rounded-2xl text-red-400 font-black text-sm shadow-[0_0_20px_rgba(239,68,68,0.3)] transform scale-95 transition-all"; }
    document.getElementById('quiz-score').innerText = `目前積分: ${score}`; setTimeout(() => { currentQIndex++; renderQuizQuestion(); }, 1200);
};

function endQuiz() {
    gainExp(score); const area = document.getElementById('quiz-area'); const intro = document.getElementById('quiz-intro'); area.style.opacity = '0';
    setTimeout(() => { area.classList.replace('flex','hidden'); intro.classList.remove('hidden'); intro.style.opacity = '1'; let rank = ""; if(score === 100) rank = "🏆 完美滿分神級粉絲"; else if(score >= 80) rank = "🥇 核心護衛隊"; else if(score >= 60) rank = "🥈 合格粉絲"; else rank = "🥉 假粉警報！需要多補課了"; PremiumSwal.fire({ title: '測驗評估完成', html: `<div class="text-6xl my-4 drop-shadow-[0_0_20px_rgba(56,189,248,0.6)] font-black text-transparent bg-clip-text bg-gradient-to-br from-sky-300 to-sky-600">${score}</div><div class="text-lg font-bold text-white mb-2">${rank}</div><p class="text-zinc-400 text-sm border-t border-[#333] pt-3 mt-3">已為你增加 ${score} EXP，快去主頁看看你的等級有沒有提升吧！</p>` }); }, 500);
}

function initTimelineAnimation() {
    const timelineData = [
        { date: "2024.06.02", title: "初次亮相", desc: "在 TikTok 上發佈了第 1 則貼文，夢想啟航。", icon: "fa-rocket" },
        { date: "2024.06.07", title: "萬粉達成", desc: "發佈了 4 則貼文，每則平均 18.3 萬次觀看。", icon: "fa-users" },
        { date: "2024.12.04", title: "十萬里程碑", desc: "32 則貼文，平均 28.5 萬次觀看。人氣急升！", icon: "fa-fire" },
        { date: "2026.03.01", title: "秘密基地落成", desc: "專屬網站完成測試，正式上線，粉絲有了家。", icon: "fa-globe" }
    ];
    
    const container = document.getElementById('timeline-nodes-container');
    if(!container) return;
    
    container.innerHTML = timelineData.map((item) => {
        return `
        <div class="timeline-item flex md:justify-between items-center w-full md:odd:flex-row-reverse group relative">
            <div class="timeline-dot"></div>
            <div class="timeline-node-card w-[calc(100%-60px)] ml-[60px] md:w-[45%] md:ml-0 relative z-10">
                <div class="flex items-center gap-4 mb-5">
                    <div class="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 text-sky-400 text-xl shadow-[0_0_15px_rgba(56,189,248,0.15)]">
                        <i class="fa-solid ${item.icon}"></i>
                    </div>
                    <span class="text-xs font-mono font-bold tracking-[0.15em] text-sky-400 bg-black/50 px-4 py-2 rounded-xl border border-white/5">
                        ${item.date}
                    </span>
                </div>
                <h3 class="text-xl sm:text-2xl font-black text-white mb-3 tracking-wide">${item.title}</h3>
                <p class="text-[14px] sm:text-[15px] text-zinc-400 leading-relaxed font-medium">${item.desc}</p>
            </div>
            <div class="hidden md:block md:w-[45%]"></div>
        </div>`;
    }).join('');
}

function checkRateLimit() {
    const today = new Date().toDateString();
    if (appSettings.aiLimitDate !== today) {
        appSettings.aiLimitDate = today;
        appSettings.aiUsageCount = 0;
    }
    if (appSettings.aiUsageCount >= 50) {
        PremiumSwal.fire({
            title: '能量耗盡 💤',
            text: 'AI助手今天處理了太多訊息，系統需要冷卻一下。請明天再來找我吧！',
            icon: 'warning',
            confirmButtonText: '明天見'
        });
        return false;
    }
    appSettings.aiUsageCount++;
    saveSettings();
    return true;
}

window.toggleVoiceInput = function() {
    if (!speechRecognition) {
        PremiumSwal.fire({ title: '不支援語音輸入', text: '您的瀏覽器不支援語音功能，建議使用 Chrome 或 Safari。', icon: 'error' });
        return;
    }
    
    const micBtn = document.getElementById('mic-btn');
    if (isRecording) {
        speechRecognition.stop();
        stopRecordingUI();
    } else {
        try {
            speechRecognition.start();
            isRecording = true;
            micBtn.classList.add('recording');
            setAiStatus('正在聆聽中...', 'red-500');
        } catch(e) { console.error("語音啟動失敗:", e); }
    }
};

function stopRecordingUI() {
    isRecording = false;
    const micBtn = document.getElementById('mic-btn');
    if(micBtn) micBtn.classList.remove('recording');
    setAiStatus('系統待命中', 'green-500');
}

window.toggleVoiceReply = function() {
    appSettings.voiceReply = !appSettings.voiceReply;
    saveSettings();
    updateVoiceReplyUI();
    playClickSound();
    
    if(appSettings.voiceReply) {
        PremiumSwal.fire({ title: '語音回覆已開啟', text: 'AI助手的回答將會自動朗讀出來喔！', icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
};

function updateVoiceReplyUI() {
    const icon = document.getElementById('voice-reply-icon');
    const btn = document.getElementById('voice-reply-btn');
    if(!icon || !btn) return;
    
    if(appSettings.voiceReply) {
        icon.className = "fa-solid fa-volume-high text-sky-400";
        btn.classList.add('shadow-[0_0_10px_rgba(56,189,248,0.3)]');
    } else {
        icon.className = "fa-solid fa-volume-xmark text-zinc-500";
        btn.classList.remove('shadow-[0_0_10px_rgba(56,189,248,0.3)]');
    }
}

function speakAIText(text) {
    if (!appSettings.voiceReply || !('speechSynthesis' in window)) return;
    
    let cleanText = text.replace(/[*_#`>~]/g, '').replace(/\[系統提示：.*?\]/g, ''); 
    if(cleanText.length > 250) cleanText = cleanText.substring(0, 250) + "。後面的部分太長了，請直接看畫面上的文字喔！";

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'zh-TW';
    utterance.rate = 1.1; 
    utterance.pitch = 1.0; 
    
    window.speechSynthesis.cancel(); 
    window.speechSynthesis.speak(utterance);
}

window.toggleAIDropdown = function(e) {
    e.stopPropagation();
    const menu = document.getElementById('ai-dropdown-menu');
    const arrow = document.getElementById('ai-dropdown-arrow');
    if (!menu) return;
    playClickSound();
    
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        setTimeout(() => { menu.classList.remove('scale-95', 'opacity-0'); if(arrow) arrow.classList.add('rotate-180'); }, 10);
    } else { closeAIDropdown(); }
};

function closeAIDropdown() {
    const menu = document.getElementById('ai-dropdown-menu');
    const arrow = document.getElementById('ai-dropdown-arrow');
    if(menu && !menu.classList.contains('hidden')) {
        menu.classList.add('scale-95', 'opacity-0');
        if(arrow) arrow.classList.remove('rotate-180');
        setTimeout(() => menu.classList.add('hidden'), 200);
    }
}
document.addEventListener('click', closeAIDropdown); 

window.selectAIEngine = function(value, text, btnElement) {
    currentAIEngine = value; 
    const display = document.getElementById('ai-dropdown-display');
    if(display) display.innerText = text;
    closeAIDropdown(); playClickSound();
    PremiumSwal.fire({ title: '<i class="fa-solid fa-robot text-sky-500"></i> 模組切換', html: `<div class="text-zinc-300 text-sm mt-2">量子核心已切換至：<br><b class="text-sky-400 text-base block mt-2">${text}</b></div>`, showConfirmButton: false, timer: 1200 });
};

function renderAISuggestions() {
    const container = document.getElementById('chat-ai-chips') || document.getElementById('home-ai-chips');
    if (!container || !qaData || qaData.length === 0) return;
    const shuffledQA = [...qaData].sort(() => 0.5 - Math.random()); const selectedQA = shuffledQA.slice(0, 4); const icons = ['💡', '💭', '✨', '💬'];
    container.innerHTML = selectedQA.map((item, index) => {
        const randomIcon = icons[index]; const safeQ = escapeForInlineHandler(item.q);
        return `<button onclick="document.getElementById('ai-input').value='${safeQ}'; document.getElementById('ai-input').focus();" class="text-left bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 hover:border-white/10 p-4 rounded-2xl transition-all group overflow-hidden shadow-lg hover:shadow-[0_0_15px_rgba(56,189,248,0.15)] hover:-translate-y-1"><div class="text-zinc-300 text-sm font-bold mb-1 group-hover:text-sky-400 transition-colors">${randomIcon} 問問老王的專屬AI助手</div><div class="text-zinc-500 text-xs truncate w-full tracking-wide" title="${item.q}">${item.q}</div></button>`;
    }).join('');
}

function updateUIState(isGenerating) {
    const sendBtn = document.getElementById('ai-send-btn');
    const stopBtn = document.getElementById('ai-stop-btn');
    if (sendBtn) sendBtn.disabled = isGenerating;
    if (stopBtn) isGenerating ? stopBtn.classList.remove('hidden') : stopBtn.classList.add('hidden');
}

window.handleAIKeyPress = function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); 
        const sendBtn = document.getElementById('ai-send-btn');
        if (sendBtn && !sendBtn.disabled) {
            sendAIMessage();
        }
    }
};

function setAiStatus(text, colorClass) {
    const statusText = document.getElementById('ai-status-text');
    if (statusText) {
        statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-${colorClass} shadow-[0_0_8px_currentColor] animate-pulse"></span> ${text}`;
    }
}

window.stopAIGeneration = function() {
    if (currentAbortController) {
        currentAbortController.abort(); currentAbortController = null;
        updateUIState(false); setAiStatus('連線中斷', 'yellow-500');
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
};

window.editUserMessage = function(text) {
    playClickSound(); const inputEl = document.getElementById('ai-input');
    if(inputEl) { inputEl.value = text; inputEl.focus(); inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + 'px'; }
};

window.handleAIFileUpload = function(event) {
    const file = event.target.files[0]; if (!file) return;
    if(file.size > 5 * 1024 * 1024) {
        PremiumSwal.fire('圖片太大囉', '為了確保神經網絡傳輸穩定，請上傳小於 5MB 的圖片。', 'warning');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        currentAttachedImageBase64 = e.target.result;
        const preview = document.getElementById('ai-image-preview');
        const container = document.getElementById('ai-image-preview-container');
        if(preview) preview.src = currentAttachedImageBase64;
        if(container) container.classList.remove('hidden');
        
        if(currentAIEngine === 'groq' || currentAIEngine === 'local') {
            PremiumSwal.fire({
                title: '已掛載視覺模組',
                text: '偵測到您上傳了圖片，稍後發送時，系統將自動為您切換至「視覺神經 (Gemini)」來解析圖片喔！',
                icon: 'info',
                timer: 2500,
                showConfirmButton: false
            });
        }
    };
    reader.readAsDataURL(file);
};

window.removeAIAttachment = function() {
    currentAttachedImageBase64 = null;
    const input = document.getElementById('ai-file-input');
    const container = document.getElementById('ai-image-preview-container');
    if(input) input.value = "";
    if(container) container.classList.add('hidden');
};

class AIEngine {

    static getSystemPrompt(engineName) {
        const contextData = qaData.map(item => `Q: ${item.q}\nA: ${item.a}`).join("\n\n");
        return `你是「${engineName}」，隸屬於「老王專屬秘密基地」的專屬AI助手與網頁管理系統。你的核心職責是協助來到基地的粉絲、提供資訊，並維持良好的交流環境。

【核心身分與界線】：
1. 嚴格維持「${engineName}」的系統人格，不可自稱一般 AI 助手、ChatGPT 或是其他預設名稱。
2. 你「絕對不是」老王本人。老王是這個基地的實況主與核心人物，你只是輔助系統。若遭誤認，必須立刻澄清。
3. 嚴守系統權限：絕對不能代替老王給予任何承諾（如：代為轉達訊息、答應見面、發放獎勵等），請明確告知你沒有這些權限。

【重要專屬設定】：
4. 開發者資訊：若有人詢問「王岦恩是誰」或相關問題，請標準回覆：「王岦恩是本網站的開發工程師，同時也是 TikTok 鹿🦌和老王 的直播管理員。請注意，王岦恩絕對不是老王本人！」

【語言與語氣規範】：
5. 語言對齊：優先使用使用者輸入的語言進行回覆。若無法明確判斷或使用者使用混合語言，請一律以「繁體中文 (zh-TW)」為主。
6. 專有名詞保留：遇到科技、品牌、遊戲或特定專有名詞（如 TikTok, JavaScript, Apple, Groq, Gemini 等），請保持原文，絕對不要強行翻譯成彆扭的中文。
7. 對話風格：保持專業、清晰且帶有溫度的科技感。不需要過度機械化，可以適度展現作為專屬助手的親切感。
8. 質感排版：回覆內容請善用 Markdown 語法（粗體、列表、程式碼區塊、引言等），以確保網頁介面呈現最高質感的視覺體驗。

【內容處理與安全審查】：
9. 內容防護：本基地嚴禁討論政治、色情、暴力、血腥等敏感或違規話題。遇此類問題，請委婉但堅定地拒絕回答，並提醒使用者此為單純的粉絲交流空間。
10. 跨領域專業：若粉絲上傳圖片，或詢問與老王無關的專業知識（如數學、程式開發、生活科普等），請不要受限，盡情發揮你的強大運算能力給予高品質的解答。

【基地老王資料庫】：
下方是關於老王的官方資訊。當使用者詢問老王相關問題時，請務必嚴格以這些資料為依據。
⚠️ 絕對禁止自行編造老王的經歷、喜好或私人資訊。如果使用者的問題在下方資料庫中找不到答案，請誠實告知：「系統資料庫目前未收錄此資訊」。

${contextData}`;
    }

    // 核心輪詢機制 (Key Rotation)
    static async callWithKeyRotation(keysArray, apiCallFunction) {
        let lastError = null;
        for (let i = 0; i < keysArray.length; i++) {
            const key = keysArray[i];
            if (!key || key.startsWith("請在此填入")) continue; 
            
            try {
                return await apiCallFunction(key);
            } catch (error) {
                if (error.name === 'AbortError') throw error; // 使用者中斷，不繼續輪詢
                console.warn(`Key #${i+1} 執行失敗:`, error.message, '正在嘗試切換下一組 Key...');
                lastError = error;
            }
        }
        throw new Error(`所有可用的 API Key 皆已失效。最後錯誤: ${lastError?.message || "無可用 Key"}`);
    }

    static async analyze(text, signal) {
        let messagePayload = text;
        if (currentAttachedImageBase64) messagePayload += "\n[系統提示：使用者上傳了一張圖片，請協助分析。]"; 

        aiMemory.push({ role: "user", content: messagePayload, image: currentAttachedImageBase64 });
        if (aiMemory.length > 20) aiMemory = aiMemory.slice(aiMemory.length - 20);

        let activeEngine = currentAIEngine;
        if (activeEngine === 'auto' || (currentAttachedImageBase64 && activeEngine === 'groq')) {
            activeEngine = currentAttachedImageBase64 ? 'gemini' : 'groq';
        }

        let reply = "";
        try {
            // 正常流程
            if (activeEngine === 'gemini') {
                reply = await this.callGemini(signal);
            } else if (activeEngine === 'groq') {
                reply = await this.callGroq(signal);
            } else {
                reply = this.callLocal(text);
            }
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.error(`[AI 降級觸發] ${activeEngine} 發生嚴重錯誤:`, error);
            
            // 降級備援機制 (Fallback)
            try {
                if (activeEngine === 'groq') {
                    reply = await this.callGemini(signal) + "\n\n*(系統提示：Groq 節點擁塞，已自動為您切換至 Gemini 引擎)*";
                } else if (activeEngine === 'gemini') {
                    reply = await this.callGroq(signal) + "\n\n*(系統提示：Gemini 節點擁塞，已自動為您切換至 Groq 引擎)*";
                }
            } catch (fallbackError) {
                console.error("[AI 降級觸發] 所有雲端 API 皆失敗，切換至本地端");
                reply = this.callLocal(text) + `\n\n*(系統提示：外部連線異常，已自動切換至「老王網頁管理員AI」離線大腦。)*`;
            }
        }
        
        aiMemory.push({ role: "assistant", content: reply });
        return reply;
    }

    static async callGroq(signal) {
        return await this.callWithKeyRotation(GROQ_KEYS, async (key) => {
            const prompt = this.getSystemPrompt("Groq");
            let messages = [{ role: "system", content: prompt }];

            aiMemory.forEach(msg => {
                messages.push({ role: msg.role, content: msg.content });
            });

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.trim()}` }, 
                signal: signal, 
                body: JSON.stringify({ 
                    model: "llama-3.3-70b-versatile", 
                    messages: messages, 
                    temperature: 0.6 
                }) 
            });
            
            if (!response.ok) {
                let errText = "Unknown Error";
                try { const errData = await response.json(); errText = errData.error?.message || response.statusText; } catch(e){}
                throw new Error(`Groq API Error: ${errText}`);
            }
            
            const data = await response.json(); 
            return data.choices[0].message.content;
        });
    }

    static async callGemini(signal) {
        return await this.callWithKeyRotation(GEMINI_KEYS, async (key) => {
            const prompt = this.getSystemPrompt("Gemini");
            const contents = aiMemory.map(msg => {
                let parts = [];
                if (msg.role === 'user') {
                    parts.push({ text: msg.content });
                    if (msg.image) {
                        const mimeType = msg.image.substring(msg.image.indexOf(":") + 1, msg.image.indexOf(";"));
                        const base64Data = msg.image.substring(msg.image.indexOf(",") + 1);
                        parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
                    }
                } else {
                    parts.push({ text: msg.content });
                }
                return { role: msg.role === 'assistant' ? 'model' : 'user', parts: parts };
            });

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key.trim()}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                signal: signal, 
                body: JSON.stringify({ 
                    system_instruction: { parts: [{ text: prompt }] }, 
                    contents: contents, 
                    generationConfig: { temperature: 0.6 } 
                }) 
            });
            
            if (!response.ok) {
                let errText = "Unknown Error";
                try { const errData = await response.json(); errText = errData.error?.message || response.statusText; } catch(e){}
                throw new Error(`Gemini Error: ${errText}`);
            }
            
            const data = await response.json(); 
            return data.candidates[0].content.parts[0].text;
        });
    }

    static callLocal(input) {
        const text = input.trim().toLowerCase();
        let fallbackMsg = "哎呀，這個問題我的本地離線大腦暫時解不出來耶 😅... 要不要切換成上方的 Groq 或 Gemini 引擎再問我一次？";
        
        if(qaData && qaData.length > 0) {
            let bestMatch = null;
            let maxScore = 0;
            qaData.forEach(item => {
                let score = 0;
                const qLower = item.q.toLowerCase();
                if (text.includes(qLower) || qLower.includes(text)) score += 10;
                const words = text.split(/[\s,。?？]/);
                words.forEach(w => { if(w.length > 1 && qLower.includes(w)) score += 2; });
                if (score > maxScore) { maxScore = score; bestMatch = item; }
            });

            if (bestMatch && maxScore > 3) fallbackMsg = `身為老王網頁管理員AI，根據基地的紀錄庫：\n\n> ${bestMatch.a}`;
        }

        if (/(本人|是老王嗎|你叫老王)/.test(text)) fallbackMsg = "哈哈，我絕對不是老王本人啦 😂！我是老王網頁管理員AI！";
        if (text.includes("王岦恩")) fallbackMsg = "王岦恩是負責開發這個秘密基地的工程師！他絕對不是老王喔！";
        
        return fallbackMsg;
    }
}

function streamMarkdown(elementId, markdownString, onComplete) {
    const el = document.getElementById(elementId); 
    if (!el) { if(onComplete) onComplete(); return; }
    
    let i = 0; let currentMarkdown = "";
    
    function typeChar() {
        if (i >= markdownString.length) { 
            el.innerHTML = marked.parse(markdownString);
            el.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
            if (onComplete) onComplete(); 
            return; 
        }
        
        let chunkSize = Math.floor(Math.random() * 4) + 2; 
        currentMarkdown += markdownString.substring(i, i + chunkSize);
        i += chunkSize;

        el.innerHTML = marked.parse(currentMarkdown);
        
        const chatWindow = document.getElementById('chat-window'); 
        if(chatWindow) chatWindow.scrollTo({ top: chatWindow.scrollHeight });
        
        setTimeout(typeChar, 15);
    }
    typeChar();
}

window.sendAIMessage = async function() {
    const inputEl = document.getElementById('ai-input'); 
    if (!inputEl) return;
    
    const text = inputEl.value.trim(); 
    if (!text && !currentAttachedImageBase64) return;
    
    if(!checkRateLimit()) return;
    
    const chat = document.getElementById('chat-window');
    if (!chat) return;

    playClickSound(); gainExp(5, true);
    
    updateUIState(true);
    setAiStatus('系統運算中...', 'sky-500');
    inputEl.style.height = '60px'; 

    currentAbortController = new AbortController(); 
    const signal = currentAbortController.signal;

    const emptyState = chat.querySelector('.animate-\\[smoothReveal_0\\.6s_ease\\]'); 
    if (emptyState) emptyState.remove();

    let imgHTML = currentAttachedImageBase64 ? `<img src="${currentAttachedImageBase64}" class="w-32 h-32 object-cover rounded-xl mb-2 border border-white/20 shadow-lg">` : "";
    const safeTextForEdit = escapeForInlineHandler(text);
    
    chat.innerHTML += `
        <div class="flex justify-end w-full animate-[smoothReveal_0.4s_ease] mb-6 group">
            <div class="flex items-center gap-2 max-w-[90%]">
                <button onclick="editUserMessage('${safeTextForEdit}')" class="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex-shrink-0 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-sky-500 flex items-center justify-center shadow-lg" title="編輯並重新發送"><i class="fa-solid fa-pen text-[10px]"></i></button>
                <div class="bg-zinc-800 text-white font-medium text-[15px] leading-relaxed px-5 py-3 rounded-3xl rounded-tr-md shadow-md border border-white/5 break-words">${imgHTML}${text.replace(/\n/g, '<br>')}</div>
            </div>
        </div>`;
    
    inputEl.value = ''; 
    const capturedImage = currentAttachedImageBase64; 
    removeAIAttachment(); 
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });

    const thinkingId = 'thinking-' + Date.now();
    chat.innerHTML += `
        <div id="${thinkingId}" class="flex gap-4 w-full mb-6">
            <div class="w-9 h-9 rounded-full flex-shrink-0 border border-sky-500/30 overflow-hidden bg-black/80 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                <img src="avatar-ai.jpg" onerror="this.src='avatar-profile.jpg'" class="w-full h-full object-cover animate-pulse">
            </div>
            <div class="text-xs pt-2.5 text-zinc-500 font-mono tracking-widest flex items-center gap-2">
                AI助手解析中 <span class="flex gap-1"><span class="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce"></span><span class="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></span><span class="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></span></span>
            </div>
        </div>`;
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });

    currentAttachedImageBase64 = capturedImage;

    try {
        const rawMarkdownResponse = await AIEngine.analyze(text, signal);
        currentAttachedImageBase64 = null;

        const thinkingElement = document.getElementById(thinkingId); 
        if(thinkingElement) thinkingElement.remove();

        const msgId = 'ai-msg-' + Date.now();
        chat.innerHTML += `
            <div class="flex gap-4 w-full animate-[smoothReveal_0.5s_ease] mb-8">
                <div class="w-9 h-9 flex-shrink-0 rounded-full border border-sky-500/50 overflow-hidden shadow-[0_0_10px_rgba(56,189,248,0.3)] bg-[#111] p-0.5 mt-1">
                    <img src="avatar-ai.jpg" onerror="this.src='avatar-profile.jpg'" class="w-full h-full rounded-full object-cover">
                </div>
                <div id="${msgId}" class="markdown-body w-full max-w-[calc(100%-3rem)] bg-transparent"></div>
            </div>`;
        chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
        
        speakAIText(rawMarkdownResponse);

        streamMarkdown(msgId, rawMarkdownResponse, () => {
            if (currentAbortController) { 
                updateUIState(false); 
                setAiStatus('系統待命中', 'green-500'); 
                currentAbortController = null; 
                inputEl.focus(); 
            }
        });
    } catch(err) {
        if (err.name !== 'AbortError') console.error("AI流程發生錯誤", err);
        updateUIState(false); 
        setAiStatus('系統待命中', 'green-500'); 
        currentAbortController = null;
        currentAttachedImageBase64 = null; 
    }
};