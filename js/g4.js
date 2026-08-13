/* g4.js — 4학년 감정일기 × KNN (6차시) */

/* ---------- 공통 데이터 ---------- */

const STATES = {
  green:  { name: "쌩쌩 충전 완료", emoji: "🌞", cls: "state-green",  color: "#16a34a" },
  yellow: { name: "쉬엄쉬엄 가기",   emoji: "⛅", cls: "state-yellow", color: "#d97706" },
  blue:   { name: "포근한 쉼 필요",  emoji: "🌙", cls: "state-blue",   color: "#2563eb" },
};

/* 가상 학생 12명 — [활력, 집중, 관계], 상태 라벨 */
const VIRTUAL = [
  { name: "가상1", v: 4.5, f: 4.2, r: 4.3, s: "green" },
  { name: "가상2", v: 4.8, f: 3.8, r: 4.0, s: "green" },
  { name: "가상3", v: 4.0, f: 4.6, r: 3.8, s: "green" },
  { name: "가상4", v: 3.9, f: 4.1, r: 4.5, s: "green" },
  { name: "가상5", v: 3.2, f: 2.8, r: 3.4, s: "yellow" },
  { name: "가상6", v: 3.5, f: 3.3, r: 2.9, s: "yellow" },
  { name: "가상7", v: 2.8, f: 3.5, r: 3.1, s: "yellow" },
  { name: "가상8", v: 3.1, f: 2.5, r: 3.6, s: "yellow" },
  { name: "가상9", v: 1.8, f: 2.0, r: 2.2, s: "blue" },
  { name: "가상10", v: 2.2, f: 1.6, r: 2.6, s: "blue" },
  { name: "가상11", v: 1.5, f: 2.6, r: 1.9, s: "blue" },
  { name: "가상12", v: 2.4, f: 1.9, r: 1.6, s: "blue" },
];

const DAILY_QUESTIONS = [
  "아침에 일어날 때 몸에 힘이 있었다.",            // 활력
  "오늘 몸이 가볍고 씩씩하게 움직였다.",
  "쉬는 시간과 노는 시간이 즐거웠다.",
  "수업 시간에 집중이 잘 되었다.",                  // 집중
  "해야 할 일을 미루지 않고 끝까지 했다.",
  "딴생각이 나도 금방 다시 집중할 수 있었다.",
  "친구와 사이좋게 지냈다.",                        // 관계
  "고맙거나 기분 좋은 말을 주고받았다.",
  "속상한 일이 있어도 이야기하거나 금방 풀 수 있었다.",
  "누군가를 도와주거나 도움을 받았다.",
];

function scoresFrom(answers) {
  const avg = (arr) => Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10;
  return {
    v: avg(answers.slice(0, 3)),
    f: avg(answers.slice(3, 6)),
    r: avg(answers.slice(6, 10)),
  };
}

/* KNN으로 상태 정하기 — 학급 데이터가 8개 이상이면 학급 데이터, 아니면 가상 데이터 */
function classifyState(point3, classData, k) {
  const pool = (classData && classData.length >= 8) ? classData : VIRTUAL.map((x) => ({ v: x.v, f: x.f, r: x.r, s: x.s }));
  return knnClassify(point3, pool, k || 3, (d) => [d.v, d.f, d.r], (d) => d.s);
}

/* ---------- 1차시: 취향 카드 ---------- */

const THEME_CARDS = [
  { id: 0, name: "롤러코스터", emoji: "🎢" },
  { id: 1, name: "귀신의 집", emoji: "👻" },
  { id: 2, name: "회전목마", emoji: "🎠" },
  { id: 3, name: "바이킹", emoji: "🚢" },
  { id: 4, name: "범퍼카", emoji: "🚗" },
  { id: 5, name: "대관람차", emoji: "🎡" },
  { id: 6, name: "간식 먹기", emoji: "🍭" },
  { id: 7, name: "기념품 가게", emoji: "🎁" },
];

const CARD_FRIENDS = [
  { name: "초코", picks: [0, 1, 3, 4] },
  { name: "딸기", picks: [2, 5, 6, 7] },
  { name: "바다", picks: [0, 3, 4, 6] },
  { name: "숲", picks: [2, 5, 6, 3] },
  { name: "별", picks: [1, 0, 4, 7] },
  { name: "달", picks: [2, 6, 7, 5] },
  { name: "구름", picks: [5, 6, 2, 0] },
  { name: "번개", picks: [0, 1, 4, 3] },
  { name: "무지개", picks: [2, 5, 7, 1] },
  { name: "솜사탕", picks: [6, 7, 2, 5] },
];

