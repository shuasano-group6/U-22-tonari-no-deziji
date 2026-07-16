// ==============================
// となりのデジジ
// スタート・シナリオ選択・音声認識
// ==============================

'use strict';

let recognition = null;
let isListening = false;


// ==============================
// 要素取得
// ==============================

function getElement(id) {
    return document.getElementById(id);
}


// ==============================
// 画面切り替え
// ==============================

function showScreen(screenId) {
    const screenIds = [
        'homeScreen',
        'scenarioScreen',
        'playScreen',
    ];

    screenIds.forEach((id) => {
        const screen = getElement(id);

        if (!screen) {
            return;
        }

        screen.classList.toggle(
            'hidden',
            id !== screenId
        );
    });
}


function startScenario() {
    resetVoiceUI();
    showScreen('scenarioScreen');
}


function goHome() {
    stopVoiceRecognition();
    resetVoiceUI();
    showScreen('homeScreen');
    loadHomeDashboard();
}


function backToScenario() {
    resetVoiceUI();
    showScreen('scenarioScreen');
}


function openReflection() {
    location.href = 'reflection.html';
}

function openSettings() {
    location.href = 'settings.html';
}

function openFamilyNote() {
    location.href = 'family.html';
}


// ==============================
// 音声画面の状態管理
// ==============================

function setVoiceMessage(message) {
    const result = getElement('voiceResult');

    if (!result) {
        return;
    }

    result.textContent = message;
    result.classList.remove('hidden');
}


function hideVoiceMessage() {
    const result = getElement('voiceResult');

    if (!result) {
        return;
    }

    result.textContent = '';
    result.classList.add('hidden');
}


function setListeningState(listening) {
    isListening = listening;

    const micButton = getElement('micButton');

    if (!micButton) {
        return;
    }

    micButton.disabled = listening;
    micButton.classList.toggle('listening', listening);
}


function resetVoiceUI() {
    hideVoiceMessage();
    closeGrandchildChoice();

    const scenarioButtons = getElement('scenarioButtons');

    scenarioButtons?.classList.remove('hidden');

    setListeningState(false);
}


function closeGrandchildChoice() {
    const choice = getElement('grandchildChoice');
    const scenarioButtons = getElement('scenarioButtons');

    choice?.classList.add('hidden');
    scenarioButtons?.classList.remove('hidden');
}


function showGrandchildChoice() {
    const choice = getElement('grandchildChoice');
    const scenarioButtons = getElement('scenarioButtons');

    scenarioButtons?.classList.add('hidden');
    choice?.classList.remove('hidden');
}


// ==============================
// ログ保存
// ==============================

async function saveLogSafely(logData) {
    if (typeof saveActionLog !== 'function') {
        console.warn(
            'saveActionLog関数が読み込まれていません。'
        );

        return false;
    }

    try {
        await saveActionLog(logData);
        return true;

    } catch (error) {
        console.warn(
            '行動ログを保存できませんでした。',
            error
        );

        return false;
    }
}


// ==============================
// 電話シナリオ
// ==============================

async function openPhoneScenario() {
    stopVoiceRecognition();

    await saveLogSafely({
        scenarioId: 1,
        sectionId: 0,
        action: '電話シナリオを選択した',
        isCorrect: true,
    });

    location.href = 'question.html#question1';
}


// ==============================
// LINE・写真シナリオ
// ==============================

async function loadScenario(type) {
    stopVoiceRecognition();
    resetVoiceUI();

    const playTitle = getElement('playScenarioTitle');
    const scenarioText = getElement('scenarioText');

    const scenarioData = {
        LINE: {
            id: 2,
            message:
                'LINEでメッセージを送る練習をしてみましょう。',
        },

        写真: {
            id: 3,
            message:
                '写真を撮る練習をしてみましょう。',
        },
    };

    const selectedScenario =
        scenarioData[type] || {
            id: 0,
            message:
                'デジタル操作の練習を始めましょう。',
        };

    if (playTitle) {
        playTitle.textContent = type;
    }

    if (scenarioText) {
        scenarioText.textContent =
            selectedScenario.message;
    }

    showScreen('playScreen');

    await saveLogSafely({
        scenarioId: selectedScenario.id,
        sectionId: 0,
        action: `${type}シナリオを選択した`,
        isCorrect: true,
    });
}


