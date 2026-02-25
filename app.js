/* ==========================================================================
   鹿🦌 QA 粉絲站 v13.0 - 尊爵旗艦版 (app.js)
   ========================================================================== */
const CURRENT_APP_VERSION = "13.0"; 

const qaData = window.QA_DB || window.deerQuiz_DB || []; 
const quizData = window.QUIZ_DB || window.deerQuiz_DB || [];

let appSettings = { version: CURRENT_APP_VERSION, qaPerPage: 8, soundOn: true, largeFont: false };
let currentAIModel = 1; 

const WATERMARK_TEXT = "鹿🦌粉絲站 | https://wangleoncom.github.io/ldweb/";

/* ================== 1. 系統初始化 ================== */
document.addEventListener('DOMContentLoaded', () => {
    checkVersionAndClearCache();
    loadSettings();

    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => { splash.style.display = 'none'; initQA(); }, 400);
        } else initQA();
    }, 1000);
});

function checkVersionAndClearCache() {
    const saved = localStorage.getItem('deerAppConfig_v13');
    if (saved) {
        try { if (JSON.parse(saved).version !== CURRENT_APP_VERSION) throw new Error("Old"); } 
        catch(e) { localStorage.removeItem('deerAppConfig_v13'); }
    }
}

window.nukeAndReload = function() {
    localStorage.clear(); sessionStorage.clear(); window.location.reload(true); 
};

window.switchTab = function(tabId, btn) {
    if(appSettings.soundOn) playClickSound();
    document.querySelectorAll('.page').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
    
    if(tabId === 'page-home') document.getElementById('page-home').scrollTo({ top: 0, behavior: 'smooth' });
    if(tabId === 'page-ai') document.getElementById('chat-window').scrollTop = document.getElementById('chat-window').scrollHeight;
    if(tabId === 'page-timeline') triggerTimelineAnim();
};

/* 時間軸進場動畫 (v13 優化) */
function triggerTimelineAnim() {
    const nodes = document.querySelectorAll('.timeline-node');
    const line = document.getElementById('tl-line');
    if(line) line.classList.remove('draw');
    nodes.forEach(n => n.classList.remove('animate-pop'));
    
    setTimeout(() => {
        if(line) line.classList.add('draw');
        nodes.forEach((n, idx) => {
            setTimeout(() => n.classList.add('animate-pop'), 400 + (idx * 250));
        });
    }, 100);
}

/* ================== 2. 設定管理與全局分享 ================== */
window.toggleSettings = function() {
    if(appSettings.soundOn) playClickSound();
    const modal = document.getElementById('settings-modal');
    const content = document.getElementById('settings-content');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden'); void modal.offsetWidth; 
        modal.classList.remove('opacity-0'); content.classList.remove('scale-95');
    } else {
        modal.classList.add('opacity-0'); content.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

function loadSettings() {
    const saved = localStorage.getItem('deerAppConfig_v13');
    if (saved) {
        appSettings = JSON.parse(saved);
        document.getElementById('qa-per-page-slider').value = appSettings.qaPerPage;
        document.getElementById('qa-count-display').innerText = `${appSettings.qaPerPage} 題`;
        document.getElementById('sound-toggle').checked = appSettings.soundOn;
        document.getElementById('font-toggle').checked = appSettings.largeFont;
        applyFontSetting();
    }
}

window.saveSettings = function() {
    appSettings.soundOn = document.getElementById('sound-toggle').checked;
    appSettings.largeFont = document.getElementById('font-toggle').checked;
    localStorage.setItem('deerAppConfig_v13', JSON.stringify(appSettings));
    applyFontSetting();
};

window.updateQASetting = function(val) {
    appSettings.qaPerPage = parseInt(val);
    document.getElementById('qa-count-display').innerText = `${val} 題`;
    localStorage.setItem('deerAppConfig_v13', JSON.stringify(appSettings));
    currentPage = 1; renderQA(1);
};

function applyFontSetting() {
    if(appSettings.largeFont) document.getElementById('app-body').classList.add('text-[16px]');
    else document.getElementById('app-body').classList.remove('text-[16px]');
}

window.shareApp = function() {
    if (navigator.share) {
        navigator.share({ title: '鹿🦌 官方粉絲資訊站', text: '來看看鹿的小秘密跟會考測驗吧！', url: window.location.href }).catch(e=>{});
    } else {
        navigator.clipboard.writeText(window.location.href);
        Swal.fire({ title: '已複製網址', text: '可以直接貼上分享給朋友囉！', icon: 'success', background: '#121215', color: '#fff', confirmButtonColor: '#f43f5e' });
    }
};

/* ================== 3. QA 渲染與裂變分享系統 ================== */
let currentPage = 1; let filteredQA = [...qaData];

function initQA() { if (qaData.length > 0) renderQA(1); }

window.filterQA = function() {
    const term = document.getElementById('qa-search').value.toLowerCase();
    if (!term) filteredQA = [...qaData];
    else filteredQA = qaData.filter(item => item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term));
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
        // v13: 加入專屬的 Share Icon，並防止事件冒泡
        list.innerHTML += `
            <div class="glass-card p-4 flex flex-col justify-between cursor-pointer active:scale-95 transition-transform relative group" onclick="showAnswer(event, '${item.a}')">
                <div class="flex justify-between items-start mb-2">
                   <div class="w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center font-black text-[10px]">Q</div>
                   <div class="text-slate-500 text-[9px] font-black tracking-widest bg-white/5 px-2 py-0.5 rounded">#${num}</div>
                </div>
                <h3 class="font-bold text-white mt-1 mb-2 line-clamp-2 leading-relaxed pr-6">${item.q}</h3>
                
                <button onclick="openQAShareOptions(event, '${item.q}', '${item.a}')" class="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-pink-500 transition-colors">
                    <i class="fas fa-share text-xs"></i>
                </button>
            </div>`;
    });

    controls.innerHTML = `
        <button onclick="changePage(-1)" class="w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-full active:bg-pink-500 disabled:opacity-20" ${page === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left text-[10px]"></i></button>
        <span class="text-slate-400 font-black text-[10px] tracking-[0.2em]">第 ${page} / ${totalPages} 頁</span>
        <button onclick="changePage(1)" class="w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-full active:bg-pink-500 disabled:opacity-20" ${page === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right text-[10px]"></i></button>
    `;
}

