/* game.js — KNN 땅따먹기 (4·6학년 공통, 순수 클라이언트 · 저장 없음)
 * 별(새 데이터)의 주인을 가까운 이웃 K명의 투표로 정한다 = KNN 분류 그 자체. */

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

const TEAM_META = [
  { name: "빨강 모둠", color: "#ef4444" },
  { name: "파랑 모둠", color: "#3b82f6" },
  { name: "초록 모둠", color: "#16a34a" },
  { name: "보라 모둠", color: "#9333ea" },
];
const PIECES_PER_ROUND = 2; // 라운드마다 모둠당 말 2개
const MARGIN = 30;          // 보드 가장자리 여백

let teamCount = 3;
let level = "easy";         // easy: K 1,1,3,3 / hard: K 1,1,3,3,5
let ROUND_K = [];

let teams = [];             // {name, color, stars, land}
let pieces = [];            // {x, y, team}
let placeQueue = [];        // 이번 라운드에 말 놓을 팀 순서
let roundIdx = 0;
let phase = "setup";        // setup | place | drop | reveal | end
let lastStar = null;        // {x, y, nb:[{item,dist}], winner, votes}
let starHistory = [];       // 지난 라운드 별들 {x, y, winner}

const canvas = $("#game-board");
const ctx = canvas.getContext("2d");

/* ---------- 설정 ---------- */

$all("#team-count-row button").forEach((b) => b.addEventListener("click", () => {
  $all("#team-count-row button").forEach((x) => x.classList.remove("on"));
  b.classList.add("on");
  teamCount = Number(b.dataset.n);
}));
$all("#level-row button").forEach((b) => b.addEventListener("click", () => {
  $all("#level-row button").forEach((x) => x.classList.remove("on"));
  b.classList.add("on");
  level = b.dataset.l;
}));

$("#start-btn").addEventListener("click", startGame);
$("#reset-btn").addEventListener("click", () => { if (phase === "setup" || confirm("게임을 처음부터 다시 할까요?")) resetAll(); });
$("#drop-btn").addEventListener("click", dropStar);
$("#next-btn").addEventListener("click", nextRound);
$("#territory-toggle").addEventListener("change", draw);

function resetAll() {
  teams = []; pieces = []; starHistory = []; lastStar = null;
  roundIdx = 0; phase = "setup";
  $("#setup-card").style.display = "";
  $("#play-card").style.display = "none";
  $("#verdict").style.display = "none";
  $("#territory-toggle").checked = false;
  $("#k-pill").textContent = "K = 1";
  $("#round-label").textContent = "준비";
  setMsg("모둠 수를 고르고 게임을 시작하세요!", "");
  draw();
}

function startGame() {
  ROUND_K = level === "easy" ? [1, 1, 3, 3] : [1, 1, 3, 3, 5];
  teams = TEAM_META.slice(0, teamCount).map((t) => ({ ...t, stars: 0, land: 0 }));
  pieces = []; starHistory = []; lastStar = null;
  roundIdx = 0;
  $("#setup-card").style.display = "none";
  $("#play-card").style.display = "";
  beginRound();
}

/* ---------- 라운드 진행 ---------- */

function beginRound() {
  phase = "place";
  lastStar = null;
  $("#verdict").style.display = "none";
  $("#next-btn").style.display = "none";
  $("#drop-btn").style.display = "";
  $("#drop-btn").disabled = true;

  // 공평하게 시작 모둠을 라운드마다 한 칸씩 민다
  placeQueue = [];
  for (let rep = 0; rep < PIECES_PER_ROUND; rep++)
    for (let i = 0; i < teams.length; i++)
      placeQueue.push((roundIdx + i) % teams.length);

  $("#k-pill").textContent = `K = ${ROUND_K[roundIdx]}`;
  $("#round-label").textContent = `라운드 ${roundIdx + 1} / ${ROUND_K.length}`;
  updateTurnUI();
  draw();
}

function updateTurnUI() {
  renderTeams();
  if (phase === "place" && placeQueue.length) {
    const t = teams[placeQueue[0]];
    setMsg(`${t.name} 차례 — 보드를 눌러 말을 놓으세요!`,
      `이번 라운드에 모둠마다 ${PIECES_PER_ROUND}개씩 놓아요. 별⭐이 어디에 떨어져도 우리 땅이 되게 자리를 잡아 봐요.`);
  } else if (phase === "drop") {
    setMsg("말을 다 놓았어요! ⭐ 별을 떨어뜨리세요.",
      `별이 떨어지면 가장 가까운 이웃 ${ROUND_K[roundIdx]}명이 투표해요. 누르기 전에 "어디에 떨어지면 누구 땅?"을 예상해 봐요!`);
  }
}

