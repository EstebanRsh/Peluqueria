// ============================================================
// MODAL DE CREACIÓN DE TURNOS
// ============================================================

import {
  createAppointment,
  fetchAppointments,
  updateAppointment,
  getErrorMessage,
  searchServices,
  logError,
} from "./api.js";
import { DEFAULT_APPOINTMENT_STATUS, INACTIVE_STATUSES } from "./constants.js";
import { $, escapeHtml, restoreFocus } from "./dom.js";
import {
  formatDate,
  missingAppointmentNotice,
  pad,
  todayIso,
} from "./utils.js";
import { appState } from "./state.js";
import { loadAppointments, syncCalendarDay } from "./ui.js";
import {
  createAutocomplete,
  createClientAutocomplete,
} from "./autocomplete.js";
import { clearInvalidOnInput, createFeedback, setBusy } from "./feedback.js";
import { confirmAction, showResult } from "./confirm.js";

// ============================================================
// ELEMENTOS DEL MODAL
// ============================================================

const modalOverlay = $("modalOverlay");
const modalPanel = $("appointmentFormPanel");
const modalForm = $("appointmentForm");
const modalClose = $("modalClose");
const modalCancel = $("modalCancel");
const modalSave = $("modalSave");
const feedback = createFeedback(modalPanel);

const LAST_STYLIST_KEY = "hairapp:lastStylist";

// ============================================================
// ESTADO DEL MODAL
// ============================================================

let selectedServices = [];
let servicesLocked = false;
let serviceAutocomplete = null;

let priceIsAutomatic = true;

let endTimeIsAutomatic = true;

let lastCalculatedEndTime = "";

let startIsSuggested = false;

let initialStylist = "";

let dayAppointments = [];
let dayContextToken = 0;

let isSaving = false;

let modalOpener = null;

let editingAppointment = null;

let returningFromRecord = false;

let editSnapshot = "";

let clientAutocomplete = null;

// ============================================================
// UTILIDADES
// ============================================================

// "HH:MM" o "HH:MM:SS" -> minutos desde medianoche (null si no es válido)
function toMinutes(time) {
  const [hours, minutes] = String(time ?? "")
    .split(":")
    .map(Number);

  return Number.isFinite(hours) && Number.isFinite(minutes)
    ? hours * 60 + minutes
    : null;
}

