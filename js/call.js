// ==============================
// となりのデジジ
// 電話シナリオ
// ==============================

'use strict';


// ==============================
// 共通処理
// ==============================

/**
 * 指定した画面だけを表示する。
 *
 * @param {string} screenId 表示する要素のID
 */
function showCallScreen(screenId) {
    const screenIds = [
        'callScreen',
        'correctArea',
        'incorrectArea',
        'grandchildCall',
        'callFinish',
    ];

    screenIds.forEach((id) => {
        const screen = document.getElementById(id);

        if (!screen) {
            return;
        }

        screen.classList.toggle(
            'hidden',
            id !== screenId
        );
    });

    window.scrollTo(0, 0);
}


/**
 * ログを安全に保存する。
 * APIが停止していても画面操作を続けられる。
 *
 * @param {Object} logData
 * @returns {Promise<boolean>}
 */
async function saveCallLogSafely(logData) {
    if (typeof saveActionLog !== 'function') {
        console.warn(
            'saveActionLog関数が読み込まれていません。'
        );

        return false;
    }

    try {
        const result = await saveActionLog(logData);
        return result === true;

    } catch (error) {
        console.warn(
            '行動ログを保存できませんでした。',
            error
        );

        return false;
    }
}


/**
 * 成功演出が利用できるか確認する。
 *
 * @returns {boolean}
 */
function canPlaySuccessEffect() {
    return typeof playSectionSuccess === 'function';
}


/**
 * クリア演出が利用できるか確認する。
 *
 * @returns {boolean}
 */
function canPlayClearEffect() {
    return typeof playScenarioClear === 'function';
}


// ==============================
// 連絡先選択
// ==============================

/**
 * 間違った連絡先を選択した場合。
 *
 * @param {string} type 選択した連絡先名
 */
async function incorrect(type) {
    await saveCallLogSafely({
        scenarioId: 1,
        sectionId: 2,
        action: `${type}を選択した`,
        isCorrect: false,
    });

    const incorrectName =
        document.getElementById('incorrectName');

    if (incorrectName) {
        incorrectName.textContent = type;
    }

    showCallScreen('incorrectArea');
}


/**
 * 孫の連絡先を正しく選択した場合。
 */
async function correct() {
    await saveCallLogSafely({
        scenarioId: 1,
        sectionId: 2,
        action: '孫の連絡先を選択した',
        isCorrect: true,
    });

    const showCorrectScreen = () => {
        showCallScreen('correctArea');
    };

    if (!canPlaySuccessEffect()) {
        console.warn(
            'playSectionSuccessが読み込まれていないため、演出を省略します。'
        );

        showCorrectScreen();
        return;
    }

    playSectionSuccess({
        message: '正解です！',
        subMessage:
            '「孫」の連絡先を見つけることができました！',

        onComplete: showCorrectScreen,
    });
}


// ==============================
// 孫の連絡先詳細
// ==============================

/**
 * 孫の連絡先詳細画面へ進む。
 */
async function grandchildCall() {
    await saveCallLogSafely({
        scenarioId: 1,
        sectionId: 3,
        action: '孫の連絡先詳細を開いた',
        isCorrect: true,
    });

    showCallScreen('grandchildCall');
}


// ==============================
// 発信操作
// ==============================

/**
 * 電話以外のボタンを押した場合。
 *
 * @param {string} type 押したボタン名
 */
async function incorrectCallAction(type) {
    await saveCallLogSafely({
        scenarioId: 1,
        sectionId: 4,
        action: `${type}ボタンを押した`,
        isCorrect: false,
    });

    alert(
        `「${type}」ではありません。\n今回は緑色の「電話」ボタンを押してみましょう。`
    );
}


/**
 * 電話ボタンを正しく押した場合。
 */
async function callFinish() {
    await saveCallLogSafely({
        scenarioId: 1,
        sectionId: 4,
        action: '電話ボタンを押して発信した',
        isCorrect: true,
    });

    /*
     * プレイセッションを先に完了させる。
     * APIエラーが起きてもクリア演出は続行する。
     */
    if (typeof finishPhonePlaySession === 'function') {
        try {
            await finishPhonePlaySession();

        } catch (error) {
            console.warn(
                'プレイセッションを完了できませんでした。',
                error
            );
        }
    } else {
        console.warn(
            'finishPhonePlaySession関数が読み込まれていません。'
        );
    }

    const showFinishScreen = () => {
        showCallScreen('callFinish');
    };

    // ここから最後だけクリア演出
    if (!canPlayClearEffect()) {
        console.warn(
            'playScenarioClearが読み込まれていないため、演出を省略します。'
        );

        showFinishScreen();
        return;
    }

    playScenarioClear({
        message: 'シナリオクリア！',
        subMessage: '安全に電話をかけることができました！',
        onComplete: showFinishScreen,
    });
}


// ==============================
// 再挑戦・画面遷移
// ==============================

/**
 * 連絡先選択をやり直す。
 */
function retryContactSelection() {
    showCallScreen('callScreen');
}


/**
 * 結果画面を開く。
 */
function openResultsPage() {
    location.href = 'results.html';
}


/**
 * ホーム画面へ戻る。
 */
function finishScenarioAndReturnHome() {
    location.href = 'index.html';
}


// ==============================
// 初期化
// ==============================

document.addEventListener(
    'DOMContentLoaded',
    () => {
        showCallScreen('callScreen');
    }
);