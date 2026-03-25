import { updateUserProfile, getUserStats } from './db.js';

export function initProfile(app) {
  // 綁定 UI 儲存按鈕
  const saveBtn = document.getElementById('profile-save-btn');
  const nameInput = document.getElementById('profile-name-input');
  const historyToggle = document.getElementById('profile-history-toggle');

  saveBtn?.addEventListener('click', () => {
    // 派發儲存事件，交給下方邏輯處理與寫入資料庫
    document.dispatchEvent(new CustomEvent('profile:save-requested', {
      detail: {
        displayName: nameInput?.value.trim(),
        showHistory: historyToggle?.checked
      }
    }));
  });

  document.addEventListener('profile:save-requested', async (e) => {
    try {
      const user = app.getCurrentUser();
      if (!user?.uid) throw new Error('請先登入會員。');
      
      const updates = e.detail || {};
      if (!updates.displayName) throw new Error('顯示名稱不能為空。');

      // 呼叫 db.js 將變更寫入雲端
      const updated = await updateUserProfile(user.uid, updates);
      
      // 合併最新狀態並發送成功廣播
      const merged = { ...user, ...updated };
      document.dispatchEvent(new CustomEvent('profile:save-success', { detail: { user: merged } }));
      
      // 同步更新畫面上的統計數據
      const stats = await getUserStats(user.uid);
      app.updateStats(stats);
      
    } catch (error) {
      document.dispatchEvent(new CustomEvent('profile:save-error', { detail: { message: error.message || '儲存失敗。' } }));
    }
  });
}