function toTimeString(totalMinutes) {
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function readLastStylist() {
  try {
    return localStorage.getItem(LAST_STYLIST_KEY) || "";
  } catch {
    return "";
  }
}

function saveLastStylist(name) {
  if (!name) {
    return;
  }

  try {
    localStorage.setItem(LAST_STYLIST_KEY, name);
  } catch {}
}

// ============================================================
// INICIALIZACIÓN DEL MODAL
// ============================================================

// Configura los eventos necesarios para abrir,
// cerrar y guardar el formulario de turnos.
export function initModal() {
  const addButton = $("btnAddAppointment");

  if (!addButton || !modalOverlay || !modalPanel || !modalForm || !modalSave) {
    console.error("El modal de turnos no está completo en la página.");
    return;
  }

  // ----------------------------------------------------------
  // ABRIR MODAL
  // ----------------------------------------------------------
  addButton.addEventListener("click", () => openModal());

  document.addEventListener("appointment:new", (event) => {
    openModal(event.detail?.client ?? null);
  });

  document.addEventListener("appointment:edit", (event) => {
    openEditModal(
      event.detail.appointment,
      event.detail.finish,
      event.detail.previousDate,
      event.detail.returning,
    );
  });

  // ----------------------------------------------------------
  // CERRAR MODAL
  // ----------------------------------------------------------
  [modalClose, modalCancel].forEach((element) => {
    element?.addEventListener("click", cancelModal);
  });

  const requestCloseModal = () => {
    if (isFormDirty()) {
      feedback.show(
        "warning",
        "Hay datos sin guardar. Usá Cancelar o × para descartarlos.",
      );
      return;
    }

    if (!editingAppointment) {
      closeModal();
    }
  };

  modalOverlay.addEventListener("click", requestCloseModal);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (
      modalPanel.classList.contains("is-open") &&
      !$("serviceFormPanel").classList.contains("is-open")
    ) {
      requestCloseModal();
    }
  });

  clearInvalidOnInput(modalPanel);

  // ----------------------------------------------------------
  // CLIENTE
  // ----------------------------------------------------------
  clientAutocomplete = createClientAutocomplete({
    input: $("clientSearch"),
    list: $("appointmentClientSuggestions"),
    onSelect: selectClient,
    onAlias: useAlias,
  });

  $("clientSelected")?.addEventListener("click", () =>
    changeSelected($("clientSelected"), $("clientSearch"), $("clientHelp")),
  );
  keepSelected(
    $("clientSelected"),
    $("clientSearch"),
    $("clientHelp"),
    () => $("clientId").value || $("clientName").value,
    () => clientAutocomplete?.reset(),
  );

  $("appointmentStatus")?.addEventListener("change", () => {
    if (editingAppointment) {
      modalSave.textContent =
        $("appointmentStatus").value === "Finalizado" &&
        editingAppointment.status !== "Finalizado"
          ? "Continuar"
          : "Guardar cambios";
    }
  });

  // ----------------------------------------------------------
  // SERVICIO
  // ----------------------------------------------------------
  serviceAutocomplete = createAutocomplete({
    input: $("serviceSearch"),
    list: $("serviceSuggestions"),
    emptyMessage: "No hay servicios que empiecen con ese texto.",
    search: (query, signal) => searchServices(query, signal),
    getTitle: (service) => service.name,
    getSubtitle: serviceMeta,
    onSelect: addService,
    customOption: {
      label: (query) => `Crear servicio «${query}»`,
      onSelect: (name) =>
        document.dispatchEvent(
          new CustomEvent("service:new", { detail: { name } }),
        ),
    },
  });

  document.addEventListener("service:saved", (event) => {
    if (modalPanel.classList.contains("is-open")) {
      addService(event.detail.service);
    }
  });

  $("serviceList").addEventListener("click", handleServiceListClick);
  $("serviceList").addEventListener("change", handleServiceDurationChange);

  $("price")?.addEventListener("input", () => {
    syncPriceMode();
    updatePriceHint();
  });

  // ----------------------------------------------------------
  // FECHA, HORARIO Y PROFESIONAL
  // ----------------------------------------------------------
  $("appointmentDate")?.addEventListener("change", handleDateChange);

  $("timeStart")?.addEventListener("change", handleStartTimeChange);
  $("timeStart")?.addEventListener("input", () => {
    startIsSuggested = false;
    updateScheduleHint();
    updateScheduleWarning();
  });

  $("timeEnd")?.addEventListener("change", handleEndTimeManualChange);
  $("timeEnd")?.addEventListener("input", updateScheduleWarning);

  $("stylist")?.addEventListener("input", updateScheduleWarning);

  // ----------------------------------------------------------
  // GUARDAR (botón o tecla Enter)
  // ----------------------------------------------------------
  modalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitModalData();
  });
}

// ============================================================
// APERTURA DEL MODAL
// ============================================================

function openModal(client = null) {
  modalOpener = document.activeElement;

  clearModal();

  const date = appState.activeDay || todayIso();
  $("appointmentDate").value = date;

  initialStylist = readLastStylist();
  $("stylist").value = initialStylist;
  populateStylistOptions();

  loadDayContext(date);

  if (client) {
    selectClient(client);
  }

  showPanel((client ? $("serviceSearch") : $("clientSearch")) || modalPanel);
}

