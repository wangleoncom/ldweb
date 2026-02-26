/* ==========================================================================
   鹿🦌 QA 粉絲站 v20.0 - 終極防擠壓版 (app.js)
   ========================================================================== */
const CURRENT_APP_VERSION = "20.0"; 

const qaData = window.QA_DB || window.deerQuiz_DB || []; 
const quizData = window.QUIZ_DB || window.deerQuiz_DB || [];

let appSettings = { version: CURRENT_APP_VERSION, qaPerPage: 8, soundOn: true, hapticOn: true, theme: 'dark', liquidGlass: false, exp: 0 };
let currentAIModel = 1; 
let aiContextMemory = { lastSubject: null };
const WATERMARK_TEXT = "鹿🦌官方粉絲站 | wangleoncom.github.io/ldweb/";

function getThemeColor(varName) { 
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#f43f5e'; 
}

/* ================== 1. 初始化與防護 ================== */
document.addEventListener('DOMContentLoaded', () => {
    checkVersionAndClearCache();
    loadSettings(); 
    renderTimeline();
    updateExpUI();
    
    // PWA 安裝偵測
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); window.deferredPrompt = e;
        const promptEl = document.getElementById('pwa-prompt');
        if(promptEl) promptEl.style.display = 'flex';
    });

    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => { splash.style.display = 'none'; initQA(); }, 400);
        } else initQA();
    }, 1200);
});

function hapticFeedback(type = 'light') {
    if(!appSettings.hapticOn || !navigator.vibrate) return;
    if(type === 'light') navigator.vibrate(15);
    else if(type === 'heavy') navigator.vibrate([30, 50, 30]);
    else if(type === 'success') navigator.vibrate([15, 50, 15, 50, 20]);
}

/* 🏆 保證運作的經驗值系統 */
function gainExp(amount) {
    if (typeof appSettings.exp !== 'number' || isNaN(appSettings.exp)) appSettings.exp = 0;
    appSettings.exp += amount;
    localStorage.setItem('deerAppConfig_v20', JSON.stringify(appSettings)); 
    updateExpUI();
}

function updateExpUI() {
    if (typeof appSettings.exp !== 'number' || isNaN(appSettings.exp)) appSettings.exp = 0;
    let level = 1, title = "初見麋鹿", maxExp = 50;
    const exp = appSettings.exp;
    
    if(exp >= 1000) { level = 6; title = "鹿的傳說"; maxExp = 1000; }
    else if(exp >= 600) { level = 5; title = "鹿的守護神"; maxExp = 1000; }
    else if(exp >= 300) { level = 4; title = "核心幹部"; maxExp = 600; }
    else if(exp >= 150) { level = 3; title = "忠誠麋鹿"; maxExp = 300; }
    else if(exp >= 50) { level = 2; title = "資深粉絲"; maxExp = 150; }
    
    const badge = document.getElementById('level-badge');
    const bar = document.getElementById('exp-bar');
    if(badge) badge.innerText = `LV.${level} ${title}`;
    if(bar) bar.style.width = level === 6 ? '100%' : `${Math.min(100, (exp / maxExp) * 100)}%`;
}

window.showLevelInfo = function() {
    hapticFeedback();
    Swal.fire({
        title: '🌟 粉絲成就系統',
        html: `<div class="text-center"><p class="text-slate-300 text-sm mb-4">目前經驗值: <b class="text-[var(--primary)] text-xl">${appSettings.exp} EXP</b></p><div class="text-xs text-slate-400 space-y-2 bg-black/30 p-4 rounded-xl border border-white/5"><p>🔍 搜尋問題：+5 EXP</p><p>👀 查看解答：+3 EXP</p><p>🤖 與 AI 互動：+10 EXP</p><p>🎓 會考答對一題：+20 EXP</p><p>🏆 完成大會考：+50 EXP</p><p>💳 生成認證卡：+15 EXP</p></div></div>`,
        background: 'var(--bg-start)', color: '#fff', confirmButtonColor: 'var(--primary)', customClass:{popup:'custom-modal'}
    });
}

function checkVersionAndClearCache() {
    const saved = localStorage.getItem('deerAppConfig_v20');
    if (saved) {
        try { if (JSON.parse(saved).version !== CURRENT_APP_VERSION) throw new Error("Old"); } 
        catch(e) { localStorage.removeItem('deerAppConfig_v20'); }
    }
}

