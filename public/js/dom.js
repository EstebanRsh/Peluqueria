// ============================================================
// UTILIDADES COMPARTIDAS DE INTERFAZ
// ============================================================

export const $ = (id) => document.getElementById(id);

// Escapa un valor para insertarlo de forma segura en HTML.
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Devuelve el foco a un elemento si sigue en la página. Espera un instante
// para que el fondo de un panel recién cerrado deje de estar inerte.
export function restoreFocus(element) {
  queueMicrotask(() => {
    if (element && element.isConnected) {
      element.focus({ preventScroll: true });
    }
  });
}

// Mientras hay un panel modal abierto, el resto de la página queda inerte
// (sin foco ni clics). Con paneles apilados, solo el último está activo.
// Los fondos y los diálogos de confirmación siguen activos. Con un <dialog>
// nativo abierto no se aplica: showModal() ya bloquea el resto.
const OPEN_PANEL = '[role="dialog"][aria-modal="true"].is-open';
const STAYS_ACTIVE = ".side-drawer-overlay, .confirm-dialog";

export function initPanelFocusTrap() {
  const stack = [];
  let topPanel = null;
  let inertNodes = [];

  const update = () => {
    const open = [...document.querySelectorAll(OPEN_PANEL)];
    const ordered = [
      ...stack.filter((panel) => open.includes(panel)),
      ...open.filter((panel) => !stack.includes(panel)),
    ];
    stack.splice(0, stack.length, ...ordered);

    const top = document.querySelector("dialog[open]")
      ? null
      : (stack.at(-1) ?? null);

    if (top === topPanel) {
      return;
    }

    topPanel = top;
    inertNodes.forEach((node) => {
      node.inert = false;
    });
    inertNodes = [];

    for (
      let node = top;
      node && node !== document.body;
      node = node.parentElement
    ) {
      for (const sibling of node.parentElement.children) {
        if (
          sibling !== node &&
          sibling.tagName !== "SCRIPT" &&
          !sibling.matches(STAYS_ACTIVE)
        ) {
          sibling.inert = true;
          inertNodes.push(sibling);
        }
      }
    }
  };

  new MutationObserver(update).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "open"],
  });
}

// Registro activo (estricto): el campo "active" debe valer true o 1.
export function isActive(record) {
  return record.active === true || Number(record.active) === 1;
}

// Recorta textos largos para que no rompan una tabla.
export function truncate(text, maxLength = 40) {
  const value = String(text ?? "");

  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}

// Marca los botones de filtro como seleccionados (clase y aria-pressed).
export function setActiveFilter(buttons, activeButton) {
  buttons.forEach((button) => {
    const isSelected = button === activeButton;

    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}