let myPicks = new Set();

function initTab1() {
  const grid = $("#theme-cards");
  THEME_CARDS.forEach((c) => {
    const el = document.createElement("div");
    el.className = "mini-card selectable";
    el.innerHTML = `<span class="emoji">${c.emoji}</span><strong>${c.name}</strong>`;
    el.addEventListener("click", () => {
      if (myPicks.has(c.id)) { myPicks.delete(c.id); el.classList.remove("selected"); }
      else if (myPicks.size < 4) { myPicks.add(c.id); el.classList.add("selected"); }
      $("#card-count-hint").textContent = `${myPicks.size} / 4 장 골랐어요`;
      $("#card-match-btn").disabled = myPicks.size !== 4;
    });
    grid.appendChild(el);
  });

  $("#card-match-btn").addEventListener("click", () => {
    const mine = Array.from(myPicks);
    const overlap = (picks) => picks.filter((p) => myPicks.has(p)).length;
    const ranked = CARD_FRIENDS
      .map((f) => ({ ...f, ov: overlap(f.picks) }))
      .sort((a, b) => b.ov - a.ov);

    let html = `<table class="data"><tr><th>순위</th><th>친구</th><th>고른 카드</th><th>겹친 수</th></tr>`;
    ranked.forEach((f, i) => {
      const cards = f.picks.map((p) => THEME_CARDS[p].emoji).join(" ");
      html += `<tr class="${i < 3 ? "hl" : ""}"><td>${i + 1}</td><td>${f.name}</td><td>${cards}</td><td>${f.ov}장</td></tr>`;
    });
    html += `</table><p class="hint" style="margin-top:0.5rem">K=3이라면? 나의 가장 가까운 이웃은 <strong>${ranked.slice(0, 3).map((f) => f.name).join(", ")}</strong>!</p>`;
    $("#card-ranking").innerHTML = html;
    $("#card-result").style.display = "";
    $("#card-result").scrollIntoView({ behavior: "smooth" });
  });

  $("#card-save-btn").addEventListener("click", async () => {
    try {
      await ownedSet(subCol(Join.code, "cards").doc(String(Join.num)), {
        num: Number(Join.num), picks: Array.from(myPicks),
      });
      $("#card-save-msg").textContent = "저장 완료! 친구들이 저장하면 우리 반 순위도 나와요.";
      markTabDone("t1");
      showNextBtn("card-result", "t1");
      loadClassCards();
    } catch (e) { $("#card-save-msg").textContent = e.message.includes("번호") ? e.message : friendlyError(e); }
  });
}

async function loadClassCards() {
  const snap = await subCol(Join.code, "cards").get();
  const others = [];
  snap.forEach((d) => { const x = d.data(); if (String(x.num) !== String(Join.num)) others.push(x); });
  if (!others.length || myPicks.size !== 4) return;
  const ranked = others
    .map((o) => ({ num: o.num, ov: (o.picks || []).filter((p) => myPicks.has(p)).length }))
    .sort((a, b) => b.ov - a.ov)
    .slice(0, 5);
  let html = `<h3>우리 반에서 나와 가까운 이웃</h3><table class="data"><tr><th>친구</th><th>겹친 수</th></tr>`;
  ranked.forEach((r) => { html += `<tr><td>${Number(r.num)||''}번</td><td>${r.ov}장</td></tr>`; });
  html += `</table>`;
  $("#class-card-ranking").innerHTML = html;
}

/* ---------- 2차시: 하루를 숫자로 ---------- */

let getDailyAnswers = null;
let myToday = null; // {v,f,r}

function barRow(label, val, color) {
  const pct = (val / 5) * 100;
  return `<div style="margin-bottom:0.7rem">
    <div style="display:flex; justify-content:space-between; font-weight:700"><span>${label}</span><span>${val} / 5</span></div>
    <div style="background:#e2e8f0; border-radius:8px; height:22px; overflow:hidden">
      <div style="width:${pct}%; height:100%; background:${color}; border-radius:8px; transition:width 0.6s"></div>
    </div></div>`;
}

