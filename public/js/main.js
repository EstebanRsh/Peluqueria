import { openPanelForDate, closePanel } from "./ui.js";
import { initModal } from "./modal.js";
import { fetchAppointments } from "./api.js";
import { slugify } from "./utils.js";

const panel = document.getElementById("dayPanel");
const closeBtn = document.getElementById("panelClose");

// Estado de la aplicación compartido en memoria de manera limpia
export const appState = {
  activeDay: null,
};

// Inicialización de escuchas sobre el Calendario Primario
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
  badge.addEventListener("click", (e) => {
    e.stopPropagation();
    const date = badge.dataset.date;
    const status = badge.dataset.status;
    const cell = badge.closest(".calendar__cell--active");
    openPanelForDate(cell, date, status);
  });

  badge.addEventListener("mouseenter", async () => {
    if (badge.dataset.loadedNames) return;
    const date = badge.dataset.date;
    const status = badge.dataset.status;
    const originalTitle = badge.getAttribute("title");

    try {
      const data = await fetchAppointments(date);
      const filtered = data.filter((a) => slugify(a.status) === status);
      const names = filtered.map((a) => a.patient_name).join(", ");
      if (names) {
        badge.setAttribute("title", `${originalTitle} \n(${names})`);
        badge.dataset.loadedNames = "true";
      }
    } catch (err) {
      console.error(err);
    }
  });
});

closeBtn.addEventListener("click", closePanel);

// ==========================================================================
// INTERACCIÓN SIDEBAR RESPONSIVE (MÓVIL)
// ==========================================================================
const burgerBtn = document.getElementById("mobileBurger");
const sidebar = document.querySelector(".premium-sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

if (burgerBtn && sidebar && sidebarOverlay) {
  const toggleMobileSidebar = () => {
    sidebar.classList.toggle("mobile-open");
    sidebarOverlay.classList.toggle("is-visible");
    burgerBtn.classList.toggle("is-active");
  };

  // Eventos para abrir/cerrar
  burgerBtn.addEventListener("click", toggleMobileSidebar);
  sidebarOverlay.addEventListener("click", toggleMobileSidebar);

  // UX: Si se cambia de sección en el menú, lo colapsamos automáticamente
  sidebar.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      sidebarOverlay.classList.remove("is-visible");
      burgerBtn.classList.remove("is-active");
    });
  });
}

// Inicializar el módulo del modal
initModal();

// Manejo Global de Excepciones del Navegador
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