window.switchTab = function(tabId, btn) {
    hapticFeedback(); if(appSettings.soundOn) playClickSound();
    document.querySelectorAll('.page').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
    
    if(tabId === 'page-home') document.getElementById('page-home').scrollTo({ top: 0, behavior: 'smooth' });
    if(tabId === 'page-ai') document.getElementById('chat-window').scrollTop = document.getElementById('chat-window').scrollHeight;
    if(tabId === 'page-timeline') window.triggerTimelineAnim();
};

/* 🎬 電影級時間軸動畫 (鎖定防滑動) */
window.triggerTimelineAnim = function() {
    const nodes = document.querySelectorAll('.timeline-node');
    const line = document.getElementById('tl-line');
    const container = document.getElementById('page-timeline');
    
    if(!container) return; 

    container.classList.add('timeline-scroll-lock');
    container.scrollTo({ top: 0 });
    if(line) line.classList.remove('draw');
    nodes.forEach(n => n.classList.remove('animate-pop'));
    
    setTimeout(() => {
        if(line) line.classList.add('draw');
        nodes.forEach((n, idx) => { 
            setTimeout(() => {
                n.classList.add('animate-pop');
                if(appSettings.soundOn && idx > 0) playClickSound(); 
            }, 500 + (idx * 300)); 
        });
        
        setTimeout(() => {
            container.classList.remove('timeline-scroll-lock');
        }, 500 + (nodes.length * 300) + 200);
    }, 100);
};

/* ================== 2. 安全設定管理 ================== */
window.toggleSettings = function() {
    hapticFeedback();
    const modal = document.getElementById('settings-modal'); const content = document.getElementById('settings-content');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden'); void modal.offsetWidth; 
        modal.classList.remove('opacity-0'); content.classList.remove('scale-95');
    } else {
        modal.classList.add('opacity-0'); content.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

function loadSettings() {
    const saved = localStorage.getItem('deerAppConfig_v20');
    if (saved) {
        try { appSettings = JSON.parse(saved); } catch (e) { console.error("Parse Error"); }
    }
    
    if (typeof appSettings.exp !== 'number') appSettings.exp = 0;
    if (typeof appSettings.qaPerPage !== 'number') appSettings.qaPerPage = 8;
    if (typeof appSettings.theme !== 'string') appSettings.theme = 'default';
    appSettings.version = CURRENT_APP_VERSION;

    const slider = document.getElementById('qa-per-page-slider');
    const display = document.getElementById('qa-count-display');
    const soundToggle = document.getElementById('sound-toggle');
    const hapticToggle = document.getElementById('haptic-toggle');
    const liquidToggle = document.getElementById('liquid-toggle');

    if (slider) slider.value = appSettings.qaPerPage;
    if (display) display.innerText = `${appSettings.qaPerPage} 題`;
    if (soundToggle) soundToggle.checked = appSettings.soundOn;
    if (hapticToggle) hapticToggle.checked = appSettings.hapticOn;
    if (liquidToggle) liquidToggle.checked = appSettings.liquidGlass;
    
    applyThemeToDOM(appSettings.theme, appSettings.liquidGlass);
}

function applyThemeToDOM(theme, isLiquid) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-liquid', isLiquid ? 'true' : 'false');
}

window.changeTheme = function(theme) {
    hapticFeedback();
    appSettings.theme = theme;
    applyThemeToDOM(theme, appSettings.liquidGlass);
    saveSettings(true); 
}

window.saveSettings = function(silent = false) {
    const soundToggle = document.getElementById('sound-toggle');
    const hapticToggle = document.getElementById('haptic-toggle');
    const liquidToggle = document.getElementById('liquid-toggle');
    
    if (soundToggle) appSettings.soundOn = soundToggle.checked;
    if (hapticToggle) appSettings.hapticOn = hapticToggle.checked;
    if (liquidToggle) {
        appSettings.liquidGlass = liquidToggle.checked;
        applyThemeToDOM(appSettings.theme, appSettings.liquidGlass); 
    }
    
    localStorage.setItem('deerAppConfig_v20', JSON.stringify(appSettings));
    if(!silent && appSettings.soundOn) playClickSound();
};

window.updateQASetting = function(val) {
    appSettings.qaPerPage = parseInt(val);
    const display = document.getElementById('qa-count-display');
    if (display) display.innerText = `${val} 題`;
    saveSettings(true); currentPage = 1; renderQA(1);
};

