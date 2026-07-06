/* ════════════════════════════════════════════════
   CityReport PWA — Service Worker v2
   
   Stratégies :
   - Shell app    → Cache First (offline garanti)
   - Fonts/CDN    → Cache First avec expiry 30j
   - API /api/*   → Network First, fallback cache
   - Images user  → Cache First, lazy
   - Tout le reste→ Network First
   ════════════════════════════════════════════════ */

const VERSION    = 'v2';
const CACHE_SHELL  = `cr-shell-${VERSION}`;
const CACHE_ASSETS = `cr-assets-${VERSION}`;
const CACHE_API    = `cr-api-${VERSION}`;
const ALL_CACHES   = [CACHE_SHELL, CACHE_ASSETS, CACHE_API];

/* ── Fichiers du shell (app core — offline garanti) ── */
const SHELL_FILES = [
  '/',
  '/index.html',
  '/css/tokens.css',
  '/css/components.css',
  '/js/state.js',
  '/js/router.js',
  '/js/components.js',
  '/js/nav.js',
  '/js/app.js',
  '/manifest.json',
  '/design-system.html',
];

/* ── CDN à mettre en cache (fonts + icons) ── */
const CDN_PATTERNS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
];

/* ── Durée max du cache API (5 minutes) ── */
const API_CACHE_MAX_AGE = 5 * 60 * 1000;


/* ════════════════════════════════════════════
   INSTALL — précache le shell
   ════════════════════════════════════════════ */
self.addEventListener('install', event => {
  console.log('[SW] Install', VERSION);
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())   /* activation immédiate */
  );
});


/* ════════════════════════════════════════════
   ACTIVATE — nettoyer les vieux caches
   ════════════════════════════════════════════ */
self.addEventListener('activate', event => {
  console.log('[SW] Activate', VERSION);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !ALL_CACHES.includes(k))
          .map(k => {
            console.log('[SW] Suppression ancien cache :', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())  /* prendre le contrôle immédiatement */
  );
});


/* ════════════════════════════════════════════
   FETCH — router les requêtes
   ════════════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  /* Ignorer les non-GET et les requêtes chrome-extension */
  if (req.method !== 'GET') return;
  if (!['http:', 'https:'].includes(url.protocol)) return;

  /* ── Shell app → Cache First ── */
  if (_isShell(url)) {
    event.respondWith(_cacheFirst(req, CACHE_SHELL));
    return;
  }

  /* ── Fonts / CDN → Cache First (longue durée) ── */
  if (_isCDN(url)) {
    event.respondWith(_cacheFirst(req, CACHE_ASSETS));
    return;
  }

  /* ── API → Network First, fallback cache avec timestamp ── */
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(_networkFirstAPI(req));
    return;
  }

  /* ── Images ── */
  if (_isImage(url)) {
    event.respondWith(_cacheFirst(req, CACHE_ASSETS));
    return;
  }

  /* ── Tout le reste → Network First ── */
  event.respondWith(_networkFirst(req));
});


/* ════════════════════════════════════════════
   STRATÉGIES DE CACHE
   ════════════════════════════════════════════ */

/* Cache First : cache → réseau en fallback */
async function _cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const response = await fetch(req);
    if (_isCacheable(response)) {
      const cache = await caches.open(cacheName);
      cache.put(req, response.clone());
    }
    return response;
  } catch {
    /* Pas de réseau, pas de cache → page offline */
    return _offlineFallback(req);
  }
}