window.showAnswer = function(e, ans) {
    if(e.target.closest('button')) return; // 防止點擊分享按鈕時觸發
    if(appSettings.soundOn) playClickSound();
    Swal.fire({title:'解答', text: ans, background:'#121215', color:'#fff', confirmButtonColor:'#f43f5e', customClass:{popup:'custom-modal', title:'text-pink-500 text-lg'}});
}

window.changePage = function(delta) {
    if(appSettings.soundOn) playClickSound();
    currentPage += delta; renderQA(currentPage);
    document.getElementById('page-home').scrollTo({ top: 0, behavior: 'smooth' });
};

/* --- QA 分享邏輯 --- */
window.openQAShareOptions = function(e, q, a) {
    e.stopPropagation();
    if(appSettings.soundOn) playClickSound();
    Swal.fire({
        title: '分享這則 QA',
        html: `
            <div class="grid grid-cols-2 gap-3 mt-2">
                <button onclick="shareQAText('${q}', '${a}')" class="bg-slate-800 py-4 rounded-xl text-white font-bold hover:bg-slate-700 transition flex flex-col items-center gap-2">
                    <i class="fas fa-copy text-xl text-blue-400"></i> 複製文字
                </button>
                <button onclick="shareQAImage('${q}', '${a}')" class="bg-pink-500/20 border border-pink-500/30 py-4 rounded-xl text-pink-400 font-bold hover:bg-pink-500 hover:text-white transition flex flex-col items-center gap-2">
                    <i class="fas fa-image text-xl"></i> 生成圖片
                </button>
            </div>
        `,
        showConfirmButton: false, background: '#121215', color: '#fff', customClass: { popup: 'custom-modal', title: 'text-base' }
    });
}

window.shareQAText = function(q, a) {
    const text = `Q: ${q}\nA: ${a}\n\n${WATERMARK_TEXT}`;
    navigator.clipboard.writeText(text);
    Swal.fire({ title: '複製成功', icon: 'success', timer: 1500, showConfirmButton: false, background: '#121215', color: '#fff' });
}

// Canvas 繪製多行文字工具
function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(''); let line = ''; let currentY = y;
    for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n];
        let metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            context.fillText(line, x, currentY); line = words[n]; currentY += lineHeight;
        } else { line = testLine; }
    }
    context.fillText(line, x, currentY);
    return currentY + lineHeight; // 回傳最後的高度
}

