/* common.js — 탭 전환 + 학급 참여 게이트 (g4/g6 공용) */

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function initTabs() {
  $all(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $all(".tab-btn").forEach((b) => b.classList.remove("active"));
      $all(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $("#" + btn.dataset.tab).classList.add("active");
      window.scrollTo(0, 0);
      document.dispatchEvent(new CustomEvent("tabshow", { detail: btn.dataset.tab }));
    });
  });
}

/* 완료한 차시 탭에 체크 표시 + '다음 차시로' 이동 */
function markTabDone(tabId) {
  const btn = $(`.tab-btn[data-tab="${tabId}"]`);
  if (btn && !btn.dataset.done) { btn.dataset.done = "1"; btn.textContent = "✔ " + btn.textContent; }
}
function goNextTab(currentTabId) {
  const btns = $all(".tab-btn");
  const idx = btns.findIndex((b) => b.dataset.tab === currentTabId);
  if (idx >= 0 && idx < btns.length - 1) btns[idx + 1].click();
}
/* 결과 영역 안에 '다음 차시로 →' 버튼을 한 번만 추가 */
function showNextBtn(containerId, currentTabId) {
  const box = $("#" + containerId);
  if (!box || box.querySelector(".next-tab-btn")) return;
  const btns = $all(".tab-btn");
  const idx = btns.findIndex((b) => b.dataset.tab === currentTabId);
  if (idx < 0 || idx >= btns.length - 1) return;
  const b = document.createElement("button");
  b.className = "btn next-tab-btn";
  b.style.marginTop = "0.9rem";
  b.textContent = "다음 활동으로 →";
  b.addEventListener("click", () => goNextTab(currentTabId));
  box.appendChild(b);
}

/* 학급 참여 정보 (localStorage). 데모 모드에서는 가상 학급에 고정. */
const Join = {
  get code() { return window.DEMO_ON ? DEMO_JOIN.code : (localStorage.getItem("knn_code") || ""); },
  get num() { return window.DEMO_ON ? DEMO_JOIN.num : (localStorage.getItem("knn_num") || ""); },
  set(code, num) {
    if (window.DEMO_ON) return;
    localStorage.setItem("knn_code", code);
    localStorage.setItem("knn_num", String(Number(num))); // '05'/'5' 통일
  },
  clear() {
    if (window.DEMO_ON) return;
    localStorage.removeItem("knn_code"); localStorage.removeItem("knn_num");
  },
};

let CLASS_DATA = null; // {grade, name, settings}

/* 소유권(owner) 도장을 찍어 저장. 남의 번호 문서를 덮어쓰려 하면 규칙이 막고 친절한 오류를 던진다. */
async function ownedSet(ref, data) {
  try {
    await ref.set({ ...data, owner: myUid(), ts: firebase.firestore.FieldValue.serverTimestamp() });
  } catch (e) {
    if (/permission|PERMISSION_DENIED/i.test(e.message || "")) {
      throw new Error("이 번호는 다른 기기에서 먼저 저장돼 여기선 못 바꿔요. 내 번호가 맞다면 선생님을 불러 주세요.");
    }
    throw e;
  }
}

/* AI 켜짐 여부를 호출 직전에 다시 확인(교사가 수업 중 끄면 반영). */
async function aiEnabled(key) {
  try {
    const snap = await classRef(Join.code).get();
    if (snap.exists) CLASS_DATA = snap.data();
  } catch (e) { /* 네트워크 오류 시 마지막으로 읽은 설정 사용 */ }
  const s = CLASS_DATA && CLASS_DATA.settings;
  return !s || s[key] !== false;
}

