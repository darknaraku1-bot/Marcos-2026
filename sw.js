const CACHE_NAME = 'cementerio-nfc-v2';
const ASSETS_TO_CACHE = [
  'index.html',
  'styles.css',
  'manifest.json',
  'assets/sounds/shutter.mp3'
];

// Instalar Service Worker y guardar archivos críticos en la caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Abriendo caché y almacenando recursos críticos...');
        // Usamos cache.addAll de forma tolerante a fallos
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(asset => {
            return cache.add(asset).catch(err => {
              console.warn(`No se pudo cachear el recurso inicial: ${asset}`, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activar el SW y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia Network First falling back to Cache para asegurar actualizaciones,
// pero respondiendo instantáneamente si no hay conexión
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones WebSocket y esquemas que no sean HTTP/HTTPS (ej: chrome-extension)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, clonarla y guardarla en la caché
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red (offline), intentar responder desde la caché
        return caches.match(event.request);
      })
  );
});
