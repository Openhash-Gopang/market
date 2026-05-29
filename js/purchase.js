// ── 구매 모달 & GDC 거래 엔진 (수정 빈도: 높음) ────

let _buyItem = null;

function openBuyModal(item, sellerName) {
  _buyItem = item;
  document.getElementById('m-item-id').value      = item.id;
  document.getElementById('m-seller-guid').value  = item.owner_guid;
  document.getElementById('m-item-name').textContent   = item.name;
  document.getElementById('m-seller-name').textContent = sellerName;
  document.getElementById('m-qty').value   = 1;
  document.getElementById('m-purpose').value = '';
  document.getElementById('m-msg').textContent   = '';
  document.getElementById('m-session-warn').style.display = _viewerGuid ? 'none' : '';
  updateBuyTotal();
  document.getElementById('modal-bg').classList.add('open');
}

function closeBuyModal() {
  document.getElementById('modal-bg').classList.remove('open');
  _buyItem = null;
}

function updateBuyTotal() {
  if (!_buyItem) return;
  const qty     = Math.max(0, parseFloat(document.getElementById('m-qty').value)||0);
  const total   = qty * _buyItem.unit_price;
  const fee     = Math.round(total * GDC_FEE_RATE * 10000) / 10000;
  const net     = total - fee;
  document.getElementById('m-qty-display').textContent = qty;
  document.getElementById('m-unit-price').textContent  = '₮'+fmtN(_buyItem.unit_price);
  document.getElementById('m-fee').textContent         = '₮'+fmtN(fee);
  document.getElementById('m-total').textContent       = '₮'+fmtN(total);
  document.getElementById('m-net').textContent         = '₮'+fmtN(net);
}