function initTab2() {
  getDailyAnswers = renderLikert("daily-survey", DAILY_QUESTIONS);

  $("#daily-calc-btn").addEventListener("click", () => {
    const ans = getDailyAnswers();
    if (!ans) { alert(likertMissingMsg("daily-survey")); return; }
    myToday = scoresFrom(ans);
    myToday.answers = ans;
    $("#daily-bars").innerHTML =
      barRow("⚡ 활력 (1~3번)", myToday.v, "#f59e0b") +
      barRow("🎯 집중 (4~6번)", myToday.f, "#4f46e5") +
      barRow("🤝 관계 (7~10번)", myToday.r, "#16a34a");
    $("#daily-result").style.display = "";
    $("#daily-result").scrollIntoView({ behavior: "smooth" });
  });

  $("#daily-save-btn").addEventListener("click", async () => {
    if (!myToday) return;
    try {
      const st = classifyState([myToday.v, myToday.f, myToday.r], null, 3).label;
      // 개인정보 최소화: 문항별 원답(answers)은 저장하지 않고 요약 점수만 저장.
      await ownedSet(subCol(Join.code, "entries").doc(`${Join.num}_${todayStr()}`), {
        num: Number(Join.num), date: todayStr(),
        v: myToday.v, f: myToday.f, r: myToday.r, state: st,
      });
      $("#daily-save-msg").textContent = "저장 완료! (오늘 다시 저장하면 새 기록으로 바뀌어요)";
      markTabDone("t2");
      showNextBtn("daily-result", "t2");
    } catch (e) { $("#daily-save-msg").textContent = e.message.includes("번호") ? e.message : friendlyError(e); }
  });
}

/* ---------- 3차시: KNN 손으로 ---------- */

const CV = { margin: 55, min: 0.5, max: 5.5 };
let myPoint = null; // {v, f}

function toPx(canvas, v, f) {
  const w = canvas.width - CV.margin * 2;
  const x = CV.margin + ((v - CV.min) / (CV.max - CV.min)) * w;
  const y = canvas.height - CV.margin - ((f - CV.min) / (CV.max - CV.min)) * (canvas.height - CV.margin * 2);
  return [x, y];
}
function fromPx(canvas, px, py) {
  const w = canvas.width - CV.margin * 2;
  const v = CV.min + ((px - CV.margin) / w) * (CV.max - CV.min);
  const f = CV.min + ((canvas.height - CV.margin - py) / (canvas.height - CV.margin * 2)) * (CV.max - CV.min);
  return [Math.max(1, Math.min(5, Math.round(v * 10) / 10)), Math.max(1, Math.min(5, Math.round(f * 10) / 10))];
}

function drawAxes(ctx, canvas, xLabel, yLabel) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#cbd5e1"; ctx.fillStyle = "#64748b";
  ctx.font = "15px sans-serif"; ctx.lineWidth = 1;
  for (let t = 1; t <= 5; t++) {
    const [x] = toPx(canvas, t, 1);
    const [, y] = toPx(canvas, 1, t);
    ctx.beginPath(); ctx.moveTo(x, CV.margin); ctx.lineTo(x, canvas.height - CV.margin); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CV.margin, y); ctx.lineTo(canvas.width - CV.margin, y); ctx.stroke();
    ctx.fillText(String(t), x - 4, canvas.height - CV.margin + 24);
    ctx.fillText(String(t), CV.margin - 28, y + 5);
  }
  ctx.font = "bold 16px sans-serif"; ctx.fillStyle = "#334155";
  ctx.fillText(xLabel, canvas.width / 2 - 30, canvas.height - 12);
  ctx.save(); ctx.translate(16, canvas.height / 2 + 30); ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0); ctx.restore();
}