window.nukeAndReload = function() {
    hapticFeedback('heavy'); localStorage.clear(); sessionStorage.clear(); window.location.reload(true); 
};

window.installPWA = async function() {
    if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        const { outcome } = await window.deferredPrompt.userChoice;
        if (outcome === 'accepted') document.getElementById('pwa-prompt').style.display = 'none';
        window.deferredPrompt = null;
    }
};

window.shareApp = function() {
    hapticFeedback();
    if (navigator.share) {
        navigator.share({ title: '鹿🦌 官方粉絲站', text: '來看看鹿的秘密跟測驗吧！', url: window.location.href }).catch(e=>{});
    } else {
        navigator.clipboard.writeText(window.location.href);
        Swal.fire({ title: '已複製網址', icon: 'success', timer:1500, showConfirmButton:false, background: 'var(--bg-start)', color: '#fff' });
    }
};

window.showChangelog = function() {
    hapticFeedback();
    Swal.fire({
        title: '📝 更新日誌',
        html: `<div class="text-left text-xs space-y-3 mt-2">
                <div class="border-l-2 border-[var(--primary)] pl-3">
                    <div class="text-[var(--primary)] font-black">v20.0版</div>
                    <div class="text-slate-300 mt-1">✨ 解決首頁卡片擠壓變形問題<br>📱 新增獨立頭像 avatar-profile.jpg<br>🎬 優化按鈕設計<br>📍 保證 AI 輸入框與底部導航不衝突</div>
               </div></div>`,
        background: 'var(--bg-start)', color: '#fff', confirmButtonColor: 'var(--primary)', customClass: { popup: 'custom-modal', title: 'text-sm' }
    });
};

/* ================== 3. QA 渲染與分享 ================== */
let currentPage = 1; let filteredQA = [...qaData];

function initQA() { if (qaData.length > 0) renderQA(1); }

window.handleSearchInput = function() {
    const term = document.getElementById('qa-search').value.toLowerCase();
    const box = document.getElementById('autocomplete-results');
    if(!term) { box.classList.remove('show'); return; }
    
    const suggestions = qaData.filter(i => i.q.toLowerCase().includes(term) || i.a.toLowerCase().includes(term)).slice(0, 3);
    if(suggestions.length > 0) {
        box.innerHTML = suggestions.map(s => `
            <div class="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer text-sm font-bold text-white line-clamp-1" onclick="selectSuggestion('${s.q}')">
                <i class="fas fa-search text-[var(--primary)] mr-2 text-xs"></i>${s.q}
            </div>
        `).join('');
        box.classList.add('show');
    } else { box.classList.remove('show'); }
}

window.selectSuggestion = function(q) {
    document.getElementById('qa-search').value = q;
    document.getElementById('autocomplete-results').classList.remove('show');
    filterQA();
}

window.filterQA = function() {
    const term = document.getElementById('qa-search').value.toLowerCase();
    if (!term) filteredQA = [...qaData];
    else { filteredQA = qaData.filter(item => item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term)); gainExp(5); }
    currentPage = 1; renderQA(currentPage);
};

