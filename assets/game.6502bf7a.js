
const A = {"f0": "assets/f0.8f52802e.webp", "f1": "assets/f1.c90e359a.webp", "f2": "assets/f2.63d9d845.webp", "f3": "assets/f3.ff0f0a86.webp", "f4": "assets/f4.554a56fb.webp", "f5": "assets/f5.8898136e.webp", "f6": "assets/f6.1172b9f9.webp", "f7": "assets/f7.05eec527.webp", "f8": "assets/f8.1dac6acb.webp", "f9": "assets/f9.0a7243f8.webp", "f10": "assets/f10.edca4535.webp", "bottom": "assets/bottom.e65040a8.png", "startBtn": "assets/start.015b92e7.webp", "redLine": "assets/redline.f35c5f41.png", "sun": "assets/sun.368df9ea.webp", "bubble": "assets/bubble.ca63ea24.webp", "ribbons": ["assets/ribbon0.4753e3da.png", "assets/ribbon1.9c85f2db.png", "assets/ribbon2.104fd038.png", "assets/ribbon3.65097b60.png", "assets/ribbon4.fe3d7fd6.png", "assets/ribbon5.3e99b008.png", "assets/ribbon6.329c59ad.png", "assets/ribbon7.74b03414.png"], "sDesk": "assets/desk.95ecdb45.mp3", "sJuice": "assets/juice.0fab96ac.mp3", "sBoom": "assets/boom.d8ef645c.mp3", "sCheer": "assets/cheer.09d3ea18.mp3"};

/* ============================================================
   ★ 可改区：以后替换图片、文字主要改这里 ★
   levels 从小到大共 11 级，最后一级是“终极小瑞瑞”
   size = 直径（游戏世界里宽 720）；juice = 合成时果汁颜色
   ============================================================ */
const CONFIG = {
  title: "合成小瑞瑞",
  startHint: "点击开始 · 拖动后松手放下小瑞瑞",
  gameOverText: "Game Over",
  finalLabel: "本局得分",
  againHint: "再来一局",
  bigWinText: "合成小瑞瑞！",
  bannerText: "！！！打开由你榜投积分 拿个号一边挂播一边玩 救救日榜！！！",
  routeTitle: "合成路线",
  routeTap: "点击任意处开始游戏",
  pauseTitle: "暂停一下",
  resumeHint: "继续游戏",
  restartText: "重新开始",
  homeText: "返回主页",
  levels: [
    { name: "小瑞瑞1号", img: A.f0,  size: 52,  juice: "#7fd67c" },
    { name: "小瑞瑞2号", img: A.f1,  size: 80,  juice: "#a8e890" },
    { name: "小瑞瑞3号", img: A.f2,  size: 108, juice: "#5cc98a" },
    { name: "小瑞瑞4号", img: A.f3,  size: 119, juice: "#bdf0a2" },
    { name: "小瑞瑞5号", img: A.f4,  size: 152, juice: "#4fbf7a" },
    { name: "小瑞瑞6号", img: A.f5,  size: 183, juice: "#8fe3b5" },
    { name: "小瑞瑞7号", img: A.f6,  size: 193, juice: "#6ccf6a" },
    { name: "小瑞瑞8号", img: A.f7,  size: 258, juice: "#c6ec8c" },
    { name: "小瑞瑞9号", img: A.f8,  size: 308, juice: "#9be0c5" },
    { name: "小瑞瑞10号", img: A.f9, size: 308, juice: "#58b87c" },
    { name: "小瑞瑞11号", img: A.f10, size: 408, juice: "#3fae63" },
  ],
  // 开局前几个固定掉落的等级，之后从 0~4 级随机
  openingSequence: [0, 0, 1, 2, 2, 3],
  randomMaxLevel: 4,
};
/* ============================================================ */

const { Engine, Bodies, Body, Composite, Events } = Matter;
const W = 720;
// 世界高度跟着屏幕比例走：长屏手机多出来的高度，六成给地面、四成给顶部，可玩区域大小不变
let H = 1280, GROUND_TOP = H - 127, SPAWN_Y = 120, LINE_Y = 220;
function fitWorld() {
  const r = frame.getBoundingClientRect();
  H = r.width > 0 ? Math.round(Math.min(1760, Math.max(1280, W * r.height / r.width))) : 1280;
  const extra = H - 1280;
  GROUND_TOP = H - 127 - Math.round(extra * 0.6);
  SPAWN_Y = 120 + Math.round(extra * 0.4);
  LINE_Y = 220 + Math.round(extra * 0.4);
}
const WALL_IN = 10;

const MAX = CONFIG.levels.length - 1;

const $ = (id) => document.getElementById(id);
const frame = $("frame"), cv = $("cv"), ctx = cv.getContext("2d");
const scoreEl = $("score");

/* ---------- 文案 ---------- */
$("titleText").textContent = CONFIG.title;
$("bannerText").textContent = CONFIG.bannerText;
$("bannerText2").textContent = CONFIG.bannerText;
$("bannerText3").textContent = CONFIG.bannerText;
$("startHint").textContent = CONFIG.startHint;
$("overText").textContent = CONFIG.gameOverText;
$("finalLabel").textContent = CONFIG.finalLabel;
$("againHint").textContent = CONFIG.againHint;
$("pauseTitle").textContent = CONFIG.pauseTitle;
$("resumeHint").textContent = CONFIG.resumeHint;
$("restartBtn").textContent = CONFIG.restartText;
$("homeBtn").textContent = CONFIG.homeText;
$("startImg").src = A.startBtn; $("againImg").src = A.startBtn; $("resumeImg").src = A.startBtn;
$("startBig").src = CONFIG.levels[MAX].img;
document.title = CONFIG.title;

