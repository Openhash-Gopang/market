// ── 인증 (수정 빈도: 낮음) ──────────────────────────
const _params = new URLSearchParams(location.search);
let _viewerGuid = null;
let _viewerLat  = null;
let _viewerLng  = null;

async function initAuth() {
  // GPS 위치 (거리 계산용)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => { _viewerLat = pos.coords.latitude; _viewerLng = pos.coords.longitude; },
      ()  => {}
    );
  }

  // 1순위: ?session= 토큰 (gopang_sessions)
  const session = _params.get('session');
  if (session) {
    try {
      const res = await fetch(
        `${SUPA_URL}/rest/v1/gopang_sessions?token=eq.${session}&select=guid&limit=1`,
        { headers: HDR }
      );
      const [row] = await res.json();
      if (row?.guid) {
        _viewerGuid = row.guid;
        fetch(`${SUPA_URL}/rest/v1/gopang_sessions?token=eq.${session}`, {
          method: 'PATCH', headers: { ...HDR, 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_used: new Date().toISOString() })
        }).catch(() => {});
        return;
      }
    } catch(e) { console.warn('[Auth] session:', e.message); }
  }

  // 2순위: 기기 지문
  try {
    const raw = [navigator.userAgent, navigator.language,
      screen.width + 'x' + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const fp  = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    const res = await fetch(
      `${SUPA_URL}/rest/v1/users?device_fp=eq.${fp}&select=guid&limit=1`,
      { headers: HDR }
    );
    const [row] = await res.json();
    if (row?.guid) { _viewerGuid = row.guid; return; }
  } catch(e) { console.warn('[Auth] device_fp:', e.message); }

  console.info('[Auth] 익명 방문자');
}