// ==============================
// シナリオ完了
// ==============================

async function success() {
    const playTitle = getElement('playScenarioTitle');

    const scenarioName =
        playTitle?.textContent?.trim() || '不明';

    const scenarioIds = {
        LINE: 2,
        写真: 3,
    };

    const scenarioId =
        scenarioIds[scenarioName] || 0;

    await saveLogSafely({
        scenarioId,
        sectionId: 99,
        action:
            `${scenarioName}シナリオを完了した`,
        isCorrect: true,
    });

    alert('よくできました！ 経験値 +10');

    goHome();
}


// ==============================
// 音声認識
// ==============================

function startVoice() {
    if (isListening) {
        return;
    }

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        setVoiceMessage(
            'このブラウザは音声認識に対応していません。ChromeまたはEdgeでお試しください。'
        );

        return;
    }

    closeGrandchildChoice();

    recognition = new SpeechRecognition();

    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;


    // --------------------------
    // 音声認識開始
    // --------------------------

    recognition.onstart = function () {
        console.log('音声認識開始');

        setListeningState(true);

        setVoiceMessage(
            '🎤 聞いています…\n「電話」「LINE」「写真」と話してください。'
        );
    };


    // --------------------------
    // 音声認識結果
    // --------------------------

    recognition.onresult = function (event) {
        const transcript =
            event.results?.[0]?.[0]?.transcript
                ?.trim() || '';

        console.log(
            '音声認識結果:',
            transcript
        );

        if (!transcript) {
            setVoiceMessage(
                '声を認識できませんでした。もう一度お試しください。'
            );

            return;
        }

        setVoiceMessage(
            `「${transcript}」と聞こえました。`
        );

        handleVoiceCommand(transcript);
    };


    // --------------------------
    // 音声認識エラー
    // --------------------------

    recognition.onerror = function (event) {
        console.warn(
            '音声認識エラー:',
            event.error
        );

        const errorMessages = {
            'no-speech':
                '声が聞こえませんでした。もう一度ゆっくりお話しください。',

            'audio-capture':
                'マイクが見つかりません。マイクの接続をご確認ください。',

            'not-allowed':
                'マイクの使用が許可されていません。ブラウザの設定からマイクを許可してください。',

            'service-not-allowed':
                '音声認識サービスを利用できません。ブラウザの設定をご確認ください。',

            'network':
                '通信エラーが発生しました。インターネット接続をご確認ください。',

            'aborted':
                '',
        };

        const message =
            errorMessages[event.error] ||
            '音声を認識できませんでした。もう一度お試しください。';

        if (message) {
            setVoiceMessage(message);
        }
    };


    // --------------------------
    // 音声認識終了
    // --------------------------

    recognition.onend = function () {
        console.log('音声認識終了');

        setListeningState(false);
        recognition = null;
    };


    // --------------------------
    // 音声認識実行
    // --------------------------

    try {
        recognition.start();

    } catch (error) {
        console.error(
            '音声認識を開始できませんでした。',
            error
        );

        setListeningState(false);

        setVoiceMessage(
            '音声認識を開始できませんでした。もう一度お試しください。'
        );
    }
}


// ==============================
// 音声コマンド判定
// ==============================

