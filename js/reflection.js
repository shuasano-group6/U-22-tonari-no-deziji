'use strict';

async function loadReflection() {
  const userId = await initializeUser();

  if (userId === null) {
    document.getElementById('phoneStatus').textContent =
      '記録を読み込めませんでした';
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/play-sessions?scenario_id=1`
    );

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.detail || '記録取得に失敗しました');
    }

    const completed = (data.sessions || []).filter(
      session => session.is_completed
    );

    if (completed.length === 0) {
      document.getElementById('phoneStatus').textContent =
        'まだ挑戦していません';
      document.getElementById('phoneAttempts').textContent = '0';
      document.getElementById('phoneLatest').textContent = '-';
      document.getElementById('phoneBest').textContent = '-';
      return;
    }

    const latest = completed[0];
    const best = completed.reduce((currentBest, session) => {
      if (session.score > currentBest.score) return session;
      if (
        session.score === currentBest.score &&
        session.incorrect_count < currentBest.incorrect_count
      ) return session;
      return currentBest;
    }, completed[0]);

    document.getElementById('phoneStatus').textContent =
      `最新の正解率 ${latest.accuracy}%`;
    document.getElementById('phoneAttempts').textContent =
      completed.length;
    document.getElementById('phoneLatest').textContent =
      latest.score;
    document.getElementById('phoneBest').textContent =
      best.score;
  } catch (error) {
    console.error('ふりかえり取得エラー:', error);
    document.getElementById('phoneStatus').textContent =
      '記録を読み込めませんでした';
  }
}

document.addEventListener('DOMContentLoaded', loadReflection);
