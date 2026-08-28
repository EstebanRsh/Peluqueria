// Renderizado y control del Panel Lateral (Vista)
import {
  fetchAppointments,
  updateAppointmentStatus,
  fetchTimelineHistory,
  removeAppointment,
} from "./api.js";
import { formatDate, slugify } from "./utils.js";
import { appState } from "./main.js";

const panel = document.getElementById("dayPanel");
const panelDate = document.getElementById("panelDate");
const panelBody = document.getElementById("panelBody");
const layout = document.querySelector(".app-layout");
const appointmentMap = new Map();

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
let activeDetailModal = null;

// Variables internas de control para persistir los filtros en la sesión de la vista
let appointmentSearchQuery = "";
let appointmentFilterStatus = "todos";

export function openPanelForDate(cell, date, statusFilter) {
  document
    .querySelectorAll(".calendar__cell--selected")
    .forEach((c) => c.classList.remove("calendar__cell--selected"));
  cell.classList.add("calendar__cell--selected");

  appState.activeDay = date;

  // Sincronizar el filtro si se hace click directo desde un badge del calendario
  appointmentFilterStatus = statusFilter ? slugify(statusFilter) : "todos";
  appointmentSearchQuery = "";

  const dateFormatted = formatDate(date);
  panelDate.innerHTML = dateFormatted;

  panel.classList.add("is-open");
  layout.classList.add("panel-open");
  loadAppointments(date);
}

export function closePanel() {
  panel.classList.remove("is-open");
  layout.classList.remove("panel-open");
  document
    .querySelectorAll(".calendar__cell--selected")
    .forEach((c) => c.classList.remove("calendar__cell--selected"));
  appState.activeDay = null;
}

// Llama al servidor enviando los filtros actuales
export async function loadAppointments(date) {
  if (!date) return;

  try {
    // PHP realiza la búsqueda y filtrado de manera segura en el servidor
    const appointments = await fetchAppointments(
      date,
      appointmentSearchQuery,
      appointmentFilterStatus,
    );
    renderAppointmentsList(appointments);
  } catch (error) {
    console.error(error);
    panelBody.innerHTML = `<p class="panel-loading">Error al cargar turnos.</p>`;
  }
}

