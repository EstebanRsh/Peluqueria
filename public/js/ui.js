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
  logError,
} from "./api.js";

import { confirmAction, showError, showResult } from "./confirm.js";
import { STATUS_FILTERS } from "./constants.js";
import { escapeHtml, restoreFocus } from "./dom.js";
import { formatDate, formatTime, slugify } from "./utils.js";
import { setBusy, setSearching } from "./feedback.js";
import { debounce } from "./list.js";
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

const appointmentMap = new Map();

let activeDetailModal = null;

let panelOpener = null;

// ============================================================
// CONFIGURACIÓN Y ESTADO DE FILTROS
// ============================================================

const TOOLTIP_TTL_MS = 30000;

const CELL_BADGE_LABELS = {
  finalizado: "Finalizados",
  reservado: "Reservados",
};

let appointmentSearchQuery = "";
let appointmentFilterStatus = "todos";
let loadToken = 0;

// ============================================================
// UTILIDADES
// ============================================================

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

  appState.activeDay = date;

  appointmentFilterStatus = statusFilter ? slugify(statusFilter) : "todos";

  appointmentSearchQuery = "";

  const dateFormatted = formatDate(date);
  panelDate.textContent = dateFormatted;

  renderPanelShell();

  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  panelOverlay?.classList.add("is-open");

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

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || statusDialog?.open) {
    return;
  }

  if (activeDetailModal) {
    closeAppointmentDetailModal();
    return;
  }

  if (!panel.classList.contains("is-open")) {
    return;
  }

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

    openPanelForDate(cell, badge.dataset.date, badge.dataset.status);
  });

  badge.addEventListener("mouseenter", async () => {
    const loadedAt = Number(badge.dataset.loadedAt || 0);

    if (
      badge.dataset.loading === "true" ||
      Date.now() - loadedAt < TOOLTIP_TTL_MS
    ) {
      return;
    }

    badge.dataset.loading = "true";

    try {
      const filtered = await fetchAppointments(
        badge.dataset.date,
        "",
        badge.dataset.status,
      );
      const names = filtered
        .map((appointment) => appointment.client_name || appointment.alias)
        .filter(Boolean)
        .join(", ");

      if (names) {
        badge.setAttribute(
          "title",
          `${CELL_BADGE_LABELS[badge.dataset.status]}: ${filtered.length}\n(${names})`,
        );
      }

      badge.dataset.loadedAt = String(Date.now());
    } catch (error) {
      logError("Error al cargar nombres del día:", error);
    } finally {
      delete badge.dataset.loading;
    }
  });
}

// Dibuja las marcas de la celda de un día (finalizados a la izquierda de reservados)
// y actualiza su texto accesible.
function renderCellBadges(cell, counts) {
  cell.querySelector(".cell__events")?.remove();

  const events = document.createElement("div");
  events.className = "cell__events";

  Object.keys(CELL_BADGE_LABELS).forEach((status) => {
    if (!counts[status]) {
      return;
    }

    const badge = document.createElement("span");
    badge.className = `cell__status-badge cell__status-badge--${status}`;
    badge.dataset.status = status;
    badge.dataset.date = cell.dataset.date;
    badge.textContent = String(counts[status]);
    badge.setAttribute(
      "title",
      `${CELL_BADGE_LABELS[status]}: ${counts[status]}`,
    );

    events.appendChild(badge);
    bindCalendarBadge(badge);
  });

  const hasEvents = events.children.length > 0;

  if (hasEvents) {
    cell.appendChild(events);
  }

  const baseLabel = (cell.getAttribute("aria-label") || "").split(",")[0];
  const parts = [baseLabel];

  if (counts.reservado) {
    parts.push(
      `${counts.reservado} ${counts.reservado === 1 ? "reserva" : "reservas"}`,
    );
  }

  if (counts.finalizado) {
    parts.push(
      `${counts.finalizado} ${counts.finalizado === 1 ? "finalizado" : "finalizados"}`,
    );
  }

  cell.setAttribute("aria-label", parts.join(", "));
}