window.shareQAImage = function(q, a) {
    const canvas = document.getElementById('qa-canvas'); const ctx = canvas.getContext('2d');
    
    // 背景
    ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, 1080, 1080);
    const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
    grad.addColorStop(0, 'rgba(244, 63, 94, 0.2)'); grad.addColorStop(1, 'rgba(59, 130, 246, 0.1)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1080);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 4; roundRect(ctx, 40, 40, 1000, 1000, 40); ctx.stroke();

    // 繪製 Q
    ctx.fillStyle = '#f43f5e'; ctx.font = '900 60px "Segoe UI"'; ctx.fillText('Q.', 100, 150);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 50px "PingFang TC", sans-serif'; ctx.textAlign = "left";
    let nextY = wrapText(ctx, q, 100, 230, 880, 70);

    // 繪製 A
    ctx.fillStyle = '#3b82f6'; ctx.font = '900 60px "Segoe UI"'; ctx.fillText('A.', 100, nextY + 60);
    ctx.fillStyle = '#cbd5e1'; ctx.font = '50px "PingFang TC", sans-serif'; 
    wrapText(ctx, a, 100, nextY + 140, 880, 75);

    // 浮水印
    ctx.textAlign = "center";
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = 'bold 24px monospace'; 
    ctx.fillText(WATERMARK_TEXT, 540, 1020);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    Swal.fire({
        title: '分享圖片已生成', text: '請長按圖片進行儲存',
        imageUrl: dataUrl, imageWidth: '100%',
        background: '#121215', color: '#fff', confirmButtonColor: '#f43f5e', confirmButtonText: '完成',
        customClass: { popup: 'custom-modal', image: 'swal2-image' }
    });
}

/* ================== 4. AI 系統 ================== */
window.switchAIModel = function(modelId) {
    if(appSettings.soundOn) playClickSound();
    currentAIModel = modelId;
    const slider = document.getElementById('model-slider');
    const btn1 = document.getElementById('btn-model-1'); const btn2 = document.getElementById('btn-model-2');
    const chat = document.getElementById('chat-window'); const btnSend = document.getElementById('ai-send-btn');
    const avatar = document.getElementById('ai-current-avatar'); const nameLabel = document.getElementById('ai-current-name');
    
    if(modelId === 1) {
        slider.style.transform = 'translateX(0)';
        btn1.classList.replace('text-slate-400', 'text-white'); btn2.classList.replace('text-white', 'text-slate-400');
        btn1.querySelector('img').style.opacity = '1'; btn2.querySelector('img').style.opacity = '0.5';
        btnSend.className = "w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all active:scale-90";
        avatar.src = "ai-model-1.jpg"; avatar.className = "w-10 h-10 rounded-full object-cover border-2 border-blue-500";
        nameLabel.innerText = "精準智庫"; nameLabel.className = "text-[14px] font-bold text-blue-400";
        chat.innerHTML += `<div class="max-w-[85%] self-start glass-card p-4 shadow-lg text-sm leading-relaxed border-t-2 border-t-blue-500 msg-enter text-slate-300">系統切換：載入【精準智庫】。<br>將提供嚴謹的答案比對。</div>`;
    } else {
        slider.style.transform = 'translateX(100%)';
        btn1.classList.replace('text-white', 'text-slate-400'); btn2.classList.replace('text-slate-400', 'text-white');
        btn1.querySelector('img').style.opacity = '0.5'; btn2.querySelector('img').style.opacity = '1';
        btnSend.className = "w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all active:scale-90";
        avatar.src = "ai-model-2.jpg"; avatar.className = "w-10 h-10 rounded-full object-cover border-2 border-pink-500";
        nameLabel.innerText = "元氣小鹿"; nameLabel.className = "text-[14px] font-bold text-pink-400";
        chat.innerHTML += `<div class="max-w-[85%] self-start glass-card p-4 shadow-lg text-sm leading-relaxed border-t-2 border-t-pink-500 msg-enter text-slate-300">系統切換：載入【元氣小鹿】。<br>呀吼！有什麼秘密想問我呢？</div>`;
    }
    chat.scrollTop = chat.scrollHeight;
};

