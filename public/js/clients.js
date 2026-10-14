import {
  ApiError,
  collectPages,
  fetchAppointments,
  fetchAllClients,
  fetchClientTimeline,
  createClient,
  updateClient,
  activateClient,
  deactivateClient,
  deleteClient,
  getErrorMessage,
} from "./api.js";
import { matchesSearch, slugify } from "./utils.js";
import { escapeHtml, isActive, setActiveFilter, truncate } from "./dom.js";
import {
  clearInvalidOnInput,
  createDirtyTracker,
  createFeedback,
  setBusy,
} from "./feedback.js";
import { confirmAction } from "./confirm.js";
import { notify } from "./toast.js";

const clientsState = {
  clients: [],
  filter: "todos",
  search: "",
};

let initialized = false;
let isSaving = false;
let profileRequestId = 0;
let profileAppointments = [];
let profileClient = null;
let profileOpener = null;
let modalOpener = null;
let feedback = null;
let dirty = null;

const $ = (id) => document.getElementById(id);

// ============================================================
// LISTADO
// ============================================================

function visibleClients() {
  return clientsState.clients.filter((client) => {
    const matchesFilter =
      clientsState.filter === "todos" ||
      (clientsState.filter === "activos" && isActive(client)) ||
      (clientsState.filter === "inactivos" && !isActive(client));

    // Se busca por alias y código, no por notas: las notas son texto
    // libre y con una sola letra terminarían trayendo clientes sin
    // ninguna relación real con lo buscado.
    const text = `${client.alias} ${client.internal_code || ""}`;

    return matchesFilter && matchesSearch(text, clientsState.search);
  });
}

function renderMessageRow(body, html) {
  body.innerHTML = `<tr><td colspan="5">${html}</td></tr>`;
}

function renderClientsList() {
  const body = $("clientsTableBody");
  if (!body) return;

  const clients = visibleClients();

  if (!clients.length) {
    if (clientsState.clients.length === 0) {
      renderMessageRow(
        body,
        `<div class="panel-empty" role="status">
          <div>Todavía no cargaste clientes.</div>
          <div class="panel-empty__action">
            <button type="button" class="btn btn--primary btn--sm" data-action="new">Nuevo cliente</button>
          </div>
        </div>`,
      );
    } else {
      renderMessageRow(
        body,
        '<div class="panel-empty" role="status">No hay clientes que coincidan con la búsqueda o el filtro.</div>',
      );
    }
    return;
  }

  body.innerHTML = clients
    .map((client) => {
      const active = isActive(client);
      const action = active ? "deactivate" : "activate";
      const label = active ? "Desactivar" : "Activar";
      const alias = escapeHtml(client.alias);
      const id = escapeHtml(client.id);
      const notes = client.notes
        ? `<span title="${escapeHtml(client.notes)}">${escapeHtml(truncate(client.notes))}</span>`
        : "—";

      return `
      <tr data-client-id="${id}" class="client-row">
        <td data-label="Alias"><button type="button" class="table-link" data-action="profile" data-id="${id}" aria-label="Ver perfil de ${alias}">${alias}</button></td>
        <td data-label="Código">${escapeHtml(client.internal_code || "—")}</td>
        <td data-label="Notas">${notes}</td>
        <td data-label="Estado"><span class="status-badge status-badge--${active ? "activo" : "inactivo"}">${active ? "Activo" : "Inactivo"}</span></td>
        <td data-label="Acciones"><div class="data-table__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-id="${id}" aria-label="Editar ${alias}">Editar</button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="${action}" data-id="${id}" aria-label="${label} ${alias}">${label}</button>
          <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${id}" aria-label="Eliminar ${alias}">Eliminar</button>
        </div></td>
      </tr>`;
    })
    .join("");
}

function renderLoadError(error) {
  const body = $("clientsTableBody");
  if (!body) return;

  renderMessageRow(
    body,
    `<div class="panel-error" role="alert">
      <div>${escapeHtml(getErrorMessage(error, "No se pudieron cargar los clientes."))}</div>
      <div class="panel-empty__action">
        <button type="button" class="btn btn--ghost btn--sm" data-action="retry">Reintentar</button>
      </div>
    </div>`,
  );
}

async function loadClients() {
  clientsState.clients = await collectPages(
    (page, perPage) => fetchAllClients(page, perPage),
    "clientes",
  );

  return clientsState.clients;
}

export async function loadClientsList() {
  try {
    await loadClients();
    renderClientsList();
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    renderLoadError(error);
  }
}