/* 게이트: 코드·번호 없으면 입력 화면, 있으면 검증 후 콜백 */
async function requireJoin(expectGrade, onReady) {
  const gate = $("#join-gate");
  const main = $("#main-area");

  // 데모 모드: 코드·번호 입력 없이 가상 학급으로 바로 입장
  if (window.DEMO_ON) {
    const snap = await classRef(Join.code).get();
    CLASS_DATA = snap.data();
    gate.style.display = "none";
    main.style.display = "";
    $("#who-badge").textContent = `${CLASS_DATA.name} · ${Join.num}번 체험`;
    const lb = $("#leave-btn");
    if (lb) lb.style.display = "none";
    onReady();
    return;
  }

  try { await authReady; } catch (e) {
    $("#join-err").textContent = "인터넷 연결을 확인하고 새로고침해 주세요.";
  }

  async function enter(code, num) {
    const snap = await classRef(code).get();
    if (!snap.exists) throw new Error("학급 코드를 찾을 수 없어요. 선생님께 다시 확인해 주세요.");
    const data = snap.data();
    if (data.grade !== expectGrade) {
      const other = data.grade === 4 ? "4학년" : "6학년";
      const e = new Error(`이 코드는 ${other} 학급이에요.`);
      e.wrongGrade = true;
      throw e;
    }
    CLASS_DATA = data;
    Join.set(code, num);
    gate.style.display = "none";
    main.style.display = "";
    $("#who-badge").textContent = `${data.name || code} · ${num}번`;
    onReady();
  }

  function showError(e) {
    const errEl = $("#join-err");
    errEl.textContent = e.message;
    if (e.wrongGrade) {
      errEl.innerHTML = `${e.message} <a href="index.html" style="color:var(--brand-deep); font-weight:800">첫 화면으로 가기 →</a>`;
    }
  }

  $("#join-btn").addEventListener("click", async () => {
    const code = $("#join-code").value.trim().toUpperCase();
    const num = $("#join-num").value.trim();
    const errEl = $("#join-err");
    errEl.textContent = "";
    if (!code) { errEl.textContent = "학급 코드를 입력해 주세요."; return; }
    if (!num || isNaN(Number(num)) || Number(num) < 1 || Number(num) > 40) {
      errEl.textContent = "출석번호(1~40)를 입력해 주세요."; return;
    }
    const btn = $("#join-btn");
    btn.disabled = true;
    try { await enter(code, String(Number(num))); }
    catch (e) { showError(e); }
    finally { btn.disabled = false; }
  });

  // 엔터로 진행
  $("#join-code").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#join-num").focus(); });
  $("#join-num").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#join-btn").click(); });

  // 저장된 정보로 자동 재입장 — 단, 공용 크롬북 대비 확인 1회.
  if (Join.code && Join.num) {
    try {
      const snap = await classRef(Join.code).get();
      if (snap.exists && snap.data().grade === expectGrade) {
        const ok = confirm(`${snap.data().name || Join.code} · ${Join.num}번으로 계속할까요?\n(내가 아니면 '취소'를 누르고 내 번호로 다시 들어와요)`);
        if (ok) { await enter(Join.code, Join.num); return; }
      }
      Join.clear();
    } catch (e) {
      // 네트워크 오류면 입장 정보를 지우지 않는다(잘못 삭제 방지).
      if (/not-found|찾을 수 없/i.test(e.message || "")) Join.clear();
      $("#join-err").textContent = "인터넷이 불안정해요. 연결을 확인하고 다시 시도해 주세요.";
    }
  }
  gate.style.display = "";
  main.style.display = "none";
  $("#join-code").focus();
}

/* 다른 사람으로 다시 들어가기 (확인 후) */
function initLeave() {
  const b = $("#leave-btn");
  if (b) b.addEventListener("click", () => {
    if (confirm("정말 나갈까요?\n다시 들어오려면 학급 코드가 필요해요.")) { Join.clear(); location.reload(); }
  });
}

/* 리커트(1~5) 설문 렌더링.
 * 반환 getter(): 모두 답했으면 number[], 아니면 첫 미응답 문항을 강조·스크롤하고 null. */
function renderLikert(containerId, questions) {
  const box = $("#" + containerId);
  box.innerHTML = "";
  questions.forEach((q, i) => {
    const item = document.createElement("div");
    item.className = "q-item";
    item.innerHTML = `<div class="q-text">${i + 1}. ${q}</div>`;
    const row = document.createElement("div");
    row.className = "likert";
    const labels = ["전혀 아니야", "아니야", "보통", "그래", "정말 그래"];
    for (let v = 1; v <= 5; v++) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = `${v} ${labels[v - 1]}`;
      b.addEventListener("click", () => {
        row.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        row.dataset.value = v;
        item.style.outline = "";
        const next = box.children[i + 1];
        if (next) next.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      row.appendChild(b);
    }
    item.appendChild(row);
    box.appendChild(item);
  });
  return () => {
    const rows = $all(".likert", box);
    const vals = rows.map((r) => Number(r.dataset.value || 0));
    const missing = vals.findIndex((v) => v < 1);
    if (missing >= 0) {
      const item = box.children[missing];
      item.style.outline = "3px solid var(--bad)";
      item.style.borderRadius = "10px";
      item.scrollIntoView({ behavior: "smooth", block: "center" });
      box._missingMsg = `${missing + 1}번 문항에 답해 주세요!`;
      return null;
    }
    return vals;
  };
}
function likertMissingMsg(containerId) { return $("#" + containerId)._missingMsg || "아직 답하지 않은 문항이 있어요!"; }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
