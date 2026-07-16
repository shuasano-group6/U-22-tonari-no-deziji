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
        return;
    }

    status.textContent =
        `${user.display_name || 'ユーザー'}さんとして登録済みです。`;

    el('displayName').value = user.display_name || '';
    el('birthDate').value = user.birth_date || '';
    el('loginId').value = user.login_id || '';
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

document.addEventListener('DOMContentLoaded', () => {
    el('registerForm').addEventListener('submit', register);
    displayCurrentUser();
});
