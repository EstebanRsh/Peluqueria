// ============================================================
// PANEL LATERAL Y VISUALIZACIÓN DE TURNOS
// ============================================================

import {
  ApiError,
  fetchAppointments,
  updateAppointmentStatus,
  fetchTimelineHistory,
  removeAppointment,
  getErrorMessage,
} from "./api.js";

import { escapeHtml } from "./dom.js";
import { formatDate, slugify } from "./utils.js";
import { debounce } from "./list.js";
import { notify } from "./toast.js";
import { appState } from "./state.js";

// ============================================================
// ELEMENTOS PRINCIPALES
// ============================================================

const panel = document.getElementById("dayPanel");
const panelOverlay = document.getElementById("dayPanelOverlay");
const panelDate = document.getElementById("panelDate");
const panelBody = document.getElementById("panelBody");

if (panel && !panel.hasAttribute("tabindex")) {
  panel.setAttribute("tabindex", "-1");
}

// Guarda temporalmente los turnos cargados por ID.
const appointmentMap = new Map();

// Modal de detalle actualmente abierto.
let activeDetailModal = null;

// Elemento que tenía el foco antes de abrir el panel diario.
let panelOpener = null;

// ============================================================
// CONFIGURACIÓN Y ESTADO DE FILTROS
// ============================================================

const TOOLTIP_TTL_MS = 30000;
const FEEDBACK_SUCCESS_MS = 3000;

const STATUS_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "reservado", label: "Reservados" },
  { value: "en-sala-de-espera", label: "En espera" },
  { value: "en-atencion", label: "En atención" },
  { value: "finalizado", label: "Finalizados" },
  { value: "ausente", label: "Ausentes" },
  { value: "cancelado", label: "Cancelados" },
];

const STATUS_OPTIONS = [
  "Reservado",
  "En sala de espera",
  "En atención",
  "Finalizado",
  "Ausente",
  "Cancelado",
];

let appointmentSearchQuery = "";
let appointmentFilterStatus = "todos";
let loadToken = 0;

// ============================================================
// UTILIDADES
// ============================================================

function formatTime(value) {
  return String(value ?? "").substring(0, 5);
}

function restoreFocus(element) {
  if (element && element.isConnected) {
    element.focus({ preventScroll: true });
  }
}

// ============================================================
// APERTURA DEL PANEL
// ============================================================

export function openPanelForDate(cell, date, statusFilter) {
  document
    .querySelectorAll(".calendar__cell--selected")
    .forEach((selectedCell) => {
      selectedCell.classList.remove("calendar__cell--selected");
    });

  if (cell) {
    cell.classList.add("calendar__cell--selected");
  }

  panelOpener = cell || document.activeElement;

  // Actualizar día activo.
  appState.activeDay = date;

  // Por defecto al abrir un día mostramos "todos" los turnos del día o el filtro indicado
  appointmentFilterStatus = statusFilter ? slugify(statusFilter) : "todos";

  // Reiniciar búsqueda.
  appointmentSearchQuery = "";

  // Mostrar fecha en la cabecera del panel.
  const dateFormatted = formatDate(date);
  panelDate.textContent = dateFormatted;

  renderPanelShell();

  // Abrir panel.
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  panelOverlay?.classList.add("is-open");

  // Cargar turnos del día.
  loadAppointments(date);

  requestAnimationFrame(() => panel.focus({ preventScroll: true }));
}

// ============================================================
// CIERRE DEL PANEL
// ============================================================

export function closePanel() {
  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  panelOverlay?.classList.remove("is-open");

  document.querySelectorAll(".calendar__cell--selected").forEach((cell) => {
    cell.classList.remove("calendar__cell--selected");
  });

  appState.activeDay = null;

  restoreFocus(panelOpener);
  panelOpener = null;
}

panelOverlay?.addEventListener("click", closePanel);

// Escape cierra únicamente la capa superior: primero el detalle, luego el panel.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (activeDetailModal) {
    closeAppointmentDetailModal();
    return;
  }

  if (!panel.classList.contains("is-open")) {
    return;
  }

  // Si hay otro panel lateral abierto por encima (por ejemplo el formulario
  // de turno), Escape lo cierra su propio módulo y este panel permanece.
  const openDrawers = document.querySelectorAll(".side-drawer.is-open");
  const topmost = openDrawers[openDrawers.length - 1];

  if (topmost && topmost !== panel) {
    return;
  }

  closePanel();
});