function renderQA(page) {
    const list = document.getElementById('qa-list'); const controls = document.getElementById('pagination-controls');
    list.innerHTML = '';
    if (filteredQA.length === 0) { list.innerHTML = '<div class="text-center text-slate-500 py-10 text-xs">無相符資料</div>'; controls.innerHTML = ''; return; }

    const totalPages = Math.ceil(filteredQA.length / appSettings.qaPerPage);
    const start = (page - 1) * appSettings.qaPerPage;
    const currentItems = filteredQA.slice(start, start + appSettings.qaPerPage);

    currentItems.forEach((item, index) => {
        const num = String(start + index + 1).padStart(2, '0');
        list.innerHTML += `
            <div class="glass-card p-4 flex flex-col justify-between cursor-pointer active:scale-95 transition-transform relative group border-l-2 border-l-[var(--primary)]" onclick="showAnswer(event, '${item.a}')">
                <div class="flex justify-between items-start mb-2">
                   <div class="w-6 h-6 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center font-black text-[10px]">Q</div>
                   <div class="text-slate-500 text-[9px] font-black tracking-widest bg-white/5 px-2 py-0.5 rounded">#${num}</div>
                </div>
                <h3 class="font-bold text-white mt-1 mb-2 line-clamp-2 leading-relaxed pr-8">${item.q}</h3>
                <button onclick="openQAShare(event, '${item.q}', '${item.a}')" class="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[var(--primary)] transition-all"><i class="fas fa-share-alt text-[10px]"></i></button>
            </div>`;
    });

    controls.innerHTML = `
        <button onclick="changePageTo(1)" class="w-8 h-8 flex items-center justify-center bg-white/10 text-slate-400 rounded-full" ${page === 1 ? 'disabled' : ''}><i class="fas fa-angles-left text-[10px]"></i></button>
        <button onclick="changePageTo(${page - 1})" class="w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-full" ${page === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left text-[10px]"></i></button>
        <span class="text-slate-400 font-black text-[10px] tracking-[0.2em] uppercase">第 ${page}/${totalPages} 頁</span>
        <button onclick="changePageTo(${page + 1})" class="w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-full" ${page === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right text-[10px]"></i></button>
        <button onclick="changePageTo(${totalPages})" class="w-8 h-8 flex items-center justify-center bg-white/10 text-slate-500 rounded-full" ${page === totalPages ? 'disabled' : ''}><i class="fas fa-angles-right text-[10px]"></i></button>
    `;
}

window.changePageTo = function(p) { hapticFeedback(); currentPage = p; renderQA(p); document.getElementById('page-home').scrollTo({ top: 0, behavior: 'smooth' }); }

window.showAnswer = function(e, ans) {
    if(e.target.closest('button')) return; 
    hapticFeedback(); gainExp(3);
    if(appSettings.soundOn) playClickSound();
    Swal.fire({text: ans, background:'var(--bg-start)', color:'#fff', confirmButtonColor:'var(--primary)', customClass:{popup:'custom-modal'}});
}

window.openQAShare = function(e, q, a) {
    e.stopPropagation(); hapticFeedback();
    Swal.fire({
        title: '分享問答',
        html: `<div class="grid grid-cols-2 gap-3 mt-2">
                <button onclick="copyQAText('${q}','${a}')" class="bg-black/50 py-4 rounded-xl text-xs font-bold flex flex-col items-center gap-2 border border-white/10 hover:bg-white/10"><i class="fas fa-copy text-lg text-[var(--secondary)]"></i>複製文字</button>
                <button onclick="renderQAImage('${q}','${a}')" class="bg-[var(--primary)]/20 border border-[var(--primary)]/30 py-4 rounded-xl text-xs font-bold text-[var(--primary)] flex flex-col items-center gap-2 hover:bg-[var(--primary)] hover:text-white transition"><i class="fas fa-image text-lg"></i>生成圖片</button>
               </div>`,
        showConfirmButton: false, background: 'var(--bg-start)', color: '#fff', customClass:{popup:'custom-modal'}
    });
};

window.copyQAText = function(q, a) {
    navigator.clipboard.writeText(`Q: ${q}\nA: ${a}\n\n來自 ${WATERMARK_TEXT}`);
    Swal.fire({ title: '複製成功', icon: 'success', timer: 1000, showConfirmButton: false, background: 'var(--bg-start)', color: '#fff' });
};

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(''); let line = ''; let currentY = y;
    for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n]; let metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) { context.fillText(line, x, currentY); line = words[n]; currentY += lineHeight; }
        else { line = testLine; }
    }
    context.fillText(line, x, currentY); return currentY + lineHeight;
}

