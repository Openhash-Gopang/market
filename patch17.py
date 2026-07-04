with open(r'C:\Users\주피터\Downloads\market\webapp.html', 'r', encoding='utf-8-sig') as f:
    content = f.read()

old = """function runSearch() {
  const q=document.getElementById('search-input')?.value.trim(); if(!q) return;
  const log=JSON.parse(localStorage.getItem('gopang_pdv_log')||'[]');
  const results=log.filter(r=>JSON.stringify(r).includes(q)).slice(-10).map((r,i)=>({id:'pdv-'+i,title:r.summary||'PDV'}));
  const c=document.getElementById('search-results'); if(!c) return;
  c.innerHTML=results.length?results.map(r=>`<div class="search-result-item">${r.title}</div>`).join(''):'<div class="search-empty">결과 없음</div>';
}"""

new = """// v2.0: primary_guid 포함 검색 결과
function runSearch() {
  const q=document.getElementById('search-input')?.value.trim(); if(!q) return;
  const log=JSON.parse(localStorage.getItem('gopang_pdv_log')||'[]');
  const results=log.filter(r=>JSON.stringify(r).includes(q)).slice(-10).map((r,i)=>({
    id:           'pdv-'+i,
    title:        r.summary||'PDV',
    primary_guid: r.primary_guid || r.guid || null,
    seller_guid:  r.seller_guid  || null,
    item_name:    r.item_name    || null,
    amount:       r.amount       || null,
  }));
  const c=document.getElementById('search-results'); if(!c) return;
  c.innerHTML=results.length
    ? results.map(r=>`<div class="search-result-item" data-guid="${r.primary_guid||''}" data-seller="${r.seller_guid||''}" onclick="selectContact('${r.primary_guid||r.id}')">`
        +`<span class="search-result-title">${r.title}</span>`
        +(r.amount?`<span class="search-result-amount">\u20ae${Number(r.amount).toLocaleString()}</span>`:'')
        +(r.primary_guid?`<span class="search-result-guid">${r.primary_guid.slice(0,16)}\u2026</span>`:'')
        +`</div>`).join('')
    :'<div class="search-empty">\uacb0\uacfc \uc5c6\uc74c</div>';
}"""

if old in content:
    content = content.replace(old, new)
    with open(r'C:\Users\주피터\Downloads\market\webapp.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
