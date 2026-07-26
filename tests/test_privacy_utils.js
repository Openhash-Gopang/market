const {
  suppressSmallCells, isValidCapsuleKey, computeBaseline,
  flagDisputeAnomaly, flagDisputeAnomalyBatch, kForMarketCategory,
} = require('../k-market-privacy-utils.js');

let failures = 0;
function assertEq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) { console.error(`FAIL: ${label}\n  actual:   ${a}\n  expected: ${e}`); failures++; }
  else console.log(`OK: ${label}`);
}
function assertTrue(cond, label) {
  if (!cond) { console.error(`FAIL: ${label}`); failures++; }
  else console.log(`OK: ${label}`);
}

/* ── K-Health 원본 재사용 확인 ── */
const r1 = suppressSmallCells([{ key: 'A', count: 3 }], { k: 5 });
assertEq(r1[0].status, 'suppressed', '재사용된 suppressSmallCells: 표본 3명(k=5) → 억제');

/* ── 캡슐 API 키 화이트리스트 ── */
assertTrue(isValidCapsuleKey('k-market.buyer.receipt_status_reported'), '화이트리스트에 있는 키는 유효');
assertTrue(!isValidCapsuleKey('k-market.buyer.raw_gps_log'), '화이트리스트에 없는 키는 무효');
assertTrue(!isValidCapsuleKey('k-health.patient.symptom_reported_monthly'), '다른 도메인 키는 무효');

/* ── computeBaseline ── */
assertEq(computeBaseline([0.1, 0.1, 0.1]), null, '표본 4개 미만이면 기준선 계산 안함(null)');
const base1 = computeBaseline([0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.11]);
assertTrue(base1 !== null, '표본 7개면 기준선 계산됨');
assertTrue(base1.median > 0.07 && base1.median < 0.09, `중앙값이 합리적 범위(실제: ${base1.median})`);

/* ── flagDisputeAnomaly: 표본부족 ── */
const r2 = flagDisputeAnomaly({ key: 'seller-X', rate: 0.5, sampleSize: 3 }, base1, { minSampleK: 5 });
assertEq(r2.flagged, false, '표본 3건(minSampleK=5 미만) → 플래그 안함');
assertEq(r2.reason, 'insufficient_sample', '사유는 표본부족');

/* ── flagDisputeAnomaly: 정상 범위(이상치 아님) ── */
const r3 = flagDisputeAnomaly({ key: 'seller-normal', rate: 0.08, sampleSize: 50 }, base1);
assertEq(r3.flagged, false, '기준선 중앙값 근처 값 → 플래그 안함');

/* ── flagDisputeAnomaly: 상단 이상치 ── */
const r4 = flagDisputeAnomaly({ key: 'seller-high', rate: 0.9, sampleSize: 50 }, base1);
assertEq(r4.flagged, true, '기준선 대비 극단적으로 높은 값 → 상단 이상치 플래그');
assertEq(r4.direction, 'high', '방향은 high');

/* ── flagDisputeAnomaly: 하단 이상치(대칭 확인 — 낮은 쪽도 플래그되어야 함) ── */
const baseWide = computeBaseline([0.3, 0.32, 0.35, 0.38, 0.40, 0.42, 0.45, 0.48]);
const r5 = flagDisputeAnomaly({ key: 'buyer-low', rate: 0.01, sampleSize: 50 }, baseWide);
assertEq(r5.flagged, true, '기준선 대비 극단적으로 낮은 값 → 하단 이상치도 플래그(대칭 구조 확인)');
assertEq(r5.direction, 'low', '방향은 low');

/* ── flagDisputeAnomaly: 이상치 판정에 '어느 쪽이 옳다'는 단정이 없는지 확인 ── */
assertTrue(
  !r4.interpretation.includes('사기') && !r4.interpretation.includes('잘못'),
  '해석 문구에 유죄 추정 표현이 없어야 함(§5 원칙)'
);

/* ── flagDisputeAnomalyBatch ── */
const groups = [
  { key: 'g1', rate: 0.06, sampleSize: 20 },
  { key: 'g2', rate: 0.07, sampleSize: 20 },
  { key: 'g3', rate: 0.08, sampleSize: 20 },
  { key: 'g4', rate: 0.09, sampleSize: 20 },
  { key: 'g5', rate: 0.95, sampleSize: 20 }, // 명백한 이상치
];
const batchResult = flagDisputeAnomalyBatch(groups);
const flaggedKeys = batchResult.filter(r => r.flagged).map(r => r.key);
assertEq(flaggedKeys, ['g5'], '배치 처리: 이상치 그룹(g5)만 플래그되어야 함');

/* ── kForMarketCategory ── */
assertEq(kForMarketCategory('SMALL_SELLER'), 5, 'SENSITIVE_MARKET_CATEGORIES가 비어있으므로 기본 k=5');

console.log(failures === 0 ? '\n✅ 전체 통과' : `\n❌ ${failures}건 실패`);
process.exit(failures === 0 ? 0 : 1);
