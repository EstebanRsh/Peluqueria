// ============================================================
// BOTÓN FLOTANTE
// Acciones rápidas según la vista activa.
// ============================================================

import { todayIso } from "./utils.js";

// ============================================================
// ACCIONES
// ============================================================

const actions = {
  newAppointment: (ctx) => ({
    label: "Nuevo turno",
    icon: "fabIconAppointment",
    accent: true,
    run: () => {
      ctx.appState.activeDay ??= todayIso();
      document.getElementById("btnAddAppointment")?.click();
    },
  }),
  newHistory: () => ({
    label: "Nueva ficha",
    icon: "fabIconHistory",
    run: () => document.dispatchEvent(new CustomEvent("quickentry:open")),
  }),
  newClient: () => ({
    label: "Nuevo cliente",
    icon: "fabIconClient",
    accent: true,
    trigger: "btnAddClient",
  }),
  newProduct: () => ({
    label: "Nuevo producto",
    icon: "fabIconProduct",
    accent: true,
    trigger: "btnAddProduct",
  }),
  newService: () => ({
    label: "Nuevo servicio",
    icon: "fabIconService",
    accent: true,
    trigger: "btnAddService",
  }),
};

const FAB_BY_VIEW = {
  appointments: [
    "newAppointment",
    "newHistory",
    "newProduct",
    "newClient",
    "newService",
  ],
  clients: ["newClient"],
  services: ["newService"],
  products: ["newProduct"],
};

export function initFab({ appState }) {
  const root = document.getElementById("fabActions");
  const toggle = document.getElementById("fabToggle");
  const menu = document.getElementById("fabMenu");
  const backdrop = document.getElementById("fabBackdrop");
  const itemTemplate = document.getElementById("fabItemTemplate");
  if (!root || !toggle || !menu) return { setView() {} };

  const ctx = { appState };
  let current = [];

  const isDirect = () => current.length === 1;

  const setOpen = (isOpen) => {
    root.classList.toggle("is-open", isOpen);

    if (!isDirect()) {
      toggle.setAttribute("aria-expanded", String(isOpen));
    }

    backdrop?.classList.toggle("is-open", isOpen);
    menu.querySelectorAll(".fab-actions__item").forEach((item) => {
      item.tabIndex = isOpen ? 0 : -1;
    });
  };

  const execute = (action) => {
    setOpen(false);
    toggle.focus({ preventScroll: true });
    if (action.run) action.run();
    else if (action.trigger) document.getElementById(action.trigger)?.click();
  };

  const setView = (view) => {
    current = (FAB_BY_VIEW[view] || []).map((key) => actions[key](ctx));

    const label = isDirect() ? current[0].label : "Abrir acciones rápidas";

    toggle.setAttribute("aria-label", label);
    toggle.title = label;

    if (isDirect()) {
      toggle.removeAttribute("aria-expanded");
      toggle.removeAttribute("aria-controls");
    } else {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", "fabMenu");
    }

    menu.replaceChildren();
    (isDirect() ? [] : current).forEach((action) => {
      const btn = itemTemplate.content.firstElementChild.cloneNode(true);

      btn.classList.toggle("fab-actions__item--accent", Boolean(action.accent));
      btn.querySelector(".fab-actions__label").textContent = action.label;
      btn.prepend(document.getElementById(action.icon).content.cloneNode(true));
      btn.addEventListener("click", () => execute(action));
      menu.appendChild(btn);
    });

    root.hidden = current.length === 0;
    root.classList.toggle("fab-actions--direct", isDirect());
    setOpen(false);
  };

  toggle.addEventListener("click", () => {
    if (isDirect()) {
      execute(current[0]);
    } else {
      setOpen(!root.classList.contains("is-open"));
    }
  });
  backdrop?.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  return { setView };
}
