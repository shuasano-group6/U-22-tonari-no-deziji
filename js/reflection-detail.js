'use strict';

let reflectionData = null;


function detailElement(id) {
  return document.getElementById(id);
}


function getScenarioId() {
  const params =
    new URLSearchParams(location.search);

  const scenarioId =
    Number(params.get('scenario') || '1');

  return (
    Number.isInteger(scenarioId)
    && scenarioId > 0
  )
    ? scenarioId
    : 1;
}


function formatPlayedAt(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(
    'ja-JP',
    {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(date);
}


function setDetailText(id, value) {
  const element = detailElement(id);

  if (element) {
    element.textContent = value;
  }
}


function showEmptyState() {
  detailElement('emptyArea')
    ?.classList.remove('hidden');

  detailElement('summaryArea')
    ?.classList.add('hidden');

  detailElement('contentArea')
    ?.classList.add('hidden');
}


function showContentState() {
  detailElement('emptyArea')
    ?.classList.add('hidden');

  detailElement('summaryArea')
    ?.classList.remove('hidden');

  detailElement('contentArea')
    ?.classList.remove('hidden');
}


function renderSummary(summary) {
  setDetailText(
    'attemptCount',
    `${summary.attempts}回`
  );

  setDetailText(
    'averageScore',
    `${summary.average_score}点`
  );

  setDetailText(
    'bestScore',
    `${summary.best_score}点`
  );

  setDetailText(
    'averageAccuracy',
    `${summary.average_accuracy}%`
  );
}


function renderSections(sections) {
  const list = detailElement('sectionList');

  if (!list) {
    return;
  }

  list.innerHTML = '';

  const visibleSections =
    sections.filter(
      section => section.section_id !== 0
    );

  if (visibleSections.length === 0) {
    list.innerHTML =
      '<p>操作ごとの記録はまだありません。</p>';

    return;
  }

  visibleSections
    .sort(
      (a, b) => a.accuracy - b.accuracy
    )
    .forEach((section) => {
      const item =
        document.createElement('article');

      item.className = 'section-item';

      item.innerHTML = `
        <div class="section-top">
          <span class="section-name"></span>
          <span class="section-accuracy"></span>
        </div>

        <div
          class="progress"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="progress-value"></div>
        </div>

        <p class="section-counts"></p>
      `;

      item.querySelector(
        '.section-name'
      ).textContent =
        section.section_name;

      item.querySelector(
        '.section-accuracy'
      ).textContent =
        `${section.accuracy}%`;

      const progress =
        item.querySelector('.progress');

      progress.setAttribute(
        'aria-valuenow',
        String(section.accuracy)
      );

      progress.setAttribute(
        'aria-label',
        `${section.section_name}の正解率`
      );

      item.querySelector(
        '.progress-value'
      ).style.width =
        `${Math.max(
          0,
          Math.min(100, section.accuracy)
        )}%`;

      item.querySelector(
        '.section-counts'
      ).textContent =
        `正解 ${section.correct_count}回・`
        + `間違い ${section.incorrect_count}回`;

      list.appendChild(item);
    });
}


function commentIcon(authorType) {
  return {
    ai: '🦉',
    user: '👵',
    family: '👨‍👩‍👧',
  }[authorType] || '💬';
}


function createCommentElement(comment) {
  const article =
    document.createElement('article');

  article.className =
    `history-comment ${comment.author_type}`;

  const header =
    document.createElement('div');

  header.className =
    'history-comment-header';

  const author =
    document.createElement('strong');

  author.textContent =
    `${commentIcon(comment.author_type)} `
    + `${comment.author_name}`;

  const date =
    document.createElement('time');

  date.textContent =
    formatPlayedAt(comment.created_at);

  const content =
    document.createElement('p');

  content.textContent = comment.content;

  header.append(author, date);
  article.append(header, content);

  return article;
}


function createFamilyForm(record) {
  const form =
    document.createElement('form');

  form.className =
    'family-comment-form';

  form.innerHTML = `
    <h3>家族から応援コメント</h3>

    <label>
      お名前・続柄
      <input
        class="family-name"
        type="text"
        maxlength="30"
        placeholder="例：娘、孫の〇〇"
        required
      >
    </label>

    <label>
      コメント
      <textarea
        class="family-content"
        maxlength="300"
        placeholder="すごいね！ また一緒に練習しようね"
        required
      ></textarea>
    </label>

    <p class="family-form-message hidden"></p>

    <button
      type="submit"
      class="family-comment-button"
    >
      家族コメントを送る
    </button>
  `;

  form.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const name =
        form.querySelector(
          '.family-name'
        ).value.trim();

      const content =
        form.querySelector(
          '.family-content'
        ).value.trim();

      const message =
        form.querySelector(
          '.family-form-message'
        );

      const button =
        form.querySelector(
          '.family-comment-button'
        );

      message.classList.add('hidden');
      message.classList.remove('success');

      if (!name || !content) {
        message.textContent =
          'お名前とコメントを入力してください。';

        message.classList.remove('hidden');

        return;
      }

      try {
        button.disabled = true;
        button.textContent =
          '送信しています…';

        await postPlaySessionComment({
          playSessionId:
            record.play_session_id,
          authorType: 'family',
          authorName: name,
          content,
        });

        message.textContent =
          '家族コメントを保存しました。';

        message.classList.remove('hidden');
        message.classList.add('success');

        form.querySelector(
          '.family-content'
        ).value = '';

        await loadReflectionDetail();

      } catch (error) {
        console.error(
          '家族コメント保存エラー:',
          error
        );

        message.textContent =
          error.message
          || 'コメントを保存できませんでした。';

        message.classList.remove('hidden');

      } finally {
        button.disabled = false;
        button.textContent =
          '家族コメントを送る';
      }
    }
  );

  return form;
}


