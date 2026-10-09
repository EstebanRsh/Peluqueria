// Servicio de llamadas API (Modelo)

import { BASE_URL } from "./config.js";

// ============================================================
// SESIÓN Y TOKEN CSRF
// ============================================================

// Redirige a la pantalla de login cuando la sesión ya no es válida.
function redirectToLogin() {
  window.location.replace(new URL("login.php", window.location.href));
}

// Token CSRF en memoria. Se pide una sola vez al servidor y se reutiliza.
let csrfTokenPromise = null;

function resetCsrfToken() {
  csrfTokenPromise = null;
}

// Obtiene el token CSRF de la sesión activa.
async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch(`${BASE_URL}/?action=session`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(handleJsonResponse)
      .then((data) => {
        if (!data.authenticated || !data.csrf_token) {
          redirectToLogin();
          throw new Error("La sesión expiró. Volvé a iniciar sesión.");
        }
        return data.csrf_token;
      })
      .catch((error) => {
        // Si falló, el próximo intento vuelve a pedirlo.
        csrfTokenPromise = null;
        throw error;
      });
  }

  return csrfTokenPromise;
}

// ============================================================
// CONFIGURACIÓN Y MANEJO DE RESPUESTAS
// ============================================================

// Valida la respuesta del servidor y convierte el JSON recibido.
async function handleJsonResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  if (!response.ok) {
    // Sesión vencida o inexistente: volver al login.
    if (response.status === 401) {
      redirectToLogin();
    }

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
// PETICIONES POST (con token CSRF)
// ============================================================

// Envía una petición POST en JSON incluyendo el token CSRF.
// Si el servidor rechaza el token (por ejemplo, tras renovarse la
// sesión), lo vuelve a pedir y reintenta una única vez.
async function postJson(action, data = {}, signal = null) {
  const send = async () =>
    fetch(`${BASE_URL}/?action=${action}`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": await getCsrfToken(),
      },
      body: JSON.stringify(data),
      signal,
    });

  let res = await send();

  if (res.status === 403) {
    let message = "";
    try {
      message = (await res.clone().json()).error || "";
    } catch {
      // Respuesta sin JSON: no es un error de token.
    }

    if (message.includes("CSRF")) {
      resetCsrfToken();
      res = await send();
    }
  }

  return await handleJsonResponse(res);
}

// ============================================================
// TURNOS
// ============================================================

// Obtiene los turnos de una fecha determinada.
// Permite filtrar por búsqueda y estado.
export async function fetchAppointments(date, search = "", status = "todos") {
  const url =
    `${BASE_URL}/?action=list` +
    `&date=${encodeURIComponent(date)}` +
    `&search=${encodeURIComponent(search)}` +
    `&status=${encodeURIComponent(status)}`;

  const res = await fetch(url, { credentials: "same-origin" });
  return await handleJsonResponse(res);
}

// Envía un nuevo turno al servidor en formato JSON.
export function createAppointment(data) {
  return postJson("create", data);
}

// Envía al servidor el ID del turno y su nuevo estado.
export function updateAppointmentStatus(id, targetStatus) {
  return postJson("update_status", {
    id: Number(id),
    status: targetStatus,
  });
}

// Obtiene el historial de estados de un turno.
export async function fetchTimelineHistory(id) {
  const res = await fetch(
    `${BASE_URL}/?action=history&id=${encodeURIComponent(id)}`,
    { credentials: "same-origin" },
  );
  return await handleJsonResponse(res);
}

// Elimina un turno por su ID.
export function removeAppointment(id) {
  return postJson("delete", { id: Number(id) });
}

// ============================================================
// SERVICIOS
// ============================================================

// Obtiene la lista de servicios activos disponibles en la peluquería.
export async function fetchServices() {
  const res = await fetch(`${BASE_URL}/?action=services`, {
    credentials: "same-origin",
  });
  return await handleJsonResponse(res);
}

// Obtiene todos los servicios, activos e inactivos.
// Se utiliza en el panel administrativo.
export async function fetchAllServices(page = 1, perPage = 100) {
  const res = await fetch(
    `${BASE_URL}/?action=services_all&page=${page}&per_page=${perPage}`,
    { credentials: "same-origin" },
  );
  return await handleJsonResponse(res);
}

// Crea un nuevo servicio.
export function createService(data) {
  return postJson("service_create", data);
}

// Actualiza un servicio existente.
export function updateService(id, data) {
  return postJson("service_update", { id: Number(id), ...data });
}

// Activa un servicio.
export function activateService(id) {
  return postJson("service_activate", { id: Number(id) });
}

