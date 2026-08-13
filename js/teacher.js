/* teacher.js — 교사 대시보드 */

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

const LS_KEY = "knn_teacher_classes";
function myClasses() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (e) { return []; } }
function saveClasses(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

let current = null; // {code, data}

const STATE_COLORS = { green: "#16a34a", yellow: "#d97706", blue: "#2563eb" };
const STATE_NAMES = { green: "🌞 쌩쌩", yellow: "⛅ 쉬엄쉬엄", blue: "🌙 쉼 필요" };

function escH(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---------- 학급 목록 ---------- */

function renderClassList() {
  const box = $("#class-list");
  const list = myClasses();
  if (!list.length) { box.innerHTML = `<p class="hint">아직 학급이 없어요. 아래에서 만들어 보세요.</p>`; return; }
  box.innerHTML = "";
  list.forEach((c) => {
    const el = document.createElement("div");
    el.className = "class-item" + (current && current.code === c.code ? " on" : "");
    el.innerHTML = `<span><strong>${escH(c.name)}</strong> <span class="hint">(${c.grade}학년)</span></span><span class="badge">${c.code}</span>`;
    el.addEventListener("click", () => openClass(c.code));
    box.appendChild(el);
  });
}

function genCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 헷갈리는 I,L,O,0,1 제외
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)]; // 5자리로 확대
  return s;
}

