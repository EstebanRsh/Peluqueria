// ============================================================
// API
// Toda la comunicación con el servidor: pedidos con tiempo máximo, token CSRF,
// errores ApiError y una función por cada acción del backend.
// ============================================================

import { BASE_URL } from "./config.js";

// ============================================================
// ERRORES
// ============================================================

const DEFAULT_TIMEOUT_MS = 15000;

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

export function isAbortError(error) {
  return error?.name === "AbortError";
}

export function getErrorMessage(
  error,
  fallback = "Ocurrió un error inesperado. Intentá de nuevo.",
) {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

const EXPECTED_ERRORS = ["request", "network", "timeout", "session"];

export function logError(context, error) {
  if (
    isAbortError(error) ||
    (error instanceof ApiError && EXPECTED_ERRORS.includes(error.kind))
  ) {
    return;
  }

  const detail = error instanceof ApiError ? error.status || error.kind : "código";

  console.error(`${context} (${detail})`);
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

function redirectToLogin() {
  window.location.replace(new URL("login.php?expired=1", window.location.href));
}

// ============================================================
// PETICIONES: FUNCIÓN CENTRAL
// ============================================================

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

async function handleJsonResponse(response, { redirectOn401 = true } = {}) {
  const contentType = response.headers.get("content-type");
  const isJson = Boolean(
    contentType && contentType.includes("application/json"),
  );

  if (!response.ok) {
    if (response.status === 401 && redirectOn401) {
      redirectToLogin();
    }

    let serverMessage = "";

    if (isJson) {
      try {
        serverMessage = (await response.json()).error || "";
      } catch {
        serverMessage = "";
      }
    }

    const message = serverMessage.includes("CSRF")
      ? "Tu sesión cambió. Recargá la página e intentá de nuevo."
      : serverMessage;

    throw new ApiError(message || messageForStatus(response.status), {
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

let csrfTokenPromise = null;

function resetCsrfToken() {
  csrfTokenPromise = null;
}

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
        csrfTokenPromise = null;
        throw error;
      });
  }

  return csrfTokenPromise;
}

// ============================================================
// PETICIONES GET Y POST
// ============================================================

function endpoint(action, params = {}) {
  const query = new URLSearchParams({ action });

  Object.entries(params).forEach(([key, value]) => {
    query.set(key, String(value));
  });

  return `${BASE_URL}/?${query.toString()}`;
}

async function getJson(action, params = {}, signal = null) {
  const response = await request(endpoint(action, params), { signal });
  return handleJsonResponse(response);
}

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
    }

    if (message.includes("CSRF")) {
      resetCsrfToken();
      response = await send();
    }
  }

  return handleJsonResponse(response);
}

// ============================================================
// ACCESO (LOGIN, REGISTRO, SESIÓN Y LOGOUT)
// ============================================================

async function publicJson(action, data = null, headers = {}) {
  const response = await request(endpoint(action), {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json", ...headers } : {},
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });

  return handleJsonResponse(response, { redirectOn401: false });
}

export function fetchSession() {
  return publicJson("session");
}

export function loginUser(credentials) {
  return publicJson("login", credentials);
}

export function registerUser(credentials, csrfToken = null) {
  return publicJson(
    "register",
    credentials,
    csrfToken ? { "X-CSRF-Token": csrfToken } : {},
  );
}

export function logoutUser() {
  return postJson("logout", {});
}

export function fetchAccount() {
  return getJson("account");
}

export function fetchAccountExport() {
  return getJson("account_export");
}

export function importAccountData(data) {
  return postJson("account_import", { data });
}

export async function fetchLegalPage(page) {
  const response = await request(`${BASE_URL}/${page}.php`);

  if (!response.ok) {
    throw new ApiError(messageForStatus(response.status), {
      kind: response.status >= 500 ? "server" : "request",
      status: response.status,
    });
  }

  return response.text();
}

export function deleteAccount(password, confirmation) {
  return postJson("account_delete", { password, confirmation });
}

export function changePassword(data) {
  return postJson("change_password", data);
}

// ============================================================
// LISTADOS PAGINADOS (CLIENTES, SERVICIOS Y PRODUCTOS)
// ============================================================

export const LIST_PAGE_SIZE = 25;

function fetchListPage(
  action,
  { search = "", filter = "todos", page = 1, perPage = LIST_PAGE_SIZE, signal = null },
) {
  return getJson(
    action,
    { q: search, filter, page, per_page: perPage },
    signal,
  );
}

// ============================================================
// TURNOS
// ============================================================

export function fetchAppointments(date, search = "", status = "todos") {
  return getJson("list", { date, search, status });
}

export function createAppointment(data) {
  return postJson("create", data);
}

export function updateAppointment(data) {
  return postJson("update", data);
}

export function updateAppointmentStatus(id, targetStatus) {
  return postJson("update_status", {
    id: Number(id),
    status: targetStatus,
  });
}

export function fetchTimelineHistory(id) {
  return getJson("history", { id });
}

export function removeAppointment(id) {
  return postJson("delete", { id: Number(id) });
}

// ============================================================
// SERVICIOS
// ============================================================

export function searchServices(query, signal = null) {
  return getJson("services", { q: query }, signal);
}

export function fetchAllServices(params) {
  return fetchListPage("services_all", params);
}

export function createService(data) {
  return postJson("service_create", data);
}

export function updateService(id, data) {
  return postJson("service_update", { id: Number(id), ...data });
}

export function activateService(id) {
  return postJson("service_activate", { id: Number(id) });
}

export function deactivateService(id) {
  return postJson("service_deactivate", { id: Number(id) });
}

export function deleteService(id) {
  return postJson("service_delete", { id: Number(id) });
}

// ============================================================
// CLIENTES
// ============================================================

export function fetchAllClients(params) {
  return fetchListPage("clients_all", params);
}

export function fetchClientTimeline(clientId) {
  return getJson("client_timeline", { client_id: clientId });
}

export function searchClients(query, signal = null) {
  return getJson("client_search", { q: query }, signal);
}

export function createClient(data) {
  return postJson("client_create", data);
}

export function updateClient(id, data) {
  return postJson("client_update", { id: Number(id), ...data });
}

export function activateClient(id) {
  return postJson("client_activate", { id: Number(id) });
}

export function deactivateClient(id) {
  return postJson("client_deactivate", { id: Number(id) });
}

export function deleteClient(id) {
  return postJson("client_delete", { id: Number(id) });
}

// ============================================================
// PRODUCTOS
// ============================================================

export function fetchAllProducts(params) {
  return fetchListPage("products_all", params);
}

export function searchProducts(query, signal = null) {
  return getJson("product_search", { q: query }, signal);
}

export function createProduct(data) {
  return postJson("product_create", data);
}

export function updateProduct(id, data) {
  return postJson("product_update", { id: Number(id), ...data });
}

export function activateProduct(id) {
  return postJson("product_activate", { id: Number(id) });
}

export function deactivateProduct(id) {
  return postJson("product_deactivate", { id: Number(id) });
}

export function deleteProduct(id) {
  return postJson("product_delete", { id: Number(id) });
}

// ============================================================
// FICHAS DE SERVICIO (HISTORIAL TÉCNICO)
// ============================================================

export function saveServiceHistory(data) {
  return postJson("service_history_save", data);
}
