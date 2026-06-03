-- ──────────────────────────────────────────────────────────────
-- 고팡 마켓 — Supabase RLS & 제약 설정 가이드
-- Supabase Dashboard > SQL Editor 에서 실행하세요.
-- ──────────────────────────────────────────────────────────────

-- 1. inventory 테이블 RLS 활성화
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 2. 공개 읽기 (is_public=true 품목만)
CREATE POLICY "public_read_inventory"
  ON inventory FOR SELECT
  USING (is_public = true);

-- 3. 재고 직접 PATCH 차단 — 오직 market_purchase RPC만 허용
--    anon/authenticated 롤은 inventory를 직접 수정할 수 없음
CREATE POLICY "no_direct_inventory_write"
  ON inventory FOR UPDATE
  USING (false);   -- 항상 거부; RPC는 SECURITY DEFINER로 우회

-- 4. CHECK constraint: 재고는 0 미만 불가
ALTER TABLE inventory ADD CONSTRAINT inventory_qty_nonneg CHECK (quantity >= 0);

-- ──────────────────────────────────────────────────────────────
-- 5. market_purchase RPC (SECURITY DEFINER — DB 트랜잭션 보장)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION market_purchase(
  p_tx_id        uuid,
  p_item_id      text,
  p_buyer_guid   uuid,
  p_seller_guid  uuid,
  p_qty          numeric,
  p_unit_price   numeric,
  p_total        numeric,
  p_fee          numeric,
  p_seller_net   numeric,
  p_item_name    text,
  p_delivery     text,
  p_purpose      text,
  p_fee_rate_pct text,
  p_tx_at        timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER          -- 호출자 권한과 무관하게 함수 소유자 권한으로 실행
SET search_path = public
AS $$
DECLARE
  v_current_qty numeric;
BEGIN
  -- ① 재고 확인 + 비관적 잠금 (FOR UPDATE)
  SELECT quantity INTO v_current_qty
    FROM inventory
   WHERE id = p_item_id
   FOR UPDATE;

  IF v_current_qty IS NULL THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  IF v_current_qty < p_qty THEN
    RAISE EXCEPTION 'insufficient_stock: 현재 재고 %', v_current_qty;
  END IF;

  -- ② 재고 차감
  UPDATE inventory SET quantity = quantity - p_qty WHERE id = p_item_id;

  -- ③ 구매자 PDV
  INSERT INTO pdv_log (user_guid, service_id, record_type, summary, what, how, why, category, extra)
  VALUES (p_buyer_guid, 'gopang-market', 'purchase',
          p_item_name || ' ' || p_qty || ' 구매',
          p_item_name, p_delivery, p_purpose, '시장',
          jsonb_build_object('tx_id',p_tx_id,'item_id',p_item_id,'qty',p_qty,
            'unit_price',p_unit_price,'total',p_total,'seller_guid',p_seller_guid,'currency','GDC'));

  -- ④ 판매자 PDV
  INSERT INTO pdv_log (user_guid, service_id, record_type, summary, what, how, why, category, extra)
  VALUES (p_seller_guid, 'gopang-market', 'sale',
          p_item_name || ' ' || p_qty || ' 판매',
          p_item_name, p_delivery, '판매', '시장',
          jsonb_build_object('tx_id',p_tx_id,'item_id',p_item_id,'qty',p_qty,
            'unit_price',p_unit_price,'total',p_total,'fee',p_fee,
            'seller_net',p_seller_net,'buyer_guid',p_buyer_guid,'currency','GDC'));

  -- ⑤ fs_ledger 3건
  INSERT INTO fs_ledger (tx_id, guid, counterpart, direction, amount, item_name, item_id, quantity, fs_account, memo, tx_at)
  VALUES
    (p_tx_id, p_buyer_guid,  p_seller_guid,      'debit',  p_total,      p_item_name,       p_item_id, p_qty, 'cash',         p_item_name || ' 구매', p_tx_at),
    (p_tx_id, p_seller_guid, p_buyer_guid,        'credit', p_seller_net, p_item_name,       p_item_id, p_qty, 'revenue',      p_item_name || ' 판매', p_tx_at),
    (p_tx_id, p_seller_guid, 'gopang-platform',   'debit',  p_fee,        'GDC 거래 수수료', p_item_id, 1,     'platform_fee', 'GDC 수수료 ' || p_fee_rate_pct || '%', p_tx_at);

END;
$$;

-- 6. fs_ledger RLS: 본인 레코드만 읽기
ALTER TABLE fs_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_ledger_read" ON fs_ledger FOR SELECT
  USING (guid = auth.uid()::uuid);
