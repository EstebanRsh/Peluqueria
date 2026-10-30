// ============================================================
// PANEL DEL DÍA
// Turnos del día en el panel lateral, detalle del turno, cambio de estado
// y marcas del calendario.
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
import {
  DEFAULT_APPOINTMENT_STATUS,
  FINISHED_STATUS,
  INACTIVE_STATUSES,
  STATUS_FILTERS,
} from "./constants.js";
import { $, restoreFocus, setActiveFilter } from "./dom.js";
import {
  displayStatus,
  formatDate,
  formatTime,
  slugify,
  todayIso,
  toMinutes,
} from "./utils.js";
import { setSearching } from "./feedback.js";
import { debounce, errorBlock, fillFields } from "./list.js";
import { appState } from "./state.js";

// ============================================================
// ELEMENTOS PRINCIPALES
// ============================================================

const panel = document.getElementById("dayPanel");
const panelOverlay = document.getElementById("dayPanelOverlay");
const panelDate = document.getElementById("panelDate");
const panelBody = document.getElementById("panelBody");

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

  resetPanelControls();

  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  panelOverlay?.classList.add("is-open");

  loadAppointments(date);
  startMomentTimer();

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
  stopMomentTimer();

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
// ============================================================

function resetPanelControls() {
  $("appointmentSearch").value = appointmentSearchQuery;
  $("appointmentFilters").replaceChildren(
    ...STATUS_FILTERS.map((filter) => {
      const button = $("appointmentFilterTemplate").content.firstElementChild.cloneNode(true);
      const isActive = appointmentFilterStatus === filter.value;

      button.classList.toggle("is-active", isActive);
      button.dataset.status = filter.value;
      button.setAttribute("aria-pressed", String(isActive));
      button.textContent = filter.label;

      return button;
    }),
  );
}

