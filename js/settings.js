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
        loading ? '登録しています…' : 'ユーザー登録する';
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
            '現在はゲストです。登録前の記録もそのまま引き継がれます。';
        await displayFamilyCode(user);
        return;
    }

    status.textContent =
        `${user.display_name || 'ユーザー'}さんとして登録済みです。`;

    el('displayName').value = user.display_name || '';
    el('birthDate').value = user.birth_date || '';
    el('loginId').value = user.login_id || '';

    await displayFamilyCode(user);
}

function readForm() {
    const displayName = el('displayName').value.trim();
    const birthDate = el('birthDate').value;
    const loginId = el('loginId').value.trim();
    const password = el('password').value;
    const passwordConfirm = el('passwordConfirm').value;

    if (!displayName) {
        throw new Error('お名前を入力してください。');
    }

    if (loginId.length < 4) {
        throw new Error(
            'ログインIDは4文字以上で入力してください。'
        );
    }

    if (password.length < 8) {
        throw new Error(
            'パスワードは8文字以上で入力してください。'
        );
    }

    if (password !== passwordConfirm) {
        throw new Error(
            '確認用パスワードが一致していません。'
        );
    }

    return {
        displayName,
        birthDate,
        loginId,
        password,
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

        el('password').value = '';
        el('passwordConfirm').value = '';

        await displayCurrentUser();
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

    displayCurrentUser();
});
