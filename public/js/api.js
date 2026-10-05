// Servicio de llamadas API (Modelo)

import { BASE_URL } from "./config.js";

// ============================================================
// CONFIGURACIÓN Y MANEJO DE RESPUESTAS
// ============================================================

// Valida la respuesta del servidor y convierte el JSON recibido.
async function handleJsonResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  if (!response.ok) {
    if (isJson) {
      const errorBody = await response.json();

      throw new Error(
        errorBody.error || `Error del servidor: HTTP ${response.status}`,
      );
    }

    const textError = await response.text();

    console.error("Error del Servidor (Texto Plano):", textError);

    throw new Error(`Error del servidor: HTTP ${response.status}`);
  }

  if (!isJson) {
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

// Obtiene la lista de servicios activos disponibles en la peluquería.
export async function fetchServices() {
  const res = await fetch(`${BASE_URL}/?action=services`);
  return await handleJsonResponse(res);
}

// Obtiene todos los servicios, activos e inactivos.
// Se utiliza en el panel administrativo.
export async function fetchAllServices(page = 1, perPage = 100) {
  const res = await fetch(
    `${BASE_URL}/?action=services_all&page=${page}&per_page=${perPage}`,
  );
  return await handleJsonResponse(res);
}

// Crea un nuevo servicio.
export async function createService(data) {
  const res = await fetch(`${BASE_URL}/?action=service_create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await handleJsonResponse(res);
}

// Actualiza un servicio existente.
export async function updateService(id, data) {
  const res = await fetch(`${BASE_URL}/?action=service_update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
      ...data,
    }),
  });

  return await handleJsonResponse(res);
}

// Activa un servicio.
export async function activateService(id) {
  const res = await fetch(`${BASE_URL}/?action=service_activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
    }),
  });

  return await handleJsonResponse(res);
}

// Desactiva un servicio.
export async function deactivateService(id) {
  const res = await fetch(`${BASE_URL}/?action=service_deactivate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
    }),
  });

  return await handleJsonResponse(res);
}

// Elimina un servicio.
// El backend impide eliminar servicios que tengan
// turnos asociados.
export async function deleteService(id) {
  const res = await fetch(`${BASE_URL}/?action=service_delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
    }),
  });

  return await handleJsonResponse(res);
}

// ============================================================
// CLIENTES
// ============================================================

// Obtiene todos los clientes activos para el selector de turnos.
export async function fetchClients() {
  const firstPage = await fetchAllClients(1, 100, "activos");
  if (!Array.isArray(firstPage?.data)) {
    throw new TypeError("La respuesta de clientes no contiene una lista válida.");
  }

  const clients = [...firstPage.data];
  const perPage = Number(firstPage.per_page);
  const totalPages = Math.ceil(Number(firstPage.total) / perPage);

  for (let page = 2; page <= totalPages; page += 1) {
    const result = await fetchAllClients(page, perPage, "activos");
    if (!Array.isArray(result?.data)) {
      throw new TypeError("La respuesta de clientes no contiene una lista válida.");
    }
    clients.push(...result.data);
  }

  return clients;
}

// Obtiene todos los clientes, activos e inactivos.
// Se utiliza en el panel administrativo.
export async function fetchAllClients(page = 1, perPage = 100, filter = "todos") {
  const res = await fetch(
    `${BASE_URL}/?action=clients_all&page=${page}&per_page=${perPage}&filter=${encodeURIComponent(filter)}`,
  );
  return await handleJsonResponse(res);
}

export async function fetchClientTimeline(clientId) {
  const res = await fetch(
    `${BASE_URL}/?action=client_timeline&client_id=${encodeURIComponent(clientId)}`,
  );

  return await handleJsonResponse(res);
}

// Busca clientes por alias con soporte para cancelaciones (AbortSignal).
export async function searchClients(query, signal = null) {
  const res = await fetch(
    `${BASE_URL}/?action=client_search&q=${encodeURIComponent(query)}`,
    { signal },
  );

  return await handleJsonResponse(res);
}

// Crea un nuevo cliente.
export async function createClient(data) {
  const res = await fetch(`${BASE_URL}/?action=client_create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await handleJsonResponse(res);
}

// Actualiza un cliente existente.
export async function updateClient(id, data) {
  const res = await fetch(`${BASE_URL}/?action=client_update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
      ...data,
    }),
  });

  return await handleJsonResponse(res);
}

// Activa un cliente.
export async function activateClient(id) {
  const res = await fetch(`${BASE_URL}/?action=client_activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
    }),
  });

  return await handleJsonResponse(res);
}

// Desactiva un cliente.
export async function deactivateClient(id) {
  const res = await fetch(`${BASE_URL}/?action=client_deactivate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
    }),
  });

  return await handleJsonResponse(res);
}

// Elimina un cliente.
// El backend impide eliminar clientes que tengan
// turnos asociados.
export async function deleteClient(id) {
  const res = await fetch(`${BASE_URL}/?action=client_delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
    }),
  });

  return await handleJsonResponse(res);
}

// ============================================================
// PRODUCTOS
// ============================================================

// Obtiene los productos para el panel administrativo (con filtros, búsqueda y abort signal)
export async function fetchAllProducts(
  search = "",
  filter = "todos",
  signal = null,
  page = 1,
  perPage = 100,
) {
  const url =
    `${BASE_URL}/?action=products_all` +
    `&q=${encodeURIComponent(search)}` +
    `&filter=${encodeURIComponent(filter)}` +
    `&page=${page}&per_page=${perPage}`;

  const res = await fetch(url, { signal });
  return await handleJsonResponse(res);
}

// Busca productos por nombre con soporte para cancelaciones (AbortSignal).
export async function searchProducts(query, signal = null) {
  const res = await fetch(
    `${BASE_URL}/?action=product_search&q=${encodeURIComponent(query)}`,
    { signal },
  );

  return await handleJsonResponse(res);
}

// Crea un nuevo producto.
export async function createProduct(data) {
  const res = await fetch(`${BASE_URL}/?action=product_create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await handleJsonResponse(res);
}

// Actualiza un producto existente.
export async function updateProduct(id, data) {
  const res = await fetch(`${BASE_URL}/?action=product_update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
      ...data,
    }),
  });

  return await handleJsonResponse(res);
}

// Activa un producto.
export async function activateProduct(id) {
  const res = await fetch(`${BASE_URL}/?action=product_activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
    }),
  });

  return await handleJsonResponse(res);
}

// Desactiva un producto.
export async function deactivateProduct(id) {
  const res = await fetch(`${BASE_URL}/?action=product_deactivate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
    }),
  });

  return await handleJsonResponse(res);
}

// Elimina un producto.
// El backend impide eliminar productos que ya fueron
// usados en servicios (consumos).
export async function deleteProduct(id) {
  const res = await fetch(`${BASE_URL}/?action=product_delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(id),
    }),
  });

  return await handleJsonResponse(res);
}

// ============================================================
// FICHAS DE SERVICIO (HISTORIAL TÉCNICO)
// ============================================================

// Guarda una nueva ficha de servicio (color, tratamiento, corte,
// general/productos) para un cliente registrado o uno sin registrar
// (client_name suelto).
export async function saveServiceHistory(data) {
  const res = await fetch(`${BASE_URL}/?action=service_history_save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await handleJsonResponse(res);
}