// Recalcula el resumen del mes a partir de las marcas visibles.
function updateCalendarSummary() {
  const sumBadges = (status) => [
    ...document.querySelectorAll(
      `.calendar__cell--active .cell__status-badge--${status}`,
    ),
  ];
  const total = (badges) =>
    badges.reduce(
      (sum, badge) => sum + (Number.parseInt(badge.textContent, 10) || 0),
      0,
    );
  const setSummary = (key, value) => {
    const element = document.querySelector(`[data-summary='${key}']`);
    if (element) element.textContent = String(value);
  };

  const reservados = sumBadges("reservado");

  setSummary("reservas", total(reservados));
  setSummary("finalizados", total(sumBadges("finalizado")));
  setSummary("dias", reservados.length);
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

  if (!cell) {
    return;
  }

  try {
    const appointments = await fetchAppointments(date);
    const counts = { reservado: 0, finalizado: 0 };

    appointments.forEach((appointment) => {
      const status = slugify(appointment.status);

      if (status in counts) {
        counts[status] += 1;
      }
    });

    renderCellBadges(cell, counts);
    updateCalendarSummary();
  } catch (error) {
    logError("Error al actualizar el calendario:", error);
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
      <div class="search-field">
        <input
          class="panel-search"
          type="text"
          id="appointmentSearch"
          aria-label="Buscar turnos"
          placeholder="Buscar por cliente…"
          value="${escapeHtml(appointmentSearchQuery)}"
          autocomplete="off"
        />
      </div>

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

  const statusButton = event.target.closest("[data-action='status']");

  if (statusButton) {
    openStatusDialog(statusButton.closest(".appointment-card").dataset.id);
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
    container.innerHTML = `<p class="panel-loading" role="status">Cargando turnos…</p>`;
  }

  container.setAttribute("aria-busy", "true");
  const searchInput = document.getElementById("appointmentSearch");
  setSearching(searchInput, true);

  try {
    const appointments = await fetchAppointments(
      date,
      appointmentSearchQuery.trim(),
      appointmentFilterStatus,
    );

    if (token !== loadToken) {
      return;
    }

    renderAppointmentsList(container, appointments);
  } catch (error) {
    if (token !== loadToken) {
      return;
    }

    logError("Error al cargar turnos:", error);

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
      setSearching(searchInput, false);
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

          <div class="appointment-card__status">
            <span class="status-badge status-badge--${sluggedStatus}">
              ${escapeHtml(appointment.status)}
            </span>

            <button
              type="button"
              class="btn btn--ghost btn--sm"
              data-action="status"
              aria-label="Cambiar el estado del turno de ${escapeHtml(displayClientName)}"
            >
              Cambiar estado
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

// ============================================================
// DETALLE DE TURNO
// ============================================================

// Con varios servicios, cada uno aparece con su precio.
function serviceDetailHtml(appointment) {
  const services = appointment.services ?? [];

  if (services.length < 2) {
    return escapeHtml(appointment.service_name || "No disponible");
  }

  return services
    .map(
      (service) =>
        `${escapeHtml(service.name)} · $${escapeHtml(service.price)}`,
    )
    .join("<br>");
}

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
              ${serviceDetailHtml(appointment)}
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

          <div class="detail-card">
            <span class="detail-label">Estado</span>
            <div class="appointment-card__status">
              <span class="status-badge status-badge--${slugify(appointment.status)}" data-detail-status>
                ${escapeHtml(appointment.status)}
              </span>
              <button
                type="button"
                class="btn btn--ghost btn--sm"
                data-action="status"
                data-id="${escapeHtml(appointment.id)}"
              >
                Cambiar estado
              </button>
            </div>
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
            <p class="history-placeholder" role="status">Cargando historial…</p>
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
          class="btn btn--danger"
          data-action="delete"
          data-id="${escapeHtml(appointment.id)}"
        >
          Eliminar turno
        </button>

        <button
          type="button"
          class="btn btn--ghost"
          data-action="edit"
          data-id="${escapeHtml(appointment.id)}"
        >
          Editar turno
        </button>

        ${
          appointment.status === "Finalizado" &&
          Number(appointment.has_record) !== 1
            ? `<button
          type="button"
          class="btn btn--primary"
          data-action="record"
          data-id="${escapeHtml(appointment.id)}"
        >
          Cargar ficha
        </button>`
            : ""
        }
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
  } = activeDetailModal;

  overlay.remove();
  detailPanel.remove();
  activeDetailModal = null;
  document.body.classList.remove("has-detail-modal");

  if (!restore) {
    return;
  }

  const row = panelBody?.querySelector(
    `.appointment-card[data-id="${CSS.escape(String(appointmentId))}"] .appointment-card__row`,
  );

  restoreFocus(opener?.isConnected ? opener : row);
}

// ============================================================
// EVENTOS DEL DETALLE
// ============================================================

function attachDetailModalEvents(detailPanel, detailOverlay) {
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

      case "status":
        openStatusDialog(actionButton.dataset.id);
        break;

      case "edit":
        openAppointmentForm(actionButton.dataset.id, false);
        break;

      case "record":
        openRecordForm(actionButton.dataset.id);
        break;

      case "delete":
        await deleteAppointment(actionButton);
        break;

      default:
        break;
    }
  });
}

async function setAppointmentStatus(id, status) {
  const appointment = appointmentMap.get(String(id));
  const previous = appointment?.status;
  const response = await updateAppointmentStatus(id, status);

  if (!response.success) {
    throw new ApiError(response.error || "No se pudo actualizar el estado.", {
      kind: "request",
    });
  }

  if (appointment) {
    appointment.status = status;
  }

  return previous;
}