function renderHistory(history) {
  const list =
    detailElement('historyList');

  if (!list) {
    return;
  }

  list.innerHTML = '';

  [...history]
    .reverse()
    .forEach((record, index) => {
      const card =
        document.createElement('article');

      card.className = 'history-record';

      const summary =
        document.createElement('div');

      summary.className =
        'history-summary';

      summary.innerHTML = `
        <span></span>
        <span>スコア <strong></strong>点</span>
        <span>正解率 <strong></strong>%</span>
        <span>間違い <strong></strong>回</span>
      `;

      summary.children[0].textContent =
        `${history.length - index}回目　`
        + `${formatPlayedAt(record.played_at)}`;

      const strongs =
        summary.querySelectorAll('strong');

      strongs[0].textContent =
        record.score;

      strongs[1].textContent =
        record.accuracy;

      strongs[2].textContent =
        record.incorrect_count;

      const comments =
        document.createElement('div');

      comments.className =
        'history-comments';

      if (
        record.comments
        && record.comments.length > 0
      ) {
        record.comments.forEach(
          (comment) => {
            comments.appendChild(
              createCommentElement(comment)
            );
          }
        );

      } else {
        comments.innerHTML =
          '<p>この結果へのコメントはまだありません。</p>';
      }

      card.append(
        summary,
        comments,
        createFamilyForm(record)
      );

      list.appendChild(card);
    });
}


function drawScoreChart(history) {
  const canvas =
    detailElement('scoreChart');

  if (
    !canvas
    || history.length === 0
  ) {
    return;
  }

  const context =
    canvas.getContext('2d');

  const ratio =
    window.devicePixelRatio || 1;

  const cssWidth = 700;
  const cssHeight = 320;

  canvas.width =
    cssWidth * ratio;

  canvas.height =
    cssHeight * ratio;

  context.scale(ratio, ratio);

  const width = cssWidth;
  const height = cssHeight;

  const padding = {
    top: 28,
    right: 28,
    bottom: 52,
    left: 58,
  };

  const chartWidth =
    width
    - padding.left
    - padding.right;

  const chartHeight =
    height
    - padding.top
    - padding.bottom;

  context.clearRect(
    0,
    0,
    width,
    height
  );

  const maxScore =
    Math.max(
      100,
      ...history.map(
        record => record.score
      )
    );

  const axisMax =
    Math.ceil(maxScore / 100) * 100;

  context.font =
    '14px sans-serif';

  context.textAlign = 'right';
  context.textBaseline = 'middle';

  for (
    let score = 0;
    score <= axisMax;
    score += 100
  ) {
    const y =
      padding.top
      + chartHeight
      - (score / axisMax)
      * chartHeight;

    context.beginPath();
    context.moveTo(
      padding.left,
      y
    );

    context.lineTo(
      width - padding.right,
      y
    );

    context.strokeStyle =
      '#eadfce';

    context.lineWidth = 1;
    context.stroke();

    context.fillStyle =
      '#6f5e4f';

    context.fillText(
      String(score),
      padding.left - 10,
      y
    );
  }

  const maxPoints =
    Math.max(
      history.length - 1,
      1
    );

  const points =
    history.map(
      (record, index) => {
        const x =
          padding.left
          + (index / maxPoints)
          * chartWidth;

        const score =
          Math.max(
            0,
            Math.min(
              axisMax,
              record.score
            )
          );

        const y =
          padding.top
          + chartHeight
          - (score / axisMax)
          * chartHeight;

        return {
          x,
          y,
          label:
            `${index + 1}回目`,
        };
      }
    );

  context.beginPath();

  points.forEach(
    (point, index) => {
      if (index === 0) {
        context.moveTo(
          point.x,
          point.y
        );
      } else {
        context.lineTo(
          point.x,
          point.y
        );
      }
    }
  );

  context.strokeStyle =
    '#df9000';

  context.lineWidth = 4;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.stroke();

  points.forEach((point) => {
    context.beginPath();

    context.arc(
      point.x,
      point.y,
      6,
      0,
      Math.PI * 2
    );

    context.fillStyle =
      '#f6b52c';

    context.fill();

    context.fillStyle =
      '#6f5e4f';

    context.textAlign = 'center';
    context.textBaseline = 'top';

    context.fillText(
      point.label,
      point.x,
      height
      - padding.bottom
      + 16
    );
  });
}


async function loadReflectionDetail() {
  const scenarioId =
    getScenarioId();

  const userId =
    await initializeUser();

  if (userId === null) {
    setDetailText(
      'detailStatus',
      'ユーザー情報を準備できませんでした。'
    );

    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}`
      + `/scenarios/${scenarioId}/reflection`
    );

    const data =
      await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(
        data.detail
        || '記録を取得できませんでした'
      );
    }

    reflectionData = data;

    setDetailText(
      'scenarioTitle',
      `${data.scenario_name}のふりかえり`
    );

    if (
      !data.summary
      || data.summary.attempts === 0
    ) {
      setDetailText(
        'detailStatus',
        'まだ完了した記録がありません。'
      );

      showEmptyState();

      return;
    }

    setDetailText(
      'detailStatus',
      `最新スコアは`
      + `${data.summary.latest_score}点です。`
    );

    renderSummary(data.summary);

    renderSections(
      data.sections || []
    );

    renderHistory(
      data.history || []
    );

    showContentState();

    drawScoreChart(
      data.history || []
    );

  } catch (error) {
    console.error(
      '詳細ふりかえり取得エラー:',
      error
    );

    setDetailText(
      'detailStatus',
      error.message
      || '記録を読み込めませんでした。'
    );
  }
}


document.addEventListener(
  'DOMContentLoaded',
  loadReflectionDetail
);
