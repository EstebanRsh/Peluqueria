// La aplicación no usa PWA ni service workers. Elimina una instalación antigua
// que seguía interceptando las peticiones de login y convertía errores HTTP en
// errores de red del navegador.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => {
        // No impedir el inicio de sesión si el navegador niega esta operación.
      });
  });
}
