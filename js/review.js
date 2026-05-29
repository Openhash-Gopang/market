// ── 리뷰 & 메타평가 & GDC 보상 (수정 빈도: 높음) ────

let _reviewStar   = 0;
let _reviewTxId   = null;
let _reviewSeller = null;
let _reviewAmount = 0;
let _myVotes      = {};   // review_id → 'yes'|'no'

const STAR_LABELS = ['', '매우 불만족', '불만족', '보통', '만족', '매우 만족'];

// ── 리뷰 모달 ────────────────────────────────────────
function openReviewModal(txId, sellerGuid, itemId, itemName, amount) {
  _reviewTxId   = txId;
  _reviewSeller = sellerGuid;
  _reviewAmount = amount;
  _reviewStar   = 0;

  document.getElementById('rv-sub').textContent =
    `"${itemName}" — 거래액 ₮${fmtN(amount)}`;
  document.getElementById('rv-comment').value  = '';
  document.getElementById('rv-msg').textContent = '';
  document.getElementById('rv-star-label').textContent = '별점을 선택하세요';
  setReviewStar(0);

  document.getElementById('review-modal-bg').style.display = 'flex';
}

function closeReviewModal() {
  document.getElementById('review-modal-bg').style.display = 'none';
}

function setReviewStar(n) {
  _reviewStar = n;
  document.querySelectorAll('.star-btn').forEach(b => {
    b.classList.toggle('on', parseInt(b.dataset.v) <= n);
  });
  document.getElementById('rv-star-label').textContent = n ? STAR_LABELS[n] : '별점을 선택하세요';
}

async function submitReview() {
  if (_reviewStar < 1) {
    document.getElementById('rv-msg').textContent = '별점을 선택해 주세요.';
    return;
  }
  const btn     = document.getElementById('rv-submit-btn');
  const msg     = document.getElementById('rv-msg');
  const comment = document.getElementById('rv-comment').value.trim();

  if (!_viewerGuid) { msg.textContent = '로그인이 필요합니다.'; return; }

  btn.disabled = true; btn.textContent = '등록 중…';
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/reviews`, {
      method: 'POST',
      headers: { ...HDR, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({
        tx_id:       _reviewTxId,
        seller_guid: _reviewSeller,
        buyer_guid:  _viewerGuid,
        stars:       _reviewStar,
        comment:     comment || null,
        tx_amount:   _reviewAmount,
      })
    });

    if (!res.ok) {
      const txt = await res.text();
      if (txt.includes('duplicate') || txt.includes('unique')) {
        msg.textContent = '이 거래의 리뷰가 이미 등록되었습니다.'; return;
      }
      throw new Error(txt);
    }

    // ── GDC 보상 ₮10 지급 (idempotency: tx_id 기준 중복 방지) ──
    await _payReviewReward(_viewerGuid, REVIEW_REWARD_BASE, '리뷰 작성 보상', _reviewTxId);

    // 판매자 평점 캐시 갱신 (화면 즉시 반영)
    await _refreshSellerRating(_reviewSeller);

    closeReviewModal();
    alert(`✓ 후기가 등록되었습니다!\n${'★'.repeat(_reviewStar)}${'☆'.repeat(5-_reviewStar)}\n₮${fmtN(REVIEW_REWARD_BASE)} GDC가 지급되었습니다.`);

  } catch(e) {
    msg.textContent = '등록 실패: ' + e.message;
  } finally {
    btn.disabled = false; btn.textContent = '등록하기';
  }
}

// ── 판매자 리뷰 목록 (슬라이드 패널 하단) ────────────
async function loadSellerReviews(sellerGuid) {
  const wrap = document.getElementById('sp-reviews-wrap');
  const list = document.getElementById('sp-reviews-list');
  if (!wrap) return;
  list.innerHTML = '<div style="color:var(--hint);font-size:12px;padding:8px 0">불러오는 중…</div>';

  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/reviews?seller_guid=eq.${sellerGuid}&order=created_at.desc&limit=10&select=*`,
      { headers: HDR }
    );
    const reviews = await res.json();

    // 내 투표 이력 로드
    if (_viewerGuid && reviews.length) {
      const ids = reviews.map(r => r.id).join(',');
      const vRes = await fetch(
        `${SUPA_URL}/rest/v1/review_votes?voter_guid=eq.${_viewerGuid}&review_id=in.(${ids})&select=review_id,is_helpful`,
        { headers: HDR }
      );
      const votes = await vRes.json();
      votes.forEach(v => { _myVotes[v.review_id] = v.is_helpful ? 'yes' : 'no'; });
    }

    if (!reviews.length) {
      list.innerHTML = '<div style="color:var(--hint);font-size:12px;padding:8px 0;text-align:center">아직 후기가 없습니다.</div>';
      return;
    }

    const rt = _ratingMap[sellerGuid];
    if (rt) {
      document.getElementById('sp-reviews-summary').textContent =
        `가중평점 ${rt.weighted_avg}★ · ${rt.review_count}건 · 총거래 ₮${fmtN(rt.total_volume)}`;
    }

    list.innerHTML = reviews.map(r => {
      const myVote  = _myVotes[r.id];
      const canVote = _viewerGuid && _viewerGuid !== r.buyer_guid;
      return `
      <div class="review-item" id="rv-${r.id}">
        <div class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
        ${r.comment ? `<div class="review-comment">${_e(r.comment)}</div>` : ''}
        <div class="review-meta">
          <span>₮${fmtN(r.tx_amount)} 거래</span>
          <span>${new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
          ${canVote ? `
          <span style="margin-left:auto;display:flex;gap:4px;align-items:center">
            <button class="vote-btn ${myVote==='yes'?'voted-yes':''}"
              onclick="voteReview('${r.id}',true)"
              ${myVote?'disabled':''}>
              👍 ${r.helpful_count||0}
            </button>
            <button class="vote-btn ${myVote==='no'?'voted-no':''}"
              onclick="voteReview('${r.id}',false)"
              ${myVote?'disabled':''}>
              👎 ${r.unhelpful_count||0}
            </button>
          </span>` : `<span style="margin-left:auto;color:var(--hint)">👍 ${r.helpful_count||0} 👎 ${r.unhelpful_count||0}</span>`}
        </div>
      </div>`;
    }).join('');

  } catch(e) {
    list.innerHTML = `<div style="color:var(--red-text);font-size:12px">오류: ${e.message}</div>`;
  }
}

