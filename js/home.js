/* ===========================
   iPhone Home Screen — home.js
   =========================== */

'use strict';

/* ---------- 時刻・日付ユーティリティ ---------- */

function zeroPad(n) {
  return String(n).padStart(2, '0');
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

const DAYS_SHORT = ['日', '月', '火', '水', '木', '金', '土'];

/* ---------- ステータスバー時計 ---------- */

function updateStatusTime() {
  const el = document.getElementById('statusTime');

  if (!el) {
    return;
  }

  const now = new Date();
  el.textContent = `${now.getHours()}:${zeroPad(now.getMinutes())}`;
}

/* ---------- カレンダーウィジェット ---------- */

function updateCalendarWidget() {
  const now = new Date();
  const dayEl = document.getElementById('calDayName');
  const dateEl = document.getElementById('calDate');

  if (dayEl) {
    dayEl.textContent = DAYS_JA[now.getDay()];
  }

  if (dateEl) {
    dateEl.textContent = now.getDate();
  }
}

/* ---------- カレンダーアプリアイコン内ミニカレンダー ---------- */

function buildMiniCalendar() {
  const grid = document.getElementById('calAppGrid');

  if (!grid) {
    return;
  }

  grid.innerHTML = '';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  DAYS_SHORT.forEach((day, index) => {
    const cell = document.createElement('div');

    cell.className =
      'cal-cell' +
      (index === 0 ? ' sun' : index === 6 ? ' sat' : '');

    cell.textContent = day;
    grid.appendChild(cell);
  });

  for (let i = 0; i < firstDay; i += 1) {
    const blank = document.createElement('div');
    blank.className = 'cal-cell';
    grid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cell = document.createElement('div');
    const dayOfWeek = (firstDay + day - 1) % 7;

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

/* ---------- アナログ時計 Canvas ---------- */

function drawClock() {
  const canvas = document.getElementById('clockCanvas');

  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return;
  }

  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;

  const now = new Date();
  const second = now.getSeconds();
  const minute = now.getMinutes();
  const hour = now.getHours() % 12;

  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1c1e';
  ctx.fill();

  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * (radius - 3);
    const y1 = cy + Math.sin(angle) * (radius - 3);
    const x2 = cx + Math.cos(angle) * (radius - 7);
    const y2 = cy + Math.sin(angle) * (radius - 7);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const hourAngle =
    ((hour + minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;

  drawHand(ctx, cx, cy, hourAngle, radius * 0.52, 3, '#fff');

  const minuteAngle =
    ((minute + second / 60) / 60) * Math.PI * 2 - Math.PI / 2;

  drawHand(ctx, cx, cy, minuteAngle, radius * 0.72, 2, '#fff');

  const secondAngle =
    (second / 60) * Math.PI * 2 - Math.PI / 2;

  drawHand(ctx, cx, cy, secondAngle, radius * 0.78, 1, '#f03');

  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function drawHand(ctx, cx, cy, angle, length, width, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(angle) * length,
    cy + Math.sin(angle) * length
  );
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/* ---------- タップリップル ---------- */

function initRipple() {
  const ripple = document.getElementById('tapRipple');

  if (!ripple) {
    return;
  }

  document.addEventListener(
    'touchstart',
    (event) => {
      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      const size = 80;

      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${touch.clientX - size / 2}px`;
      ripple.style.top = `${touch.clientY - size / 2}px`;
      ripple.style.transition = 'none';
      ripple.style.transform = 'scale(0)';
      ripple.style.opacity = '0.4';

      requestAnimationFrame(() => {
        ripple.style.transition =
          'transform 0.5s ease-out, opacity 0.5s ease-out';
        ripple.style.transform = 'scale(3)';
        ripple.style.opacity = '0';
      });
    },
    { passive: true }
  );
}

/* ---------- アイコン長押し（揺れ） ---------- */

let jigglingTimer = null;
let isJiggling = false;

function startJiggle() {
  isJiggling = true;

  document.querySelectorAll('.app-icon, .dock-icon').forEach((element) => {
    element.classList.add('jiggle');
  });
}

function stopJiggle() {
  isJiggling = false;

  document.querySelectorAll('.jiggle').forEach((element) => {
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

      jigglingTimer = setTimeout(startJiggle, 600);
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    () => {
      clearTimeout(jigglingTimer);
    },
    { passive: true }
  );
}

function injectJiggleStyle() {
  if (document.getElementById('jiggleStyle')) {
    return;
  }

  const jiggleStyle = document.createElement('style');
  jiggleStyle.id = 'jiggleStyle';

  jiggleStyle.textContent = `
    @keyframes jiggle {
      0%, 100% { transform: rotate(-1.5deg); }
      50% { transform: rotate(1.5deg); }
    }

    .jiggle {
      animation: jiggle 0.18s ease-in-out infinite;
    }
  `;

  document.head.appendChild(jiggleStyle);
}


/* ---------- 電話アイコン ---------- */

async function openPhoneFromHome() {
  await saveActionLog({
    scenarioId: 1,
    sectionId: 1,
    action: 'ホーム画面の電話アイコンを押した',
    isCorrect: true,
  });

  location.href = 'question.html#question2';
}

/* ---------- DBログ ---------- */

async function recordHomeAction(actionName, isCorrect = true) {
  await saveActionLog({
    scenarioId: 1,
    sectionId: 1,
    action: actionName,
    isCorrect,
  });
}

/* ---------- メインループ ---------- */

function tick() {
  updateStatusTime();
  drawClock();
}

/* ---------- 初期化 ---------- */

document.addEventListener('DOMContentLoaded', () => {
  updateCalendarWidget();
  buildMiniCalendar();
  injectJiggleStyle();
  initRipple();
  initJiggle();
  tick();

  setInterval(tick, 1000);

  document.querySelectorAll('.app-icon, .dock-icon').forEach((icon) => {
    const appName =
      icon.dataset.name ||
      icon.getAttribute('aria-label') ||
      icon.textContent.trim() ||
      '不明なアプリ';

    // 電話アイコンはHTMLのopenPhoneFromHome()で処理する
    if (appName.includes('電話')) {
      return;
    }

    icon.addEventListener('click', () => {
      recordHomeAction(
        `${appName}アイコンを押した`,
        false
      );
    });
  });
});
