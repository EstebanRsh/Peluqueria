// ============================================================
// MENSAJES DE FORMULARIO, ESTADO OCUPADO Y CAMBIOS SIN GUARDAR
// ============================================================

import { confirmAction } from "./confirm.js";

const ALERT_TITLES = {
  error: "No se pudo completar",
  warning: "Revisá antes de continuar",
  success: "Listo",
  info: "Aviso",
};

// Manejo de avisos y campos inválidos de un panel lateral. Los avisos se
// muestran en una ventanita; al cerrarla el foco va al primer campo marcado.
//
//  show(type, message)  type: "error" | "warning" | "success" | "info"
//  invalidate(ids)      marca campos con aria-invalid
//  clearInvalid()       quita todas las marcas de error
export function createFeedback(panel) {
  return {
    async show(type, message) {
      await confirmAction({
        title: ALERT_TITLES[type] ?? ALERT_TITLES.info,
        message,
        confirmLabel: "Entendido",
        cancelLabel: null,
      });

      panel.querySelector("[aria-invalid='true']")?.focus();
    },

    invalidate(ids) {
      ids.forEach((id) => {
        document.getElementById(id)?.setAttribute("aria-invalid", "true");
      });
    },

    clearInvalid() {
      panel
        .querySelectorAll("[aria-invalid]")
        .forEach((element) => element.removeAttribute("aria-invalid"));
    },
  };
}

export function clearInvalidOnInput(panel) {
  const handler = (event) => {
    event.target?.removeAttribute?.("aria-invalid");
  };

  panel.addEventListener("input", handler);
  panel.addEventListener("change", handler);
}

// Muestra el círculo de carga dentro de un buscador (".search-field").
export function setSearching(input, searching) {
  input?.closest(".search-field")?.classList.toggle("is-loading", searching);
  input?.toggleAttribute("aria-busy", searching);
}

// Pone un botón en estado ocupado (deshabilitado y con indicador de carga).
export function setBusy(button, busy) {
  if (!button) {
    return;
  }

  button.disabled = busy;
  button.classList.toggle("is-loading", busy);
  button.setAttribute("aria-busy", String(busy));
}

// Detecta cambios sin guardar comparando los valores actuales de un panel
// con los que tenía cuando se tomó la foto inicial.
export function createDirtyTracker(panel) {
  const serialize = () =>
    Array.from(panel.querySelectorAll("input, select, textarea"))
      .map((field) =>
        field.type === "checkbox" || field.type === "radio"
          ? String(field.checked)
          : field.value,
      )
      .join("\u0001");

  let initial = serialize();

  return {
    reset() {
      initial = serialize();
    },

    isDirty() {
      return serialize() !== initial;
    },
  };
}
