# K-Market 백서 (White Paper)
## AI 자율 시장 플랫폼 — 설계 원리, 구성 요소 및 동작 메커니즘

**버전** v1.1 | **발행** 2026년 6월  
**발행처** AI City Inc. | **플랫폼** market.gopang.net  
**분류** 기술 공개 문서 (Public Technical Document)  
**변경 이력** v1.0 → v1.1: market→gdc→tax 3시스템 연동 파이프라인 추가

---

## 목차

1. [개요 및 철학](#1-개요-및-철학)
2. [고팡 생태계에서의 위치](#2-고팡-생태계에서의-위치)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [핵심 구성 요소](#4-핵심-구성-요소)
5. [판매자 시스템](#5-판매자-시스템)
6. [구매자 AI 비서](#6-구매자-ai-비서)
7. [데이터 흐름 및 PDV 통합](#7-데이터-흐름-및-pdv-통합)
8. [gdc·tax 연동 파이프라인](#8-gdctax-연동-파이프라인)
9. [OpenHash 거래 증빙](#9-openhash-거래-증빙)
10. [GWP 연동 프로토콜](#10-gwp-연동-프로토콜)
11. [관리자 대시보드](#11-관리자-대시보드)
12. [국가 경제 대시보드](#12-국가-경제-대시보드)
13. [보안 및 인증](#13-보안-및-인증)
14. [AI 추론 파이프라인](#14-ai-추론-파이프라인)
15. [확장성 및 운영](#15-확장성-및-운영)
16. [로드맵](#16-로드맵)

---

## 1. 개요 및 철학

### 1.1 K-Market란

K-Market는 고팡(Gopang) 생태계의 **AI 자율 시장 플랫폼**이다. 기존 이커머스가 소비자 데이터를 플랫폼이 보유하고 광고 수익 모델로 운영되는 것과 달리, K-Market는 다음 세 가지 원칙 위에 설계되었다.

| 원칙 | 내용 |
|------|------|
| **데이터 주권** | 소비자 거래 데이터는 소비자 본인의 PDV에만 저장되며 플랫폼은 0% 보유 |
| **AI 공정 거래** | 각 사용자 전담 AI Agent가 24시간 가격·품질·법적 요건을 분석하여 최적 거래를 중개 |
| **투명 공개** | 모든 거래는 OpenHash 분산 원장에 불변 기록되어 누구도 조작 불가 |

### 1.2 핵심 명제

> *"귀하의 AI 비서와 AI Agent들은 세상의 모든 지식을 갖추고, 오직 귀하의 이익을 위해 헌신합니다."*

K-Market AI는 플랫폼이나 광고주의 이익이 아닌 **해당 사용자의 이익만을 최우선**으로 판단한다. 이를 위해:

- 구매자 AI: 상품 필요성 검토 → 품질·가격 비교 → 최적 판매자 선정 → PDV 자동 기록
- 판매자 AI: 사업성 분석 → 판매자 사이트 자동 생성 → 경영 전략 수립 → 세금 자동 처리

### 1.3 PD-TJM 모델

K-Market는 Gopang의 **PD-TJM(Preventive Dispute — Total Justice Machine)** 철학을 상거래 영역에 적용한다.

```
분쟁의 90% → K-Market AI 검토 단계에서 예방
분쟁의  9% → K-Law AI 중재로 해결
분쟁의  1% → 법원 판단 (증거: OpenHash 원장)
```

---

## 2. 고팡 생태계에서의 위치

```
┌─────────────────────────────────────────────────────────┐
│                    고팡 (gopang.net)                     │
│            AI 통합 플랫폼 — 고팡 AI 비서 (GWP)           │
└────────┬──────────┬──────────┬──────────┬───────────────┘
         │          │          │          │
    ┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼──────┐
    │K-Market│ │K-School│ │ K-Law  │ │ K-Health │
    │시장·거래│ │교육·학습│ │법률·중재│ │의료·건강  │
    └────┬───┘ └────────┘ └────────┘ └──────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │     고팡 경제 3각 연동 (v1.1 신규)          │
    │                                           │
    │  market ──write──► fs_ledger ◄──read── gdc│
    │                        │                  │
    │                     gdc PATCH             │
    │                        ▼                  │
    │              user_profiles.extra.fs        │
    │                        │                  │
    │                     tax READ              │
    │                        ▼                  │
    │              세금 계산 → 납세 기록           │
    └────────────────────────────────────────────┘
         │
    ┌────▼────────────────────────┐
    │     공통 인프라               │
    │  OpenHash PHLD 분산 원장     │
    │  PDV (Personal Data Vault)  │
    │  Supabase (ebbecjfr...)     │
    │  Cloudflare Worker (Proxy)  │
    └─────────────────────────────┘
```

K-Market는 독립적인 서브 서비스이면서, 고팡 AI 비서의 **GWP(Gopang Widget Portal) 프로토콜**을 통해 고팡 메인 앱과 실시간으로 연동된다.

---

## 3. 시스템 아키텍처

### 3.1 전체 구조

```
사용자 단말 (모바일/데스크톱)
│
├── market.gopang.net/desktop.html   ← 랜딩 페이지 / 판매자 등록 포털
│   ├── 사이드바 네비게이션
│   ├── 헤로 섹션 (서비스 소개)
│   ├── 판매자 사이트 생성 엔진
│   └── webapp.html 임베드 (iframe modal)
│
├── market.gopang.net/webapp.html    ← AI 채팅 비서 (PWA)
│   ├── DeepSeek AI 스트리밍 인터페이스
│   ├── PDV 조회/기록
│   ├── GWP 수신 처리
│   ├── K-Law 위험 분석
│   └── [TRADE] 블록 파싱 → fs_ledger INSERT (v1.1 신규)
│
└── market.gopang.net/{seller}/      ← 판매자 개별 사이트
    └── kmarket_seller_template.html ← 동적 생성
        ├── 상품 목록 (mode 분기)
        ├── AI 상담 채팅
        ├── Analytics 섹션
        └── 관리자 대시보드 링크

외부 서비스
├── gopang-proxy.tensor-city.workers.dev  (Cloudflare Worker v4.3)
│   ├── /deepseek   → DeepSeek API 프록시
│   ├── /geocode    → Kakao 역지오코딩
│   ├── /pdv/report → PDV 기록 전달
│   └── /sso        → 고팡 SSO 토큰 검증
│
├── ebbecjfrwaswbdybbgiu.supabase.co  (Supabase)
│   ├── fs_ledger 테이블  (거래 원장 — market이 기록, gdc·tax가 읽음)
│   ├── user_profiles 테이블  (사용자 재무제표 extra.fs)
│   ├── pdv_log 테이블  (PDV 원장)
│   └── Storage  (이미지)
│
├── api.deepseek.com  (DeepSeek AI)
│   ├── deepseek-chat    (텍스트 추론)
│   ├── deepseek-v4-pro  (멀티모달)
│   └── deepseek-v4-flash (빠른 추론)
│
└── gopang.net/auth/subsystem-auth.js  (고팡 SSO)
```

### 3.2 배포 환경

| 구성 요소 | 플랫폼 | 도메인 |
|-----------|--------|--------|
| 프론트엔드 | GitHub Pages | market.gopang.net |
| AI 프록시 | Cloudflare Workers v4.3 | gopang-proxy.tensor-city.workers.dev |
| 데이터베이스 | Supabase (PostgreSQL) | ebbecjfrwaswbdybbgiu.supabase.co |
| CDN/캐시 | Cloudflare | 전역 엣지 |
| AI 추론 | DeepSeek API | api.deepseek.com |
| 인증 | 고팡 SSO | gopang.net/auth |

---

## 4. 핵심 구성 요소

### 4.1 desktop.html — 랜딩 페이지 & 판매자 포털

`desktop.html`은 K-Market의 메인 진입점으로, 다음 기능을 수행한다.

**구조 (단일 HTML 파일, ~1,700줄)**

```
<nav>            실시간 티커 + SSO 인증 상태
<aside.sidebar>  좌측 사이드바 (hover 확장, 23px 아이콘)
<main>
  .ticker-bar    시장 지표 실시간 스크롤
  #overview      K-Market 소개 (구매자/판매자 기능)
  #features      핵심 기능 카드
  #seller        판매자 등록 & AI 사이트 생성 엔진
  #features2     AI Agent 목록
  #how-it-works  단계별 동작 설명
  #steps         GWP 연동 시나리오
</main>
<div#webapp-modal>  webapp.html iframe 컨테이너
```

**판매자 사이트 생성 엔진 (핵심 기능)**

```javascript
// 판매자 정보 입력 → DeepSeek 추론 → SELLER_DATA + ADMIN_DATA JSON 생성
// → kmarket_seller_template.html에 주입 → 완성된 HTML 다운로드

async function generateSellerSite(sellerInput) {
  // 1. SP-MKT_seller_site_v2.0.txt 시스템 프롬프트 로드
  // 2. gopang-proxy/deepseek 호출 (스트리밍)
  // 3. SELLER_DATA 블록 파싱 → 템플릿 주입
  // 4. ADMIN_DATA 블록 파싱 → 관리자 대시보드 주입
  // 5. 완성 HTML 다운로드 제공
}
```

### 4.2 webapp.html — AI 채팅 비서 (PWA)

`webapp.html`은 K-Market AI 비서의 실제 인터페이스로, **외부 JS 모듈 의존 없이 단일 파일(~2,278줄)**로 구성되어 있다. (v1.1: fs_ledger 연동 코드 추가로 ~2,160줄 → ~2,278줄)

**인라인 모듈 구조**

```
<script> [Block 1 — 설정 및 서비스 모듈]
  const CFG           = { model, proxyURL, systemPrompt }
  const SUPABASE_URL  = 'https://ebbecjfrwaswbdybbgiu.supabase.co'
  const PROXY_BASE    = 'https://gopang-proxy.tensor-city.workers.dev'

  // 구 config.js
  // 구 js/core/location.js  → scheduleLocation(), buildLocNote()
  // 구 js/services/pdv.js   → initPDV(), recordPDV()
  // 구 js/services/klaw.js  → klawReview()
  // 구 js/services/gwp.js   → initGWP(), gwpClose()
  // 구 js/services/ai.js    → callAI(), history[]
  //   └── [v1.1 신규] _parseTrade(), _recordLedger()
  // 구 js/services/storage.js
  // 구 js/fiil/reporter.js

<script> [Block 2 — UI 및 이벤트 핸들러]
  // 고팡 index.js v4.0 로직
  // sendMessage(), appendBubble(), showTyping()
  // 설정 패널, PDV 조회, 사진 업로드
  // window._onGopangAuth() ← subsystem-auth.js 콜백

<script type="module"> [subsystem-auth.js — 고팡 SSO]
```

**AI 대화 흐름 (v1.1 갱신)**

```
사용자 입력
    ↓
sendMessage()
    ↓
callAI(text, imageFile)
    ├── history 배열에 추가 (최근 12개 유지)
    ├── system prompt + buildLocNote() 결합
    ├── fetch(PROXY_BASE + '/deepseek', { stream: true })
    ├── SSE 스트리밍 파싱 → _updateStreamBubble()
    ├── 완성 응답 → history 추가
    └── [v1.1 신규] _parseTrade(fullText)
              ↓
        [TRADE]{...}[/TRADE] 블록 감지
              ↓
        _recordLedger() → fs_ledger INSERT
              ↓
        recordPDV(kcommerce, transaction)
```

---

## 5. 판매자 시스템

### 5.1 판매자 사이트 템플릿 (kmarket_seller_template.html)

판매자별로 AI가 자동 생성하는 개별 상점 사이트다. **4가지 업종 모드(mode)**를 지원하여 범용성을 확보한다.

#### 업종 모드 분류

| mode | 대상 업종 | 특징 |
|------|-----------|------|
| `product` | 정육점, 농장, 마켓, 온라인쇼핑 | 수량+배송+재고+원산지 |
| `service` | 미용실, 치과, 학원, 헬스장 | 예약+소요시간, 배송 없음 |
| `delivery` | 배달음식, 택시, 퀵서비스 | 현재위치+즉시호출+ETA |
| `hybrid` | 식당, 카페, 편의점 | 배달+방문예약 병행 |

#### MODE_CFG 구조

```javascript
const MODE_CFG = {
  product: {
    stockBadge: true,      // 재고있음 / 재고부족 / 품절
    originLabel: true,     // 원산지 표시
    qtyInput: true,        // 수량 입력 + 합계 계산
    deliveryRow: true,     // 배송지 선택 드롭다운
    ctaText: (p) => '🛒 AI 상담 · 주문',
  },
  service: {
    stockBadge: false,
    originLabel: false,
    qtyInput: false,
    deliveryRow: false,
    ctaText: (p) => '📅 AI 상담 · 예약',
  },
  // delivery, hybrid 유사 구조...
}
```

#### 상품 데이터 스키마

```javascript
// product 모드 상품
{ id, name, desc, price, unit, category, origin,
  stock("in"|"low"|"out"), image_url }

// service 모드 상품
{ id, name, desc, price, unit, category,
  duration("40분"), available(true|false), image_url }

// delivery 모드 상품
{ id, name, desc, price, unit, category,
  eta("30분"), stock("in"|"out"), image_url }
```

### 5.2 Analytics 섹션

```
analytics.kpis           → KPI 4종 (매출, 판매건수, 평균주문, 재구매율)
analytics.sales_monthly  → 12개월 판매량 + 선형 추세선
analytics.price_compare  → 동종업체 가격 비교 (수평 바 차트)
analytics.vfm_trend      → 가성비 지수 월별 추이 (1.0~5.0)
analytics.product_mix    → 상품별 매출 비중 (도넛 차트)
```

모든 차트는 **Chart.js 4.4.0**을 CDN에서 동적 로드하여 렌더링한다.

### 5.3 AI 판매자 사이트 생성 파이프라인

```
판매자 입력 텍스트 + 사업자등록증 정보
          ↓
SP-MKT_seller_site_v2.0.txt (시스템 프롬프트, 303줄)
          ↓
DeepSeek 추론 (deepseek-chat)
          ↓
출력: const SELLER_DATA = { ... }    ← Block 1
      const ADMIN_DATA  = { ... }    ← Block 2
          ↓
SELLER_DATA → kmarket_seller_template.html 주입
ADMIN_DATA  → kmarket_admin_dashboard.html 주입
          ↓
최종 HTML 파일 다운로드 (판매자 사이트 + 관리자 대시보드)
```

---

## 6. 구매자 AI 비서

### 6.1 시스템 프롬프트 구조 (v1.1 갱신)

```
당신은 K-Market AI 비서입니다.
사용자의 구매 의사결정을 돕고, 가격·품질·법적 요건을 분석합니다.
모든 거래는 PDV에 기록되어 사용자의 재무제표에 반영됩니다.

[v1.1 추가] 거래 완료 기록 규칙:
사용자가 구체적 금액을 언급하며 구매·판매가 확정된 경우,
응답 마지막에 아래 블록을 JSON 형식으로 출력:

[TRADE]{"direction":"credit","amount":50000,"item_name":"제주 감귤 10kg","fs_account":"revenue"}[/TRADE]

- direction: "credit"(판매·수입) 또는 "debit"(구매·지출)
- amount: 정수 (숫자만)
- item_name: 거래 품목명 (30자 이내)
- fs_account: "revenue"(매출) | "purchase"(매입) | "opex"(경비)
- 거래 미확정이면 블록 출력 안 함
```

### 6.2 4단계 의사결정 흐름

```
사용자 구매 요청
    ↓
1단계: 상품 필요성 검토 (충동구매 방지)
    ↓
2단계: 가격·품질 비교 분석
    ↓
3단계: 법적 요건·소비자보호 검토 (K-Law 연동)
    ↓
4단계: 최종 추천 + 거래 확정 → [TRADE] 블록 출력
```

---

## 7. 데이터 흐름 및 PDV 통합

### 7.1 PDV 기록 포인트

| 시점 | type | summary 예시 |
|------|------|------|
| AI 채팅 접속 | `event` | K-Market AI 비서 접속 |
| 거래 완료 (v1.1) | `transaction` | K-Market 거래 — 제주 감귤 10kg ₮50,000 (판매) |

### 7.2 PDV 전송 구조

```javascript
// recordPDV 호출 패턴
await recordPDV({
  report: {
    svc:  'kcommerce',          // gwp-registry.js id와 동일
    type: 'transaction',
    who: {
      ipv6:       _user.guid,
      role:       'user',
      level:      'L0',
      recipients: ['gopang-pdv'],
    },
    when:  { period_start: now, period_end: now },
    where: { svc_url: 'https://market.gopang.net/webapp.html' },
    what:  { summary: `K-Market 거래 — ${item_name} ₮${amount} (판매)` },
    how:   { method: 'K-Market AI 자동 거래 감지 → fs_ledger 기록',
             tx_id: txId },
    why:   { goal: '거래 재무제표 반영' },
  }
});
```

---

## 8. gdc·tax 연동 파이프라인

> **v1.1 신규 섹션** — market, gdc, tax 세 시스템의 소통 메커니즘

### 8.1 설계 원칙 — 느슨한 결합

```
핵심: 각 시스템은 Supabase만 바라본다. 서로를 직접 호출하지 않는다.

나쁜 설계: market → gdc.recordTrade() 직접 호출
           → 시스템 간 함수 의존 → 한 쪽 수정 시 전체 깨짐

좋은 설계: market → fs_ledger (쓰기)
           gdc    → fs_ledger (읽기) + extra.fs (쓰기)
           tax    → extra.fs  (읽기) + fs_ledger (쓰기: 납세)
```

### 8.2 fs_account 표준 코드 (공유 계약)

| `fs_account` | 의미 | 기록 주체 |
|---|---|---|
| `revenue` | 매출 | **market** |
| `purchase` | 매입 | **market** |
| `opex` | 판매비와관리비 | **market** |
| `cogs` | 매출원가 | **market** |
| `gdc_transfer` | GDC 이체 | **gdc** |
| `tax_payment` | 납세 | **tax** |
| `tax_revenue` | 세수 (국세청 수납) | **tax** |

### 8.3 market의 역할 — fs_ledger 기록

AI가 거래 완료를 감지하면 `[TRADE]` 블록을 파싱하여 `fs_ledger`에 INSERT한다. **market은 여기까지만.**

```javascript
// _parseTrade() — AI 응답에서 [TRADE] 블록 추출
async function _parseTrade(aiText, userText) {
  const match = aiText.match(/\[TRADE\](.+?)\[\/TRADE\]/s);
  if (!match) return;

  const { direction, amount, item_name, fs_account } = JSON.parse(match[1]);
  await _recordLedger({ direction, amount, itemName: item_name, fsAccount: fs_account });
}

// _recordLedger() — Supabase fs_ledger INSERT
async function _recordLedger({ direction, amount, itemName, fsAccount }) {
  const txId = crypto.randomUUID();
  await fetch(`${SUPABASE_URL}/rest/v1/fs_ledger`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY,
               'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      tx_id:      txId,
      guid:       _user.guid,
      counterpart:'market.gopang.net',
      direction,
      amount,
      item_name:  itemName,
      fs_account: fsAccount,
      memo:       'K-Market AI 거래 자동 기록',
      tx_at:      new Date().toISOString(),
    }),
  });
  return txId;
}
```

### 8.4 gdc의 역할 — settleLedger 정산

gdc가 `loadHome()` 시 `fs_ledger`를 집계하여 `user_profiles.extra.fs`를 갱신한다.

```
gdc loadHome() 호출
    ↓
settleLedger(guid)
    ├── fs_ledger READ
    │   WHERE guid=eq.{guid}
    │   AND fs_account IN (revenue, purchase, opex, cogs, ...)
    │   GROUP: credit 합산 → revenue
    │          debit 합산  → opex
    ↓
user_profiles PATCH
    extra.fs.pl['pl-revenue']      = revenue 합계
    extra.fs.pl['pl-opex']         = opex 합계
    extra.fs.pl['pl-net-income']   = revenue - opex
    extra.fs.pl['pl-gross-profit'] = revenue - cogs
    (bs-cash는 건드리지 않음 — gdc_transfer로 별도 관리)
```

### 8.5 tax의 역할 — 세금 계산 및 납세

tax가 `extra.fs`를 읽어 세금을 계산하고, 납세 트랜잭션을 `fs_ledger`에 기록한다.

```
tax loadHomeData()
    ↓
user_profiles READ → extra.fs.pl['pl-revenue'], extra.fs.pl['pl-opex']
    ↓
세금 계산
    vat   = revenue × 10%
    it    = (revenue - opex) × 누진세율
    local = it × 10%
    ↓
납부 확정 시 fs_ledger INSERT
    fs_account: 'tax_payment'
    direction:  'debit'
    counterpart:'jeju-tax-authority'
    ↓
pdv_log INSERT (6하 원칙)
```

### 8.6 전체 데이터 흐름 요약

```
market.gopang.net
  AI [TRADE] 블록 감지
       │ INSERT (revenue/purchase/opex)
       ▼
  Supabase: fs_ledger  ←──────────────────────────┐
       │ READ (집계)                                │
       ▼                                            │
  gdc.gopang.net                                   │
  settleLedger()                                   │
       │ PATCH                                     │
       ▼                                            │
  Supabase: user_profiles.extra.fs.pl              │
       │ READ                                       │
       ▼                                            │
  tax.gopang.net                                   │
  세금 계산 → 납부 확정                              │
       │ INSERT (tax_payment) ──────────────────────┘
       │
       ▼
  pdv_log (PDV 원장)
```

### 8.7 통합 파이프라인 테스트 결과

**테스트 스크립트:** `test_full_pipeline.py`

| 단계 | 내용 | 결과 |
|------|------|------|
| T1 | market: fs_ledger INSERT 3건 (판매 2건 + 구매 1건) | ✅ |
| T2 | gdc: settleLedger — extra.fs PL 갱신 | ✅ |
| T3 | tax: 갱신된 재무제표로 세금 계산 | ✅ |
| T4 | 롤백 — 테스트 데이터 원복 | ✅ |

**실제 수치 (Test_A 기준):**

```
기준: pl-revenue ₮4,039,000 / pl-opex ₮8,078 / bs-cash ₮5,680,720

market 거래 추가:
  💰 제주 감귤 20kg   credit  ₮80,000
  💰 한라봉 선물세트  credit  ₮120,000
  💸 포장재 구입      debit   ₮15,000

gdc 정산 후:
  pl-revenue: ₮4,239,000  (+₮200,000)
  pl-opex:    ₮23,078     (+₮15,000)

tax 세금 계산:
  부가세:    −₮423,900
  소득세:    −₮252,955  (누진세율)
  지방소득세:−₮25,296
  납부 총액: −₮702,151
  납세율:     16.6%
```

---

## 9. OpenHash 거래 증빙

### 9.1 원장 기록 원칙

```
거래 완료 시점에 fs_ledger에 불변 기록:
  tx_id:      UUID (거래 고유 식별자)
  guid:       사용자 GUID (IPv6 형식)
  counterpart:거래 상대방 (판매자/구매자)
  direction:  credit(수입) / debit(지출)
  amount:     거래 금액
  item_name:  품목명
  fs_account: 계정과목 (표준 코드)
  tx_at:      거래 시각 (UTC)
```

### 9.2 거래 증빙 체계

```
소비자 분쟁 발생 시:
  1. PDV에서 거래 요약 조회 (6하 원칙)
  2. fs_ledger에서 원장 기록 조회 (tx_id 기준)
  3. OpenHash 앵커로 위변조 검증
  4. K-Law AI에 증거 자동 제출
```

---

## 10. GWP 연동 프로토콜

### 10.1 GWP 라우팅 (gopang-proxy Worker v4.3 기준)

```
사용자: "감귤 사고 싶어"
        │
        ▼
gwp-registry.js 순회
  id: 'kcommerce'   ← gwp-registry.js 등록 ID
  Worker SVC_ALIAS: 'kcommerce' → 'market'  ← v4.3 자동 변환
        │
        ▼
PDV svc: 'market' (정규화) → Level 3 서비스 확인
        │
        ▼
market.gopang.net/webapp.html?gwp=1&ctx=감귤...
```

### 10.2 GWP 파라미터

```
https://market.gopang.net/webapp.html
  ?gwp=1
  &gwp_token=HMAC-SHA256-TOKEN
  &svc=kcommerce
  &ctx=감귤%2010kg%20사고%20싶어
  &return=https://gopang.net
```

### 10.3 세션 완료 통지

```javascript
// 구매 완료 후 고팡 앱으로 복귀
window.parent.postMessage({
  type: 'GWP_SESSION_COMPLETE',
  svc:  'kcommerce',
  result: { tx_id, item_name, amount }
}, 'https://gopang.net');
```

---

## 11. 관리자 대시보드

### 11.1 kmarket_admin_dashboard.html

판매자 전용 경영 현황 패널로, ADMIN_DATA를 기반으로 동작한다.

**7개 섹션 구성**

| 섹션 | 주요 지표 | 차트 유형 |
|------|-----------|-----------|
| 전체 현황 | KPI 5종, 매출·이익 추이, 경기 알림 | 복합 바+추세선 |
| 매출 분석 | 월별 매출·영업이익·순이익 | 복합 바+라인 |
| 재무제표 | 손익계산서·현금흐름표·대차대조표 | 테이블 |
| 세금 관리 | 납부 일정, 연간 예측, 진행률 | 진행 바 |
| 직원 관리 | 인건비 추이, 성과 점수, 만족도 | 바+테이블 |
| 경영 전략 | 일일·주간·월간·분기 과제 칸반 | 카드 |
| 알림 | AI 이상 감지 경보 | 목록 |

### 11.2 세금 관리 섹션 (tax 연동)

v1.1부터 tax.gopang.net과 연동하여 실시간 세금 납부 현황을 표시한다.

```javascript
// ADMIN_DATA.tax 구조 (tax.gopang.net 연동)
ADMIN_DATA.tax = {
  upcoming: [
    { name: '부가세 1기', due: '2026-07-25', amount: 423900, status: 'pending' },
    { name: '종합소득세', due: '2027-05-31', amount: 252955, status: 'pending' },
  ],
  ytd:       { vat: 232000, income_tax: 546302, total: 778302 },
  estimated: { annual_vat: 847800, annual_it: 505910 },
}
```

---

## 12. 국가 경제 대시보드

### 12.1 kmarket_national_dashboard.html

K-Market 거래 데이터와 공공 통계를 결합한 **국가 경제 투명성 플랫폼**이다.

```
데이터 소스:
  K-Market PDV 집계 + 통계청 + 한국은행 + 관세청 + 국세청

공개 원칙:
  투명 공개 · 실시간 · 드릴다운 · 일반인-전문가 이중 뷰
```

**7개 분석 섹션**

| 섹션 | 핵심 지표 |
|------|-----------|
| 경제 개요 | GDP 성장률, CPI, 실업률, 기준금리, 경기선행지수 |
| 지역별 분석 | 17개 시도 GRDP·고용률·창업률·1인당 소득 |
| 업종별 분석 | 23개 산업 매출·영업이익률·성장률 |
| 국민 생활 | 1인당 소비액, 소득 5분위 격차, 직군별 구매 건수 |
| 노동·생산성 | 시간당 노동 생산성, OECD 비교, 고용 형태 비율 |
| 수출·수입 | 월별 수출입, 무역수지, 교역국·품목 비중 |
| AI 정책실 | 자연어 질의, 정책 시뮬레이터, 이상 감지 알림 |

---

## 13. 보안 및 인증

### 13.1 고팡 SSO (subsystem-auth.js)

K-Market는 자체 인증 시스템 없이 고팡 통합 SSO를 사용한다.

```javascript
window._onGopangAuth = async function(user) {
  // user.ipv6  : 사용자 GUID (IPv6 형식) ← user.guid 아님 주의
  // user.level : L0~L3
  // user.via   : session/iframe/gwp
  _user = user;
  initPDV(user);
  initAI(user);
  initGWP(user);
};
```

**인증 시나리오**

| 시나리오 | 메커니즘 |
|----------|----------|
| 2B — Silent iframe | gopang.net에 숨겨진 iframe으로 세션 쿠키 자동 검증 |
| 2A — 세션 캐시 | 로컬 스토리지 캐시 토큰 사용 (30일 유효) |
| D — 게스트 | 인증 없이 상품 조회만 허용, 구매시 로그인 요구 |

### 13.2 Cloudflare Worker v4.3 보안

```
클라이언트 → Worker → DeepSeek API
              ↑
          API 키 비공개 (Worker 환경변수)
          CORS 화이트리스트: *.gopang.net
          SVC_ALIAS: kcommerce → market (PDV 정규화)
```

### 13.3 데이터 보호

**Supabase RLS (Row Level Security)**

`fs_ledger` 테이블은 anon key 직접 SELECT 시 `guid` 필터 없이 조회 불가. `_recordLedger()`는 INSERT만 수행(return=minimal)하므로 RLS 영향 없음. 브라우저 실제 동작에서는 세션 컨텍스트 내 `guid=eq.{자신}` 필터로 정상 조회.

```
원칙 1: 소비자 데이터 0% 플랫폼 보유
  → 거래 기록은 암호화된 PDV에만 저장

원칙 2: OpenHash 불변 기록
  → 거래 완료 후 어떤 관리자도 수정 불가
  → 법적 분쟁 시 원장 그대로 증거 제출

원칙 3: 광고 없는 플랫폼
  → 광고주의 상품 노출 우선순위 조작 불가
```

---

## 14. AI 추론 파이프라인

### 14.1 DeepSeek 모델 선택

| 모델 | 용도 | 특징 |
|------|------|------|
| `deepseek-chat` | 일반 상담, 텍스트 추론 | 기본 모델, 빠름 |
| `deepseek-v4-pro` | 이미지 포함 분석 | 멀티모달, 고품질 |
| `deepseek-v4-flash` | 빠른 응답 필요 시 | 속도 우선 |
| `deepseek-reasoner` | 복잡한 법적·재무 분석 | 추론 특화 (R1) |

### 14.2 스트리밍 응답 처리

```javascript
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });

  for (const line of buf.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const chunk = JSON.parse(line.slice(6).trim());
    const delta = chunk.choices?.[0]?.delta?.content || '';
    fullText += delta;
    _updateStreamBubble(bubble, fullText);
  }
}

// [v1.1] 응답 완료 후 거래 감지
await _parseTrade(fullText, userText);
```

---

## 15. 확장성 및 운영

### 15.1 3시스템 연동 확장 구조 (v1.1)

```
현재 연동 완료:
  K-Market  → fs_ledger INSERT (거래 기록)
  GDC       → fs_ledger READ + extra.fs PATCH (정산)
  K-Tax     → extra.fs READ + fs_ledger INSERT (납세)

개발 예정 연동:
  K-Health  → 의료비 fs_ledger 기록
  K-School  → 교육비 fs_ledger 기록
  K-Gov     → 공과금 fs_ledger 기록
```

### 15.2 성능 목표

| 지표 | 목표값 | 현재 구현 |
|------|--------|-----------|
| 페이지 로드 | < 2초 | Cloudflare CDN |
| AI 첫 응답 | < 1.5초 | 스트리밍 |
| PDV 기록 | < 500ms | Worker 직접 호출 |
| fs_ledger INSERT | < 200ms | Supabase 직접 호출 |
| OpenHash 기록 | < 228ms | PHLD 알고리즘 |

---

## 16. 로드맵

### Phase 1 — 현재 완료

- [x] desktop.html 랜딩 페이지 + 판매자 포털
- [x] webapp.html AI 채팅 비서 (PWA, 단일 파일)
- [x] 판매자 템플릿 4종 모드 (product/service/delivery/hybrid)
- [x] Analytics 섹션 (4종 차트)
- [x] 관리자 대시보드 (7개 섹션)
- [x] 국가 경제 대시보드
- [x] SP-MKT v2.0 (SELLER_DATA + ADMIN_DATA 이중 추출)
- [x] 고팡 SSO 통합
- [x] PDV 기록 파이프라인
- [x] GWP 프로토콜 연동
- [x] **[TRADE] 블록 파싱 → fs_ledger INSERT (v1.1)**
- [x] **market→gdc→tax 3시스템 파이프라인 (v1.1)**

### Phase 2 — 6개월 내

- [ ] market.gopang.net/{id} 판매자 자동 호스팅
- [ ] 실거래 기반 Analytics 실시간 갱신
- [ ] gdc Realtime 구독 → market 거래 즉시 정산
- [ ] OpenHash 노드 자동 배정 API
- [ ] 판매자 신용 점수 실시간 산출

### Phase 3 — 1년 내

- [ ] 국가 경제 대시보드 실거래 데이터 연동
- [ ] SEOM(Sovereign Equity OpenHash Market) 디지털 화폐 통합
- [ ] 글로벌 판매자 지원 (UN 193개국)
- [ ] AI 공정거래위원회 자동화 시스템
- [ ] K-Market SDK 외부 개발자 공개

---

## 부록 A — 파일 구조

```
market.gopang.net/
├── desktop.html                      # 메인 랜딩 + 판매자 포털 (~1,720줄)
├── webapp.html                       # AI 채팅 비서 (~2,278줄, v1.1 갱신)
│   ├── _parseTrade()                 # [TRADE] 블록 파싱 (신규)
│   └── _recordLedger()              # fs_ledger INSERT (신규)
├── kmarket_seller_template.html      # 판매자 사이트 템플릿
├── kmarket_admin_dashboard.html      # 관리자 대시보드
├── kmarket_national_dashboard.html   # 국가 경제 대시보드
├── prompts/
│   ├── SP-MKT_seller_site_v2.0.txt  # 판매자 JSON 추출 (303줄)
│   └── SP-MKT_seller_check_v1.0.txt # 법적 요건 검토
├── docs/
│   └── K-Market_WhitePaper_v1_1.md  # 본 문서
└── manifest.json                     # PWA 매니페스트
```

## 부록 B — API 엔드포인트

| 엔드포인트 | 메서드 | 기능 |
|-----------|--------|------|
| `gopang-proxy.../deepseek` | POST | DeepSeek AI 프록시 (스트리밍) |
| `gopang-proxy.../pdv/report` | POST | PDV 거래 기록 (svc: 'kcommerce') |
| `gopang-proxy.../geocode` | GET | Kakao 역지오코딩 |
| `supabase.../fs_ledger` | POST | 거래 원장 기록 (신규) |
| `supabase.../pdv_log` | GET | PDV 조회 |
| `gopang.net/auth/subsystem-auth.js` | — | SSO 모듈 로드 |

## 부록 C — Supabase 데이터 구조

### fs_ledger (market이 기록하는 컬럼)

| 컬럼 | 타입 | 예시 값 |
|------|------|---------|
| `tx_id` | TEXT | `UUID` |
| `guid` | TEXT | `aaaaaaaa-test-4000-a000-...` |
| `counterpart` | TEXT | `market.gopang.net` |
| `direction` | TEXT | `credit` / `debit` |
| `amount` | NUMERIC | `50000` |
| `item_name` | TEXT | `제주 감귤 10kg` |
| `fs_account` | TEXT | `revenue` / `purchase` / `opex` |
| `memo` | TEXT | `K-Market AI 거래 자동 기록` |
| `tx_at` | TIMESTAMPTZ | `2026-06-04T10:00:00Z` |

### fs_account 코드별 의미

| 코드 | 의미 | direction |
|------|------|-----------|
| `revenue` | 판매 수입 | credit |
| `purchase` | 상품 매입 | debit |
| `opex` | 판매비와관리비 | debit |
| `cogs` | 매출원가 | debit |

## 부록 D — 주요 기술 스택

| 구성 | 기술 |
|------|------|
| 프론트엔드 | Vanilla HTML/CSS/JS (프레임워크 없음) |
| AI 모델 | DeepSeek Chat / V4 Pro / R1 |
| 데이터베이스 | Supabase (PostgreSQL) |
| 서버리스 | Cloudflare Workers v4.3 |
| CDN | Cloudflare |
| 차트 | Chart.js 4.4.0 |
| 폰트 | Inter + Noto Sans KR (Google Fonts) |
| 인증 | 고팡 SSO (gopang.net/auth) |
| 원장 | OpenHash PHLD + Supabase fs_ledger |

---

*본 문서는 AI City Inc.의 K-Market 플랫폼의 기술 공개 문서입니다.*  
*v1.1 갱신: market→gdc→tax 3시스템 연동 파이프라인 추가 (2026-06-04)*  
*문의: tensor.city@gmail.com | 제주특별자치도 제주시 한림읍*
