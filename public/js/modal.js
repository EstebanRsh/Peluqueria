// Manejo del Modal de Creación de Turnos
import { createAppointment } from "./api.js";
import { formatDate } from "./utils.js";
import { appState } from "./main.js";
import { loadAppointments } from "./ui.js";

const modal = document.getElementById("modalOverlay");
const modalDate = document.getElementById("modalDate");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");
const modalSave = document.getElementById("modalSave");

export function initModal() {
  document.getElementById("btnAddAppointment").addEventListener("click", () => {
    modalDate.textContent = formatDate(appState.activeDay);
    modal.classList.add("is-open");
  });

  [modalClose, modalCancel].forEach((el) =>
    el.addEventListener("click", closeModal),
  );
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  modalSave.addEventListener("click", submitModalData);
}

function closeModal() {
  modal.classList.remove("is-open");
  clearModal();
}

function clearModal() {
  [
    "patientName",
    "phone",
    "timeStart",
    "timeEnd",
    "socialWork",
    "payment",
    "doctor",
    "notes",
  ].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("appointmentStatus").value = "Reservado";
}

async function submitModalData() {
  const fd = new FormData();
  fd.append(
    "patient_name",
    document.getElementById("patientName").value.trim(),
  );
  fd.append("phone", document.getElementById("phone").value.trim());
  fd.append("time_start", document.getElementById("timeStart").value);
  fd.append("time_end", document.getElementById("timeEnd").value);
  fd.append("social_work", document.getElementById("socialWork").value.trim());
  fd.append("payment", document.getElementById("payment").value || 0);
  fd.append("doctor", document.getElementById("doctor").value.trim());
  fd.append("notes", document.getElementById("notes").value.trim());
  fd.append("status", document.getElementById("appointmentStatus").value);
  fd.append("date", appState.activeDay);

  if (!fd.get("patient_name") || !fd.get("time_start") || !fd.get("time_end")) {
    alert("Paciente, hora inicio y hora fin son obligatorios.");
    return;
  }

  try {
    const data = await createAppointment(fd);
    if (data.success) {
      closeModal();
      // Recarga los turnos del día activo llamando a la nueva lógica del servidor
      loadAppointments(appState.activeDay);
    } else {
      alert("Error al intentar guardar el turno en el servidor.");
    }
  } catch (error) {
    alert("Ocurrió un problema de red o de servidor:\n" + error.message);
  }
}