/* ---------- 图片 ---------- */
function loadImg(src) { const i = new Image(); i.src = src; return i; }
const fruitImgs = CONFIG.levels.map((l) => loadImg(l.img));
const redImgs = [];
fruitImgs.forEach((img, i) => {
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(255,0,0,.55)";
    g.fillRect(0, 0, c.width, c.height);
    redImgs[i] = c;
  };
});
const bottomImg = loadImg(A.bottom);
const lineImg = loadImg(A.redLine);
// 庆祝特效的图片不影响开局，等页面加载完再悄悄下载
const sunImg = new Image(), bubbleImg = new Image();
let ribbonImgs = [];
function loadExtras() { if (sunImg.src) return; sunImg.src = A.sun; bubbleImg.src = A.bubble; ribbonImgs = A.ribbons.map(loadImg); }
const imgReady = (i) => i && i.complete && i.naturalWidth > 0;
window.addEventListener("load", () => setTimeout(loadExtras, 1200));

/* ---------- 声音 ----------
   用 Web Audio 播放：声音只解码一次，播放不再新建 <audio>，连续合成也不卡；
   从别的应用切回来、暂停再继续时，下一次点击会自动把声音恢复 */
let muted = false, actx = null;
const sounds = { desk: A.sDesk, juice: A.sJuice, boom: A.sBoom, cheer: A.sCheer };
const rawSnd = {}, bufSnd = {}, lastPlay = {};
function b64ToBuffer(uri) {
  const bin = atob(uri.slice(uri.indexOf(",") + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
async function loadSound(k) {
  try {
    rawSnd[k] = sounds[k].startsWith("data:") ? b64ToBuffer(sounds[k]) : await (await fetch(sounds[k])).arrayBuffer();
    decodeSound(k);
  } catch (_) {}
}
function decodeSound(k) {
  if (!actx || bufSnd[k] || !rawSnd[k]) return;
  const copy = rawSnd[k].slice(0);
  try { actx.decodeAudioData(copy, (b) => { bufSnd[k] = b; }, () => {}); } catch (_) {}
}
function ensureAudio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { actx = new AC(); } catch (_) { return null; }
    for (const k in rawSnd) decodeSound(k);
  }
  if (actx.state !== "running") {
    actx.resume().catch(() => {});
    // iOS / 微信：在点击里播一段无声音频才能真正解锁
    try { const s = actx.createBufferSource(); s.buffer = actx.createBuffer(1, 1, 22050); s.connect(actx.destination); s.start(0); } catch (_) {}
  }
  return actx;
}
["pointerdown", "touchend", "click", "keydown"].forEach((ev) => document.addEventListener(ev, ensureAudio, { capture: true, passive: true }));
document.addEventListener("WeixinJSBridgeReady", ensureAudio);
document.addEventListener("visibilitychange", () => { if (!document.hidden && actx && actx.state !== "running") actx.resume().catch(() => {}); });
window.addEventListener("pageshow", () => { if (actx && actx.state !== "running") actx.resume().catch(() => {}); });
(window.requestIdleCallback || ((fn) => setTimeout(fn, 600)))(() => { for (const k in sounds) loadSound(k); });
function play(name, vol = 1) {
  if (muted || !actx) return;
  if (actx.state !== "running") { actx.resume().catch(() => {}); return; }
  const b = bufSnd[name];
  if (!b) return;
  const now = actx.currentTime;
  if (lastPlay[name] && now - lastPlay[name] < 0.06) return; // 同一个音效太密时合并，避免爆音
  lastPlay[name] = now;
  try {
    const src = actx.createBufferSource(); src.buffer = b;
    const g = actx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(actx.destination); src.start(0);
  } catch (_) {}
}
$("mute").addEventListener("click", (e) => {
  e.stopPropagation();
  muted = !muted;
  $("mute").innerHTML = muted ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h3.5L12 5v14l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h3.5L12 5v14l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  $("mute").setAttribute("aria-label", muted ? "打开声音" : "静音");
});
$("mute").addEventListener("pointerdown", (e) => e.stopPropagation());

/* ---------- 画布尺寸 ---------- */
let scale = 1;
function resize() {
  const r = frame.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.width * dpr * H / W);
  cv.style.height = (r.width * H / W) + "px";
  scale = cv.width / W;
  if (typeof spriteCache !== "undefined") spriteCache.clear();
}
new ResizeObserver(() => { if (typeof state !== "undefined" && state === "idle" && engine) { setupIdle(); } else resize(); }).observe(frame);

/* ---------- 物理 ---------- */
let engine, fruits, ghosts, fx, current, dropCount, score, shownScore, state, celebrate, lastDropAt;

function setupWorld() {
  fitWorld();
  resize();
  engine = Engine.create();
  engine.gravity.y = 1.5;
  engine.positionIterations = 10;
  engine.velocityIterations = 8;
  const opt = { isStatic: true, friction: 0.5, label: "ground" };
  Composite.add(engine.world, [
    Bodies.rectangle(W / 2, GROUND_TOP + 200, W * 2, 400, opt),
    Bodies.rectangle(WALL_IN - 200, H / 2, 400, H * 4, { ...opt, label: "wall" }),
    Bodies.rectangle(W - WALL_IN + 200, H / 2, 400, H * 4, { ...opt, label: "wall" }),
  ]);
  Events.on(engine, "collisionStart", onContacts);
  Events.on(engine, "collisionActive", onContacts);
}

function makeFruit(level, x, y, startScale = 1) {
  const r = CONFIG.levels[level].size / 2;
  const b = Bodies.circle(x, y, r, {
    restitution: 0.15, friction: 0.3, frictionStatic: 0.6, density: 0.001, label: "fruit",
  });
  b.level = level;
  b.landedAt = 0;
  b.dangerAt = 0;
  b.grow = startScale < 1 ? { t: 0 } : null;
  b.physScale = 1;
  if (startScale < 1) { Body.scale(b, startScale, startScale); b.physScale = startScale; }
  fruits.push(b);
  Composite.add(engine.world, b);
  return b;
}

function removeFruit(b) {
  b.gone = true;
  Composite.remove(engine.world, b);
  const i = fruits.indexOf(b);
  if (i >= 0) fruits.splice(i, 1);
}

function onContacts(ev) {
  if (state !== "play") return;
  const now = gt;
  for (const p of ev.pairs) {
    const a = p.bodyA, b = p.bodyB;
    for (const [s, o] of [[a, b], [b, a]]) {
      if (s.label === "fruit" && !s.landedAt && (o.label === "ground" || o.label === "fruit")) {
        s.landedAt = now;
        if (o.label === "ground" && ev.name === "collisionStart") play("desk", 0.6);
      }
    }
    if (a.label === "fruit" && b.label === "fruit" && a.level === b.level &&
        a.level < MAX && !a.gone && !b.gone && !a.merging && !b.merging) {
      merge(a, b);
    }
  }
}