// Vuelve a pedir la lista; si falla, avisa sin dar por perdido el cambio.
async function refreshAfterChange() {
  try {
    await loadClients();
    renderClientsList();
  } catch (error) {
    console.error("Error al actualizar la lista de clientes:", error);
    notify.warning(
      "El cambio se guardó, pero no se pudo actualizar la lista. Recargá la sección.",
    );
  }
}

// ============================================================
// PANEL DE ALTA / EDICIÓN
// ============================================================

function showClientModal(client = null) {
  const overlay = $("clientModalOverlay");
  const panel = $("clientFormPanel");
  if (!overlay || !panel) return;

  modalOpener = document.activeElement;

  $("managedClientId").value = client?.id || "";
  $("clientAlias").value = client?.alias || "";
  $("clientCode").value = client?.internal_code || "";
  $("clientNotes").value = client?.notes || "";
  $("clientModalTitle").textContent = client
    ? "Editar cliente"
    : "Nuevo cliente";

  feedback.clear();
  feedback.clearInvalid();
  dirty.reset();

  overlay.classList.add("is-open");
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => $("clientAlias").focus({ preventScroll: true }));
}

function closeClientModal() {
  $("clientModalOverlay")?.classList.remove("is-open");
  const panel = $("clientFormPanel");
  panel?.classList.remove("is-open");
  panel?.setAttribute("aria-hidden", "true");

  if (modalOpener && modalOpener.isConnected) {
    modalOpener.focus({ preventScroll: true });
  }
  modalOpener = null;
}

// Un clic fuera del panel o Escape no deben borrar lo ya escrito.
function requestCloseClientModal() {
  if (dirty.isDirty()) {
    feedback.show(
      "warning",
      "Hay datos sin guardar. Usá Cancelar o × para descartarlos.",
      "dirty",
    );
    return;
  }

  closeClientModal();
}

function formData() {
  return {
    alias: $("clientAlias").value.trim(),
    internal_code: $("clientCode").value.trim() || null,
    notes: $("clientNotes").value.trim(),
  };
}

async function saveClient() {
  if (isSaving) return;

  feedback.clear();
  feedback.clearInvalid();

  const id = $("managedClientId").value;
  const data = formData();

  if (!data.alias) {
    feedback.invalidate(["clientAlias"]);
    feedback.show("error", "Ingresá un alias o nombre de referencia.");
    $("clientAlias").focus();
    return;
  }

  const saveButton = $("clientModalSave");
  isSaving = true;
  setBusy(saveButton, true);

  try {
    const result = id ? await updateClient(id, data) : await createClient(data);

    if (!result.success) {
      throw new ApiError(result.error || "No se pudo guardar el cliente.", {
        kind: "request",
      });
    }

    closeClientModal();
    notify.success(id ? "Cliente actualizado." : "Cliente creado.");

    await refreshAfterChange();
  } catch (error) {
    console.error("Error al guardar cliente:", error);
    feedback.show(
      "error",
      getErrorMessage(error, "No se pudo guardar el cliente."),
    );
  } finally {
    isSaving = false;
    setBusy(saveButton, false);
  }
}

// ============================================================
// HISTORIAL TÉCNICO (TIMELINE)
// ============================================================

const timelineState = {
  records: [],
  filter: "todos",
  search: "",
};

const TIMELINE_CATEGORIES = {
  general: "General",
  color: "Color",
  treatment: "Tratamiento",
  cut: "Corte",
};

// Nombres legibles de los datos técnicos guardados en cada ficha.
const FIELD_LABELS = {
  general: {
    cart_items: "Productos usados",
    session_notes: "Observaciones",
    next_visit_notes: "Para la próxima visita",
  },
  color: {
    type: "Tipo de color",
    ratio: "Proporción",
    formula: "Fórmula / tono",
    brand: "Marca / línea",
    color_grams: "Cantidad de color (g)",
    oxidant_vol: "Oxidante (vol)",
    exposure_time_min: "Exposición (min)",
    application: "Aplicación",
    result: "Resultado / corrección",
  },
  treatment: {
    type: "Tipo de tratamiento",
    product: "Producto / línea",
    quantity_ml: "Cantidad aplicada (ml)",
    iron_temp_c: "Temperatura de plancha (°C)",
    iron_passes: "Pasadas por mecha",
    processes: "Proceso realizado",
    results: "Resultado",
  },
  cut: {
    type: "Tipo de corte",
    length: "Largo / referencia",
    condition: "Condición",
    tools: "Técnicas / herramientas",
    finish: "Terminación",
  },
};

