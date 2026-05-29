// ── 검색 & 필터/정렬 (수정 빈도: 중간) ─────────────
let _allItems   = [];
let _allSellers = [];
let _ratingMap  = {};
let _curCat     = '';

async function runSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  setLoading(true);
  ['empty-state','ai-banner','filter-bar','view-tabs','seller-grid','item-grid']
    .forEach(id => { const el=document.getElementById(id); if(el) el.style.display='none'; });

  try {
    // 재고 + 판매자 프로필 로드
    const invRes = await fetch(
      `${SUPA_URL}/rest/v1/inventory?is_public=eq.true&select=*&order=name.asc`,
      { headers: HDR }
    );
    const inventory = await invRes.json();

    const ownerGuids = [...new Set(inventory.map(i => i.owner_guid))];
    let profileMap = {};
    if (ownerGuids.length) {
      const profRes = await fetch(
        `${SUPA_URL}/rest/v1/user_profiles?guid=in.(${ownerGuids.join(',')})&select=guid,name,entity_type,address,extra`,
        { headers: HDR }
      );
      (await profRes.json()).forEach(p => { profileMap[p.guid] = p; });
    }

    // DeepSeek AI 관련도 분석
    const catalogText = inventory.map(i =>
      `ID:${i.id}|품목:${i.name}|분류:${i.category||'기타'}|단가:₮${i.unit_price}|재고:${i.quantity}${i.unit||'개'}|판매자:${profileMap[i.owner_guid]?.name||i.owner_guid.slice(0,8)}`
    ).join('\n');

    const aiRes = await fetch(DS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DS_KEY },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content:
          `당신은 고팡 마켓 AI 검색 엔진입니다.\n사용자 요청: "${q}"\n\n재고 목록:\n${catalogText}\n\n관련 품목 ID를 관련도 순으로 최대 20개 추출하세요.\n응답은 반드시 아래 JSON만 출력하세요:\n{"analysis":"분석 요약(2~3문장)","matched_ids":["ID1","ID2",...]}`
        }],
        max_tokens: 600, temperature: 0.1
      })
    });
    const aiData = await aiRes.json();
    let aiResult = {};
    try {
      aiResult = JSON.parse(aiData.choices?.[0]?.message?.content?.replace(/```json|```/g,'').trim() || '{}');
    } catch(e) {}

    // 결과 필터링 & 정렬
    const matchedSet = new Set(aiResult.matched_ids || []);
    let matched = matchedSet.size > 0
      ? inventory.filter(i => matchedSet.has(i.id))
      : inventory;
    if (matchedSet.size > 0) {
      matched.sort((a,b) => aiResult.matched_ids.indexOf(a.id) - aiResult.matched_ids.indexOf(b.id));
    }
    _allItems = matched.map(i => ({ ...i, _profile: profileMap[i.owner_guid] }));

    // 판매자별 집계
    const sellerMap = {};
    _allItems.forEach(i => {
      if (!sellerMap[i.owner_guid]) sellerMap[i.owner_guid] = { profile: i._profile, items: [], guid: i.owner_guid };
      sellerMap[i.owner_guid].items.push(i);
    });
    _allSellers = Object.values(sellerMap);

    // 평점 로드
    if (ownerGuids.length) {
      const rtRes = await fetch(
        `${SUPA_URL}/rest/v1/seller_ratings?seller_guid=in.(${ownerGuids.join(',')})&select=*`,
        { headers: HDR }
      );
      const ratings = await rtRes.json();
      _ratingMap = {};
      if (Array.isArray(ratings)) ratings.forEach(r => { _ratingMap[r.seller_guid] = r; });
    }

    // AI 배너
    if (aiResult.analysis) {
      document.getElementById('ai-banner-text').textContent = aiResult.analysis;
      document.getElementById('ai-banner').style.display = '';
    }

    document.getElementById('filter-bar').style.display = 'flex';
    document.getElementById('view-tabs').style.display  = 'flex';
    renderSellers(_allSellers);
    renderItems(_allItems);
    switchView('sellers', document.getElementById('tab-sellers'));
    document.getElementById('result-count').textContent =
      `${_allItems.length}개 상품 · ${_allSellers.length}명 판매자`;

  } catch(e) {
    document.getElementById('ai-banner-text').textContent = '검색 오류: ' + e.message;
    document.getElementById('ai-banner').style.display = '';
  } finally {
    setLoading(false);
  }
}

function filterCat(cat) {
  _curCat = cat;
  document.querySelectorAll('[data-cat]').forEach(c => c.classList.toggle('on', c.dataset.cat === cat));
  const items   = cat ? _allItems.filter(i => i.category === cat) : _allItems;
  const sellers = cat ? _allSellers.filter(s => s.items.some(i => i.category === cat)) : _allSellers;
  renderSellers(sellers);
  renderItems(items);
  document.getElementById('result-count').textContent =
    `${items.length}개 상품 · ${sellers.length}명 판매자`;
}

function applySort() {
  const v = document.getElementById('sort-sel').value;
  const items = _curCat ? _allItems.filter(i => i.category === _curCat) : [..._allItems];
  if (v === 'price_asc')  items.sort((a,b) => a.unit_price - b.unit_price);
  if (v === 'price_desc') items.sort((a,b) => b.unit_price - a.unit_price);
  if (v === 'qty_desc')   items.sort((a,b) => b.quantity - a.quantity);
  if (v === 'rating')     items.sort((a,b) => (_ratingMap[b.owner_guid]?.weighted_avg||0) - (_ratingMap[a.owner_guid]?.weighted_avg||0));
  renderItems(items);
}

function switchView(id, btn) {
  document.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('seller-grid').style.display = id === 'sellers' ? 'grid' : 'none';
  document.getElementById('item-grid').style.display   = id === 'items'   ? 'grid' : 'none';
}

function setLoading(on) {
  document.getElementById('btn-search').disabled = on;
  document.getElementById('search-spinner').style.display = on ? '' : 'none';
  document.getElementById('btn-search-txt').textContent  = on ? '검색 중…' : '🔍 검색';
}
