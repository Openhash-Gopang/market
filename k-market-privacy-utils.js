/**
 * k-market-privacy-utils.js — K-Market 캡슐 API 키 화이트리스트 + 불일치 이상치 탐지 v1.0
 * 설계 문서: docs/K_MARKET_PUBLIC_MARKET_DATA_SYSTEM_v1_0.md §3, §4, §5 (v1.1 §10 가격공정성과
 * 같은 IQR 기반 관례 재사용)
 *
 * §7(코드 재사용 원칙)에 따라 소규모 셀 억제(suppressSmallCells)는 health 저장소 원본을
 * 그대로 가져와 쓴다. 이 파일이 새로 구현하는 건 두 가지뿐이다:
 *   1. MARKET_CAPSULE_KEYS — 구매자/판매자/제3앵커 캡슐 키 화이트리스트(§4)
 *   2. flagDisputeAnomaly() — K-Health의 flagAccessGap()과 달리 방향성 격차가 아니라
 *      "통계적 이상치" 탐지이므로 새 로직이 필요하다(§5, §7에 명시된 대로 단순 래퍼 불가)
 *
 * 로드 순서(브라우저): k-health-privacy-utils.js → 이 파일
 *   <script src="https://cdn.jsdelivr.net/gh/Openhash-Gopang/health@main/k-health-privacy-utils.js"></script>
 *   <script src="./k-market-privacy-utils.js"></script>
 */

