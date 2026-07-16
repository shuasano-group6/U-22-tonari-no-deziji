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


async function getCurrentUser() {
  const userId = await initializeUser();

  if (userId === null) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(
        data.detail || 'ユーザー情報を取得できませんでした'
      );
    }

    return data;
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    return null;
  }
}

async function registerCurrentUser({
  displayName,
  birthDate,
  loginId,
  password,
}) {
  const userId = await initializeUser();

  if (userId === null) {
    throw new Error('ユーザーを準備できませんでした');
  }

  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/register`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: displayName,
        birth_date: birthDate || null,
        login_id: loginId,
        password,
      }),
    }
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data.detail || 'ユーザー登録に失敗しました'
    );
  }

  return data;
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


async function getPlaySessionComments(playSessionId) {
  const response = await fetch(
    `${API_BASE_URL}/play-sessions/${playSessionId}/comments`
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data.detail || 'コメントを取得できませんでした'
    );
  }

  return data.comments || [];
}

async function postPlaySessionComment({
  playSessionId,
  authorType,
  authorName = '',
  content,
}) {
  const response = await fetch(
    `${API_BASE_URL}/play-sessions/${playSessionId}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        author_type: authorType,
        author_name: authorName || null,
        content,
      }),
    }
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data.detail || 'コメントを保存できませんでした'
    );
  }

  return data;
}


async function getFamilyReport() {
  const userId = await initializeUser();

  if (userId === null) {
    throw new Error(
      'ユーザーを準備できませんでした'
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/family-report`
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data.detail
      || '見守りノートを取得できませんでした'
    );
  }

  return data;
}


const FAMILY_CODE_STORAGE_KEY = 'deziji_family_code';

function getStoredFamilyCode() {
  const value = localStorage.getItem(
    FAMILY_CODE_STORAGE_KEY
  );

  return value
    ? String(value).trim().toUpperCase()
    : null;
}

function saveFamilyCode(familyCode) {
  localStorage.setItem(
    FAMILY_CODE_STORAGE_KEY,
    String(familyCode).trim().toUpperCase()
  );
}

function clearFamilyCode() {
  localStorage.removeItem(
    FAMILY_CODE_STORAGE_KEY
  );
}

async function getCurrentUserFamilyCode() {
  const userId = await initializeUser();

  if (userId === null) {
    throw new Error(
      'ユーザーを準備できませんでした'
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/family-code`
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data.detail
      || '家族コードを取得できませんでした'
    );
  }

  return data;
}

async function issueCurrentUserFamilyCode(
  regenerate = false
) {
  const userId = await initializeUser();

  if (userId === null) {
    throw new Error(
      'ユーザーを準備できませんでした'
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/family-code`
    + `?regenerate=${regenerate}`,
    {
      method: 'POST',
    }
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data.detail
      || '家族コードを発行できませんでした'
    );
  }

  return data;
}

async function verifyFamilyCode(familyCode) {
  const response = await fetch(
    `${API_BASE_URL}/family/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        family_code: familyCode,
      }),
    }
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data.detail
      || '家族コードを確認できませんでした'
    );
  }

  saveFamilyCode(data.family_code);

  return data;
}

async function getFamilyReportByCode(
  familyCode = getStoredFamilyCode()
) {
  if (!familyCode) {
    throw new Error(
      '家族コードを入力してください'
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/family/report`
    + `?family_code=${encodeURIComponent(familyCode)}`
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    if (response.status === 404) {
      clearFamilyCode();
    }

    throw new Error(
      data.detail
      || '見守りノートを取得できませんでした'
    );
  }

  return data;
}

async function postFamilyComment({
  playSessionId,
  familyCode = getStoredFamilyCode(),
  authorName,
  content,
}) {
  if (!familyCode) {
    throw new Error(
      '家族コードを入力してください'
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/family/play-sessions/`
    + `${playSessionId}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        family_code: familyCode,
        author_name: authorName,
        content,
      }),
    }
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data.detail
      || '家族コメントを保存できませんでした'
    );
  }

  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  initializeUser();
});
