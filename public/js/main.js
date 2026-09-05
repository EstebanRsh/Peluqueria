// ============================================================
// CONTROL PRINCIPAL DE LA APLICACIÓN
// ============================================================
import { openPanelForDate, closePanel } from "./ui.js";
import { initModal } from "./modal.js";
import { fetchAppointments } from "./api.js";
import { slugify } from "./utils.js";
import { initServices, loadServicesList } from "./services.js";

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
const navItems = document.querySelectorAll(".nav-item[data-view]");

navItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();

    const view = item.dataset.view;

    navItems.forEach((nav) => nav.classList.remove("is-active"));
    item.classList.add("is-active");

    if (view === "services") {
      viewAppointments.classList.add("is-hidden");
      viewServices.classList.remove("is-hidden");
      loadServicesList();
    } else {
      viewServices.classList.add("is-hidden");
      viewAppointments.classList.remove("is-hidden");
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