function humanizeField(field) {
  const text = String(field).replace(/_/g, " ");

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function fieldLabel(groupKey, field) {
  return FIELD_LABELS[groupKey]?.[field] ?? humanizeField(field);
}

function technicalEntries(category) {
  if (!category || typeof category !== "object" || Array.isArray(category)) {
    return [];
  }

  return Object.entries(category).filter(([, value]) => {
    if (value === null || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  });
}

function timelineGroups(details, serviceName = "") {
  const categoryKeys = Object.keys(TIMELINE_CATEGORIES);
  const nestedKeys = categoryKeys.filter(
    (key) =>
      details[key] &&
      typeof details[key] === "object" &&
      !Array.isArray(details[key]),
  );

  if (nestedKeys.length) {
    const groups = nestedKeys
      .map((key) => ({
        key,
        label: TIMELINE_CATEGORIES[key],
        entries: technicalEntries(details[key]),
      }))
      .filter((group) => group.entries.length);
    const additionalEntries = Object.entries(details).filter(
      ([key]) => !categoryKeys.includes(key),
    );
    if (additionalEntries.length) {
      groups.push({
        key: "general",
        label: "Otros datos",
        entries: additionalEntries,
      });
    }
    return groups;
  }

  const entries = technicalEntries(details);
  if (!entries.length) return [];

  const searchable = `${serviceName} ${entries.map(([key]) => key).join(" ")}`
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  let category = "general";
  if (/\b(corte|tijera|maquina|capas|bob|pixie)\b/.test(searchable)) {
    category = "cut";
  } else if (
    /\b(color|tinte|oxidante|decoloracion|matizador|formula|tono)\b/.test(
      searchable,
    )
  ) {
    category = "color";
  } else if (
    /\b(tratamiento|alisado|hidratacion|reconstruccion)\b/.test(searchable)
  ) {
    category = "treatment";
  }

  return [
    {
      key: category,
      label: TIMELINE_CATEGORIES[category] || "Datos técnicos",
      entries,
    },
  ];
}

function formatTechnicalValue(key, value) {
  if (key === "cart_items" && Array.isArray(value)) {
    return value
      .map((item) => {
        const name = item.name || `Producto ${item.product_id}`;
        const unit = item.unit ? ` ${item.unit}` : "";
        return `${name} × ${item.quantity}${unit}`;
      })
      .join(", ");
  }
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        item && typeof item === "object"
          ? formatTechnicalValue("", item)
          : String(item),
      )
      .join(", ");
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .map(
        ([field, child]) =>
          `${field.replace(/_/g, " ")}: ${formatTechnicalValue(field, child)}`,
      )
      .join(", ");
  }
  return String(value);
}

function formatProfileDate(value, includeTime = true) {
  const [date, time] = String(value ?? "").split(" ");
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return value || "Fecha no disponible";
  const formattedDate = `${day}/${month}/${year}`;
  return includeTime && time
    ? `${formattedDate} · ${time.slice(0, 5)}`
    : formattedDate;
}