/* Network First : réseau → cache en fallback */
async function _networkFirst(req) {
  try {
    const response = await fetch(req);
    if (_isCacheable(response)) {
      const cache = await caches.open(CACHE_ASSETS);
      cache.put(req, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(req);
    return cached || _offlineFallback(req);
  }
}

/* Network First pour l'API avec vérification d'âge du cache */
async function _networkFirstAPI(req) {
  const cache = await caches.open(CACHE_API);

  try {
    const response = await fetch(req);
    if (_isCacheable(response)) {
      /* Ajouter un header timestamp pour vérifier l'expiry */
      const headers = new Headers(response.headers);
      headers.append('sw-cached-at', Date.now().toString());
      const toCache = new Response(await response.clone().blob(), {
        status:     response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(req, toCache);
    }
    return response;
  } catch {
    const cached = await cache.match(req);
    if (!cached) return _apiOfflineFallback();

    /* Vérifier si le cache API est encore frais */
    const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0', 10);
    const age = Date.now() - cachedAt;
    if (age > API_CACHE_MAX_AGE) {
      console.warn('[SW] Cache API expiré (' + Math.round(age/1000) + 's)');
    }
    return cached;
  }
}

/* Fallback page offline (pour les navigations) */
function _offlineFallback(req) {
  if (req.headers.get('accept')?.includes('text/html')) {
    return caches.match('/index.html');
  }
  return new Response('', { status: 408, statusText: 'Offline' });
}

/* Fallback API offline */
function _apiOfflineFallback() {
  return new Response(
    JSON.stringify({ error: 'offline', message: 'Pas de connexion réseau' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}


/* ════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════ */

function _isShell(url) {
  return SHELL_FILES.some(f => url.pathname === f || url.pathname === f.replace('/index.html', '/'));
}

function _isCDN(url) {
  return CDN_PATTERNS.some(p => url.hostname.includes(p));
}

function _isImage(url) {
  return /\.(png|jpg|jpeg|webp|svg|gif|ico)(\?.*)?$/.test(url.pathname);
}

function _isCacheable(response) {
  return response && response.status === 200 && response.type !== 'opaque';
}


/* ════════════════════════════════════════════
   BACKGROUND SYNC — signalements offline
   (logique complète à la partie #20)
   ════════════════════════════════════════════ */
self.addEventListener('sync', event => {
  console.log('[SW] Sync event :', event.tag);

  if (event.tag === 'sync-reports') {
    event.waitUntil(_syncPendingReports());
  }
});

async function _syncPendingReports() {
  /* Lire les signalements en attente depuis IndexedDB */
  /* Sera implémenté à la partie #20 */
  const pending = await _idbGetAll('pending_reports');
  if (!pending.length) return;

  console.log(`[SW] ${pending.length} signalement(s) en attente à synchroniser`);

  const results = await Promise.allSettled(
    pending.map(report =>
      fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })
    )
  );

  /* Notifier l'app des résultats */
  const sent = results.filter(r => r.status === 'fulfilled').length;
  if (sent > 0) {
    _notifyClients({ type: 'SYNC_COMPLETE', sent });
  }
}


/* ════════════════════════════════════════════
   PUSH NOTIFICATIONS
   (sera activé à la partie #35)
   ════════════════════════════════════════════ */
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); }
  catch { data = { title: 'CityReport', body: event.data.text() }; }

  const options = {
    body:    data.body    || 'Nouvelle mise à jour',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/badge-72.png',
    image:   data.image   || undefined,
    tag:     data.tag     || 'cityreport',
    renotify:data.renotify || false,
    data:    { url: data.url || '/' },
    actions: data.actions || [],
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'CityReport', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        /* Si l'app est déjà ouverte → focus + navigate */
        const existing = clientList.find(c => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.postMessage({ type: 'NAVIGATE', url });
          return;
        }
        /* Sinon ouvrir un nouvel onglet */
        return clients.openWindow(url);
      })
  );
});


/* ════════════════════════════════════════════
   MESSAGE — communication SW ↔ app
   ════════════════════════════════════════════ */
self.addEventListener('message', event => {
  const { type } = event.data || {};

  if (type === 'SKIP_WAITING') {
    /* L'app demande une mise à jour immédiate */
    self.skipWaiting();
  }

  if (type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: VERSION });
  }
});

function _notifyClients(message) {
  self.clients.matchAll().then(clientList => {
    clientList.forEach(client => client.postMessage(message));
  });
}


/* ════════════════════════════════════════════
   IDB HELPERS (stub — implémentés à la partie #20)
   ════════════════════════════════════════════ */
async function _idbGetAll(storeName) {
  /* Stub — retourne [] jusqu'à la partie #20 */
  return [];
}