async function confirmBuy() {
  if (!_buyItem) return;
  const qty     = parseFloat(document.getElementById('m-qty').value)||0;
  const purpose = document.getElementById('m-purpose').value.trim();
  const msg     = document.getElementById('m-msg');
  const btn     = document.getElementById('m-confirm-btn');

  if (!_viewerGuid)            { msg.textContent='로그인이 필요합니다.'; return; }
  if (qty <= 0)                { msg.textContent='수량을 1 이상 입력하세요.'; return; }
  if (qty > _buyItem.quantity) { msg.textContent=`재고 부족 (현재: ${fmtN(_buyItem.quantity)})`; return; }

  btn.disabled=true; btn.textContent='처리 중…';

  const total      = qty * _buyItem.unit_price;
  const fee        = Math.round(total * GDC_FEE_RATE * 10000) / 10000;
  const sellerNet  = total - fee;
  const txId       = crypto.randomUUID();
  const now        = new Date().toISOString();
  const sellerGuid = _buyItem.owner_guid;

  try {
    // Step 1: 재고 차감
    const invRes = await fetch(`${SUPA_URL}/rest/v1/inventory?id=eq.${_buyItem.id}`, {
      method:'PATCH', headers:{...HDR,'Content-Type':'application/json'},
      body: JSON.stringify({ quantity: _buyItem.quantity - qty })
    });
    if (!invRes.ok) throw new Error('재고 차감 실패: ' + await invRes.text());

    // Step 2: 구매자 PDV
    await fetch(`${SUPA_URL}/rest/v1/pdv_log`, {
      method:'POST', headers:{...HDR,'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({
        user_guid:_viewerGuid, service_id:'gopang-market', record_type:'purchase',
        summary:`${_buyItem.name} ${fmtN(qty)}${_buyItem.unit||'개'} 구매`,
        what:_buyItem.name, how:_buyItem.delivery||'직접 거래', why:purpose||'구매', category:'시장',
        extra:{tx_id:txId,item_id:_buyItem.id,item_name:_buyItem.name,qty,
               unit_price:_buyItem.unit_price,total,seller_guid:sellerGuid,currency:'GDC'}
      })
    });

    // Step 3: 판매자 PDV
    await fetch(`${SUPA_URL}/rest/v1/pdv_log`, {
      method:'POST', headers:{...HDR,'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({
        user_guid:sellerGuid, service_id:'gopang-market', record_type:'sale',
        summary:`${_buyItem.name} ${fmtN(qty)}${_buyItem.unit||'개'} 판매`,
        what:_buyItem.name, how:_buyItem.delivery||'직접 거래', why:'판매', category:'시장',
        extra:{tx_id:txId,item_id:_buyItem.id,qty,unit_price:_buyItem.unit_price,
               total,fee,seller_net:sellerNet,buyer_guid:_viewerGuid,currency:'GDC'}
      })
    });

    // Step 4: fs_ledger — 구매자 debit
    await fetch(`${SUPA_URL}/rest/v1/fs_ledger`, {
      method:'POST', headers:{...HDR,'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({tx_id:txId,guid:_viewerGuid,counterpart:sellerGuid,
        direction:'debit',amount:total,item_name:_buyItem.name,
        item_id:_buyItem.id,quantity:qty,fs_account:'cash',
        memo:(purpose||_buyItem.name)+' 구매',tx_at:now})
    });

    // Step 5: fs_ledger — 판매자 credit (sellerNet)
    await fetch(`${SUPA_URL}/rest/v1/fs_ledger`, {
      method:'POST', headers:{...HDR,'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({tx_id:txId,guid:sellerGuid,counterpart:_viewerGuid,
        direction:'credit',amount:sellerNet,item_name:_buyItem.name,
        item_id:_buyItem.id,quantity:qty,fs_account:'revenue',
        memo:_buyItem.name+' 판매',tx_at:now})
    });

    // Step 6: fs_ledger — 판매자 fee debit
    await fetch(`${SUPA_URL}/rest/v1/fs_ledger`, {
      method:'POST', headers:{...HDR,'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({tx_id:txId,guid:sellerGuid,counterpart:'gopang-platform',
        direction:'debit',amount:fee,item_name:'GDC 거래 수수료',quantity:1,
        fs_account:'platform_fee',
        memo:`GDC 수수료 ${(GDC_FEE_RATE*100).toFixed(2)}% — tx:${txId.slice(0,8)}`,tx_at:now})
    });

    // Step 7: 재무제표 반영
    await _updateFS(_viewerGuid, 'bs-cash', -total);
    await _updateFS(sellerGuid,  'bs-cash', sellerNet);
    await _updateFS(sellerGuid,  'pl-revenue', total);
    await _updateFS(sellerGuid,  'pl-opex', fee);

    // UI 재고 즉시 갱신
    _buyItem.quantity -= qty;
    renderItems(_allItems);

    closeBuyModal();
    alert(`✓ 구매 완료!\n품목: ${_buyItem.name}\n거래액: ₮${fmtN(total)}\n판매자 수령: ₮${fmtN(sellerNet)}\nGDC 수수료: ₮${fmtN(fee)}\n\n24시간 후 PDV 기록에서 리뷰를 남겨주세요.`);

  } catch(e) {
    msg.textContent = '거래 실패: ' + e.message;
  } finally {
    btn.disabled=false; btn.textContent='구매 확정';
  }
}

async function _updateFS(guid, field, delta) {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/user_profiles?guid=eq.${guid}&select=extra&limit=1`,
      { headers: HDR }
    );
    const [row] = await res.json();
    const extra = row?.extra || {};
    const sec   = field.startsWith('bs-') ? 'bs' : 'pl';
    extra.fs = extra.fs || {};
    extra.fs[sec] = extra.fs[sec] || {};
    extra.fs[sec][field] = String((parseFloat(extra.fs[sec][field]||'0')||0) + delta);
    await fetch(`${SUPA_URL}/rest/v1/user_profiles?guid=eq.${guid}`, {
      method:'PATCH', headers:{...HDR,'Content-Type':'application/json'},
      body: JSON.stringify({extra})
    });
  } catch(e) { console.warn('[FS]', field, e.message); }
}