function renderTimeline() {
  const container = $("clientProfileHistory");
  if (!container) return;

  const filtered = timelineState.records.filter((record) => {
    const details = record.technical_details || {};
    const groups = timelineGroups(details, record.service_name_snapshot);
    const filterCategory =
      timelineState.filter === "tratamiento"
        ? "treatment"
        : timelineState.filter === "corte"
          ? "cut"
          : timelineState.filter;
    const matchFilter =
      timelineState.filter === "todos" ||
      groups.some((group) => group.key === filterCategory);
    const searchableDetails = groups
      .flatMap((group) =>
        group.entries.flatMap(([key, value]) => [
          group.label,
          fieldLabel(group.key, key),
          formatTechnicalValue(key, value),
        ]),
      )
      .join(" ")
      .toLowerCase();
    const matchSearch =
      !timelineState.search ||
      `${record.service_name_snapshot || ""} ${searchableDetails}`.includes(
        timelineState.search.toLowerCase(),
      );

    return matchFilter && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML =
      timelineState.records.length === 0
        ? '<p class="history-empty">Todavía no hay fichas técnicas para este cliente.</p>'
        : '<p class="history-empty">No hay fichas que coincidan con la búsqueda o el filtro.</p>';
    return;
  }

  container.innerHTML = filtered
    .map((record) => {
      const details = record.technical_details || {};
      const groups = timelineGroups(details, record.service_name_snapshot)
        .map((group) => {
          return `
            <section class="timeline-category">
              <h4>${escapeHtml(group.label)}</h4>
              <dl>
                ${group.entries
                  .map(
                    ([field, value]) => `
                      <div class="timeline-field">
                        <dt>${escapeHtml(fieldLabel(group.key, field))}</dt>
                        <dd>${escapeHtml(formatTechnicalValue(field, value))}</dd>
                      </div>`,
                  )
                  .join("")}
              </dl>
            </section>`;
        })
        .join("");

      return `
        <article class="timeline-node">
          <header class="timeline-header">
            <time class="timeline-date">${escapeHtml(formatProfileDate(record.performed_at))}</time>
            <strong class="timeline-service">${escapeHtml(record.service_name_snapshot || "Ficha técnica")}</strong>
          </header>
          <div class="timeline-details">${groups || '<p class="history-empty">Sin datos técnicos.</p>'}</div>
        </article>`;
    })
    .join("");
}

function renderClientAppointments() {
  const container = $("clientProfileAppointments");
  if (!container) return;

  if (!profileAppointments.length) {
    container.innerHTML = '<p class="history-empty">Sin turnos asociados.</p>';
    return;
  }

  container.innerHTML = profileAppointments
    .map(
      (appointment) => `
        <article class="profile-appointment">
          <div class="profile-appointment__header">
            <strong>${escapeHtml(appointment.service_name || "Servicio")}</strong>
            <span class="status-badge status-badge--${slugify(appointment.status || "")}">${escapeHtml(appointment.status || "Sin estado")}</span>
          </div>
          <div class="profile-appointment__meta">
            <time>${escapeHtml(formatProfileDate(appointment.date, false))} · ${escapeHtml(String(appointment.time_start || "").slice(0, 5))}${appointment.time_end ? `–${escapeHtml(String(appointment.time_end).slice(0, 5))}` : ""}</time>
            <span>${escapeHtml(appointment.stylist || "Profesional sin asignar")}</span>
          </div>
        </article>`,
    )
    .join("");
}

function renderProfileError(container, error, fallback) {
  if (!container) return;

  container.innerHTML = `
    <p class="history-error" role="alert">${escapeHtml(getErrorMessage(error, fallback))}</p>
    <button type="button" class="btn btn--ghost btn--sm" data-action="retry-profile">Reintentar</button>`;
}

async function loadClientProfileData(client, requestId) {
  const historyContainer = $("clientProfileHistory");
  const appointmentsContainer = $("clientProfileAppointments");

  let records;
  try {
    const response = await fetchClientTimeline(client.id);
    if (!response?.success || !Array.isArray(response.data)) {
      throw new ApiError(
        response?.error || "El historial llegó con un formato inesperado.",
        { kind: "invalid-response" },
      );
    }
    if (requestId !== profileRequestId) return;
    records = response.data;
    timelineState.records = records;
    renderTimeline();
  } catch (error) {
    if (requestId !== profileRequestId) return;
    console.error("Error al cargar historial técnico:", error);
    renderProfileError(
      historyContainer,
      error,
      "No se pudo cargar el historial técnico.",
    );
    renderProfileError(
      appointmentsContainer,
      error,
      "No se pudieron cargar los turnos asociados.",
    );
    return;
  }

  const appointmentIds = new Set(
    records
      .map((record) => Number(record.appointment_id))
      .filter((id) => Number.isSafeInteger(id) && id > 0),
  );
  const dates = [
    ...new Set(
      records
        .filter((record) => appointmentIds.has(Number(record.appointment_id)))
        .map((record) => String(record.performed_at || "").slice(0, 10))
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
    ),
  ];

  try {
    const appointmentsByDate = await Promise.all(
      dates.map((date) => fetchAppointments(date)),
    );
    if (requestId !== profileRequestId) return;

    profileAppointments = appointmentsByDate
      .flat()
      .filter(
        (appointment) =>
          appointmentIds.has(Number(appointment.id)) &&
          String(appointment.client_id) === String(client.id),
      )
      .sort((a, b) =>
        `${b.date} ${b.time_start}`.localeCompare(`${a.date} ${a.time_start}`),
      );
    renderClientAppointments();
  } catch (error) {
    if (requestId !== profileRequestId) return;
    console.error("Error al cargar turnos del cliente:", error);
    renderProfileError(
      appointmentsContainer,
      error,
      "No se pudieron cargar los turnos asociados.",
    );
  }
}

function initTimelineEvents() {
  $("historySearch")?.addEventListener("input", (event) => {
    timelineState.search = event.target.value.trim();
    renderTimeline();
  });

  // Filtros del historial
  const historyButtons = Array.from(
    document.querySelectorAll("#historyFilters .btn-filter"),
  );

  historyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      timelineState.filter = button.dataset.historyFilter;
      setActiveFilter(historyButtons, button);
      renderTimeline();
    });
  });
}