function drawKnn() {
  const canvas = $("#knn-canvas");
  const ctx = canvas.getContext("2d");
  drawAxes(ctx, canvas, "활력 →", "집중 →");
  const k = Number($("#knn-k").value);

  let nb = [];
  if (myPoint) {
    nb = nearest([myPoint.v, myPoint.f], VIRTUAL, k, (d) => [d.v, d.f]);
    // 이웃 연결선
    ctx.strokeStyle = "#94a3b8"; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    const [mx, my] = toPx(canvas, myPoint.v, myPoint.f);
    nb.forEach((n) => {
      const [x, y] = toPx(canvas, n.item.v, n.item.f);
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(x, y); ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  VIRTUAL.forEach((d) => {
    const [x, y] = toPx(canvas, d.v, d.f);
    const isNb = nb.some((n) => n.item === d);
    ctx.beginPath(); ctx.arc(x, y, isNb ? 12 : 9, 0, Math.PI * 2);
    ctx.fillStyle = STATES[d.s].color; ctx.fill();
    if (isNb) { ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2.5; ctx.stroke(); }
  });

  if (myPoint) {
    const [mx, my] = toPx(canvas, myPoint.v, myPoint.f);
    ctx.beginPath(); ctx.arc(mx, my, 13, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.fillText("나", mx - 7, my + 5);
    updateKnnPanel(nb, k);
  }
}

function updateKnnPanel(nb, k) {
  const all = nearest([myPoint.v, myPoint.f], VIRTUAL, 5, (d) => [d.v, d.f]);
  // 4학년은 √·음수를 안 배웠으므로 '차이(크기)'와 '거리(가까움 순위)'만 보여준다.
  let html = `<table class="data"><tr><th>친구</th><th>활력 차이</th><th>집중 차이</th><th>거리<br>(작을수록 가까움)</th><th>순위</th><th>상태</th></tr>`;
  all.forEach((n, i) => {
    const dv = Math.abs(Math.round((n.item.v - myPoint.v) * 10) / 10);
    const df = Math.abs(Math.round((n.item.f - myPoint.f) * 10) / 10);
    const st = STATES[n.item.s];
    html += `<tr class="${i < k ? "hl" : ""}"><td>${n.item.name}</td><td>${dv}</td><td>${df}</td>
      <td><strong>${n.dist.toFixed(1)}</strong></td><td>${i + 1}위</td><td>${st.emoji}</td></tr>`;
  });
  html += `</table><p class="hint">초록 줄 = 지금 뽑힌 가까운 이웃 ${k}명 · 거리는 두 점 사이를 자로 잰 길이예요(작을수록 비슷).</p>
    <details style="margin-top:0.4rem"><summary class="hint" style="cursor:pointer">🔎 거리는 어떻게 재나요? (더 알아보기)</summary>
    <p class="hint">두 점의 가로 차이와 세로 차이로 '대각선 길이'를 재요. 활력 차이와 집중 차이가 둘 다 작을수록 거리가 가까워요.</p></details>`;
  $("#knn-table").innerHTML = html;

  const res = knnClassify([myPoint.v, myPoint.f], VIRTUAL, k, (d) => [d.v, d.f], (d) => d.s);
  const st = STATES[res.label];
  const voteCounts = Object.values(res.votes);
  const top = Math.max(...voteCounts);
  const tie = voteCounts.filter((c) => c === top).length > 1; // 최다 득표가 둘 이상 = 동점
  const voteTxt = Object.keys(res.votes).map((l) => `${STATES[l].emoji} ${res.votes[l]}표`).join(" · ");
  $("#knn-verdict").innerHTML = `이웃 ${k}명의 투표: ${voteTxt}<br>
    ${tie ? `<span class="hint">동점이에요! 이럴 땐 가장 가까운 친구를 따라 정했어요.</span><br>` : ""}
    <span class="state-card ${st.cls}" style="margin-top:0.5rem">${st.emoji} 오늘의 상태 카드: ${st.name}</span>`;
  markTabDone("t3");
}

function initTab3() {
  const canvas = $("#knn-canvas");
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const [v, f] = fromPx(canvas, px, py);
    myPoint = { v, f };
    $("#knn-mypos").textContent = `내 위치: 활력 ${v}, 집중 ${f}  (다른 곳을 누르면 옮길 수 있어요)`;
    drawKnn();
  });
  $("#knn-k").addEventListener("input", () => {
    $("#knn-k-val").textContent = $("#knn-k").value;
    drawKnn();
  });
  document.addEventListener("tabshow", (e) => {
    if (e.detail === "t3") {
      if (!myPoint && myToday) {
        myPoint = { v: myToday.v, f: myToday.f };
        $("#knn-mypos").textContent = `내 위치(2차시 점수): 활력 ${myToday.v}, 집중 ${myToday.f}  (다른 곳을 누르면 옮길 수 있어요)`;
      }
      drawKnn();
    }
  });
}

/* ---------- 4차시: 그래프 읽기 ---------- */

async function loadScatter() {
  const canvas = $("#scatter-canvas");
  const ctx = canvas.getContext("2d");
  drawAxes(ctx, canvas, "활력 →", "집중 →");

  const snap = await subCol(Join.code, "entries").get();
  const rows = [];
  snap.forEach((d) => { const x = d.data(); if (x.date === todayStr()) rows.push(x); });
  $("#scatter-info").textContent = ` 오늘 기록 ${rows.length}개 (누가 누구인지 번호는 숨겨요 — 모양만 봐요)`;

  if (!rows.length) {
    ctx.fillStyle = "#94a3b8"; ctx.font = "bold 17px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("아직 저장된 기록이 없어요.", canvas.width / 2, canvas.height / 2 - 12);
    ctx.fillText("2차시에서 '오늘 기록 저장하기'를 누르면", canvas.width / 2, canvas.height / 2 + 14);
    ctx.fillText("여기에 점이 생겨요!", canvas.width / 2, canvas.height / 2 + 40);
    ctx.textAlign = "left";
  }

  const counts = { green: 0, yellow: 0, blue: 0 };
  rows.forEach((e) => {
    const st = e.state || classifyState([e.v, e.f, e.r], null, 3).label;
    counts[st] = (counts[st] || 0) + 1;
    const [x, y] = toPx(canvas, e.v, e.f);
    // 학생 화면에는 번호를 표시하지 않는다(감정 노출 방지). 번호별 확인은 교사 대시보드에서.
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = STATES[st].color + "cc"; ctx.fill();
  });
  if (rows.length) markTabDone("t4");

  const total = Math.max(1, rows.length);
  $("#dist-bars").innerHTML = Object.keys(STATES).map((s) => {
    const pct = (counts[s] / total) * 100;
    return `<div style="margin-bottom:0.7rem">
      <div style="display:flex; justify-content:space-between; font-weight:700">
        <span>${STATES[s].emoji} ${STATES[s].name}</span><span>${counts[s]}명</span></div>
      <div style="background:#e2e8f0; border-radius:8px; height:22px; overflow:hidden">
        <div style="width:${pct}%; height:100%; background:${STATES[s].color}; border-radius:8px; transition:width 0.6s"></div>
      </div></div>`;
  }).join("");
}

function initTab4() {
  $("#scatter-reload").addEventListener("click", loadScatter);
  document.addEventListener("tabshow", (e) => { if (e.detail === "t4") loadScatter(); });
}

/* ---------- 5차시: 웹앱 기획 ---------- */

const PLAN_FEATURES = ["기분 설문", "상태 카드 결과", "그래프 보기", "AI 한마디", "비밀 지키기(내 이름 안 보이게)", "기록 모아 보기"];

function initTab5() {
  const grid = $("#plan-feats");
  PLAN_FEATURES.forEach((f) => {
    const el = document.createElement("div");
    el.className = "mini-card selectable";
    el.innerHTML = `<strong>${f}</strong>`;
    el.addEventListener("click", () => el.classList.toggle("selected"));
    grid.appendChild(el);
  });

  $("#plan-save-btn").addEventListener("click", async () => {
    const feats = $all("#plan-feats .selected").map((el) => el.textContent);
    const doc = {
      num: Number(Join.num),
      name: $("#plan-name").value.trim(),
      who: $("#plan-who").value.trim(),
      features: feats,
      screen: $("#plan-screen").value.trim(),
      worry: $("#plan-worry").value.trim(),
    };
    if (!doc.name) { $("#plan-save-msg").textContent = "앱 이름을 지어 주세요!"; return; }
    try {
      await ownedSet(subCol(Join.code, "plans").doc(String(Join.num)), doc);
      $("#plan-save-msg").textContent = "제출 완료! 선생님 대시보드로 전달됐어요.";
      markTabDone("t5");
      showNextBtn("t5", "t5");
    } catch (e) { $("#plan-save-msg").textContent = e.message.includes("번호") ? e.message : friendlyError(e); }
  });
}

/* ---------- 6차시: 완성 앱 + 검토 ---------- */

let getAppAnswers = null;

function initTab6() {
  getAppAnswers = renderLikert("app-survey", DAILY_QUESTIONS);

  $("#app-run-btn").addEventListener("click", async () => {
    const ans = getAppAnswers();
    if (!ans) { alert(likertMissingMsg("app-survey")); return; }
    const sc = scoresFrom(ans);

    // 우리 반 데이터 불러와 KNN (내 오늘 기록은 제외)
    const snap = await subCol(Join.code, "entries").get();
    const pool = [];
    let hadToday = false;
    snap.forEach((d) => {
      const x = d.data();
      if (d.id === `${Join.num}_${todayStr()}`) hadToday = true;
      else pool.push({ v: x.v, f: x.f, r: x.r, s: x.state || "yellow" });
    });
    // 오늘 이미 저장한 기록이 있으면 덮어쓰기 전에 확인
    if (hadToday && !confirm("오늘 이미 저장한 기록이 있어요. 이 답으로 새로 저장할까요?")) return;

    const res = classifyState([sc.v, sc.f, sc.r], pool, 3);
    const st = STATES[res.label];
    const source = pool.length >= 8 ? `우리 반 기록 ${pool.length}개` : "연습용 데이터 12개";

    $("#app-verdict").innerHTML = `활력 ${sc.v} · 집중 ${sc.f} · 관계 ${sc.r}<br>
      <span class="state-card ${st.cls}" style="margin-top:0.4rem">${st.emoji} ${st.name}</span>
      <div class="hint" style="margin-top:0.3rem">KNN이 ${source}에서 나와 가장 비슷한 친구 3명을 찾아 투표로 정했어요. (오늘 기록으로 저장됐어요)</div>`;
    $("#app-result").style.display = "";
    markTabDone("t6");

    // 오늘 기록으로도 저장 (원답 배열은 저장하지 않음)
    ownedSet(subCol(Join.code, "entries").doc(`${Join.num}_${todayStr()}`), {
      num: Number(Join.num), date: todayStr(),
      v: sc.v, f: sc.f, r: sc.r, state: res.label,
    }).catch(() => {});

    // AI 코멘트 (교사 설정 — 호출 직전 재확인)
    const cEl = $("#app-comment");
    if (!(await aiEnabled("aiComment"))) { cEl.innerHTML = ""; return; }
    cEl.innerHTML = `💬 입력한 내용은 AI 회사(Upstage) 서버로 보내져요. <span class="loading">AI가 한마디를 쓰는 중</span>`;
    try {
      const comment = await askSolar([
        { role: "system", content: "너는 초등학교 4학년 학생의 감정일기에 짧고 따뜻한 한마디를 남기는 도우미야. 2~3문장, 부드러운 해요체로 공감하고 응원해줘. 점수를 평가하거나 훈계하지 말고, 이모지는 1개만. 학생 이름은 모르니 부르지 마." },
        { role: "user", content: `오늘 나의 점수(5점 만점): 활력 ${sc.v}, 집중 ${sc.f}, 관계 ${sc.r}. 상태 카드: ${st.name}. 나에게 한마디를 남겨줘.` },
      ], 0.7);
      cEl.innerHTML = `💬 <strong>AI의 한마디</strong><br>${esc(comment)}`;
    } catch (e) {
      cEl.innerHTML = `<span class="hint">지금은 AI가 바빠요. 잠시 뒤 분석하기를 다시 눌러 보세요.</span>`;
    }
  });

  // 검토 별점
  const items = ["사용하기 쉬웠나요?", "결과가 잘 맞는 것 같나요?", "친구에게 추천하고 싶나요?"];
  const grid = $("#review-stars");
  items.forEach((t, idx) => {
    const el = document.createElement("div");
    el.className = "mini-card";
    el.innerHTML = `<strong>${t}</strong><div class="likert" style="margin-top:0.4rem" id="stars-${idx}"></div>`;
    grid.appendChild(el);
    const row = el.querySelector(".likert");
    for (let v = 1; v <= 5; v++) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = "★";
      b.addEventListener("click", () => {
        row.dataset.value = v;
        Array.from(row.children).forEach((x, i) => { x.style.color = i < v ? "#f59e0b" : ""; x.classList.toggle("on", i < v); });
      });
      row.appendChild(b);
    }
  });

  $("#review-save-btn").addEventListener("click", async () => {
    const stars = [0, 1, 2].map((i) => Number($("#stars-" + i).dataset.value || 0));
    if (stars.some((s) => !s)) { $("#review-save-msg").textContent = "별점 세 개를 모두 매겨 주세요!"; return; }
    try {
      await ownedSet(subCol(Join.code, "reviews").doc(String(Join.num)), {
        num: Number(Join.num), stars, text: $("#review-text").value.trim(),
      });
      $("#review-save-msg").textContent = "검토 의견 전송 완료! 개발자(선생님)가 확인할 거예요.";
    } catch (e) { $("#review-save-msg").textContent = e.message.includes("번호") ? e.message : friendlyError(e); }
  });
}

/* ---------- 시작 ---------- */

initTabs();
initLeave();
requireJoin(4, () => {
  initTab1();
  initTab2();
  initTab3();
  initTab4();
  initTab5();
  initTab6();
  drawKnn();
});
