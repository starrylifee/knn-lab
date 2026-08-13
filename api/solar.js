// Upstage Solar Pro 3 프록시 — API 키는 Vercel 환경변수(UPSTAGE_API_KEY)에만 존재

// 아주 가벼운 IP 레이트리밋(웜 인스턴스 메모리 기준). KV 없이 무료로 남용 속도를 늦춘다.
const HITS = new Map(); // ip -> [timestamps]
const WINDOW_MS = 60 * 1000;
const MAX_PER_MIN = 20;
function rateLimited(ip) {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  HITS.set(ip, arr);
  if (HITS.size > 5000) HITS.clear(); // 메모리 폭주 방지
  return arr.length > MAX_PER_MIN;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  // 이 앱 도메인에서 온 브라우저 요청만 허용 — 외부인의 무료 LLM 남용 차단.
  // (Origin 헤더는 위조 가능하므로 아래 레이트리밋과 함께 최소한의 방어로만 쓴다.)
  const originHeader = req.headers.origin || req.headers.referer || '';
  let originOk = false;
  try {
    const oh = new URL(originHeader).host;
    originOk = oh === 'knn-lab.vercel.app'
      || /^knn-[a-z0-9-]+\.vercel\.app$/.test(oh)  // 프리뷰 배포
      || /^localhost(:\d+)?$/.test(oh);
  } catch (e) { originOk = false; }
  if (!originOk) {
    return res.status(403).json({ error: '이 앱 화면에서만 사용할 수 있습니다.' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: '요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.' });
  }

  const { messages, temperature } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 6) {
    return res.status(400).json({ error: 'messages 배열(1~6개)이 필요합니다.' });
  }
  for (const m of messages) {
    if (typeof m.content !== 'string' || typeof m.role !== 'string') {
      return res.status(400).json({ error: 'messages의 role·content는 문자열이어야 합니다.' });
    }
  }
  const totalChars = messages.reduce((s, m) => s + m.content.length, 0);
  if (totalChars > 20000) {
    return res.status(413).json({ error: '입력이 너무 깁니다.' });
  }

  const key = process.env.UPSTAGE_API_KEY;
  if (!key) {
    return res.status(500).json({ error: '서버에 UPSTAGE_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    const r = await fetch('https://api.upstage.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'solar-pro3',
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.5,
        max_tokens: 2000,
        stream: false
      })
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || data?.message || 'Upstage API 오류' });
    }

    return res.status(200).json({
      content: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage || null
    });
  } catch (e) {
    return res.status(502).json({ error: 'Upstage API 호출 실패: ' + e.message });
  }
};
