// ==============================
// となりのデジジ
// 成功演出 共通処理
// ==============================

'use strict';

let successEffectPlaying = false;
let successEffectTimerId = null;
let successEffectCallback = null;
let successEffectResolve = null;


/**
 * 成功演出用のHTML要素を自動生成する。
 */
function ensureSuccessEffectElements() {
    let effect = document.getElementById('successEffect');

    if (effect) {
        return {
            effect,
            video: document.getElementById('successVideo'),
            sound: document.getElementById('successSound'),
            message: document.getElementById('successMessage'),
            subMessage:
                document.getElementById('successSubMessage'),
            skipButton:
                document.getElementById('successSkipButton'),
        };
    }

    effect = document.createElement('div');

    effect.id = 'successEffect';
    effect.className = 'success-effect hidden';

    effect.setAttribute('role', 'dialog');
    effect.setAttribute('aria-modal', 'true');
    effect.setAttribute(
        'aria-labelledby',
        'successMessage'
    );

    effect.innerHTML = `
        <span
            class="success-sparkle success-sparkle-1"
            aria-hidden="true"
        ></span>

        <span
            class="success-sparkle success-sparkle-2"
            aria-hidden="true"
        ></span>

        <span
            class="success-sparkle success-sparkle-3"
            aria-hidden="true"
        ></span>

        <span
            class="success-sparkle success-sparkle-4"
            aria-hidden="true"
        ></span>

        <div class="success-effect-content">

            <video
                id="successVideo"
                class="success-video"
                playsinline
                preload="auto"
                aria-hidden="true"
            ></video>

            <p
                id="successMessage"
                class="success-message"
            >
                よくできました！
            </p>

            <p
                id="successSubMessage"
                class="success-sub-message hidden"
            ></p>

            <button
                id="successSkipButton"
                type="button"
                class="success-skip-button"
            >
                次へ
            </button>

        </div>
    `;

    const sound = document.createElement('audio');

    sound.id = 'successSound';
    sound.preload = 'auto';

    document.body.appendChild(effect);
    document.body.appendChild(sound);

    const skipButton =
        document.getElementById('successSkipButton');

    skipButton?.addEventListener('click', () => {
        finishSuccessEffect();
    });

    return {
        effect,
        video: document.getElementById('successVideo'),
        sound: document.getElementById('successSound'),
        message: document.getElementById('successMessage'),
        subMessage:
            document.getElementById('successSubMessage'),
        skipButton,
    };
}


/**
 * 成功演出を再生する。
 */
function playSuccessEffect({
    message = 'よくできました！',
    subMessage = '',
    videoSrc = 'videos/owl-success.mp4',
    soundSrc = 'audio/success.mp3',
    fallbackDuration = 6000,
    showSkipButton = true,
    videoMuted = true,
    onComplete = null,
} = {}) {

    if (successEffectPlaying) {
        return Promise.resolve();
    }

    const {
        effect,
        video,
        sound,
        message: messageElement,
        subMessage: subMessageElement,
        skipButton,
    } = ensureSuccessEffectElements();

    if (
        !effect ||
        !video ||
        !sound ||
        !messageElement ||
        !subMessageElement ||
        !skipButton
    ) {
        console.warn(
            '成功演出に必要な要素を用意できませんでした。'
        );

        if (typeof onComplete === 'function') {
            onComplete();
        }

        return Promise.resolve();
    }

    successEffectPlaying = true;

    successEffectCallback =
        typeof onComplete === 'function'
            ? onComplete
            : null;

    messageElement.textContent = message;

    if (subMessage) {
        subMessageElement.textContent = subMessage;
        subMessageElement.classList.remove('hidden');
    } else {
        subMessageElement.textContent = '';
        subMessageElement.classList.add('hidden');
    }

    skipButton.classList.toggle(
        'hidden',
        !showSkipButton
    );

    video.pause();
    video.removeAttribute('src');
    video.load();

    sound.pause();
    sound.removeAttribute('src');
    sound.load();

    video.src = videoSrc;
    sound.src = soundSrc;

    video.muted = videoMuted;
    video.currentTime = 0;
    sound.currentTime = 0;

    effect.classList.remove(
        'hidden',
        'is-closing'
    );

    effect.classList.add('is-opening');

    document.body.style.overflow = 'hidden';

    successEffectTimerId =
        window.setTimeout(() => {
            finishSuccessEffect();
        }, fallbackDuration);

    video.onended = () => {
        finishSuccessEffect();
    };

    video.onerror = () => {
        console.warn(
            '成功演出の動画を読み込めませんでした:',
            videoSrc
        );
    };

    sound.onerror = () => {
        console.warn(
            '成功音を読み込めませんでした:',
            soundSrc
        );
    };

    const videoPlayPromise = video.play();
    const soundPlayPromise = sound.play();

    Promise.allSettled([
        videoPlayPromise,
        soundPlayPromise,
    ]).then((results) => {

        results.forEach((result) => {

            if (result.status === 'rejected') {
                console.warn(
                    'メディアの再生が制限されました。',
                    result.reason
                );
            }

        });

    });

    return new Promise((resolve) => {
        successEffectResolve = resolve;
    });
}

