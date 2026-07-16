// =====================
// となりのデジジ - 電話シナリオ
// =====================

'use strict';

async function incorrect(type) {
  await saveActionLog({
    scenarioId: 1,
    sectionId: 2,
    action: `${type}を選択した`,
    isCorrect: false,
  });

  document.getElementById('callScreen')?.classList.add('hidden');
  document.getElementById('incorrectArea')?.classList.remove('hidden');

  const incorrectName = document.getElementById('incorrectName');

  if (incorrectName) {
    incorrectName.textContent = type;
  }
}

async function correct() {
  await saveActionLog({
    scenarioId: 1,
    sectionId: 2,
    action: '孫の連絡先を選択した',
    isCorrect: true,
  });

  document.getElementById('callScreen')?.classList.add('hidden');
  document.getElementById('correctArea')?.classList.remove('hidden');
}

async function grandchildCall() {
  await saveActionLog({
    scenarioId: 1,
    sectionId: 3,
    action: '孫の連絡先詳細を開いた',
    isCorrect: true,
  });

  document.getElementById('correctArea')?.classList.add('hidden');
  document.getElementById('grandchildCall')?.classList.remove('hidden');
}

async function incorrectCallAction(type) {
  await saveActionLog({
    scenarioId: 1,
    sectionId: 4,
    action: `${type}ボタンを押した`,
    isCorrect: false,
  });

  alert('今回は「電話」ボタンを押してみましょう。');
}

async function callFinish() {
  await saveActionLog({
    scenarioId: 1,
    sectionId: 4,
    action: '電話ボタンを押して発信した',
    isCorrect: true,
  });

  await finishPhonePlaySession();

  document.getElementById('grandchildCall')?.classList.add('hidden');
  document.getElementById('callFinish')?.classList.remove('hidden');
}

function openResultsPage() {
  location.href = 'results.html';
}

function retryContactSelection() {
  location.href = 'call.html';
}

function finishScenarioAndReturnHome() {
  location.href = 'index.html';
}
