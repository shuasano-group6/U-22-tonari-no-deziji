/* ===========================
   iPhone Home Screen — script.js
   =========================== */

'use strict';

/* ---------- 時刻・日付ユーティリティ ---------- */

function zeroPad(n) {
  return String(n).padStart(2, '0');
}

const DAYS_JA  = ['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日'];
const DAYS_SHORT = ['日','月','火','水','木','金','土'];

/* ---------- ステータスバー時計 ---------- */

function updateStatusTime() {
  const el = document.getElementById('statusTime');
  if (!el) return;
  const now = new Date();
  el.textContent = `${now.getHours()}:${zeroPad(now.getMinutes())}`;
}

/* ---------- カレンダーウィジェット ---------- */

function updateCalendarWidget() {
  const now = new Date();
  const dayEl   = document.getElementById('calDayName');
  const dateEl  = document.getElementById('calDate');
  if (dayEl)  dayEl.textContent  = DAYS_JA[now.getDay()];
  if (dateEl) dateEl.textContent = now.getDate();
}

/* ---------- カレンダーアプリアイコン内ミニカレンダー ---------- */

function buildMiniCalendar() {
  const grid = document.getElementById('calAppGrid');
  if (!grid) return;

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const firstDay = new Date(year, month, 1).getDay(); // 0=日
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 曜日ヘッダ
  DAYS_SHORT.forEach((d, i) => {
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '');
    cell.textContent = d;
    grid.appendChild(cell);
  });

  // 空白セル
  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-cell';
    grid.appendChild(blank);
  }

  // 日付セル
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    const dayOfWeek = (firstDay + d - 1) % 7;
    let cls = 'cal-cell';
    if (dayOfWeek === 0) cls += ' sun';
    if (dayOfWeek === 6) cls += ' sat';
    if (d === today)    cls += ' today';
    cell.className = cls;
    cell.textContent = d;
    grid.appendChild(cell);
  }
}

/* ---------- アナログ時計 Canvas ---------- */

function drawClock() {
  const canvas = document.getElementById('clockCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 2;

  const now = new Date();
  const sec = now.getSeconds();
  const min = now.getMinutes();
  const hr  = now.getHours() % 12;

  ctx.clearRect(0, 0, size, size);

  // 文字盤
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1c1e';
  ctx.fill();

  // 目盛り
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * (r - 3);
    const y1 = cy + Math.sin(angle) * (r - 3);
    const x2 = cx + Math.cos(angle) * (r - 7);
    const y2 = cy + Math.sin(angle) * (r - 7);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 時針
  const hrAngle = ((hr + min / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  drawHand(ctx, cx, cy, hrAngle, r * 0.52, 3, '#fff');

  // 分針
  const minAngle = ((min + sec / 60) / 60) * Math.PI * 2 - Math.PI / 2;
  drawHand(ctx, cx, cy, minAngle, r * 0.72, 2, '#fff');

  // 秒針
  const secAngle = (sec / 60) * Math.PI * 2 - Math.PI / 2;
  drawHand(ctx, cx, cy, secAngle, r * 0.78, 1, '#f03');

  // 中心点
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function drawHand(ctx, cx, cy, angle, length, width, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/* ---------- タップリップル ---------- */

function initRipple() {
  const ripple = document.getElementById('tapRipple');
  document.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const size  = 80;
    ripple.style.width  = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left   = (touch.clientX - size / 2) + 'px';
    ripple.style.top    = (touch.clientY - size / 2) + 'px';
    ripple.style.transition = 'none';
    ripple.style.transform  = 'scale(0)';
    ripple.style.opacity    = '0.4';

    requestAnimationFrame(() => {
      ripple.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
      ripple.style.transform  = 'scale(3)';
      ripple.style.opacity    = '0';
    });
  }, { passive: true });
}

/* ---------- アイコン長押し（揺れ）----------  */

let jigglingTimer = null;
let isJiggling    = false;

function startJiggle() {
  isJiggling = true;
  document.querySelectorAll('.app-icon, .dock-icon').forEach(el => {
    el.classList.add('jiggle');
  });
}

function stopJiggle() {
  isJiggling = false;
  document.querySelectorAll('.jiggle').forEach(el => el.classList.remove('jiggle'));
}

function initJiggle() {
  document.addEventListener('touchstart', (e) => {
    if (isJiggling) { stopJiggle(); return; }
    jigglingTimer = setTimeout(() => startJiggle(), 600);
  }, { passive: true });

  document.addEventListener('touchend', () => {
    clearTimeout(jigglingTimer);
  }, { passive: true });
}

// ジグルアニメーション CSS を動的に注入
const jiggleStyle = document.createElement('style');
jiggleStyle.textContent = `
  @keyframes jiggle {
    0%,100% { transform: rotate(-1.5deg); }
    50%      { transform: rotate(1.5deg); }
  }
  .jiggle {
    animation: jiggle 0.18s ease-in-out infinite;
  }
`;
document.head.appendChild(jiggleStyle);

/* ---------- 背景画像フォールバック ---------- */
// bg.jpg が無い場合は CSS の background-color で代替済み
// 必要なら動的に別画像を設定する例:
// document.body.style.backgroundImage = "url('your-image.jpg')";

/* ---------- メインループ ---------- */

function tick() {
  updateStatusTime();
  drawClock();
}

/* ---------- 初期化 ---------- */

document.addEventListener('DOMContentLoaded', () => {
  updateCalendarWidget();
  buildMiniCalendar();
  initRipple();
  initJiggle();
  tick();
  setInterval(tick, 1000);
});