// Cancelar un turno que se estaba finalizando aborta todo el flujo,
// incluida la ficha que quedó esperando.
async function cancelModal() {
  const aborting = returningFromRecord;

  if (
    (aborting || isFormDirty()) &&
    !(await confirmAction({
      title: aborting ? "Cancelar la finalización" : "Descartar cambios",
      message: aborting
        ? "El turno no se finaliza y se descartan los cambios y la ficha."
        : "Hay datos sin guardar. Si salís ahora, se pierden.",
      confirmLabel: "Descartar",
      cancelLabel: aborting ? "Seguir" : "Seguir editando",
      danger: true,
    }))
  ) {
    return;
  }

  if (aborting) {
    document.dispatchEvent(new CustomEvent("quickentry:abort"));
  }

  closeModal();
}

function showPanel(firstField, fromLeft = false) {
  if (fromLeft) {
    modalPanel.classList.add("is-from-left");
    void modalPanel.offsetWidth;
    modalPanel.classList.remove("is-from-left");
  }

  modalOverlay.classList.add("is-open");
  modalPanel.classList.add("is-open");
  modalPanel.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => firstField.focus({ preventScroll: true }));
}

function formSnapshot() {
  return [
    "clientId",
    "clientName",
    "appointmentDate",
    "price",
    "timeStart",
    "timeEnd",
    "stylist",
    "notes",
    "appointmentStatus",
  ]
    .map((id) => $(id).value)
    .concat(
      selectedServices
        .map((service) => `${service.id}:${service.duration}`)
        .join(","),
    )
    .join("\u0001");
}

// Abre el formulario con los datos de un turno existente. Con finish, pide
// confirmar los datos antes de dejarlo Finalizado.
function openEditModal(
  appointment,
  finish = false,
  previousDate = null,
  returning = false,
) {
  modalOpener = document.activeElement;

  clearModal();

  const hasRecord = Number(appointment.has_record) === 1;

  editingAppointment = {
    id: appointment.id,
    status: appointment.status,
    date: previousDate ?? appointment.date,
  };

  $("appointmentFormTitle").textContent = finish
    ? "Finalizar turno"
    : "Editar turno";
  $("appointmentStatusLabel").textContent = "Estado";
  modalSave.textContent = finish ? "Continuar" : "Guardar cambios";

  if (appointment.client_id) {
    selectClient({
      id: appointment.client_id,
      alias: appointment.client_name,
      internal_code: appointment.client_internal_code,
    });
  } else {
    useAlias(appointment.client_name || "");
  }

  selectedServices = appointment.services.map((service) => ({ ...service }));
  renderServices();

  $("appointmentDate").value = appointment.date;
  $("price").value = appointment.price ?? "";
  $("timeStart").value = String(appointment.time_start).slice(0, 5);
  $("timeEnd").value = String(appointment.time_end).slice(0, 5);
  $("stylist").value = appointment.stylist ?? "";
  $("notes").value = appointment.notes ?? "";
  $("appointmentStatus").value = finish ? "Finalizado" : appointment.status;

  syncPriceMode();
  updatePriceHint();

  const duration = totalDuration();

  endTimeIsAutomatic =
    duration > 0 &&
    toMinutes($("timeStart").value) + duration === toMinutes($("timeEnd").value);
  lastCalculatedEndTime = endTimeIsAutomatic ? $("timeEnd").value : "";

  if (finish) {
    $("appointmentStatus").closest(".form-group").hidden = true;
  }

  if (hasRecord) {
    $("clientSelected").disabled = true;
    $("clientSelected").title =
      "No se puede cambiar: la ficha de este turno ya está guardada.";
    servicesLocked = true;
    renderServices();
  }

  returningFromRecord = returning;

  populateStylistOptions();
  loadDayContext(appointment.date);
  updateScheduleHint();

  editSnapshot = formSnapshot();

  showPanel($("price"), returning);
}

// ============================================================
// CLIENTE
// ============================================================

function showClientChip(title, meta) {
  $("clientChipTitle").textContent = title;
  $("clientChipMeta").textContent = meta;
  $("clientSelected").hidden = false;
  $("clientSearch").hidden = true;
  $("clientSearch").value = "";
  $("clientHelp").hidden = true;
}

