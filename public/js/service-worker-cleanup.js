// ============================================================
// LIMPIEZA DE SERVICE WORKER
// Quita un service worker antiguo que interceptaba las peticiones del login.
// ============================================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => {
      });
  });
}
