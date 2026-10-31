// ============================================================
// APLICACIÓN INSTALABLE
// Registra el service worker y muestra el botón «Instalar app» del sidebar cuando se puede instalar.
// ============================================================

import { BASE_URL } from "./config.js";
import { logError } from "./api.js";
import { showResult } from "./confirm.js";

// ============================================================
// SERVICE WORKER
// ============================================================

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register(`${BASE_URL}/service-worker.js`)
    .catch((error) => logError("Error al registrar el service worker:", error));
}

// ============================================================
// BOTÓN INSTALAR
// ============================================================

const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function initInstallButton() {
  const button = document.getElementById("navInstall");
  if (!button || isInstalled()) return;

  let installPrompt = null;

  button.hidden = !isIos();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    button.hidden = true;
  });

  button.addEventListener("click", () => {
    if (!installPrompt) {
      showResult(
        "info",
        "Instalá HairApp",
        "En Safari tocá Compartir y elegí «Agregar a inicio».",
      );
      return;
    }

    const prompt = installPrompt;
    installPrompt = null;
    button.hidden = true;
    prompt
      .prompt()
      .catch((error) => logError("Error al abrir la instalación:", error));
  });
}
