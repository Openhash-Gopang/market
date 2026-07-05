// ═══════════════════════════════════════════════════════════
// gopang-seller-catalog.js — K-Market 판매자 상품 카탈로그
// 2026-07-05 신설
//
// 오픈해시 철학: 로컬(IndexedDB, 이 기기)이 원본(source of truth)이다.
// L1 PocketBase(seller_products 컬렉션)는 판매자가 로컬에서 상품을
// 등록/수정/삭제할 때마다 자동으로(디바운스) 반영되는 "백업이자 공개
// 검색용 미러"일 뿐, 판매자가 서버에 직접 CRUD하는 관리자 패널이 아니다.
//
// 모든 쓰기는 이 모듈의 API(putProduct/removeProduct)를 거쳐야
// 자동 동기화가 걸린다 — IndexedDB를 우회해서 직접 쓰면 서버에 반영되지
// 않는다.
//
// 업종(occupation)은 이 모듈이 정하지 않는다 — 서버(handleCatalogSync)가
// 동기화된 상품의 category를 보고 자동으로 유도한다. 판매자는 업종을
// 직접 고르지 않고 상품/서비스만 등록한다.
// ═══════════════════════════════════════════════════════════

(function (global) {
  const DB_NAME = 'gopang_seller_catalog_v1';
  const STORE = 'products';
  const SYNC_DEBOUNCE_MS = 1500;
  const WORKER_BASE = 'https://hondi-proxy.tensor-city.workers.dev';

  let _db = null;
  let _syncTimer = null;
  let _syncInFlight = false;
  let _syncPending = false;

  function _openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  async function _store(mode) {
    const db = await _openDB();
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  function _reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function listProducts() {
    const store = await _store('readonly');
    return _reqToPromise(store.getAll());
  }

  async function getProduct(id) {
    const store = await _store('readonly');
    return _reqToPromise(store.get(id));
  }

  // 상품 등록/수정 — id 없으면 slug 자동 생성, category는 필수(업종 자동유도의 근거)
  async function putProduct(product) {
    if (!product.name) throw new Error('name 필수');
    if (!product.category) throw new Error('category 필수 — 업종 자동유도의 근거 데이터입니다');
    if (!product.id) {
      product.id = product.name.trim().toLowerCase()
        .replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '') + '-' + Date.now().toString(36);
    }
    product.updated_at = new Date().toISOString();
    if (product.is_public === undefined) product.is_public = true;

    const store = await _store('readwrite');
    await _reqToPromise(store.put(product));
    _scheduleSync();
    return product;
  }

  async function removeProduct(id) {
    const store = await _store('readwrite');
    await _reqToPromise(store.delete(id));
    _scheduleSync();
  }

  function _scheduleSync() {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => {
      _runSync().catch(e => console.warn('[Catalog] 서버 동기화 실패 (로컬 데이터는 안전함):', e.message));
    }, SYNC_DEBOUNCE_MS);
  }

  // 전체 로컬 스냅샷을 서버로 push — putProduct/removeProduct가 자동 호출.
  // 수동 강제 동기화가 필요하면 window.SellerCatalog.forceSync() 사용.
  async function _runSync() {
    if (_syncInFlight) { _syncPending = true; return; }
    _syncInFlight = true;
    try {
      const wallet = global.gopangWallet;
      if (!wallet || !wallet.guid || !wallet._privKey) {
        console.warn('[Catalog] 지갑 미확보 — 동기화 보류(로컬엔 이미 저장됨, 다음 기회에 재시도)');
        return;
      }
      const products = await listProducts();
      const payload = { guid: wallet.guid, pubkey: wallet.publicKeyB64u, products };
      const msgBytes = new TextEncoder().encode(JSON.stringify(payload));
      const sigBuf = await crypto.subtle.sign('Ed25519', wallet._privKey, msgBytes);
      const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      const res = await fetch(WORKER_BASE + '/biz/catalog/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, signature }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        console.warn('[Catalog] 서버 응답 실패:', data.detail || res.status);
      } else {
        console.log('[Catalog] 동기화 완료 —', products.length, '개 상품' +
          (data.occupation_updated ? ` (업종 자동판단: ${data.occupation})` : ''));
      }
    } finally {
      _syncInFlight = false;
      if (_syncPending) { _syncPending = false; _scheduleSync(); }
    }
  }

  // 새 기기에서 로컬이 비어있으면 서버 백업에서 복원 — 오픈해시 원칙상
  // "로컬이 원본"이지만, 기기가 바뀌면 서버 백업에서 최초 1회 끌어와야 한다.
  async function hydrateFromServerIfEmpty() {
    const local = await listProducts();
    if (local.length > 0) return { hydrated: false, count: local.length };

    const wallet = global.gopangWallet;
    if (!wallet || !wallet.guid || !wallet._privKey) return { hydrated: false, count: 0 };

    const payload = { guid: wallet.guid, pubkey: wallet.publicKeyB64u };
    const msgBytes = new TextEncoder().encode(JSON.stringify(payload));
    const sigBuf = await crypto.subtle.sign('Ed25519', wallet._privKey, msgBytes);
    const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const res = await fetch(WORKER_BASE + '/biz/catalog/hydrate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, signature }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok || !Array.isArray(data.products)) return { hydrated: false, count: 0 };

    const store = await _store('readwrite');
    for (const p of data.products) {
      await _reqToPromise(store.put({
        id: p.product_id, name: p.name, desc: p.desc, price: p.price, unit: p.unit,
        category: p.category, stock: p.stock, image_url: p.image_url,
        is_public: p.is_public, updated_at: p.updated_at,
      }));
    }
    return { hydrated: true, count: data.products.length };
  }

  global.SellerCatalog = {
    listProducts, getProduct, putProduct, removeProduct,
    forceSync: _runSync, hydrateFromServerIfEmpty,
  };
})(window);