// Desactiva un servicio.
export function deactivateService(id) {
  return postJson("service_deactivate", { id: Number(id) });
}

// Elimina un servicio.
// El backend impide eliminar servicios que tengan turnos asociados.
export function deleteService(id) {
  return postJson("service_delete", { id: Number(id) });
}

// ============================================================
// CLIENTES
// ============================================================

// Obtiene todos los clientes activos para el selector de turnos.
export async function fetchClients() {
  const firstPage = await fetchAllClients(1, 100, "activos");
  if (!Array.isArray(firstPage?.data)) {
    throw new TypeError(
      "La respuesta de clientes no contiene una lista válida.",
    );
  }

  const clients = [...firstPage.data];
  const perPage = Number(firstPage.per_page);
  const totalPages = Math.ceil(Number(firstPage.total) / perPage);

  for (let page = 2; page <= totalPages; page += 1) {
    const result = await fetchAllClients(page, perPage, "activos");
    if (!Array.isArray(result?.data)) {
      throw new TypeError(
        "La respuesta de clientes no contiene una lista válida.",
      );
    }
    clients.push(...result.data);
  }

  return clients;
}

// Obtiene todos los clientes, activos e inactivos.
// Se utiliza en el panel administrativo.
export async function fetchAllClients(
  page = 1,
  perPage = 100,
  filter = "todos",
) {
  const res = await fetch(
    `${BASE_URL}/?action=clients_all&page=${page}&per_page=${perPage}&filter=${encodeURIComponent(filter)}`,
    { credentials: "same-origin" },
  );
  return await handleJsonResponse(res);
}

// Obtiene la línea de tiempo técnica de un cliente.
export async function fetchClientTimeline(clientId) {
  const res = await fetch(
    `${BASE_URL}/?action=client_timeline&client_id=${encodeURIComponent(clientId)}`,
    { credentials: "same-origin" },
  );

  return await handleJsonResponse(res);
}

// Busca clientes por alias con soporte para cancelaciones (AbortSignal).
export async function searchClients(query, signal = null) {
  const res = await fetch(
    `${BASE_URL}/?action=client_search&q=${encodeURIComponent(query)}`,
    { credentials: "same-origin", signal },
  );

  return await handleJsonResponse(res);
}

// Crea un nuevo cliente.
export function createClient(data) {
  return postJson("client_create", data);
}

// Actualiza un cliente existente.
export function updateClient(id, data) {
  return postJson("client_update", { id: Number(id), ...data });
}

// Activa un cliente.
export function activateClient(id) {
  return postJson("client_activate", { id: Number(id) });
}

// Desactiva un cliente.
export function deactivateClient(id) {
  return postJson("client_deactivate", { id: Number(id) });
}

// Elimina un cliente.
// El backend impide eliminar clientes que tengan turnos asociados.
export function deleteClient(id) {
  return postJson("client_delete", { id: Number(id) });
}

// ============================================================
// PRODUCTOS
// ============================================================

// Obtiene los productos para el panel administrativo
// (con filtros, búsqueda y abort signal).
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

  const res = await fetch(url, { credentials: "same-origin", signal });
  return await handleJsonResponse(res);
}

// Busca productos por nombre con soporte para cancelaciones (AbortSignal).
export async function searchProducts(query, signal = null) {
  const res = await fetch(
    `${BASE_URL}/?action=product_search&q=${encodeURIComponent(query)}`,
    { credentials: "same-origin", signal },
  );

  return await handleJsonResponse(res);
}

// Crea un nuevo producto.
export function createProduct(data) {
  return postJson("product_create", data);
}

// Actualiza un producto existente.
export function updateProduct(id, data) {
  return postJson("product_update", { id: Number(id), ...data });
}

// Activa un producto.
export function activateProduct(id) {
  return postJson("product_activate", { id: Number(id) });
}

// Desactiva un producto.
export function deactivateProduct(id) {
  return postJson("product_deactivate", { id: Number(id) });
}

// Elimina un producto.
// El backend impide eliminar productos que ya fueron usados
// en servicios (consumos).
export function deleteProduct(id) {
  return postJson("product_delete", { id: Number(id) });
}

// ============================================================
// FICHAS DE SERVICIO (HISTORIAL TÉCNICO)
// ============================================================

// Guarda una nueva ficha de servicio (color, tratamiento, corte,
// general/productos) para un cliente registrado o uno sin registrar
// (client_name suelto).
export function saveServiceHistory(data) {
  return postJson("service_history_save", data);
}