function merge(a, b) {
  // 位置更低的那个是合成点，另一个飞过去
  const [low, high] = a.position.y > b.position.y ? [a, b] : [b, a];
  low.merging = high.merging = true;
  const level = low.level;
  const pos = { x: low.position.x, y: low.position.y };
  const g1 = { level, x: low.position.x, y: low.position.y, angle: low.angle, t: 0 };
  const g2 = { level, x: high.position.x, y: high.position.y, x0: high.position.x, y0: high.position.y, angle: high.angle, t: 0, tx: pos.x, ty: pos.y };
  ghosts.push(g1, g2);
  removeFruit(low); removeFruit(high);
  play("juice", 0.8);
  addScore(level + 1);
  setTimeout(() => {
    ghosts = ghosts.filter((g) => g !== g1 && g !== g2);
    if (state !== "play") return;
    ghosts = ghosts.filter((g) => g !== g1 && g !== g2);
    juiceBurst(level, pos.x, pos.y, CONFIG.levels[level].size);
    const nb = makeFruit(level + 1, pos.x, pos.y, 0.25);
    nb.landedAt = gt;
    Body.setVelocity(nb, { x: 0, y: 1.5 });
    if (level + 1 === MAX) startCelebrate();
  }, 100);
}

/* ---------- 分数 ---------- */
function addScore(n) { score += n; }

/* ---------- 特效 ---------- */
function juiceBurst(level, x, y, w) {
  const color = CONFIG.levels[level].juice;
  fx.push({ type: "blob", x, y, r: w / 2, color, t: 0, d: 0.45 });
  // 连续合成时果汁颗粒太多会拖慢手机，超过上限就少画一些
  const n = fx.length > 160 ? 4 : 7 + Math.round(w / 45);
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = w / 2 + 20 + Math.random() * 70;
    fx.push({
      type: "drop", x, y, color,
      tx: x + Math.cos(ang) * dist, ty: y + Math.sin(ang) * dist,
      r: (3 + Math.random() * 7) * (0.6 + w / 300),
      t: 0, d: 0.35 + Math.random() * 0.35,
    });
  }
}

function startCelebrate() {
  loadExtras();
  play("cheer", 0.9);
  const ribbons = [];
  for (let i = 0; i < 90; i++) {
    ribbons.push({
      img: Math.floor(Math.random() * ribbonImgs.length),
      x: W / 2 + (Math.random() - 0.5) * 200, y: H * 0.38,
      vx: (Math.random() - 0.5) * 900, vy: -300 - Math.random() * 900,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20, s: 0.8 + Math.random() * 1.2,
    });
  }
  celebrate = { t: 0, ribbons };
}

/* ---------- 掉落控制 ---------- */
function nextLevel() {
  const seq = CONFIG.openingSequence;
  const lv = dropCount < seq.length ? seq[dropCount] : Math.floor(Math.random() * (CONFIG.randomMaxLevel + 1));
  dropCount++;
  return lv;
}
function spawnCurrent() {
  if (state !== "play") return;
  current = { level: nextLevel(), x: W / 2, t: 0, tween: null };
}
function clampX(x, level) {
  const r = CONFIG.levels[level].size / 2;
  return Math.max(WALL_IN + r, Math.min(W - WALL_IN - r, x));
}
function toWorldX(clientX) {
  const r = frame.getBoundingClientRect();
  return ((clientX - r.left) / r.width) * W;
}
let dragging = false;
frame.addEventListener("pointerdown", (e) => {
  if (state !== "play" || paused || !current || celebrate) return;
  dragging = true;
  try { frame.setPointerCapture(e.pointerId); } catch (_) {}
  current.tween = { from: current.x, to: clampX(toWorldX(e.clientX), current.level), t: 0 };
});
frame.addEventListener("pointermove", (e) => {
  if (!dragging || !current) return;
  current.tween = null;
  current.x = clampX(toWorldX(e.clientX), current.level);
});
function release() {
  if (!dragging) return;
  dragging = false;
  if (!current || state !== "play" || paused) return;
  if (current.tween) current.x = current.tween.to;
  const b = makeFruit(current.level, current.x, SPAWN_Y);
  Body.setVelocity(b, { x: 0, y: 12 });
  current = null;
  setTimeout(spawnCurrent, 500);
}
frame.addEventListener("pointerup", release);
frame.addEventListener("pointercancel", release);

/* ---------- 结束 ---------- */
function gameOver() {
  if (state !== "play") return;
  state = "ending";
  $("pauseBtn").hidden = true;
  current = null;
  const list = fruits.slice().reverse();
  list.forEach((b, i) => {
    setTimeout(() => {
      if (b.gone) return;
      juiceBurst(b.level, b.position.x, b.position.y, b.circleRadius * 2);
      addScore(b.level + 1);
      play("boom", 0.5);
      removeFruit(b);
    }, 100 * (i + 1));
  });
  setTimeout(() => {
    state = "over";
    $("pauseBtn").hidden = true;
    $("finalScore").textContent = score;
    $("overPanel").hidden = false;
    submitScore(score);
  }, Math.max(3000, 100 * list.length + 800));
}

/* ---------- 主循环 ---------- */
const easeBackOut = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
let lastT = performance.now(), acc = 0, gt = 1, paused = false;
function loop(now) {
  let dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (paused) dt = 0;
  gt += dt * 1000;
  if (!paused && (state === "play" || state === "ending")) {
    acc += dt * 1000;
    let steps = 0;
    while (acc >= 1000 / 60 && steps < 3) { Engine.update(engine, 1000 / 60); acc -= 1000 / 60; steps++; }
    if (steps === 3) acc = 0; // 手机一时卡住时不要一口气补算，避免越卡越慢
  }
  update(dt, gt);
  draw(gt);
  requestAnimationFrame(loop);
}

