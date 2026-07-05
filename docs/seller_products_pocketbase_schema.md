# `seller_products` PocketBase 컬렉션 스키마

L1(`l1-hanlim.gopang.net`) 관리자 UI에서 **New collection**으로 생성합니다.
(worker.js `_l1SyncSellerProducts`/`_l1ListSellerProducts`가 참조하는 필드명과
정확히 일치해야 합니다 — 철자 하나라도 다르면 조용히 null이 됩니다.)

## 기본 정보
- Collection name: `seller_products`
- Type: Base collection

## 필드

| 필드명 | 타입 | 필수 | 비고 |
|---|---|---|---|
| `seller_guid` | Text | ✅ | 판매자 primary_guid. `profiles.guid`와 동일 값 |
| `product_id` | Text | ✅ | 로컬 IndexedDB의 상품 id(slug). `seller_guid`+`product_id` 조합이 사실상 유니크 |
| `name` | Text | ✅ | 상품/서비스명 |
| `desc` | Text | | 설명 |
| `price` | Number | | null 허용(가격 문의 상품) |
| `unit` | Text | | 예: "1kg", "1회" |
| `category` | Text | ✅ | **업종 자동판단의 근거 데이터** — worker.js의 `_deriveOccupationFromCategories`가 이 필드를 집계함 |
| `stock` | Select | | 옵션: `in`, `low`, `out` |
| `image_url` | URL | | |
| `is_public` | Bool | | 기본값 `true`. `false`면 검색·구매자 조회(`/biz/catalog` GET)에서 제외됨 |
| `updated_at` | Date | | 클라이언트가 보낸 타임스탬프 그대로 저장 |

## API 규칙 (Rules)

**전부 빈 문자열(관리자 전용)로 설정하세요:**
- List/Search rule: (비움)
- View rule: (비움)
- Create rule: (비움)
- Update rule: (비움)
- Delete rule: (비움)

이렇게 하면 PocketBase REST API에 직접 요청해도 관리자 토큰 없이는
아무것도 조회/수정할 수 없습니다. 모든 접근은 반드시 Worker
(`hondi-proxy.tensor-city.workers.dev`)를 거치도록 강제하기 위함입니다 —
Worker가 Ed25519 서명 검증(`_verifyEd25519`)과 공개/비공개(`is_public`)
필터링을 전담하므로, PocketBase 자체는 관리자 전용으로 잠가둬야
그 필터링을 우회당하지 않습니다.

## 인덱스 (권장)
- `seller_guid` 단일 인덱스 — `_l1ListSellerProducts`가 매 조회마다
  `filter=seller_guid='...'`로 쿼리하므로 필수는 아니지만 성능상 권장.

## 확인
컬렉션 생성 후 `L1_ADMIN_EMAIL`/`L1_ADMIN_PASSWORD` secret이 이미
Worker에 설정돼 있으므로(`_l1AdminToken`이 기존 profiles 컬렉션에
쓰던 것과 동일 계정) 별도 자격증명 추가 없이 바로 동작합니다.
