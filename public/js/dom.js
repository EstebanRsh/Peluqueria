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

// Devuelve el foco a un elemento si sigue en la página.
export function restoreFocus(element) {
  if (element && element.isConnected) {
    element.focus({ preventScroll: true });
  }
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
