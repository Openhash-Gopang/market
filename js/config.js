// ── 설정 상수 (수정 빈도: 거의 없음) ────────────────
const SUPA_URL  = 'https://ebbecjfrwaswbdybbgiu.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViYmVjamZyd2Fzd2JkeWJiZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NjE5ODQsImV4cCI6MjA5NTEzNzk4NH0.H2ahQKtWdSke04Pdi3hDY86pdTx7UUKPUpQMlS_zciA';
const HDR = { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON };

// DeepSeek API 키는 클라이언트에 노출되지 않도록 서버 프록시를 경유합니다.
// 배포 시 /api/ai-search 엔드포인트(Supabase Edge Function 또는 자체 서버)를 구현하세요.
// 로컬 개발 전용: 환경변수 DS_KEY_DEV 를 사용하거나 .env 에서 주입하세요.
const DS_ENDPOINT = '/api/ai-search';   // 프록시 경로 (상대 URL)

const GDC_FEE_RATE      = 0.0020;   // 0.20% — Mastercard 평균의 10%
const REVIEW_REWARD_BASE = 10;       // 리뷰 작성 시 ₮10 GDC
const REVIEW_REWARD_10   = 50;       // 도움됨 10개 달성 시 ₮50 GDC
const REVIEW_REWARD_100  = 200;      // 도움됨 100개 달성 시 ₮200 GDC
