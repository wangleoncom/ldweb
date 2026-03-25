import { QUIZ_DB } from './ld_quiz.js';
import { saveQuizResult, getUserStats } from './db.js';

export function initQuiz(app) {
  const startBtn = document.getElementById('quiz-start-btn');
  const intro = document.getElementById('quiz-intro');
  const area = document.getElementById('quiz-area');
  const resultPanel = document.getElementById('quiz-result-panel');
  const nextBtn = document.getElementById('quiz-next-btn');
  const exitBtn = document.getElementById('quiz-exit-btn');
  const restartBtn = document.getElementById('quiz-restart-btn');
  const historyBtn = document.getElementById('quiz-open-history-btn'); // 修正對應 HTML 的 ID
  const resultHistoryBtn = document.getElementById('quiz-go-history-btn');
  const playerNameInput = document.getElementById('quiz-player-name');
  const progress = document.getElementById('quiz-progress');
  const scoreEl = document.getElementById('quiz-score');
  const questionEl = document.getElementById('quiz-question');
  const optionsEl = document.getElementById('quiz-options');
  const finalScoreEl = document.getElementById('quiz-final-score');
  const finalTitleEl = document.getElementById('quiz-final-title');

  let currentQuiz = [];
  let currentIndex = 0;
  let score = 0;
  let locked = false;
  let selectedName = '';

  // 直接使用引入的 ES6 模組資料
  const getData = () => Array.isArray(QUIZ_DB) ? QUIZ_DB : [];

  function pickRandomQuestions(count = 10) {
    return [...getData()].sort(() => Math.random() - 0.5).slice(0, count);
  }

  function computeTitle(totalScore) {
    if (totalScore >= 90) return '鹿系神級粉絲';
    if (totalScore >= 70) return '核心麋鹿';
    if (totalScore >= 50) return '穩定追鹿中';
    return '新手小鹿班';
  }

  function resetQuizUI() {
    intro.classList.remove('hidden');
    area.classList.add('hidden');
    resultPanel.classList.add('hidden');
    nextBtn.classList.add('hidden');
    optionsEl.innerHTML = '';
    currentQuiz = [];
    currentIndex = 0;
    score = 0;
    locked = false;
  }

  function renderQuestion() {
    const item = currentQuiz[currentIndex];
    if (!item) return finishQuiz();

    locked = false;
    nextBtn.classList.add('hidden');
    progress.textContent = `第 ${currentIndex + 1} / ${currentQuiz.length} 題`;
    scoreEl.textContent = `目前分數 ${score}`;
    questionEl.textContent = item.q;

    const shuffled = [...item.options].sort(() => Math.random() - 0.5);
    
    // 套用 V2 UI 樣式 (quiz-option)
    optionsEl.innerHTML = shuffled.map((opt, index) => `
      <button type="button" class="quiz-option" data-index="${index}">
        ${opt}
      </button>
    `).join('');

    optionsEl.querySelectorAll('.quiz-option').forEach((btn, index) => {
      btn.addEventListener('click', () => answerQuestion(btn, shuffled[index] === item.a, item.a));
    });
  }

  function answerQuestion(button, isCorrect, answer) {
    if (locked) return;
    locked = true;
    
    const buttons = Array.from(optionsEl.querySelectorAll('.quiz-option'));
    // 鎖定所有選項防止連點
    buttons.forEach((btn) => btn.disabled = true);

    if (isCorrect) {
      score += 10;
      button.classList.add('correct'); // 使用 styles.css 的綠色正確樣式
      app.showToast('正確答案！ ✨', 'success');
    } else {
      button.classList.add('wrong'); // 使用 styles.css 的紅色錯誤樣式
      app.showToast(`差一點點，正解是：${answer}`, 'error');
      // 標示出正確答案
      buttons.forEach((btn) => {
        if (btn.textContent.trim() === answer) btn.classList.add('correct');
      });
    }

    scoreEl.textContent = `目前分數 ${score}`;
    nextBtn.classList.remove('hidden');
  }

  async function finishQuiz() {
    const title = computeTitle(score);
    intro.classList.add('hidden');
    area.classList.add('hidden');
    resultPanel.classList.remove('hidden');
    finalScoreEl.textContent = String(score);
    finalTitleEl.textContent = title;

    const user = app.getCurrentUser();
    if (user?.uid) {
      await saveQuizResult(user.uid, {
        playerName: selectedName || user.displayName || '鹿粉會員',
        score,
        total: currentQuiz.length * 10,
        title
      });
      const stats = await getUserStats(user.uid);
      app.updateStats(stats);
      app.showToast('成績已成功同步至雲端！', 'success');
    } else {
      app.showToast('成績結算完成！(登入後可保留紀錄)', 'info');
    }
  }

  function startQuiz() {
    const db = getData();
    if (!db.length) return app.showToast('題庫載入中或發生錯誤...', 'error');

    selectedName = (playerNameInput.value || '').trim() || app.getCurrentUser()?.displayName || '匿名挑戰者';
    currentQuiz = pickRandomQuestions(10);
    currentIndex = 0;
    score = 0;
    locked = false;
    
    intro.classList.add('hidden');
    resultPanel.classList.add('hidden');
    area.classList.remove('hidden');
    renderQuestion();
  }

  startBtn?.addEventListener('click', startQuiz);
  nextBtn?.addEventListener('click', () => {
    currentIndex += 1;
    if (currentIndex >= currentQuiz.length) finishQuiz();
    else renderQuestion();
  });
  
  exitBtn?.addEventListener('click', resetQuizUI);
  restartBtn?.addEventListener('click', startQuiz);
  historyBtn?.addEventListener('click', () => app.goToPage(app.getCurrentUser() ? 'page-history' : 'page-profile'));
  resultHistoryBtn?.addEventListener('click', () => app.goToPage(app.getCurrentUser() ? 'page-history' : 'page-profile'));

  resetQuizUI();
}