function update(dt, now) {
  // 新果子弹出动画（物理半径跟着长大）
  for (const b of fruits) {
    if (!b.grow) continue;
    b.grow.t += dt / 0.5;
    const s = Math.max(0.25, Math.min(1, easeBackOut(Math.min(1, b.grow.t))));
    if (Math.abs(s - b.physScale) > 0.001) { Body.scale(b, s / b.physScale, s / b.physScale); b.physScale = s; }
    if (b.grow.t >= 1) {
      if (b.physScale !== 1) { Body.scale(b, 1 / b.physScale, 1 / b.physScale); b.physScale = 1; }
      b.grow = null;
    }
  }
  if (current) {
    current.t = Math.min(1, current.t + dt / 0.5);
    if (current.tween) {
      current.tween.t = Math.min(1, current.tween.t + dt / 0.1);
      current.x = current.tween.from + (current.tween.to - current.tween.from) * current.tween.t;
    }
  }
  for (const g of ghosts) {
    g.t = Math.min(1, g.t + dt / 0.1);
    if (g.tx !== undefined) { g.x = g.x0 + (g.tx - g.x0) * g.t; g.y = g.y0 + (g.ty - g.y0) * g.t; }
  }
  let k = 0;
  for (const f of fx) { f.t += dt; if (f.t < f.d) fx[k++] = f; }
  fx.length = k;
  // 超线判定：落稳 3 秒后还在红线以上就闪红，然后结束
  if (state === "play") {
    for (const b of fruits) {
      if (!b.landedAt || b.grow) continue;
      const top = b.position.y - b.circleRadius;
      if (top < LINE_Y && now - b.landedAt > 3000 && !b.dangerAt) b.dangerAt = now;
      if (b.dangerAt && now - b.dangerAt > 1800) { gameOver(); break; }
    }
  }
  // 分数滚动
  if (shownScore < score) {
    shownScore = Math.min(score, shownScore + dt * Math.max(5, (score - shownScore) * 5));
    const v = Math.floor(shownScore);
    if (scoreEl._v !== v) { scoreEl._v = v; scoreEl.textContent = v; }
  }
  if (celebrate) {
    celebrate.t += dt;
    for (const r of celebrate.ribbons) { r.vy += 1400 * dt; r.vx *= 0.99; r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; }
    if (celebrate.t > 3.2) celebrate = null;
  }
}

// 按当前屏幕分辨率把每级头像预先缩放成刚好大小的贴图，每帧直接贴，省掉实时缩放
const spriteCache = new Map();
function sprite(level, red) {
  const key = level + (red ? "r" : "");
  let c = spriteCache.get(key);
  if (c) return c;
  const src = red ? redImgs[level] : fruitImgs[level];
  if (!src || !(src.width || src.naturalWidth) || (src.complete === false)) return null;
  const px = Math.max(8, Math.ceil(CONFIG.levels[level].size * scale));
  c = document.createElement("canvas"); c.width = c.height = px;
  const g = c.getContext("2d"); g.imageSmoothingQuality = "high";
  g.drawImage(src, 0, 0, px, px);
  spriteCache.set(key, c);
  return c;
}
function drawFruit(level, x, y, angle, s, red) {
  const size = CONFIG.levels[level].size * s;
  const img = sprite(level, red);
  if (!img) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

const CANVAS_FUN = getComputedStyle(document.documentElement).getPropertyValue("--font-fun") || "sans-serif";
function draw(now) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // 地面
  if (bottomImg.complete) ctx.drawImage(bottomImg, 0, GROUND_TOP, W, 127);
  if (H - GROUND_TOP > 127) { ctx.fillStyle = "#3a784b"; ctx.fillRect(0, GROUND_TOP + 126, W, H - GROUND_TOP - 126); }

  // 红线：最高的水果离线 100 以内时闪烁
  let highest = Infinity;
  for (const b of fruits) if (b.landedAt) highest = Math.min(highest, b.position.y - b.circleRadius);
  if (state !== "idle" && (highest - LINE_Y < 100 || state !== "play") && lineImg.complete) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now / 95);
    ctx.drawImage(lineImg, (W - 711) / 2, LINE_Y - 4);
    ctx.globalAlpha = 1;
  }

  // 果汁底层
  for (const f of fx) {
    const p = f.t / f.d;
    if (f.type === "blob") {
      ctx.globalAlpha = 0.75 * (1 - p);
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + 0.6 * p), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // 水果
  for (const g of ghosts) drawFruit(g.level, g.x, g.y, g.angle, 1, false);
  for (const b of fruits) {
    const s = b.grow ? Math.max(0, easeBackOut(Math.min(1, b.grow.t))) : 1;
    let red = false;
    if (b.dangerAt) {
      red = true;
      ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos((now - b.dangerAt) / 95));
    }
    drawFruit(b.level, b.position.x, b.position.y, b.angle, s, red);
    ctx.globalAlpha = 1;
  }
  if (current) drawFruit(current.level, current.x, SPAWN_Y, 0, Math.max(0, easeBackOut(current.t)), false);

  // 果汁颗粒
  for (const f of fx) {
    if (f.type !== "drop") continue;
    const p = f.t / f.d;
    const e = 1 - Math.pow(1 - p, 3);
    ctx.globalAlpha = 1 - p * 0.8;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(f.x + (f.tx - f.x) * e, f.y + (f.ty - f.y) * e, f.r * (1 - p * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 合成大西瓜庆祝
  if (celebrate) {
    const t = celebrate.t;
    const fade = t < 2.6 ? 1 : Math.max(0, 1 - (t - 2.6) / 0.6);
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = "#0b2a19";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = fade;
    const cx = W / 2, cy = H * 0.4;
    const pop = Math.max(0, easeBackOut(Math.min(1, t / 0.6)));
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.8);
    const sun = 760 * pop; if (imgReady(sunImg)) ctx.drawImage(sunImg, -sun / 2, -sun / 2, sun, sun);
    ctx.restore();
    const bub = 500 * pop; if (imgReady(bubbleImg)) ctx.drawImage(bubbleImg, cx - bub / 2, cy - bub * 0.48, bub, bub * 500 / 523);
    drawFruit(MAX, cx, cy, Math.sin(t * 3) * 0.1, pop, false);
    for (const r of celebrate.ribbons) {
      const img = ribbonImgs[r.img % (ribbonImgs.length || 1)];
      if (!imgReady(img)) continue;
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
      ctx.drawImage(img, -img.width * r.s / 2, -img.height * r.s / 2, img.width * r.s, img.height * r.s);
      ctx.restore();
    }
    ctx.font = "76px " + CANVAS_FUN;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.lineWidth = 14; ctx.strokeStyle = "#3a9459";
    const ty = cy + 300;
    ctx.strokeText(CONFIG.bigWinText, cx, ty);
    ctx.fillStyle = "#ffffff"; ctx.fillText(CONFIG.bigWinText, cx, ty);
    ctx.globalAlpha = 1;
  }
}

/* ---------- 开始 / 重开 ---------- */
function setPaused(p) {
  if (p && state !== "play") return;
  paused = p;
  dragging = false;
  $("pausePanel").hidden = !p;
}
$("pauseBtn").addEventListener("click", (e) => { e.stopPropagation(); setPaused(true); });
$("resumeBtn").addEventListener("click", (e) => { e.stopPropagation(); setPaused(false); });
$("restartBtn").addEventListener("click", (e) => { e.stopPropagation(); setPaused(false); newGame(); });
$("homeBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  setPaused(false);
  state = "idle"; current = null; celebrate = null;
  score = shownScore = 0; scoreEl.textContent = "0"; scoreEl.hidden = true;
  $("pauseBtn").hidden = true;
  $("startPanel").hidden = false;
});
for (const id of ["pauseBtn", "resumeBtn", "restartBtn", "homeBtn"]) $(id).addEventListener("pointerdown", (e) => e.stopPropagation());
document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") setPaused(true); });

