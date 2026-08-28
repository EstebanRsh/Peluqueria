// Servicio de llamadas API (Modelo)
import { BASE_URL } from "./config.js";

// Función auxiliar para validar y procesar las respuestas JSON de manera segura
async function handleJsonResponse(response) {
  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    const textError = await response.text();
    console.error("Error del Servidor (Texto Plano):", textError);
    throw new Error(`Error del servidor: HTTP ${response.status}`);
  }

  if (!contentType || !contentType.includes("application/json")) {
    const rawText = await response.text();
    console.group("❌ RESPUESTA NO-JSON DETECTADA");
    console.error("Se esperaba JSON pero se recibió otra cosa.");
    console.warn("Contenido bruto del backend:\n", rawText);
    console.groupEnd();
    throw new TypeError(
      "El backend no devolvió un JSON válido. Revisá la consola.",
    );
  }

  return await response.json();
}

// Ahora la API delega el filtrado y búsqueda directo a los parámetros URL de PHP
export async function fetchAppointments(date, search = "", status = "todos") {
  const url = `${BASE_URL}/?action=list&date=${date}&search=${encodeURIComponent(search)}&status=${status}`;
  const res = await fetch(url);
  return await handleJsonResponse(res);
}

export async function createAppointment(formData) {
  const res = await fetch(`${BASE_URL}/?action=create`, {
    method: "POST",
    body: formData,
  });
  return await handleJsonResponse(res);
}

export async function updateAppointmentStatus(id, targetStatus) {
  const fd = new FormData();
  fd.append("id", id);
  fd.append("status", targetStatus);

  const response = await fetch(`${BASE_URL}/?action=update_status`, {
    method: "POST",
    body: fd,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

export async function fetchTimelineHistory(id) {
  const res = await fetch(`${BASE_URL}/?action=history&id=${id}`);
  return await handleJsonResponse(res);
}

export async function removeAppointment(id) {
  const fd = new FormData();
  fd.append("id", id);
  const res = await fetch(`${BASE_URL}/?action=delete`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}
