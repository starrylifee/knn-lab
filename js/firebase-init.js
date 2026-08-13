/* firebase-init.js — Firebase 초기화 (compat SDK)
 * 각 HTML에서 gstatic compat 스크립트(app, firestore)를 먼저 로드한 뒤 이 파일을 로드한다. */

firebase.initializeApp({
  apiKey: "AIzaSyDfKrNrOLHwEZzP0YlkIlXxAC_5Ph7Duaw",
  authDomain: "knn-lab-2026.firebaseapp.com",
  projectId: "knn-lab-2026",
  storageBucket: "knn-lab-2026.firebasestorage.app",
  messagingSenderId: "950195096974",
  appId: "1:950195096974:web:05270983f50359181fe8df",
});

const fbDb = firebase.firestore();

/* 학급 코드 유틸 */
function classRef(code) { return fbDb.collection("classes").doc(code); }
function subCol(code, name) { return classRef(code).collection(name); }

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
