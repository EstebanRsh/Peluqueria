// ============================================================
// CONTROL PRINCIPAL DE LA APLICACIÓN
// ============================================================
import { openPanelForDate, closePanel } from "./ui.js";
import { initModal } from "./modal.js";
import { fetchAppointments } from "./api.js";
import { slugify } from "./utils.js";
import { initServices, loadServicesList } from "./services.js";
import { initClients, loadClientsList } from "./clients.js";
import { initProducts, loadProductsList } from "./products.js";
import { initQuickEntry } from "./quickEntry.js";
import { initLogout } from "./auth.js";
import { initFab } from "./fab.js";

const panel = document.getElementById("dayPanel");
const closeBtn = document.getElementById("panelClose");

export const appState = {
  activeDay: null,
  activeView: "appointments",
};

// Clic en la celda del calendario
document.querySelectorAll(".calendar__cell--active").forEach((cell) => {
  cell.addEventListener("click", () => {
    const date = cell.dataset.date;

    if (appState.activeDay === date && panel.classList.contains("is-open")) {
      closePanel();
    } else {
      openPanelForDate(cell, date, null);
    }
  });
});

// Clic y Hover en el indicador de Reservados
document.querySelectorAll(".cell__status-badge").forEach((badge) => {
  badge.addEventListener("click", (event) => {
    event.stopPropagation();

    const date = badge.dataset.date;
    const cell = badge.closest(".calendar__cell--active");

    // Abrir el panel filtrando por la agenda del día
    openPanelForDate(cell, date, "reservado");
  });

  badge.addEventListener("mouseenter", async () => {
    if (badge.dataset.loadedNames) {
      return;
    }

    const date = badge.dataset.date;

    try {
      const data = await fetchAppointments(date);
      // Solo nos interesan los clientes con estado Reservado para el tooltip del calendario
      const filtered = data.filter(
        (appointment) => slugify(appointment.status) === "reservado",
      );
      const names = filtered
        .map((appointment) => appointment.client_name || appointment.alias)
        .filter(Boolean)
        .join(", ");

      if (names) {
        badge.setAttribute("title", `Reservas: ${filtered.length}\n(${names})`);
        badge.dataset.loadedNames = "true";
      }
    } catch (error) {
      console.error("Error al cargar nombres de reservas:", error);
    }
  });
});

if (closeBtn) {
  closeBtn.addEventListener("click", closePanel);
}

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
  item.addEventListener("click", (event) => {
    event.preventDefault();

    const view = item.dataset.view;
    appState.activeView = view;
    fab.setView(view);

    navItems.forEach((nav) => nav.classList.remove("is-active"));
    item.classList.add("is-active");

    Object.entries(views).forEach(([key, element]) => {
      if (!element) return;
      element.classList.toggle("is-hidden", key !== view);
    });

    if (view === "services") {
      loadServicesList();
    } else if (view === "clients") {
      loadClientsList();
    } else if (view === "products") {
      loadProductsList();
    }
  });
});

const burgerBtn = document.getElementById("mobileBurger");
const sidebar = document.querySelector(".premium-sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

if (burgerBtn && sidebar && sidebarOverlay) {
  const toggleMobileSidebar = () => {
    sidebar.classList.toggle("mobile-open");
    sidebarOverlay.classList.toggle("is-visible");
    burgerBtn.classList.toggle("is-active");
  };

  burgerBtn.addEventListener("click", toggleMobileSidebar);
  sidebarOverlay.addEventListener("click", toggleMobileSidebar);

  sidebar.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      sidebarOverlay.classList.remove("is-visible");
      burgerBtn.classList.remove("is-active");
    });
  });
}

initModal();
initServices();
initClients();
initProducts();
initQuickEntry();
initLogout();

window.addEventListener("error", (event) => {
  console.group("ERROR GLOBAL");
  console.error(event.message);
  console.error(event.filename);
  console.error(event.lineno);
  console.groupEnd();
});

window.addEventListener("unhandledrejection", (event) => {
  console.group("PROMESA RECHAZADA");
  console.error(event.reason);
  console.groupEnd();
});