function newGame() {
  setupWorld();
  fruits = []; ghosts = []; fx = [];
  current = null; dropCount = 0; score = 0; shownScore = 0; celebrate = null;
  scoreEl.textContent = "0";
  scoreEl.hidden = false;
  state = "play";
  paused = false;
  lastResult = null;
  $("pausePanel").hidden = true;
  $("pauseBtn").hidden = false;
  spawnCurrent();
}
function begin(e) {
  e.stopPropagation();
  $("startPanel").hidden = true;
  $("overPanel").hidden = true;
  ensureAudio();
  newGame();
}

/* ---------- 合成路线图 ---------- */
const ARROW = '<svg class="arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
(function buildRoute() {
  $("routeTitle").textContent = CONFIG.routeTitle;
  $("routeTap").textContent = CONFIG.routeTap;
  const last = CONFIG.levels.length - 1;
  let h = "";
  CONFIG.levels.slice(0, last).forEach((l, i) => {
    const s = (9.5 + i * 0.55).toFixed(2);
    h += `<div class="step"><img src="${l.img}" alt="" style="width:${s}cqw;height:${s}cqw"></div>`;
    if (i < last - 1) h += ARROW;
  });
  $("chain").innerHTML = h;
  const fin = document.createElement("div");
  fin.className = "final";
  fin.innerHTML = ARROW.replace('class="arr"', 'class="arr down"') + `<img src="${CONFIG.levels[last].img}" alt="">`;
  $("chain").after(fin);
})();
function showRoute(e) {
  e.stopPropagation();
  $("startPanel").hidden = true;
  $("routePanel").hidden = false;
}
$("routePanel").addEventListener("click", (e) => { $("routePanel").hidden = true; begin(e); });
$("routePanel").addEventListener("pointerdown", (e) => e.stopPropagation());
$("startBtn").addEventListener("click", showRoute);
$("againBtn").addEventListener("click", begin);
for (const id of ["startBtn", "againBtn"]) $(id).addEventListener("pointerdown", (e) => e.stopPropagation());


/* ============================================================
   ★ 在线功能：排行榜 / 个人中心 / 账号 ★
   Supabase 地址和 key 在 config.js 里填
   ============================================================ */
// 连接信息写在同目录的 config.js 里，这里只读取
const ONLINE = Object.assign({ url: "", anonKey: "", emailDomain: "xiaoruirui.game", boardSize: 50 }, window.XXR_CONFIG || {});
/* ============================================================ */

let sb = null, myId = null, me = null, liveOn = false, sheetView = null, lastResult = null;
const configured = /^https:\/\//.test(ONLINE.url) && ONLINE.anonKey.length > 20 && !!window.supabase;
if (configured) {
  // 每个请求最多等 12 秒，网络差时给出提示而不是一直转圈
  const once = (input, init) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    if (init.signal) init.signal.addEventListener("abort", () => ctrl.abort());
    return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
  };
  // 读取类请求遇到网络抖动自动再试一次（注册、提交分数这类写入不重试，避免重复）
  const fetchWithTimeout = async (input, init = {}) => {
    const u = String(input && input.url || input);
    const retryable = !/\/auth\/v1\/(signup|token)/.test(u) && !/rpc\/submit_score/.test(u) && !/\/storage\/v1\/object\/avatars/.test(u);
    try { return await once(input, init); }
    catch (e) {
      if (!retryable || (e && e.name === "AbortError")) throw e;
      await new Promise((r) => setTimeout(r, 700));
      return once(input, init);
    }
  };
  sb = window.supabase.createClient(ONLINE.url, ONLINE.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "xxr-auth" },
    global: { fetch: fetchWithTimeout },
  });
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function avaHTML(p, cls = "ava") {
  const url = p && p.avatar_url;
  const ch = esc(((p && p.nickname) || "?").trim().slice(0, 1));
  return url ? `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" decoding="async">` : `<span class="${cls}">${ch}</span>`;
}
const toEmail = (u) => `${u.toLowerCase()}@${ONLINE.emailDomain}`;
const isNetErr = (e) => /Load failed|Failed to fetch|NetworkError|Network request failed|fetch|abort/i.test((e && (e.message || e.name)) || "");
function errText(e) {
  const m = (e && (e.message || e.error_description || String(e))) || "";
  if (/娘娘/.test(m)) return m;
  if (/Invalid login credentials/i.test(m)) return "账号或密码不对";
  if (/already registered|already exists/i.test(m)) return "已经有娘娘使用这个帐号啦";
  if (/Password should be/i.test(m)) return "密码至少 6 位";
  if (/Email not confirmed/i.test(m)) return "需要在 Supabase 里关闭邮箱验证（见部署说明）";
  if (/rate limit/i.test(m)) return "操作太频繁，稍等一会儿再试";
  if (isNetErr(e)) return "网络不太稳定，没连上服务器，再点一次试试";
  return m || "出错了，再试一次";
}

