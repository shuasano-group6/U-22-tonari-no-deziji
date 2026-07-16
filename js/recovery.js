// ==============================
// となりのデジジ
// 復元コード入力
// ==============================

'use strict';


function recoveryElement(id) {
    return document.getElementById(id);
}


function normalizeRecoveryCode(value) {
    return String(value)
        .trim()
        .replace(/[-\s]/g, '')
        .toUpperCase();
}


function showRecoveryMessage(message) {
    const box =
        recoveryElement('recoveryMessage');

    box.textContent = message;
    box.classList.remove('hidden');
}


function hideRecoveryMessage() {
    const box =
        recoveryElement('recoveryMessage');

    box.textContent = '';
    box.classList.add('hidden');
}


function setRecoveryLoading(loading) {
    const button =
        recoveryElement('recoveryButton');

    button.disabled = loading;

    button.textContent = loading
        ? '復元しています…'
        : 'この端末に記録を戻す';
}


async function handleRecovery(event) {
    event.preventDefault();
    hideRecoveryMessage();

    const rawCode =
        recoveryElement(
            'recoveryCodeInput'
        ).value;

    const code =
        normalizeRecoveryCode(rawCode);

    if (code.length !== 10) {
        showRecoveryMessage(
            '復元コードは10文字で入力してください。'
        );
        return;
    }

    try {
        setRecoveryLoading(true);

        const result =
            await recoverUserByCode(code);

        const name =
            result.user?.display_name
            || '利用者';

        recoveryElement('recoveryForm')
            ?.classList.add('hidden');

        recoveryElement('recoveryComplete')
            ?.classList.remove('hidden');

        recoveryElement(
            'recoveredUserName'
        ).textContent =
            `${name}さんの記録をこの端末に戻しました。`;

    } catch (error) {
        console.error(
            '記録復元エラー:',
            error
        );

        showRecoveryMessage(
            error.message
            || '記録を復元できませんでした。'
        );

    } finally {
        setRecoveryLoading(false);
    }
}


document.addEventListener(
    'DOMContentLoaded',
    () => {
        recoveryElement('recoveryForm')
            ?.addEventListener(
                'submit',
                handleRecovery
            );
    }
);
