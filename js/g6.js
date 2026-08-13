/* g6.js — 6학년 친구 추천 알고리즘 × KNN (4차시) */

/* ---------- 1차시: 알고리즘 이해 ---------- */

const ALGO_CARDS = [
  { name: "유튜브", emoji: "📺", secret: "내가 본 영상, 끝까지 본 영상, '좋아요'를 기억해서 비슷한 영상을 골라줘요." },
  { name: "넷플릭스", emoji: "🎬", secret: "나와 비슷한 작품을 본 사람들이 재밌게 본 다른 작품을 추천해요." },
  { name: "쿠팡", emoji: "🛒", secret: "이 물건을 산 사람들이 함께 산 물건을 보여줘요. '함께 구매한 상품'이 바로 그것!" },
  { name: "음악 앱", emoji: "🎧", secret: "내가 자주 듣는 곡과 분위기·빠르기·장르가 비슷한 곡으로 플레이리스트를 만들어요." },
];

function initTab1() {
  const grid = $("#algo-cards");
  ALGO_CARDS.forEach((c) => {
    const el = document.createElement("div");
    el.className = "mini-card selectable";
    el.innerHTML = `<span class="emoji">${c.emoji}</span><strong>${c.name}</strong>`;
    let open = false;
    el.addEventListener("click", () => {
      open = !open;
      el.innerHTML = open
        ? `<span style="font-size:0.92rem; text-align:left; display:block">${c.secret}</span>`
        : `<span class="emoji">${c.emoji}</span><strong>${c.name}</strong>`;
      el.classList.toggle("selected", open);
    });
    grid.appendChild(el);
  });
  initDemo();
}

/* KNN 데모: 파랑(스포츠파) vs 주황(음악파) */
const DEMO_DATA = [];
(function () {
  // 고정 시드 스타일의 흩어진 두 무리
  const blue = [[2, 7], [2.7, 8], [3.3, 6.5], [1.8, 5.8], [3.8, 7.6], [2.4, 6.6], [4.2, 6], [3, 5.4]];
  const orange = [[6.5, 3], [7.4, 3.8], [8, 2.4], [6, 2.2], [7, 1.6], [8.4, 4], [5.6, 3.5], [7.8, 5], [6.8, 4.6]];
  blue.forEach((p) => DEMO_DATA.push({ x: p[0], y: p[1], g: "sports" }));
  orange.forEach((p) => DEMO_DATA.push({ x: p[0], y: p[1], g: "music" }));
})();
let demoPoint = null;

function demoToPx(canvas, x, y) {
  const m = 30;
  return [m + (x / 10) * (canvas.width - m * 2), canvas.height - m - (y / 10) * (canvas.height - m * 2)];
}

