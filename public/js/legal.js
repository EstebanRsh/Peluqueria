// ============================================================
// TÉRMINOS Y PRIVACIDAD
// Muestra los textos legales en una ventana dentro de la página.
// ============================================================

import { fetchLegalPage, getErrorMessage, logError } from "./api.js";
import { $ } from "./dom.js";

function statusMessage(className, text) {
  const message = document.createElement("p");

  message.className = className;
  message.textContent = text;

  return message;
}

export function initLegal() {
  const dialog = $("legalDialog");

  if (!dialog) return;

  const title = $("legalDialogTitle");
  const content = $("legalDialogContent");

  async function openLegal(page) {
    title.textContent = "";
    content.replaceChildren(statusMessage("panel-loading", "Cargando…"));
    dialog.showModal();

    try {
      const html = await fetchLegalPage(page);
      const source = new DOMParser().parseFromString(html, "text/html");

      title.textContent = source.querySelector("h1").textContent;
      content.replaceChildren(...source.querySelector(".legal-doc").children);
    } catch (error) {
      logError("Error al cargar el texto legal:", error);
      content.replaceChildren(
        statusMessage(
          "panel-error",
          getErrorMessage(error, "No se pudo cargar el texto. Intentá de nuevo."),
        ),
      );
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-legal]");

    if (!link) return;

    event.preventDefault();
    openLegal(link.dataset.legal);
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest(".surface__close")) {
      dialog.close();
    }
  });

  dialog.addEventListener("keydown", (event) => event.stopPropagation());
}
