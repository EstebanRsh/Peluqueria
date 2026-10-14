// ============================================================
// MODAL DE CREACIÓN DE TURNOS
// ============================================================

import {
  createAppointment,
  fetchAppointments,
  fetchServices,
  searchClients,
  getErrorMessage,
} from "./api.js";
import { formatDate } from "./utils.js";
import { appState } from "./main.js";
import { loadAppointments, syncCalendarDay } from "./ui.js";
import { createAutocomplete } from "./autocomplete.js";
import { notify } from "./toast.js";

// ============================================================
// ELEMENTOS DEL MODAL
// ============================================================

const $ = (id) => document.getElementById(id);

const modalOverlay = $("modalOverlay");
const modalPanel = $("appointmentFormPanel");
const modalForm = $("appointmentForm");
const modalClose = $("modalClose");
const modalCancel = $("modalCancel");
const modalSave = $("modalSave");

// Estados de turno que no ocupan el horario del profesional.
const INACTIVE_STATUSES = ["Cancelado", "Ausente"];

const LAST_STYLIST_KEY = "hairapp:lastStylist";

// ============================================================
// ESTADO DEL MODAL
// ============================================================

// Servicios disponibles cargados desde el backend.
let availableServices = [];

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

const pad = (value) => String(value).padStart(2, "0");

function todayIso() {
  const now = new Date();

  return [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join(
    "-",
  );
}

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

function restoreFocus(element) {
  if (element && element.isConnected) {
    element.focus({ preventScroll: true });
  }
}

function isActiveRecord(record) {
  return (
    record.active === undefined ||
    record.active === true ||
    Number(record.active) === 1
  );
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
// MENSAJES Y CAMPOS INVÁLIDOS
// ============================================================

// El contenedor de mensajes se crea una sola vez, justo encima de los botones.
function getFeedbackBox() {
  let box = $("modalFeedback");

  if (box) {
    return box;
  }

  const footer = modalSave?.parentElement;

  if (!footer || !footer.parentElement) {
    return null;
  }

  box = document.createElement("div");
  box.id = "modalFeedback";
  box.className = "alert is-hidden";
  footer.parentElement.insertBefore(box, footer);

  return box;
}

function showFeedback(type, message, source = "") {
  const box = getFeedbackBox();

  if (!box) {
    return;
  }

  box.className = `alert alert--${type}`;
  box.setAttribute("role", type === "error" ? "alert" : "status");
  box.dataset.source = source;
  box.textContent = message;
}

function clearFeedback(onlySource = null) {
  const box = $("modalFeedback");

  if (!box) {
    return;
  }

  if (onlySource !== null && box.dataset.source !== onlySource) {
    return;
  }

  box.className = "alert is-hidden";
  box.dataset.source = "";
  box.textContent = "";
}

function setInvalid(ids) {
  ids.forEach((id) => {
    $(id)?.setAttribute("aria-invalid", "true");
  });
}

function clearInvalid() {
  modalPanel
    ?.querySelectorAll("[aria-invalid]")
    .forEach((element) => element.removeAttribute("aria-invalid"));
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

  // Un clic accidental fuera del panel no debe borrar lo ya escrito.
  modalOverlay.addEventListener("click", () => {
    if (isFormDirty()) {
      showFeedback(
        "warning",
        "Hay datos sin guardar. Usá Cancelar o × para descartarlos.",
        "dirty",
      );
      return;
    }

    closeModal();
  });

  // Cerrar con Escape.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (modalPanel.classList.contains("is-open")) {
      closeModal();
    }
  });

  // Al corregir un campo se quita su marca de error.
  const clearFieldError = (event) => {
    const id = event.target?.id;

    if (!id) {
      return;
    }

    event.target.removeAttribute("aria-invalid");
    clearFeedback("dirty");
  };

  modalPanel.addEventListener("input", clearFieldError);
  modalPanel.addEventListener("change", clearFieldError);

  // ----------------------------------------------------------
  // CLIENTE
  // ----------------------------------------------------------
  clientAutocomplete = createAutocomplete({
    input: $("clientSearch"),
    list: $("appointmentClientSuggestions"),
    minChars: 2,
    emptyMessage: "No hay clientes registrados con ese nombre.",
    search: async (query, signal) => {
      const response = await searchClients(query, signal);
      const clients = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];

      return clients.filter(isActiveRecord);
    },
    getTitle: (client) => client.alias ?? client.name ?? "",
    getSubtitle: (client) =>
      client.internal_code ? `Código ${client.internal_code}` : "",
    onSelect: selectClient,
    customOption: {
      label: (query) => `Usar «${query}» como alias`,
      onSelect: useAlias,
    },
  });

  $("clientChange")?.addEventListener("click", clearClient);

  // ----------------------------------------------------------
  // SERVICIO
  // ----------------------------------------------------------
  $("serviceId")?.addEventListener("change", handleServiceChange);

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

  loadServices();
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
      (client ? $("serviceId") : $("clientSearch")) || modalPanel;
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
  $("serviceId")?.focus();
}

