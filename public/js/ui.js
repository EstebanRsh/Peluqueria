// ============================================================
// PANEL LATERAL Y VISUALIZACIÓN DE TURNOS
// ============================================================

import {
  fetchAppointments,
  updateAppointmentStatus,
  fetchTimelineHistory,
  removeAppointment,
} from "./api.js";

import { formatDate, slugify } from "./utils.js";
import { appState } from "./main.js";

// ============================================================
// ELEMENTOS PRINCIPALES
// ============================================================

const panel = document.getElementById("dayPanel");
const panelDate = document.getElementById("panelDate");
const panelBody = document.getElementById("panelBody");
const layout = document.querySelector(".app-layout");

// Guarda temporalmente los turnos cargados por ID.
const appointmentMap = new Map();

// Modal de detalle actualmente abierto.
let activeDetailModal = null;

// ============================================================
// FILTROS
// ============================================================

// Conservan los filtros utilizados dentro del panel.
let appointmentSearchQuery = "";
let appointmentFilterStatus = "todos";

// ============================================================
// SEGURIDAD HTML
// ============================================================

// Escapa caracteres especiales antes de insertar
// datos recibidos del servidor dentro del HTML.
function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================================
// APERTURA DEL PANEL
// ============================================================

// Abre el panel lateral para una fecha determinada.
// También permite aplicar un filtro de estado.
export function openPanelForDate(cell, date, statusFilter) {
  document
    .querySelectorAll(".calendar__cell--selected")
    .forEach((selectedCell) => {
      selectedCell.classList.remove("calendar__cell--selected");
    });

  cell.classList.add("calendar__cell--selected");

  // Actualizar día activo.
  appState.activeDay = date;

  // Sincronizar el filtro de estado.
  appointmentFilterStatus = statusFilter ? slugify(statusFilter) : "todos";

  // Reiniciar búsqueda.
  appointmentSearchQuery = "";

  // Mostrar fecha en el panel.
  const dateFormatted = formatDate(date);
  panelDate.innerHTML = dateFormatted;

  // Abrir panel.
  panel.classList.add("is-open");
  layout.classList.add("panel-open");

  // Cargar turnos.
  loadAppointments(date);
}

// ============================================================
// CIERRE DEL PANEL
// ============================================================

// Cierra el panel lateral y limpia la selección actual.
export function closePanel() {
  panel.classList.remove("is-open");
  layout.classList.remove("panel-open");

  document.querySelectorAll(".calendar__cell--selected").forEach((cell) => {
    cell.classList.remove("calendar__cell--selected");
  });

  appState.activeDay = null;
}

// ============================================================
// CARGA DE TURNOS
// ============================================================

// Solicita al servidor los turnos correspondientes
// al día y filtros actualmente seleccionados.
export async function loadAppointments(date) {
  if (!date) {
    return;
  }

  try {
    const appointments = await fetchAppointments(
      date,
      appointmentSearchQuery,
      appointmentFilterStatus,
    );

    renderAppointmentsList(appointments);
  } catch (error) {
    console.error("Error al cargar turnos:", error);

    panelBody.innerHTML = `
      <p class="panel-loading">
        Error al cargar turnos.
      </p>
    `;
  }
}

// ============================================================
// RENDERIZADO DE LA LISTA
// ============================================================

