'use strict';

function el(id) {
    return document.getElementById(id);
}

function showMessage(message, success = false) {
    const box = el('formMessage');
    box.textContent = message;
    box.classList.remove('hidden');
    box.classList.toggle('success', success);
}

function hideMessage() {
    const box = el('formMessage');
    box.textContent = '';
    box.classList.add('hidden');
    box.classList.remove('success');
}

function setLoading(loading) {
    const button = el('registerButton');
    button.disabled = loading;
    button.textContent =
        loading ? '登録しています…' : '🌱 ユーザー登録する';
}

function showGuestRegistrationState() {
    el('registrationBenefits')
        ?.classList.remove('hidden');

    el('registerCard')
        ?.classList.remove('hidden');

    el('registrationCompleteCard')
        ?.classList.add('hidden');
}


function showRegisteredState() {
    el('registrationBenefits')
        ?.classList.add('hidden');

    el('registerCard')
        ?.classList.remove('hidden');
}


async function displayCurrentUser() {
    const user = await getCurrentUser();
    const status = el('userStatus');

    if (!user) {
        status.textContent =
            'ユーザー情報を取得できませんでした。';
        return;
    }

    if (user.is_guest) {
        status.textContent =
            '現在はゲストです。登録すると、記録保存と家族連携が使えるようになります。';

        showGuestRegistrationState();
        await displayFamilyCode(user);
        await displayRecoveryCode(user);
        return;
    }

    status.textContent =
        `${user.display_name || 'ユーザー'}さんとして登録済みです。練習記録と家族連携を利用できます。`;

    showRegisteredState();

    el('displayName').value = user.display_name || '';
    el('birthDate').value = user.birth_date || '';

    await displayFamilyCode(user);
    await displayRecoveryCode(user);
}

function readForm() {
    const displayName =
        el('displayName').value.trim();

    const birthDate =
        el('birthDate').value;

    if (!displayName) {
        throw new Error(
            'お名前を入力してください。'
        );
    }

    if (displayName.length > 50) {
        throw new Error(
            'お名前は50文字以内で入力してください。'
        );
    }

    return {
        displayName,
        birthDate,
    };
}

async function register(event) {
    event.preventDefault();
    hideMessage();

    try {
        const data = readForm();
        setLoading(true);

        const result = await registerCurrentUser(data);

        showMessage(
            result.message || 'ユーザー登録が完了しました。',
            true
        );

        el('registrationCompleteCard')
            ?.classList.remove('hidden');

        el('registrationBenefits')
            ?.classList.add('hidden');


        await displayCurrentUser();

        el('registrationCompleteCard')?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    } catch (error) {
        console.error(error);
        showMessage(
            error.message || 'ユーザー登録に失敗しました。'
        );
    } finally {
        setLoading(false);
    }
}