window.handleAIKeyPress = function(e) { if (e.key === 'Enter') sendAIMessage(); };
window.sendAIMessage = function() {
    const inputEl = document.getElementById('ai-input'); const text = inputEl.value.trim(); if (!text) return;
    if(appSettings.soundOn) playClickSound();

    const chat = document.getElementById('chat-window');
    chat.innerHTML += `<div class="max-w-[85%] self-end glass-card p-3 shadow-lg text-sm leading-relaxed border border-white/5 bg-[#1a1a1f] ml-auto text-right msg-enter">${text}</div>`;
    inputEl.value = ''; chat.scrollTop = chat.scrollHeight;

    const typingId = 'typing-' + Date.now();
    chat.innerHTML += `<div id="${typingId}" class="max-w-[85%] self-start glass-card p-3 shadow-lg border border-white/5 bg-white/5 msg-enter"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
    chat.scrollTop = chat.scrollHeight;

    const bestMatch = findBestMatch(text);
    
    setTimeout(() => {
        document.getElementById(typingId).remove();
        let reply = ""; let sourceBtn = "";
        if (currentAIModel === 1) {
            if (bestMatch.score > 0.15) {
                reply = `分析結果：<br><b class="text-blue-400 mt-1 block">${bestMatch.item.a}</b>`;
                sourceBtn = `<button onclick="showSource('${bestMatch.item.q}', '${bestMatch.item.a}')" class="mt-2 text-[10px] text-slate-500 bg-black/50 px-2 py-1 rounded border border-white/10 hover:text-white"><i class="fas fa-search"></i> 來源追蹤</button>`;
            } else reply = "無法在現有資料庫中找到精確配對。請提供更多關鍵字。";
        } else {
            if (bestMatch.score > 0.1) {
                reply = `嘿嘿！這題我知道：<br><b class="text-pink-400 mt-1 block">${bestMatch.item.a}</b> (๑•̀ㅂ•́)و✧`;
                sourceBtn = `<button onclick="showSource('${bestMatch.item.q}', '${bestMatch.item.a}')" class="mt-2 text-[10px] text-slate-500 bg-black/50 px-2 py-1 rounded border border-white/10 hover:text-white"><i class="fas fa-paw"></i> 原本的題目</button>`;
            } else {
                const fallbacks = ["這題太難了啦！下次直播直接問鹿吧🦌", "嗚嗚...小鹿的腦袋當機了 🤯"];
                reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            }
        }
        const borderColor = currentAIModel === 1 ? 'border-l-2 border-l-blue-500' : 'border-l-2 border-l-pink-500';
        chat.innerHTML += `<div class="max-w-[85%] self-start glass-card p-3 shadow-lg text-sm leading-relaxed bg-white/5 msg-enter ${borderColor}">${reply}${sourceBtn}</div>`;
        chat.scrollTop = chat.scrollHeight; if(appSettings.soundOn) playClickSound();
    }, 800 + Math.random() * 600); 
};

window.showSource = function(q, a) {
    if(appSettings.soundOn) playClickSound();
    Swal.fire({
        title: '資料庫溯源',
        html: `<div class="text-left text-sm space-y-2 mt-2"><div class="text-slate-400 text-xs">原始問題：</div><div class="text-white font-bold bg-white/5 p-2 rounded border border-white/10">${q}</div><div class="text-slate-400 text-xs pt-2">標準解答：</div><div class="text-pink-400 font-bold bg-white/5 p-2 rounded border border-white/10">${a}</div></div>`,
        background: '#121215', color: '#fff', confirmButtonColor: '#f43f5e', confirmButtonText: '了解', customClass: { popup: 'custom-modal', title: 'text-sm text-slate-300' }
    });
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

/* ================== 5. 照片 ID 卡生成 (包含照片與浮水印) ================== */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h); ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r); ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y); ctx.closePath();
}

window.generateHoloIDCard = function() {
    if(appSettings.soundOn) playClickSound();
    const nameInput = document.getElementById('id-name').value.trim() || "神秘麋鹿";
    Swal.fire({ title: '編碼生成中...', background: '#0f0f13', color: '#fff', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    const canvas = document.getElementById('id-canvas'); const ctx = canvas.getContext('2d');
    
    // 背景
    ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, 1080, 1600);
    const grad1 = ctx.createRadialGradient(0, 400, 100, 0, 400, 800);
    grad1.addColorStop(0, 'rgba(244, 63, 94, 0.3)'); grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1; ctx.fillRect(0, 0, 1080, 1600);
    const grad2 = ctx.createRadialGradient(1080, 1200, 100, 1080, 1200, 800);
    grad2.addColorStop(0, 'rgba(59, 130, 246, 0.2)'); grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2; ctx.fillRect(0, 0, 1080, 1600);

    // 主卡片
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
    ctx.fillStyle = '#101015'; roundRect(ctx, 80, 80, 920, 1360, 50); ctx.fill();
    ctx.shadowColor = 'transparent'; 
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)'; ctx.lineWidth = 4; roundRect(ctx, 80, 80, 920, 1360, 50); ctx.stroke();

    const avatarImg = new Image();
    avatarImg.crossOrigin = "Anonymous";
    avatarImg.src = "avatar-main.jpg";

    avatarImg.onload = () => drawContent(avatarImg);
    avatarImg.onerror = () => drawContent(null);

    function drawContent(img) {
        // 照片處理 (置中大圓)
        if(img) {
            ctx.save();
            ctx.beginPath(); ctx.arc(540, 460, 260, 0, Math.PI * 2); ctx.closePath();
            ctx.clip();
            // 計算比例，置中裁切
            const scale = Math.max(520 / img.width, 520 / img.height);
            const x = (540) - (img.width / 2) * scale;
            const y = (460) - (img.height / 2) * scale;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            ctx.restore();
            
            // 照片發光邊框
            ctx.shadowColor = 'rgba(244, 63, 94, 0.8)'; ctx.shadowBlur = 30;
            ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.arc(540, 460, 260, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowColor = 'transparent';
        } else {
            // 防呆處理
            ctx.fillStyle = '#f43f5e'; ctx.font = '150px sans-serif'; ctx.textAlign = "center"; ctx.fillText('🦌', 540, 500);
        }

        // 文字排版
        ctx.textAlign = "center";
        ctx.fillStyle = '#f43f5e'; ctx.font = '900 45px "Segoe UI", sans-serif'; ctx.letterSpacing = "10px";
        ctx.fillText('OFFICIAL FAN ID', 540, 860);
        
        ctx.shadowColor = 'rgba(255,255,255,0.4)'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffffff'; ctx.font = '900 130px "Segoe UI", "PingFang TC", sans-serif'; ctx.letterSpacing = "5px";
        ctx.fillText(nameInput, 540, 1050);
        ctx.shadowColor = 'transparent';

        // 條碼
        const barcodeTotalWidth = 600; const startX = 540 - (barcodeTotalWidth / 2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; let currX = startX;
        while(currX < startX + barcodeTotalWidth) {
            let w = Math.random() > 0.5 ? 4 : (Math.random() > 0.5 ? 8 : 12);
            if (currX + w > startX + barcodeTotalWidth) w = startX + barcodeTotalWidth - currX;
            ctx.fillRect(currX, 1180, w - 2, 80); 
            currX += w + (Math.random() > 0.5 ? 4 : 8);
        }

        const dateStr = new Date().toISOString().split('T')[0];
        ctx.fillStyle = '#64748b'; ctx.font = 'bold 30px monospace'; 
        ctx.fillText(`ID: 8${Date.now().toString().slice(-6)} | AUTH: ${dateStr}`, 540, 1340);

        // 浮水印
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = 'bold 20px monospace'; 
        ctx.fillText(WATERMARK_TEXT, 540, 1500);

        setTimeout(() => {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            Swal.fire({
                title: '💳 認證卡生成成功', text: '請長按下方圖片進行儲存',
                imageUrl: dataUrl, imageWidth: '100%',
                background: '#121215', color: '#fff', confirmButtonColor: '#f43f5e', confirmButtonText: '完成',
                customClass: { popup: 'custom-modal', image: 'swal2-image' }
            });
        }, 500);
    }
};

/* ================== 6. 會考系統 ================== */
let currentQuiz = [], currentQIndex = 0, score = 0, quizPlayerName = "";

window.startQuiz = function() {
    if(appSettings.soundOn) playClickSound();
    quizPlayerName = document.getElementById('quiz-player-name').value.trim();
    if(!quizPlayerName) { Swal.fire('提示', '請輸入名字！', 'warning'); return; }
    if (quizData.length < 10) { Swal.fire('錯誤', '題庫不足 10 題！', 'error'); return; }

    document.getElementById('quiz-intro').classList.add('hidden'); document.getElementById('quiz-area').classList.replace('hidden', 'flex');
    currentQuiz = [...quizData].sort(() => 0.5 - Math.random()).slice(0, 10);
    currentQIndex = 0; score = 0; renderQuizQuestion();
};

function renderQuizQuestion() {
    if (currentQIndex >= 10) { endQuiz(); return; }
    const qData = currentQuiz[currentQIndex];
    document.getElementById('quiz-progress').innerText = `題目 ${currentQIndex + 1}/10`;
    document.getElementById('quiz-score').innerText = `目前得分: ${score}`;
    document.getElementById('quiz-question').innerText = `Q: ${qData.q}`;

    const optsContainer = document.getElementById('quiz-options'); optsContainer.innerHTML = '';
    [...qData.options].sort(() => 0.5 - Math.random()).forEach(opt => {
        const isCorrect = (opt === qData.a);
        optsContainer.innerHTML += `<button onclick="answerQuiz(this, ${isCorrect})" class="w-full text-left bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/5 transition font-bold text-[13px] text-slate-200 active:scale-95">${opt}</button>`;
    });
}

window.answerQuiz = function(btn, isCorrect) {
    if(appSettings.soundOn) playClickSound();
    document.getElementById('quiz-options').querySelectorAll('button').forEach(b => b.disabled = true);
    if (isCorrect) {
        btn.className = "w-full text-left bg-blue-600/30 border border-blue-500 text-blue-400 p-4 rounded-xl font-black text-sm"; score += 10;
    } else {
        btn.className = "w-full text-left bg-red-600/30 border border-red-500 text-red-400 p-4 rounded-xl font-bold text-sm";
        document.getElementById('quiz-options').querySelectorAll('button').forEach(b => {
            if (b.innerText.trim() === currentQuiz[currentQIndex].a) b.className = "w-full text-left bg-blue-600/30 border border-blue-500 text-blue-400 p-4 rounded-xl font-bold text-sm";
        });
    }
    document.getElementById('quiz-score').innerText = `目前得分: ${score}`;
    setTimeout(() => { currentQIndex++; renderQuizQuestion(); }, 1000);
};

function endQuiz() {
    let title = score >= 90 ? "終極守護者" : score >= 60 ? "鐵桿麋鹿" : "新手麋鹿";
    document.getElementById('quiz-area').classList.replace('flex','hidden'); document.getElementById('quiz-intro').classList.remove('hidden');
    Swal.fire({ title: '核算成績中...', background: '#121215', color: '#fff', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    setTimeout(() => generateQuizResultImage(title), 800);
}

window.generateQuizResultImage = function(title) {
    const canvas = document.getElementById('quiz-canvas'); const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#03050a'; ctx.fillRect(0, 0, 1080, 1500);
    const grad = ctx.createRadialGradient(540, 600, 100, 540, 600, 800);
    grad.addColorStop(0, 'rgba(59, 130, 246, 0.3)'); grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1500);
    
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'; ctx.lineWidth = 8; roundRect(ctx, 60, 80, 960, 1340, 50); ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = '#ffffff'; ctx.font = '900 75px "Segoe UI", sans-serif'; ctx.fillText('大會考戰績', 540, 250);
    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 36px "Segoe UI", sans-serif'; ctx.fillText(`挑戰者：${quizPlayerName}`, 540, 350);

    ctx.shadowColor = 'rgba(59, 130, 246, 0.8)'; ctx.shadowBlur = 60;
    ctx.fillStyle = '#3b82f6'; ctx.font = '900 400px "Segoe UI", sans-serif'; ctx.fillText(`${score}`, 540, 850);
    ctx.shadowColor = 'transparent';
    
    ctx.fillStyle = '#cbd5e1'; ctx.font = 'bold 40px "Segoe UI", sans-serif'; ctx.fillText(`獲頒稱號`, 540, 1050);
    
    const textGrad = ctx.createLinearGradient(0, 1000, 0, 1200);
    textGrad.addColorStop(0, '#fbbf24'); textGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = textGrad; ctx.font = '900 100px "Segoe UI", sans-serif'; ctx.fillText(`🏆 ${title}`, 540, 1180);

    // 浮水印
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = 'bold 20px monospace'; 
    ctx.fillText(WATERMARK_TEXT, 540, 1460);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    Swal.fire({
        title: '🏆 測驗完成', text: '長按圖片儲存你的戰績',
        imageUrl: dataUrl, imageWidth: '100%',
        background: '#121215', color: '#fff', confirmButtonColor: '#3b82f6', confirmButtonText: '確認',
        customClass: { popup: 'custom-modal', image: 'swal2-image' }
    });
};

function playClickSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05);
    } catch(e) {}
}