// Genera las tarjetas visuales de los turnos.
function renderAppointmentsList(appointments) {
  let html = `
    <div class="panel-controls">
      <input
        class="panel-search"
        type="text"
        id="appointmentSearch"
        placeholder="Buscar cliente o peluquero/a..."
        value="${escapeHtml(appointmentSearchQuery)}"
        autocomplete="off"
      />

      <div class="panel-filters">
        <button
          class="btn-filter ${appointmentFilterStatus === "todos" ? "active" : ""}"
          data-status="todos"
        >
          Todos
        </button>

        <button
          class="btn-filter ${appointmentFilterStatus === "reservado" ? "active" : ""}"
          data-status="reservado"
        >
          Reservados
        </button>

        <button
          class="btn-filter ${appointmentFilterStatus === "en-sala-de-espera" ? "active" : ""}"
          data-status="en-sala-de-espera"
        >
          En Espera
        </button>

        <button
          class="btn-filter ${appointmentFilterStatus === "en-atencion" ? "active" : ""}"
          data-status="en-atencion"
        >
          En Atención
        </button>

        <button
          class="btn-filter ${appointmentFilterStatus === "finalizado" ? "active" : ""}"
          data-status="finalizado"
        >
          Finalizados
        </button>

        <button
          class="btn-filter ${appointmentFilterStatus === "ausente" ? "active" : ""}"
          data-status="ausente"
        >
          Ausentes
        </button>

        <button
          class="btn-filter ${appointmentFilterStatus === "cancelado" ? "active" : ""}"
          data-status="cancelado"
        >
          Cancelados
        </button>
      </div>
    </div>

    <div id="appointmentsListContainer">
  `;

  // ==========================================================
  // SIN RESULTADOS
  // ==========================================================

  if (!appointments || !appointments.length) {
    html += `
        <p class="panel-empty">
          No se encontraron turnos con los filtros aplicados.
        </p>
      </div>
    `;

    panelBody.innerHTML = html;
    setupFilterListeners();
    return;
  }

  // ==========================================================
  // TARJETAS
  // ==========================================================

  appointmentMap.clear();

  appointments.forEach((appointment) => {
    const sluggedStatus = slugify(appointment.status);

    appointmentMap.set(String(appointment.id), appointment);

    html += `
      <div
        class="appointment-card"
        data-id="${escapeHtml(appointment.id)}"
      >
        <div class="appointment-card__row">
          <div class="appointment-card__col-left">
            <span class="appointment-card__time">
              ${escapeHtml(appointment.time_start.substring(0, 5))}
            </span>

            <span class="appointment-card__name">
              ${escapeHtml(appointment.client_name)}
            </span>

            <span class="appointment-card__service">
              ${escapeHtml(
                appointment.service_name || "Servicio no disponible",
              )}
            </span>
          </div>

          <div class="appointment-card__col-right">
            <span class="appointment-card__stylist">
              ${escapeHtml(appointment.stylist || "Sin asignar")}
            </span>

            <span class="status-badge status-badge--${sluggedStatus}">
              ${escapeHtml(appointment.status)}
            </span>
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  panelBody.innerHTML = html;

  setupFilterListeners();
  attachAppointmentEvents();
}

// ============================================================
// DETALLE DE TURNO
// ============================================================

// Abre el modal con toda la información del turno seleccionado.
function openAppointmentDetailModal(appointmentId) {
  const appointment = appointmentMap.get(String(appointmentId));

  if (!appointment) {
    return;
  }

  closeAppointmentDetailModal();

  const container = document.createElement("div");
  container.className = "modal-overlay is-open";

  container.innerHTML = `
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label="Detalle del turno"
    >
      <div class="modal__header appointment-detail-header">
        <div>
          <span class="appointment-detail-meta">
            ${escapeHtml(appointment.time_start.substring(0, 5))}
          </span>

          <h3 class="modal__title">
            ${escapeHtml(appointment.client_name)}
          </h3>
        </div>

        <button
          type="button"
          class="modal__close appointment-detail-close"
          aria-label="Cerrar detalle"
        >
          &times;
        </button>
      </div>

      <div class="modal__body appointment-detail-body">
        <section class="detail-grid">
          <!-- Fecha -->
          <div class="detail-card">
            <span class="detail-label">Fecha</span>
            <span class="detail-value">
              ${escapeHtml(formatDate(appState.activeDay))}
            </span>
          </div>

          <!-- Servicio -->
          <div class="detail-card">
            <span class="detail-label">Servicio</span>
            <span class="detail-value">
              ${escapeHtml(appointment.service_name || "No disponible")}
            </span>
          </div>

          <!-- Peluquero/a -->
          <div class="detail-card">
            <span class="detail-label">Peluquero/a</span>
            <span class="detail-value">
              ${escapeHtml(appointment.stylist || "Sin asignar")}
            </span>
          </div>

          <!-- Teléfono -->
          <div class="detail-card">
            <span class="detail-label">Teléfono</span>
            <span class="detail-value">
              ${escapeHtml(appointment.phone || "No registrado")}
            </span>
          </div>

          <!-- Duración -->
          <div class="detail-card">
            <span class="detail-label">Duración</span>
            <span class="detail-value">
              ${
                appointment.service_duration
                  ? `${escapeHtml(appointment.service_duration)} minutos`
                  : "No disponible"
              }
            </span>
          </div>

          <!-- Precio -->
          <div class="detail-card">
            <span class="detail-label">Precio</span>
            <span class="detail-value">
              $${escapeHtml(appointment.price || "0")}
            </span>
          </div>

          <!-- Estado -->
          <div class="detail-card">
            <span class="detail-label">Estado</span>
            <select
              id="modalStatusSelect"
              class="form-select select-flujo-cambio select-flujo-cambio--${slugify(
                appointment.status,
              )}"
              data-id="${escapeHtml(appointment.id)}"
            >
              <option
                value="Reservado"
                ${appointment.status === "Reservado" ? "selected" : ""}
              >
                Reservado
              </option>

              <option
                value="En sala de espera"
                ${appointment.status === "En sala de espera" ? "selected" : ""}
              >
                En sala de espera
              </option>

              <option
                value="En atención"
                ${appointment.status === "En atención" ? "selected" : ""}
              >
                En atención
              </option>

              <option
                value="Finalizado"
                ${appointment.status === "Finalizado" ? "selected" : ""}
              >
                Finalizado
              </option>

              <option
                value="Ausente"
                ${appointment.status === "Ausente" ? "selected" : ""}
              >
                Ausente
              </option>

              <option
                value="Cancelado"
                ${appointment.status === "Cancelado" ? "selected" : ""}
              >
                Cancelado
              </option>
            </select>
          </div>

          <!-- Horario -->
          <div class="detail-card">
            <span class="detail-label">Horario</span>
            <span class="detail-value">
              ${escapeHtml(appointment.time_start.substring(0, 5))} - ${escapeHtml(
                appointment.time_end.substring(0, 5),
              )}
            </span>
          </div>

          <!-- Notas -->
          <div class="detail-card detail-card-full">
            <span class="detail-label">Notas</span>
            <span class="detail-value">
              ${escapeHtml(appointment.notes || "Sin observaciones")}
            </span>
          </div>
        </section>

        <!-- Historial -->
        <section
          class="appointment-history-log"
          id="histLog-${escapeHtml(appointment.id)}"
        >
          <div class="history-title">Historial de estado</div>
          <div class="history-items">
            <p class="history-placeholder">Cargando historial...</p>
          </div>
        </section>
      </div>

      <!-- Botones -->
      <div class="modal__footer appointment-detail-footer">
        <button
          type="button"
          class="btn btn--ghost appointment-detail-close-btn"
        >
          Cerrar
        </button>

        <button
          type="button"
          class="btn btn--danger appointment-detail-delete"
          data-id="${escapeHtml(appointment.id)}"
        >
          Eliminar turno
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(container);
  document.body.classList.add("has-detail-modal");
  activeDetailModal = container;

  attachDetailModalEvents(container, appointment.id);
  loadTimelineHistory(appointment.id);
}

