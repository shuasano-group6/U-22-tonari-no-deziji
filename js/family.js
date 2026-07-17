// ==============================
// となりのデジジ
// 家族コード・見守りノート
// ==============================

'use strict';

let currentFamilyReport = null;
let latestPlaySessionId = null;


function familyElement(id) {
    return document.getElementById(id);
}


function setFamilyText(id, value) {
    const element = familyElement(id);

    if (element) {
        element.textContent = value;
    }
}


function normalizeCode(value) {
    return String(value)
        .trim()
        .replace(/[-\s]/g, '')
        .toUpperCase();
}


function showLoginMessage(message) {
    const box = familyElement(
        'familyLoginMessage'
    );

    box.textContent = message;
    box.classList.remove('hidden');
}


function hideLoginMessage() {
    const box = familyElement(
        'familyLoginMessage'
    );

    box.textContent = '';
    box.classList.add('hidden');
}


function formatFamilyDate(value) {
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


function authorIcon(authorType) {
    return {
        ai: '🦉',
        user: '👵',
        family: '👨‍👩‍👧',
    }[authorType] || '💬';
}


function showLoginArea() {
    familyElement('familyLoginArea')
        ?.classList.remove('hidden');

    familyElement('loadingArea')
        ?.classList.add('hidden');

    familyElement('familyContent')
        ?.classList.add('hidden');

    setFamilyText(
        'familyGreeting',
        '家族コードを入力してください。'
    );
}


function showLoadingArea() {
    familyElement('familyLoginArea')
        ?.classList.add('hidden');

    familyElement('loadingArea')
        ?.classList.remove('hidden');

    familyElement('familyContent')
        ?.classList.add('hidden');
}


function showContentArea() {
    familyElement('familyLoginArea')
        ?.classList.add('hidden');

    familyElement('loadingArea')
        ?.classList.add('hidden');

    familyElement('familyContent')
        ?.classList.remove('hidden');
}


function renderWeek(week) {
    const count =
        week?.completed_count || 0;

    setFamilyText(
        'weekCount',
        `${count}回`
    );

    if (count === 0) {
        setFamilyText(
            'weekDetail',
            '今週はまだ完了した練習がありません'
        );
        return;
    }

    const counts =
        week.scenario_counts || {};

    const parts = [];

    if (Number(counts['1']) > 0) {
        parts.push(`電話 ${counts['1']}回`);
    }

    if (Number(counts['2']) > 0) {
        parts.push(`LINE ${counts['2']}回`);
    }

    if (Number(counts['3']) > 0) {
        parts.push(`写真 ${counts['3']}回`);
    }

    setFamilyText(
        'weekDetail',
        parts.join('・')
        || '練習を続けています'
    );
}


function renderGrowth(growth) {
    const latest =
        growth?.latest_phone_score;

    const previous =
        growth?.previous_phone_score;

    const difference =
        growth?.score_difference;

    if (latest === null || latest === undefined) {
        setFamilyText('growthValue', '-');

        setFamilyText(
            'growthDetail',
            '電話をクリアすると上達が表示されます'
        );
        return;
    }

    if (previous === null || previous === undefined) {
        setFamilyText(
            'growthValue',
            `${latest}点`
        );

        setFamilyText(
            'growthDetail',
            '初めての電話記録です'
        );
        return;
    }

    if (difference > 0) {
        setFamilyText(
            'growthValue',
            `＋${difference}点 🎉`
        );
    } else if (difference < 0) {
        setFamilyText(
            'growthValue',
            `${difference}点`
        );
    } else {
        setFamilyText(
            'growthValue',
            '前回と同じ'
        );
    }

    setFamilyText(
        'growthDetail',
        `前回 ${previous}点 → 今回 ${latest}点`
    );
}


function renderScenarios(scenarios) {
    const container =
        familyElement('scenarioSummary');

    container.innerHTML = '';

    scenarios.forEach((scenario) => {
        const card =
            document.createElement('article');

        card.className = 'scenario-card';

        card.innerHTML = `
            <h3></h3>
            <span class="scenario-score"></span>
            <p class="scenario-attempts"></p>
            <p class="scenario-accuracy"></p>
            <p class="scenario-best"></p>
        `;

        card.querySelector('h3').textContent =
            scenario.scenario_name;

        card.querySelector(
            '.scenario-score'
        ).textContent =
            scenario.latest_score === null
                ? '-'
                : `${scenario.latest_score}点`;

        card.querySelector(
            '.scenario-attempts'
        ).textContent =
            `挑戦 ${scenario.attempts}回`;

        card.querySelector(
            '.scenario-accuracy'
        ).textContent =
            `正解率 ${scenario.accuracy}%`;

        card.querySelector(
            '.scenario-best'
        ).textContent =
            scenario.attempts > 0
                ? `ベスト ${scenario.best_score}点`
                : 'まだ記録はありません';

        container.appendChild(card);
    });
}


function renderSkills(
    strongestSkill,
    weakestSkill
) {
    if (strongestSkill) {
        setFamilyText(
            'strongSkill',
            strongestSkill.section_name
        );

        setFamilyText(
            'strongSkillDetail',
            `正解率 ${strongestSkill.accuracy}%`
        );
    }

    if (weakestSkill) {
        setFamilyText(
            'weakSkill',
            weakestSkill.section_name
        );

        setFamilyText(
            'weakSkillDetail',
            `正解率 ${weakestSkill.accuracy}%・`
            + '一緒に練習してみましょう'
        );
    }
}


function renderAchievements(achievements) {
    const container =
        familyElement('achievementList');

    container.innerHTML = '';

    if (!achievements.length) {
        container.innerHTML = `
            <p class="empty-message">
                練習をクリアすると、
                できるようになったことが表示されます。
            </p>
        `;
        return;
    }

    achievements.forEach((achievement) => {
        const card =
            document.createElement('article');

        card.className = 'achievement-card';

        card.innerHTML = `
            <span class="achievement-icon"></span>
            <div>
                <strong></strong>
                <p></p>
            </div>
        `;

        card.querySelector(
            '.achievement-icon'
        ).textContent =
            achievement.icon;

        card.querySelector(
            'strong'
        ).textContent =
            achievement.title;

        card.querySelector(
            'p'
        ).textContent =
            achievement.description;

        container.appendChild(card);
    });
}


function renderTimeline(timeline) {
    const container =
        familyElement('timelineList');

    container.innerHTML = '';

    if (!timeline.length) {
        container.innerHTML = `
            <p class="empty-message">
                AI・本人・家族のコメントが
                ここに表示されます。
            </p>
        `;
        return;
    }

    timeline.forEach((item) => {
        const article =
            document.createElement('article');

        article.className =
            `timeline-item timeline-${item.author_type}`;

        const header =
            document.createElement('div');

        header.className = 'timeline-header';

        const author =
            document.createElement('strong');

        author.textContent =
            `${authorIcon(item.author_type)} `
            + `${item.author_name}`;

        const time =
            document.createElement('time');

        time.textContent =
            formatFamilyDate(item.created_at);

        const meta =
            document.createElement('p');

        meta.className = 'timeline-meta';

        meta.textContent =
            item.score === null
                ? item.scenario_name
                : `${item.scenario_name}・${item.score}点`;

        const content =
            document.createElement('p');

        content.textContent = item.content;

        header.append(author, time);

        article.append(
            header,
            meta,
            content
        );

        container.appendChild(article);
    });
}


function configureCommentTarget(report) {
    const timeline =
        report.recent_timeline || [];

    const latestItem = timeline.find(
        item => item.play_session_id
    );

    if (!latestItem) {
        familyElement('familyCommentPanel')
            ?.classList.add('hidden');

        latestPlaySessionId = null;
        return;
    }

    latestPlaySessionId =
        latestItem.play_session_id;

    setFamilyText(
        'commentTargetText',
        `${latestItem.scenario_name}・`
        + `${latestItem.score ?? '-'}点の結果に送ります。`
    );

    familyElement('familyCommentPanel')
        ?.classList.remove('hidden');
}


function renderFamilyReport(report) {
    currentFamilyReport = report;

    const name =
        report.user?.display_name
        || '利用者';

    setFamilyText(
        'familyGreeting',
        `${name}さんの最近の様子です。`
    );

    setFamilyText(
        'connectedUserName',
        `${name}さんと接続中`
    );

    renderWeek(report.week);
    renderGrowth(report.growth);

    renderScenarios(
        report.scenarios || []
    );

    renderSkills(
        report.strongest_skill,
        report.weakest_skill
    );

    renderAchievements(
        report.achievements || []
    );

    renderTimeline(
        report.recent_timeline || []
    );

    configureCommentTarget(report);

    setFamilyText(
        'familyMessage',
        report.family_message
        || '今日できたことを一緒に喜んでみましょう。'
    );
}


async function loadFamilyNote() {
    const code = getStoredFamilyCode();

    if (!code) {
        showLoginArea();
        return;
    }

    try {
        showLoadingArea();

        const report =
            await getFamilyReportByCode(code);

        renderFamilyReport(report);
        showContentArea();

    } catch (error) {
        console.error(
            '見守りノート取得エラー:',
            error
        );

        clearFamilyCode();
        showLoginArea();
        showLoginMessage(
            error.message
            || '家族コードを確認できませんでした。'
        );
    }
}


async function handleFamilyLogin(event) {
    event.preventDefault();
    hideLoginMessage();

    const input =
        familyElement('familyCodeInput');

    const code =
        normalizeCode(input.value);

    if (code.length !== 6) {
        showLoginMessage(
            '家族コードは6文字で入力してください。'
        );
        return;
    }

    const button =
        familyElement('familyLoginButton');

    try {
        button.disabled = true;
        button.textContent =
            '確認しています…';

        await verifyFamilyCode(code);
        await loadFamilyNote();

    } catch (error) {
        console.error(
            '家族コード確認エラー:',
            error
        );

        showLoginMessage(
            error.message
            || '家族コードを確認できませんでした。'
        );

    } finally {
        button.disabled = false;
        button.textContent =
            '見守りノートを見る';
    }
}


function disconnectFamily() {
    clearFamilyCode();

    familyElement('familyCodeInput').value =
        '';

    hideLoginMessage();
    showLoginArea();
}


function showCommentMessage(
    message,
    success = false
) {
    const box =
        familyElement('familyCommentMessage');

    box.textContent = message;
    box.classList.remove('hidden');
    box.classList.toggle(
        'success',
        success
    );
}


async function submitFamilyComment(event) {
    event.preventDefault();

    if (!latestPlaySessionId) {
        showCommentMessage(
            'コメント対象の結果がありません。'
        );
        return;
    }

    const authorName =
        familyElement(
            'familyAuthorName'
        ).value.trim();

    const content =
        familyElement(
            'familyCommentContent'
        ).value.trim();

    if (!authorName || !content) {
        showCommentMessage(
            'お名前・続柄とコメントを入力してください。'
        );
        return;
    }

    const button =
        familyElement('familyCommentButton');

    try {
        button.disabled = true;
        button.textContent =
            '送信しています…';

        await postFamilyComment({
            playSessionId:
                latestPlaySessionId,
            authorName,
            content,
        });

        familyElement(
            'familyCommentContent'
        ).value = '';

        showCommentMessage(
            '応援コメントを保存しました。',
            true
        );

        const report =
            await getFamilyReportByCode();

        renderFamilyReport(report);

    } catch (error) {
        console.error(
            '家族コメント保存エラー:',
            error
        );

        showCommentMessage(
            error.message
            || 'コメントを保存できませんでした。'
        );

    } finally {
        button.disabled = false;
        button.textContent =
            'コメントを送る';
    }
}


document.addEventListener(
    'DOMContentLoaded',
    () => {
        familyElement('familyLoginForm')
            ?.addEventListener(
                'submit',
                handleFamilyLogin
            );

        familyElement(
            'disconnectFamilyButton'
        )?.addEventListener(
            'click',
            disconnectFamily
        );

        familyElement(
            'familyCommentForm'
        )?.addEventListener(
            'submit',
            submitFamilyComment
        );

        loadFamilyNote();
    }
);
