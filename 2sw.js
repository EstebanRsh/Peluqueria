// ============================================================
// SERVICE WORKER OBSOLETO
// Se desregistra al activarse para que los navegadores dejen de usar la versión antigua.
// ============================================================

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.unregister());
});