(function () {

/* ════════════════════════════════════════════════════════════
   환경별 원본 유틸리티 로드 (K-School과 동일 패턴)
   ════════════════════════════════════════════════════════════ */
function _loadBase() {
  if (typeof window !== 'undefined' && window.KHealthPrivacyUtils) {
    return window.KHealthPrivacyUtils;
  }
  if (typeof module !== 'undefined' && module.exports) {
    try {
      return require(process.env.K_HEALTH_PRIVACY_UTILS_PATH || '../health/k-health-privacy-utils.js');
    } catch (e) {
      throw new Error(
        'k-health-privacy-utils.js를 찾을 수 없습니다. health 저장소를 형제 디렉터리로 체크아웃하거나, ' +
        'K_HEALTH_PRIVACY_UTILS_PATH 환경변수로 경로를 지정하세요. (' + e.message + ')'
      );
    }
  }
  throw new Error('k-health-privacy-utils.js가 먼저 로드되어야 합니다.');
}

const _base = _loadBase();
const _suppressSmallCells = _base.suppressSmallCells;

/* ════════════════════════════════════════════════════════════
   §4 캡슐 API 키 화이트리스트
   ════════════════════════════════════════════════════════════ */
const MARKET_CAPSULE_KEYS = {
  'k-market.buyer.receipt_status_reported': {
    type: 'enum', values: ['received_ok', 'received_issue', 'not_received'],
    source: 'buyer', desc: '구매자 자기신고 — 수령 상태',
  },
  'k-market.buyer.satisfaction_bucket': {
    type: 'enum', values: ['low', 'mid', 'high'],
    source: 'buyer', desc: '구매자 자기신고 — 만족도 등급(정밀 별점 아님)',
  },
  'k-market.seller.fulfillment_status_reported': {
    type: 'enum', values: ['shipped_ontime', 'shipped_late', 'not_shipped'],
    source: 'seller', desc: '판매자 자기신고 — 이행 상태',
  },
  'k-market.objective.gdc_settlement_confirmed': {
    type: 'bool',
    source: 'objective', desc: '제3 앵커 — GDC 결제 확정 여부(당사자 조작 불가, 가장 신뢰도 높음)',
  },
  'k-market.objective.carrier_tracking_confirmed': {
    type: 'enum', values: [true, false, 'unavailable'],
    source: 'objective', desc: '제3 앵커 — 택배사 추적 확인(연동 시에만, 미연동 시 unavailable)',
  },
};

function isValidCapsuleKey(key) {
  return Object.prototype.hasOwnProperty.call(MARKET_CAPSULE_KEYS, key);
}

/* ════════════════════════════════════════════════════════════
   §3.1 시장 도메인 민감 범주 — 정책 검토위원회 승인 없이 채우지 않는다
   ════════════════════════════════════════════════════════════ */
const SENSITIVE_MARKET_CATEGORIES = [
  // 예시 — 실제 목록은 검토 후 확정 전까지 비워둔다.
  // { code: 'SMALL_SELLER', name: '영세 판매자(월 거래액 하위 구간)', k: 10 },
];

function kForMarketCategory(categoryCode, defaultK = 5) {
  const found = SENSITIVE_MARKET_CATEGORIES.find(c => c.code === categoryCode);
  return found ? found.k : defaultK;
}

/* ════════════════════════════════════════════════════════════
   §5 불일치 이상치 탐지 — 대칭 구조, 방향 판정 없음
   ════════════════════════════════════════════════════════════ */

/**
 * 여러 그룹(판매자군 또는 구매자군)의 비율값 배열에서 IQR 기반 기준선을 계산한다.
 * 평균·표준편차보다 이상치 자체에 덜 민감한 중앙값/사분위 방식을 쓴다(§10과 같은 관례).
 *
 * @param {number[]} rates — 각 그룹의 비율값(0~1), 소규모 셀 억제를 이미 통과한 값이어야 함
 * @returns {{median:number, q1:number, q3:number, iqr:number} | null} 그룹 수가 너무 적으면 null
 */
function computeBaseline(rates) {
  const clean = rates.filter(r => typeof r === 'number' && !Number.isNaN(r)).slice().sort((a, b) => a - b);
  if (clean.length < 4) return null; // 사분위 계산 자체가 무의미한 최소 표본

  const quantile = (arr, q) => {
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return arr[base + 1] !== undefined
      ? arr[base] + rest * (arr[base + 1] - arr[base])
      : arr[base];
  };

  const q1 = quantile(clean, 0.25);
  const q3 = quantile(clean, 0.75);
  const median = quantile(clean, 0.5);
  return { median, q1, q3, iqr: q3 - q1 };
}

/**
 * 특정 그룹의 비율값이 기준선 대비 이상치인지 판정한다. "어느 쪽이 옳다"고
 * 단정하지 않고, 상단/하단 이상치 여부와 크기만 반환한다(§5 원칙).
 *
 * @param {{key:string, rate:number, sampleSize:number}} group
 * @param {{median:number, q1:number, q3:number, iqr:number}} baseline — computeBaseline() 결과
 * @param {object} opts
 *   - minSampleK: 최소 표본(기본 5)
 *   - iqrMultiplier: 이상치 판정 배수(기본 2 — §10 가격위치지수와 동일 관례)
 */
function flagDisputeAnomaly(group, baseline, opts = {}) {
  const minSampleK = opts.minSampleK ?? 5;
  const iqrMultiplier = opts.iqrMultiplier ?? 2;

  if (!group || group.sampleSize < minSampleK) {
    return { key: group?.key, flagged: false, reason: 'insufficient_sample' };
  }
  if (!baseline) {
    return { key: group.key, flagged: false, reason: 'insufficient_baseline_groups' };
  }
  if (baseline.iqr === 0) {
    // 전체가 동일값이면(변동 없음) 이상치 판정 자체가 무의미
    return { key: group.key, flagged: false, reason: 'zero_variance_baseline' };
  }

  const upperBound = baseline.q3 + iqrMultiplier * baseline.iqr;
  const lowerBound = baseline.q1 - iqrMultiplier * baseline.iqr;

  if (group.rate > upperBound) {
    return {
      key: group.key, flagged: true, direction: 'high',
      magnitude: Math.round(((group.rate - baseline.median) / baseline.iqr) * 10) / 10, // IQR 단위 대략치
      interpretation: '동종 그룹 대비 이상치(상단) — 추가 조사가 필요한 패턴일 뿐, 어느 쪽이 옳다는 판정이 아닙니다.',
    };
  }
  if (group.rate < lowerBound) {
    return {
      key: group.key, flagged: true, direction: 'low',
      magnitude: Math.round(((baseline.median - group.rate) / baseline.iqr) * 10) / 10,
      interpretation: '동종 그룹 대비 이상치(하단) — 추가 조사가 필요한 패턴일 뿐, 어느 쪽이 옳다는 판정이 아닙니다.',
    };
  }
  return { key: group.key, flagged: false };
}

/**
 * 편의 함수: 여러 그룹을 한 번에 처리한다(기준선은 대상 그룹을 포함한 전체 모집단에서 계산).
 * @param {Array<{key:string, rate:number, sampleSize:number}>} groups
 * @param {object} opts — flagDisputeAnomaly와 동일
 */
function flagDisputeAnomalyBatch(groups, opts = {}) {
  const minSampleK = opts.minSampleK ?? 5;
  const eligible = groups.filter(g => g.sampleSize >= minSampleK);
  const baseline = computeBaseline(eligible.map(g => g.rate));
  return groups.map(g => flagDisputeAnomaly(g, baseline, opts));
}

/* ════════════════════════════════════════════════════════════
   내보내기
   ════════════════════════════════════════════════════════════ */
const KMarketPrivacyUtils = {
  // K-Health 원본 재노출(§7 원칙 — 새로 구현 안 함)
  suppressSmallCells: _suppressSmallCells,
  // K-Market 전용
  MARKET_CAPSULE_KEYS,
  isValidCapsuleKey,
  SENSITIVE_MARKET_CATEGORIES,
  kForMarketCategory,
  computeBaseline,
  flagDisputeAnomaly,
  flagDisputeAnomalyBatch,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = KMarketPrivacyUtils;
}
if (typeof window !== 'undefined') {
  window.KMarketPrivacyUtils = KMarketPrivacyUtils;
}

})();