panelBody?.addEventListener("click", (event) => {
  const filterButton = event.target.closest(".btn-filter[data-status]");

  if (filterButton) {
    appointmentFilterStatus = filterButton.dataset.status;
    setActiveFilter(
      panelBody.querySelectorAll(".btn-filter[data-status]"),
      filterButton,
    );
    loadAppointments(appState.activeDay);
    return;
  }

  if (event.target.closest("[data-action='retry']")) {
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

  const container = document.getElementById("appointmentsListContainer");
  const token = ++loadToken;

  if (showLoading) {
    container.replaceChildren(
      $("appointmentLoadingTemplate").content.firstElementChild.cloneNode(true),
    );
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

    container.replaceChildren(
      errorBlock(error, "No se pudieron cargar los turnos."),
    );
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
    container.replaceChildren(
      $("appointmentEmptyTemplate").content.firstElementChild.cloneNode(true),
    );
    return;
  }

  container.replaceChildren(
    ...appointments.map((appointment) => {
      const card = $("appointmentCardTemplate").content.firstElementChild.cloneNode(true);
      const row = card.querySelector(".appointment-card__row");
      const moment = card.querySelector(".appointment-card__moment");
      const badge = card.querySelector(".status-badge");
      const shownStatus = displayStatus(appointment);
      const clientName =
        appointment.client_name || appointment.alias || "Sin cliente asociado";
      const time = formatTime(appointment.time_start);

      appointmentMap.set(String(appointment.id), appointment);

      card.dataset.id = appointment.id;
      row.setAttribute(
        "aria-label",
        `Ver detalle del turno de ${clientName} a las ${time}`,
      );
      row.setAttribute("aria-describedby", `moment-${appointment.id}`);
      moment.id = `moment-${appointment.id}`;
      card.querySelector(".appointment-card__time").textContent = time;
      card.querySelector(".appointment-card__name").textContent = clientName;
      card.querySelector(".appointment-card__service").textContent =
        appointment.service_name || "Servicio no disponible";
      badge.classList.add(`status-badge--${slugify(shownStatus)}`);
      badge.textContent = shownStatus;
      badge.setAttribute(
        "aria-label",
        `Cambiar el estado del turno de ${clientName}: ${shownStatus}`,
      );

      return card;
    }),
  );

  applyMoments();
}

// ============================================================
// TURNO EN CURSO Y SIGUIENTE
// ============================================================

const MOMENT_REFRESH_MS = 30000;
const MOMENT_LABELS = { now: "Ahora", next: "Siguiente" };
let momentTimer = null;

function nowMinutes() {
  const now = new Date();

  return now.getHours() * 60 + now.getMinutes();
}

function applyMoments() {
  const cards = [...panelBody.querySelectorAll(".appointment-card")];
  const minutes = nowMinutes();
  const pending =
    appState.activeDay === todayIso()
      ? cards
          .map((card) => ({
            card,
            appointment: appointmentMap.get(card.dataset.id),
          }))
          .filter(
            ({ appointment }) =>
              appointment && displayStatus(appointment) === DEFAULT_APPOINTMENT_STATUS,
          )
      : [];

  const current = pending.filter(({ appointment }) => {
    const start = toMinutes(appointment.time_start);
    const end = toMinutes(appointment.time_end);

    return start !== null && end !== null && start <= minutes && minutes < end;
  });

  const upcoming = current.length
    ? []
    : pending
        .filter(({ appointment }) => toMinutes(appointment.time_start) > minutes)
        .slice(0, 1);

  const moments = new Map([
    ...current.map(({ card }) => [card, "now"]),
    ...upcoming.map(({ card }) => [card, "next"]),
  ]);

  cards.forEach((card) => {
    const moment = moments.get(card);
    const tag = card.querySelector(".appointment-card__moment");

    if (moment) {
      card.dataset.moment = moment;
    } else {
      delete card.dataset.moment;
    }

    tag.textContent = moment ? MOMENT_LABELS[moment] : "";
    tag.hidden = !moment;
  });
}

function refreshMoments() {
  const minutes = nowMinutes();
  const expired =
    appState.activeDay === todayIso() &&
    [...appointmentMap.values()].some(
      (appointment) =>
        displayStatus(appointment) === DEFAULT_APPOINTMENT_STATUS &&
        toMinutes(appointment.time_end) <= minutes,
    );

  if (expired) {
    loadAppointments(appState.activeDay, { showLoading: false });
  } else {
    applyMoments();
  }
}

function startMomentTimer() {
  stopMomentTimer();
  momentTimer = setInterval(refreshMoments, MOMENT_REFRESH_MS);
}

function stopMomentTimer() {
  clearInterval(momentTimer);
  momentTimer = null;
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

  const fragment = $("appointmentDetailTemplate").content.cloneNode(true);
  const detailOverlay = fragment.querySelector(".side-drawer-overlay");
  const detailPanel = fragment.querySelector("aside");
  const status = displayStatus(appointment);
  const services = appointment.services ?? [];
  const badge = detailPanel.querySelector("[data-detail-status]");

  fillFields(detailPanel, {
    time: `${formatTime(appointment.time_start)} hs`,
    client: displayClientName,
    date: formatDate(appState.activeDay),
    service:
      services.length < 2
        ? appointment.service_name || "No disponible"
        : services
            .map((service) => `${service.name} · $${service.price}`)
            .join("\n"),
    stylist: appointment.stylist || "Sin asignar",
    duration: appointment.service_duration
      ? `${appointment.service_duration} min`
      : "No disponible",
    price: `$${appointment.price || "0"}`,
    schedule: `${formatTime(appointment.time_start)} - ${formatTime(appointment.time_end)}`,
    notes: appointment.notes || "Sin observaciones",
  });
  detailPanel
    .querySelector("[data-notes]")
    .classList.toggle("detail-card--inline", !appointment.notes);
  badge.classList.add(`status-badge--${slugify(status)}`);
  badge.textContent = status;
  badge.setAttribute("aria-label", `Cambiar el estado del turno: ${status}`);
  detailPanel.querySelectorAll("[data-id]").forEach((button) => {
    button.dataset.id = appointment.id;
  });

  if (
    appointment.status !== FINISHED_STATUS ||
    Number(appointment.has_record) === 1
  ) {
    detailPanel.querySelector('[data-action="record"]').remove();
  }

  document.body.append(detailOverlay, detailPanel);
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

async function setAppointmentStatus(id, status, reason = "") {
  const appointment = appointmentMap.get(String(id));
  const previous = appointment?.status;
  const response = await updateAppointmentStatus(id, status, reason);

  if (!response.success) {
    throw new ApiError(response.error || "No se pudo actualizar el estado.", {
      kind: "request",
    });
  }

  if (appointment) {
    appointment.status = status;
    appointment.display_status = status;
  }

  return previous;
}

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

  badge.className = `status-badge status-badge--${slugify(status)} status-badge--action`;
  badge.textContent = status;
  badge.setAttribute("aria-label", `Cambiar el estado del turno: ${status}`);
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
    const isCurrent = option.dataset.setStatus === displayStatus(appointment);

    option.classList.toggle("is-active", isCurrent);
    option.setAttribute("aria-pressed", String(isCurrent));
  });

  showStatusOptions();
  statusDialog.showModal();
}

async function changeStatusFromDialog(id, status, reason = "") {
  const appointment = appointmentMap.get(String(id));

  if (!appointment || appointment.status === status) {
    return;
  }

  if (status === FINISHED_STATUS) {
    openAppointmentForm(id, true);
    return;
  }

  try {
    const previous = await setAppointmentStatus(id, status, reason);

    syncDetailStatus(id, status);
    announceStatus(id, previous, status);
    await refreshDay();
  } catch (error) {
    logError("Error al cambiar el estado del turno:", error);
    showError(getErrorMessage(error, "No se pudo cambiar el estado."));
  }
}

