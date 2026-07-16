// ==============================
// となりのデジジ
// iPhone風ホーム画面
// ==============================

'use strict';


// ==============================
// 状態管理
// ==============================

let jigglingTimer = null;
let isJiggling = false;
let isOpeningPhone = false;


// ==============================
// 時刻・日付ユーティリティ
// ==============================

function zeroPad(number) {
    return String(number).padStart(2, '0');
}


const DAYS_JA = [
    '日曜日',
    '月曜日',
    '火曜日',
    '水曜日',
    '木曜日',
    '金曜日',
    '土曜日',
];


const DAYS_SHORT = [
    '日',
    '月',
    '火',
    '水',
    '木',
    '金',
    '土',
];


// ==============================
// ステータスバー時計
// ==============================

function updateStatusTime() {
    const timeElement =
        document.getElementById('statusTime');

    if (!timeElement) {
        return;
    }

    const now = new Date();

    timeElement.textContent =
        `${now.getHours()}:${zeroPad(now.getMinutes())}`;
}


// ==============================
// カレンダーウィジェット
// ==============================

function updateCalendarWidget() {
    const now = new Date();

    const dayElement =
        document.getElementById('calDayName');

    const dateElement =
        document.getElementById('calDate');

    if (dayElement) {
        dayElement.textContent =
            DAYS_JA[now.getDay()];
    }

    if (dateElement) {
        dateElement.textContent =
            now.getDate();
    }
}


// ==============================
// ミニカレンダー
// ==============================

function buildMiniCalendar() {
    const grid =
        document.getElementById('calAppGrid');

    if (!grid) {
        return;
    }

    grid.innerHTML = '';

    const now = new Date();

    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    const firstDay =
        new Date(year, month, 1).getDay();

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    // 曜日を表示
    DAYS_SHORT.forEach((day, index) => {
        const cell =
            document.createElement('div');

        cell.className =
            'cal-cell' +
            (
                index === 0
                    ? ' sun'
                    : index === 6
                        ? ' sat'
                        : ''
            );

        cell.textContent = day;

        grid.appendChild(cell);
    });


    // 月初までの空白
    for (
        let index = 0;
        index < firstDay;
        index += 1
    ) {
        const blank =
            document.createElement('div');

        blank.className = 'cal-cell';

        grid.appendChild(blank);
    }


    // 日付を表示
    for (
        let day = 1;
        day <= daysInMonth;
        day += 1
    ) {
        const cell =
            document.createElement('div');

        const dayOfWeek =
            (firstDay + day - 1) % 7;

        let className = 'cal-cell';

        if (dayOfWeek === 0) {
            className += ' sun';
        }

        if (dayOfWeek === 6) {
            className += ' sat';
        }

        if (day === today) {
            className += ' today';
        }

        cell.className = className;
        cell.textContent = day;

        grid.appendChild(cell);
    }
}


// ==============================
// アナログ時計
// ==============================

