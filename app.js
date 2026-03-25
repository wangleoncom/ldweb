/**
 * 鹿🦌 專屬粉絲站 - 模組化核心總機 (V2)
 * 負責初始化各子模組、處理全域事件與 UI 狀態調度
 */

import { initializeFirebaseServices } from './firebase-config.js';
import { initAuth } from './auth.js';
import { initQA } from './qa.js';
import { initQuiz } from './quiz.js';
import { initProfile } from './profile.js';
import { initHistory } from './history.js';
import { formatDateDisplay } from './ui.js'; // 引入日期處理工具，修復 Invalid Date

// 全域狀態管理
const state = {
  page: 'page-home',
  currentUser: null,
  settings: {
    qaPerPage: 8
  },
  stats: {
    quizCount: 0,
    bestScore: 0,
    qaCount: 0
  }
};

// 注入給各個子模組的 App 介面
const appCtx = {
  getCurrentUser: () => state.currentUser,
  getSettings: () => state.settings,
  showToast: showToast,
  updateStats: updateStats,
  goToPage: switchPage,
  openAuthModal: openAuthModal
};

document.addEventListener('DOMContentLoaded', () => {
  bindGlobalUI();
  
  // 1. 初始化 Firebase 連線
  initializeFirebaseServices();
  
  // 2. 初始化核心帳號系統
  initAuth();
  
  // 3. 載入各功能模組
  initQA(appCtx);
  initQuiz(appCtx);
  initProfile(appCtx);
  initHistory(appCtx);
  
  // 4. 套用使用者主題偏好
  applyTheme(localStorage.getItem('ld_theme') || 'sakura');
  
  // 5. 初始畫面渲染
  updateHeaderAndProfile();
});

/* =========================================
   全域 UI 與事件綁定
========================================= */
function bindGlobalUI() {
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => document.querySelectorAll(sel);

  // 側邊選單 (Drawer)
  qs('#drawer-open-btn')?.addEventListener('click', openDrawer);
  qs('#drawer-close-btn')?.addEventListener('click', closeDrawer);
  qs('#drawer-backdrop')?.addEventListener('click', closeDrawer);

  // 導覽列與分享
  qs('#header-share-btn')?.addEventListener('click', shareSite);

  // 頁面切換綁定
  qsa('.dock-btn, .drawer-link, .feature-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target) switchPage(target);
      if (btn.classList.contains('drawer-link')) closeDrawer();
    });
  });

  // 主題切換
  qsa('.theme-chip').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  // 彈窗操作 (Modal)
  qsa('[data-close-modal]').forEach(el => el.addEventListener('click', closeAuthModal));
  qs('#header-login-btn')?.addEventListener('click', handleLoginAction);
  qs('#open-login-btn')?.addEventListener('click', handleLoginAction);
  qs('#profile-login-btn')?.addEventListener('click', handleLoginAction);

  // 隱私權與授權聲明操作
  qs('#open-privacy-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    qs('#privacy-modal')?.classList.remove('hidden');
  });
  qsa('[data-close-privacy]').forEach(el => {
    el.addEventListener('click', () => qs('#privacy-modal')?.classList.add('hidden'));
  });

  // 嚴正聲明 (防詐騙) Modal 操作
  qs('#open-statement-btn')?.addEventListener('click', () => {
    qs('#statement-modal')?.classList.remove('hidden');
  });
  qsa('[data-close-statement]').forEach(el => {
    el.addEventListener('click', () => qs('#statement-modal')?.classList.add('hidden'));
  });

  // 註冊與登入送出攔截
  qs('#auth-login-submit-btn')?.addEventListener('click', () => {
    const email = qs('#auth-email').value.trim();
    const password = qs('#auth-password').value.trim();
    if (!email || !password) return showToast('請輸入帳號密碼。', 'error');
    
    document.dispatchEvent(new CustomEvent('auth:login-requested', { detail: { email, password } }));
  });

  qs('#auth-register-btn')?.addEventListener('click', () => {
    const displayName = qs('#auth-name').value.trim();
    const email = qs('#auth-email').value.trim();
    const password = qs('#auth-password').value.trim();
    const privacyChecked = qs('#auth-privacy-check').checked;

    if (!displayName || !email || !password) return showToast('請填寫完整註冊資訊。', 'error');
    
    // 防呆：強制確認隱私授權
    if (!privacyChecked) return showToast('請先閱讀並勾選同意隱私權與授權聲明。', 'error');

    document.dispatchEvent(new CustomEvent('auth:register-requested', { detail: { email, password, displayName } }));
  });

  // 接收 Firebase 狀態廣播
  document.addEventListener('firebase:status-changed', (e) => {
    const { initialized, mode } = e.detail;
    const modeBadge = qs('#firebase-mode-badge');
    if (modeBadge) {
      modeBadge.textContent = mode === 'firebase' ? '線上模式' : '本地模擬';
      modeBadge.className = `status-badge ${initialized ? 'ok' : 'warn'}`;
    }
    const authState = qs('#firebase-auth-state');
    if (authState) authState.textContent = initialized ? '已連線' : '待命';
    const dbState = qs('#firebase-db-state');
    if (dbState) dbState.textContent = initialized ? '已同步' : '待命';
  });

  // 接收帳號狀態廣播
  document.addEventListener('auth:state-changed', (e) => {
    const previousUser = state.currentUser;
    state.currentUser = e.detail.user;
    updateHeaderAndProfile();
    
    if (state.currentUser && !previousUser) {
      closeAuthModal();
    }
  });

  // 接收個人資料更新廣播
  document.addEventListener('profile:save-success', (e) => {
    state.currentUser = e.detail.user;
    updateHeaderAndProfile();
    showToast('個人設定已儲存。', 'success');
  });

  // 系統訊息廣播
  document.addEventListener('auth:action-success', e => showToast(e.detail.message, 'success'));
  document.addEventListener('auth:action-error', e => showToast(e.detail.message, 'error'));
  document.addEventListener('profile:save-error', e => showToast(e.detail.message, 'error'));
}

