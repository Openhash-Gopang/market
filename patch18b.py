with open(r'C:\Users\주피터\Downloads\market\webapp.html', 'r', encoding='utf-8-sig') as f:
    content = f.read()

with open(r'C:\Users\주피터\Downloads\market\old18.txt', 'r', encoding='utf-8-sig') as f:
    old = f.read().rstrip()

new = """// v2.0: fs_account 표준 코드, seller_guid, block_hash 포함
async function _parseTrade(aiText, userText) {
  const match = aiText.match(/\\[TRADE\\](.+?)\\[\\/TRADE\\]/s);
  if (!match) return;
  let trade;
  try {
    trade = JSON.parse(match[1].trim());
  } catch(e) {
    console.warn('[Market] TRADE 파싱 실패:', match[1]);
    return;
  }
  const { direction, amount, item_name, fs_account, seller_guid, item_id, quantity } = trade;
  if (!direction || !amount || !item_name) return;

  // fs_account 표준 코드 매핑
  const fsAccountMap = {
    'purchase':    'pl-purchase',
    'revenue':     'pl-revenue',
    'pl-purchase': 'pl-purchase',
    'pl-revenue':  'pl-revenue',
  };
  const resolvedFsAccount = fsAccountMap[fs_account]
    || (direction === 'credit' ? 'pl-revenue' : 'pl-purchase');

  const buyerGuid = _user?.primary_guid || _user?.guid || _user?.ipv6;

  const txId = await _recordLedger({
    direction,
    amount:         parseInt(amount),
    itemName:       item_name,
    fsAccount:      resolvedFsAccount,
    sellerGuid:     seller_guid || null,
    buyerGuid:      direction === 'debit' ? buyerGuid : null,
    txId:           null,
    prevSettleHash: null,
    blockHash:      null,
    blockId:        null,
  });

  if (txId) {
    const now = new Date().toISOString();
    await recordPDV({
      report: {
        svc:          'kcommerce',
        type:         'transaction',
        reporter_svc: 'kmarket',
        who: {
          ipv6:       buyerGuid,
          role:       'user',
          level:      'L0',
          recipients: ['gopang-pdv'],
        },
        when:  { period_start: now, period_end: now },
        where: { svc_url: 'https://market.gopang.net/webapp.html' },
        what:  { summary: 'K-Market \uac70\ub798 \u2014 ' + item_name + ' \u20ae' + parseInt(amount).toLocaleString() + ' (' + (direction === 'credit' ? '\ud310\ub9e4' : '\uad6c\ub9e4') + ')' },
        how:   { method: 'K-Market AI \uc790\ub3d9 \uac70\ub798 \uac10\uc9c0 \u2192 fs_ledger \uae30\ub85d', tx_id: txId },
        why:   { goal: '\uac70\ub798 \uc7ac\ubb34\uc81c\ud45c \ubc18\uc601' },
      }
    });
    console.log('[Market] \uac70\ub798 PDV \uae30\ub85d \uc644\ub8cc:', txId);
  }
}"""

if old in content:
    content = content.replace(old, new)
    with open(r'C:\Users\주피터\Downloads\market\webapp.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
