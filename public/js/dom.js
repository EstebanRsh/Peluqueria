// ============================================================
// UTILIDADES DE INTERFAZ
// Atajos del DOM, escape de HTML, foco, paneles inertes, filtros y contraseñas.
// ============================================================

export const $ = (id) => document.getElementById(id);

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function restoreFocus(element) {
  queueMicrotask(() => {
    if (element && element.isConnected) {
      element.focus({ preventScroll: true });
    }
  });
}

const OPEN_PANEL = '[role="dialog"][aria-modal="true"].is-open';
const STAYS_ACTIVE = ".side-drawer-overlay";

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

export function isActive(record) {
  return record.active === true || Number(record.active) === 1;
}

export function truncate(text, maxLength = 40) {
  const value = String(text ?? "");

  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}

export function setActiveFilter(buttons, activeButton) {
  buttons.forEach((button) => {
    const isSelected = button === activeButton;

    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

export function goToLogin() {
  window.location.replace(new URL("login.php", window.location.href));
}

export function initPasswordToggles(root = document) {
  root.querySelectorAll("[data-toggle-password]").forEach((button) => {
    const input = button.closest(".password-field").querySelector("input");

    button.addEventListener("click", () => {
      const show = input.type === "password";

      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute(
        "aria-label",
        show ? "Ocultar contraseña" : "Mostrar contraseña",
      );
      button
        .querySelectorAll("svg")
        .forEach((icon) => icon.toggleAttribute("hidden"));
    });
  });
}