// ============================================================
// PERFIL DEL CLIENTE
// ============================================================

function closeClientProfile() {
  profileRequestId += 1;
  const panel = $("clientProfilePanel");
  const overlay = $("clientProfileOverlay");
  const tableBody = $("clientsTableBody");

  panel?.classList.remove("is-open");
  panel?.setAttribute("aria-hidden", "true");
  overlay?.classList.remove("is-open");

  if (tableBody) {
    tableBody
      .querySelectorAll("tr[data-client-id]")
      .forEach((row) => row.classList.remove("client-row--selected"));
  }

  if (profileOpener && profileOpener.isConnected) {
    profileOpener.focus({ preventScroll: true });
  }
  profileOpener = null;
  profileClient = null;
}

function openClientProfile(client) {
  const panel = $("clientProfilePanel");
  const overlay = $("clientProfileOverlay");

  if (!panel || !client) return;

  profileOpener = document.activeElement;
  profileClient = client;

  const active = isActive(client);
  $("clientProfileName").textContent = client.alias || "Cliente";
  $("clientProfileCode").textContent = client.internal_code || "Sin código";

  const status = $("clientProfileStatus");
  status.textContent = active ? "Activo" : "Inactivo";
  status.className = `status-badge status-badge--${active ? "activo" : "inactivo"}`;

  $("clientProfileNotes").textContent =
    client.notes || "Sin notas permanentes.";
  $("clientProfileBase").textContent = client.natural_base_tone || "—";
  $("clientProfileHair").textContent = client.hair_type || "—";
  $("clientProfileGrey").textContent =
    client.grey_hair === null ||
    client.grey_hair === undefined ||
    client.grey_hair === ""
      ? "—"
      : `${client.grey_hair}%`;
  $("clientProfileAllergies").textContent = client.allergies || "—";

  $("clientProfileAvatar").textContent = String(client.alias || "C")
    .trim()
    .toUpperCase()
    .slice(0, 2);

  const tableBody = $("clientsTableBody");
  if (tableBody) {
    tableBody
      .querySelectorAll("tr[data-client-id]")
      .forEach((row) =>
        row.classList.toggle(
          "client-row--selected",
          String(row.dataset.clientId) === String(client.id),
        ),
      );
  }

  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  overlay?.classList.add("is-open");

  timelineState.records = [];
  timelineState.filter = "todos";
  timelineState.search = "";
  profileAppointments = [];
  $("historySearch").value = "";

  const historyButtons = Array.from(
    document.querySelectorAll("#historyFilters .btn-filter"),
  );
  setActiveFilter(
    historyButtons,
    historyButtons.find((button) => button.dataset.historyFilter === "todos"),
  );

  $("clientProfileHistory").innerHTML =
    '<p class="history-placeholder" role="status">Cargando historial técnico...</p>';
  $("clientProfileAppointments").innerHTML =
    '<p class="history-placeholder" role="status">Cargando turnos...</p>';

  profileRequestId += 1;
  void loadClientProfileData(client, profileRequestId);

  requestAnimationFrame(() => panel.focus({ preventScroll: true }));
}

// "Editar perfil": cierra el perfil y abre el formulario del cliente.
function editProfileClient() {
  const client = profileClient;
  if (!client) return;

  closeClientProfile();
  showClientModal(client);
}

// "Nuevo turno": va a la agenda y abre el formulario con el cliente elegido.
function scheduleForProfileClient() {
  const client = profileClient;
  if (!client) return;

  closeClientProfile();

  document.querySelector('.nav-item[data-view="appointments"]')?.click();
  document.dispatchEvent(
    new CustomEvent("appointment:new", { detail: { client } }),
  );
}

// ============================================================
// ACCIONES DE LA TABLA
// ============================================================

