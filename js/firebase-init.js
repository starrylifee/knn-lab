/* firebase-init.js — Firebase 초기화 (compat SDK) + 익명 인증
 * 각 HTML에서 gstatic compat 스크립트(app, auth, firestore)를 먼저 로드한 뒤 이 파일을 로드한다. */

firebase.initializeApp({
  apiKey: "AIzaSyDfKrNrOLHwEZzP0YlkIlXxAC_5Ph7Duaw",
  authDomain: "knn-lab-2026.firebaseapp.com",
  projectId: "knn-lab-2026",
  storageBucket: "knn-lab-2026.firebasestorage.app",
  messagingSenderId: "950195096974",
  appId: "1:950195096974:web:05270983f50359181fe8df",
});

const fbAuth = firebase.auth();
const fbDb = firebase.firestore();

/* 익명 로그인 — 로그인을 거친 요청만 DB에 접근할 수 있게 한다.
 * authReady는 uid가 준비되면 resolve. 모든 DB 접근 전에 await 한다. */
let _myUid = null;
const authReady = new Promise((resolve, reject) => {
  let kicked = false; // 익명 로그인은 최초 1회만 시도 (교사 구글 로그아웃 직후 재생성 방지)
  fbAuth.onAuthStateChanged((user) => {
    if (user) { _myUid = user.uid; resolve(user.uid); }
    else if (!kicked) { kicked = true; fbAuth.signInAnonymously().catch((e) => reject(e)); }
  });
});
function myUid() { return _myUid; }

/* 학급 코드 유틸 */
function classRef(code) { return fbDb.collection("classes").doc(code); }
function subCol(code, name) { return classRef(code).collection(name); }

/* PIN 해시 — 평문 PIN을 저장/전송하지 않는다. (4자리라 완전한 보안은 아니지만,
 * 파괴적 동작은 보안 규칙에서 이미 막으므로 PIN은 교사 화면 접근 게이트 역할.) */
async function hashPin(code, pin) {
  const enc = new TextEncoder().encode(`knnlab:${code}:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Solar Pro 3 호출 (Vercel 프록시 경유) */
async function askSolar(messages, temperature) {
  const r = await fetch("/api/solar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, temperature }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "AI 호출에 실패했습니다.");
  return data.content;
}

/* HTML 이스케이프 — 사용자 입력을 innerHTML에 넣기 전 반드시 통과시킨다(XSS 방지). */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* 사용자에게 보여줄 오류 메시지 — 영어 원문 대신 친절한 한국어로 변환. */
function friendlyError(e) {
  const msg = (e && e.message) || String(e);
  if (/permission|insufficient|PERMISSION_DENIED/i.test(msg)) return "저장 권한이 없어요. 내 번호가 맞는지 확인하고, 안 되면 선생님을 불러 주세요.";
  if (/network|unavailable|offline|failed to get|timeout/i.test(msg)) return "인터넷이 잠시 불안정해요. 다시 한 번 눌러 주세요.";
  return "문제가 생겼어요. 다시 한 번 눌러 보고, 안 되면 선생님을 불러 주세요.";
}