function setMsg(a, b) { $("#phase-msg").textContent = a; $("#phase-sub").textContent = b; }

function renderTeams() {
  const box = $("#team-list");
  box.innerHTML = "";
  teams.forEach((t, i) => {
    const el = document.createElement("div");
    el.className = "team-row" + (phase === "place" && placeQueue.length && placeQueue[0] === i ? " turn" : "");
    el.innerHTML = `<span class="team-dot" style="background:${t.color}"></span>
      <span class="team-name">${t.name}</span>
      <span class="team-score">⭐ ${t.stars}</span>`;
    box.appendChild(el);
  });
}

/* ---------- 말 놓기 ---------- */

canvas.addEventListener("click", (e) => {
  if (phase !== "place" || !placeQueue.length) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (x < MARGIN || x > canvas.width - MARGIN || y < MARGIN || y > canvas.height - MARGIN) return;
  // 말끼리 너무 겹치지 않게
  if (pieces.some((p) => Math.hypot(p.x - x, p.y - y) < 26)) {
    setMsg("거기는 말이 이미 있어요! 조금 떨어진 곳을 눌러요.", "");
    return;
  }
  pieces.push({ x, y, team: placeQueue.shift() });
  if (!placeQueue.length) phase = "drop";
  if (phase === "drop") $("#drop-btn").disabled = false;
  updateTurnUI();
  draw();
});

/* ---------- 별 낙하 + KNN 판정 ---------- */

function dropStar() {
  if (phase !== "drop") return;
  let x, y, tries = 0;
  do {
    x = MARGIN + 20 + Math.random() * (canvas.width - (MARGIN + 20) * 2);
    y = MARGIN + 20 + Math.random() * (canvas.height - (MARGIN + 20) * 2);
    tries++;
  } while (tries < 60 && pieces.some((p) => Math.hypot(p.x - x, p.y - y) < 34));

  const k = Math.min(ROUND_K[roundIdx], pieces.length);
  const nb = nearest([x, y], pieces, k, (p) => [p.x, p.y]);

  // 투표 집계 — 동점이면 더 가까운 말이 속한 모둠 (nb는 가까운 순서라 먼저 나온 팀이 이긴다)
  const votes = {};
  nb.forEach((n) => { votes[n.item.team] = (votes[n.item.team] || 0) + 1; });
  let winner = null, best = -1;
  nb.forEach((n) => {
    const t = n.item.team;
    if (votes[t] > best) { best = votes[t]; winner = t; }
  });

  teams[winner].stars++;
  lastStar = { x, y, nb, votes, winner };
  phase = "reveal";
  $("#drop-btn").style.display = "none";

  const voteTxt = Object.keys(votes).map((t) => `${teams[t].name.replace(" 모둠", "")} ${votes[t]}표`).join(" · ");
  const tie = Object.values(votes).filter((v) => v === best).length > 1;
  const v = $("#verdict");
  v.style.display = "";
  v.innerHTML = `⭐ 이웃 ${k}명의 투표: <strong>${voteTxt}</strong><br>
    ${tie ? `동점! 이럴 땐 <strong>더 가까운 말</strong>이 있는 모둠이 이겨요.<br>` : ""}
    👉 별은 <strong style="color:${teams[winner].color}">${teams[winner].name}</strong> 땅!`;
  setMsg(`별은 ${teams[winner].name} 차지!`,
    k === 1 ? "지금은 가장 가까운 한 명이 전부 정해요. 다음엔 여러 명에게 물어봐요!"
            : "표가 많은 모둠이 이겨요 — 이게 바로 KNN의 다수결 투표!");

  const isLast = roundIdx === ROUND_K.length - 1;
  $("#next-btn").textContent = isLast ? "🏆 최종 결과 — 땅 나누기" : "다음 라운드 →";
  $("#next-btn").style.display = "";
  renderTeams();
  draw();
}

function nextRound() {
  if (lastStar) starHistory.push({ x: lastStar.x, y: lastStar.y, winner: lastStar.winner });
  if (roundIdx === ROUND_K.length - 1) { endGame(); return; }
  roundIdx++;
  beginRound();
}

/* ---------- 종료: KNN 결정 경계로 땅 나누기 ---------- */