function handleVoiceCommand(rawText) {
    const text = normalizeVoiceText(rawText);


    // ホームへ戻る
    if (
        includesAny(text, [
            '戻る',
            'もどる',
            'ホーム',
            '最初',
            'さいしょ',
        ])
    ) {
        goHome();
        return;
    }


    // 「孫」は電話・LINEの確認を表示
    if (
        includesAny(text, [
            '孫',
            'まご',
            'お孫さん',
        ])
    ) {
        setVoiceMessage(
            'お孫さんとは、電話とLINEのどちらを練習しますか？'
        );

        showGrandchildChoice();
        return;
    }


    // 電話
    if (
        includesAny(text, [
            '電話',
            'でんわ',
            '電話したい',
            '電話をかけたい',
            '通話',
        ])
    ) {
        setVoiceMessage(
            '電話の練習を始めます。'
        );

        window.setTimeout(
            openPhoneScenario,
            500
        );

        return;
    }


    // LINE
    if (
        includesAny(text, [
            'line',
            'ライン',
            'らいん',
            'メッセージ',
            'トーク',
        ])
    ) {
        setVoiceMessage(
            'LINEの練習を始めます。'
        );

        window.setTimeout(
            () => loadScenario('LINE'),
            500
        );

        return;
    }


    // 写真
    if (
        includesAny(text, [
            '写真',
            'しゃしん',
            'カメラ',
            '撮影',
            '撮りたい',
        ])
    ) {
        setVoiceMessage(
            '写真の練習を始めます。'
        );

        window.setTimeout(
            () => loadScenario('写真'),
            500
        );

        return;
    }


    // 該当なし
    setVoiceMessage(
        `「${rawText}」と聞こえました。\n「電話」「LINE」「写真」のどれかを話してください。`
    );
}


// ==============================
// 音声文字列の補助処理
// ==============================

function normalizeVoiceText(text) {
    return String(text)
        .trim()
        .replace(/\s+/g, '')
        .toLowerCase();
}


function includesAny(text, keywords) {
    return keywords.some((keyword) => {
        return text.includes(
            String(keyword).toLowerCase()
        );
    });
}


// ==============================
// 音声認識停止
// ==============================

function stopVoiceRecognition() {
    if (!recognition) {
        setListeningState(false);
        return;
    }

    try {
        recognition.abort();

    } catch (error) {
        console.warn(
            '音声認識の停止に失敗しました。',
            error
        );
    }

    recognition = null;
    setListeningState(false);
}

// ==============================
// ホーム・成長お知らせバー
// ==============================

function setDashboardText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value;
    }
}


function buildDashboardMessage(report) {
    const userName =
        report.user?.display_name
        && report.user.display_name !== 'ゲスト'
            ? `${report.user.display_name}さん、`
            : '';

    const weekCount =
        report.week?.completed_count || 0;

    const growth =
        report.growth || {};

    const difference =
        growth.score_difference;

    const phone =
        (report.scenarios || []).find(
            scenario =>
                scenario.scenario_id === 1
        );

    if (weekCount === 0) {
        return (
            `${userName}今週はまだ練習していません。`
            + '「やってみる」から始めましょう！'
        );
    }

    if (
        difference !== null
        && difference !== undefined
        && difference > 0
    ) {
        return (
            `${userName}電話のスコアが`
            + `前回より${difference}点アップしました！ 🎉`
        );
    }

    if (
        phone
        && phone.latest_score !== null
        && phone.latest_score !== undefined
    ) {
        return (
            `${userName}今週は${weekCount}回練習。`
            + `電話の最新スコアは${phone.latest_score}点です！`
        );
    }

    return (
        `${userName}今週は${weekCount}回練習しました。`
        + '少しずつ上達しています！'
    );
}


function restartDashboardNoticeAnimation() {
    const message =
        getElement('dashboardMessage');

    if (!message) {
        return;
    }

    message.classList.remove(
        'dashboardNoticeTextRunning'
    );

    void message.offsetWidth;

    message.classList.add(
        'dashboardNoticeTextRunning'
    );
}


async function loadHomeDashboard() {
    const dashboard =
        getElement('homeDashboard');

    if (!dashboard) {
        return;
    }

    try {
        if (
            typeof getFamilyReport
            !== 'function'
        ) {
            throw new Error(
                '成長記録の取得機能が読み込まれていません'
            );
        }

        const report =
            await getFamilyReport();

        setDashboardText(
            'dashboardMessage',
            buildDashboardMessage(report)
        );

        dashboard.classList.remove(
            'dashboardError'
        );

        restartDashboardNoticeAnimation();

    } catch (error) {
        console.error(
            'ホームお知らせ取得エラー:',
            error
        );

        setDashboardText(
            'dashboardMessage',
            '記録を取得できませんでした。バックエンドをご確認ください。'
        );

        dashboard.classList.add(
            'dashboardError'
        );

        restartDashboardNoticeAnimation();
    }
}


document.addEventListener(
    'DOMContentLoaded',
    loadHomeDashboard
);
