// ============================================================
// CONTROL PRINCIPAL DE LA APLICACIÓN
// ============================================================
import { openPanelForDate, closePanel, bindCalendarBadge } from "./ui.js";
import { initModal } from "./modal.js";
import { ApiError, isAbortError } from "./api.js";
import { notify } from "./toast.js";
import { initServices, loadServicesList } from "./services.js";
import { initClients, loadClientsList } from "./clients.js";
import { initProducts, loadProductsList } from "./products.js";
import { initQuickEntry } from "./quickEntry.js";
import { initLogout } from "./auth.js";
import { initFab } from "./fab.js";
import { appState } from "./state.js";
import { initPanelFocusTrap } from "./dom.js";

const panel = document.getElementById("dayPanel");
const closeBtn = document.getElementById("panelClose");

// ============================================================
// CALENDARIO: CELDAS (CLIC Y TECLADO)
// ============================================================

function toggleDayPanel(cell) {
  const date = cell.dataset.date;

  if (appState.activeDay === date && panel.classList.contains("is-open")) {
    closePanel();
  } else {
    openPanelForDate(cell, date, null);
  }
}

document.querySelectorAll(".calendar__cell--active").forEach((cell) => {
  cell.addEventListener("click", () => toggleDayPanel(cell));

  // Enter o Espacio activan la celda (role="button"). Se ignoran las teclas
  // que provienen de elementos internos.
  cell.addEventListener("keydown", (event) => {
    if (event.target !== cell) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleDayPanel(cell);
    }
  });
});

// ============================================================
// CALENDARIO: INDICADOR DE RESERVADOS (CLIC Y TOOLTIP)
// ============================================================

document.querySelectorAll(".cell__status-badge").forEach(bindCalendarBadge);

if (closeBtn) {
  closeBtn.addEventListener("click", closePanel);
}

// ============================================================
// NAVEGACIÓN ENTRE VISTAS
// ============================================================

const viewAppointments = document.getElementById("viewAppointments");
const viewServices = document.getElementById("viewServices");
const viewClients = document.getElementById("viewClients");
const viewProducts = document.getElementById("viewProducts");
const navItems = document.querySelectorAll(".nav-item[data-view]");

const views = {
  appointments: viewAppointments,
  services: viewServices,
  clients: viewClients,
  products: viewProducts,
};

const fab = initFab({
  appState,
  navItems,
  getCurrentView: () => appState.activeView,
});
fab.setView(appState.activeView);

navItems.forEach((item) => {
  if (item.classList.contains("is-active")) {
    item.setAttribute("aria-current", "page");
  }

  item.addEventListener("click", (event) => {
    event.preventDefault();

    const view = item.dataset.view;
    appState.activeView = view;
    fab.setView(view);

    navItems.forEach((nav) => {
      nav.classList.remove("is-active");
      nav.removeAttribute("aria-current");
    });
    item.classList.add("is-active");
    item.setAttribute("aria-current", "page");

    Object.entries(views).forEach(([key, element]) => {
      if (!element) return;
      element.classList.toggle("is-hidden", key !== view);
    });

    views[view]?.querySelector("h2")?.focus({ preventScroll: true });

    if (view === "services") {
      loadServicesList();
    } else if (view === "clients") {
      loadClientsList();
    } else if (view === "products") {
      loadProductsList();
    }
  });
});

// ============================================================
// MENÚ MÓVIL
// ============================================================

const burgerBtn = document.getElementById("mobileBurger");
const sidebar = document.querySelector(".premium-sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

if (burgerBtn && sidebar && sidebarOverlay) {
  const setMobileSidebar = (isOpen) => {
    sidebar.classList.toggle("is-open", isOpen);
    sidebarOverlay.classList.toggle("is-open", isOpen);
    burgerBtn.classList.toggle("is-active", isOpen);
    burgerBtn.setAttribute("aria-expanded", String(isOpen));
    burgerBtn.setAttribute(
      "aria-label",
      isOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación",
    );
  };

  setMobileSidebar(false);

  burgerBtn.addEventListener("click", () =>
    setMobileSidebar(!sidebar.classList.contains("is-open")),
  );
  sidebarOverlay.addEventListener("click", () => setMobileSidebar(false));

  sidebar.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => setMobileSidebar(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar.classList.contains("is-open")) {
      setMobileSidebar(false);
    }
  });

  // Al pasar a desktop el menú móvil no debe quedar abierto
  window
    .matchMedia("(min-width: 769px)")
    .addEventListener("change", (event) => {
      if (event.matches) {
        setMobileSidebar(false);
      }
    });
}

// ============================================================
// INICIALIZACIÓN DE MÓDULOS
// ============================================================

initPanelFocusTrap();
initModal();
initServices();
initClients();
initProducts();
initQuickEntry();
initLogout();

// Los errores inesperados se registran en la consola y se informan al usuario
// sin mostrar detalles técnicos. Se limita la frecuencia para no saturar.
const UNEXPECTED_ERROR_MESSAGE =
  "Ocurrió un error inesperado. Si el problema continúa, recargá la página.";
const NOTICE_INTERVAL_MS = 5000;
let lastNoticeAt = 0;

function notifyUnexpectedError(message) {
  const now = Date.now();

  if (now - lastNoticeAt < NOTICE_INTERVAL_MS) {
    return;
  }

  lastNoticeAt = now;
  notify.error(message);
}

window.addEventListener("error", (event) => {
  console.error("Error no controlado:", event.message);

  // Aviso benigno del navegador: no afecta al usuario.
  if (String(event.message).startsWith("ResizeObserver")) {
    return;
  }

  notifyUnexpectedError(UNEXPECTED_ERROR_MESSAGE);
});

window.addEventListener("unhandledrejection", (event) => {
  // Las cancelaciones pedidas por la propia aplicación no son errores.
  if (isAbortError(event.reason)) {
    return;
  }

  console.error("Promesa rechazada sin manejar:", event.reason);

  notifyUnexpectedError(
    event.reason instanceof ApiError
      ? event.reason.message
      : UNEXPECTED_ERROR_MESSAGE,
  );
});