/* ---------- 账号状态 ---------- */
let meLoading = null, meLoadingId = null;
function loadMe() {
  if (!sb || !myId) { me = null; renderWho(); return Promise.resolve(); }
  if (meLoading && meLoadingId === myId) return meLoading;
  meLoadingId = myId;
  meLoading = (async () => {
    const { data, error } = await sb.rpc("get_me");
    if (!error) me = data || null;
    renderWho();
  })().finally(() => { meLoading = null; });
  return meLoading;
}
function renderWho() {
  const btn = $("whoBtn");
  btn.hidden = !configured;
  if (me) {
    $("whoAva").outerHTML = avaHTML(me).replace('class="ava"', 'class="ava" id="whoAva"');
    $("whoName").textContent = me.nickname;
    $("meBtn1").textContent = "个人中心";
    $("loginBtn3").textContent = "个人中心";
  } else {
    $("whoAva").outerHTML = '<span class="ava" id="whoAva">?</span>';
    $("whoName").textContent = "登录 / 注册";
    $("meBtn1").textContent = "登录";
    $("loginBtn3").textContent = "登录上榜";
  }
  if (sheetView === "me" && me) renderMe();
}
if (sb) {
  sb.auth.onAuthStateChange((ev, session) => {
    const id = session?.user?.id || null;
    if (ev === "INITIAL_SESSION" && !id && state === "idle" && !sheetView) setTimeout(() => openSheet("auth"), 0);
    if (id !== myId) { myId = id; setTimeout(loadMe, 0); }
  });
}

/* ---------- 弹出面板 ---------- */
function openSheet(view) {
  if (state === "play" && !paused) setPaused(true);
  if (view !== "rank") boardLive(false);
  sheetView = view;
  $("sheet").hidden = false;
  if (view === "auth") renderAuth("login");
  else if (view === "me") me ? renderMe() : renderAuth("login");
  else if (view === "rank") renderRank("top");
}
function closeSheet() { $("sheet").hidden = true; sheetView = null; boardLive(false); }
$("sheetClose").addEventListener("click", closeSheet);
$("sheet").addEventListener("click", (e) => { if (e.target === $("sheet")) closeSheet(); });
$("sheet").addEventListener("pointerdown", (e) => e.stopPropagation());

function notConfigured() {
  $("sheetBody").innerHTML = `<h3>还没连上服务器</h3><div class="empty">在网页代码里的 ONLINE 一栏填好 Supabase 的地址和 key 之后，排行榜和账号就能用了。</div>`;
}

/* 登录 / 注册 */
const TAKEN_USER = "已经有娘娘使用这个帐号啦";
const TAKEN_NICK = "已经有娘娘使用这个昵称啦";
async function checkNames(username, nickname) {
  const { data, error } = await sb.rpc("check_names", { p_username: username || null, p_nickname: nickname || null });
  if (error) throw error;
  return data || {};
}
function renderAuth(mode) {
  if (!sb) return notConfigured();
  const reg = mode === "reg";
  $("sheetBody").innerHTML = `
    <h3>${reg ? "注册账号" : "登录"}</h3>
    <div class="tabs">
      <button type="button" data-m="login" aria-pressed="${!reg}">登录</button>
      <button type="button" data-m="reg" aria-pressed="${reg}">注册</button>
    </div>
    <form id="authForm" style="display:flex;flex-direction:column;gap:3cqw;overflow-y:auto" novalidate>
      <label class="field">账号<input id="fUser" autocomplete="username" maxlength="16" required>
        ${reg ? "<small>3~16位字母、数字或下划线，登录时使用，确认后不能修改</small>" : ""}</label>
      ${reg ? `<label class="field">昵称<input id="fNick" maxlength="12" required><small>排行榜上显示的名字，可以随时修改</small></label>` : ""}
      <label class="field">密码<input id="fPass" type="password" autocomplete="${reg ? "new-password" : "current-password"}" required>
        ${reg ? "<small>至少6位，换浏览器后可用它登录，无法找回请自行牢记<span class='nowrap'>( ˘ ³˘)</span></small>" : ""}</label>
      ${reg ? `<label class="field">确认密码<input id="fPass2" type="password" autocomplete="new-password" required></label>` : ""}
      <div class="msg" id="fMsg"></div>
      <button class="pill go" id="fGo" type="submit">${reg ? "注册并登录" : "登录"}</button>
    </form>
    <button class="guest" id="guestBtn" type="button">游客模式（数据不会上传排行榜哦）</button>`;
  $("sheetBody").querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => renderAuth(b.dataset.m)));
  $("guestBtn").addEventListener("click", closeSheet);
  $("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const u = $("fUser").value.trim(), p = $("fPass").value, msg = $("fMsg");
    const nick = reg ? $("fNick").value.trim() : "";
    msg.className = "msg";
    if (!/^[A-Za-z0-9_]{3,16}$/.test(u)) return (msg.textContent = "账号要3~16位字母、数字或下划线");
    if (reg && (nick.length < 1 || nick.length > 12)) return (msg.textContent = "昵称要1~12个字");
    if (p.length < 6) return (msg.textContent = "密码至少6位");
    if (reg && p !== $("fPass2").value) return (msg.textContent = "两次输入的密码不一样");
    $("fGo").disabled = true; msg.textContent = reg ? "注册中…" : "登录中…"; msg.className = "msg ok";
    try {
      if (reg) {
        let { data, error } = await sb.auth.signUp({ email: toEmail(u), password: p, options: { data: { username: u.toLowerCase(), nickname: nick } } });
        if (error && isNetErr(error)) {
          // 网络断了一下：注册可能其实已经成功，用同样的账号密码试着登录一次
          const s = await sb.auth.signInWithPassword({ email: toEmail(u), password: p });
          if (!s.error && s.data && s.data.session) { data = s.data; error = null; }
        }
        if (error) {
          if (/already registered|already exists/i.test(error.message)) throw new Error(TAKEN_USER);
          if (/Database error/i.test(error.message)) throw new Error(TAKEN_NICK);
          throw error;
        }
        if (!data.session) throw new Error("Email not confirmed");
        // 刚注册的资料是已知的，直接用，省一次请求
        myId = data.session.user.id;
        me = { id: myId, username: u.toLowerCase(), nickname: nick, avatar_url: null, best_score: 0, rank: null };
        renderWho();
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: toEmail(u), password: p });
        if (error) throw error;
      }
      if (!reg) {
        const { data: s } = await sb.auth.getSession();
        myId = s.session?.user?.id || null;
        await loadMe();
      }
      if (lastResult === "pending") submitScore(Number($("finalScore").textContent) || 0);
      sheetView = "me";
      renderMe();
    } catch (err) {
      msg.className = "msg"; msg.textContent = errText(err);
      $("fGo").disabled = false;
    }
  });
}

