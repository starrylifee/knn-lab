/* knn.js — 공용 KNN 로직 */

/* 유클리드 거리 */
function distance(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
  return Math.sqrt(s);
}

/* 가중치 적용 거리 (weights 생략 시 모두 1) */
function weightedDistance(a, b, weights) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const w = weights ? weights[i] : 1;
    s += w * (a[i] - b[i]) * (a[i] - b[i]);
  }
  return Math.sqrt(s);
}

/* K개 이웃 반환: [{item, dist}] 가까운 순 */
function nearest(point, data, k, getVec, weights) {
  return data
    .map((item) => ({ item, dist: weightedDistance(point, getVec(item), weights) }))
    .sort((x, y) => x.dist - y.dist)
    .slice(0, k);
}

/* KNN 분류: 이웃 다수결. 반환 {label, votes:{라벨:표}, neighbors} */
function knnClassify(point, data, k, getVec, getLabel) {
  const nb = nearest(point, data, k, getVec);
  const votes = {};
  nb.forEach((n) => {
    const l = getLabel(n.item);
    votes[l] = (votes[l] || 0) + 1;
  });
  let best = null, bestCount = -1;
  Object.keys(votes).forEach((l) => {
    if (votes[l] > bestCount) { best = l; bestCount = votes[l]; }
  });
  return { label: best, votes, neighbors: nb };
}
