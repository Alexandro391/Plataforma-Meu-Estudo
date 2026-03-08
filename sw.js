// Meu Estudo — Service Worker (Offline Support)
const CACHE = 'meu-estudo-v1';

const ASSETS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,400&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
];

// Instala e faz cache de todos os assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('Cache miss:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Ativa e remove caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Intercepta requests: cache-first para assets, network-first para API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Requisições à API Anthropic: sempre vai para rede (precisa de internet)
  if (url.hostname === 'api.anthropic.com') return;

  // Para todos os outros: tenta cache primeiro, depois rede
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cacheia respostas bem-sucedidas de fontes externas
        if (response.ok && (url.hostname.includes('googleapis') || url.hostname.includes('cloudflare'))) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback offline: retorna index.html para navegação
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