/* 个人中心 */
async function myRank(best) {
  if (!best) return null;
  const { count } = await sb.from("profiles").select("id", { count: "exact", head: true }).gt("best_score", best);
  return (count ?? 0) + 1;
}
function renderMe() {
  if (!sb) return notConfigured();
  if (!me) return renderAuth("login");
  $("sheetBody").innerHTML = `
    <h3>个人中心</h3>
    <div class="me-head">
      <label>${avaHTML(me, "ava lg")}<span>点头像更换</span>
        <input id="avaFile" type="file" accept="image/*" hidden></label>
    </div>
    <form id="nickForm" class="row2" style="align-items:flex-end" novalidate>
      <label class="field" style="flex:2">昵称<input id="nickIn" maxlength="12" value="${esc(me.nickname)}"></label>
      <button class="pill small" type="submit">保存</button>
    </form>
    <div class="msg" id="meMsg"></div>
    <div class="stats">
      <div class="stat"><b>${me.best_score || 0}</b>最高分</div>
      <div class="stat"><b id="meRank">–</b>当前排名</div>
    </div>
    <div class="mybar">账号：${esc(me.username)}</div>
    <div class="row2">
      <button class="pill small" id="toRank" type="button">看排行榜</button>
      <button class="pill small" id="logout" type="button">退出登录</button>
    </div>`;
  { const el = $("meRank"), r = me.best_score > 0 ? me.rank : null; el.textContent = r ? "第 " + r : "未上榜"; el.classList.toggle("txt", !r); }
  $("toRank").addEventListener("click", () => { sheetView = "rank"; renderRank("top"); });
  $("logout").addEventListener("click", async () => { await sb.auth.signOut(); myId = null; me = null; renderWho(); renderAuth("login"); sheetView = "auth"; });
  $("nickForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = $("nickIn").value.trim(), msg = $("meMsg");
    if (n.length < 1 || n.length > 12) { msg.className = "msg"; msg.textContent = "昵称 1~12 个字"; return; }
    if (n === me.nickname) return;
    msg.className = "msg ok"; msg.textContent = "保存中…";
    const { error } = await sb.from("profiles").update({ nickname: n }).eq("id", myId);
    if (error) { msg.className = "msg"; msg.textContent = error.code === "23505" || /duplicate|unique/i.test(error.message) ? TAKEN_NICK : errText(error); return; }
    me.nickname = n; renderWho(); msg.className = "msg ok"; msg.textContent = "昵称已保存";
  });
  $("avaFile").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0], msg = $("meMsg");
    if (!f) return;
    msg.className = "msg ok"; msg.textContent = "上传中…";
    try {
      const blob = await squareAvatar(f);
      const path = `${myId}/avatar.webp`;
      const { error } = await sb.storage.from("avatars").upload(path, blob, { upsert: true, contentType: blob.type, cacheControl: "31536000" });
      if (error) throw error;
      // 存成站内相对地址，头像图片也走自己的网站，国内能正常显示
      let url = sb.storage.from("avatars").getPublicUrl(path).data.publicUrl + "?v=" + Date.now();
      if (url.startsWith(location.origin + "/")) url = url.slice(location.origin.length);
      const { error: e2 } = await sb.from("profiles").update({ avatar_url: url }).eq("id", myId);
      if (e2) throw e2;
      me.avatar_url = url; renderWho(); renderMe();
      $("meMsg").className = "msg ok"; $("meMsg").textContent = "头像已更新";
    } catch (err) { msg.className = "msg"; msg.textContent = "头像上传失败：" + errText(err); }
  });
}
async function squareAvatar(file) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height), size = 256;
  const c = document.createElement("canvas"); c.width = c.height = size;
  c.getContext("2d").drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("图片处理失败"))), "image/webp", 0.85));
}

/* 排行榜（实时）：本周榜 / 总榜，外面前 5，点「查看榜单」看前 500
   提速：一次请求拿齐榜单、总人数和我的名次；先显示上次缓存，再静默刷新；
   只有打开排行榜时才连实时推送，关掉就断开，省服务器连接数 */
