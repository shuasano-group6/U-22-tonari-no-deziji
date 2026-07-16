// =====================
// となりのデジジ - API共通処理
// =====================

'use strict';

const API_BASE_URL = 'http://127.0.0.1:8000';
const USER_ID_STORAGE_KEY = 'deziji_user_id';
const PHONE_SESSION_STORAGE_KEY = 'deziji_phone_play_session_id';
const LAST_RESULT_STORAGE_KEY = 'deziji_last_result';

async function parseJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON解析エラー:', error);
    return {};
  }
}

function getStoredUserId() {
  const value = localStorage.getItem(USER_ID_STORAGE_KEY);

  if (!value) {
    return null;
  }

  const userId = Number(value);

  if (!Number.isInteger(userId) || userId <= 0) {
    localStorage.removeItem(USER_ID_STORAGE_KEY);
    return null;
  }

  return userId;
}

async function userExists(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);

    if (response.status === 404) {
      return false;
    }

    return response.ok;
  } catch (error) {
    console.error('ユーザー確認エラー:', error);
    return false;
  }
}

async function createGuestUser() {
  try {
    const response = await fetch(`${API_BASE_URL}/users/guest`, {
      method: 'POST',
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(
        data.detail || 'ゲストユーザーを作成できませんでした'
      );
    }

    localStorage.setItem(
      USER_ID_STORAGE_KEY,
      String(data.user_id)
    );

    return Number(data.user_id);
  } catch (error) {
    console.error('ゲストユーザー作成エラー:', error);
    return null;
  }
}

async function initializeUser() {
  const storedUserId = getStoredUserId();

  if (storedUserId !== null) {
    const exists = await userExists(storedUserId);

    if (exists) {
      return storedUserId;
    }

    // DB初期化後などで古いIDが残っている場合
    localStorage.removeItem(USER_ID_STORAGE_KEY);
    localStorage.removeItem(PHONE_SESSION_STORAGE_KEY);
    localStorage.removeItem(LAST_RESULT_STORAGE_KEY);
  }

  return createGuestUser();
}

async function startPlaySession(scenarioId) {
  const userId = await initializeUser();

  if (userId === null) {
    return null;
  }

  try {
    let response = await fetch(
      `${API_BASE_URL}/play-sessions/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          scenario_id: scenarioId,
        }),
      }
    );

    let data = await parseJsonResponse(response);

    // DBを作り直した直後など、保存IDだけ古い場合は再作成
    if (response.status === 404) {
      localStorage.removeItem(USER_ID_STORAGE_KEY);
      localStorage.removeItem(PHONE_SESSION_STORAGE_KEY);

      const newUserId = await createGuestUser();

      if (newUserId === null) {
        return null;
      }

      response = await fetch(
        `${API_BASE_URL}/play-sessions/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: newUserId,
            scenario_id: scenarioId,
          }),
        }
      );

      data = await parseJsonResponse(response);
    }

    if (!response.ok) {
      throw new Error(
        data.detail || 'プレイを開始できませんでした'
      );
    }

    if (scenarioId === 1) {
      localStorage.setItem(
        PHONE_SESSION_STORAGE_KEY,
        String(data.play_session_id)
      );
    }

    return Number(data.play_session_id);
  } catch (error) {
    console.error('プレイ開始エラー:', error);
    return null;
  }
}

function getPhonePlaySessionId() {
  const value = localStorage.getItem(
    PHONE_SESSION_STORAGE_KEY
  );

  if (!value) {
    return null;
  }

  const sessionId = Number(value);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    localStorage.removeItem(PHONE_SESSION_STORAGE_KEY);
    return null;
  }

  return sessionId;
}

async function ensurePhonePlaySession() {
  const existingSessionId = getPhonePlaySessionId();

  if (existingSessionId !== null) {
    return existingSessionId;
  }

  return startPlaySession(1);
}

async function saveActionLog({
  scenarioId,
  sectionId,
  action,
  isCorrect,
}) {
  const userId = await initializeUser();

  if (userId === null) {
    return false;
  }

  const playSessionId =
    scenarioId === 1
      ? await ensurePhonePlaySession()
      : null;

  if (playSessionId === null) {
    console.error('プレイセッションを取得できません');
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        play_session_id: playSessionId,
        user_id: userId,
        scenario_id: scenarioId,
        section_id: sectionId,
        action,
        is_correct: isCorrect,
      }),
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.detail || 'ログ保存に失敗しました');
    }

    return true;
  } catch (error) {
    console.error('ログ保存エラー:', error);
    return false;
  }
}

async function finishPhonePlaySession() {
  const playSessionId = getPhonePlaySessionId();

  if (playSessionId === null) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/play-sessions/${playSessionId}/finish`,
      {
        method: 'POST',
      }
    );

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(
        data.detail || 'プレイを完了できませんでした'
      );
    }

    localStorage.removeItem(PHONE_SESSION_STORAGE_KEY);
    localStorage.setItem(
      LAST_RESULT_STORAGE_KEY,
      JSON.stringify(data)
    );

    return data;
  } catch (error) {
    console.error('プレイ完了エラー:', error);
    return null;
  }
}

function getLastResult() {
  const value = localStorage.getItem(LAST_RESULT_STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('保存結果の読み込みエラー:', error);
    return null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeUser();
});