// Cliente registrado elegido de la búsqueda.
function selectClient(client) {
  $("clientId").value = String(client.id);
  $("clientName").value = "";

  showClientChip(
    client.alias ?? client.name ?? "Cliente",
    client.internal_code
      ? `Código ${client.internal_code}`
      : "Cliente registrado",
  );

  $("clientSearch").removeAttribute("aria-invalid");
  $("serviceSearch")?.focus();
}

// Texto escrito usado como alias de referencia (sin cliente registrado).
function useAlias(text) {
  $("clientId").value = "";
  $("clientName").value = text;

  showClientChip(text, "Alias de referencia · sin cliente registrado");

  $("clientSearch").removeAttribute("aria-invalid");
  $("serviceSearch")?.focus();
}

// Muestra el buscador para elegir otro valor sin borrar el actual.
function changeSelected(field, search, help = null) {
  field.hidden = true;
  search.hidden = false;

  if (help) {
    help.hidden = false;
  }

  search.focus();
}

// Si se sale del buscador sin elegir nada, vuelve a mostrarse el valor actual.
function keepSelected(field, search, help, hasValue, reset) {
  search.addEventListener("blur", () => {
    setTimeout(() => {
      if (search.hidden || search.value.trim() !== "" || !hasValue()) {
        return;
      }

      field.hidden = false;
      search.hidden = true;
      reset();

      if (help) {
        help.hidden = true;
      }
    }, 200);
  });
}

// ============================================================
// SERVICIOS
// ============================================================