function renderAppointmentsList(appointments) {
  // 1. Inyectamos los filtros con el contenedor deslizable horizontal nativo
  let html = `
    <div class="panel-controls">
      <input class="panel-search" type="text" id="appointmentSearch" placeholder="Buscar paciente o profesional..." value="${appointmentSearchQuery}" autocomplete="off" />
      <div class="panel-filters">
        <button class="btn-filter ${appointmentFilterStatus === "todos" ? "active" : ""}" data-status="todos">Todos</button>
        <button class="btn-filter ${appointmentFilterStatus === "reservado" ? "active" : ""}" data-status="reservado">Reservados</button>
        <button class="btn-filter ${appointmentFilterStatus === "en-sala-de-espera" ? "active" : ""}" data-status="en-sala-de-espera">En Espera</button>
        <button class="btn-filter ${appointmentFilterStatus === "en-atencion" ? "active" : ""}" data-status="en-atencion">En Atención</button>
        <button class="btn-filter ${appointmentFilterStatus === "finalizado" ? "active" : ""}" data-status="finalizado">Finalizados</button>
        <button class="btn-filter ${appointmentFilterStatus === "ausente" ? "active" : ""}" data-status="ausente">Ausentes</button>
        <button class="btn-filter ${appointmentFilterStatus === "cancelado" ? "active" : ""}" data-status="cancelado">Cancelados</button>
      </div>
    </div>
    <div id="appointmentsListContainer">
  `;

  if (!appointments || !appointments.length) {
    html += `<p class="panel-empty">No se encontraron turnos con los filtros aplicados.</p></div>`;
    panelBody.innerHTML = html;
    setupFilterListeners();
    return;
  }

  // 2. Renderizado de las nuevas tarjetas optimizadas para lectura rápida
  appointmentMap.clear();

  appointments.forEach((a) => {
    const sluggedStatus = slugify(a.status);
    appointmentMap.set(String(a.id), a);
    html += `
      <div class="appointment-card" data-id="${a.id}">
        <div class="appointment-card__row">
          <div class="appointment-card__col-left">
            <span class="appointment-card__time">${escapeHtml(a.time_start.substring(0, 5))}</span>
            <span class="appointment-card__name">${escapeHtml(a.patient_name)}</span>
          </div>
          <div class="appointment-card__col-right">
            <span class="appointment-card__doctor">${escapeHtml(a.doctor || "Sin asignar")}</span>
            <span class="status-badge status-badge--${sluggedStatus}">${escapeHtml(a.status)}</span>
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

function openAppointmentDetailModal(appointmentId) {
  const appointment = appointmentMap.get(String(appointmentId));
  if (!appointment) return;
  closeAppointmentDetailModal();

  const container = document.createElement("div");
  container.className = "modal-overlay is-open";
  container.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Detalle del turno">
      <div class="modal__header appointment-detail-header">
        <div>
          <span class="appointment-detail-meta">${escapeHtml(appointment.time_start.substring(0, 5))}</span>
          <h3 class="modal__title">${escapeHtml(appointment.patient_name)}</h3>
        </div>
        <button type="button" class="modal__close appointment-detail-close" aria-label="Cerrar detalle">&times;</button>
      </div>
      <div class="modal__body appointment-detail-body">
        <section class="detail-grid">
          <div class="detail-card">
            <span class="detail-label">Fecha</span>
            <span class="detail-value">${escapeHtml(formatDate(appState.activeDay))}</span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Profesional</span>
            <span class="detail-value">${escapeHtml(appointment.doctor || "Sin asignar")}</span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Teléfono</span>
            <span class="detail-value">${escapeHtml(appointment.phone || "No registrado")}</span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Obra Social</span>
            <span class="detail-value">${escapeHtml(appointment.social_work || "Particular")}</span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Monto</span>
            <span class="detail-value">$${escapeHtml(appointment.payment || "0")}</span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Estado</span>
            <select id="modalStatusSelect" class="form-select select-flujo-cambio select-flujo-cambio--${slugify(appointment.status)}" data-id="${escapeHtml(appointment.id)}">
              <option value="Reservado" ${appointment.status === "Reservado" ? "selected" : ""}>Reservado</option>
              <option value="En sala de espera" ${appointment.status === "En sala de espera" ? "selected" : ""}>En sala de espera</option>
              <option value="En atención" ${appointment.status === "En atención" ? "selected" : ""}>En atención</option>
              <option value="Finalizado" ${appointment.status === "Finalizado" ? "selected" : ""}>Finalizado</option>
              <option value="Ausente" ${appointment.status === "Ausente" ? "selected" : ""}>Ausente</option>
              <option value="Cancelado" ${appointment.status === "Cancelado" ? "selected" : ""}>Cancelado</option>
            </select>
          </div>
          <div class="detail-card detail-card-full">
            <span class="detail-label">Notas</span>
            <span class="detail-value">${escapeHtml(appointment.notes || "Sin observaciones")}</span>
          </div>
        </section>

        <section class="appointment-history-log" id="histLog-${escapeHtml(appointment.id)}">
          <div class="history-title">Historial de estado</div>
          <div class="history-items">
            <p class="history-placeholder">Cargando historial de flujo...</p>
          </div>
        </section>
      </div>
      <div class="modal__footer appointment-detail-footer">
        <button type="button" class="btn btn--ghost appointment-detail-close-btn">Cerrar</button>
        <button type="button" class="btn btn--danger appointment-detail-delete" data-id="${escapeHtml(appointment.id)}">Eliminar Turno</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);
  document.body.classList.add("has-detail-modal");
  activeDetailModal = container;
  attachDetailModalEvents(container, appointment.id);
  loadTimelineHistory(appointment.id);
}

function closeAppointmentDetailModal() {
  if (!activeDetailModal) return;
  activeDetailModal.remove();
  activeDetailModal = null;
  document.body.classList.remove("has-detail-modal");
}

function attachDetailModalEvents(container, appointmentId) {
  const closeButtons = container.querySelectorAll(
    ".appointment-detail-close, .appointment-detail-close-btn",
  );
  const deleteButton = container.querySelector(".appointment-detail-delete");
  const statusSelect = container.querySelector("#modalStatusSelect");

  closeButtons.forEach((button) =>
    button.addEventListener("click", closeAppointmentDetailModal),
  );

  container.addEventListener("click", (event) => {
    if (event.target === container) {
      closeAppointmentDetailModal();
    }
  });

  if (statusSelect) {
    statusSelect.addEventListener("change", async () => {
      const targetStatus = statusSelect.value;
      const appointmentIdNum = statusSelect.dataset.id;
      statusSelect.disabled = true;
      try {
        await updateAppointmentStatus(appointmentIdNum, targetStatus);
        const appointment = appointmentMap.get(String(appointmentIdNum));
        if (appointment) {
          appointment.status = targetStatus;
          statusSelect.className = `form-select select-flujo-cambio select-flujo-cambio--${slugify(targetStatus)}`;
        }
        await loadAppointments(appState.activeDay);
      } catch (error) {
        alert("No se pudo actualizar el estado.\n\n" + error.message);
      } finally {
        statusSelect.disabled = false;
      }
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      if (
        !confirm(
          "¿Estás seguro de que deseas eliminar permanentemente este turno?",
        )
      ) {
        return;
      }
      try {
        await removeAppointment(deleteButton.dataset.id);
        closeAppointmentDetailModal();
        await loadAppointments(appState.activeDay);
      } catch (error) {
        alert("No se pudo eliminar el turno.\n\n" + error.message);
      }
    });
  }
}

function setupFilterListeners() {
  const searchInput = document.getElementById("appointmentSearch");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      appointmentSearchQuery = e.target.value;
      loadAppointments(appState.activeDay);

      const input = document.getElementById("appointmentSearch");
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  document.querySelectorAll(".btn-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      appointmentFilterStatus = btn.dataset.status;
      loadAppointments(appState.activeDay);
    });
  });
}

function attachAppointmentEvents() {
  // Ahora toda la fila (tarjeta) abre de forma interactiva el detalle/modal
  panelBody.querySelectorAll(".appointment-card__row").forEach((row) => {
    row.addEventListener("click", () => {
      const card = row.closest(".appointment-card");
      openAppointmentDetailModal(card.dataset.id);
    });
  });
}

async function loadTimelineHistory(id) {
  const container = document.querySelector(`#histLog-${id} .history-items`);
  if (!container) return;
  try {
    const history = await fetchTimelineHistory(id);
    if (!history || !history.length) {
      container.innerHTML = `<p class="history-empty">Sin registros de flujo.</p>`;
      return;
    }
    container.innerHTML = history
      .map((h) => {
        const time = h.changed_at.slice(11, 16);
        return `<div class="hist-item shadow-text">• <strong>${escapeHtml(time)} hs:</strong> ${h.status_from ? escapeHtml(h.status_from) : "Turno creado"} → <span>${escapeHtml(h.status_to)}</span></div>`;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `<p class="history-error">Error al cargar línea de tiempo.</p>`;
  }
}