// Texto escrito usado como alias de referencia (sin cliente registrado).
function useAlias(text) {
  $("clientId").value = "";
  $("clientName").value = text;

  showClientChip(text, "Alias de referencia · sin cliente registrado");

  $("clientSearch").removeAttribute("aria-invalid");
  $("serviceId")?.focus();
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

// Carga los servicios disponibles desde el servidor
// y los muestra en el selector.
async function loadServices() {
  const serviceSelect = $("serviceId");

  if (!serviceSelect) {
    return;
  }

  serviceSelect.innerHTML = '<option value="">Cargando servicios...</option>';
  serviceSelect.disabled = true;

  try {
    const services = await fetchServices();

    availableServices = Array.isArray(services)
      ? services.filter(isActiveRecord)
      : [];

    serviceSelect.innerHTML = '<option value="">Seleccionar servicio</option>';

    availableServices.forEach((service) => {
      const option = document.createElement("option");

      option.value = service.id;
      option.textContent = `${service.name} - $${service.price}`;
      option.dataset.duration = service.duration;
      option.dataset.price = service.price;

      serviceSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar los servicios:", error);

    serviceSelect.innerHTML =
      '<option value="">No se pudieron cargar los servicios</option>';

    showFeedback(
      "error",
      getErrorMessage(error, "No se pudieron cargar los servicios."),
      "services-load",
    );
  } finally {
    serviceSelect.disabled = false;
  }
}

function getSelectedServiceOption() {
  const serviceSelect = $("serviceId");
  const option = serviceSelect.options[serviceSelect.selectedIndex];

  return option && option.value ? option : null;
}

// ============================================================
// CAMBIO DE SERVICIO
// ============================================================

// Actualiza el precio al seleccionar un servicio.
// Si la hora de fin todavía es automática,
// también calcula su nuevo valor según la duración.
function handleServiceChange() {
  const priceInput = $("price");
  const selectedOption = getSelectedServiceOption();

  if (!selectedOption) {
    priceInput.value = "";
    updateScheduleHint();
    return;
  }

  // ----------------------------------------------------------
  // PRECIO
  // ----------------------------------------------------------
  const price = Number(selectedOption.dataset.price);
  priceInput.value = Number.isFinite(price) ? price : "";

  // ----------------------------------------------------------
  // DURACIÓN
  // ----------------------------------------------------------
  const duration = Number(selectedOption.dataset.duration);

  if (duration > 0 && endTimeIsAutomatic) {
    calculateEndTime(duration);
  }

  updateScheduleHint();
  updateScheduleWarning();
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

    const option = getSelectedServiceOption();
    const duration = Number(option?.dataset.duration);

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

  const option = getSelectedServiceOption();
  const duration = Number(option?.dataset.duration);

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
    const option = getSelectedServiceOption();
    const duration = Number(option?.dataset.duration);

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

  clearFeedback("end-overflow");

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

    showFeedback(
      "warning",
      "Con esa duración el turno terminaría después de las 23:59. Ajustá la hora de inicio o ingresá la hora de fin manualmente.",
      "end-overflow",
    );
    return;
  }

  const calculatedTime = toTimeString(totalMinutes);

  timeEnd.value = calculatedTime;
  lastCalculatedEndTime = calculatedTime;
  endTimeIsAutomatic = true;

  clearFeedback("end-overflow");
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

  const serviceSelect = $("serviceId");
  if (serviceSelect) {
    serviceSelect.value = "";
  }

  const statusSelect = $("appointmentStatus");
  if (statusSelect) {
    statusSelect.value = "Reservado";
  }

  // Cliente: vuelve el buscador.
  $("clientSelected").hidden = true;
  $("clientSearch").hidden = false;
  $("clientHelp").hidden = false;
  clientAutocomplete?.reset();

  // Ayudas y avisos del horario.
  $("scheduleHint").hidden = true;
  $("scheduleWarning").hidden = true;

  clearFeedback();
  clearInvalid();

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
      fields: ["serviceId"],
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

function setSaving(saving) {
  isSaving = saving;
  modalSave.disabled = saving;
  modalSave.classList.toggle("is-loading", saving);
  modalSave.setAttribute("aria-busy", String(saving));
}

// Recopila los datos del formulario y los envía
// al backend mediante JSON.
async function submitModalData() {
  if (isSaving) {
    return;
  }

  clearFeedback();
  clearInvalid();

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
    errors.forEach((error) => setInvalid(error.fields));

    showFeedback(
      "error",
      errors.length === 1
        ? errors[0].message
        : "Completá los campos marcados para continuar.",
    );

    modalPanel.querySelector("[aria-invalid='true']")?.focus();
    return;
  }

  setSaving(true);

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
      showFeedback(
        "error",
        response?.error || "No se pudo guardar el turno. Intentá de nuevo.",
      );
    }
  } catch (error) {
    console.error("Error al crear el turno:", error);

    showFeedback(
      "error",
      getErrorMessage(error, "No se pudo guardar el turno. Intentá de nuevo."),
    );
  } finally {
    setSaving(false);
  }
}