// ============================================================
// CIERRE DEL MODAL DE DETALLE
// ============================================================

// Cierra y elimina el modal de detalle actual.
function closeAppointmentDetailModal() {
  if (!activeDetailModal) {
    return;
  }

  activeDetailModal.remove();
  activeDetailModal = null;
  document.body.classList.remove("has-detail-modal");
}

// ============================================================
// EVENTOS DEL DETALLE
// ============================================================

// Configura los botones y controles del modal de detalle.
function attachDetailModalEvents(container, appointmentId) {
  const closeButtons = container.querySelectorAll(
    ".appointment-detail-close, .appointment-detail-close-btn",
  );
  const deleteButton = container.querySelector(".appointment-detail-delete");
  const statusSelect = container.querySelector("#modalStatusSelect");

  // ----------------------------------------------------------
  // CERRAR
  // ----------------------------------------------------------

  closeButtons.forEach((button) =>
    button.addEventListener("click", closeAppointmentDetailModal),
  );

  container.addEventListener("click", (event) => {
    if (event.target === container) {
      closeAppointmentDetailModal();
    }
  });

  // ----------------------------------------------------------
  // CAMBIAR ESTADO
  // ----------------------------------------------------------

  if (statusSelect) {
    statusSelect.addEventListener("change", async () => {
      const targetStatus = statusSelect.value;
      const appointmentIdNum = statusSelect.dataset.id;

      statusSelect.disabled = true;

      try {
        const response = await updateAppointmentStatus(
          appointmentIdNum,
          targetStatus,
        );

        if (!response.success) {
          throw new Error(response.error || "No se pudo actualizar el estado.");
        }

        const appointment = appointmentMap.get(String(appointmentIdNum));

        if (appointment) {
          appointment.status = targetStatus;
          statusSelect.className = `form-select select-flujo-cambio select-flujo-cambio--${slugify(
            targetStatus,
          )}`;
        }

        await loadAppointments(appState.activeDay);
      } catch (error) {
        console.error("Error al actualizar estado:", error);

        alert("No se pudo actualizar el estado.\n\n" + error.message);

        // Restaurar valor original si falla
        const appointment = appointmentMap.get(String(appointmentIdNum));
        if (appointment) {
          statusSelect.value = appointment.status;
        }
      } finally {
        statusSelect.disabled = false;
      }
    });
  }

  // ----------------------------------------------------------
  // ELIMINAR
  // ----------------------------------------------------------

  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      if (
        !confirm(
          "¿Estás seguro de que deseas eliminar permanentemente este turno?",
        )
      ) {
        return;
      }

      deleteButton.disabled = true;

      try {
        const response = await removeAppointment(deleteButton.dataset.id);

        if (!response.success) {
          throw new Error(response.error || "No se pudo eliminar el turno.");
        }

        closeAppointmentDetailModal();
        await loadAppointments(appState.activeDay);
      } catch (error) {
        console.error("Error al eliminar turno:", error);

        alert("No se pudo eliminar el turno.\n\n" + error.message);
        deleteButton.disabled = false;
      }
    });
  }
}