async function runAction(button, task, successMessage, failureMessage) {
  setBusy(button, true);

  try {
    const result = await task();

    if (!result.success) {
      throw new ApiError(result.error || failureMessage, { kind: "request" });
    }

    notify.success(successMessage);
    await refreshAfterChange();
  } catch (error) {
    console.error(failureMessage, error);
    notify.error(getErrorMessage(error, failureMessage));
  } finally {
    setBusy(button, false);
  }
}

async function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");

  // Un clic en cualquier parte de la fila abre el perfil.
  if (!button) {
    const row = event.target.closest("tr[data-client-id]");
    if (!row) return;

    const client = clientsState.clients.find(
      (item) => String(item.id) === row.dataset.clientId,
    );
    if (client) {
      openClientProfile(client);
    }
    return;
  }

  const action = button.dataset.action;

  if (action === "new") {
    showClientModal();
    return;
  }

  if (action === "retry") {
    await loadClientsList();
    return;
  }

  const id = button.dataset.id;
  const client = clientsState.clients.find((item) => String(item.id) === id);

  if (!client) return;

  if (action === "profile") {
    openClientProfile(client);
    return;
  }

  if (action === "edit") {
    showClientModal(client);
    return;
  }

  if (action === "delete") {
    const confirmed = await confirmAction({
      title: "Eliminar cliente",
      message: `Vas a eliminar a «${client.alias}». Esta acción no se puede deshacer. Si ya tiene turnos asociados no se podrá eliminar: en ese caso desactivalo.`,
      confirmLabel: "Eliminar",
      danger: true,
    });

    if (!confirmed) return;

    await runAction(
      button,
      () => deleteClient(id),
      "Cliente eliminado.",
      "No se pudo eliminar el cliente.",
    );
    return;
  }

  if (action === "activate") {
    await runAction(
      button,
      () => activateClient(id),
      "Cliente activado.",
      "No se pudo activar el cliente.",
    );
    return;
  }

  if (action === "deactivate") {
    await runAction(
      button,
      () => deactivateClient(id),
      "Cliente desactivado.",
      "No se pudo desactivar el cliente.",
    );
  }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

export function initClients() {
  if (initialized) return;
  initialized = true;
  initTimelineEvents();

  const panel = $("clientFormPanel");

  if (panel) {
    feedback = createFeedback(panel);
    dirty = createDirtyTracker(panel);
    clearInvalidOnInput(panel);
    panel.addEventListener("input", () => feedback.clear("dirty"));
  } else {
    // Sin el panel no hay formulario: se evitan errores al abrirlo.
    feedback = { show() {}, clear() {}, invalidate() {}, clearInvalid() {} };
    dirty = { reset() {}, isDirty: () => false };
  }

  $("btnAddClient")?.addEventListener("click", () => showClientModal());

  $("clientListSearch")?.addEventListener("input", (event) => {
    clientsState.search = event.target.value;
    renderClientsList();
  });

  $("clientsTableBody")?.addEventListener("click", handleTableAction);

  // Perfil
  $("clientProfileClose")?.addEventListener("click", closeClientProfile);
  $("clientProfileOverlay")?.addEventListener("click", closeClientProfile);
  $("clientProfileEdit")?.addEventListener("click", editProfileClient);
  $("clientProfileSchedule")?.addEventListener(
    "click",
    scheduleForProfileClient,
  );

  // Reintentar la carga del historial
  $("clientProfilePanel")?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-action='retry-profile']")) return;
    if (!profileClient) return;

    $("clientProfileHistory").innerHTML =
      '<p class="history-placeholder" role="status">Cargando historial técnico...</p>';
    $("clientProfileAppointments").innerHTML =
      '<p class="history-placeholder" role="status">Cargando turnos...</p>';

    profileRequestId += 1;
    void loadClientProfileData(profileClient, profileRequestId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if ($("clientProfilePanel")?.classList.contains("is-open")) {
      closeClientProfile();
      return;
    }

    if ($("clientFormPanel")?.classList.contains("is-open")) {
      requestCloseClientModal();
    }
  });

  // Filtros de estado
  const filterButtons = Array.from(
    document.querySelectorAll("#viewClients .btn-filter[data-filter]"),
  );

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      clientsState.filter = button.dataset.filter;
      setActiveFilter(filterButtons, button);
      renderClientsList();
    });
  });

  $("clientModalClose")?.addEventListener("click", closeClientModal);
  $("clientModalCancel")?.addEventListener("click", closeClientModal);
  $("clientModalOverlay")?.addEventListener("click", requestCloseClientModal);

  $("clientForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveClient();
  });
}