let boardData = null, boardTimer = null, rankMode = "top", boardKind = "week", boardChan = null, lastFetch = 0;
const boardKey = () => `xxr-board-${boardKind}-${rankMode}`;
function cacheGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_) { return null; } }
function cacheSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
async function fetchBoard() {
  const kind = boardKind, mode = rankMode;
  const { data, error } = await sb.rpc("get_board", { p_kind: kind, p_limit: mode === "full" ? 500 : 5 });
  if (error) throw error;
  lastFetch = Date.now();
  if (kind !== boardKind || mode !== rankMode) return false;
  boardData = data;
  cacheSet(boardKey(), { ...data, uid: myId || null });
  return true;
}
function rowHTML(r, no, mine) {
  return `<li class="${mine ? "mine" : ""}"><span class="no">${no}</span>${avaHTML(r)}<span class="nm">${esc(r.nickname)}</span><span class="sc">${r.score}</span></li>`;
}
function boardHTML() {
  const rows = (boardData && boardData.rows) || [];
  if (!rows.length) return `<div class="empty">${boardKind === "week" ? "本周还没有娘娘上榜，快来当第一名！" : "还没有娘娘上榜，快来当第一名！"}</div>`;
  return `<ol class="board">${rows.map((r, i) => rowHTML(r, i + 1, r.id === myId)).join("")}</ol>`;
}
async function renderRank(mode, kind) {
  if (!sb) return notConfigured();
  if (mode) rankMode = mode;
  if (kind) boardKind = kind;
  const full = rankMode === "full", week = boardKind === "week";
  $("sheetBody").innerHTML = `
    <h3>${full ? (week ? "本周前 500 名" : "总榜前 500 名") : "排行榜"}</h3>
    <div class="tabs">
      <button type="button" data-k="week" aria-pressed="${week}">本周榜</button>
      <button type="button" data-k="all" aria-pressed="${!week}">总榜</button>
    </div>
    <div class="live ${liveOn ? "on" : ""}" id="liveTag"><span>${liveOn ? "实时更新中" : "连接中…"}</span>${week ? " · 每周一 0 点刷新" : ""}</div>
    <div id="boardBox" class="${full ? "boardbox full" : "boardbox"}"><div class="empty">加载中…</div></div>
    <div class="mine-wrap" id="myBar"></div>
    <div class="total" id="totalTag"></div>
    ${full ? `<button class="pill small" id="backTop" type="button">返回</button>` : `<button class="pill small" id="seeAll" type="button">查看榜单</button>`}`;
  $("sheetBody").querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => renderRank(null, b.dataset.k)));
  if (full) $("backTop").addEventListener("click", () => renderRank("top"));
  else $("seeAll").addEventListener("click", () => renderRank("full"));
  // 先用上次的缓存立刻显示
  const cached = cacheGet(boardKey());
  if (cached && cached.uid === (myId || null)) { boardData = cached; paintBoard(); } else boardData = null;
  boardLive(true);
  try { if (await fetchBoard()) paintBoard(); }
  catch (err) { if (!boardData && $("boardBox")) $("boardBox").innerHTML = `<div class="empty">${esc(errText(err))}</div>`; }
}
function paintBoard() {
  const box = $("boardBox");
  if (!box || sheetView !== "rank" || !boardData) return;
  box.innerHTML = boardHTML();
  $("totalTag").textContent = `共 ${boardData.total || 0} 位娘娘正在合成小瑞瑞……`;
  const bar = $("myBar");
  if (!me) {
    bar.innerHTML = `<div class="guestrow">游客模式，登录后成绩才能上榜 <button class="pill small" id="barLogin" type="button">登录</button></div>`;
    $("barLogin").addEventListener("click", () => { boardLive(false); sheetView = "auth"; renderAuth("login"); });
    return;
  }
  bar.innerHTML = `<div class="minelabel">${boardKind === "week" ? "我的本周排名" : "我的总排名"}</div><ol class="board">${rowHTML({ ...me, score: boardData.my_score || 0 }, boardData.my_rank || "–", true)}</ol>`;
}
function setLive(on) {
  liveOn = on;
  const t = $("liveTag");
  if (t) { t.className = "live" + (on ? " on" : ""); t.querySelector("span").textContent = on ? "实时更新中" : "重新连接中…"; }
}
function boardChanged() {
  if (sheetView !== "rank") return;
  // 有人刷分时合并刷新：最快 2 秒一次，避免很多人同时上分时把数据库打满
  clearTimeout(boardTimer);
  const wait = Math.max(400, 2000 - (Date.now() - lastFetch));
  boardTimer = setTimeout(async () => { try { if (await fetchBoard()) paintBoard(); } catch (_) {} }, wait);
}
function boardLive(on) {
  if (!sb) return;
  if (on && !boardChan) {
    boardChan = sb.channel("board")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (p) => {
        if (p.new && p.new.id === myId && me) { Object.assign(me, p.new); renderWho(); }
        boardChanged();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_scores" }, boardChanged)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
  } else if (!on && boardChan) {
    const c = boardChan; boardChan = null; liveOn = false;
    clearTimeout(boardTimer);
    sb.removeChannel(c);
  }
}

/* 结算上传 */
async function submitScore(s) {
  const line = $("rankLine");
  if (!sb) { line.textContent = ""; return; }
  if (!me) {
    lastResult = "pending";
    line.innerHTML = `登录后这局成绩能上排行榜`;
    return;
  }
  lastResult = "sent";
  line.textContent = "成绩上传中…";
  const { data, error } = await sb.rpc("submit_score", { p_score: s });
  if (error) { line.textContent = "成绩没传上去：" + errText(error); return; }
  me.best_score = data.best;
  me.rank = data.rank;
  const head = data.new_record ? "新纪录！" : data.week_new ? "本周新纪录！" : "";
  const week = data.week_rank ? `本周第 <b>${data.week_rank}</b> 名 · ` : "";
  line.innerHTML = head + week + `总榜第 <b>${data.rank}</b> 名`;
  renderWho();
}

/* 按钮 */
$("whoBtn").addEventListener("click", () => openSheet(me ? "me" : "auth"));
$("rankBtn1").addEventListener("click", () => openSheet("rank"));
$("meBtn1").addEventListener("click", () => openSheet("me"));
$("rankBtn2").addEventListener("click", () => openSheet("rank"));
$("rankBtn3").addEventListener("click", () => openSheet("rank"));
$("loginBtn3").addEventListener("click", () => openSheet(me ? "me" : "auth"));
for (const id of ["whoBtn", "rankBtn1", "meBtn1", "rankBtn2", "rankBtn3", "loginBtn3"]) $(id).addEventListener("pointerdown", (e) => e.stopPropagation());
renderWho();

// 首屏：先摆几颗水果当背景
function setupIdle() {
  fruits = []; ghosts = []; fx = []; state = "idle"; score = 0; shownScore = 0;
  scoreEl.hidden = true;
  setupWorld();
  [[0, 150], [2, 260], [4, 420], [5, 600], [3, 330], [1, 520]].forEach(([lv, x], i) => makeFruit(lv, x, GROUND_TOP - 300 - i * 80));
  for (let i = 0; i < 240; i++) Engine.update(engine, 1000 / 60);
}
setupIdle();
requestAnimationFrame(loop);