async function createClass() {
  const grade = Number($("#new-grade").value);
  const name = $("#new-name").value.trim();
  const pin = $("#new-pin").value.trim();
  const msg = $("#create-msg");
  if (!name) { msg.textContent = "학급 이름을 입력하세요."; return; }
  if (!/^\d{4}$/.test(pin)) { msg.textContent = "PIN은 숫자 4자리로 정하세요."; return; }
  msg.textContent = "만드는 중...";
  try {
    await authReady;
    let code = genCode();
    while ((await classRef(code).get()).exists) code = genCode();
    const pinHash = await hashPin(code, pin);
    await classRef(code).set({
      grade, name, pinHash,
      settings: { aiComment: true, aiCompare: true, aiChat: true },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    const list = myClasses();
    list.push({ code, name, grade });
    saveClasses(list);
    $("#new-name").value = ""; $("#new-pin").value = "";
    msg.textContent = `완료! 학급 코드: ${code}`;
    renderClassList();
    openClass(code);
  } catch (e) { msg.textContent = "실패: " + (e.message || e); }
}

async function loadByCode() {
  const code = $("#load-code").value.trim().toUpperCase();
  const msg = $("#load-msg");
  if (!code) return;
  try {
    await authReady;
    const snap = await classRef(code).get();
    if (!snap.exists) { msg.textContent = "그 코드의 학급이 없어요."; return; }
    const d = snap.data();
    const pin = prompt(`'${d.name}' 학급의 교사 PIN을 입력하세요.`);
    if (pin == null) return;
    const ok = d.pinHash ? (await hashPin(code, pin.trim())) === d.pinHash : false;
    if (!ok) { msg.textContent = "PIN이 일치하지 않아요."; return; }
    const list = myClasses();
    if (!list.some((c) => c.code === code)) { list.push({ code, name: d.name, grade: d.grade }); saveClasses(list); }
    msg.textContent = "";
    renderClassList();
    openClass(code);
  } catch (e) { msg.textContent = "불러오기 실패: " + (e.message || e); }
}

/* ---------- 학급 상세 ---------- */

async function openClass(code) {
  await authReady;
  const snap = await classRef(code).get();
  if (!snap.exists) return;
  current = { code, data: snap.data() };
  $("#detail-empty").style.display = "none";
  $("#detail").style.display = "";
  $("#d-title").textContent = `${current.data.name} (${current.data.grade}학년)`;
  $("#d-code").textContent = code;
  renderClassList();
  renderSecTabs();
}

const SECTIONS4 = [
  { id: "status", name: "현황·설정" },
  { id: "scatter", name: "감정 그래프(전자칠판)" },
  { id: "cards", name: "1차시 취향카드" },
  { id: "entries", name: "감정 기록(2·6차시)" },
  { id: "plans", name: "5차시 기획서" },
  { id: "reviews", name: "6차시 검토평" },
];
const SECTIONS6 = [
  { id: "status", name: "현황·설정" },
  { id: "prefs", name: "2차시 취향 데이터" },
  { id: "compare", name: "3차시 AI 비교 기록" },
  { id: "ideas", name: "4차시 알고리즘 기획" },
];

let curSec = "status";

function renderSecTabs() {
  const secs = current.data.grade === 4 ? SECTIONS4 : SECTIONS6;
  if (!secs.some((s) => s.id === curSec)) curSec = "status";
  const box = $("#sec-tabs");
  box.innerHTML = "";
  secs.forEach((s) => {
    const b = document.createElement("button");
    b.textContent = s.name;
    b.className = s.id === curSec ? "on" : "";
    b.addEventListener("click", () => { curSec = s.id; renderSecTabs(); });
    box.appendChild(b);
  });
  renderSection();
}

async function getAll(sub) {
  const snap = await subCol(current.code, sub).get();
  const rows = [];
  snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (a.num || 0) - (b.num || 0));
  return rows;
}

/* 1~40 제출 현황 격자 */
function rosterGrid(submittedNums, max) {
  const set = new Set(submittedNums.map(Number));
  let cells = "";
  for (let n = 1; n <= (max || 40); n++) {
    const on = set.has(n);
    cells += `<div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;
      border-radius:8px;font-weight:800;font-size:0.95rem;
      background:${on ? "var(--brand)" : "#eef1f6"};color:${on ? "#fff" : "#94a3b8"}">${n}</div>`;
  }
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;margin:0.5rem 0">${cells}</div>`;
}

async function renderSection() {
  const body = $("#sec-body");
  body.innerHTML = `<p class="loading">불러오는 중</p>`;
  const g = current.data.grade;

  if (curSec === "status") {
    const subs = g === 4 ? ["cards", "entries", "plans", "reviews"] : ["prefs", "compare", "ideas"];
    const names = g === 4
      ? { cards: "취향카드", entries: "감정 기록", plans: "기획서", reviews: "검토평" }
      : { prefs: "취향 데이터", compare: "AI 비교 기록", ideas: "알고리즘 기획" };
    const rowsBySub = {};
    for (const s of subs) rowsBySub[s] = await getAll(s);
    const st = current.data.settings || {};
    const toggles = g === 4
      ? [["aiComment", "AI 한마디 (6차시 감정일기 코멘트)"]]
      : [["aiCompare", "AI 추천 비교 (3차시)"], ["aiChat", "AI 토론 도우미 (4차시)"]];

    // 제출 현황: 대표 컬렉션(4학년=entries, 6학년=prefs) 기준 번호 격자
    const primary = g === 4 ? "entries" : "prefs";
    const submitted = [...new Set(rowsBySub[primary].map((r) => Number(r.num)))];

    body.innerHTML = `
      <h3 style="margin-top:0">참여 현황</h3>
      <div class="grid c4">${subs.map((s) =>
        `<div class="mini-card" style="text-align:center"><div style="font-size:1.8rem; font-weight:800">${rowsBySub[s].length}</div>${names[s]}</div>`).join("")}
      </div>
      <p class="hint" style="margin-top:0.8rem"><strong>${names[primary]}</strong> 제출한 번호 (${submitted.length}명) — 색이 없는 번호가 아직 안 낸 학생</p>
      ${rosterGrid(submitted, 40)}
      <h3>AI 기능 켜고 끄기</h3>
      <p class="hint">끄면 학생이 다음 AI 버튼을 누를 때부터 적용돼요.</p>
      ${toggles.map(([key, label]) => `
        <div class="toggle-row"><span style="font-weight:700">${label}</span>
          <label class="switch"><input type="checkbox" data-setting="${key}" ${st[key] !== false ? "checked" : ""}><span></span></label>
        </div>`).join("")}
      <h3>데이터 관리</h3>
      <div class="notice">새 학급·새 학년도에는 <strong>새 학급을 하나 더 만들어</strong> 새 코드를 쓰세요.
      안전을 위해 저장된 데이터는 대시보드에서 한꺼번에 지울 수 없어요.
      특정 학생 기록 삭제가 필요하면 학생이 본인 화면에서 다시 저장하거나, 선생님이 Firebase 콘솔에서 개별 삭제할 수 있어요.</div>`;

    $all("[data-setting]", body).forEach((input) => {
      input.addEventListener("change", async () => {
        try {
          await classRef(current.code).set({ settings: { [input.dataset.setting]: input.checked } }, { merge: true });
          current.data.settings = { ...(current.data.settings || {}), [input.dataset.setting]: input.checked };
        } catch (e) { alert("설정 변경 실패: " + (e.message || e)); input.checked = !input.checked; }
      });
    });
    return;
  }

  if (curSec === "scatter") {
    const rows = (await getAll("entries")).filter((r) => r.date === todayStr());
    const allRows = await getAll("entries");
    const dates = [...new Set(allRows.map((r) => r.date))].sort().reverse();
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;margin-bottom:0.6rem">
        <label style="font-weight:700">날짜</label>
        <select id="scatter-date">${dates.map((d) => `<option value="${d}">${d}</option>`).join("") || `<option>기록 없음</option>`}</select>
        <span class="hint">전자칠판에 이 화면을 띄우면 반 전체 그래프를 함께 볼 수 있어요.</span>
      </div>
      <canvas class="board" id="t-scatter" width="640" height="560" style="max-width:640px"></canvas>
      <div id="t-dist" style="margin-top:0.8rem"></div>`;
    const sel = $("#scatter-date");
    const draw = async () => {
      const day = sel.value;
      const dayRows = allRows.filter((r) => r.date === day);
      drawTeacherScatter(dayRows);
    };
    if (sel && sel.tagName === "SELECT") { sel.addEventListener("change", draw); draw(); }
    else drawTeacherScatter([]);
    return;
  }

  /* 데이터 테이블 */
  let rows = await getAll(curSec);

  if (curSec === "entries") {
    const dates = [...new Set(rows.map((r) => r.date))].sort().reverse();
    const dateSel = `<div style="margin-bottom:0.6rem"><label style="font-weight:700">날짜 </label>
      <select id="entries-date"><option value="">전체</option>${dates.map((d) => `<option value="${d}">${d}</option>`).join("")}</select></div>`;
    const render = (filter) => {
      const r2 = filter ? rows.filter((r) => r.date === filter) : rows;
      const body2 = `<table class="data"><tr><th>번호</th><th>날짜</th><th>활력</th><th>집중</th><th>관계</th><th>상태</th></tr>` + r2
        .sort((a, b) => (a.date === b.date ? a.num - b.num : (a.date < b.date ? 1 : -1)))
        .map((r) => `<tr><td>${Number(r.num)||''}</td><td>${r.date}</td><td>${r.v}</td><td>${r.f}</td><td>${r.r}</td><td>${STATE_NAMES[r.state] || "-"}</td></tr>`).join("") + `</table>`;
      $("#entries-table").innerHTML = body2;
    };
    $("#sec-body").innerHTML = dateSel + `<div id="entries-table"></div>`;
    $("#entries-date").addEventListener("change", (e) => render(e.target.value));
    render("");
    return;
  }

  if (!rows.length) { body.innerHTML = `<p class="hint">아직 데이터가 없어요.</p>`; return; }

  let html = "";
  if (curSec === "cards") {
    html = `<table class="data"><tr><th>번호</th><th>고른 카드</th></tr>` + rows.map((r) =>
      `<tr><td>${Number(r.num)||''}</td><td>${(r.picks || []).map((p) => ["🎢", "👻", "🎠", "🚢", "🚗", "🎡", "🍭", "🎁"][p] || "").join(" ")}</td></tr>`).join("") + `</table>`;
  } else if (curSec === "plans") {
    html = rows.map((r) => `<div class="mini-card" style="margin-bottom:0.7rem">
      <strong>${Number(r.num)||''}번 · 「${escH(r.name)}」</strong>
      <p>👥 ${escH(r.who)}</p>
      <p>🧩 기능: ${(r.features || []).map(escH).join(", ") || "-"}</p>
      <p>🖥 화면: ${escH(r.screen) || "-"}</p>
      <p>⚠️ 걱정·약속: ${escH(r.worry) || "-"}</p></div>`).join("");
  } else if (curSec === "reviews") {
    html = `<table class="data"><tr><th>번호</th><th>쉬움</th><th>정확</th><th>추천</th><th>한 줄 평</th></tr>` + rows.map((r) =>
      `<tr><td>${Number(r.num)||''}</td>${(r.stars || []).map((s) => `<td>${"★".repeat(s)}</td>`).join("")}<td style="text-align:left">${escH(r.text)}</td></tr>`).join("") + `</table>`;
  } else if (curSec === "prefs") {
    const L = ["매운맛", "단맛", "운동", "게임", "독서", "도전", "함께"];
    html = `<p class="hint">${rows.length}명 제출</p>` + rosterGrid([...new Set(rows.map((r) => r.num))], 40) +
      `<div style="overflow-x:auto"><table class="data"><tr><th>번호</th>${L.map((l) => `<th>${l}</th>`).join("")}<th>최애 (과자/영상/책)</th><th>모둠 주제</th></tr>` + rows.map((r) =>
      `<tr><td>${Number(r.num)||''}</td>${(r.vec || []).map((v) => `<td>${v}</td>`).join("")}
       <td style="text-align:left">${escH(r.favs?.snack)} / ${escH(r.favs?.video)} / ${escH(r.favs?.book)}</td><td>${escH(r.topic)}</td></tr>`).join("") + `</table></div>`;
  } else if (curSec === "compare") {
    html = rows.map((r) => `<div class="mini-card" style="margin-bottom:0.7rem"><strong>${Number(r.num)||''}번</strong><p>${escH(r.note)}</p></div>`).join("");
  } else if (curSec === "ideas") {
    html = rows.map((r) => `<div class="mini-card" style="margin-bottom:0.7rem">
      <strong>${Number(r.num)||''}번 · ${escH(r.what)}</strong>
      <p>👥 대상: ${escH(r.who) || "-"}</p>
      <p>📏 데이터·규칙: ${escH(r.rule)}</p>
      <p>🛡 편향 방지: ${escH(r.guard) || "-"}</p></div>`).join("");
  }
  body.innerHTML = html;
}

/* 교사용 산점도 (활력=가로, 집중=세로) */
function drawTeacherScatter(rows) {
  const canvas = $("#t-scatter");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const m = 55, min = 0.5, max = 5.5;
  const toPx = (v, f) => [m + ((v - min) / (max - min)) * (canvas.width - m * 2),
    canvas.height - m - ((f - min) / (max - min)) * (canvas.height - m * 2)];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#cbd5e1"; ctx.fillStyle = "#64748b"; ctx.font = "15px sans-serif"; ctx.lineWidth = 1;
  for (let t = 1; t <= 5; t++) {
    const [x] = toPx(t, 1); const [, y] = toPx(1, t);
    ctx.beginPath(); ctx.moveTo(x, m); ctx.lineTo(x, canvas.height - m); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m, y); ctx.lineTo(canvas.width - m, y); ctx.stroke();
    ctx.fillText(String(t), x - 4, canvas.height - m + 24);
    ctx.fillText(String(t), m - 28, y + 5);
  }
  ctx.font = "bold 16px sans-serif"; ctx.fillStyle = "#334155";
  ctx.fillText("활력 →", canvas.width / 2 - 30, canvas.height - 12);
  ctx.save(); ctx.translate(16, canvas.height / 2 + 30); ctx.rotate(-Math.PI / 2); ctx.fillText("집중 →", 0, 0); ctx.restore();

  const counts = { green: 0, yellow: 0, blue: 0 };
  rows.forEach((e) => {
    const st = e.state || "yellow"; counts[st] = (counts[st] || 0) + 1;
    const [x, y] = toPx(e.v, e.f);
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fillStyle = (STATE_COLORS[st] || "#888") + "dd"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif";
    const t = String(e.num); ctx.fillText(t, x - (t.length > 1 ? 7 : 3.5), y + 4);
  });
  const total = Math.max(1, rows.length);
  $("#t-dist").innerHTML = `<strong>기록 ${rows.length}개</strong> — ` + Object.keys(STATE_NAMES).map((s) =>
    `${STATE_NAMES[s]} ${counts[s]}명`).join(" · ") +
    Object.keys(STATE_NAMES).map((s) => {
      const pct = (counts[s] / total) * 100;
      return `<div style="margin-top:0.4rem"><div style="display:flex;justify-content:space-between;font-weight:700"><span>${STATE_NAMES[s]}</span><span>${counts[s]}명</span></div>
        <div style="background:#e2e8f0;border-radius:8px;height:18px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${STATE_COLORS[s]}"></div></div></div>`;
    }).join("");
}

/* ---------- 코드 크게 보기 오버레이 ---------- */
function showCodeOverlay() {
  if (!current) return;
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:#0f172a;color:#fff;z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5rem;cursor:pointer;text-align:center;padding:2rem";
  ov.innerHTML = `
    <div style="font-size:1.6rem;opacity:0.85">${current.data.grade}학년 화면에서 접속하세요</div>
    <div style="font-size:2rem;opacity:0.7">knn-lab.vercel.app</div>
    <div style="font-size:clamp(5rem,22vw,16rem);font-weight:900;letter-spacing:0.1em;color:#a5b4fc">${escH(current.code)}</div>
    <div style="font-size:1.5rem;opacity:0.85">위 코드 + 내 출석번호로 들어가요</div>
    <div style="font-size:1.1rem;opacity:0.5;margin-top:1rem">아무 곳이나 누르면 닫혀요</div>`;
  ov.addEventListener("click", () => ov.remove());
  document.body.appendChild(ov);
}

/* ---------- 대시보드 비밀번호 잠금 ---------- */

const DASH_LOCK_KEY = "knn_dash_lock";
async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("knnlab-dash:" + s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function lockDashboard() {
  $("#dash-main").style.display = "none";
  $("#detail") && ($("#detail").style.display = "none");
  $("#dash-lock-btn").style.display = "none";
  const saved = localStorage.getItem(DASH_LOCK_KEY);
  const setup = !saved;
  $("#lock-sub").textContent = setup
    ? "이 기기에서 처음이에요. 대시보드를 지킬 비밀번호를 정하세요."
    : "선생님 비밀번호를 입력하세요.";
  $("#lock-label").textContent = setup ? "새 비밀번호" : "비밀번호";
  $("#lock-confirm-wrap").style.display = setup ? "" : "none";
  $("#lock-reset").style.display = setup ? "none" : "";
  $("#lock-err").textContent = "";
  $("#lock-pass").value = ""; $("#lock-pass2").value = "";
  $("#dash-lock").style.display = "";
  $("#lock-pass").focus();
}

function unlockDashboard() {
  $("#dash-lock").style.display = "none";
  $("#dash-main").style.display = "";
  $("#dash-lock-btn").style.display = "";
}

async function submitLock() {
  const saved = localStorage.getItem(DASH_LOCK_KEY);
  const pass = $("#lock-pass").value.trim();
  const err = $("#lock-err");
  err.textContent = "";
  if (!saved) {
    if (pass.length < 4) { err.textContent = "4자 이상으로 정해 주세요."; return; }
    if (pass !== $("#lock-pass2").value.trim()) { err.textContent = "두 비밀번호가 서로 달라요."; return; }
    localStorage.setItem(DASH_LOCK_KEY, await sha256(pass));
    unlockDashboard();
  } else {
    if ((await sha256(pass)) === saved) { unlockDashboard(); }
    else { err.textContent = "비밀번호가 맞지 않아요."; $("#lock-pass").select(); }
  }
}

$("#lock-btn").addEventListener("click", submitLock);
$("#lock-pass").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { if ($("#lock-confirm-wrap").style.display === "none") submitLock(); else $("#lock-pass2").focus(); }
});
$("#lock-pass2").addEventListener("keydown", (e) => { if (e.key === "Enter") submitLock(); });
$("#lock-forget").addEventListener("click", (e) => {
  e.preventDefault();
  if (confirm("이 기기의 대시보드 비밀번호와 '내 학급' 목록을 지울까요?\n학급 데이터는 남아 있고, 코드+PIN으로 다시 불러올 수 있어요.")) {
    localStorage.removeItem(DASH_LOCK_KEY);
    localStorage.removeItem(LS_KEY);
    location.reload();
  }
});
$("#dash-lock-btn").addEventListener("click", lockDashboard);

/* ---------- 시작 ---------- */

$("#create-btn").addEventListener("click", createClass);
$("#load-btn").addEventListener("click", loadByCode);
$("#load-code").addEventListener("keydown", (e) => { if (e.key === "Enter") loadByCode(); });
$("#d-refresh").addEventListener("click", renderSection);
$("#d-code").addEventListener("click", showCodeOverlay);
$("#d-code").style.cursor = "pointer";
$("#d-code").title = "클릭하면 크게 보여요";
renderClassList();
lockDashboard();
