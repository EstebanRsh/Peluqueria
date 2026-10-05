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

const panel = document.getElementById("dayPanel");
const closeBtn = document.getElementById("panelClose");

export const appState = {
  activeDay: null,
};

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

document.querySelectorAll(".cell__status-badge").forEach((badge) => {
  badge.addEventListener("click", (event) => {
    event.stopPropagation();

    const date = badge.dataset.date;
    const status = badge.dataset.status;
    const cell = badge.closest(".calendar__cell--active");

    openPanelForDate(cell, date, status);
  });

  badge.addEventListener("mouseenter", async () => {
    if (badge.dataset.loadedNames) {
      return;
    }

    const date = badge.dataset.date;
    const status = badge.dataset.status;
    const originalTitle = badge.getAttribute("title") || "";

    try {
      const data = await fetchAppointments(date);
      const filtered = data.filter(
        (appointment) => slugify(appointment.status) === status,
      );
      const names = filtered
        .map((appointment) => appointment.client_name)
        .join(", ");

      if (names) {
        badge.setAttribute("title", `${originalTitle} \n(${names})`);
        badge.dataset.loadedNames = "true";
      }
    } catch (error) {
      console.error("Error al cargar nombres de clientes:", error);
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

navItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();

    const view = item.dataset.view;

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

const fabToggle = document.getElementById("fabToggle");
const fabActions = document.getElementById("fabActions");
const fabBackdrop = document.getElementById("fabBackdrop");

if (fabToggle && fabActions) {
  const fabItems = fabActions.querySelectorAll(".fab-actions__item");

  const setFabOpen = (isOpen) => {
    fabActions.classList.toggle("is-open", isOpen);
    fabToggle.setAttribute("aria-expanded", String(isOpen));
    fabBackdrop?.classList.toggle("is-visible", isOpen);

    // Evita que un Tab llegue a botones invisibles cuando el
    // menú está cerrado (accesibilidad de teclado).
    fabItems.forEach((item) => {
      item.tabIndex = isOpen ? 0 : -1;
    });
  };

  const closeFab = () => setFabOpen(false);
  const toggleFab = () => setFabOpen(!fabActions.classList.contains("is-open"));

  setFabOpen(false);

  fabToggle.addEventListener("click", toggleFab);
  fabBackdrop?.addEventListener("click", closeFab);

  // Cierra el menú apenas se elige una acción: no lo dejamos abierto
  // tapando la pantalla mientras se abre el modal correspondiente.
  fabItems.forEach((item) => {
    item.addEventListener("click", closeFab);
  });

  const openExistingForm = (viewName, triggerId) => {
    const navItem = Array.from(navItems).find(
      (item) => item.dataset.view === viewName,
    );
    if (navItem && !navItem.classList.contains("is-active")) {
      navItem.click();
    }
    document.getElementById(triggerId)?.click();
  };

  document
    .getElementById("btnNewAppointment")
    ?.addEventListener("click", () => {
      const today = new Date();
      appState.activeDay ??= [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");
      document.getElementById("btnAddAppointment")?.click();
    });

  document
    .getElementById("btnNewProduct")
    ?.addEventListener("click", () =>
      openExistingForm("products", "btnAddProduct"),
    );

  document
    .getElementById("btnNewCustomer")
    ?.addEventListener("click", () =>
      openExistingForm("clients", "btnAddClient"),
    );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && fabActions.classList.contains("is-open")) {
      closeFab();
    }
  });
}

initModal();
initServices();
initClients();
initProducts();
initQuickEntry();
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