function serviceMeta(service) {
  return `$${service.price} · ${service.duration} min`;
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function servicesTotal(key) {
  return selectedServices.reduce(
    (sum, service) => sum + (Number(service[key]) || 0),
    0,
  );
}

function totalDuration() {
  return servicesTotal("duration");
}

// Dibuja los servicios elegidos debajo del buscador. La duración es la de este
// turno: cambiarla no modifica el servicio guardado.
function renderServices() {
  $("serviceList").innerHTML = selectedServices
    .map(
      (service, index) => `
        <li class="service-row">
          <span class="service-row__name">${escapeHtml(service.name)}</span>
          <span class="service-row__meta">
            <span>$${escapeHtml(service.price)}</span>
            <label class="service-row__time">
              <svg class="service-row__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              <input type="number" min="1" max="1440" step="1" inputmode="numeric" class="cart-quantity"
                value="${escapeHtml(service.duration)}" data-index="${index}"
                aria-label="Duración de ${escapeHtml(service.name)} en minutos para este turno">
              min
            </label>
          </span>
          <button type="button" class="btn btn--ghost btn--sm cart-remove" data-index="${index}"
            aria-label="Quitar ${escapeHtml(service.name)}"${servicesLocked ? " disabled" : ""}>
            <svg class="service-row__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </li>`,
    )
    .join("");

  $("serviceSearch").closest(".search-field").hidden = servicesLocked;
}

function handleServiceListClick(event) {
  const button = event.target.closest(".cart-remove");

  if (!button) {
    return;
  }

  selectedServices.splice(Number(button.dataset.index), 1);
  renderServices();
  servicesChanged();
  $("serviceSearch").focus();
}

function handleServiceDurationChange(event) {
  const input = event.target.closest(".cart-quantity");

  if (!input) {
    return;
  }

  const service = selectedServices[Number(input.dataset.index)];
  const minutes = Number(input.value);

  if (Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440) {
    service.duration = minutes;
    servicesChanged();
  } else {
    input.value = service.duration;
  }
}

// Cada servicio puede estar una sola vez en el turno.
function addService(service) {
  const search = $("serviceSearch");

  search.value = "";
  search.removeAttribute("aria-invalid");

  const existing = selectedServices.findIndex(
    (item) => String(item.id) === String(service.id),
  );

  if (existing >= 0) {
    feedback.show("warning", `«${service.name}» ya está en el turno.`);
    return;
  }

  selectedServices.push(service);
  renderServices();
  servicesChanged();
}

// El precio es la suma de los servicios mientras no se edite a mano.
// La hora de fin se recalcula con la duración total.
function servicesChanged() {
  if (priceIsAutomatic) {
    $("price").value =
      selectedServices.length > 0 ? roundMoney(servicesTotal("price")) : "";
  }

  const duration = totalDuration();

  if (duration > 0) {
    calculateEndTime(duration);
  }

  updatePriceHint();
  updateScheduleHint();
  updateScheduleWarning();
}

function syncPriceMode() {
  const value = $("price").value;

  priceIsAutomatic =
    value === "" || Number(value) === roundMoney(servicesTotal("price"));
}

function updatePriceHint() {
  const hint = $("priceHint");

  hint.textContent = priceIsAutomatic
    ? "Es la suma de los servicios. Podés cambiarlo."
    : `La suma de los servicios es $${roundMoney(servicesTotal("price"))}. Cambiaste el precio a mano.`;
  hint.hidden =
    selectedServices.length === 0 ||
    (priceIsAutomatic && selectedServices.length < 2);
}

function resetServices() {
  selectedServices = [];
  servicesLocked = false;
  priceIsAutomatic = true;
  $("serviceSearch").value = "";
  serviceAutocomplete?.reset();
  renderServices();
  updatePriceHint();
}

// ============================================================
// FECHA
// ============================================================

// Al cambiar la fecha se vuelven a consultar los turnos de ese día.
function handleDateChange() {
  const date = $("appointmentDate").value;

  if (!date) {
    return;
  }

  loadDayContext(date);
}

// Carga los turnos del día elegido para sugerir horario y detectar solapamientos.
async function loadDayContext(date) {
  const token = ++dayContextToken;

  try {
    const appointments = await fetchAppointments(date);

    if (token !== dayContextToken) {
      return;
    }

    dayAppointments = Array.isArray(appointments) ? appointments : [];
  } catch (error) {
    if (token !== dayContextToken) {
      return;
    }

    logError("Error al cargar los turnos del día:", error);
    dayAppointments = [];
  }

  populateStylistOptions();
  suggestStartTime();
  updateScheduleHint();
  updateScheduleWarning();
}

// Profesionales sugeridos: el último usado y los que ya tienen turnos ese día.
function populateStylistOptions() {
  const datalist = $("stylistOptions");

  if (!datalist) {
    return;
  }

  const names = new Map();

  const add = (name) => {
    const clean = String(name ?? "").trim();

    if (clean && !names.has(clean.toLowerCase())) {
      names.set(clean.toLowerCase(), clean);
    }
  };

  add(readLastStylist());
  dayAppointments.forEach((appointment) => add(appointment.stylist));

  datalist.replaceChildren(
    ...[...names.values()].map((name) => {
      const option = document.createElement("option");
      option.value = name;
      return option;
    }),
  );
}

// Sugiere como hora de inicio el final del último turno activo del día.
function suggestStartTime() {
  const timeStart = $("timeStart");

  if (timeStart.value && !startIsSuggested) {
    return;
  }

  const lastEnd = dayAppointments
    .filter((appointment) => !INACTIVE_STATUSES.includes(appointment.status))
    .map((appointment) => toMinutes(appointment.time_end))
    .filter((minutes) => minutes !== null)
    .reduce((latest, minutes) => Math.max(latest, minutes), -1);

  if (lastEnd >= 0 && lastEnd < 24 * 60) {
    timeStart.value = toTimeString(lastEnd);
    startIsSuggested = true;

    const duration = totalDuration();

    if (duration > 0 && endTimeIsAutomatic) {
      calculateEndTime(duration);
    }
  } else if (startIsSuggested) {
    timeStart.value = "";
    startIsSuggested = false;
  }
}

// ============================================================
// AYUDAS DEL HORARIO
// ============================================================

// Texto de ayuda bajo los horarios (duración del servicio y hora sugerida).
function updateScheduleHint() {
  const hint = $("scheduleHint");
  const parts = [];

  if (startIsSuggested) {
    parts.push("Hora sugerida: a continuación del último turno del día.");
  }

  const duration = totalDuration();

  if (duration > 0) {
    parts.push(
      `Duración del servicio: ${duration} min.` +
        (endTimeIsAutomatic ? " La hora de fin se calcula sola." : ""),
    );
  }

  hint.textContent = parts.join(" ");
  hint.hidden = parts.length === 0;
}

// Avisa (sin bloquear) si el horario se superpone con otro turno del mismo profesional.
function updateScheduleWarning() {
  const box = $("scheduleWarning");
  const start = toMinutes($("timeStart").value);
  const end = toMinutes($("timeEnd").value);
  const stylist = normalizeName($("stylist").value);

  if (start === null || end === null || end <= start) {
    box.hidden = true;
    return;
  }

  const overlaps = dayAppointments.filter((appointment) => {
    const otherStart = toMinutes(appointment.time_start);
    const otherEnd = toMinutes(appointment.time_end);

    return (
      String(appointment.id) !== String(editingAppointment?.id) &&
      otherStart !== null &&
      otherEnd !== null &&
      !INACTIVE_STATUSES.includes(appointment.status) &&
      otherStart < end &&
      otherEnd > start
    );
  });

  if (overlaps.length === 0) {
    box.hidden = true;
    return;
  }

  const sameStylist = overlaps.find(
    (appointment) => normalizeName(appointment.stylist) === stylist,
  );
  const conflict = sameStylist ?? overlaps[0];
  const who = conflict.client_name || "otro cliente";
  const when = `${toTimeString(toMinutes(conflict.time_start))} a ${toTimeString(toMinutes(conflict.time_end))}`;

  box.textContent = sameStylist
    ? `Se superpone con el turno de ${who} (${when}), del mismo profesional. Podés guardarlo igual.`
    : `Ya hay otro turno en ese horario: el de ${who} (${when}). Podés guardarlo igual.`;
  box.hidden = false;
}

// ============================================================
// CAMBIO DE HORA DE INICIO
// ============================================================

// Si la hora de fin continúa siendo automática,
// recalcula la hora de fin según el servicio seleccionado.
function handleStartTimeChange() {
  startIsSuggested = false;

  if (endTimeIsAutomatic) {
    const duration = totalDuration();

    if (duration > 0) {
      calculateEndTime(duration);
    }
  }

  updateScheduleHint();
  updateScheduleWarning();
}

// ============================================================
// MODIFICACIÓN MANUAL DE HORA DE FIN
// ============================================================

// Cuando la peluquera modifica la hora de fin,
// dejamos de recalcularla automáticamente.
function handleEndTimeManualChange() {
  const timeEnd = $("timeEnd");

  if (!timeEnd.value) {
    return;
  }

  if (timeEnd.value !== lastCalculatedEndTime) {
    endTimeIsAutomatic = false;
  }

  updateScheduleHint();
  updateScheduleWarning();
}

// ============================================================
// CÁLCULO DE HORA DE FIN
// ============================================================

// Suma la duración del servicio a la hora de inicio.
function calculateEndTime(durationMinutes) {
  const timeStart = $("timeStart");
  const timeEnd = $("timeEnd");

  if (!timeStart.value) {
    return;
  }

  const totalMinutes = toMinutes(timeStart.value) + durationMinutes;

  if (totalMinutes >= 24 * 60) {
    timeEnd.value = "";
    lastCalculatedEndTime = "";

    feedback.invalidate(["timeEnd"]);
    return;
  }

  const calculatedTime = toTimeString(totalMinutes);

  timeEnd.value = calculatedTime;
  lastCalculatedEndTime = calculatedTime;
  endTimeIsAutomatic = true;

  timeEnd.removeAttribute("aria-invalid");
}

// ============================================================
// CIERRE DEL MODAL
// ============================================================

// Cierra el modal y limpia todos sus campos.
function closeModal() {
  modalOverlay.classList.remove("is-open");
  modalPanel.classList.remove("is-open");
  modalPanel.setAttribute("aria-hidden", "true");
  clearModal();

  restoreFocus(modalOpener);
  modalOpener = null;

  document.dispatchEvent(new CustomEvent("appointment:closed"));
}

// ============================================================
// LIMPIAR FORMULARIO
// ============================================================

// Indica si el usuario ya escribió o eligió algo en el formulario.
function isFormDirty() {
  if (editingAppointment) {
    return formSnapshot() !== editSnapshot;
  }

  const hasValue = (id) => String($(id)?.value ?? "").trim() !== "";

  return (
    hasValue("clientId") ||
    hasValue("clientName") ||
    hasValue("clientSearch") ||
    selectedServices.length > 0 ||
    hasValue("serviceSearch") ||
    hasValue("notes") ||
    (!startIsSuggested && hasValue("timeStart")) ||
    $("stylist").value.trim() !== initialStylist
  );
}

// Restablece todos los campos y el estado interno del modal.
function clearModal() {
  [
    "clientId",
    "clientName",
    "clientSearch",
    "timeStart",
    "timeEnd",
    "price",
    "stylist",
    "notes",
    "appointmentDate",
  ].forEach((id) => {
    const element = $(id);

    if (element) {
      element.value = "";
    }
  });

  resetServices();

  const statusSelect = $("appointmentStatus");
  if (statusSelect) {
    statusSelect.value = DEFAULT_APPOINTMENT_STATUS;
  }

  $("clientSelected").hidden = true;
  $("clientSearch").hidden = false;
  $("clientHelp").hidden = false;
  clientAutocomplete?.reset();

  editingAppointment = null;
  editSnapshot = "";
  $("appointmentFormTitle").textContent = "Nuevo turno";
  $("appointmentStatusLabel").textContent = "Estado inicial";
  modalSave.textContent = "Guardar turno";
  returningFromRecord = false;
  $("appointmentStatus").closest(".form-group").hidden = false;
  $("clientSelected").disabled = false;
  $("clientSelected").removeAttribute("title");

  $("scheduleHint").hidden = true;
  $("scheduleWarning").hidden = true;

  feedback.clearInvalid();

  endTimeIsAutomatic = true;
  lastCalculatedEndTime = "";
  startIsSuggested = false;
  dayAppointments = [];
  dayContextToken += 1;
}

// Tras editar: avisa y actualiza la agenda.
async function afterEdit(editing, data) {
  showResult(
    "success",
    "Turno actualizado",
    "Los cambios ya están guardados." + missingAppointmentNotice(data),
  );

  try {
    if (appState.activeDay) {
      await loadAppointments(appState.activeDay);
    }

    syncCalendarDay(data.date);

    if (editing.date !== data.date) {
      syncCalendarDay(editing.date);
    }
  } catch (error) {
    logError("Error al actualizar la agenda:", error);
  }
}

// Finalizar: todavía no guarda nada. Pasa a la ficha, que guarda el turno junto
// con ella o sin ella.
function continueToRecord(editing, data) {
  const meta = $("clientChipMeta").textContent;
  const appointment = {
    id: editing.id,
    client_id: data.client_id,
    client_name: $("clientChipTitle").textContent,
    client_internal_code: meta.startsWith("Código ")
      ? meta.slice("Código ".length)
      : null,
    service_id: data.service_ids[0],
    service_name: selectedServices.map((service) => service.name).join(" + "),
    service_duration: totalDuration(),
    services: selectedServices,
    status: editing.status,
    has_record: 0,
  };

  saveLastStylist(data.stylist);

  modalOverlay.classList.remove("is-open");
  modalPanel.classList.add("is-to-left");
  modalPanel.classList.remove("is-open");
  modalPanel.setAttribute("aria-hidden", "true");
  setTimeout(() => modalPanel.classList.remove("is-to-left"), 400);

  document.dispatchEvent(
    new CustomEvent("quickentry:open", {
      detail: {
        appointment,
        finishing: {
          data: { ...data, id: editing.id },
          previousDate: editing.date,
        },
      },
    }),
  );
}

// ============================================================
// VALIDACIÓN DE EXPERIENCIA DE USUARIO
// ============================================================

// Estas validaciones solamente evitan enviar formularios
// evidentemente incompletos. El backend realiza las definitivas.
function validateAppointment(data, rawPrice) {
  const errors = [];

  if (!data.client_id && !data.client_name) {
    errors.push({
      message: "Elegí un cliente o escribí un alias de referencia.",
      fields: ["clientSearch"],
    });
  }

  if (data.service_ids.length === 0) {
    errors.push({
      message: "Elegí al menos un servicio.",
      fields: ["serviceSearch"],
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push({
      message: "Indicá la fecha del turno.",
      fields: ["appointmentDate"],
    });
  }

  if (!data.time_start) {
    errors.push({
      message: "Indicá la hora de inicio.",
      fields: ["timeStart"],
    });
  }

  if (!data.time_end) {
    errors.push({
      message: "Indicá la hora de fin.",
      fields: ["timeEnd"],
    });
  } else if (data.time_start && data.time_end <= data.time_start) {
    errors.push({
      message: "La hora de fin debe ser posterior a la hora de inicio.",
      fields: ["timeEnd"],
    });
  }

  if (!Number.isFinite(rawPrice) || rawPrice < 0) {
    errors.push({
      message: "El precio debe ser un número igual o mayor a 0.",
      fields: ["price"],
    });
  }

  return errors;
}

// ============================================================
// GUARDAR TURNO
// ============================================================

// Recopila los datos del formulario y los envía
// al backend mediante JSON.
async function submitModalData() {
  if (isSaving) {
    return;
  }

  feedback.clearInvalid();

  const rawPrice = Number($("price").value || 0);

  const clientId = Number($("clientId").value) || null;

  const clientName =
    $("clientName").value.trim() ||
    (clientId ? "" : $("clientSearch").value.trim());

  const data = {
    client_id: clientId,
    client_name: clientName,

    service_ids: selectedServices.map((service) => Number(service.id)),
    service_durations: Object.fromEntries(
      selectedServices.map((service) => [service.id, Number(service.duration)]),
    ),

    price: rawPrice,

    stylist: $("stylist").value.trim(),

    time_start: $("timeStart").value,
    time_end: $("timeEnd").value,

    notes: $("notes").value.trim(),

    status: $("appointmentStatus").value,
    date: $("appointmentDate").value,
  };

  const errors = validateAppointment(data, rawPrice);

  if (errors.length > 0) {
    errors.forEach((error) => feedback.invalidate(error.fields));
    feedback.focusInvalid();

    return;
  }

  const editing = editingAppointment;

  if (
    editing &&
    data.status === "Finalizado" &&
    editing.status !== "Finalizado"
  ) {
    continueToRecord(editing, data);
    return;
  }

  isSaving = true;
  setBusy(modalSave, true);

  try {
    const response = editing
      ? await updateAppointment({ ...data, id: editing.id })
      : await createAppointment(data);

    if (response?.success && editing) {
      saveLastStylist(data.stylist);
      closeModal();
      afterEdit(editing, data);
    } else if (response?.success) {
      const savedDate = data.date;

      saveLastStylist(data.stylist);
      closeModal();

      showResult(
        "success",
        "Turno guardado",
        (savedDate === appState.activeDay || !appState.activeDay
          ? "Ya figura en la agenda."
          : `Quedó agendado para el ${formatDate(savedDate)}.`) +
          missingAppointmentNotice(data),
      );

      if (appState.activeDay) {
        await loadAppointments(appState.activeDay);
      }

      syncCalendarDay(savedDate);
    } else {
      feedback.show(
        "error",
        response?.error || "No se pudo guardar el turno. Intentá de nuevo.",
      );
    }
  } catch (error) {
    logError("Error al crear el turno:", error);

    feedback.show(
      "error",
      getErrorMessage(error, "No se pudo guardar el turno. Intentá de nuevo."),
    );
  } finally {
    isSaving = false;
    setBusy(modalSave, false);
  }
}
