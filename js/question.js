// =====================
// となりのデジジ - question.js
// =====================

'use strict';

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.add('hidden');
  });

  const target = document.getElementById(id);

  if (target) {
    target.classList.remove('hidden');
    window.scrollTo(0, 0);
  }
}

async function startPhoneIconPractice() {
  await saveActionLog({
    scenarioId: 1,
    sectionId: 1,
    action: '電話アイコンを探す練習を開始した',
    isCorrect: true,
  });

  location.href = 'home.html';
}

async function startContactPractice() {
  await saveActionLog({
    scenarioId: 1,
    sectionId: 2,
    action: '孫の連絡先を探す練習を開始した',
    isCorrect: true,
  });

  location.href = 'call.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const startId = location.hash.replace('#', '') || 'question1';
  showScreen(startId);

  document.querySelectorAll('.btn-next').forEach((button) => {
    button.addEventListener('click', () => {
      const nextId = button.dataset.next;

      if (
        nextId &&
        !button.hasAttribute('onclick')
      ) {
        showScreen(nextId);
      }
    });
  });
});
