/* game-intro.js — KNN 땅따먹기 게임 방법 애니메이션 (약 25초, 캔버스 자동 재생)
 * 첫 방문 시 자동 재생, 이후엔 '게임 방법 애니메이션' 버튼으로 다시 보기. */

(function () {
  const ov = document.getElementById("intro-ov");
  const cv = document.getElementById("intro-cv");
  const c = cv.getContext("2d");
  const capEl = document.getElementById("intro-cap");
  const dotsEl = document.getElementById("intro-dots");
  const SEEN_KEY = "knn_game_intro_seen";

  const RED = "#ef4444", BLUE = "#3b82f6", INK = "#0f172a";

  // 연출용 고정 배치 (빨강 3 · 파랑 3)
  const P = [
    { x: 250, y: 170, t: 0 }, { x: 660, y: 150, t: 1 },
    { x: 360, y: 390, t: 0 }, { x: 740, y: 350, t: 1 },
    { x: 175, y: 300, t: 0 }, { x: 545, y: 260, t: 1 },
  ];
  const COLORS = [RED, BLUE];
  const STAR = { x: 470, y: 295 };
  const nb3 = nearest([STAR.x, STAR.y], P, 3, (p) => [p.x, p.y]); // knn.js 재사용

  const SCENES = [
    { dur: 4600, cap: "① 모둠이 번갈아 보드에 말을 놓아요 (모둠마다 2개씩)" },
    { dur: 3200, cap: "② 별⭐이 떨어져요 — 여긴 누구 땅일까?" },
    { dur: 4600, cap: "③ 처음엔 별과 가장 가까운 딱 한 명이 정해요 (K = 1)" },
    { dur: 5600, cap: "④ 라운드가 지나면 K = 3 — 가까운 3명이 투표해요!" },
    { dur: 5600, cap: "⑤ 마지막엔 모든 곳을 색칠해 땅을 나눠요 — KNN 결정 경계!" },
  ];

  let sceneIdx = 0, sceneStart = 0, rafId = null, playing = false;

  /* ---------- 그리기 도우미 ---------- */

  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); }

  function grid() {
    c.clearRect(0, 0, cv.width, cv.height);
    c.strokeStyle = "#e2e8f0"; c.lineWidth = 1;
    for (let x = 30; x <= cv.width - 30; x += 60) { c.beginPath(); c.moveTo(x, 30); c.lineTo(x, cv.height - 30); c.stroke(); }
    for (let y = 30; y <= cv.height - 30; y += 60) { c.beginPath(); c.moveTo(30, y); c.lineTo(cv.width - 30, y); c.stroke(); }
  }

  function piece(p, scale, halo) {
    if (scale <= 0) return;
    c.beginPath(); c.arc(p.x, p.y, 14 * Math.min(scale, 1.15), 0, Math.PI * 2);
    c.fillStyle = COLORS[p.t]; c.fill();
    c.strokeStyle = halo ? INK : "#fff"; c.lineWidth = halo ? 3.5 : 2; c.stroke();
  }

  function star(x, y, size) {
    c.font = `${size || 36}px sans-serif`;
    c.fillText("⭐", x - (size || 36) / 2, y + (size || 36) / 3);
  }

  function dashTo(target, prog) {
    if (prog <= 0) return;
    const px = STAR.x + (target.x - STAR.x) * ease(prog);
    const py = STAR.y + (target.y - STAR.y) * ease(prog);
    c.setLineDash([7, 5]); c.strokeStyle = "#64748b"; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(STAR.x, STAR.y); c.lineTo(px, py); c.stroke();
    c.setLineDash([]);
  }

  function bubble(x, y, text, color) {
    c.font = "bold 20px sans-serif";
    const w = c.measureText(text).width + 26;
    c.fillStyle = "#ffffff"; c.strokeStyle = color || INK; c.lineWidth = 2.5;
    const bx = Math.min(Math.max(x - w / 2, 12), cv.width - w - 12), by = y - 46;
    c.beginPath(); c.roundRect(bx, by, w, 36, 10); c.fill(); c.stroke();
    c.fillStyle = color || INK;
    c.fillText(text, bx + 13, by + 25);
  }

  function allPieces(haloSet) {
    P.forEach((p) => piece(p, 1, haloSet && haloSet.has(p)));
  }

  /* ---------- 장면 ---------- */

  function scene0(t) {
    grid();
    P.forEach((p, i) => {
      const local = ease((t - i * 0.13) / 0.2);
      piece(p, local * (local < 1 ? 1.15 : 1));
    });
    // 손가락 커서 느낌: 다음에 놓일 자리 표시
    const i = Math.min(P.length - 1, Math.floor(t / 0.13));
    if (t < 0.85) { c.font = "26px sans-serif"; c.fillText("👆", P[i].x + 8, P[i].y + 34); }
  }

  function scene1(t) {
    grid(); allPieces();
    const drop = ease(t / 0.6);
    const y = -30 + (STAR.y + 30) * drop;
    star(STAR.x, y, 36 + (1 - drop) * 10);
    if (t > 0.7) bubble(STAR.x, STAR.y - 20, "여긴 누구 땅?", INK);
  }

  function scene2(t) {
    grid();
    const first = nb3[0].item;
    const halo = new Set(t > 0.45 ? [first] : []);
    if (t > 0.25) dashTo(first, (t - 0.25) / 0.25);
    allPieces(halo); star(STAR.x, STAR.y);
    if (t > 0.55) {
      c.beginPath(); c.arc(STAR.x, STAR.y, 26, 0, Math.PI * 2);
      c.strokeStyle = COLORS[first.t]; c.lineWidth = 4; c.stroke();
      bubble(STAR.x, STAR.y - 34, `가장 가까운 1명 → 별은 ${first.t === 0 ? "빨강" : "파랑"} 땅!`, COLORS[first.t]);
    }
  }

  function scene3(t) {
    grid();
    const halo = new Set();
    nb3.forEach((n, i) => {
      const s = 0.08 + i * 0.16;
      if (t > s) { dashTo(n.item, (t - s) / 0.16); if (t > s + 0.14) halo.add(n.item); }
    });
    allPieces(halo); star(STAR.x, STAR.y);
    if (t > 0.62) {
      const votes = [0, 0];
      nb3.forEach((n) => votes[n.item.t]++);
      const win = votes[0] >= votes[1] ? 0 : 1;
      bubble(STAR.x, STAR.y - 34, `빨강 ${votes[0]}표 · 파랑 ${votes[1]}표 → ${win === 0 ? "빨강" : "파랑"} 승리!`, COLORS[win]);
      c.beginPath(); c.arc(STAR.x, STAR.y, 26, 0, Math.PI * 2);
      c.strokeStyle = COLORS[win]; c.lineWidth = 4; c.stroke();
    }
  }

  function scene4(t) {
    grid();
    // 왼쪽에서 오른쪽으로 결정 경계 색칠 스윕
    const sweepX = 30 + (cv.width - 60) * ease(t / 0.75);
    const step = 14;
    for (let gx = 30; gx < sweepX; gx += step) {
      for (let gy = 30; gy < cv.height - 30; gy += step) {
        const nb = nearest([gx, gy], P, 3, (p) => [p.x, p.y]);
        const v = [0, 0];
        nb.forEach((n) => v[n.item.t]++);
        c.fillStyle = COLORS[v[0] >= v[1] ? 0 : 1] + "2e";
        c.fillRect(gx - step / 2, gy - step / 2, step, step);
      }
    }
    if (t < 0.75) { c.strokeStyle = "#94a3b8"; c.lineWidth = 2; c.beginPath(); c.moveTo(sweepX, 30); c.lineTo(sweepX, cv.height - 30); c.stroke(); }
    allPieces(); star(STAR.x, STAR.y, 30);
    if (t > 0.8) bubble(cv.width / 2, 90, "땅이 넓은 모둠이 최종 승리! 🏆", INK);
  }

  const RENDER = [scene0, scene1, scene2, scene3, scene4];

  /* ---------- 재생 컨트롤 ---------- */

  function renderDots() {
    dotsEl.innerHTML = SCENES.map((_, i) => `<span class="${i === sceneIdx ? "on" : ""}"></span>`).join("");
  }

  function tick(now) {
    if (!playing) return;
    const t = (now - sceneStart) / SCENES[sceneIdx].dur;
    if (t >= 1) {
      if (sceneIdx < SCENES.length - 1) { sceneIdx++; sceneStart = now; capEl.textContent = SCENES[sceneIdx].cap; renderDots(); }
      else { finish(); return; }
    }
    RENDER[sceneIdx](Math.min((now - sceneStart) / SCENES[sceneIdx].dur, 1));
    rafId = requestAnimationFrame(tick);
  }

  function play() {
    ov.style.display = "";
    playing = true; sceneIdx = 0;
    capEl.textContent = SCENES[0].cap;
    document.getElementById("intro-skip").style.display = "";
    document.getElementById("intro-replay").style.display = "none";
    document.getElementById("intro-start").style.display = "none";
    renderDots();
    sceneStart = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function finish() {
    playing = false;
    RENDER[SCENES.length - 1](1);
    capEl.textContent = "준비 끝! 이제 진짜 별을 차지해 봐요 ⭐";
    document.getElementById("intro-skip").style.display = "none";
    document.getElementById("intro-replay").style.display = "";
    document.getElementById("intro-start").style.display = "";
  }

  function close() {
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    ov.style.display = "none";
    localStorage.setItem(SEEN_KEY, "1");
  }

  document.getElementById("intro-skip").addEventListener("click", close);
  document.getElementById("intro-start").addEventListener("click", close);
  document.getElementById("intro-replay").addEventListener("click", play);
  document.getElementById("intro-open").addEventListener("click", play);

  // 첫 방문이면 자동 재생
  if (!localStorage.getItem(SEEN_KEY)) play();
})();