// ── 리뷰 유용성 투표 ─────────────────────────────────
async function voteReview(reviewId, isHelpful) {
  if (!_viewerGuid) { alert('로그인이 필요합니다.'); return; }
  try {
    await fetch(`${SUPA_URL}/rest/v1/review_votes`, {
      method: 'POST',
      headers: { ...HDR, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ review_id: reviewId, voter_guid: _viewerGuid, is_helpful: isHelpful })
    });

    // helpful_count / unhelpful_count 증가
    const field = isHelpful ? 'helpful_count' : 'unhelpful_count';
    const getRes = await fetch(
      `${SUPA_URL}/rest/v1/reviews?id=eq.${reviewId}&select=helpful_count,unhelpful_count,buyer_guid,tx_amount`,
      { headers: HDR }
    );
    const [rv] = await getRes.json();
    const newCount = (rv[field]||0) + 1;

    await fetch(`${SUPA_URL}/rest/v1/reviews?id=eq.${reviewId}`, {
      method: 'PATCH',
      headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: newCount })
    });

    _myVotes[reviewId] = isHelpful ? 'yes' : 'no';

    // 도움됨 달성 보상
    if (isHelpful) {
      if (newCount === 10)  await _payReviewReward(rv.buyer_guid, REVIEW_REWARD_10,  '리뷰 도움됨 10개 달성',  `helpful10-${reviewId}`);
      if (newCount === 100) await _payReviewReward(rv.buyer_guid, REVIEW_REWARD_100, '리뷰 도움됨 100개 달성', `helpful100-${reviewId}`);
    }

    // UI 즉시 갱신
    const el = document.getElementById(`rv-${reviewId}`);
    if (el) {
      const btnYes = el.querySelector('.vote-btn:first-of-type');
      const btnNo  = el.querySelector('.vote-btn:last-of-type');
      if (btnYes) { btnYes.textContent=`👍 ${isHelpful?newCount:(rv.helpful_count||0)}`; btnYes.disabled=true; btnYes.classList.toggle('voted-yes',isHelpful); }
      if (btnNo)  { btnNo.textContent =`👎 ${!isHelpful?newCount:(rv.unhelpful_count||0)}`; btnNo.disabled=true; btnNo.classList.toggle('voted-no',!isHelpful); }
    }

  } catch(e) {
    if (e.message?.includes('duplicate')) alert('이미 투표하셨습니다.');
    else console.warn('[Vote]', e.message);
  }
}

// ── GDC 보상 지급 ─────────────────────────────────────
async function _payReviewReward(guid, amount, memo, idempotencyKey) {
  try {
    // ── 중복 지급 방지: idempotencyKey 기준으로 기존 지급 여부 확인 ──
    if (idempotencyKey) {
      const chkRes = await fetch(
        `${SUPA_URL}/rest/v1/fs_ledger?guid=eq.${guid}&fs_account=eq.review_reward&memo=like.*${encodeURIComponent(idempotencyKey)}*&select=tx_id&limit=1`,
        { headers: HDR }
      );
      const existing = await chkRes.json();
      if (Array.isArray(existing) && existing.length > 0) {
        console.info('[Reward] 이미 지급된 보상 — 건너뜀:', idempotencyKey);
        return;
      }
    }

    const txId = idempotencyKey
      ? await _uuidFromString(idempotencyKey)  // 동일 키 → 동일 UUID (멱등성)
      : crypto.randomUUID();

    await fetch(`${SUPA_URL}/rest/v1/fs_ledger`, {
      method: 'POST',
      headers: { ...HDR, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        tx_id: txId, guid, counterpart: 'gopang-platform',
        direction: 'credit', amount,
        item_name: memo, fs_account: 'review_reward',
        memo: `${memo} — ₮${fmtN(amount)} GDC [key:${idempotencyKey||'none'}]`,
        tx_at: new Date().toISOString()
      })
    });
    await _updateFS(guid, 'bs-cash', amount);
  } catch(e) { console.warn('[Reward]', e.message); }
}

// ── 문자열에서 결정론적 UUID 생성 (SHA-256 기반) ──────────────
async function _uuidFromString(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-${(parseInt(hex[16],16)&0x3|0x8).toString(16)}${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

// ── 판매자 평점 캐시 갱신 ────────────────────────────
async function _refreshSellerRating(sellerGuid) {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/seller_ratings?seller_guid=eq.${sellerGuid}&select=*&limit=1`,
      { headers: HDR }
    );
    const [rt] = await res.json();
    if (rt) {
      _ratingMap[sellerGuid] = rt;
      renderSellers(_allSellers);
    }
  } catch(e) {}
}
