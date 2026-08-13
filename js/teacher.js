/* teacher.js — 교사 대시보드 */

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

const LS_KEY = "knn_teacher_classes";
function myClasses() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (e) { return []; } }
function saveClasses(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

let current = null; // {code, data}

/* ---------- 학급 목록 ---------- */

function renderClassList() {
  const box = $("#class-list");
  const list = myClasses();
  if (!list.length) { box.innerHTML = `<p class="hint">아직 학급이 없어요. 아래에서 만들어 보세요.</p>`; return; }
  box.innerHTML = "";
  list.forEach((c) => {
    const el = document.createElement("div");
    el.className = "class-item" + (current && current.code === c.code ? " on" : "");
    el.innerHTML = `<span><strong>${c.name}</strong> <span class="hint">(${c.grade}학년)</span></span><span class="badge">${c.code}</span>`;
    el.addEventListener("click", () => openClass(c.code));
    box.appendChild(el);
  });
}

function genCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 헷갈리는 I,L,O,0,1 제외
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
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
    let code = genCode();
    // 코드 충돌 방지
    while ((await classRef(code).get()).exists) code = genCode();
    await classRef(code).set({
      grade, name, pin,
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
  } catch (e) { msg.textContent = "실패: " + e.message; }
}

async function loadByCode() {
  const code = $("#load-code").value.trim().toUpperCase();
  const msg = $("#load-msg");
  if (!code) return;
  const snap = await classRef(code).get();
  if (!snap.exists) { msg.textContent = "그 코드의 학급이 없어요."; return; }
  const d = snap.data();
  const pin = prompt(`'${d.name}' 학급의 교사 PIN을 입력하세요.`);
  if (pin !== d.pin) { msg.textContent = "PIN이 일치하지 않아요."; return; }
  const list = myClasses();
  if (!list.some((c) => c.code === code)) { list.push({ code, name: d.name, grade: d.grade }); saveClasses(list); }
  msg.textContent = "";
  renderClassList();
  openClass(code);
}

/* ---------- 학급 상세 ---------- */

async function openClass(code) {
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

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function resetBtn(sub, label) {
  return `<button class="btn ghost small" data-reset="${sub}" style="border-color:var(--bad); color:var(--bad)">🗑 ${label} 전체 삭제</button>`;
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
    const counts = {};
    for (const s of subs) counts[s] = (await getAll(s)).length;
    const st = current.data.settings || {};
    const toggles = g === 4
      ? [["aiComment", "AI 한마디 (6차시 감정일기 코멘트)"]]
      : [["aiCompare", "AI 추천 비교 (3차시)"], ["aiChat", "AI 토론 도우미 (4차시)"]];

    body.innerHTML = `
      <h3 style="margin-top:0">참여 현황</h3>
      <div class="grid c4">${subs.map((s) =>
        `<div class="mini-card" style="text-align:center"><div style="font-size:1.8rem; font-weight:800">${counts[s]}</div>${names[s]}</div>`).join("")}
      </div>
      <h3>AI 기능 켜고 끄기</h3>
      ${toggles.map(([key, label]) => `
        <div class="toggle-row"><span style="font-weight:700">${label}</span>
          <label class="switch"><input type="checkbox" data-setting="${key}" ${st[key] !== false ? "checked" : ""}><span></span></label>
        </div>`).join("")}
      <h3>데이터 초기화</h3>
      <p class="hint">새 수업을 시작할 때 사용하세요. 삭제한 데이터는 되돌릴 수 없어요.</p>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap">
        ${subs.map((s) => resetBtn(s, names[s])).join("")}
      </div>`;

    $all("[data-setting]", body).forEach((input) => {
      input.addEventListener("change", async () => {
        await classRef(current.code).set({ settings: { [input.dataset.setting]: input.checked } }, { merge: true });
        current.data.settings = { ...(current.data.settings || {}), [input.dataset.setting]: input.checked };
      });
    });
    $all("[data-reset]", body).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const sub = btn.dataset.reset;
        const pin = prompt(`정말 '${names[sub]}' 데이터를 모두 삭제할까요? 교사 PIN을 입력하세요.`);
        if (pin !== current.data.pin) { alert("PIN이 일치하지 않아요."); return; }
        const snap = await subCol(current.code, sub).get();
        const batch = fbDb.batch();
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        alert("삭제 완료");
        renderSection();
      });
    });
    return;
  }

  /* 데이터 테이블 */
  const rows = await getAll(curSec);
  if (!rows.length) { body.innerHTML = `<p class="hint">아직 데이터가 없어요.</p>`; return; }

  let html = "";
  if (curSec === "cards") {
    html = `<table class="data"><tr><th>번호</th><th>고른 카드</th></tr>` + rows.map((r) =>
      `<tr><td>${r.num}</td><td>${(r.picks || []).map((p) => ["🎢", "👻", "🎠", "🚢", "🚗", "🎡", "🍭", "🎁"][p]).join(" ")}</td></tr>`).join("") + `</table>`;
  } else if (curSec === "entries") {
    const stName = { green: "🌞 쌩쌩", yellow: "⛅ 쉬엄쉬엄", blue: "🌙 쉼 필요" };
    html = `<table class="data"><tr><th>번호</th><th>날짜</th><th>활력</th><th>집중</th><th>관계</th><th>상태</th></tr>` + rows
      .sort((a, b) => (a.date === b.date ? a.num - b.num : (a.date < b.date ? 1 : -1)))
      .map((r) => `<tr><td>${r.num}</td><td>${r.date}</td><td>${r.v}</td><td>${r.f}</td><td>${r.r}</td><td>${stName[r.state] || "-"}</td></tr>`).join("") + `</table>`;
  } else if (curSec === "plans") {
    html = rows.map((r) => `<div class="mini-card" style="margin-bottom:0.7rem">
      <strong>${r.num}번 · 「${esc(r.name)}」</strong>
      <p>👥 ${esc(r.who)}</p>
      <p>🧩 기능: ${(r.features || []).map(esc).join(", ") || "-"}</p>
      <p>🖥 화면: ${esc(r.screen) || "-"}</p>
      <p>⚠️ 걱정·약속: ${esc(r.worry) || "-"}</p></div>`).join("");
  } else if (curSec === "reviews") {
    html = `<table class="data"><tr><th>번호</th><th>쉬움</th><th>정확</th><th>추천</th><th>한 줄 평</th></tr>` + rows.map((r) =>
      `<tr><td>${r.num}</td>${(r.stars || []).map((s) => `<td>${"★".repeat(s)}</td>`).join("")}<td style="text-align:left">${esc(r.text)}</td></tr>`).join("") + `</table>`;
  } else if (curSec === "prefs") {
    const L = ["매운맛", "단맛", "운동", "게임", "독서", "도전", "함께"];
    html = `<div style="overflow-x:auto"><table class="data"><tr><th>번호</th>${L.map((l) => `<th>${l}</th>`).join("")}<th>최애 (과자/영상/책)</th><th>모둠 주제</th></tr>` + rows.map((r) =>
      `<tr><td>${r.num}</td>${(r.vec || []).map((v) => `<td>${v}</td>`).join("")}
       <td style="text-align:left">${esc(r.favs?.snack)} / ${esc(r.favs?.video)} / ${esc(r.favs?.book)}</td><td>${esc(r.topic)}</td></tr>`).join("") + `</table></div>`;
  } else if (curSec === "compare") {
    html = rows.map((r) => `<div class="mini-card" style="margin-bottom:0.7rem"><strong>${r.num}번</strong><p>${esc(r.note)}</p></div>`).join("");
  } else if (curSec === "ideas") {
    html = rows.map((r) => `<div class="mini-card" style="margin-bottom:0.7rem">
      <strong>${r.num}번 · ${esc(r.what)}</strong>
      <p>👥 대상: ${esc(r.who) || "-"}</p>
      <p>📏 데이터·규칙: ${esc(r.rule)}</p>
      <p>🛡 편향 방지: ${esc(r.guard) || "-"}</p></div>`).join("");
  }
  body.innerHTML = html;
}

/* ---------- 시작 ---------- */

$("#create-btn").addEventListener("click", createClass);
$("#load-btn").addEventListener("click", loadByCode);
$("#load-code").addEventListener("keydown", (e) => { if (e.key === "Enter") loadByCode(); });
$("#d-refresh").addEventListener("click", renderSection);
renderClassList();
