// =====================
// となりのデジタル - question.js
// =====================

document.addEventListener('DOMContentLoaded', () => {

  // ── 画面切り替え共通関数 ──
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.add('hidden');
    });
    const target = document.getElementById(id);
    if (target) {
      target.classList.remove('hidden');
      window.scrollTo(0, 0);
    }
  }

  // ── 開始画面をURLハッシュで決定 ──
  // 例: question.html#question2 → question2から開始
  const startId = location.hash.replace('#', '') || 'question1';
  showScreen(startId);

  // ── data-next属性を持つボタンで画面切り替え ──
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextId = btn.dataset.next;
      if (nextId) showScreen(nextId);
    });
  });

});