// ============================================================
// FILTROS Y BÚSQUEDA
// ============================================================

// Configura los eventos de búsqueda y filtrado.
function setupFilterListeners() {
  const searchInput = document.getElementById("appointmentSearch");

  // ----------------------------------------------------------
  // BÚSQUEDA
  // ----------------------------------------------------------

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      appointmentSearchQuery = event.target.value;

      loadAppointments(appState.activeDay);

      const input = document.getElementById("appointmentSearch");

      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  // ----------------------------------------------------------
  // FILTROS DE ESTADO
  // ----------------------------------------------------------

  document.querySelectorAll(".btn-filter").forEach((button) => {
    button.addEventListener("click", () => {
      appointmentFilterStatus = button.dataset.status;
      loadAppointments(appState.activeDay);
    });
  });
}

// ============================================================
// EVENTOS DE LAS TARJETAS
// ============================================================

// Hace que cada tarjeta abra el detalle del turno.
function attachAppointmentEvents() {
  panelBody.querySelectorAll(".appointment-card__row").forEach((row) => {
    row.addEventListener("click", () => {
      const card = row.closest(".appointment-card");

      if (!card) {
        return;
      }

      openAppointmentDetailModal(card.dataset.id);
    });
  });
}

// ============================================================
// HISTORIAL
// ============================================================

// Carga y muestra el historial de estados de un turno.
async function loadTimelineHistory(id) {
  const container = document.querySelector(`#histLog-${id} .history-items`);

  if (!container) {
    return;
  }

  try {
    const history = await fetchTimelineHistory(id);

    if (!history || !history.length) {
      container.innerHTML = `<p class="history-empty">Sin registros de flujo.</p>`;
      return;
    }

    container.innerHTML = history
      .map((historyItem) => {
        const time = historyItem.changed_at.slice(11, 16);

        return `
          <div class="hist-item shadow-text">
            • <strong>${escapeHtml(time)} hs:</strong>
            ${
              historyItem.status_from
                ? escapeHtml(historyItem.status_from)
                : "Turno creado"
            }
            →
            <span>${escapeHtml(historyItem.status_to)}</span>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error al cargar historial:", error);

    container.innerHTML = `<p class="history-error">Error al cargar línea de tiempo.</p>`;
  }
}