// ============================================================
// CALENDARIO: MARCAS DE RESERVADOS
// ============================================================

// Conecta una marca de reservados con el panel diario y su tooltip.
export function bindCalendarBadge(badge) {
  badge.addEventListener("click", (event) => {
    event.stopPropagation();

    const cell = badge.closest(".calendar__cell--active");

    if (!cell) {
      return;
    }

    // Abrir el panel filtrando por la agenda del día
    openPanelForDate(cell, badge.dataset.date, "reservado");
  });

  badge.addEventListener("mouseenter", async () => {
    const loadedAt = Number(badge.dataset.loadedAt || 0);

    // Evita pedidos repetidos mientras hay uno en curso o los datos son recientes
    if (
      badge.dataset.loading === "true" ||
      Date.now() - loadedAt < TOOLTIP_TTL_MS
    ) {
      return;
    }

    badge.dataset.loading = "true";

    try {
      const data = await fetchAppointments(badge.dataset.date);
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
      }

      badge.dataset.loadedAt = String(Date.now());
    } catch (error) {
      console.error("Error al cargar nombres de reservas:", error);
    } finally {
      delete badge.dataset.loading;
    }
  });
}

// Actualiza la marca, el texto accesible de la celda de un día.
function updateCellReservados(cell, count) {
  let badge = cell.querySelector(".cell__status-badge--reservado");

  if (count > 0) {
    if (!badge) {
      const events = document.createElement("div");
      events.className = "cell__events";

      badge = document.createElement("span");
      badge.className = "cell__status-badge cell__status-badge--reservado";
      badge.dataset.status = "reservado";
      badge.dataset.date = cell.dataset.date;

      events.appendChild(badge);
      cell.appendChild(events);
      bindCalendarBadge(badge);
    }

    badge.textContent = String(count);
    badge.setAttribute("title", `Reservados: ${count}`);
    delete badge.dataset.loadedAt;
    cell.classList.add("calendar__cell--has-event");
  } else if (badge) {
    badge.closest(".cell__events")?.remove();
    cell.classList.remove("calendar__cell--has-event");
  }

  const baseLabel = (cell.getAttribute("aria-label") || "").split(",")[0];

  cell.setAttribute(
    "aria-label",
    count > 0
      ? `${baseLabel}, ${count} ${count === 1 ? "reserva" : "reservas"}`
      : baseLabel,
  );
}

// Recalcula el resumen del mes a partir de las marcas visibles.
function updateCalendarSummary() {
  const badges = document.querySelectorAll(
    ".calendar__cell--active .cell__status-badge--reservado",
  );

  let total = 0;
  badges.forEach((badge) => {
    total += Number.parseInt(badge.textContent, 10) || 0;
  });

  const totalElement = document.querySelector("[data-summary='reservas']");
  const daysElement = document.querySelector("[data-summary='dias']");

  if (totalElement) totalElement.textContent = String(total);
  if (daysElement) daysElement.textContent = String(badges.length);
}

// Vuelve a consultar los turnos del día y actualiza el calendario
// (contador de la celda y resumen) sin recargar la página.
export async function syncCalendarDay(date) {
  if (!date) {
    return;
  }

  const cell = document.querySelector(
    `.calendar__cell--active[data-date="${CSS.escape(String(date))}"]`,
  );

  // El día no pertenece al mes que se está mostrando.
  if (!cell) {
    return;
  }

  try {
    const appointments = await fetchAppointments(date);
    const count = appointments.filter(
      (appointment) => slugify(appointment.status) === "reservado",
    ).length;

    updateCellReservados(cell, count);
    updateCalendarSummary();
  } catch (error) {
    console.error("Error al actualizar el calendario:", error);
  }
}

// ============================================================
// ESTRUCTURA DEL PANEL (BÚSQUEDA, FILTROS Y LISTA)
// Se dibuja una sola vez por apertura; las búsquedas y filtros
// solo actualizan la lista, sin recrear el campo de texto.
// ============================================================