function drawClock() {
    const canvas =
        document.getElementById('clockCanvas');

    if (!canvas) {
        return;
    }

    const context =
        canvas.getContext('2d');

    if (!context) {
        return;
    }

    const size = canvas.width;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 2;

    const now = new Date();

    const second = now.getSeconds();
    const minute = now.getMinutes();
    const hour = now.getHours() % 12;

    context.clearRect(
        0,
        0,
        size,
        size
    );


    // 時計の背景
    context.beginPath();

    context.arc(
        centerX,
        centerY,
        radius,
        0,
        Math.PI * 2
    );

    context.fillStyle = '#1c1c1e';

    context.fill();


    // 目盛り
    for (
        let index = 0;
        index < 12;
        index += 1
    ) {
        const angle =
            (index / 12) *
            Math.PI *
            2 -
            Math.PI / 2;

        const startX =
            centerX +
            Math.cos(angle) *
            (radius - 3);

        const startY =
            centerY +
            Math.sin(angle) *
            (radius - 3);

        const endX =
            centerX +
            Math.cos(angle) *
            (radius - 7);

        const endY =
            centerY +
            Math.sin(angle) *
            (radius - 7);

        context.beginPath();

        context.moveTo(
            startX,
            startY
        );

        context.lineTo(
            endX,
            endY
        );

        context.strokeStyle =
            'rgba(255, 255, 255, 0.6)';

        context.lineWidth = 1.5;

        context.stroke();
    }


    // 時針
    const hourAngle =
        (
            (
                hour +
                minute / 60
            ) /
            12
        ) *
        Math.PI *
        2 -
        Math.PI / 2;

    drawHand(
        context,
        centerX,
        centerY,
        hourAngle,
        radius * 0.52,
        3,
        '#ffffff'
    );


    // 分針
    const minuteAngle =
        (
            (
                minute +
                second / 60
            ) /
            60
        ) *
        Math.PI *
        2 -
        Math.PI / 2;

    drawHand(
        context,
        centerX,
        centerY,
        minuteAngle,
        radius * 0.72,
        2,
        '#ffffff'
    );


    // 秒針
    const secondAngle =
        (second / 60) *
        Math.PI *
        2 -
        Math.PI / 2;

    drawHand(
        context,
        centerX,
        centerY,
        secondAngle,
        radius * 0.78,
        1,
        '#ff0033'
    );


    // 中央
    context.beginPath();

    context.arc(
        centerX,
        centerY,
        2.5,
        0,
        Math.PI * 2
    );

    context.fillStyle = '#ffffff';

    context.fill();
}


function drawHand(
    context,
    centerX,
    centerY,
    angle,
    length,
    width,
    color
) {
    context.beginPath();

    context.moveTo(
        centerX,
        centerY
    );

    context.lineTo(
        centerX +
            Math.cos(angle) *
            length,

        centerY +
            Math.sin(angle) *
            length
    );

    context.strokeStyle = color;
    context.lineWidth = width;
    context.lineCap = 'round';

    context.stroke();
}


// ==============================
// タップリップル
// ==============================

function initRipple() {
    const ripple =
        document.getElementById('tapRipple');

    if (!ripple) {
        return;
    }

    document.addEventListener(
        'touchstart',
        (event) => {
            const touch =
                event.touches[0];

            if (!touch) {
                return;
            }

            const size = 80;

            ripple.style.width =
                `${size}px`;

            ripple.style.height =
                `${size}px`;

            ripple.style.left =
                `${touch.clientX - size / 2}px`;

            ripple.style.top =
                `${touch.clientY - size / 2}px`;

            ripple.style.transition =
                'none';

            ripple.style.transform =
                'scale(0)';

            ripple.style.opacity =
                '0.4';

            requestAnimationFrame(() => {
                ripple.style.transition =
                    'transform 0.5s ease-out, opacity 0.5s ease-out';

                ripple.style.transform =
                    'scale(3)';

                ripple.style.opacity =
                    '0';
            });
        },
        {
            passive: true,
        }
    );
}


// ==============================
// アイコン長押し
// ==============================

function startJiggle() {
    isJiggling = true;

    document
        .querySelectorAll(
            '.app-icon, .dock-icon'
        )
        .forEach((element) => {
            element.classList.add('jiggle');
        });
}


function stopJiggle() {
    isJiggling = false;

    document
        .querySelectorAll('.jiggle')
        .forEach((element) => {
            element.classList.remove('jiggle');
        });
}


function initJiggle() {
    document.addEventListener(
        'touchstart',
        () => {
            if (isJiggling) {
                stopJiggle();
                return;
            }

            jigglingTimer =
                window.setTimeout(
                    startJiggle,
                    600
                );
        },
        {
            passive: true,
        }
    );

    document.addEventListener(
        'touchend',
        () => {
            window.clearTimeout(
                jigglingTimer
            );
        },
        {
            passive: true,
        }
    );
}


