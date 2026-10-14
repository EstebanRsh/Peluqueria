// ============================================================
// MENSAJES DE FORMULARIO, ESTADO OCUPADO Y CAMBIOS SIN GUARDAR
// ============================================================

// Crea el manejo de mensajes de un panel lateral. El mensaje se muestra
// justo encima de la barra de botones (".appointment-detail-footer").
//
//  show(type, message, source)  type: "error" | "warning" | "success" | "info"
//  clear(onlySource)            quita el mensaje (o solo el de ese origen)
//  invalidate(ids)              marca campos con aria-invalid
//  clearInvalid()               quita todas las marcas de error
export function createFeedback(
  panel,
  { footerSelector = ".appointment-detail-footer" } = {},
) {
  const getBox = () => {
    let box = panel.querySelector("[data-feedback]");

    if (box) {
      return box;
    }

    const footer = panel.querySelector(footerSelector);

    if (!footer || !footer.parentElement) {
      return null;
    }

    box = document.createElement("div");
    box.className = "alert is-hidden";
    box.dataset.feedback = "";
    footer.parentElement.insertBefore(box, footer);

    return box;
  };

  return {
    show(type, message, source = "") {
      const box = getBox();

      if (!box) {
        return;
      }

      box.className = `alert alert--${type}`;
      box.setAttribute("role", type === "error" ? "alert" : "status");
      box.dataset.source = source;
      box.textContent = message;
    },

    clear(onlySource = null) {
      const box = panel.querySelector("[data-feedback]");

      if (!box) {
        return;
      }

      if (onlySource !== null && box.dataset.source !== onlySource) {
        return;
      }

      box.className = "alert is-hidden";
      box.dataset.source = "";
      box.textContent = "";
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

// Al corregir un campo se le quita la marca de error.
export function clearInvalidOnInput(panel) {
  const handler = (event) => {
    event.target?.removeAttribute?.("aria-invalid");
  };

  panel.addEventListener("input", handler);
  panel.addEventListener("change", handler);
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
