// ============================================================
// MODAL DE CREACIÓN DE TURNOS
// ============================================================

import { createAppointment, fetchClients, fetchServices } from "./api.js";
import { formatDate } from "./utils.js";
import { appState } from "./main.js";
import { loadAppointments } from "./ui.js";

// ============================================================
// ELEMENTOS DEL MODAL
// ============================================================

const modal = document.getElementById("modalOverlay");
const modalDate = document.getElementById("modalDate");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");
const modalSave = document.getElementById("modalSave");

// ============================================================
// ESTADO DEL MODAL
// ============================================================

// Servicios disponibles cargados desde el backend.
let availableServices = [];

// Indica si la hora de fin todavía es automática.
let endTimeIsAutomatic = true;

// Guarda la última hora de fin calculada automáticamente.
let lastCalculatedEndTime = "";

// ============================================================
// INICIALIZACIÓN DEL MODAL
// ============================================================

// Configura los eventos necesarios para abrir,
// cerrar y guardar el formulario de turnos.
export function initModal() {
  // ----------------------------------------------------------
  // ABRIR MODAL
  // ----------------------------------------------------------
  document.getElementById("btnAddAppointment").addEventListener("click", () => {
    modalDate.textContent = formatDate(appState.activeDay);

    // Cada apertura comienza con la hora de fin automática.
    endTimeIsAutomatic = true;
    lastCalculatedEndTime = "";

    loadServices();
    loadClientsForSelect();

    modal.classList.add("is-open");
  });

  // ----------------------------------------------------------
  // CERRAR MODAL
  // ----------------------------------------------------------
  [modalClose, modalCancel].forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  // Cerrar al hacer clic fuera del modal.
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  // ----------------------------------------------------------
  // SERVICIO
  // ----------------------------------------------------------
  const serviceSelect = document.getElementById("serviceId");
  if (serviceSelect) {
    serviceSelect.addEventListener("change", handleServiceChange);
  }

  // ----------------------------------------------------------
  // HORA DE INICIO
  // ----------------------------------------------------------
  const timeStart = document.getElementById("timeStart");
  if (timeStart) {
    timeStart.addEventListener("change", handleStartTimeChange);
  }

  // ----------------------------------------------------------
  // HORA DE FIN
  // ----------------------------------------------------------
  const timeEnd = document.getElementById("timeEnd");
  if (timeEnd) {
    // Usamos "change" porque se dispara cuando
    // el usuario termina de modificar el valor.
    timeEnd.addEventListener("change", handleEndTimeManualChange);
  }

  // ----------------------------------------------------------
  // GUARDAR
  // ----------------------------------------------------------
  modalSave.addEventListener("click", submitModalData);
}

// ============================================================
// CLIENTES
// ============================================================

// Carga los clientes activos para elegir el vínculo real
// de client_id desde el modal de creación del turno.
async function loadClientsForSelect() {
  const clientSelect = document.getElementById("clientId");

  if (!clientSelect) {
    return;
  }

  try {
    const clients = await fetchClients();

    if (!Array.isArray(clients)) {
      clientSelect.innerHTML = '<option value="">Sin cliente asociado</option>';
      return;
    }

    clientSelect.innerHTML = '<option value="">Sin cliente asociado</option>';

    clients
      .filter((client) => client.active === true || Number(client.active) === 1)
      .forEach((client) => {
        const option = document.createElement("option");
        option.value = client.id;
        option.textContent = `${client.alias} (${client.internal_code || "sin código"})`;
        clientSelect.appendChild(option);
      });
  } catch (error) {
    console.error("Error al cargar clientes:", error);
  }
}

// ============================================================
// SERVICIOS
// ============================================================

// Carga los servicios disponibles desde el servidor
// y los muestra en el selector.
async function loadServices() {
  const serviceSelect = document.getElementById("serviceId");

  if (!serviceSelect) {
    return;
  }

  try {
    const services = await fetchServices();

    availableServices = Array.isArray(services) ? services : [];

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
    alert("No se pudieron cargar los servicios.");
  }
}

// ============================================================
// CAMBIO DE SERVICIO
// ============================================================

// Actualiza el precio al seleccionar un servicio.
// Si la hora de fin todavía es automática,
// también calcula su nuevo valor según la duración.
function handleServiceChange() {
  const serviceSelect = document.getElementById("serviceId");
  const priceInput = document.getElementById("price");
  const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];

  if (!selectedOption || !selectedOption.value) {
    priceInput.value = "";
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
}

// ============================================================
// CAMBIO DE HORA DE INICIO
// ============================================================

