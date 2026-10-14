// Servicio de llamadas API (Modelo)

import { BASE_URL } from "./config.js";

// ============================================================
// ERRORES
// ============================================================

// Tiempo máximo de espera de una petición antes de darla por perdida.
const DEFAULT_TIMEOUT_MS = 15000;

// Error de la capa de red con un mensaje apto para mostrar al usuario.
//  kind:
//   - "network"          no hubo conexión con el servidor
//   - "timeout"          el servidor tardó demasiado
//   - "session"          la sesión venció o no existe
//   - "invalid-response" el servidor respondió algo inesperado
//   - "server"           error interno del servidor (HTTP 5xx)
//   - "request"          el servidor rechazó la solicitud (HTTP 4xx o success:false)
export class ApiError extends Error {
  constructor(message, { kind = "server", status = 0, cause = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;

    if (cause) {
      this.cause = cause;
    }
  }
}

// Indica si el error proviene de una cancelación pedida con AbortController.
export function isAbortError(error) {
  return error?.name === "AbortError";
}

// Devuelve un mensaje seguro para mostrar. Los errores que no provienen de
// la capa de red (fallos de programación) nunca exponen su texto interno.
export function getErrorMessage(
  error,
  fallback = "Ocurrió un error inesperado. Intentá de nuevo.",
) {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

function messageForStatus(status) {
  if (status === 401) return "La sesión expiró. Volvé a iniciar sesión.";
  if (status === 403) return "No tenés permiso para realizar esta acción.";
  if (status === 404) return "No se encontró lo que estabas buscando.";
  if (status === 429) {
    return "Hay demasiadas solicitudes. Esperá un momento e intentá de nuevo.";
  }
  if (status >= 500) {
    return "El servidor tuvo un problema. Intentá de nuevo en unos minutos.";
  }

  return `No se pudo completar la solicitud (código ${status}).`;
}

// ============================================================
// SESIÓN
// ============================================================

// Redirige a la pantalla de login cuando la sesión ya no es válida.
function redirectToLogin() {
  window.location.replace(new URL("login.php", window.location.href));
}

// ============================================================
// PETICIONES: FUNCIÓN CENTRAL
// ============================================================

// Ejecuta fetch con tiempo máximo y cancelación opcional.
// Una cancelación pedida por quien llama se propaga como AbortError;
// el resto de los fallos se convierten en ApiError.
async function request(
  url,
  {
    method = "GET",
    headers = {},
    body,
    cache,
    signal = null,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {},
) {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", forwardAbort, { once: true });
    }
  }

  try {
    return await fetch(url, {
      method,
      headers,
      body,
      cache,
      credentials: "same-origin",
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new ApiError(
        "El servidor tardó demasiado en responder. Intentá de nuevo.",
        { kind: "timeout", cause: error },
      );
    }

    if (signal?.aborted) {
      throw error;
    }

    throw new ApiError(
      "No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.",
      { kind: "network", cause: error },
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

// Valida la respuesta del servidor y convierte el JSON recibido.
async function handleJsonResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = Boolean(
    contentType && contentType.includes("application/json"),
  );

  if (!response.ok) {
    // Sesión vencida o inexistente: volver al login.
    if (response.status === 401) {
      redirectToLogin();
    }

    let serverMessage = "";

    if (isJson) {
      try {
        serverMessage = (await response.json()).error || "";
      } catch {
        serverMessage = "";
      }
    } else {
      console.error("Error del servidor (texto plano):", await response.text());
    }

    throw new ApiError(serverMessage || messageForStatus(response.status), {
      kind:
        response.status === 401
          ? "session"
          : response.status >= 500
            ? "server"
            : "request",
      status: response.status,
    });
  }

  if (!isJson) {
    const rawText = await response.text();

    console.group("Respuesta no JSON detectada");
    console.error("Se esperaba JSON pero se recibió otra cosa.");
    console.warn("Contenido bruto del backend:\n", rawText);
    console.groupEnd();

    throw new ApiError(
      "El servidor devolvió una respuesta inesperada. Intentá de nuevo en unos minutos.",
      { kind: "invalid-response", status: response.status },
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ApiError(
      "El servidor devolvió una respuesta inesperada. Intentá de nuevo en unos minutos.",
      { kind: "invalid-response", status: response.status, cause: error },
    );
  }
}

// ============================================================
// TOKEN CSRF
// ============================================================

// Token CSRF en memoria. Se pide una sola vez al servidor y se reutiliza.
let csrfTokenPromise = null;

function resetCsrfToken() {
  csrfTokenPromise = null;
}

// Obtiene el token CSRF de la sesión activa.
async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = request(`${BASE_URL}/?action=session`, {
      cache: "no-store",
    })
      .then(handleJsonResponse)
      .then((data) => {
        if (!data.authenticated || !data.csrf_token) {
          redirectToLogin();
          throw new ApiError("La sesión expiró. Volvé a iniciar sesión.", {
            kind: "session",
          });
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
// PETICIONES GET Y POST
// ============================================================

// Arma la URL de una acción con sus parámetros.
function endpoint(action, params = {}) {
  const query = new URLSearchParams({ action });

  Object.entries(params).forEach(([key, value]) => {
    query.set(key, String(value));
  });

  return `${BASE_URL}/?${query.toString()}`;
}

// Consulta una acción de solo lectura y devuelve el JSON.
async function getJson(action, params = {}, signal = null) {
  const response = await request(endpoint(action, params), { signal });
  return handleJsonResponse(response);
}

// Envía una petición POST en JSON incluyendo el token CSRF.
// Si el servidor rechaza el token (por ejemplo, tras renovarse la
// sesión), lo vuelve a pedir y reintenta una única vez.
async function postJson(action, data = {}, signal = null) {
  const send = async () =>
    request(endpoint(action), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": await getCsrfToken(),
      },
      body: JSON.stringify(data),
      signal,
    });

  let response = await send();

  if (response.status === 403) {
    let message = "";

    try {
      message = (await response.clone().json()).error || "";
    } catch {
      // Respuesta sin JSON: no es un error de token.
    }

    if (message.includes("CSRF")) {
      resetCsrfToken();
      response = await send();
    }
  }

  return handleJsonResponse(response);
}

// ============================================================
// TURNOS
// ============================================================

// Obtiene los turnos de una fecha determinada.
// Permite filtrar por búsqueda y estado.
export function fetchAppointments(date, search = "", status = "todos") {
  return getJson("list", { date, search, status });
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
export function fetchTimelineHistory(id) {
  return getJson("history", { id });
}

// Elimina un turno por su ID.
export function removeAppointment(id) {
  return postJson("delete", { id: Number(id) });
}

// ============================================================
// SERVICIOS
// ============================================================

// Obtiene la lista de servicios activos disponibles en la peluquería.
export function fetchServices() {
  return getJson("services");
}

// Obtiene todos los servicios, activos e inactivos.
// Se utiliza en el panel administrativo.
export function fetchAllServices(page = 1, perPage = 100) {
  return getJson("services_all", { page, per_page: perPage });
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

// Recorre todas las páginas de un listado paginado ({ data, per_page, total }).
// fetchPage(page, perPage) debe devolver la respuesta de una página.
export async function collectPages(fetchPage, label = "datos") {
  const invalid = () =>
    new ApiError(`La lista de ${label} llegó con un formato inesperado.`, {
      kind: "invalid-response",
    });

  const firstPage = await fetchPage(1);

  if (!Array.isArray(firstPage?.data)) {
    throw invalid();
  }

  const perPage = Number(firstPage.per_page) || firstPage.data.length || 100;
  const total = Number(firstPage.total);
  const totalPages = Number.isFinite(total) ? Math.ceil(total / perPage) : 1;

  if (totalPages <= 1) {
    return [...firstPage.data];
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchPage(index + 2, perPage),
    ),
  );

  remainingPages.forEach((page) => {
    if (!Array.isArray(page?.data)) {
      throw invalid();
    }
  });

  return [firstPage, ...remainingPages].flatMap((page) => page.data);
}

// Obtiene todos los clientes activos recorriendo todas las páginas.
export function fetchClients() {
  return collectPages(
    (page, perPage) => fetchAllClients(page, perPage, "activos"),
    "clientes",
  );
}

// Obtiene todos los clientes, activos e inactivos.
// Se utiliza en el panel administrativo.
export function fetchAllClients(page = 1, perPage = 100, filter = "todos") {
  return getJson("clients_all", { page, per_page: perPage, filter });
}

// Obtiene la línea de tiempo técnica de un cliente.
export function fetchClientTimeline(clientId) {
  return getJson("client_timeline", { client_id: clientId });
}

// Busca clientes por alias con soporte para cancelaciones (AbortSignal).
export function searchClients(query, signal = null) {
  return getJson("client_search", { q: query }, signal);
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
export function fetchAllProducts(
  search = "",
  filter = "todos",
  signal = null,
  page = 1,
  perPage = 100,
) {
  return getJson(
    "products_all",
    { q: search, filter, page, per_page: perPage },
    signal,
  );
}

// Busca productos por nombre con soporte para cancelaciones (AbortSignal).
export function searchProducts(query, signal = null) {
  return getJson("product_search", { q: query }, signal);
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