function drawDemo() {
  const canvas = $("#demo-canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const k = Number($("#demo-k").value);

  let nb = [];
  if (demoPoint) {
    nb = nearest([demoPoint.x, demoPoint.y], DEMO_DATA, k, (d) => [d.x, d.y]);
    ctx.strokeStyle = "#94a3b8"; ctx.setLineDash([5, 4]);
    const [mx, my] = demoToPx(canvas, demoPoint.x, demoPoint.y);
    nb.forEach((n) => {
      const [x, y] = demoToPx(canvas, n.item.x, n.item.y);
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(x, y); ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  DEMO_DATA.forEach((d) => {
    const [x, y] = demoToPx(canvas, d.x, d.y);
    const isNb = nb.some((n) => n.item === d);
    ctx.beginPath(); ctx.arc(x, y, isNb ? 11 : 8, 0, Math.PI * 2);
    ctx.fillStyle = d.g === "sports" ? "#2563eb" : "#ea580c";
    ctx.fill();
    if (isNb) { ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2.5; ctx.stroke(); }
  });

  if (demoPoint) {
    const [mx, my] = demoToPx(canvas, demoPoint.x, demoPoint.y);
    ctx.font = "26px sans-serif"; ctx.fillStyle = "#0f172a";
    ctx.fillText("★", mx - 13, my + 9);

    const res = knnClassify([demoPoint.x, demoPoint.y], DEMO_DATA, k, (d) => [d.x, d.y], (d) => d.g);
    const nameMap = { sports: "🏀 스포츠 영상파", music: "🎵 음악 영상파" };
    const votes = Object.keys(res.votes).map((g) => `${nameMap[g]} ${res.votes[g]}표`).join(" · ");
    $("#demo-verdict").innerHTML = `가까운 이웃 ${k}명의 투표: ${votes}<br>
      <strong style="font-size:1.2rem">→ 이 사람에게는 ${nameMap[res.label]} 영상을 추천!</strong>`;
  }
}

function initDemo() {
  const canvas = $("#demo-canvas");
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const m = 30;
    demoPoint = {
      x: Math.max(0, Math.min(10, ((px - m) / (canvas.width - m * 2)) * 10)),
      y: Math.max(0, Math.min(10, ((canvas.height - m - py) / (canvas.height - m * 2)) * 10)),
    };
    drawDemo();
  });
  $("#demo-k").addEventListener("input", () => {
    $("#demo-k-val").textContent = $("#demo-k").value;
    drawDemo();
  });
  drawDemo();
}

/* ---------- 2차시: 데이터 수집 ---------- */

const PREF_QUESTIONS = [
  "매운 음식을 좋아한다.",
  "달콤한 간식을 좋아한다.",
  "몸을 움직이는 활동(운동)을 좋아한다.",
  "게임을 좋아한다.",
  "책 읽기를 좋아한다.",
  "처음 보는 것에 도전하는 편이다.",
  "혼자보다 여럿이 함께하는 게 좋다.",
];
const PREF_LABELS = ["매운맛", "단맛", "운동", "게임", "독서", "도전", "함께"];
const TOPICS = ["📚 책", "🍜 컵라면", "🍪 과자", "📺 영상", "🎧 음악", "🎮 게임", "🏞️ 체험학습", "✏️ 기타"];

let getPrefAnswers = null;
let myTopic = null;

function initTab2() {
  getPrefAnswers = renderLikert("pref-survey", PREF_QUESTIONS);

  const grid = $("#topic-cards");
  TOPICS.forEach((t) => {
    const el = document.createElement("div");
    el.className = "mini-card selectable";
    el.innerHTML = `<strong>${t}</strong>`;
    el.addEventListener("click", () => {
      $all("#topic-cards .mini-card").forEach((x) => x.classList.remove("selected"));
      el.classList.add("selected");
      myTopic = t;
    });
    grid.appendChild(el);
  });

  $("#pref-save-btn").addEventListener("click", async () => {
    const msg = $("#pref-save-msg");
    const vec = getPrefAnswers();
    if (!vec) { msg.textContent = "취향 설문에 모두 답해 주세요!"; return; }
    const favs = {
      snack: $("#fav-snack").value.trim(),
      video: $("#fav-video").value.trim(),
      book: $("#fav-book").value.trim(),
    };
    if (!favs.snack || !favs.video || !favs.book) { msg.textContent = "최애 세 가지를 모두 적어 주세요!"; return; }
    if (!myTopic) { msg.textContent = "모둠 주제를 골라 주세요!"; return; }
    if (favs.snack.length > 30 || favs.video.length > 30 || favs.book.length > 30) {
      msg.textContent = "최애는 30자 안으로 짧게 적어 주세요!"; return;
    }
    try {
      await ownedSet(subCol(Join.code, "prefs").doc(String(Join.num)), {
        num: Number(Join.num), vec, favs, topic: myTopic,
      });
      msg.textContent = "저장 완료! 데이터 창고에 쌓였어요.";
      markTabDone("t2");
      loadPrefStatus();
    } catch (e) { msg.textContent = e.message.includes("번호") ? e.message : friendlyError(e); }
  });

  loadPrefStatus();
  document.addEventListener("tabshow", (e) => { if (e.detail === "t2") loadPrefStatus(); });
}

async function loadPrefStatus() {
  try {
    const snap = await subCol(Join.code, "prefs").get();
    const nums = [];
    snap.forEach((d) => nums.push(d.data().num));
    nums.sort((a, b) => a - b);
    $("#pref-status").innerHTML = `지금까지 <strong style="font-size:1.3rem">${nums.length}명</strong> 참여
      <div style="display:flex; gap:0.3rem; flex-wrap:wrap; margin-top:0.4rem">
      ${nums.map((n) => `<span class="step-chip done">${n}번</span>`).join("")}</div>`;
  } catch (e) {
    $("#pref-status").textContent = "현황을 불러오지 못했어요.";
  }
}

/* ---------- 3차시: 추천 설계 ---------- */

let lastMyRec = null; // {neighbors:[{num,dist}], recs:[]}

function initTab3() {
  const grid = $("#weight-cards");
  PREF_LABELS.forEach((l, i) => {
    const el = document.createElement("div");
    el.className = "mini-card selectable";
    el.dataset.idx = i;
    el.innerHTML = `<strong>${l}</strong>`;
    el.addEventListener("click", () => el.classList.toggle("selected"));
    grid.appendChild(el);
  });

  $("#rec-k").addEventListener("input", () => { $("#rec-k-val").textContent = $("#rec-k").value; });

  $("#rec-run-btn").addEventListener("click", runMyAlgorithm);
  $("#ai-rec-btn").addEventListener("click", runAiRecommend);

  $("#compare-save-btn").addEventListener("click", async () => {
    const note = $("#compare-note").value.trim();
    if (!note) { $("#compare-save-msg").textContent = "비교한 내용을 적어 주세요!"; return; }
    try {
      await ownedSet(subCol(Join.code, "compare").doc(String(Join.num)), {
        num: Number(Join.num), note,
      });
      $("#compare-save-msg").textContent = "제출 완료!";
    } catch (e) { $("#compare-save-msg").textContent = e.message.includes("번호") ? e.message : friendlyError(e); }
  });
}

async function loadPrefs() {
  const snap = await subCol(Join.code, "prefs").get();
  const all = [];
  snap.forEach((d) => all.push(d.data()));
  return all;
}

async function runMyAlgorithm() {
  const box = $("#rec-result");
  box.innerHTML = `<p class="loading">우리 반 데이터를 살펴보는 중</p>`;
  const all = await loadPrefs();
  const me = all.find((p) => String(p.num) === String(Join.num));
  if (!me) { box.innerHTML = `<div class="notice">먼저 2차시에서 내 취향 데이터를 저장해 주세요!</div>`; return; }
  const others = all.filter((p) => String(p.num) !== String(Join.num));
  if (others.length < 2) { box.innerHTML = `<div class="notice">아직 친구들 데이터가 부족해요 (${others.length}명). 친구들이 2차시를 마치면 다시 실행해 보세요.</div>`; return; }

  const k = Math.min(Number($("#rec-k").value), others.length);
  const weights = PREF_LABELS.map((_, i) =>
    $(`#weight-cards .mini-card[data-idx="${i}"]`).classList.contains("selected") ? 2 : 1);

  const nb = nearest(me.vec, others, k, (p) => p.vec, weights);

  let html = `<div class="result-box"><h3 style="margin-top:0">나와 취향이 가까운 친구 TOP ${k}</h3>
    <table class="data"><tr><th>친구</th><th>거리(작을수록 비슷)</th><th>그 친구의 최애</th></tr>`;
  nb.forEach((n) => {
    const f = n.item.favs || {};
    // 사용자가 입력한 최애 텍스트는 반드시 esc() 처리 (저장형 XSS 방지)
    html += `<tr><td><strong>${n.item.num}번</strong></td><td>${n.dist.toFixed(2)}</td>
      <td style="text-align:left">🍪 ${esc(f.snack) || "-"} · 📺 ${esc(f.video) || "-"} · 📚 ${esc(f.book) || "-"}</td></tr>`;
  });
  const recs = [];
  nb.forEach((n) => {
    const f = n.item.favs || {};
    [f.snack, f.video, f.book].forEach((x) => { if (x && !recs.includes(x)) recs.push(x); });
  });
  html += `</table>
    <h3>→ 내 알고리즘의 추천 목록</h3>
    <p style="font-size:1.1rem"><strong>${recs.slice(0, 6).map(esc).join(", ")}</strong></p>
    <p class="hint">규칙: 가중치 거리로 가까운 ${k}명을 찾고, 그 친구들의 최애를 추천 (KNN)</p></div>`;
  box.innerHTML = html;
  markTabDone("t3");

  lastMyRec = { k, neighbors: nb.map((n) => ({ num: n.item.num, dist: Math.round(n.dist * 100) / 100 })), recs: recs.slice(0, 6), me, others };
  $("#ai-rec-btn").disabled = false;
}

async function runAiRecommend() {
  const box = $("#ai-rec-result");
  if (!(await aiEnabled("aiCompare"))) { box.innerHTML = `<div class="notice">선생님이 지금은 AI 비교 기능을 꺼 두었어요.</div>`; return; }
  if (!lastMyRec) return;
  box.innerHTML = `<p class="hint">우리 반 취향 데이터가 AI(Upstage) 서버로 전송돼요.</p><p class="loading">AI가 데이터를 분석하는 중</p>`;

  // 개인정보 보호: 자유 입력한 최애 텍스트는 AI로 보내지 않고 번호·점수만 전송한다.
  const { me, others } = lastMyRec;
  const lines = others.map((p) =>
    `${p.num}번: 취향[${PREF_LABELS.map((l, i) => `${l}${p.vec[i]}`).join(",")}]`).join("\n");

  try {
    const answer = await askSolar([
      { role: "system", content: "너는 초등학교 6학년 교실의 추천 알고리즘 도우미야. 학생 취향 점수(1~5점)를 보고 질문한 학생과 비슷한 친구 2~3명(번호로만)을 골라줘. 반드시 '비슷한 친구: ...', '이유: ...' 두 줄 형식으로, 쉬운 해요체로 짧게 답해. 학생 이름은 절대 쓰지 마." },
      { role: "user", content: `나(${me.num}번)의 취향: [${PREF_LABELS.map((l, i) => `${l}${me.vec[i]}`).join(",")}]\n\n우리 반 친구들 데이터:\n${lines}\n\n나와 비슷한 친구를 골라줘.` },
    ], 0.3);
    box.innerHTML = `<div class="result-box" style="border-color:var(--accent); background:#f0f9ff">
      <h3 style="margin-top:0">🤖 AI(Solar)의 추천</h3>
      <div style="white-space:pre-wrap">${esc(answer)}</div></div>
      <p class="hint" style="margin-top:0.5rem">내 알고리즘 결과와 비교해서 같은 점·다른 점을 아래에 기록해 보세요.</p>`;
  } catch (e) {
    box.innerHTML = `<div class="notice">지금은 AI가 바빠요. 잠시 뒤 다시 눌러 주세요.</div>`;
  }
}

/* ---------- 4차시: 개선과 토론 ---------- */

const WRONG_CARDS = [
  { name: "데이터 부족", emoji: "📉", body: "이웃이 몇 명 없으면 엉뚱한 사람이 '가장 비슷한 이웃'이 돼요. 추천도 엉뚱해져요." },
  { name: "편향된 데이터", emoji: "⚖️", body: "모은 데이터가 한쪽으로 치우쳐 있으면(예: 남학생 것만), 알고리즘도 치우친 추천을 해요." },
  { name: "취향은 변해요", emoji: "🔄", body: "작년의 나와 지금의 나는 달라요. 옛날 데이터로만 추천하면 지금의 나와 안 맞아요." },
  { name: "소수 취향 무시", emoji: "🌱", body: "다수결로 정하다 보니, 나만의 특별한 취향은 묻혀 버릴 수 있어요." },
];

const BUBBLE_TOPICS = ["게임", "스포츠", "음악", "과학", "요리", "동물"];
let bubbleDist = null, bubblePick = null, bubbleClicks = 0;

function drawBubble() {
  $("#bubble-bars").innerHTML = BUBBLE_TOPICS.map((t, i) => {
    const pct = Math.round(bubbleDist[i] * 100);
    const hl = t === bubblePick;
    return `<div style="margin-bottom:0.45rem">
      <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:700">
        <span>${t}${hl ? " ⭐" : ""}</span><span>${pct}%</span></div>
      <div style="background:#e2e8f0; border-radius:6px; height:16px; overflow:hidden">
        <div style="width:${pct}%; height:100%; background:${hl ? "var(--brand)" : "#94a3b8"}; transition:width 0.5s"></div>
      </div></div>`;
  }).join("");
}

function resetBubble() {
  bubbleDist = BUBBLE_TOPICS.map(() => 1 / BUBBLE_TOPICS.length);
  bubbleClicks = 0;
  $("#bubble-msg").style.display = "none";
  drawBubble();
}

function initTab4() {
  const grid = $("#wrong-cards");
  WRONG_CARDS.forEach((c) => {
    const el = document.createElement("div");
    el.className = "mini-card selectable";
    el.innerHTML = `<span class="emoji">${c.emoji}</span><strong>${c.name}</strong>`;
    let open = false;
    el.addEventListener("click", () => {
      open = !open;
      el.innerHTML = open
        ? `<span style="font-size:0.92rem; text-align:left; display:block">${c.body}</span>`
        : `<span class="emoji">${c.emoji}</span><strong>${c.name}</strong>`;
      el.classList.toggle("selected", open);
    });
    grid.appendChild(el);
  });

  // 필터버블
  const tbox = $("#bubble-topics");
  BUBBLE_TOPICS.forEach((t) => {
    const b = document.createElement("button");
    b.className = "btn ghost small";
    b.textContent = t;
    b.addEventListener("click", () => {
      bubblePick = t;
      $all("#bubble-topics button").forEach((x) => x.style.background = "");
      b.style.background = "var(--brand-soft)";
      $("#bubble-btn").disabled = false;
      resetBubble();
    });
    tbox.appendChild(b);
  });
  $("#bubble-btn").addEventListener("click", () => {
    if (!bubblePick) return;
    const pi = BUBBLE_TOPICS.indexOf(bubblePick);
    bubbleDist = bubbleDist.map((v, i) => (i === pi ? v * 1.55 : v * 0.82));
    const s = bubbleDist.reduce((a, b) => a + b, 0);
    bubbleDist = bubbleDist.map((v) => v / s);
    bubbleClicks++;
    drawBubble();
    if (bubbleDist[pi] > 0.8) {
      const msg = $("#bubble-msg");
      msg.style.display = "";
      msg.innerHTML = `<strong>🫧 필터버블 완성!</strong> ${bubbleClicks}번 만에 내 화면의 ${Math.round(bubbleDist[pi] * 100)}%가 '${bubblePick}'로 채워졌어요.
        좋아하는 것만 보다 보니 <strong>다른 세상이 보이지 않게</strong> 됐어요. 이것이 필터버블이에요.`;
    }
  });
  $("#bubble-reset").addEventListener("click", resetBubble);
  resetBubble();

  // AI 토론 챗
  let chatHistory = [];
  async function sendChat() {
    const input = $("#chat-input");
    const text = input.value.trim();
    if (!text) return;
    if (text.length > 300) { alert("질문은 300자 안으로 적어 주세요!"); return; }
    const log = $("#chat-log");
    log.insertAdjacentHTML("beforeend", `<div class="chat-msg me"></div>`);
    log.lastElementChild.textContent = text; // textContent라 XSS 안전
    input.value = "";
    log.scrollTop = log.scrollHeight;
    if (!(await aiEnabled("aiChat"))) {
      log.insertAdjacentHTML("beforeend", `<div class="chat-msg ai">지금은 선생님이 AI 토론 기능을 꺼 두었어요. 친구들과 먼저 이야기해 보세요!</div>`);
      log.scrollTop = log.scrollHeight;
      return;
    }
    log.insertAdjacentHTML("beforeend", `<div class="chat-msg ai loading">생각하는 중</div>`);
    log.scrollTop = log.scrollHeight;
    try {
      const recent = chatHistory.slice(-4);
      const answer = await askSolar([
        { role: "system", content: "너는 초등학교 6학년의 '추천 알고리즘의 편향과 필터버블' 토론 도우미야. 3~4문장, 쉬운 해요체. 정답을 단정하지 말고 학생 생각을 존중하며, 마지막에 생각을 넓히는 되물음 1개를 던져. 토론 주제(추천 알고리즘·AI·편향·필터버블·데이터)와 관련 없는 질문에는 '그건 토론 주제로 돌아가서 이야기해요'라고 부드럽게 안내해." },
        ...recent,
        { role: "user", content: text },
      ], 0.6);
      log.lastElementChild.classList.remove("loading");
      log.lastElementChild.textContent = answer; // textContent라 XSS 안전
      chatHistory.push({ role: "user", content: text }, { role: "assistant", content: answer });
    } catch (e) {
      log.lastElementChild.classList.remove("loading");
      log.lastElementChild.textContent = "지금은 AI가 바빠요. 잠시 뒤 다시 물어봐 주세요.";
    }
    log.scrollTop = log.scrollHeight;
  }
  $("#chat-send").addEventListener("click", sendChat);
  $("#chat-input").addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

  // 기획 제출
  $("#idea-save-btn").addEventListener("click", async () => {
    const doc = {
      num: Number(Join.num),
      what: $("#idea-what").value.trim(),
      who: $("#idea-who").value.trim(),
      rule: $("#idea-rule").value.trim(),
      guard: $("#idea-guard").value.trim(),
    };
    if (!doc.what || !doc.rule) { $("#idea-save-msg").textContent = "무엇을 추천하는지, 어떤 규칙인지 적어 주세요!"; return; }
    if (!doc.guard) { $("#idea-save-msg").textContent = "4차시에서 배운 '편향 막는 방법'을 하나만 적어 주세요!"; $("#idea-guard").focus(); return; }
    try {
      await ownedSet(subCol(Join.code, "ideas").doc(String(Join.num)), doc);
      $("#idea-save-msg").textContent = "제출 완료! 선생님 대시보드로 전달됐어요.";
      markTabDone("t4");
    } catch (e) { $("#idea-save-msg").textContent = e.message.includes("번호") ? e.message : friendlyError(e); }
  });
}

/* ---------- 시작 ---------- */

initTabs();
initLeave();
requireJoin(6, () => {
  initTab1();
  initTab2();
  initTab3();
  initTab4();
});
