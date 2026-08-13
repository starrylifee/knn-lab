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

/* 학급 참여 정보 (localStorage) */
const Join = {
  get code() { return localStorage.getItem("knn_code") || ""; },
  get num() { return localStorage.getItem("knn_num") || ""; },
  set(code, num) {
    localStorage.setItem("knn_code", code);
    localStorage.setItem("knn_num", num);
  },
  clear() { localStorage.removeItem("knn_code"); localStorage.removeItem("knn_num"); },
};

let CLASS_DATA = null; // {grade, name, settings}

/* 게이트: 코드·번호 없으면 입력 화면, 있으면 검증 후 콜백 */
async function requireJoin(expectGrade, onReady) {
  const gate = $("#join-gate");
  const main = $("#main-area");

  async function tryEnter(code, num) {
    const snap = await classRef(code).get();
    if (!snap.exists) throw new Error("학급 코드를 찾을 수 없어요. 선생님께 다시 확인해 주세요.");
    const data = snap.data();
    if (data.grade !== expectGrade) throw new Error(`이 코드는 ${data.grade}학년 학급이에요. 학년에 맞는 화면으로 이동해 주세요.`);
    CLASS_DATA = data;
    Join.set(code, num);
    gate.style.display = "none";
    main.style.display = "";
    $("#who-badge").textContent = `${data.name || code} · ${num}번`;
    onReady();
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
    try { await tryEnter(code, num); }
    catch (e) { errEl.textContent = e.message; }
  });

  // 엔터로 진행
  $("#join-code").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#join-num").focus(); });
  $("#join-num").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#join-btn").click(); });

  if (Join.code && Join.num) {
    try { await tryEnter(Join.code, Join.num); return; }
    catch (e) { Join.clear(); }
  }
  gate.style.display = "";
  main.style.display = "none";
  $("#join-code").focus();
}

/* 다른 사람으로 다시 들어가기 */
function initLeave() {
  const b = $("#leave-btn");
  if (b) b.addEventListener("click", () => { Join.clear(); location.reload(); });
}

/* 리커트(1~5) 설문 렌더링. 반환: () => number[]|null */
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
        // 다음 문항으로 부드럽게 스크롤
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
    return vals.every((v) => v >= 1) ? vals : null;
  };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
