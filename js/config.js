// ── 설정 상수 (수정 빈도: 거의 없음) ────────────────
const SUPA_URL  = 'https://ebbecjfrwaswbdybbgiu.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViYmVjamZyd2Fzd2JkeWJiZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NjE5ODQsImV4cCI6MjA5NTEzNzk4NH0.H2ahQKtWdSke04Pdi3hDY86pdTx7UUKPUpQMlS_zciA';
const HDR = { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON };

const DS_KEY      = 'sk-e4a6f005aecf43d4aa60e77bb71de14c';
const DS_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

const GDC_FEE_RATE      = 0.0020;   // 0.20% — Mastercard 평균의 10%
const REVIEW_REWARD_BASE = 10;       // 리뷰 작성 시 ₮10 GDC
const REVIEW_REWARD_10   = 50;       // 도움됨 10개 달성 시 ₮50 GDC
const REVIEW_REWARD_100  = 200;      // 도움됨 100개 달성 시 ₮200 GDC
