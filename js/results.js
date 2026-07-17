// ==============================
// となりのデジジ
// 結果画面・本人コメント
// ==============================

'use strict';

let currentPlaySessionId = null;


function resultElement(id) {
  return document.getElementById(id);
}


function setResultText(id, value) {
  const element = resultElement(id);

  if (element) {
    element.textContent = value;
  }
}


function showResult(result) {
  if (!result || !result.current) {
    setResultText(
      'resultMessage',
      '表示できるプレイ結果がありません。'
    );

    resultElement('userCommentForm')
      ?.classList.add('hidden');

    return;
  }

  const current = result.current;
  const previous = result.previous;
  const best = result.best;
  const comparison = result.comparison;

  currentPlaySessionId = current.id;

  setResultText(
    'currentCorrect',
    current.correct_count
  );

  setResultText(
    'currentIncorrect',
    current.incorrect_count
  );

  setResultText(
    'currentAccuracy',
    `${current.accuracy}%`
  );

  setResultText(
    'currentScore',
    current.score
  );

  setResultText(
    'previousCorrect',
    previous ? previous.correct_count : '-'
  );

  setResultText(
    'previousIncorrect',
    previous ? previous.incorrect_count : '-'
  );

  setResultText(
    'previousAccuracy',
    previous ? `${previous.accuracy}%` : '-'
  );

  setResultText(
    'previousScore',
    previous ? previous.score : '-'
  );

  setResultText(
    'bestCorrect',
    best ? best.correct_count : '-'
  );

  setResultText(
    'bestIncorrect',
    best ? best.incorrect_count : '-'
  );

  setResultText(
    'bestAccuracy',
    best ? `${best.accuracy}%` : '-'
  );

  setResultText(
    'bestScore',
    best ? best.score : '-'
  );

  let message = '初めての記録です！';

  if (result.is_new_best && previous) {
    message = 'ベスト記録を更新しました！';

  } else if (comparison) {

    if (comparison.score_difference > 0) {
      message =
        `前回より${comparison.score_difference}点アップしました！`;

    } else if (
      comparison.score_difference < 0
    ) {
      message =
        `前回より${Math.abs(
          comparison.score_difference
        )}点下がりました。`;

    } else {
      message = '前回と同じスコアでした！';
    }
  }

  setResultText(
    'resultMessage',
    message
  );
}


function commentIcon(authorType) {
  const icons = {
    ai: '🦉',
    user: '👵',
    family: '👨‍👩‍👧',
  };

  return icons[authorType] || '💬';
}


function commentTypeLabel(authorType) {
  const labels = {
    ai: 'デジジから',
    user: '本人から',
    family: '家族から',
  };

  return labels[authorType] || 'コメント';
}


function formatCommentDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'ja-JP',
    {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(date);
}


function renderComments(comments) {
  const list = resultElement('commentList');

  if (!list) {
    return;
  }

  list.innerHTML = '';

  if (!comments || comments.length === 0) {
    list.innerHTML =
      '<p class="comment-empty">まだコメントはありません。</p>';

    return;
  }

  comments.forEach((comment) => {
    const card = document.createElement('article');

    card.className =
      `comment-card comment-${comment.author_type}`;

    const header = document.createElement('div');
    header.className = 'comment-header';

    const author = document.createElement('strong');
    author.textContent =
      `${commentIcon(comment.author_type)} `
      + `${comment.author_name || commentTypeLabel(comment.author_type)}`;

    const date = document.createElement('time');
    date.textContent =
      formatCommentDate(comment.created_at);

    const body = document.createElement('p');
    body.textContent = comment.content;

    header.append(author, date);
    card.append(header, body);
    list.appendChild(card);
  });
}


async function loadComments() {
  if (
    currentPlaySessionId === null
    || typeof getPlaySessionComments
      !== 'function'
  ) {
    return;
  }

  try {
    const comments =
      await getPlaySessionComments(
        currentPlaySessionId
      );

    renderComments(comments);

  } catch (error) {
    console.error(
      'コメント取得エラー:',
      error
    );

    const list = resultElement('commentList');

    if (list) {
      list.innerHTML =
        '<p class="comment-empty">コメントを読み込めませんでした。</p>';
    }
  }
}


function showCommentMessage(
  message,
  success = false
) {
  const element =
    resultElement('commentMessage');

  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.remove('hidden');
  element.classList.toggle(
    'success',
    success
  );
}


function hideCommentMessage() {
  const element =
    resultElement('commentMessage');

  if (!element) {
    return;
  }

  element.textContent = '';
  element.classList.add('hidden');
  element.classList.remove('success');
}


function setCommentLoading(loading) {
  const button =
    resultElement('commentSubmitButton');

  if (!button) {
    return;
  }

  button.disabled = loading;

  button.textContent = loading
    ? '保存しています…'
    : '感想を保存する';
}


async function submitUserComment(event) {
  event.preventDefault();
  hideCommentMessage();

  if (currentPlaySessionId === null) {
    showCommentMessage(
      'コメント対象の結果がありません。'
    );

    return;
  }

  const textarea =
    resultElement('userComment');

  const content =
    textarea?.value.trim() || '';

  if (!content) {
    showCommentMessage(
      '感想を入力してください。'
    );

    return;
  }

  try {
    setCommentLoading(true);

    await postPlaySessionComment({
      playSessionId:
        currentPlaySessionId,
      authorType: 'user',
      content,
    });

    if (textarea) {
      textarea.value = '';
    }

    showCommentMessage(
      '感想を保存しました。',
      true
    );

    await loadComments();

  } catch (error) {
    console.error(
      'コメント保存エラー:',
      error
    );

    showCommentMessage(
      error.message
      || '感想を保存できませんでした。'
    );

  } finally {
    setCommentLoading(false);
  }
}


async function showRegisterRecommendation() {
  if (
    typeof getCurrentUser !== 'function'
  ) {
    return;
  }

  const user = await getCurrentUser();

  if (user?.is_guest) {
    resultElement('registerRecommend')
      ?.classList.remove('hidden');
  }
}


document.addEventListener(
  'DOMContentLoaded',
  async () => {
    const result = getLastResult();

    showResult(result);

    resultElement('userCommentForm')
      ?.addEventListener(
        'submit',
        submitUserComment
      );

    await Promise.all([
      loadComments(),
      showRegisterRecommendation(),
    ]);
  }
);