function injectJiggleStyle() {
    if (
        document.getElementById(
            'jiggleStyle'
        )
    ) {
        return;
    }

    const style =
        document.createElement('style');

    style.id = 'jiggleStyle';

    style.textContent = `
        @keyframes jiggle {
            0%,
            100% {
                transform: rotate(-1.5deg);
            }

            50% {
                transform: rotate(1.5deg);
            }
        }

        .jiggle {
            animation:
                jiggle
                0.18s
                ease-in-out
                infinite;
        }
    `;

    document.head.appendChild(style);
}


// ==============================
// ログ保存
// ==============================

async function saveHomeLogSafely(
    actionName,
    isCorrect = true
) {
    if (
        typeof saveActionLog !==
        'function'
    ) {
        console.warn(
            'saveActionLog関数が読み込まれていません。'
        );

        return false;
    }

    try {
        const result =
            await saveActionLog({
                scenarioId: 1,
                sectionId: 1,
                action: actionName,
                isCorrect,
            });

        return result === true;

    } catch (error) {
        console.warn(
            'ホーム画面のログを保存できませんでした。',
            error
        );

        return false;
    }
}


// ==============================
// 電話アイコン
// ==============================

async function openPhoneFromHome() {
    /*
     * 連打による二重実行を防ぐ。
     */
    if (isOpeningPhone) {
        return;
    }

    isOpeningPhone = true;

    const phoneIcon =
        document.getElementById(
            'phoneDockIcon'
        );

    if (phoneIcon) {
        phoneIcon.style.pointerEvents =
            'none';
    }


    await saveHomeLogSafely(
        'ホーム画面の電話アイコンを押した',
        true
    );


    const moveToQuestion = () => {
        location.href =
            'question.html#question2';
    };


    /*
     * 成功演出が読み込まれていない場合は
     * そのまま次の画面へ進む。
     */
    if (
        typeof playSectionSuccess !==
        'function'
    ) {
        console.warn(
            'playSectionSuccessが読み込まれていないため、成功演出を省略します。'
        );

        moveToQuestion();
        return;
    }


    /*
     * 電話アイコンを見つけた成功演出。
     */
    playSectionSuccess({
        message: '正解です！',

        subMessage:
            '電話アイコンを見つけることができました！',

        onComplete: moveToQuestion,
    });
}


// ==============================
// その他のアプリ操作ログ
// ==============================

async function recordHomeAction(
    actionName,
    isCorrect = true
) {
    await saveHomeLogSafely(
        actionName,
        isCorrect
    );
}


// ==============================
// メインループ
// ==============================

function tick() {
    updateStatusTime();
    drawClock();
}


// ==============================
// 初期化
// ==============================

document.addEventListener(
    'DOMContentLoaded',
    () => {
        updateCalendarWidget();
        buildMiniCalendar();
        injectJiggleStyle();
        initRipple();
        initJiggle();
        tick();

        window.setInterval(
            tick,
            1000
        );


        /*
         * 電話以外のアプリアイコンを
         * 不正解操作として保存する。
         */
        document
            .querySelectorAll(
                '.app-icon, .dock-icon'
            )
            .forEach((icon) => {
                const appName =
                    icon.dataset.name ||
                    icon.getAttribute(
                        'aria-label'
                    ) ||
                    icon.textContent.trim() ||
                    '不明なアプリ';


                /*
                 * 電話アイコンは
                 * openPhoneFromHome()で処理する。
                 */
                if (
                    appName.includes('電話')
                ) {
                    return;
                }


                icon.addEventListener(
                    'click',
                    () => {
                        recordHomeAction(
                            `${appName}アイコンを押した`,
                            false
                        );
                    }
                );
            });


        /*
         * キーボード操作への対応。
         */
        const phoneIcon =
            document.getElementById(
                'phoneDockIcon'
            );

        phoneIcon?.addEventListener(
            'keydown',
            (event) => {
                if (
                    event.key === 'Enter' ||
                    event.key === ' '
                ) {
                    event.preventDefault();
                    openPhoneFromHome();
                }
            }
        );
    }
);