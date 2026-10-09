// ============================================================
// FAB CONTEXTUAL (un único componente, acciones según la vista)
// ============================================================

const svg = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const ICONS = {
  appointment: svg(
    '<rect x="3" y="4" width="18" height="17" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>',
  ),
  history: svg(
    '<path d="M9 3h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V4a1 1 0 0 1 1-1z"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="16" y2="15"/>',
  ),
  product: svg(
    '<path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8"/><path d="M3.27 6.96 12 12l8.73-5.04"/><path d="M12 22V12"/><path d="M8.5 4.27L16 8.5"/>',
  ),
  client: svg(
    '<circle cx="12" cy="7.5" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  ),
  service: svg(
    '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
  ),
};

// Cada acción: { label, icon, accent?, view?, trigger?, run? }
//  - view:    vista a activar antes de ejecutar (si no es la actual)
//  - trigger: id del botón existente que abre el modal
//  - run:     función personalizada
const actions = {
  newAppointment: (ctx) => ({
    label: "Nuevo Turno",
    icon: "appointment",
    accent: true,
    run: () => {
      const t = new Date();
      ctx.appState.activeDay ??= [
        t.getFullYear(),
        String(t.getMonth() + 1).padStart(2, "0"),
        String(t.getDate()).padStart(2, "0"),
      ].join("-");
      document.getElementById("btnAddAppointment")?.click();
    },
  }),
  newHistory: () => ({
    label: "Nueva Historia",
    icon: "history",
    run: () => document.dispatchEvent(new CustomEvent("quickentry:open")),
  }),
  newClient: () => ({
    label: "Nuevo Cliente",
    icon: "client",
    accent: true,
    view: "clients",
    trigger: "btnAddClient",
  }),
  newProduct: () => ({
    label: "Nuevo Producto",
    icon: "product",
    accent: true,
    view: "products",
    trigger: "btnAddProduct",
  }),
  newService: () => ({
    label: "Nuevo Servicio",
    icon: "service",
    accent: true,
    view: "services",
    trigger: "btnAddService",
  }),
};

// Acciones del FAB por vista. Agregar una acción = una línea acá.
const FAB_BY_VIEW = {
  appointments: ["newAppointment", "newHistory", "newProduct", "newClient"],
  clients: ["newClient"],
  services: ["newService"],
  products: ["newProduct"],
};

export function initFab({ appState, navItems, getCurrentView }) {
  const root = document.getElementById("fabActions");
  const toggle = document.getElementById("fabToggle");
  const menu = document.getElementById("fabMenu");
  const backdrop = document.getElementById("fabBackdrop");
  if (!root || !toggle || !menu) return { setView() {} };

  const ctx = { appState };

  const setOpen = (isOpen) => {
    root.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    backdrop?.classList.toggle("is-visible", isOpen);
    menu.querySelectorAll(".fab-actions__item").forEach((item) => {
      item.tabIndex = isOpen ? 0 : -1;
    });
  };

  const goToView = (view) => {
    if (!view || view === getCurrentView()) return;
    Array.from(navItems)
      .find((item) => item.dataset.view === view)
      ?.click();
  };

  const execute = (action) => {
    setOpen(false);
    goToView(action.view);
    if (action.run) action.run();
    else if (action.trigger) document.getElementById(action.trigger)?.click();
  };

  const setView = (view) => {
    const defs = (FAB_BY_VIEW[view] || []).map((key) => actions[key](ctx));

    menu.innerHTML = "";
    defs.forEach((action) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.tabIndex = -1;
      btn.className =
        "fab-actions__item" +
        (action.accent ? " fab-actions__item--accent" : "");
      btn.innerHTML = `${ICONS[action.icon] || ""}<span>${action.label}</span>`;
      btn.addEventListener("click", () => execute(action));
      menu.appendChild(btn);
    });

    root.hidden = defs.length === 0;
    setOpen(false);
  };

  toggle.addEventListener("click", () =>
    setOpen(!root.classList.contains("is-open")),
  );
  backdrop?.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("is-open"))
      setOpen(false);
  });

  return { setView };
}
