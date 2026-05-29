// ── 판매자 카드 & 슬라이드 패널 (수정 빈도: 중간) ──

function _e(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmtN(n) { return (+(n||0)).toLocaleString('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:4}); }

function starsHtml(avg, size=12) {
  let html = '';
  for (let i=1; i<=5; i++) {
    html += `<span class="star ${avg>=i?'full':'empty'}" style="font-size:${size}px">★</span>`;
  }
  return html;
}

function _distKm(lat1,lng1,lat2,lng2) {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function renderSellers(sellers) {
  const grid = document.getElementById('seller-grid');
  if (!sellers.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">😔</div><div class="empty-title">검색 결과가 없습니다</div></div>';
    grid.style.display = ''; return;
  }
  grid.innerHTML = sellers.map((s, idx) => {
    const p    = s.profile || {};
    const name = p.name || s.guid.slice(0,8)+'…';
    const etab = {person:'개인',org:'기관',thing:'사물'};
    const biz  = p.extra?.public?.업종 || '';
    const addr = p.address || '';
    const score= Math.round(100 - idx*(50/Math.max(sellers.length,1)));

    // 평점
    const rt = _ratingMap[s.guid];
    const ratingHtml = rt?.review_count > 0
      ? `<div class="rating-row">
           <div class="stars-display">${starsHtml(rt.weighted_avg)}</div>
           <span class="rating-score">${rt.weighted_avg}</span>
           <span class="rating-count">(${rt.review_count}건)</span>
           <span class="rating-volume">₮${fmtN(rt.total_volume)}</span>
         </div>`
      : '<div class="no-rating">리뷰 없음</div>';

    // 거리
    let distHtml = '';
    const gpsStr = p.extra?.public?.gps || '';
    if (gpsStr && _viewerLat !== null) {
      const pts = gpsStr.split(',').map(Number);
      if (pts.length===2 && !isNaN(pts[0])) {
        const km = _distKm(_viewerLat, _viewerLng, pts[0], pts[1]);
        distHtml = `<span class="distance-badge">${km<1?Math.round(km*1000)+'m':km.toFixed(1)+'km'}</span>`;
      }
    } else if (addr) {
      distHtml = `<span style="font-size:11px;color:var(--hint)">📍 ${_e(addr)}</span>`;
    }

    return `
    <div class="seller-card">
      <div class="card-hd">
        <div class="card-avatar">${name.slice(0,1).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div class="card-name">${_e(name)}</div>
          <div class="card-type">${etab[p.entity_type]||'판매자'}${biz?' · '+_e(biz):''}</div>
          ${ratingHtml}
        </div>
        <div class="card-match-score">일치 ${score}%</div>
      </div>
      <div class="card-body">
        ${distHtml?`<div class="card-meta" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">${distHtml}</div>`:''}
        <div class="inv-preview">
          ${s.items.slice(0,3).map(i=>`
          <div class="inv-item">
            <span class="inv-item-name">${_e(i.name)}</span>
            <span class="inv-price">₮${fmtN(i.unit_price)}</span>
            <span class="inv-qty">${fmtN(i.quantity)}${_e(i.unit||'개')}</span>
          </div>`).join('')}
          ${s.items.length>3?`<div class="inv-more">+ ${s.items.length-3}개 더</div>`:''}
        </div>
      </div>
      <div class="card-actions">
        <button class="btn-visit" onclick="openSellerPanel('${s.guid}')">재고 보기 / 구매</button>
        <button class="btn-profile" onclick="visitProfile('${s.guid}')">공개 프로필</button>
      </div>
    </div>`;
  }).join('');
  grid.style.display = 'grid';
}

function renderItems(items) {
  const grid = document.getElementById('item-grid');
  if (!items.length) { grid.innerHTML=''; return; }
  grid.innerHTML = items.map(i => {
    const pname  = i._profile?.name || i.owner_guid.slice(0,8)+'…';
    const soldOut= i.quantity <= 0;
    return `
    <div class="item-card">
      <span class="item-cat">${_e(i.category||'기타')}</span>
      <div class="item-name">${_e(i.name)}</div>
      <div class="item-seller">판매자: ${_e(pname)}</div>
      <div class="item-price">₮${fmtN(i.unit_price)} <span style="font-size:11px;font-weight:400;color:var(--hint)">/ ${_e(i.unit||'개')}</span></div>
      <div class="item-meta">
        <span>재고 ${fmtN(i.quantity)}${_e(i.unit||'개')}</span>
        ${i.delivery?`<span>· ${_e(i.delivery)}</span>`:''}
      </div>
      <button class="btn-buy" ${soldOut?'disabled':''}
        onclick="openBuyModal(${JSON.stringify(i).replace(/"/g,'&quot;')}, '${_e(pname)}')">
        ${soldOut?'품절':'구매'}
      </button>
    </div>`;
  }).join('');
  grid.style.display = 'grid';
}

// ── 판매자 슬라이드 패널 ─────────────────────────────
function openSellerPanel(guid) {
  const s = _allSellers.find(s => s.guid === guid);
  if (!s) return;
  const p    = s.profile || {};
  const name = p.name || guid.slice(0,8)+'…';
  const etab = {person:'개인',org:'기관',thing:'사물'};

  document.getElementById('sp-avatar').textContent = name.slice(0,1).toUpperCase();
  document.getElementById('sp-name').textContent   = name;
  document.getElementById('sp-type').textContent   = (etab[p.entity_type]||'판매자') + (p.extra?.public?.업종?' · '+p.extra.public.업종:'');

  const meta = [];
  if (p.address) meta.push('📍 '+p.address);
  if (p.phone)   meta.push('📞 '+p.phone);
  document.getElementById('sp-meta').innerHTML = meta.map(m=>`<span>${_e(m)}</span>`).join('');

  // 공개 정보
  const pub = p.extra?.public || {};
  const pubRows = Object.entries(pub).filter(([k])=>!['gps','이름'].includes(k));
  document.getElementById('sp-pub-info').innerHTML = pubRows.length
    ? pubRows.map(([k,v])=>`<div class="sp-pub-row"><span class="sp-pub-key">${_e(k)}</span><span class="sp-pub-val">${_e(v)}</span></div>`).join('')
    : '<div style="color:var(--hint);font-size:12px">공개 정보 없음</div>';

  // 재고 목록
  const tbody = document.getElementById('sp-inv-tbody');
  tbody.innerHTML = s.items.length ? s.items.map(i => {
    const soldOut = i.quantity <= 0;
    return `<tr>
      <td>
        <div class="sp-name-cell">${_e(i.name)}</div>
        <span class="sp-cat-pill">${_e(i.category||'기타')}</span>
      </td>
      <td style="text-align:right"><span class="sp-price">₮${fmtN(i.unit_price)}</span></td>
      <td style="text-align:right"><span class="sp-qty">${fmtN(i.quantity)} ${_e(i.unit||'개')}</span></td>
      <td><span class="sp-delivery">${_e(i.delivery||'—')}</span></td>
      <td><button class="sp-buy-btn" ${soldOut?'disabled':''}
        onclick="openBuyModal(${JSON.stringify(i).replace(/"/g,'&quot;')}, '${_e(name)}')">
        ${soldOut?'품절':'구매'}</button></td>
    </tr>`;
  }).join('')
  : '<tr><td colspan="5" style="text-align:center;color:var(--hint);padding:20px">재고 없음</td></tr>';

  // 리뷰 목록 로드
  loadSellerReviews(guid);

  document.getElementById('sp-bg').classList.add('open');
}

function closeSellerPanel(e) {
  if (e && e.target !== document.getElementById('sp-bg')) return;
  document.getElementById('sp-bg').classList.remove('open');
}

function visitProfile(guid) {
  window.open(`https://gopang.net/user_template.html?guid=${guid}`, '_blank');
}