async function displayFamilyCode(user) {
    const card = el('familyCodeCard');

    if (!card) {
        return;
    }

    if (!user || user.is_guest) {
        card.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');

    try {
        const data =
            await getCurrentUserFamilyCode();

        el('familyCodeValue').textContent =
            data.family_code;

    } catch (error) {
        console.error(
            '家族コード取得エラー:',
            error
        );

        el('familyCodeValue').textContent =
            '取得できません';
    }
}

function showFamilyCodeMessage(
    message,
    success = false
) {
    const box = el('familyCodeMessage');

    if (!box) {
        return;
    }

    box.textContent = message;
    box.classList.remove('hidden');
    box.classList.toggle(
        'success',
        success
    );
}

async function copyFamilyCode() {
    const code =
        el('familyCodeValue')?.textContent.trim();

    if (!code || code.includes('取得')) {
        showFamilyCodeMessage(
            'コピーできるコードがありません。'
        );
        return;
    }

    try {
        await navigator.clipboard.writeText(code);

        showFamilyCodeMessage(
            '家族コードをコピーしました。',
            true
        );

    } catch (error) {
        console.warn(
            'クリップボードへのコピーに失敗:',
            error
        );

        showFamilyCodeMessage(
            `家族コードは「${code}」です。`,
            true
        );
    }
}

async function regenerateFamilyCode() {
    const confirmed = window.confirm(
        '家族コードを再発行しますか？\n'
        + '以前のコードは使えなくなります。'
    );

    if (!confirmed) {
        return;
    }

    try {
        const button =
            el('regenerateFamilyCodeButton');

        button.disabled = true;
        button.textContent =
            '再発行しています…';

        const data =
            await issueCurrentUserFamilyCode(true);

        el('familyCodeValue').textContent =
            data.family_code;

        showFamilyCodeMessage(
            '新しい家族コードを発行しました。',
            true
        );

    } catch (error) {
        console.error(
            '家族コード再発行エラー:',
            error
        );

        showFamilyCodeMessage(
            error.message
            || '家族コードを再発行できませんでした。'
        );

    } finally {
        const button =
            el('regenerateFamilyCodeButton');

        button.disabled = false;
        button.textContent =
            'コードを再発行';
    }
}


async function displayRecoveryCode(user) {
    const card = el('recoveryCodeCard');

    if (!card) {
        return;
    }

    if (!user || user.is_guest) {
        card.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');

    try {
        const data =
            await getCurrentUserRecoveryCode();

        el('recoveryCodeValue').textContent =
            data.recovery_code;

    } catch (error) {
        console.error(
            '復元コード取得エラー:',
            error
        );

        el('recoveryCodeValue').textContent =
            '取得できません';
    }
}


function showRecoveryCodeMessage(
    message,
    success = false
) {
    const box = el('recoveryCodeMessage');

    if (!box) {
        return;
    }

    box.textContent = message;
    box.classList.remove('hidden');
    box.classList.toggle(
        'success',
        success
    );
}


async function copyRecoveryCode() {
    const code =
        el('recoveryCodeValue')
        ?.textContent.trim();

    if (!code || code.includes('取得')) {
        showRecoveryCodeMessage(
            'コピーできる復元コードがありません。'
        );
        return;
    }

    try {
        await navigator.clipboard.writeText(code);

        showRecoveryCodeMessage(
            '復元コードをコピーしました。',
            true
        );

    } catch (error) {
        console.warn(
            '復元コードのコピーに失敗:',
            error
        );

        showRecoveryCodeMessage(
            `復元コードは「${code}」です。`,
            true
        );
    }
}


async function regenerateRecoveryCode() {
    const confirmed = window.confirm(
        '復元コードを再発行しますか？\n'
        + '以前の復元コードは使えなくなります。'
    );

    if (!confirmed) {
        return;
    }

    const button =
        el('regenerateRecoveryCodeButton');

    try {
        button.disabled = true;
        button.textContent =
            '再発行しています…';

        const data =
            await issueCurrentUserRecoveryCode(
                true
            );

        el('recoveryCodeValue').textContent =
            data.recovery_code;

        showRecoveryCodeMessage(
            '新しい復元コードを発行しました。',
            true
        );

    } catch (error) {
        console.error(
            '復元コード再発行エラー:',
            error
        );

        showRecoveryCodeMessage(
            error.message
            || '復元コードを再発行できませんでした。'
        );

    } finally {
        button.disabled = false;
        button.textContent =
            '復元コードを再発行';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    el('registerForm').addEventListener('submit', register);

    el('copyFamilyCodeButton')?.addEventListener(
        'click',
        copyFamilyCode
    );

    el('regenerateFamilyCodeButton')?.addEventListener(
        'click',
        regenerateFamilyCode
    );

    el('copyRecoveryCodeButton')?.addEventListener(
        'click',
        copyRecoveryCode
    );

    el('regenerateRecoveryCodeButton')?.addEventListener(
        'click',
        regenerateRecoveryCode
    );

    displayCurrentUser();
});
