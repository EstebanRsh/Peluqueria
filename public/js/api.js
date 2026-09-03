// Servicio de llamadas API (Modelo)

import { BASE_URL } from "./config.js";

// ============================================================
// CONFIGURACIÓN Y MANEJO DE RESPUESTAS
// ============================================================

// Valida la respuesta del servidor y convierte el JSON recibido
// en un objeto JavaScript.
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

// ============================================================
// TURNOS
// ============================================================

// Obtiene los turnos de una fecha determinada.
// Permite filtrar por búsqueda y estado.
export async function fetchAppointments(date, search = "", status = "todos") {
  const url =
    `${BASE_URL}/?action=list` +
    `&date=${date}` +
    `&search=${encodeURIComponent(search)}` +
    `&status=${status}`;

  const res = await fetch(url);
  return await handleJsonResponse(res);
}

// ============================================================
// CREAR TURNO
// ============================================================

// Envía un nuevo turno al servidor en formato JSON.
export async function createAppointment(data) {
  const res = await fetch(`${BASE_URL}/?action=create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await handleJsonResponse(res);
}

// ============================================================
// ACTUALIZAR ESTADO
// ============================================================

// Envía al servidor el ID del turno y su nuevo estado
// mediante una solicitud JSON.
export async function updateAppointmentStatus(id, targetStatus) {
  const data = {
    id: Number(id),
    status: targetStatus,
  };

  const response = await fetch(`${BASE_URL}/?action=update_status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await handleJsonResponse(response);
}

// ============================================================
// HISTORIAL
// ============================================================

// Obtiene el historial de estados de un turno.
export async function fetchTimelineHistory(id) {
  const res = await fetch(`${BASE_URL}/?action=history&id=${id}`);
  return await handleJsonResponse(res);
}

// ============================================================
// ELIMINAR TURNO
// ============================================================

// Envía al servidor el ID del turno a eliminar
// mediante una solicitud JSON.
export async function removeAppointment(id) {
  const data = {
    id: Number(id),
  };

  const res = await fetch(`${BASE_URL}/?action=delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await handleJsonResponse(res);
}

// ============================================================
// SERVICIOS
// ============================================================

// Obtiene la lista de servicios activos disponibles
// en la peluquería.
export async function fetchServices() {
  const res = await fetch(`${BASE_URL}/?action=services`);
  return await handleJsonResponse(res);
}