function endGame() {
  phase = "end";
  lastStar = null;
  $("#drop-btn").style.display = "none";
  $("#next-btn").style.display = "none";
  $("#verdict").style.display = "none";
  $("#territory-toggle").checked = true;

  const counts = computeTerritory();
  const total = counts.reduce((s, c) => s + c, 0);
  teams.forEach((t, i) => { t.land = Math.round((counts[i] / total) * 100); });

  // 우승: 별 우선, 동점이면 땅 넓이
  const ranked = teams.map((t, i) => ({ ...t, i }))
    .sort((a, b) => (b.stars - a.stars) || (b.land - a.land));
  const champ = ranked[0];

  setMsg(`🏆 우승은 ${champ.name}! (⭐ ${champ.stars}개 · 땅 ${champ.land}%)`,
    "보드의 모든 곳을 '여기에 별이 떨어지면 누구 땅?'으로 색칠한 게 아래 지도예요 — 이 경계선을 KNN 결정 경계라고 해요.");

  const v = $("#verdict");
  v.style.display = "";
  v.innerHTML = ranked.map((t, ri) =>
    `${ri === 0 ? "🥇" : ri === 1 ? "🥈" : ri === 2 ? "🥉" : "🎖"} <strong style="color:${t.color}">${t.name}</strong> — ⭐ ${t.stars}개 · 땅 ${t.land}%`
  ).join("<br>") + `<br><span class="hint">다시 하려면 오른쪽 위 '처음부터'를 누르세요.</span>`;
  renderTeams();
  draw();
}

/* ---------- 그리기 ---------- */

function computeTerritory() {
  // 현재 K로 보드 전체를 촘촘히 검사해 각 지점의 주인을 정한다 (결정 경계)
  const k = Math.min(ROUND_K[Math.min(roundIdx, ROUND_K.length - 1)], pieces.length);
  const counts = teams.map(() => 0);
  if (!pieces.length) return counts;
  const step = 12;
  for (let gx = MARGIN; gx < canvas.width - MARGIN; gx += step) {
    for (let gy = MARGIN; gy < canvas.height - MARGIN; gy += step) {
      const nb = nearest([gx, gy], pieces, k, (p) => [p.x, p.y]);
      const votes = {};
      nb.forEach((n) => { votes[n.item.team] = (votes[n.item.team] || 0) + 1; });
      let w = null, best = -1;
      nb.forEach((n) => { const t = n.item.team; if (votes[t] > best) { best = votes[t]; w = t; } });
      counts[w]++;
    }
  }
  return counts;
}

function drawTerritory() {
  const k = Math.min(ROUND_K[Math.min(roundIdx, ROUND_K.length - 1)], pieces.length);
  if (!pieces.length) return;
  const step = 12;
  for (let gx = MARGIN; gx < canvas.width - MARGIN; gx += step) {
    for (let gy = MARGIN; gy < canvas.height - MARGIN; gy += step) {
      const nb = nearest([gx, gy], pieces, k, (p) => [p.x, p.y]);
      const votes = {};
      nb.forEach((n) => { votes[n.item.team] = (votes[n.item.team] || 0) + 1; });
      let w = null, best = -1;
      nb.forEach((n) => { const t = n.item.team; if (votes[t] > best) { best = votes[t]; w = t; } });
      ctx.fillStyle = teams[w].color + "2e";
      ctx.fillRect(gx - step / 2, gy - step / 2, step, step);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 바탕 격자
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
  for (let x = MARGIN; x <= canvas.width - MARGIN; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, MARGIN); ctx.lineTo(x, canvas.height - MARGIN); ctx.stroke();
  }
  for (let y = MARGIN; y <= canvas.height - MARGIN; y += 60) {
    ctx.beginPath(); ctx.moveTo(MARGIN, y); ctx.lineTo(canvas.width - MARGIN, y); ctx.stroke();
  }

  if ($("#territory-toggle").checked) drawTerritory();

  // 지난 별 (연하게)
  starHistory.forEach((s) => {
    ctx.font = "22px sans-serif"; ctx.globalAlpha = 0.45;
    ctx.fillText("⭐", s.x - 11, s.y + 8);
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(s.x, s.y, 15, 0, Math.PI * 2);
    ctx.strokeStyle = teams[s.winner].color; ctx.lineWidth = 2.5; ctx.stroke();
  });

  // 이번 별의 이웃 연결선
  if (lastStar) {
    ctx.setLineDash([6, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = "#94a3b8";
    lastStar.nb.forEach((n) => {
      ctx.beginPath(); ctx.moveTo(lastStar.x, lastStar.y); ctx.lineTo(n.item.x, n.item.y); ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  // 말
  pieces.forEach((p) => {
    const isNb = lastStar && lastStar.nb.some((n) => n.item === p);
    ctx.beginPath(); ctx.arc(p.x, p.y, isNb ? 15 : 12, 0, Math.PI * 2);
    ctx.fillStyle = teams[p.team].color; ctx.fill();
    ctx.strokeStyle = isNb ? "#0f172a" : "#ffffff"; ctx.lineWidth = isNb ? 3 : 2; ctx.stroke();
  });

  // 이번 별 (크게)
  if (lastStar) {
    ctx.font = "34px sans-serif";
    ctx.fillText("⭐", lastStar.x - 17, lastStar.y + 12);
  }
}

resetAll();
