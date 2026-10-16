// ============================================================
// MODAL DE CREACIÓN DE TURNOS
// ============================================================

import {
  createAppointment,
  fetchAppointments,
  getErrorMessage,
  searchServices,
} from "./api.js";
import { DEFAULT_APPOINTMENT_STATUS, INACTIVE_STATUSES } from "./constants.js";
import { $, restoreFocus } from "./dom.js";
import { formatDate, pad, todayIso } from "./utils.js";
import { appState } from "./state.js";
import { loadAppointments, syncCalendarDay } from "./ui.js";
import {
  createAutocomplete,
  createClientAutocomplete,
} from "./autocomplete.js";
import { clearInvalidOnInput, createFeedback, setBusy } from "./feedback.js";
import { notify } from "./toast.js";

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

// Servicios disponibles cargados desde el backend.
let selectedService = null;
let serviceAutocomplete = null;

// Indica si la hora de fin todavía es automática.
let endTimeIsAutomatic = true;

// Guarda la última hora de fin calculada automáticamente.
let lastCalculatedEndTime = "";

// Indica si la hora de inicio fue sugerida por la aplicación (no escrita por el usuario).
let startIsSuggested = false;

// Profesional con el que se abrió el formulario (para saber si fue modificado).
let initialStylist = "";

// Turnos del día elegido: sirven para sugerir horario y avisar solapamientos.
let dayAppointments = [];
let dayContextToken = 0;

// Evita envíos duplicados mientras se guarda el turno.
let isSaving = false;

// Elemento que tenía el foco antes de abrir el modal.
let modalOpener = null;

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
  } catch {
    // Sin almacenamiento disponible: se ignora.
  }
}

// ============================================================
// INICIALIZACIÓN DEL MODAL
// ============================================================

// Configura los eventos necesarios para abrir,
// cerrar y guardar el formulario de turnos.
export function initModal() {
  const addButton = $("btnAddAppointment");

  // Si falta alguna pieza del modal, no se interrumpe el resto de la aplicación.
  if (!addButton || !modalOverlay || !modalPanel || !modalForm || !modalSave) {
    console.error("El modal de turnos no está completo en la página.");
    return;
  }

  // ----------------------------------------------------------
  // ABRIR MODAL
  // ----------------------------------------------------------
  addButton.addEventListener("click", () => openModal());

  // Otros paneles (por ejemplo el perfil de un cliente) pueden pedir un turno
  // nuevo con el cliente ya elegido.
  document.addEventListener("appointment:new", (event) => {
    openModal(event.detail?.client ?? null);
  });

  // ----------------------------------------------------------
  // CERRAR MODAL
  // ----------------------------------------------------------
  [modalClose, modalCancel].forEach((element) => {
    element?.addEventListener("click", closeModal);
  });

  const requestCloseModal = () => {
    if (isFormDirty()) {
      feedback.show(
        "warning",
        "Hay datos sin guardar. Usá Cancelar o × para descartarlos.",
      );
      return;
    }

    closeModal();
  };

  modalOverlay.addEventListener("click", requestCloseModal);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (modalPanel.classList.contains("is-open")) {
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

  $("clientChange")?.addEventListener("click", clearClient);

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
    onSelect: selectService,
  });

  $("serviceChange")?.addEventListener("click", clearService);

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

  // Usamos "change" porque se dispara cuando
  // el usuario termina de modificar el valor.
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

  // El profesional anterior se completa solo: lo habitual es repetirlo.
  initialStylist = readLastStylist();
  $("stylist").value = initialStylist;
  populateStylistOptions();

  loadDayContext(date);

  // Cliente recibido desde otro panel: ya queda elegido.
  if (client) {
    selectClient(client);
  }

  modalOverlay.classList.add("is-open");
  modalPanel.classList.add("is-open");
  modalPanel.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    const firstField =
      (client ? $("serviceSearch") : $("clientSearch")) || modalPanel;
    firstField.focus({ preventScroll: true });
  });
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

// Vuelve a mostrar el buscador para elegir otro cliente.
function clearClient() {
  $("clientId").value = "";
  $("clientName").value = "";
  $("clientSelected").hidden = true;
  $("clientSearch").hidden = false;
  $("clientHelp").hidden = false;
  clientAutocomplete?.reset();
  $("clientSearch").focus();
}

// ============================================================
// SERVICIOS
// ============================================================

function serviceMeta(service) {
  return `$${service.price} · ${service.duration} min`;
}

// ============================================================
// CAMBIO DE SERVICIO
// ============================================================

// Muestra el servicio elegido y actualiza el precio.
// Si la hora de fin todavía es automática,
// también calcula su nuevo valor según la duración.
function selectService(service) {
  selectedService = service;
  $("serviceId").value = String(service.id);

  $("serviceChipTitle").textContent = service.name;
  $("serviceChipMeta").textContent = serviceMeta(service);
  $("serviceSelected").hidden = false;
  $("serviceSearch").hidden = true;
  $("serviceSearch").value = "";
  $("serviceSearch").removeAttribute("aria-invalid");

  const price = Number(service.price);
  $("price").value = Number.isFinite(price) ? price : "";

  const duration = Number(service.duration);

  if (duration > 0 && endTimeIsAutomatic) {
    calculateEndTime(duration);
  }

  updateScheduleHint();
  updateScheduleWarning();
}