// Cierra el detalle y abre el formulario del turno (edición o finalización).
function openAppointmentForm(id, finish) {
  const appointment = appointmentMap.get(String(id));

  if (!appointment) {
    return;
  }

  closeAppointmentDetailModal({ restore: false });
  document.dispatchEvent(
    new CustomEvent("appointment:edit", { detail: { appointment, finish } }),
  );
}

function openRecordForm(id) {
  const appointment = appointmentMap.get(String(id));

  if (!appointment) {
    return;
  }

  closeAppointmentDetailModal({ restore: false });
  document.dispatchEvent(
    new CustomEvent("quickentry:open", { detail: { appointment } }),
  );
}

async function refreshDay() {
  syncCalendarDay(appState.activeDay);
  await loadAppointments(appState.activeDay, { showLoading: false });
}

function announceStatus(id, previous, status) {
  if (!previous || previous === status) {
    return;
  }

  const appointment = appointmentMap.get(String(id));
  const name = appointment?.client_name || appointment?.alias || "Turno";

  showResult("success", "Estado actualizado", `${name}: ${status}`);
}

function syncDetailStatus(id, status) {
  if (String(activeDetailModal?.appointmentId) !== String(id)) {
    return;
  }

  const badge = activeDetailModal.panel.querySelector("[data-detail-status]");

  badge.className = `status-badge status-badge--${slugify(status)}`;
  badge.textContent = status;
  loadTimelineHistory(
    id,
    activeDetailModal.panel.querySelector(".history-items"),
  );
}

const statusDialog = document.getElementById("statusDialog");
let statusDialogAppointmentId = null;

function openStatusDialog(id) {
  const appointment = appointmentMap.get(String(id));

  if (!appointment || !statusDialog) {
    return;
  }

  statusDialogAppointmentId = String(id);

  document.getElementById("statusDialogName").textContent =
    appointment.client_name || appointment.alias || "Sin cliente asociado";
  document.getElementById("statusDialogMeta").textContent =
    `${formatTime(appointment.time_start)} · ${appointment.service_name || "Servicio no disponible"}`;

  statusDialog.querySelectorAll("[data-set-status]").forEach((option) => {
    const isCurrent = option.dataset.setStatus === appointment.status;

    option.classList.toggle("is-active", isCurrent);
    option.setAttribute("aria-pressed", String(isCurrent));
  });

  statusDialog.showModal();
}

async function changeStatusFromDialog(id, status) {
  const appointment = appointmentMap.get(String(id));

  if (!appointment || appointment.status === status) {
    return;
  }

  if (status === "Finalizado") {
    openAppointmentForm(id, true);
    return;
  }

  try {
    const previous = await setAppointmentStatus(id, status);

    syncDetailStatus(id, status);
    announceStatus(id, previous, status);
    await refreshDay();
  } catch (error) {
    logError("Error al cambiar el estado del turno:", error);
    showError(getErrorMessage(error, "No se pudo cambiar el estado."));
  }
}

statusDialog?.addEventListener("click", (event) => {
  if (
    event.target === statusDialog ||
    event.target.closest("#statusDialogClose")
  ) {
    statusDialog.close();
    return;
  }

  const option = event.target.closest("[data-set-status]");

  if (option) {
    statusDialog.close();
    changeStatusFromDialog(statusDialogAppointmentId, option.dataset.setStatus);
  }
});

async function deleteAppointment(button) {
  const id = button.dataset.id;
  const appointment = appointmentMap.get(String(id));
  const name = appointment?.client_name || appointment?.alias || "este cliente";

  const confirmed = await confirmAction({
    title: "Eliminar turno",
    message: `Vas a eliminar el turno de «${name}». Esta acción no se puede deshacer.`,
    confirmLabel: "Eliminar",
    danger: true,
  });

  if (!confirmed) {
    return;
  }

  setBusy(button, true);

  try {
    const response = await removeAppointment(id);

    if (!response.success) {
      throw new ApiError(response.error || "No se pudo eliminar el turno.", {
        kind: "request",
      });
    }

    closeAppointmentDetailModal({ restore: false });
    syncCalendarDay(appState.activeDay);
    await loadAppointments(appState.activeDay, { showLoading: false });

    const firstRow = panelBody?.querySelector(".appointment-card__row");
    restoreFocus(firstRow || panel);
    showResult("success", "Turno eliminado", "Ya no figura en la agenda.");
  } catch (error) {
    logError("Error al eliminar turno:", error);
    showError(getErrorMessage(error, "No se pudo eliminar el turno."));
  } finally {
    setBusy(button, false);
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
          <div class="shadow-text">
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
    logError("Error al cargar historial:", error);

    if (container.isConnected) {
      container.innerHTML = `<p class="history-error" role="alert">${escapeHtml(
        getErrorMessage(error, "No se pudo cargar el historial."),
      )}</p>`;
    }
  }
}
