import { QA_DB } from './ld_qa.js';
import { saveQaHistory, getUserStats } from './db.js';
import { escapeHtml } from './ui.js';

export function initQA(app) {
  const input = document.getElementById('qa-search-input');
  const clearBtn = document.getElementById('clear-search-btn'); // 修正對應 HTML 的 ID
  const list = document.getElementById('qa-list');
  const empty = document.getElementById('qa-empty-state');
  const pagination = document.getElementById('qa-pagination');
  const autocomplete = document.getElementById('qa-autocomplete-results');

  if (!input || !list) return;

  let page = 1;
  let keyword = '';

  // 直接使用引入的 ES6 模組資料
  const getData = () => Array.isArray(QA_DB) ? QA_DB : [];

  function filterData() {
    const k = keyword.trim().toLowerCase();
    if (!k) return getData();
    return getData().filter((item) => {
      const question = String(item.q || '').toLowerCase();
      const answer = String(item.a || '').toLowerCase();
      const options = Array.isArray(item.options) ? item.options.join(' ').toLowerCase() : '';
      return question.includes(k) || answer.includes(k) || options.includes(k);
    });
  }

  async function recordHistory(item) {
    const user = app.getCurrentUser();
    if (!user?.uid) return;
    await saveQaHistory(user.uid, { question: item.q, answer: item.a });
    const stats = await getUserStats(user.uid);
    app.updateStats(stats);
  }

  function renderAutocomplete(results) {
    if (!autocomplete) return;
    if (!keyword.trim() || results.length === 0) {
      autocomplete.classList.add('hidden');
      autocomplete.innerHTML = '';
      return;
    }

    // 套用 V2 UI 樣式 (auto-item)
    autocomplete.innerHTML = results.slice(0, 4).map((item, index) => `
      <button type="button" class="auto-item" data-index="${index}">${escapeHtml(item.q)}</button>
    `).join('');
    autocomplete.classList.remove('hidden');

    Array.from(autocomplete.querySelectorAll('button')).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const item = results[Number(btn.dataset.index)];
        if (!item) return;
        input.value = item.q;
        keyword = item.q;
        page = 1;
        render();
        autocomplete.classList.add('hidden');
        await recordHistory(item);
        app.showToast('已搜尋並記錄。', 'success');
      });
    });
  }

  function renderPagination(totalItems) {
    if (!pagination) return;
    const perPage = app.getSettings().qaPerPage || 8;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    // 套用 V2 UI 樣式 (page-btn, active)
    pagination.innerHTML = Array.from({ length: totalPages }, (_, i) => {
      const p = i + 1;
      return `<button type="button" class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }).join('');

    pagination.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        page = Number(btn.dataset.page);
        render();
      });
    });
  }

  function render() {
    const results = filterData();
    const perPage = app.getSettings().qaPerPage || 8;
    const start = (page - 1) * perPage;
    const sliced = results.slice(start, start + perPage);

    renderAutocomplete(results);
    renderPagination(results.length);
    empty.classList.toggle('hidden', results.length > 0);

    // 套用 V2 UI 樣式 (qa-card, h4, p, card-actions, mini-action)
    list.innerHTML = sliced.map((item, index) => `
      <article class="qa-card">
        <h4>${escapeHtml(item.q)}</h4>
        <p>${escapeHtml(item.a)}</p>
        <div class="card-actions">
          <button type="button" class="mini-action" data-save-qa="${start + index}">複製與記錄</button>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('[data-save-qa]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const item = results[Number(btn.dataset.saveQa)];
        if (!item) return;
        
        // 實作複製到剪貼簿功能
        try {
          await navigator.clipboard.writeText(item.a);
          await recordHistory(item);
          app.showToast('已複製答案並記錄到歷史。', 'success');
        } catch (err) {
          app.showToast('記錄成功，但複製失敗。', 'info');
        }
      });
    });
  }

  input.addEventListener('input', () => {
    keyword = input.value;
    page = 1;
    render();
  });

  input.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const results = filterData();
    if (results[0]) {
      await recordHistory(results[0]);
      app.showToast('已記錄提問歷史。', 'success');
    }
  });

  clearBtn?.addEventListener('click', () => {
    input.value = '';
    keyword = '';
    page = 1;
    render();
    autocomplete?.classList.add('hidden');
  });

  document.addEventListener('app:qa-per-page-changed', () => {
    page = 1;
    render();
  });

  document.addEventListener('auth:state-changed', async () => {
    const user = app.getCurrentUser();
    if (user?.uid) {
      const stats = await getUserStats(user.uid);
      app.updateStats(stats);
    }
  });

  // 初始化渲染
  render();
}