/* =========================================
   核心 UI 狀態更新邏輯
========================================= */
function updateHeaderAndProfile() {
  const qs = (sel) => document.querySelector(sel);
  const user = state.currentUser;
  
  // 基本資訊
  const displayName = user?.displayName || '訪客';
  const email = user?.email || '尚未登入';
  const roleName = user ? (user.role === 'admin' ? '系統管理員' : '專屬鹿粉') : 'GUEST';
  
  if(qs('#profile-display-name')) qs('#profile-display-name').textContent = displayName;
  if(qs('#profile-email')) qs('#profile-email').textContent = email;
  if(qs('#profile-role')) qs('#profile-role').textContent = roleName;
  if(qs('#profile-uid')) qs('#profile-uid').textContent = user ? (user.uid.includes('local') ? '本機帳號' : user.uid) : '-';
  
  // 修正 Invalid Date 問題：套用 formatDateDisplay
  if(qs('#profile-created-at')) qs('#profile-created-at').textContent = user?.createdAt ? formatDateDisplay(user.createdAt) : '-';
  if(qs('#profile-last-login-at')) qs('#profile-last-login-at').textContent = user?.lastLoginAt ? formatDateDisplay(user.lastLoginAt) : '-';
  
  if(qs('#profile-name-input') && user) qs('#profile-name-input').value = displayName;
  if(qs('#profile-history-toggle') && user) qs('#profile-history-toggle').checked = user.showHistory !== false;
  
  // 首頁歡迎詞與狀態
  const statusText = qs('#member-status-text');
  if (statusText) statusText.textContent = user ? `歡迎回來，${displayName}` : '同步您的挑戰紀錄';
  
  const statusBadge = qs('#member-status-badge');
  if (statusBadge) {
    statusBadge.textContent = user ? '已連線' : '未登入';
    statusBadge.className = `status-badge ${user ? 'ok' : 'idle'}`;
  }
  
  const modeLabel = qs('#mode-label');
  if (modeLabel) modeLabel.textContent = user ? (user.role === 'admin' ? '管理員模式' : '已登入') : '訪客模式';

  // 按鈕狀態切換
  const loginBtns = [qs('#header-login-btn'), qs('#profile-login-btn')];
  loginBtns.forEach(btn => {
    if (btn) btn.textContent = user ? '登出帳號' : '會員登入';
  });

  // 管理員專屬 UI 權限控制
  const isAdmin = user?.role === 'admin';
  qs('#drawer-admin-btn')?.classList.toggle('hidden', !isAdmin);
  qs('#profile-admin-btn')?.classList.toggle('hidden', !isAdmin);
}

function updateStats(newStats) {
  if (newStats) state.stats = { ...state.stats, ...newStats };
  const qs = (sel) => document.querySelector(sel);
  
  if(qs('#home-quiz-count')) qs('#home-quiz-count').textContent = String(state.stats.quizCount || 0);
  if(qs('#home-best-score')) qs('#home-best-score').textContent = String(state.stats.bestScore || 0);
  if(qs('#home-qa-count')) qs('#home-qa-count').textContent = String(state.stats.qaCount || 0);
  
  // 簡易經驗值與等級系統
  const exp = (state.stats.quizCount * 20) + (state.stats.qaCount * 5);
  const level = exp >= 500 ? 5 : exp >= 250 ? 4 : exp >= 100 ? 3 : exp >= 30 ? 2 : 1;
  if(qs('#level-badge')) qs('#level-badge').textContent = `LV.${level}`;
  if(qs('#exp-bar')) qs('#exp-bar').style.width = `${Math.min(100, Math.max(15, (exp % 250) / 2.5))}%`;
}

/* =========================================
   通用輔助函式 (UI/UX)
========================================= */
function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
  
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
  
  const dockBtn = document.querySelector(`.dock-btn[data-target="${pageId}"]`);
  if (dockBtn) dockBtn.classList.add('active');
  
  state.page = pageId;
  document.dispatchEvent(new CustomEvent('app:page-changed', { detail: { pageId } }));
}

function openDrawer() {
  document.getElementById('app-drawer')?.classList.add('open');
  document.getElementById('drawer-backdrop')?.classList.remove('hidden');
}

function closeDrawer() {
  document.getElementById('app-drawer')?.classList.remove('open');
  document.getElementById('drawer-backdrop')?.classList.add('hidden');
}

function openAuthModal() {
  document.getElementById('auth-modal')?.classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('auth-modal')?.classList.add('hidden');
}

function handleLoginAction() {
  if (state.currentUser) {
    document.dispatchEvent(new CustomEvent('auth:logout-requested'));
  } else {
    openAuthModal();
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'sakura');
  localStorage.setItem('ld_theme', theme || 'sakura');
  document.querySelectorAll('.theme-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function showToast(message, type = 'success') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'error' ? '❌' : type === 'info' ? '💡' : '✨'}</span><span>${message}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 250);
  }, 2500);
}

async function shareSite() {
  const payload = { title: '鹿🦌 專屬粉絲站', text: '快來加入鹿🦌的專屬粉絲空間！', url: location.href };
  try {
    if (navigator.share) {
      await navigator.share(payload);
    } else {
      await navigator.clipboard.writeText(location.href);
      showToast('網站連結已複製。', 'success');
    }
  } catch {}
}