// Si la hora de fin continúa siendo automática,
// recalcula la hora de fin según el servicio seleccionado.
function handleStartTimeChange() {
  if (!endTimeIsAutomatic) {
    return;
  }

  const serviceSelect = document.getElementById("serviceId");
  const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];

  if (!selectedOption || !selectedOption.value) {
    return;
  }

  const duration = Number(selectedOption.dataset.duration);

  if (duration > 0) {
    calculateEndTime(duration);
  }
}

// ============================================================
// MODIFICACIÓN MANUAL DE HORA DE FIN
// ============================================================

// Cuando la peluquera modifica la hora de fin,
// dejamos de recalcularla automáticamente.
function handleEndTimeManualChange() {
  const timeEnd = document.getElementById("timeEnd");

  if (!timeEnd.value) {
    return;
  }

  if (timeEnd.value !== lastCalculatedEndTime) {
    endTimeIsAutomatic = false;
  }
}

// ============================================================
// CÁLCULO DE HORA DE FIN
// ============================================================

// Suma la duración del servicio a la hora de inicio.
function calculateEndTime(durationMinutes) {
  const timeStart = document.getElementById("timeStart");
  const timeEnd = document.getElementById("timeEnd");

  if (!timeStart.value) {
    return;
  }

  const [hours, minutes] = timeStart.value.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;

  // No permitir que el turno termine después de las 23:59.
  if (totalMinutes >= 24 * 60) {
    timeEnd.value = "";
    lastCalculatedEndTime = "";
    return;
  }

  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;

  const formattedHours = String(endHours).padStart(2, "0");
  const formattedMinutes = String(endMinutes).padStart(2, "0");

  const calculatedTime = `${formattedHours}:${formattedMinutes}`;

  timeEnd.value = calculatedTime;
  lastCalculatedEndTime = calculatedTime;
  endTimeIsAutomatic = true;
}

// ============================================================
// CIERRE DEL MODAL
// ============================================================

// Cierra el modal y limpia todos sus campos.
function closeModal() {
  modal.classList.remove("is-open");
  clearModal();
}

// ============================================================
// LIMPIAR FORMULARIO
// ============================================================

// Restablece todos los campos y el estado interno del modal.
function clearModal() {
  const fields = [
    "clientId",
    "clientName",
    "phone",
    "timeStart",
    "timeEnd",
    "price",
    "stylist",
    "notes",
  ];

  fields.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.value = "";
    }
  });

  const serviceSelect = document.getElementById("serviceId");
  if (serviceSelect) {
    serviceSelect.value = "";
  }

  const statusSelect = document.getElementById("appointmentStatus");
  if (statusSelect) {
    statusSelect.value = "Reservado";
  }

  // Restablecer el cálculo automático.
  endTimeIsAutomatic = true;
  lastCalculatedEndTime = "";
}

// ============================================================
// GUARDAR TURNO
// ============================================================

// Recopila los datos del formulario y los envía
// al backend mediante JSON.
async function submitModalData() {
  const data = {
    // Cliente
    client_id: Number(document.getElementById("clientId")?.value) || null,
    client_name: document.getElementById("clientName")?.value.trim() || "",
    phone: document.getElementById("phone")?.value.trim() || "",

    // Servicio
    service_id: Number(document.getElementById("serviceId").value),

    // El precio enviado es el que figura actualmente
    // en el formulario y puede ser modificado manualmente.
    price: Number(document.getElementById("price").value || 0),

    // Profesional
    stylist: document.getElementById("stylist").value.trim(),

    // Horarios
    time_start: document.getElementById("timeStart").value,
    time_end: document.getElementById("timeEnd").value,

    // Información adicional
    notes: document.getElementById("notes").value.trim(),

    // Estado y fecha
    status: document.getElementById("appointmentStatus").value,
    date: appState.activeDay,
  };

  // ==========================================================
  // VALIDACIONES DE EXPERIENCIA DE USUARIO
  // ==========================================================

  // Estas validaciones solamente evitan enviar
  // formularios evidentemente incompletos.
  // El backend realiza las validaciones definitivas.

  if (!data.client_id && !data.client_name) {
    alert("Debe seleccionar un cliente o ingresar un alias de referencia.");
    return;
  }

  if (!data.service_id) {
    alert("Debe seleccionar un servicio.");
    return;
  }

  if (!data.time_start) {
    alert("La hora de inicio es obligatoria.");
    return;
  }

  if (!data.time_end) {
    alert("La hora de fin es obligatoria.");
    return;
  }

  // ==========================================================
  // ENVÍO
  // ==========================================================

  try {
    const response = await createAppointment(data);

    if (response.success) {
      closeModal();
      await loadAppointments(appState.activeDay);
    } else {
      alert(response.error || "Error al intentar guardar el turno.");
    }
  } catch (error) {
    console.error("Error al crear el turno:", error);
    alert("Ocurrió un problema de red o de servidor:\n" + error.message);
  }
}