function renderPanelShell() {
  const filterButtons = STATUS_FILTERS.map((filter) => {
    const isActive = appointmentFilterStatus === filter.value;

    return `
      <button
        type="button"
        class="btn-filter${isActive ? " is-active" : ""}"
        data-status="${filter.value}"
        aria-pressed="${isActive}"
      >
        ${filter.label}
      </button>
    `;
  }).join("");

  panelBody.innerHTML = `
    <div class="panel-controls">
      <input
        class="panel-search"
        type="text"
        id="appointmentSearch"
        aria-label="Buscar turnos"
        placeholder="Buscar cliente o peluquero/a..."
        value="${escapeHtml(appointmentSearchQuery)}"
        autocomplete="off"
      />

      <div class="panel-filters" role="group" aria-label="Filtrar por estado">
        ${filterButtons}
      </div>
    </div>

    <div id="appointmentsListContainer"></div>
  `;
}

function syncFilterButtons() {
  panelBody.querySelectorAll(".btn-filter[data-status]").forEach((button) => {
    const isActive = button.dataset.status === appointmentFilterStatus;

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

// Eventos delegados: siguen funcionando aunque la lista se vuelva a dibujar.
panelBody?.addEventListener("click", (event) => {
  const filterButton = event.target.closest(".btn-filter[data-status]");

  if (filterButton) {
    appointmentFilterStatus = filterButton.dataset.status;
    syncFilterButtons();
    loadAppointments(appState.activeDay);
    return;
  }

  if (event.target.closest("[data-action='retry-load']")) {
    loadAppointments(appState.activeDay);
    return;
  }

  const row = event.target.closest(".appointment-card__row");

  if (row) {
    openAppointmentDetailModal(row.closest(".appointment-card")?.dataset.id);
  }
});

panelBody?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const row = event.target.closest?.(".appointment-card__row");

  if (!row || event.target !== row) {
    return;
  }

  event.preventDefault();
  openAppointmentDetailModal(row.closest(".appointment-card")?.dataset.id);
});

const reloadAppointmentsSoon = debounce(() =>
  loadAppointments(appState.activeDay, { showLoading: false }),
);

panelBody?.addEventListener("input", (event) => {
  if (event.target.id !== "appointmentSearch") {
    return;
  }

  appointmentSearchQuery = event.target.value;
  reloadAppointmentsSoon();
});

// ============================================================
// CARGA DE TURNOS
// ============================================================

export async function loadAppointments(date, { showLoading = true } = {}) {
  if (!date) {
    return;
  }

  if (!document.getElementById("appointmentsListContainer")) {
    renderPanelShell();
  }

  const container = document.getElementById("appointmentsListContainer");
  const token = ++loadToken;

  if (showLoading) {
    container.innerHTML = `<p class="panel-loading" role="status">Cargando turnos...</p>`;
  }

  container.setAttribute("aria-busy", "true");

  try {
    const appointments = await fetchAppointments(
      date,
      appointmentSearchQuery.trim(),
      appointmentFilterStatus,
    );

    // Se descarta una respuesta vieja si ya se pidió otra más reciente.
    if (token !== loadToken) {
      return;
    }

    renderAppointmentsList(container, appointments);
  } catch (error) {
    if (token !== loadToken) {
      return;
    }

    console.error("Error al cargar turnos:", error);

    container.innerHTML = `
      <p class="panel-error" role="alert">
        ${escapeHtml(getErrorMessage(error, "No se pudieron cargar los turnos."))}
      </p>
      <p class="panel-error">
        <button
          type="button"
          class="btn btn--ghost btn--sm"
          data-action="retry-load"
        >
          Reintentar
        </button>
      </p>
    `;
  } finally {
    if (token === loadToken) {
      container.removeAttribute("aria-busy");
    }
  }
}

// ============================================================
// RENDERIZADO DE LA LISTA
// ============================================================

function renderAppointmentsList(container, appointments) {
  appointmentMap.clear();

  if (!appointments || !appointments.length) {
    container.innerHTML = `
      <p class="panel-empty" role="status">
        No se encontraron turnos para este día con los filtros aplicados.
      </p>
    `;
    return;
  }

  container.innerHTML = appointments
    .map((appointment) => {
      const sluggedStatus = slugify(appointment.status);

      const displayClientName =
        appointment.client_name || appointment.alias || "Sin cliente asociado";

      const time = formatTime(appointment.time_start);

      appointmentMap.set(String(appointment.id), appointment);

      return `
        <div
          class="appointment-card"
          data-id="${escapeHtml(appointment.id)}"
        >
          <div
            class="appointment-card__row"
            role="button"
            tabindex="0"
            aria-label="Ver detalle del turno de ${escapeHtml(displayClientName)} a las ${escapeHtml(time)}"
          >
            <div class="appointment-card__col-left">
              <span class="appointment-card__time">
                ${escapeHtml(time)}
              </span>

              <span class="appointment-card__name">
                ${escapeHtml(displayClientName)}
              </span>

              <span class="appointment-card__service">
                ${escapeHtml(appointment.service_name || "Servicio no disponible")}
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
    })
    .join("");
}

// ============================================================
// DETALLE DE TURNO
// ============================================================

function openAppointmentDetailModal(appointmentId) {
  const appointment = appointmentMap.get(String(appointmentId));

  if (!appointment) {
    return;
  }

  const opener = document.activeElement;

  closeAppointmentDetailModal({ restore: false });

  const displayClientName =
    appointment.client_name || appointment.alias || "Sin cliente asociado";

  const detailOverlay = document.createElement("div");
  detailOverlay.className =
    "side-drawer-overlay side-drawer-overlay--nested is-open";

  const detailPanel = document.createElement("aside");
  detailPanel.className = "side-drawer side-drawer--nested is-open";
  detailPanel.setAttribute("role", "dialog");
  detailPanel.setAttribute("aria-modal", "true");
  detailPanel.setAttribute("aria-label", "Detalle del turno");
  detailPanel.setAttribute("tabindex", "-1");

  const statusOptions = STATUS_OPTIONS.map(
    (status) => `
      <option value="${escapeHtml(status)}"${appointment.status === status ? " selected" : ""}>
        ${escapeHtml(status)}
      </option>
    `,
  ).join("");

  detailPanel.innerHTML = `
      <div class="day-panel__header appointment-detail-header">
        <div>
          <span class="appointment-detail-meta">
            ${escapeHtml(formatTime(appointment.time_start))} hs
          </span>

          <h3 class="day-panel__date">
            ${escapeHtml(displayClientName)}
          </h3>
        </div>

        <button
          type="button"
          class="day-panel__close appointment-detail-close"
          data-action="close-detail"
          aria-label="Cerrar detalle"
        >
          ×
        </button>
      </div>

      <div class="day-panel__body appointment-detail-body">
        <div class="alert is-hidden" id="detailFeedback"></div>

        <section class="detail-grid">
          <div class="detail-card">
            <span class="detail-label">Fecha</span>
            <span class="detail-value">
              ${escapeHtml(formatDate(appState.activeDay))}
            </span>
          </div>

          <div class="detail-card">
            <span class="detail-label">Servicio</span>
            <span class="detail-value">
              ${escapeHtml(appointment.service_name || "No disponible")}
            </span>
          </div>

          <div class="detail-card">
            <span class="detail-label">Peluquero/a</span>
            <span class="detail-value">
              ${escapeHtml(appointment.stylist || "Sin asignar")}
            </span>
          </div>

          <div class="detail-card">
            <span class="detail-label">Duración</span>
            <span class="detail-value">
              ${
                appointment.service_duration
                  ? `${escapeHtml(appointment.service_duration)} min`
                  : "No disponible"
              }
            </span>
          </div>

          <div class="detail-card">
            <span class="detail-label">Precio</span>
            <span class="detail-value">
              $${escapeHtml(appointment.price || "0")}
            </span>
          </div>

          <!-- Cambio de Estado Dinámico -->
          <div class="detail-card">
            <span class="detail-label">Estado</span>
            <select
              id="modalStatusSelect"
              class="form-select select-flujo-cambio select-flujo-cambio--${slugify(
                appointment.status,
              )}"
              aria-label="Estado del turno"
              data-id="${escapeHtml(appointment.id)}"
            >
              ${statusOptions}
            </select>
          </div>

          <div class="detail-card">
            <span class="detail-label">Horario</span>
            <span class="detail-value">
              ${escapeHtml(formatTime(appointment.time_start))} - ${escapeHtml(
                formatTime(appointment.time_end),
              )}
            </span>
          </div>

          <div class="detail-card detail-card-full">
            <span class="detail-label">Notas</span>
            <span class="detail-value">
              ${escapeHtml(appointment.notes || "Sin observaciones")}
            </span>
          </div>
        </section>

        <section class="appointment-history-log">
          <div class="history-title">Historial de estado</div>
          <div class="history-items">
            <p class="history-placeholder" role="status">Cargando historial...</p>
          </div>
        </section>
      </div>

      <div class="appointment-detail-footer">
        <button
          type="button"
          class="btn btn--ghost"
          data-action="close-detail"
        >
          Cerrar
        </button>

        <button
          type="button"
          class="btn btn--ghost is-hidden"
          data-action="cancel-delete"
        >
          Cancelar
        </button>

        <button
          type="button"
          class="btn btn--danger appointment-detail-delete"
          data-action="ask-delete"
          data-id="${escapeHtml(appointment.id)}"
        >
          Eliminar turno
        </button>

        <button
          type="button"
          class="btn btn--danger is-hidden"
          data-action="confirm-delete"
          data-id="${escapeHtml(appointment.id)}"
        >
          Sí, eliminar
        </button>
      </div>
  `;

  document.body.appendChild(detailOverlay);
  document.body.appendChild(detailPanel);
  document.body.classList.add("has-detail-modal");

  activeDetailModal = {
    overlay: detailOverlay,
    panel: detailPanel,
    appointmentId: appointment.id,
    opener,
    feedbackTimer: null,
  };

  attachDetailModalEvents(detailPanel, detailOverlay);
  loadTimelineHistory(
    appointment.id,
    detailPanel.querySelector(".history-items"),
  );

  detailPanel.querySelector("[data-action='close-detail']")?.focus();
}

function closeAppointmentDetailModal({ restore = true } = {}) {
  if (!activeDetailModal) {
    return;
  }

  const {
    overlay,
    panel: detailPanel,
    appointmentId,
    opener,
    feedbackTimer,
  } = activeDetailModal;

  clearTimeout(feedbackTimer);
  overlay.remove();
  detailPanel.remove();
  activeDetailModal = null;
  document.body.classList.remove("has-detail-modal");

  if (!restore) {
    return;
  }

  // La lista pudo volver a dibujarse mientras el detalle estaba abierto.
  const row = panelBody?.querySelector(
    `.appointment-card[data-id="${CSS.escape(String(appointmentId))}"] .appointment-card__row`,
  );

  restoreFocus(opener?.isConnected ? opener : row);
}

// ============================================================
// MENSAJES DEL DETALLE (ERRORES, ÉXITO Y CONFIRMACIÓN)
// ============================================================

function showDetailFeedback(type, message) {
  if (!activeDetailModal) {
    return;
  }

  const box = activeDetailModal.panel.querySelector("#detailFeedback");

  if (!box) {
    return;
  }

  clearTimeout(activeDetailModal.feedbackTimer);

  box.className = `alert alert--${type}`;
  box.setAttribute("role", type === "success" ? "status" : "alert");
  box.textContent = message;

  if (type === "success") {
    activeDetailModal.feedbackTimer = setTimeout(
      clearDetailFeedback,
      FEEDBACK_SUCCESS_MS,
    );
  }
}

function clearDetailFeedback() {
  if (!activeDetailModal) {
    return;
  }

  const box = activeDetailModal.panel.querySelector("#detailFeedback");

  if (box) {
    box.className = "alert is-hidden";
    box.textContent = "";
  }
}

function setDeleteConfirmMode(detailPanel, isConfirming) {
  const toggle = (action, show) =>
    detailPanel
      .querySelector(`[data-action='${action}']`)
      ?.classList.toggle("is-hidden", !show);

  toggle("close-detail", !isConfirming);
  toggle("ask-delete", !isConfirming);
  toggle("cancel-delete", isConfirming);
  toggle("confirm-delete", isConfirming);

  if (isConfirming) {
    showDetailFeedback(
      "warning",
      "¿Eliminar este turno de forma permanente? Esta acción no se puede deshacer.",
    );
    detailPanel.querySelector("[data-action='cancel-delete']")?.focus();
  } else {
    clearDetailFeedback();
  }
}

// ============================================================
// EVENTOS DEL DETALLE
// ============================================================

function attachDetailModalEvents(detailPanel, detailOverlay) {
  const statusSelect = detailPanel.querySelector("#modalStatusSelect");

  detailOverlay.addEventListener("click", () => closeAppointmentDetailModal());

  detailPanel.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) {
      return;
    }

    switch (actionButton.dataset.action) {
      case "close-detail":
        closeAppointmentDetailModal();
        break;

      case "ask-delete":
        setDeleteConfirmMode(detailPanel, true);
        break;

      case "cancel-delete":
        setDeleteConfirmMode(detailPanel, false);
        detailPanel.querySelector("[data-action='ask-delete']")?.focus();
        break;

      case "confirm-delete":
        await deleteAppointment(detailPanel, actionButton);
        break;

      default:
        break;
    }
  });

  if (statusSelect) {
    statusSelect.addEventListener("change", () =>
      changeAppointmentStatus(statusSelect),
    );
  }
}

async function changeAppointmentStatus(statusSelect) {
  const targetStatus = statusSelect.value;
  const appointmentIdNum = statusSelect.dataset.id;

  clearDetailFeedback();
  statusSelect.disabled = true;
  statusSelect.setAttribute("aria-busy", "true");

  try {
    const response = await updateAppointmentStatus(
      appointmentIdNum,
      targetStatus,
    );

    if (!response.success) {
      throw new ApiError(response.error || "No se pudo actualizar el estado.", {
        kind: "request",
      });
    }

    const appointment = appointmentMap.get(String(appointmentIdNum));

    if (appointment) {
      appointment.status = targetStatus;
      statusSelect.className = `form-select select-flujo-cambio select-flujo-cambio--${slugify(
        targetStatus,
      )}`;
    }

    showDetailFeedback("success", "Estado actualizado.");

    // Al cambiar el estado, recargamos el panel del día y el contador del calendario
    syncCalendarDay(appState.activeDay);
    await loadAppointments(appState.activeDay, { showLoading: false });
  } catch (error) {
    console.error("Error al actualizar estado:", error);

    showDetailFeedback(
      "error",
      getErrorMessage(error, "No se pudo actualizar el estado."),
    );

    const appointment = appointmentMap.get(String(appointmentIdNum));

    if (appointment) {
      statusSelect.value = appointment.status;
    }
  } finally {
    statusSelect.disabled = false;
    statusSelect.removeAttribute("aria-busy");
  }
}

async function deleteAppointment(detailPanel, confirmButton) {
  confirmButton.disabled = true;
  confirmButton.classList.add("is-loading");

  try {
    const response = await removeAppointment(confirmButton.dataset.id);

    if (!response.success) {
      throw new ApiError(response.error || "No se pudo eliminar el turno.", {
        kind: "request",
      });
    }

    closeAppointmentDetailModal({ restore: false });
    notify.success("Turno eliminado.");
    syncCalendarDay(appState.activeDay);
    await loadAppointments(appState.activeDay, { showLoading: false });

    const firstRow = panelBody?.querySelector(".appointment-card__row");
    restoreFocus(firstRow || panel);
  } catch (error) {
    console.error("Error al eliminar turno:", error);

    setDeleteConfirmMode(detailPanel, false);
    showDetailFeedback(
      "error",
      getErrorMessage(error, "No se pudo eliminar el turno."),
    );
  } finally {
    confirmButton.disabled = false;
    confirmButton.classList.remove("is-loading");
  }
}

// ============================================================
// HISTORIAL DE ESTADOS
// ============================================================

async function loadTimelineHistory(id, container) {
  if (!container) {
    return;
  }

  try {
    const history = await fetchTimelineHistory(id);

    // El detalle pudo cerrarse mientras se esperaba la respuesta.
    if (!container.isConnected) {
      return;
    }

    if (!history || !history.length) {
      container.innerHTML = `<p class="history-empty">Sin cambios de estado registrados.</p>`;
      return;
    }

    container.innerHTML = history
      .map((historyItem) => {
        const time = String(historyItem.changed_at ?? "").slice(11, 16);

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

    if (container.isConnected) {
      container.innerHTML = `<p class="history-error" role="alert">${escapeHtml(
        getErrorMessage(error, "No se pudo cargar el historial."),
      )}</p>`;
    }
  }
}