const statusOptions = statusDialog?.querySelector(".status-options");
const reasonForm = document.getElementById("statusReasonForm");
const reasonField = document.getElementById("statusReason");
const REASON_LABELS = {
  Cancelado: "Motivo de la cancelación (opcional)",
  Ausente: "Motivo de la ausencia (opcional)",
};
let reasonStatus = null;

function showStatusOptions() {
  reasonStatus = null;
  reasonForm.hidden = true;
  statusOptions.hidden = false;
}

function showReasonStep(status) {
  reasonStatus = status;
  document.getElementById("statusReasonLabel").textContent =
    REASON_LABELS[status];
  reasonField.value = "";
  statusOptions.hidden = true;
  reasonForm.hidden = false;
  reasonField.focus();
}

const hasUnsavedReason = () =>
  !reasonForm.hidden && reasonField.value.trim() !== "";

statusDialog?.addEventListener("click", (event) => {
  if (
    (event.target === statusDialog && !hasUnsavedReason()) ||
    event.target.closest("#statusDialogClose")
  ) {
    statusDialog.close();
    return;
  }

  if (event.target.closest("#statusReasonBack")) {
    const status = reasonStatus;

    showStatusOptions();
    statusOptions.querySelector(`[data-set-status="${status}"]`)?.focus();
    return;
  }

  const option = event.target.closest("[data-set-status]");

  if (!option) {
    return;
  }

  const status = option.dataset.setStatus;
  const appointment = appointmentMap.get(statusDialogAppointmentId);

  if (INACTIVE_STATUSES.includes(status) && appointment?.status !== status) {
    showReasonStep(status);
    return;
  }

  statusDialog.close();
  changeStatusFromDialog(statusDialogAppointmentId, status);
});

statusDialog?.addEventListener("cancel", (event) => {
  if (hasUnsavedReason()) {
    event.preventDefault();
  }
});

reasonForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const status = reasonStatus;
  const reason = reasonField.value.trim();

  statusDialog.close();
  changeStatusFromDialog(statusDialogAppointmentId, status, reason);
});

const UNDO_MS = 5000;

async function deleteAppointment(button) {
  const id = button.dataset.id;
  const appointment = appointmentMap.get(String(id));
  const name = appointment?.client_name || appointment?.alias || "este cliente";

  const confirmed = await confirmAction({
    title: "Eliminar turno",
    message: `Vas a eliminar el turno de «${name}».`,
    confirmLabel: "Eliminar",
    danger: true,
  });

  if (!confirmed) {
    return;
  }

  closeAppointmentDetailModal({ restore: false });

  const card = panelBody?.querySelector(
    `.appointment-card[data-id="${CSS.escape(String(id))}"]`,
  );

  if (card) {
    card.hidden = true;
  }

  const undone = await showResult(
    "success",
    "Turno eliminado",
    "Si fue un error, tocá Deshacer.",
    { actionLabel: "Deshacer", duration: UNDO_MS },
  );

  if (undone) {
    if (card) {
      card.hidden = false;
    }

    restoreFocus(card?.querySelector(".appointment-card__row") || panel);
    return;
  }

  try {
    const response = await removeAppointment(id);

    if (!response.success) {
      throw new ApiError(response.error || "No se pudo eliminar el turno.", {
        kind: "request",
      });
    }

    syncCalendarDay(appState.activeDay);
  } catch (error) {
    logError("Error al eliminar turno:", error);
    showError(getErrorMessage(error, "No se pudo eliminar el turno."));
  }

  await loadAppointments(appState.activeDay, { showLoading: false });
  restoreFocus(panelBody?.querySelector(".appointment-card__row") || panel);
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
      container.replaceChildren(
        $("statusHistoryEmptyTemplate").content.firstElementChild.cloneNode(true),
      );
      return;
    }

    container.replaceChildren(
      ...history.map((historyItem) => {
        const entry = $("statusHistoryEntryTemplate").content.firstElementChild.cloneNode(true);
        const reason = entry.querySelector('[data-field="reason"]');

        entry.querySelector('[data-field="time"]').textContent =
          `${String(historyItem.changed_at ?? "").slice(11, 16)} hs:`;
        entry.querySelector('[data-field="from"]').textContent =
          historyItem.status_from || "Turno creado";
        entry.querySelector('[data-field="to"]').textContent =
          historyItem.status_to;

        if (historyItem.reason) {
          reason.textContent = `Motivo: ${historyItem.reason}`;
        } else {
          reason.remove();
        }

        return entry;
      }),
    );
  } catch (error) {
    logError("Error al cargar historial:", error);

    if (container.isConnected) {
      const message = $("statusHistoryErrorTemplate").content.firstElementChild.cloneNode(true);

      message.textContent = getErrorMessage(
        error,
        "No se pudo cargar el historial.",
      );
      container.replaceChildren(message);
    }
  }
}
