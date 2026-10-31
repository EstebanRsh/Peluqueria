// ============================================================
// SERVICE WORKER
// Hace instalable la aplicación y muestra la pantalla «Sin conexión» cuando no hay red.
// Todo se pide a la red: solo se guarda esa pantalla con sus estilos y fuentes, sin datos del usuario.
// ============================================================

const CACHE_NAME = "hairapp-offline-v1";
const OFFLINE_URL = new URL("offline.php", self.location).href;
const OFFLINE_ASSETS = [
  OFFLINE_URL,
  ...[
    "public/css/base.css",
    "public/css/components.css",
    "public/fonts/inter-latin-wght.woff2",
    "public/fonts/cinzel-latin-wght.woff2",
  ].map((path) => new URL(path, self.location).href),
];

// ============================================================
// PANTALLA SIN CONEXIÓN
// ============================================================

async function saveOfflinePage() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(
    OFFLINE_ASSETS.map((url) => new Request(url, { cache: "no-cache" })),
  );
}

async function ensureOfflinePage() {
  if (!(await caches.match(OFFLINE_URL))) {
    await saveOfflinePage();
  }
}

// ============================================================
// INSTALACIÓN Y ACTIVACIÓN
// ============================================================

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(saveOfflinePage());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.registration.navigationPreload?.enable();
      await self.clients.claim();
    })(),
  );
});

// ============================================================
// PEDIDOS
// ============================================================

async function openPage(event) {
  try {
    const response = (await event.preloadResponse) || (await fetch(event.request));
    event.waitUntil(ensureOfflinePage().catch(() => {}));
    return response;
  } catch {
    return (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(openPage(event));
    return;
  }

  if (OFFLINE_ASSETS.includes(request.url)) {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(request.url)) || Response.error()),
    );
  }
});