window.renderQAImage = function(q, a) {
    const canvas = document.getElementById('qa-canvas'); const ctx = canvas.getContext('2d');
    const colorPrim = getThemeColor('--primary'); const colorSec = getThemeColor('--secondary'); const colorBg = getThemeColor('--bg-start');

    ctx.fillStyle = colorBg; ctx.fillRect(0, 0, 1080, 1080);
    const grad = ctx.createLinearGradient(0,0,1080,1080); grad.addColorStop(0, colorPrim+'33'); grad.addColorStop(1, colorBg);
    ctx.fillStyle = grad; ctx.fillRect(0,0,1080,1080);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(40,40,1000,1000,40); ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = colorPrim; ctx.font = '900 60px "Segoe UI"'; ctx.fillText('Q.', 100, 180);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 45px "PingFang TC"'; 
    let nextY = wrapText(ctx, q, 100, 260, 880, 70);
    
    ctx.fillStyle = colorSec; ctx.font = '900 60px "Segoe UI"'; ctx.fillText('A.', 100, nextY + 80);
    ctx.fillStyle = '#cbd5e1'; ctx.font = '45px "PingFang TC"'; 
    wrapText(ctx, a, 100, nextY + 160, 880, 70);

    ctx.textAlign = "center"; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = 'bold 24px monospace';
    ctx.fillText(WATERMARK_TEXT, 540, 1020);

    try {
        const url = canvas.toDataURL('image/jpeg', 0.95);
        Swal.fire({ title: '長按儲存圖片', imageUrl: url, imageWidth: '100%', background: 'var(--bg-start)', color: '#fff', confirmButtonColor: 'var(--primary)', customClass: { popup: 'custom-modal', image: 'swal2-image' }});
    } catch(e) {
        Swal.fire('無法生成', '本地端瀏覽器阻擋了圖片生成，請上傳至 GitHub Pages 後再試。', 'error');
    }
};

/* ================== 4. AI 系統 ================== */
window.switchAIModel = function(id) {
    hapticFeedback(); currentAIModel = id;
    const slider = document.getElementById('model-slider');
    const chat = document.getElementById('chat-window');
    
    if(id === 1) {
        slider.style.transform = 'translateX(0)';
        chat.innerHTML += `<div class="max-w-[85%] self-start glass-card p-3 shadow-lg text-xs leading-relaxed border-l-4 border-l-[var(--secondary)] msg-enter text-slate-300 italic">系統切換：已載入【精準麋鹿】。將採取嚴格比對模式。</div>`;
    } else {
        slider.style.transform = 'translateX(100%)';
        chat.innerHTML += `<div class="max-w-[85%] self-start glass-card p-3 shadow-lg text-xs leading-relaxed border-l-4 border-l-[var(--primary)] msg-enter text-slate-300 italic">呀吼～！我是【元氣麋鹿】✨，想知道什麼盡管問喔！</div>`;
    }
    chat.scrollTop = chat.scrollHeight;
};