// Vuelve a mostrar el buscador para elegir otro servicio.
function clearService() {
  resetService();
  $("price").value = "";
  updateScheduleHint();
  $("serviceSearch").focus();
}

function resetService() {
  selectedService = null;
  $("serviceId").value = "";
  $("serviceSelected").hidden = true;
  $("serviceSearch").hidden = false;
  serviceAutocomplete?.reset();
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

    // No es imprescindible para guardar: se continúa sin sugerencias.
    console.error("Error al cargar los turnos del día:", error);
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

    const duration = Number(selectedService?.duration);

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

  const duration = Number(selectedService?.duration);

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

  const conflict = dayAppointments.find((appointment) => {
    const otherStart = toMinutes(appointment.time_start);
    const otherEnd = toMinutes(appointment.time_end);

    return (
      otherStart !== null &&
      otherEnd !== null &&
      !INACTIVE_STATUSES.includes(appointment.status) &&
      normalizeName(appointment.stylist) === stylist &&
      otherStart < end &&
      otherEnd > start
    );
  });

  if (!conflict) {
    box.hidden = true;
    return;
  }

  const who = conflict.client_name || "otro cliente";

  box.textContent =
    `Se superpone con el turno de ${who} ` +
    `(${toTimeString(toMinutes(conflict.time_start))} a ${toTimeString(toMinutes(conflict.time_end))}). ` +
    "Podés guardarlo igual.";
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
    const duration = Number(selectedService?.duration);

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

  // No permitir que el turno termine después de las 23:59.
  if (totalMinutes >= 24 * 60) {
    timeEnd.value = "";
    lastCalculatedEndTime = "";

    feedback.show(
      "warning",
      "Con esa duración el turno terminaría después de las 23:59. Ajustá la hora de inicio o ingresá la hora de fin manualmente.",
    );
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
}

// ============================================================
// LIMPIAR FORMULARIO
// ============================================================

// Indica si el usuario ya escribió o eligió algo en el formulario.
function isFormDirty() {
  const hasValue = (id) => String($(id)?.value ?? "").trim() !== "";

  return (
    hasValue("clientId") ||
    hasValue("clientName") ||
    hasValue("clientSearch") ||
    hasValue("serviceId") ||
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

  resetService();

  const statusSelect = $("appointmentStatus");
  if (statusSelect) {
    statusSelect.value = DEFAULT_APPOINTMENT_STATUS;
  }

  // Cliente: vuelve el buscador.
  $("clientSelected").hidden = true;
  $("clientSearch").hidden = false;
  $("clientHelp").hidden = false;
  clientAutocomplete?.reset();

  // Ayudas y avisos del horario.
  $("scheduleHint").hidden = true;
  $("scheduleWarning").hidden = true;

  feedback.clearInvalid();

  // Restablecer el estado interno.
  endTimeIsAutomatic = true;
  lastCalculatedEndTime = "";
  startIsSuggested = false;
  dayAppointments = [];
  dayContextToken += 1;
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

  if (!data.service_id) {
    errors.push({
      message: "Elegí un servicio.",
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

  // Si se escribió un nombre y no se eligió a nadie, se usa como alias.
  const clientName =
    $("clientName").value.trim() ||
    (clientId ? "" : $("clientSearch").value.trim());

  const data = {
    // Cliente
    client_id: clientId,
    client_name: clientName,

    // Servicio
    service_id: Number($("serviceId").value),

    // El precio enviado es el que figura actualmente
    // en el formulario y puede ser modificado manualmente.
    price: rawPrice,

    // Profesional
    stylist: $("stylist").value.trim(),

    // Horarios
    time_start: $("timeStart").value,
    time_end: $("timeEnd").value,

    // Información adicional
    notes: $("notes").value.trim(),

    // Estado y fecha
    status: $("appointmentStatus").value,
    date: $("appointmentDate").value,
  };

  const errors = validateAppointment(data, rawPrice);

  if (errors.length > 0) {
    errors.forEach((error) => feedback.invalidate(error.fields));

    feedback.show(
      "error",
      errors.length === 1
        ? errors[0].message
        : "Completá los campos marcados para continuar.",
    );

    return;
  }

  isSaving = true;
  setBusy(modalSave, true);

  try {
    const response = await createAppointment(data);

    if (response?.success) {
      const savedDate = data.date;

      saveLastStylist(data.stylist);
      closeModal();

      notify.success(
        savedDate === appState.activeDay || !appState.activeDay
          ? "Turno guardado."
          : `Turno guardado para ${formatDate(savedDate)}.`,
      );

      if (appState.activeDay) {
        await loadAppointments(appState.activeDay);
      }

      // Actualiza los contadores del calendario sin recargar la página.
      syncCalendarDay(savedDate);
    } else {
      feedback.show(
        "error",
        response?.error || "No se pudo guardar el turno. Intentá de nuevo.",
      );
    }
  } catch (error) {
    console.error("Error al crear el turno:", error);

    feedback.show(
      "error",
      getErrorMessage(error, "No se pudo guardar el turno. Intentá de nuevo."),
    );
  } finally {
    isSaving = false;
    setBusy(modalSave, false);
  }
}
