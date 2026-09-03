// ============================================================
// CONTROL PRINCIPAL DE LA APLICACIÓN
// ============================================================
import { openPanelForDate, closePanel } from "./ui.js";
import { initModal } from "./modal.js";
import { fetchAppointments } from "./api.js";
import { slugify } from "./utils.js";

// ============================================================
// ELEMENTOS PRINCIPALES
// ============================================================
const panel = document.getElementById("dayPanel");
const closeBtn = document.getElementById("panelClose");

// ============================================================
// ESTADO DE LA APLICACIÓN
// ============================================================
// Estado compartido en memoria.
// activeDay contiene la fecha que actualmente está seleccionada.
export const appState = {
  activeDay: null,
};

// ============================================================
// INTERACCIÓN CON EL CALENDARIO
// ============================================================
// Permite seleccionar una fecha del calendario y abrir/cerrar
// el panel lateral correspondiente.
document.querySelectorAll(".calendar__cell--active").forEach((cell) => {
  cell.addEventListener("click", () => {
    const date = cell.dataset.date;

    // Si se vuelve a hacer clic sobre el día actualmente abierto,
    // se cierra el panel.
    if (appState.activeDay === date && panel.classList.contains("is-open")) {
      closePanel();
    } else {
      // Abrir el panel para la nueva fecha.
      openPanelForDate(cell, date, null);
    }
  });
});

// ============================================================
// INDICADORES DE ESTADO
// ============================================================
// Permite abrir directamente el panel filtrado por un estado
// haciendo clic sobre un indicador del calendario.
document.querySelectorAll(".cell__status-badge").forEach((badge) => {
  badge.addEventListener("click", (event) => {
    event.stopPropagation();

    const date = badge.dataset.date;
    const status = badge.dataset.status;
    const cell = badge.closest(".calendar__cell--active");

    openPanelForDate(cell, date, status);
  });

  // Al pasar el mouse sobre un indicador, se muestran
  // los nombres de los clientes de ese estado.
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

      // La aplicación ahora trabaja con clientes, no con pacientes.
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

// ============================================================
// CIERRE DEL PANEL
// ============================================================
// Cierra el panel lateral mediante su botón de cierre.
if (closeBtn) {
  closeBtn.addEventListener("click", closePanel);
}

// ============================================================
// SIDEBAR RESPONSIVE
// ============================================================
const burgerBtn = document.getElementById("mobileBurger");
const sidebar = document.querySelector(".premium-sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

if (burgerBtn && sidebar && sidebarOverlay) {
  // Abre o cierra el menú lateral en dispositivos móviles.
  const toggleMobileSidebar = () => {
    sidebar.classList.toggle("mobile-open");
    sidebarOverlay.classList.toggle("is-visible");
    burgerBtn.classList.toggle("is-active");
  };

  // Abrir/cerrar mediante el botón hamburguesa.
  burgerBtn.addEventListener("click", toggleMobileSidebar);

  // Cerrar haciendo clic sobre el fondo.
  sidebarOverlay.addEventListener("click", toggleMobileSidebar);

  // Cerrar automáticamente el menú al seleccionar una sección de navegación.
  sidebar.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      sidebarOverlay.classList.remove("is-visible");
      burgerBtn.classList.remove("is-active");
    });
  });
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
// Inicializa el modal de creación de turnos.
initModal();

// ============================================================
// MANEJO GLOBAL DE ERRORES
// ============================================================
// Captura errores JavaScript no controlados.
window.addEventListener("error", (event) => {
  console.group("ERROR GLOBAL");
  console.error(event.message);
  console.error(event.filename);
  console.error(event.lineno);
  console.groupEnd();
});

// Captura Promises rechazadas que no hayan sido controladas.
window.addEventListener("unhandledrejection", (event) => {
  console.group("PROMESA RECHAZADA");
  console.error(event.reason);
  console.groupEnd();
});
