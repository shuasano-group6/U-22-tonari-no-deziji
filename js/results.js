// =====================
// となりのデジジ - 結果画面
// =====================

'use strict';

function setResultText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function showResult(result) {
  if (!result) {
    setResultText(
      'resultMessage',
      '表示できるプレイ結果がありません。'
    );
    return;
  }

  const current = result.current;
  const previous = result.previous;
  const best = result.best;
  const comparison = result.comparison;

  setResultText('currentCorrect', current.correct_count);
  setResultText('currentIncorrect', current.incorrect_count);
  setResultText('currentAccuracy', `${current.accuracy}%`);
  setResultText('currentScore', current.score);

  setResultText(
    'previousCorrect',
    previous ? previous.correct_count : '-'
  );
  setResultText(
    'previousIncorrect',
    previous ? previous.incorrect_count : '-'
  );
  setResultText(
    'previousAccuracy',
    previous ? `${previous.accuracy}%` : '-'
  );
  setResultText(
    'previousScore',
    previous ? previous.score : '-'
  );

  setResultText('bestCorrect', best.correct_count);
  setResultText('bestIncorrect', best.incorrect_count);
  setResultText('bestAccuracy', `${best.accuracy}%`);
  setResultText('bestScore', best.score);

  let message = '初めての記録です！';

  if (result.is_new_best && previous) {
    message = 'ベスト記録を更新しました！';
  } else if (comparison) {
    if (comparison.score_difference > 0) {
      message =
        `前回より${comparison.score_difference}点アップしました！`;
    } else if (comparison.score_difference < 0) {
      message =
        `前回より${Math.abs(comparison.score_difference)}点下がりました。`;
    } else {
      message = '前回と同じスコアでした！';
    }
  }

  setResultText('resultMessage', message);
}

document.addEventListener('DOMContentLoaded', async () => {

  showResult(getLastResult());

  if (typeof getCurrentUser !== 'function') {
    return;
  }

  const user = await getCurrentUser();

  if (
      user &&
      user.is_guest
  ) {
      document
          .getElementById('registerRecommend')
          ?.classList.remove('hidden');
  }

});
