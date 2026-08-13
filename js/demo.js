/* demo.js — 참관용 데모 모드 (?demo=1)
 * 실제 Firestore 대신 메모리 안의 가상 학급(DEMO4·DEMO6)을 보여준다.
 * 저장도 메모리에만 되므로 새로고침하면 초기화되고, 실제 DB는 전혀 건드리지 않는다.
 * firebase-init.js 다음, common.js/teacher.js 이전에 로드할 것. */

window.DEMO_ON = /[?&]demo=1/.test(location.search);
window.DEMO_JOIN = window.DEMO_ON
  ? { code: /g6\.html/i.test(location.pathname) ? "DEMO6" : "DEMO4", num: "7" }
  : null;

if (window.DEMO_ON) (function () {

  /* ---------- 가상 데이터 생성 ---------- */

  // 시드 고정 난수 — 누가 언제 열어도 같은 데모 데이터가 보이게 한다.
  let _seed = 20260813;
  function rnd() { _seed = (_seed * 1664525 + 1013904223) % 4294967296; return _seed / 4294967296; }
  function ri(min, max) { return min + Math.floor(rnd() * (max - min + 1)); }
  function r1(min, max) { return Math.round((min + rnd() * (max - min)) * 10) / 10; }

  function dstr(back) {
    const d = new Date(); d.setDate(d.getDate() - back);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const DATES = [dstr(4), dstr(1), dstr(0)]; // 지난주·어제·오늘

  // 4학년: 학생별 상태 밴드(초록 10 · 노랑 9 · 파랑 5)
  const BAND = {};
  for (let n = 1; n <= 24; n++) BAND[n] = n <= 10 ? "green" : n <= 19 ? "yellow" : "blue";
  const RANGE = { green: [3.6, 4.9], yellow: [2.4, 3.8], blue: [1.2, 2.8] };
  function stateOf(v, f, r) { const a = (v + f + r) / 3; return a >= 3.7 ? "green" : a >= 2.6 ? "yellow" : "blue"; }

  const entries = {};
  DATES.forEach((date) => {
    for (let n = 1; n <= 24; n++) {
      if (n === 7 && date === DATES[2]) continue; // 체험용 7번은 오늘 기록 비워둠(6차시 체험 시 확인창 방지)
      if (rnd() < 0.12) continue; // 몇 명은 그날 안 냄
      const [lo, hi] = RANGE[BAND[n]];
      const v = r1(lo, hi), f = r1(lo, hi), r = r1(lo, hi);
      entries[`${n}_${date}`] = { num: n, date, v, f, r, state: stateOf(v, f, r) };
    }
  });

  const cards = {};
  for (let n = 1; n <= 24; n++) {
    if (rnd() < 0.15) continue;
    const pool = [0, 1, 2, 3, 4, 5, 6, 7];
    const picks = [];
    while (picks.length < 4) picks.push(pool.splice(ri(0, pool.length - 1), 1)[0]);
    cards[String(n)] = { num: n, picks };
  }

  const plans = {};
  [
    { num: 2, name: "마음 신호등", who: "우리 반 친구들", features: ["기분 설문", "상태 카드 결과", "비밀 지키기(내 이름 안 보이게)"], screen: "신호등처럼 초록·노랑·파랑 불이 크게 켜지는 화면", worry: "파란불인 친구를 놀리지 않기로 약속해요" },
    { num: 5, name: "오늘의 날씨 마음", who: "4학년 전체", features: ["기분 설문", "그래프 보기", "AI 한마디"], screen: "내 마음이 해·구름·비 그림으로 나오는 화면", worry: "AI 한마디가 기분 나쁘지 않게 부드럽게" },
    { num: 8, name: "충전기 앱", who: "피곤한 친구들", features: ["기분 설문", "상태 카드 결과", "기록 모아 보기"], screen: "배터리 모양이 점점 차오르는 화면", worry: "점수가 낮아도 혼나지 않게 선생님만 보기" },
    { num: 11, name: "마음 우체통", who: "속상한 일이 있는 친구", features: ["기분 설문", "AI 한마디", "비밀 지키기(내 이름 안 보이게)"], screen: "편지를 넣으면 답장이 오는 우체통 화면", worry: "비밀이 꼭 지켜져야 해요" },
    { num: 14, name: "쉬엄쉬엄 알리미", who: "우리 반", features: ["기분 설문", "상태 카드 결과", "그래프 보기"], screen: "반 전체 그래프에서 노란불이 많으면 쉬는 시간 알림", worry: "누가 노란불인지는 안 보이게 점만 표시" },
    { num: 17, name: "기분 저금통", who: "나 자신", features: ["기분 설문", "기록 모아 보기"], screen: "좋은 날마다 동전이 쌓이는 저금통 화면", worry: "나쁜 날도 소중하니까 지우지 않기" },
    { num: 20, name: "포근 이불 앱", who: "쉼이 필요한 친구", features: ["상태 카드 결과", "AI 한마디", "비밀 지키기(내 이름 안 보이게)"], screen: "파란불이면 포근한 이불 그림과 쉬는 방법 알려주기", worry: "억지로 힘내라고 하지 않기" },
    { num: 23, name: "우리 반 마음 지도", who: "선생님과 우리 반", features: ["그래프 보기", "기분 설문", "비밀 지키기(내 이름 안 보이게)"], screen: "점들이 모여 지도처럼 보이는 큰 화면", worry: "점에 이름을 절대 붙이지 않기" },
  ].forEach((p) => { plans[String(p.num)] = p; });

  const reviews = {};
  [
    [1, [5, 4, 5], "상태 카드가 귀여워서 매일 하고 싶어요"],
    [2, [4, 4, 4], "질문이 조금 많지만 금방 끝나요"],
    [4, [5, 5, 5], "내 마음이랑 카드가 진짜 비슷하게 나왔어요"],
    [6, [4, 3, 4], "가끔 결과가 내 생각이랑 달라요"],
    [7, [5, 4, 4], "그래프에서 우리 반 점들을 보는 게 신기해요"],
    [9, [3, 4, 3], "글씨가 조금 더 컸으면 좋겠어요"],
    [10, [5, 5, 4], "AI 한마디가 위로가 됐어요"],
    [12, [4, 4, 5], "친구들한테 추천하고 싶어요"],
    [15, [4, 3, 4], "K를 바꾸면 결과가 달라지는 게 신기해요"],
    [16, [5, 4, 5], "이름이 안 나와서 마음이 편해요"],
    [18, [3, 3, 3], "설문을 이틀 연속 하면 조금 귀찮아요"],
    [21, [4, 4, 4], "파란불일 때 쉬는 방법도 알려주면 좋겠어요"],
    [22, [5, 5, 5], "우리가 기획한 앱이 진짜 생긴 것 같아요"],
    [24, [4, 5, 4], "숫자로 마음을 재는 게 처음엔 이상했는데 재밌어요"],
  ].forEach(([num, stars, text]) => { reviews[String(num)] = { num, stars, text }; });

  // 6학년: 취향 벡터(매운맛·단맛·운동·게임·독서·도전·함께)
  const SNACK = ["새우깡", "포카칩", "홈런볼", "초코파이", "젤리", "꼬북칩", "빼빼로", "양파링"];
  const VIDEO = ["게임 실황", "먹방", "축구 하이라이트", "브이로그", "과학 실험", "댄스 챌린지", "동물 영상", "만들기 영상"];
  const BOOK = ["흔한남매", "해리포터", "추리 동화", "과학 만화", "그리스 로마 신화", "위인전", "웹툰", "동시집"];
  const TOPIC = ["주말에 뭐 하고 놀지", "최애 게임", "급식 베스트 메뉴", "축구 vs 피구", "좋아하는 유튜버", "반려동물 이야기"];
  const prefs = {};
  for (let n = 1; n <= 24; n++) {
    if (rnd() < 0.1 && n !== 7) continue; // 체험용 7번은 반드시 포함(3차시 바로 실행 가능)
    prefs[String(n)] = {
      num: n,
      vec: [ri(1, 5), ri(1, 5), ri(1, 5), ri(1, 5), ri(1, 5), ri(1, 5), ri(1, 5)],
      favs: { snack: SNACK[ri(0, 7)], video: VIDEO[ri(0, 7)], book: BOOK[ri(0, 7)] },
      topic: TOPIC[ri(0, 5)],
    };
  }

  const compare = {};
  [
    [3, "AI가 추천한 3명 중 2명이 내 예상과 같았다. 게임이랑 운동 점수가 비슷해서 그런 것 같다."],
    [5, "1명만 겹쳤다. 나는 자리가 가까운 친구를 골랐는데 AI는 숫자만 보고 골라서 다른 것 같다."],
    [8, "AI 추천이 다 맞았다! 근데 AI는 우리가 싸운 적 있는 건 모른다."],
    [11, "예상 못 한 친구가 추천됐는데 취향표를 보니 진짜 비슷했다. 몰랐던 공통점을 찾았다."],
    [14, "숫자가 같아도 이유는 다를 수 있다. 독서 5점이어도 좋아하는 책이 다르다."],
    [17, "AI는 친한 정도는 모르고 취향만 본다. 둘 다 보면 더 좋은 추천이 될 것 같다."],
    [20, "K를 3에서 5로 바꾸니 추천 친구가 달라졌다. K를 정하는 게 중요한 것 같다."],
    [22, "내 예상은 늘 노는 친구였고 AI는 새로운 친구를 추천했다. 새 친구랑도 이야기해 보고 싶다."],
  ].forEach(([num, note]) => { compare[String(num)] = { num, note }; });

  const ideas = {};
  [
    [2, "급식 메뉴 추천", "우리 학교 학생", "좋아하는 맛 5가지를 점수로 적고 비슷한 친구들이 좋아한 메뉴 추천", "알레르기 있는 친구에게는 그 메뉴를 빼고 추천"],
    [4, "도서관 책 추천", "책 고르기 어려운 친구", "읽은 책 목록이 비슷한 친구가 재밌게 읽은 책을 추천", "만화만 추천되지 않게 여러 종류를 섞어서"],
    [7, "짝 활동 친구 찾기", "우리 반", "모둠 주제 취향이 비슷한 친구끼리 짝 추천", "늘 같은 친구끼리만 되지 않게 가끔 다른 친구도 섞기"],
    [10, "운동 종목 추천", "체육 시간", "달리기·공던지기 기록이 비슷한 친구들이 좋아하는 종목 추천", "기록이 낮다고 종목에서 빼지 않기"],
    [13, "동아리 추천", "5학년 동생들", "취미 설문 점수가 비슷한 선배들이 들어간 동아리 추천", "인원이 몰리면 두 번째 추천도 같이 보여주기"],
    [18, "게임 친구 매칭", "게임 좋아하는 친구", "좋아하는 게임 장르 점수로 비슷한 친구 찾기", "게임 안 하는 친구가 소외되지 않게 다른 놀이도 추천"],
    [21, "생일 선물 추천", "친구 생일 챙기기", "그 친구와 취향이 비슷한 친구들이 좋아한 선물 추천", "비싼 선물이 추천되지 않게 가격 제한을 두기"],
  ].forEach(([num, what, who, rule, guard]) => { ideas[String(num)] = { num, what, who, rule, guard }; });

  /* ---------- 메모리 저장소 + 가짜 Firestore ---------- */

  const db = {
    docs: {
      DEMO4: { grade: 4, name: "참관용 4학년 데모반", pinHash: "demo", settings: { aiComment: true, aiCompare: true, aiChat: true } },
      DEMO6: { grade: 6, name: "참관용 6학년 데모반", pinHash: "demo", settings: { aiComment: true, aiCompare: true, aiChat: true } },
    },
    subs: {
      DEMO4: { cards, entries, plans, reviews },
      DEMO6: { prefs, compare, ideas },
    },
  };

  function merge(base, add) {
    const out = { ...(base || {}) };
    Object.keys(add).forEach((k) => {
      out[k] = (add[k] && typeof add[k] === "object" && !Array.isArray(add[k]) && out[k] && typeof out[k] === "object")
        ? merge(out[k], add[k]) : add[k];
    });
    return out;
  }

  function fakeDoc(map, id) {
    return {
      async get() { return { exists: map[id] !== undefined, data: () => map[id] }; },
      async set(data, opts) { map[id] = (opts && opts.merge) ? merge(map[id], data) : data; },
    };
  }
  function fakeCol(map) {
    return {
      async get() { return { forEach(cb) { Object.keys(map).forEach((id) => cb({ id, data: () => map[id] })); } }; },
      doc(id) { return fakeDoc(map, id); },
    };
  }

  function subMap(code, name) {
    const c = db.subs[code] || (db.subs[code] = {});
    return c[name] || (c[name] = {});
  }

  // firebase-init.js의 함수 선언을 데모용으로 교체
  classRef = function (code) {
    const ref = fakeDoc(db.docs, code);
    ref.collection = (name) => fakeCol(subMap(code, name));
    return ref;
  };
  subCol = function (code, name) { return fakeCol(subMap(code, name)); };

  /* ---------- 데모 안내 띠 ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    const bar = document.createElement("div");
    bar.style.cssText = "position:sticky;top:0;z-index:1000;background:#7c3aed;color:#fff;text-align:center;padding:0.55rem 1rem;font-weight:700;font-size:0.95rem";
    bar.innerHTML = `🔍 참관용 데모 화면 — 모든 데이터는 가상이고, 저장해도 새로고침하면 사라져요. 실제 학급 데이터와 무관합니다. <a href="index.html" style="color:#fde68a;margin-left:0.4rem">실제 첫 화면으로 →</a>`;
    document.body.prepend(bar);
  });
})();