/**
 * 成功演出を終了する。
 */
function finishSuccessEffect() {

    if (!successEffectPlaying) {
        return;
    }

    successEffectPlaying = false;

    if (successEffectTimerId !== null) {
        window.clearTimeout(successEffectTimerId);
        successEffectTimerId = null;
    }

    const {
        effect,
        video,
        sound,
    } = ensureSuccessEffectElements();

    if (video) {

        video.onended = null;
        video.onerror = null;

        video.pause();

        try {
            video.currentTime = 0;
        } catch (error) {
            console.warn(
                '動画の再生位置を戻せませんでした。',
                error
            );
        }

    }

    if (sound) {

        sound.onerror = null;

        sound.pause();

        try {
            sound.currentTime = 0;
        } catch (error) {
            console.warn(
                '音声の再生位置を戻せませんでした。',
                error
            );
        }

    }

    const complete = () => {

        effect?.classList.add('hidden');

        effect?.classList.remove(
            'is-opening',
            'is-closing'
        );

        document.body.style.overflow = '';

        const callback =
            successEffectCallback;

        const resolve =
            successEffectResolve;

        successEffectCallback = null;
        successEffectResolve = null;

        if (typeof callback === 'function') {

            try {
                callback();
            } catch (error) {
                console.error(
                    '成功演出終了後の処理でエラーが発生しました。',
                    error
                );
            }

        }

        if (typeof resolve === 'function') {
            resolve();
        }
    };

    if (!effect) {
        complete();
        return;
    }

    effect.classList.remove('is-opening');
    effect.classList.add('is-closing');

    window.setTimeout(
        complete,
        250
    );
}


/**
 * 各セクション成功時に使う。
 */
function playSectionSuccess({
    message = '正解です！',
    subMessage = '次の段階へ進みましょう。',
    onComplete = null,
} = {}) {

    return playSuccessEffect({
        message,
        subMessage,
        videoSrc:
            'videos/owl-success.mp4',
        soundSrc:
            'audio/success.mp3',
        fallbackDuration: 6000,
        showSkipButton: true,
        videoMuted: true,
        onComplete,
    });
}


/**
 * シナリオ全体クリア時に使う。
 */
function playScenarioClear({
    message = 'シナリオクリア！',
    subMessage = '最後までよくできました！',
    onComplete = null,
} = {}) {

    return playSuccessEffect({
        message,
        subMessage,
        videoSrc:
            'videos/owl-clear.mp4',
        soundSrc:
            'audio/success.mp3',
        fallbackDuration: 10000,
        showSkipButton: true,
        videoMuted: true,
        onComplete,
    });
}


/**
 * 成功演出が再生中か確認する。
 */
function isSuccessEffectPlaying() {
    return successEffectPlaying;
}


/**
 * ページを離れるときに停止する。
 */
window.addEventListener('pagehide', () => {

    if (successEffectPlaying) {
        finishSuccessEffect();
    }

});


/**
 * ページ読み込み時に成功演出要素を生成する。
 */
document.addEventListener(
    'DOMContentLoaded',
    () => {
        ensureSuccessEffectElements();
    }
);