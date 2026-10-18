// ============================================================
// MENSAJES DE FORMULARIO, ESTADO OCUPADO Y CAMBIOS SIN GUARDAR
// ============================================================

import { showResult } from "./confirm.js";
import { restoreFocus } from "./dom.js";

const ALERT_TITLES = {
  error: "No se pudo completar",
  warning: "Revisá antes de continuar",
};

// Manejo de avisos y campos inválidos de un panel lateral. Los avisos se
// muestran en la pantalla de resultado; al cerrarla el foco va al primer
// campo marcado.
//
//  show(type, message)  type: "error" (falla) | "warning" (datos a revisar)
//  invalidate(ids)      marca campos con aria-invalid
//  focusInvalid()       lleva el foco al primer campo marcado
//  clearInvalid()       quita todas las marcas de error
export function createFeedback(panel) {
  return {
    async show(type, message) {
      await showResult(type, ALERT_TITLES[type], message);

      panel.querySelector("[aria-invalid='true']")?.focus();
    },

    invalidate(ids) {
      ids.forEach((id) => {
        document.getElementById(id)?.setAttribute("aria-invalid", "true");
      });
    },

    focusInvalid() {
      panel.querySelector("[aria-invalid='true']")?.focus();
    },

    clearInvalid() {
      panel
        .querySelectorAll("[aria-invalid]")
        .forEach((element) => element.removeAttribute("aria-invalid"));
    },
  };
}

const UNSAVED_MESSAGE =
  "Hay datos sin guardar. Usá Cancelar o × para descartarlos.";

// Panel lateral de alta / edición: abre, cierra y devuelve el foco.
// requestClose() avisa en vez de cerrar si hay datos sin guardar.
export function createDrawer({ overlay, panel, feedback, dirty }) {
  let opener = null;

  return {
    open(firstField) {
      opener = document.activeElement;

      overlay.classList.add("is-open");
      panel.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");

      requestAnimationFrame(() => firstField.focus({ preventScroll: true }));
    },

    close() {
      overlay.classList.remove("is-open");
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");

      restoreFocus(opener);
      opener = null;
    },

    requestClose() {
      if (dirty.isDirty()) {
        feedback.show("warning", UNSAVED_MESSAGE);
        return;
      }

      this.close();
    },

    isOpen: () => panel.classList.contains("is-open"),
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
