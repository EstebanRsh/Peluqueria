// Retira el service worker obsoleto que quedó registrado en este origen.
// Se mantiene temporalmente para que los navegadores lo actualicen y dejen de
// interceptar las peticiones de la aplicación.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.unregister());
});
