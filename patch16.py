with open(r'C:\Users\주피터\Downloads\market\webapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = """async function _recordLedger({ direction, amount, itemName, fsAccount }) {
  const guid = _user?.guid || _user?.ipv6;
  if (!guid || !amount || amount <= 0) return null;
  const SBKEY = SUPABASE_KEY;
  const SBH   = {
    'apikey':        SBKEY,
    'Authorization': 'Bearer ' + SBKEY,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  };
  const txId = crypto.randomUUID();
  const now  = new Date().toISOString();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fs_ledger`, {
      method: 'POST',
      headers: SBH,
      body: JSON.stringify({
        tx_id:      txId,
        guid:       guid,
        counterpart:'market.gopang.net',
        direction:  direction,
        amount:     amount,
        item_name:  itemName,
        fs_account: fsAccount,
        memo:       'K-Market AI 거래 자동 기록',
        tx_at:      now,
      }),
    });
    if (res.ok) {
      console.log('[Market Ledger] \u2705', direction, '\u20ae'+amount.toLocaleString(), itemName);
      return txId;
    } else {
      const err = await res.text();
      console.warn('[Market Ledger] \u274c', res.status, err);
      return null;
    }
  } catch(e) {
    console.warn('[Market Ledger] \uc804\uc1a1 \uc2e4\ud328:', e.message);
    return null;
  }
}"""

new = """// v2.0: block_hash, source, 표준 fs_account 포함
async function _recordLedger({ direction, amount, itemName, fsAccount, sellerGuid, buyerGuid, txId, prevSettleHash, blockHash, blockId }) {
  const guid = _user?.primary_guid || _user?.guid || _user?.ipv6;
  if (!guid || !amount || amount <= 0) return null;
  const SBKEY = SUPABASE_KEY;
  const SBH   = {
    'apikey':        SBKEY,
    'Authorization': 'Bearer ' + SBKEY,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  };
  const _txId = txId || crypto.randomUUID();
  const now   = new Date().toISOString();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fs_ledger`, {
      method: 'POST',
      headers: SBH,
      body: JSON.stringify({
        tx_id:            _txId,
        guid:             guid,
        counterpart:      direction === 'debit' ? (sellerGuid || 'market.gopang.net') : (buyerGuid || 'market.gopang.net'),
        seller_guid:      sellerGuid  || null,
        buyer_guid:       buyerGuid   || null,
        direction:        direction,
        amount:           amount,
        item_name:        itemName,
        fs_account:       fsAccount,
        source:           'market',
        memo:             'K-Market AI 거래 자동 기록',
        prev_settle_hash: prevSettleHash || null,
        block_hash:       blockHash      || null,
        block_id:         blockId        || null,
        tx_at:            now,
      }),
    });
    if (res.ok) {
      console.log('[Market Ledger] \u2705', direction, '\u20ae'+amount.toLocaleString(), itemName);
      return _txId;
    } else {
      const err = await res.text();
      console.warn('[Market Ledger] \u274c', res.status, err);
      return null;
    }
  } catch(e) {
    console.warn('[Market Ledger] \uc804\uc1a1 \uc2e4\ud328:', e.message);
    return null;
  }
}"""

if old in content:
    content = content.replace(old, new)
    with open(r'C:\Users\주피터\Downloads\market\webapp.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
