import { getQuizHistory, getQaHistory, getUserStats } from './db.js';
import { escapeHtml, formatDateDisplay } from './ui.js';

export function initHistory(app) {
  const quizListEl = document.getElementById('history-quiz-list');
  const quizEmptyEl = document.getElementById('history-quiz-empty');
  const qaListEl = document.getElementById('history-qa-list');
  const qaEmptyEl = document.getElementById('history-qa-empty');
  const refreshBtn = document.getElementById('history-refresh-btn');

  async function load() {
    try {
      const user = app.getCurrentUser();
      
      // 如果未登入，清空畫面顯示為空狀態
      if (!user?.uid) {
        if (quizListEl) quizListEl.innerHTML = '';
        if (qaListEl) qaListEl.innerHTML = '';
        if (quizEmptyEl) quizEmptyEl.classList.remove('hidden');
        if (qaEmptyEl) qaEmptyEl.classList.remove('hidden');
        return;
      }
      
      // 讀取資料庫歷史與數據
      const [quizResults, qaHistory, stats] = await Promise.all([
        getQuizHistory(user.uid, 10),
        getQaHistory(user.uid, 10),
        getUserStats(user.uid)
      ]);
      
      // 更新全域成績 (LV等)
      app.updateStats(stats);
      
      // 渲染測驗歷程
      if (quizListEl && quizEmptyEl) {
        quizListEl.innerHTML = quizResults.map(item => `
          <article class="history-card">
            <h4>${escapeHtml(item.title || '-')} · ${item.score || 0} 分</h4>
            <p>${escapeHtml(item.playerName || '鹿粉')} · ${formatDateDisplay(item.createdAt)}</p>
          </article>
        `).join('');
        quizEmptyEl.classList.toggle('hidden', quizResults.length > 0);
      }

      // 渲染 QA 探索歷程
      if (qaListEl && qaEmptyEl) {
        qaListEl.innerHTML = qaHistory.map(item => `
          <article class="history-card">
            <h4>${escapeHtml(item.question || '-')}</h4>
            <p>${escapeHtml(item.answer || '-')}<br><small class="text-muted mt-1 flex">${formatDateDisplay(item.createdAt)}</small></p>
          </article>
        `).join('');
        qaEmptyEl.classList.toggle('hidden', qaHistory.length > 0);
      }

      document.dispatchEvent(new CustomEvent('history:loaded', { detail: { quizResults, qaHistory } }));
    } catch (error) {
      app.showToast(error.message || '讀取歷史失敗。', 'error');
    }
  }

  // 綁定手動更新按鈕
  refreshBtn?.addEventListener('click', load);

  document.addEventListener('history:refresh-requested', load);
  
  document.addEventListener('auth:state-changed', () => {
    // 當登入或登出時，重新載入 (登出時會清空畫面)
    load();
  });
  
  document.addEventListener('app:page-changed', (e) => {
    if (e.detail?.pageId === 'page-history') {
      load();
    }
  });
}