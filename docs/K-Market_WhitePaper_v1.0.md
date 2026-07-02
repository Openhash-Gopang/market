# K-Market 백서 (White Paper)
## AI 자율 시장 플랫폼 — 설계 원리, 구성 요소 및 동작 메커니즘

**버전** v1.0 | **발행** 2026년 6월  
**발행처** AI City Inc. | **플랫폼** market.hondi.net  
**분류** 기술 공개 문서 (Public Technical Document)

---

## 목차

1. [개요 및 철학](#1-개요-및-철학)
2. [고팡 생태계에서의 위치](#2-고팡-생태계에서의-위치)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [핵심 구성 요소](#4-핵심-구성-요소)
5. [판매자 시스템](#5-판매자-시스템)
6. [구매자 AI 비서](#6-구매자-ai-비서)
7. [데이터 흐름 및 PDV 통합](#7-데이터-흐름-및-pdv-통합)
8. [OpenHash 거래 증빙](#8-openhash-거래-증빙)
9. [GWP 연동 프로토콜](#9-gwp-연동-프로토콜)
10. [관리자 대시보드](#10-관리자-대시보드)
11. [국가 경제 대시보드](#11-국가-경제-대시보드)
12. [보안 및 인증](#12-보안-및-인증)
13. [AI 추론 파이프라인](#13-ai-추론-파이프라인)
14. [확장성 및 운영](#14-확장성-및-운영)
15. [로드맵](#15-로드맵)

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
│                    고팡 (hondi.net)                     │
│            AI 통합 플랫폼 — 고팡 AI 비서 (GWP)           │
└────────┬──────────┬──────────┬──────────┬───────────────┘
         │          │          │          │
    ┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼──────┐
    │K-Market│ │K-School│ │ K-Law  │ │ K-Health │
    │시장·거래│ │교육·학습│ │법률·중재│ │의료·건강  │
    └────┬───┘ └────────┘ └────────┘ └──────────┘
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
├── market.hondi.net/desktop.html   ← 랜딩 페이지 / 판매자 등록 포털
│   ├── 사이드바 네비게이션
│   ├── 헤로 섹션 (서비스 소개)
│   ├── 판매자 사이트 생성 엔진
│   └── webapp.html 임베드 (iframe modal)
│
├── market.hondi.net/webapp.html    ← AI 채팅 비서 (PWA)
│   ├── DeepSeek AI 스트리밍 인터페이스
│   ├── PDV 조회/기록
│   ├── GWP 수신 처리
│   └── K-Law 위험 분석
│
└── market.hondi.net/{seller}/      ← 판매자 개별 사이트
    └── kmarket_seller_template.html ← 동적 생성
        ├── 상품 목록 (mode 분기)
        ├── AI 상담 채팅
        ├── Analytics 섹션
        └── 관리자 대시보드 링크

외부 서비스
├── gopang-proxy.tensor-city.workers.dev  (Cloudflare Worker)
│   ├── /deepseek   → DeepSeek API 프록시
│   ├── /geocode    → Kakao 역지오코딩
│   ├── /pdv/report → PDV 기록 전달
│   └── /sso        → 고팡 SSO 토큰 검증
│
├── ebbecjfrwaswbdybbgiu.supabase.co  (Supabase)
│   ├── pdv_log 테이블  (거래 기록)
│   ├── users 테이블    (사용자 정보)
│   └── Storage         (이미지)
│
├── api.deepseek.com  (DeepSeek AI)
│   ├── deepseek-chat    (텍스트 추론)
│   ├── deepseek-v4-pro  (멀티모달)
│   └── deepseek-v4-flash (빠른 추론)
│
└── hondi.net/auth/subsystem-auth.js  (고팡 SSO)
```

### 3.2 배포 환경

| 구성 요소 | 플랫폼 | 도메인 |
|-----------|--------|--------|
| 프론트엔드 | GitHub Pages | market.hondi.net |
| AI 프록시 | Cloudflare Workers | gopang-proxy.tensor-city.workers.dev |
| 데이터베이스 | Supabase (PostgreSQL) | ebbecjfrwaswbdybbgiu.supabase.co |
| CDN/캐시 | Cloudflare | 전역 엣지 |
| AI 추론 | DeepSeek API | api.deepseek.com |
| 인증 | 고팡 SSO | hondi.net/auth |

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

`webapp.html`은 K-Market AI 비서의 실제 인터페이스로, **외부 JS 모듈 의존 없이 단일 파일(~2,160줄)**로 구성되어 있다.

**인라인 모듈 구조**

```
<script> [Block 1 — 설정 및 서비스 모듈]
  const CFG           = { model, proxyURL, systemPrompt }
  const PROXY_BASE    = 'https://gopang-proxy.tensor-city.workers.dev'
  
  // 구 config.js
  // 구 js/core/location.js  → scheduleLocation(), buildLocNote()
  // 구 js/services/pdv.js   → initPDV(), recordPDV()
  // 구 js/services/klaw.js  → klawReview()
  // 구 js/services/gwp.js   → initGWP(), gwpClose()
  // 구 js/services/ai.js    → callAI(), history[]
  // 구 js/services/storage.js
  // 구 js/fiil/reporter.js

<script> [Block 2 — UI 및 이벤트 핸들러]
  // 고팡 index.js v4.0 로직
  // sendMessage(), appendBubble(), showTyping()
  // 설정 패널, PDV 조회, 사진 업로드
  // window._onGopangAuth() ← subsystem-auth.js 콜백

<script type="module"> [subsystem-auth.js — 고팡 SSO]
```

**AI 대화 흐름**

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
    └── 완성 응답 → history 추가 + PDV 기록
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
    deliveryOpts: [        // 배송지 옵션 4종
      '📍 현재 위치', '🏠 주소지', '📦 새로운 장소', '💌 선물'
    ],
    ctaText: (p) => '🛒 AI 상담 · 주문',
  },
  service: {
    stockBadge: false,     // 이용가능 / 예약불가만
    originLabel: false,    // 원산지 없음
    qtyInput: false,       // 수량 없음
    deliveryRow: false,    // 배송지 없음 (매장 주소 표시)
    ctaText: (p) => '📅 AI 상담 · 예약',
  },
  // delivery, hybrid 유사 구조...
}
```

#### 상품 데이터 스키마

```javascript
// product 모드 상품
{ id, name, desc, price(number), unit, category, origin, 
  stock("in"|"low"|"out"), image_url }

// service 모드 상품
{ id, name, desc, price, unit, category,
  duration("40분"), available(true|false), image_url }

// delivery 모드 상품
{ id, name, desc, price, unit, category,
  eta("30분"), stock("in"|"out"), image_url }
```

### 5.2 Analytics 섹션

판매자 공개 사이트에 포함되는 실시간 시장 분석 패널이다.

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

**SP-MKT_seller_site_v2.0.txt 주요 추출 지시사항**

- `mode` 자동 판별 (업종 텍스트 분석)
- `analytics` 초기값 생성 (계절성 패턴 포함)
- `ADMIN_DATA` 전체 재무제표 3종 생성
- 직원 정보, 세금 일정, 경영 전략 과제 자동 생성

### 5.4 법적 요건 검토 (SP-MKT_seller_check_v1.0.txt)

판매자 등록 전 AI가 업종별 법적 요건을 자동 검토한다.

```
검토 항목:
  - 사업자 등록 유형 (일반/간이/면세)
  - 업종별 허가증/신고증 (식품위생, 통신판매업, 의료기기, 건설업...)
  - 소비자보호법 의무 표시 사항
  - 전자상거래법 준수 사항
  - 개인정보처리방침 요건
```

---

## 6. 구매자 AI 비서

### 6.1 AI 의사결정 프로세스

K-Market AI는 구매 의사결정의 전 단계를 지원한다.

```
① 필요성 검토
   사용자: "냉장고 새로 사고 싶어"
   AI: "현재 냉장고 구매 이력 확인 → 5년 전 구매 → 교체 시점 적절. 
        에너지 효율 등급 1등급 제품 위주로 추천드리겠습니다."

② 시장 비교 분석
   - 동일 제품의 K-Market 내 가격 분포 조회
   - 동종 업체 평점 및 배송 실적 비교
   - AI 공정거래 지수 산출

③ 최적 선정 및 주문
   - 품질·가격·배송·신용도 종합 스코어링
   - 사용자 확인 후 주문 실행

④ PDV 자동 기록
   - 거래 내역 6하원칙으로 PDV 저장
   - 재무제표(장부) 자동 갱신
   - OpenHash 불변 기록
```

### 6.2 K-Law 위험 분석 통합

모든 거래에 경량 K-Law 분석이 실시간으로 수행된다.

```javascript
async function klawReview(text) {
  const flags = [];
  if (/사기|허위|위조/i.test(text))  flags.push('⚠️ 사기 의심');
  if (/환불|반품/i.test(text))       flags.push('📋 소비자보호법');
  return { flags, level: flags.length > 0 ? 'S1' : 'S0' };
}
```

위험 등급 체계: `S0(안전)` → `S1(주의)` → `S2(경고)` → `S3(차단)`

---

## 7. 데이터 흐름 및 PDV 통합

### 7.1 PDV (Personal Data Vault) 개념

PDV는 고팡 생태계의 핵심 데이터 아키텍처다.

```
PDV 원칙:
  - 사용자 1인당 1개의 PDV
  - 모든 서비스(K-Market, K-School, K-Law, K-Health)의 
    거래/활동 요약이 PDV에 통합 기록
  - 원본 데이터는 각 서비스 DB에 보관 (K-Market → Supabase pdv_log)
  - PDV에는 6W 요약만 저장 (Who, What, When, Where, Why, How)
  - 오직 본인만 열람 가능
```

### 7.2 pdv_log 테이블 스키마

```sql
CREATE TABLE pdv_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_guid   UUID NOT NULL,          -- 고팡 사용자 식별자
  source      TEXT NOT NULL,          -- 'market' | 'school' | 'klaw' ...
  report_id   UUID,                   -- 각 서비스의 원본 레코드 ID
  
  -- 6W 요약 필드
  who         TEXT,                   -- 거래 당사자
  what        TEXT,                   -- 거래 내용 (상품명, 금액)
  when_ts     TIMESTAMPTZ DEFAULT now(),
  where_loc   TEXT,                   -- 거래 위치
  why         TEXT,                   -- 구매 목적
  how         TEXT,                   -- 결제 수단, 배송 방법
  
  -- 메타
  amount      NUMERIC,                -- 거래 금액
  openhash_tx TEXT,                   -- OpenHash 트랜잭션 ID
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 7.3 PDV 기록 흐름

```
K-Market 거래 완료
        ↓
webapp.html → recordPDV(entry)
        ↓
POST https://gopang-proxy.tensor-city.workers.dev/pdv/report
  {
    user_guid: "사용자 UUID",
    source: "market",
    what: "흑돼지 삼겹살 1kg",
    amount: 35000,
    where: "제주시 한림읍 → 서울시 강남구"
  }
        ↓
Cloudflare Worker → Supabase pdv_log 삽입
        ↓
OpenHash 원장 서명 (트랜잭션 ID 반환)
        ↓
재무제표 자동 갱신 (K-Tax 연동)
```

---

## 8. OpenHash 거래 증빙

### 8.1 OpenHash란

OpenHash는 AI City Inc.가 개발한 **확률적 계층형 분산 원장(PHLD: Probabilistic Hierarchical Ledger on Distributed)**이다.

```
핵심 성능 지표:
  - 처리 속도: 4,399 TPS (Bitcoin 7 TPS 대비 628배)
  - 지연 시간: 0.228ms
  - 에너지 소비: 기존 블록체인 대비 ~98.5% 절감
  - 알고리즘: SHA-256 기반 확률적 해싱
```

### 8.2 K-Market에서의 OpenHash 활용

```
거래 계약 체결 ──────→ OpenHash 기록 (계약 해시)
대금 지급 ───────────→ OpenHash 기록 (결제 해시)  
배송 완료 ───────────→ OpenHash 기록 (이행 해시)

분쟁 발생 시:
  K-Law AI → OpenHash 원장 조회 → 시간 순 증거 제시
  법적 효력: 변조 불가 전자 서명으로 법적 증거 채택 가능
```

### 8.3 판매자 OpenHash 노드 등록

```
제주시 한림읍 판매자 → KR_JEJU_L4 노드 등록
서울 강남 판매자    → KR_SEOUL_L4 노드 등록
부산 판매자        → KR_BUSAN_L4 노드 등록

SELLER_DATA.openhash = { node: "KR_JEJU_L4" }
```

거주지 기반 노드 배정으로 거래의 지역 신뢰성을 확보한다.

---

## 9. GWP 연동 프로토콜

### 9.1 GWP (Gopang Widget Portal)

GWP는 고팡 메인 앱과 K-Market 간의 실시간 연동 프로토콜이다.

```
고팡 AI 비서 (hondi.net)
        ↓  postMessage (GWP_LAUNCH)
K-Market webapp.html (iframe 또는 window.open)
        ↓  처리 완료 후
고팡 AI 비서  ←  postMessage (GWP_SESSION_COMPLETE)
```

### 9.2 GWP 메시지 타입

```javascript
// 고팡 → K-Market
{ type: 'GWP_LAUNCH',          svc: 'market', query: '흑돼지 1kg' }
{ type: 'GWP_CLOSE_REQUEST',   svc: 'market' }

// K-Market → 고팡
{ type: 'GWP_SESSION_COMPLETE', svc: 'market',
  pdv_id: UUID, amount: 35000, items: ['흑돼지 삼겹살'] }
{ type: 'GWP_CLOSE',            svc: 'market' }
```

### 9.3 시나리오 A — 독립 실행

```
사용자 → market.hondi.net/desktop.html
       → "웹앱 열기" 버튼 클릭
       → desktop.html 내 iframe modal에 webapp.html 로드
       → subsystem-auth.js → 고팡 SSO 인증 (Silent iframe)
       → 인증 완료 → AI 채팅 시작
```

### 9.4 시나리오 B — GWP 호출 (hondi.net에서)

```
사용자 → hondi.net AI 비서에게 발화
          "제주 흑돼지 1kg 가장 싼 곳 찾아줘"
       → 고팡 AI: 도메인 분석 → 'market' 매칭
       → GWP_LAUNCH 메시지 → K-Market webapp
       → K-Market AI: 상품 검색 + 가격 비교
       → 최적 결과 반환 → 고팡 AI 비서 화면에 표시
       → 구매 확정 → GWP_SESSION_COMPLETE
```

---

## 10. 관리자 대시보드

### 10.1 kmarket_admin_dashboard.html

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

### 10.2 KPI 상단 5종

```javascript
ADMIN_DATA.kpis = [
  { label: '이번달 매출',   val: '₩4,830,000', change: +14.2 },
  { label: '영업이익',     val: '₩1,246,000', change: +9.8  },
  { label: '영업이익률',   val: '25.8%',       change: +1.2  },
  { label: '판매 건수',   val: '127건',        change: +18.7 },
  { label: '재구매율',    val: '38.4%',        change: +4.3  },
]
```

### 10.3 AI 자동 경보 시스템

```javascript
ADMIN_DATA.alerts = [
  { type: 'red',   title: '재고 부족',   desc: '흑돼지 갈비 재고 15% 미만' },
  { type: 'green', title: '목표 달성',   desc: '이번달 목표 107.3% 달성'   },
  { type: 'amber', title: '세금 납부',   desc: '부가세 신고 마감 D-19'     },
  { type: 'red',   title: '경쟁사 동향', desc: '유사 상품 가격 5% 인하'    },
]
```

---

## 11. 국가 경제 대시보드

### 11.1 kmarket_national_dashboard.html

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

**3단 사용자 뷰**
- 시민 뷰: 요약 카드 + 직관적 시각화
- 전문가 뷰: 원시 데이터 + API 접근
- 정책 담당자 뷰: 시나리오 시뮬레이터 + 경보 패널

---

## 12. 보안 및 인증

### 12.1 고팡 SSO (subsystem-auth.js)

K-Market는 자체 인증 시스템 없이 고팡 통합 SSO를 사용한다.

```javascript
// 인증 흐름
window._onGopangAuth = async function(user) {
  // subsystem-auth.js가 인증 완료 시 이 함수를 호출
  _user = user;  // { guid, level, exp, via }
  initPDV(user);
  initAI(user);
  initGWP(user);
  // ...
};
```

**인증 시나리오**

| 시나리오 | 메커니즘 |
|----------|----------|
| 2B — Silent iframe | hondi.net에 숨겨진 iframe으로 세션 쿠키 자동 검증 |
| 2A — 세션 캐시 | 로컬 스토리지 캐시 토큰 사용 (30일 유효) |
| D — 게스트 | 인증 없이 상품 조회만 허용, 구매시 로그인 요구 |

### 12.2 Cloudflare Worker 보안

`gopang-proxy`는 DeepSeek API 키를 클라이언트에 노출하지 않고 서버사이드에서 관리한다.

```
클라이언트 → Worker → DeepSeek API
              ↑
          API 키 비공개 (Worker 환경변수)
          CORS 화이트리스트: *.hondi.net
          Rate Limiting: 사용자당 60req/min
```

### 12.3 데이터 보호

```
원칙 1: 소비자 데이터 0% 플랫폼 보유
  → 거래 기록은 암호화된 PDV에만 저장
  → K-Market 서버는 익명화된 집계만 보유

원칙 2: OpenHash 불변 기록
  → 거래 완료 후 어떤 관리자도 수정 불가
  → 법적 분쟁 시 원장 그대로 증거 제출

원칙 3: 광고 없는 플랫폼
  → 광고주의 상품 노출 우선순위 조작 불가
  → AI는 오직 사용자 이익 기준으로 추천
```

---

## 13. AI 추론 파이프라인

### 13.1 DeepSeek 모델 선택

| 모델 | 용도 | 특징 |
|------|------|------|
| `deepseek-chat` | 일반 상담, 텍스트 추론 | 기본 모델, 빠름 |
| `deepseek-v4-pro` | 이미지 포함 분석 | 멀티모달, 고품질 |
| `deepseek-v4-flash` | 빠른 응답 필요 시 | 속도 우선 |
| `deepseek-reasoner` | 복잡한 법적·재무 분석 | 추론 특화 (R1) |

### 13.2 스트리밍 응답 처리

```javascript
// SSE(Server-Sent Events) 스트리밍 파싱
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  
  for (const line of buf.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (data === '[DONE]') break;
    
    const chunk = JSON.parse(data);
    const delta = chunk.choices?.[0]?.delta?.content || '';
    fullText += delta;
    _updateStreamBubble(bubble, fullText);  // 실시간 렌더링
  }
}
```

### 13.3 시스템 프롬프트 설계

K-Market AI의 시스템 프롬프트는 다음 원칙으로 설계되었다.

```
1. 역할 명시: "K-Market AI 비서"로 정체성 고정
2. 행동 원칙: 사용자 이익 최우선 (광고주, 플랫폼 이익 배제)
3. 분석 능력: 가격·품질·법적 요건 동시 분석
4. PDV 연동: 모든 거래 자동 기록 안내
5. 위치 활용: GPS 기반 주변 판매자 우선 추천
6. 언어: 한국어 응답, 간결·실용적 조언
```

### 13.4 판매자 데이터 추출 프롬프트 (SP v2.0)

판매자 정보에서 구조화된 JSON을 추출하는 전문 프롬프트다.

```
입력: 판매자 자유형식 텍스트 + 법적 서류 정보
출력: const SELLER_DATA = { ... }  (Block 1)
      const ADMIN_DATA  = { ... }  (Block 2)

Block 1 추출 항목 (47개 필드):
  mode, business.*, legal.*, gps.*, products[],
  reviews[], rating_dist, stats, seller.*, docs[],
  openhash, analytics.*, chat.*

Block 2 추출 항목 (재무 시계열):
  kpis[], monthly.{revenue, op_profit, net_profit, margins},
  daily_this_month[], category_mix, finance.{income_stmt,
  cash_flow, balance}, hr.{kpis, employees, monthly_cost},
  tax.{upcoming, ytd, estimated}, strategy.{daily, weekly,
  monthly, quarterly}, alerts[]
```

---

## 14. 확장성 및 운영

### 14.1 멀티 서비스 확장 구조

```
현재 구현된 서비스:
  K-Market  (market.hondi.net)   ← 본 문서
  K-School  (school.hondi.net)   ← 교육 서비스
  K-Law     (klaw.hondi.net)     ← 법률 서비스

개발 예정:
  K-Health  (health.hondi.net)   ← 의료
  K-Tax     (tax.hondi.net)      ← 세금
  K-Finance (finance.hondi.net)  ← 금융
```

모든 서비스는 동일한 고팡 SSO, PDV, OpenHash 인프라를 공유한다.

### 14.2 판매자 생태계 확장

```
현재:
  판매자 → desktop.html에서 AI 사이트 생성
          → 단일 HTML 파일 다운로드

로드맵:
  → market.hondi.net/{판매자ID}/ 자동 호스팅
  → 실거래 데이터 실시간 Analytics 갱신
  → OpenHash 노드 자동 등록
  → K-Tax 자동 연동 (세금 계산·납부)
```

### 14.3 성능 목표

| 지표 | 목표값 | 현재 구현 |
|------|--------|-----------|
| 페이지 로드 | < 2초 | Cloudflare CDN |
| AI 첫 응답 | < 1.5초 | 스트리밍 |
| PDV 기록 | < 500ms | Worker 직접 호출 |
| OpenHash 기록 | < 228ms | PHLD 알고리즘 |
| 동시 접속 | 10,000+ | Cloudflare 엣지 |

---

## 15. 로드맵

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

### Phase 2 — 6개월 내

- [ ] market.hondi.net/{id} 판매자 자동 호스팅
- [ ] 실거래 기반 Analytics 실시간 갱신
- [ ] K-Tax 세금 자동 계산·납부 연동
- [ ] OpenHash 노드 자동 배정 API
- [ ] 판매자 신용 점수 실시간 산출
- [ ] 구매자 개인 재무제표 자동 갱신

### Phase 3 — 1년 내

- [ ] 국가 경제 대시보드 실거래 데이터 연동
- [ ] SEOM(Sovereign Equity OpenHash Market) 디지털 화폐 통합
- [ ] 글로벌 판매자 지원 (UN 193개국)
- [ ] AI 공정거래위원회 자동화 시스템
- [ ] K-Market SDK 외부 개발자 공개

---

## 부록 A — 파일 구조

```
market.hondi.net/
├── desktop.html              # 메인 랜딩 + 판매자 포털 (~1,720줄)
├── webapp.html               # AI 채팅 비서 (~2,160줄, 올인원)
├── kmarket_seller_template.html  # 판매자 사이트 템플릿
├── kmarket_admin_dashboard.html  # 관리자 대시보드
├── kmarket_national_dashboard.html  # 국가 경제 대시보드
├── prompts/
│   ├── SP-MKT_seller_site_v2.0.txt   # 판매자 JSON 추출 (303줄)
│   └── SP-MKT_seller_check_v1.0.txt  # 법적 요건 검토
└── manifest.json             # PWA 매니페스트
```

## 부록 B — API 엔드포인트

| 엔드포인트 | 메서드 | 기능 |
|-----------|--------|------|
| `gopang-proxy.../deepseek` | POST | DeepSeek AI 프록시 (스트리밍) |
| `gopang-proxy.../pdv/report` | POST | PDV 거래 기록 |
| `gopang-proxy.../geocode` | GET | Kakao 역지오코딩 |
| `supabase.../pdv_log` | GET/POST | PDV 원장 직접 접근 |
| `hondi.net/auth/subsystem-auth.js` | — | SSO 모듈 로드 |

## 부록 C — 주요 기술 스택

| 구성 | 기술 |
|------|------|
| 프론트엔드 | Vanilla HTML/CSS/JS (프레임워크 없음) |
| AI 모델 | DeepSeek Chat / V4 Pro / R1 |
| 데이터베이스 | Supabase (PostgreSQL) |
| 서버리스 | Cloudflare Workers |
| CDN | Cloudflare |
| 차트 | Chart.js 4.4.0 |
| 폰트 | Inter + Noto Sans KR (Google Fonts) |
| 인증 | 고팡 SSO (hondi.net/auth) |
| 원장 | OpenHash PHLD |

---

*본 문서는 AI City Inc.의 K-Market 플랫폼의 기술 공개 문서입니다.*  
*문의: tensor.city@gmail.com | 제주특별자치도 제주시 한림읍*