window.handleAIKeyPress = function(e) { if (e.key === 'Enter') sendAIMessage(); };
window.sendAIMessage = function() {
    const inputEl = document.getElementById('ai-input'); let text = inputEl.value.trim(); if (!text) return;
    hapticFeedback(); gainExp(10);

    const chat = document.getElementById('chat-window');
    chat.innerHTML += `<div class="max-w-[85%] self-end glass-card p-3 shadow-lg text-sm leading-relaxed border border-white/5 bg-white/10 ml-auto text-right msg-enter">${text}</div>`;
    inputEl.value = ''; chat.scrollTop = chat.scrollHeight;

    const typingId = 'typing-' + Date.now();
    chat.innerHTML += `<div id="${typingId}" class="max-w-[85%] self-start glass-card p-3 shadow-lg border border-white/5 bg-black/50 msg-enter"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
    chat.scrollTop = chat.scrollHeight;

    if((text.includes("那") || text.includes("多少")) && aiContextMemory.lastSubject) {
        text = aiContextMemory.lastSubject + " " + text; 
    }

    const bestMatch = findBestMatch(text);
    
    setTimeout(() => {
        document.getElementById(typingId).remove();
        let reply = ""; let sourceBtn = "";
        
        if (bestMatch.score > 0.15) {
            aiContextMemory.lastSubject = extractSubject(bestMatch.item.q);
            if(currentAIModel === 1) reply = `根據資料分析 📊：<br><b class="text-[var(--secondary)] mt-1 block">${bestMatch.item.a}</b>`;
            else reply = `嘿嘿！這題我知道 (๑•̀ㅂ•́)و✧：<br><b class="text-[var(--primary)] mt-1 block">${bestMatch.item.a}</b>`;
            sourceBtn = `<button onclick="showSource('${bestMatch.item.q}', '${bestMatch.item.a}')" class="mt-3 text-[10px] text-slate-500 bg-white/5 px-2 py-1 rounded hover:text-white transition active:scale-95"><i class="fas fa-search"></i> 追蹤來源</button>`;
        } else {
            if(currentAIModel === 1) reply = "資料庫中暫無此紀錄 🔍。請提供更精確的關鍵字。";
            else reply = "嗚嗚...小鹿的腦袋當機了，這題我不知道啦 (ಥ﹏ಥ)";
        }

        const borderColor = currentAIModel === 1 ? 'border-l-4 border-l-[var(--secondary)]' : 'border-l-4 border-l-[var(--primary)]';
        chat.innerHTML += `<div class="max-w-[85%] self-start glass-card p-4 shadow-lg text-sm leading-relaxed bg-black/50 msg-enter ${borderColor}">${reply}${sourceBtn}</div>`;
        chat.scrollTop = chat.scrollHeight; hapticFeedback('light');
        if(appSettings.soundOn) playClickSound();
    }, 800 + Math.random() * 500); 
};

function extractSubject(q) {
    if(q.includes("身高")) return "身高"; if(q.includes("體重")) return "體重";
    if(q.includes("生日")) return "生日"; return "鹿";
}

window.showSource = function(q, a) {
    hapticFeedback();
    Swal.fire({ title: '資料溯源', html: `<div class="text-left text-xs space-y-2 mt-2"><div class="text-slate-400">原始問題：</div><div class="text-white bg-white/5 p-2 rounded">${q}</div><div class="text-slate-400 pt-2">標準解答：</div><div class="text-[var(--primary)] bg-white/5 p-2 rounded">${a}</div></div>`, background: 'var(--bg-start)', color: '#fff', confirmButtonColor: 'var(--primary)', customClass:{popup:'custom-modal'} });
};

function findBestMatch(userInput) {
    let best = { item: null, score: 0 };
    const nGrams = (str) => { const g=[]; if(str.length===1)return[str]; for(let i=0;i<str.length-1;i++)g.push(str.substring(i,i+2)); return g; };
    const inputGrams = nGrams(userInput.toLowerCase());
    qaData.forEach(row => {
        const targetGrams = nGrams(row.q.toLowerCase() + " " + row.a.toLowerCase()); let matches = 0;
        inputGrams.forEach(ig => { if (targetGrams.includes(ig)) matches++; });
        const score = matches / Math.max(inputGrams.length, 1);
        if (score > best.score) best = { item: row, score: score };
    });
    return best;
}

/* ================== 5. 動態時間軸 ================== */
const timelineData = [
    { date: "2021/11/29", title: "初次亮相", desc: "在 TikTok 發布了第一支影片，夢想的起點。" },
    { date: "2024/10/29", title: "一萬粉達成", desc: "里程碑突破，粉絲逐漸凝聚成為麋鹿大軍。" },
    { date: "2025/03/17", title: "十萬粉絲集結", desc: "官方認證十萬大軍！" },
    { date: "2026/01/13", title: "四十萬粉達成 🎉", desc: "勢不可擋！感謝每一位麋鹿的支持！", highlight: true }
];

function renderTimeline() {
    const container = document.getElementById('timeline-nodes-container');
    container.innerHTML = timelineData.map((t, idx) => {
        const mt = idx === 0 ? "pt-2 pb-10" : "pb-10";
        const hlBox = t.highlight ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 shadow-[0_10px_30px_var(--primary)]" : "bg-black/30";
        const hlTitle = t.highlight ? "text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--secondary)] to-[var(--primary)] mt-2 mb-2" : `text-base font-bold text-white mt-2 mb-1`;
        return `
        <div class="relative pl-10 timeline-node ${mt}">
            <div class="absolute w-4 h-4 bg-[var(--primary)] rounded-full -left-[10px] top-5 border-4 border-[#050505] shadow-[0_0_15px_var(--primary)] z-10 ${t.highlight ? 'pulse-dot w-6 h-6 -left-[13px] top-4' : ''}"></div>
            <div class="glass-card p-5 transition-all ${hlBox}">
                <span class="text-[10px] text-[var(--primary)] font-black tracking-widest bg-[var(--primary)]/20 px-2 py-1 rounded">${t.date}</span>
                <h3 class="${hlTitle}">${t.title}</h3>
                <p class="text-xs text-slate-400">${t.desc}</p>
            </div>
        </div>`;
    }).join('');
}

/* ================== 6. 照片 ID 卡生成 ================== */
window.generateIDCard = function() {
    hapticFeedback('heavy'); gainExp(15);
    const nameInput = document.getElementById('id-name').value.trim() || "神秘麋鹿";
    Swal.fire({ title: '渲染中...', background: 'var(--bg-start)', color: '#fff', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    const canvas = document.getElementById('id-canvas'); const ctx = canvas.getContext('2d');
    const colorPrim = getThemeColor('--primary');
    
    ctx.fillStyle = getThemeColor('--bg-end'); ctx.fillRect(0, 0, 1080, 1600);
    const grad1 = ctx.createRadialGradient(540, 800, 200, 540, 800, 1000);
    grad1.addColorStop(0, colorPrim + '44'); grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1; ctx.fillRect(0, 0, 1080, 1600);

    ctx.fillStyle = '#0a0a0e'; ctx.beginPath(); ctx.roundRect(80, 80, 920, 1440, 60); ctx.fill();
    ctx.strokeStyle = colorPrim + '88'; ctx.lineWidth = 4; ctx.stroke();

    const avatarImg = new Image(); avatarImg.crossOrigin = "Anonymous"; avatarImg.src = "avatar-main.jpg";

    avatarImg.onload = () => {
        ctx.save(); ctx.beginPath(); ctx.arc(540, 480, 280, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(avatarImg, 260, 200, 560, 560); ctx.restore();
        
        ctx.shadowColor = colorPrim; ctx.shadowBlur = 40;
        ctx.strokeStyle = colorPrim; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(540, 480, 280, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.textAlign = "center";
        ctx.fillStyle = colorPrim; ctx.font = '900 50px "Segoe UI"'; ctx.letterSpacing = "15px"; ctx.fillText('OFFICIAL FAN ID', 540, 920);
        ctx.fillStyle = '#ffffff'; ctx.font = '900 140px "PingFang TC"'; ctx.letterSpacing = "5px"; ctx.fillText(nameInput, 540, 1120);

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        const startX = 240; for(let i=0; i<600; i+=15) { let w = Math.random()>0.5?5:10; ctx.fillRect(startX+i, 1250, w, 100); }
        
        ctx.fillStyle = '#64748b'; ctx.font = 'bold 32px monospace'; 
        ctx.fillText(`ID: 8${Date.now().toString().slice(-6)} | AUTH: ${new Date().toISOString().split('T')[0]}`, 540, 1450);
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = 'bold 24px monospace'; ctx.fillText(WATERMARK_TEXT, 540, 1550);

        try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            Swal.fire({ title: '🎉 渲染成功', text: '請長按圖片儲存', imageUrl: dataUrl, imageWidth: '100%', background: 'var(--bg-start)', color: '#fff', confirmButtonColor: colorPrim, customClass: { popup: 'custom-modal', image: 'swal2-image' }});
        } catch(e) {
            Swal.fire('無法生成', '本地端瀏覽器阻擋，請上傳至 GitHub Pages 後重試。', 'error');
        }
    };
    avatarImg.onerror = () => {
        // Fallback for local testing without image
        ctx.fillStyle = colorPrim; ctx.font = '200px sans-serif'; ctx.textAlign="center"; ctx.fillText('🦌', 540, 520);
        try {
            Swal.fire({ title: '完成 (本地模式)', text: '您在本地端打開，顯示備用頭像。長按儲存。', imageUrl: canvas.toDataURL('image/jpeg', 0.9), imageWidth: '100%', background: 'var(--bg-start)', color: '#fff', confirmButtonColor: colorPrim, customClass: { popup: 'custom-modal', image: 'swal2-image' }});
        } catch(e) {
            Swal.fire('無法生成', '請上傳至 GitHub Pages', 'error');
        }
    };
};

/* ================== 7. 會考系統 ================== */
let currentQuiz = [], currentQIndex = 0, score = 0, quizPlayerName = "";

window.startQuiz = function() {
    hapticFeedback();
    quizPlayerName = document.getElementById('quiz-player-name').value.trim();
    if(!quizPlayerName) { Swal.fire('提示', '請輸入大名！', 'warning'); return; }
    if (quizData.length < 10) { Swal.fire('錯誤', '題庫不足 10 題！', 'error'); return; }

    document.getElementById('quiz-intro').classList.add('hidden'); document.getElementById('quiz-area').classList.replace('hidden', 'flex');
    currentQuiz = [...quizData].sort(() => 0.5 - Math.random()).slice(0, 10);
    currentQIndex = 0; score = 0; renderQuizQuestion();
};

function renderQuizQuestion() {
    if (currentQIndex >= 10) { endQuiz(); return; }
    const qData = currentQuiz[currentQIndex];
    document.getElementById('quiz-progress').innerText = `QUESTION ${currentQIndex + 1} / 10`;
    document.getElementById('quiz-score').innerText = `SCORE: ${score}`;
    document.getElementById('quiz-question').innerText = `Q: ${qData.q}`;
    const optsContainer = document.getElementById('quiz-options'); optsContainer.innerHTML = '';
    [...qData.options].sort(() => 0.5 - Math.random()).forEach(opt => {
        optsContainer.innerHTML += `<button onclick="answerQuiz(this, ${isCorrect = (opt === qData.a)})" class="w-full text-left bg-black/50 hover:bg-white/10 p-4 rounded-xl border border-white/5 transition font-bold text-sm text-slate-200 active:scale-95">${opt}</button>`;
    });
}

window.answerQuiz = function(btn, isCorrect) {
    hapticFeedback(); document.getElementById('quiz-options').querySelectorAll('button').forEach(b => b.disabled = true);
    if (isCorrect) { btn.className = "w-full text-left bg-green-600/30 border border-green-500 text-green-400 p-4 rounded-xl font-black text-sm"; score += 10; hapticFeedback('success'); gainExp(20);} 
    else {
        hapticFeedback('heavy'); btn.className = "w-full text-left bg-red-600/30 border border-red-500 text-red-400 p-4 rounded-xl font-bold text-sm";
        document.getElementById('quiz-options').querySelectorAll('button').forEach(b => { if (b.innerText.trim() === currentQuiz[currentQIndex].a) b.className = "w-full text-left bg-blue-600/30 border border-blue-500 text-blue-400 p-4 rounded-xl font-bold text-sm"; });
    }
    document.getElementById('quiz-score').innerText = `SCORE: ${score}`;
    setTimeout(() => { currentQIndex++; renderQuizQuestion(); }, 1200);
};

function endQuiz() {
    let title = score >= 90 ? "終極守護者" : score >= 60 ? "鐵桿麋鹿" : "新手麋鹿";
    gainExp(50); 
    document.getElementById('quiz-area').classList.replace('flex','hidden'); document.getElementById('quiz-intro').classList.remove('hidden');
    Swal.fire({ title: '結算中...', background: 'var(--bg-start)', color: '#fff', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    setTimeout(() => {
        const canvas = document.getElementById('quiz-canvas'); const ctx = canvas.getContext('2d');
        const colorSec = getThemeColor('--secondary');
        
        ctx.fillStyle = getThemeColor('--bg-end'); ctx.fillRect(0, 0, 1080, 1500);
        const grad = ctx.createRadialGradient(540, 600, 100, 540, 600, 800); grad.addColorStop(0, colorSec+'66'); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1500);
        ctx.strokeStyle = colorSec+'99'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(60, 80, 960, 1340, 50); ctx.stroke();
        
        ctx.textAlign = "center"; ctx.fillStyle = '#ffffff'; ctx.font = '900 75px "Segoe UI"'; ctx.fillText('會考戰績核發', 540, 280);
        ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 36px "Segoe UI"'; ctx.fillText(`挑戰者：${quizPlayerName}`, 540, 380);
        
        ctx.shadowColor = colorSec; ctx.shadowBlur = 60; ctx.fillStyle = colorSec; ctx.font = '900 400px "Segoe UI"'; ctx.fillText(`${score}`, 540, 850); ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#cbd5e1'; ctx.font = 'bold 45px "Segoe UI"'; ctx.fillText(`獲得稱號`, 540, 1050);
        ctx.fillStyle = '#fbbf24'; ctx.font = '900 100px "Segoe UI"'; ctx.fillText(`🏆 ${title}`, 540, 1180);
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = 'bold 24px monospace'; ctx.fillText(WATERMARK_TEXT, 540, 1460);
        
        try {
            const url = canvas.toDataURL('image/jpeg', 0.9);
            Swal.fire({ title: '🏆 測驗完成', text: '長按儲存您的戰績圖片', imageUrl: url, imageWidth: '100%', background: 'var(--bg-start)', color: '#fff', confirmButtonColor: colorSec, customClass: { popup: 'custom-modal', image: 'swal2-image' }});
        } catch(e) {
            Swal.fire('無法生成', '請上傳至 GitHub Pages 後使用', 'error');
        }
    }, 800);
}

function playClickSound() {
    try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); gain.gain.setValueAtTime(0.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05); } catch(e) {}
}