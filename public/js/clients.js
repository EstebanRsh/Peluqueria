// ============================================================
// CLIENTES
// Listado, alta, edición y perfil de clientes con su historial técnico y sus turnos.
// ============================================================

import {
  ApiError,
  fetchAllClients,
  fetchClientAppointments,
  fetchClientTimeline,
  createClient,
  updateClient,
  activateClient,
  deactivateClient,
  deleteClient,
  getErrorMessage,
  isAbortError,
  logError,
} from "./api.js";
import { RECORD_STATUS } from "./constants.js";
import { displayStatus, formatTime, slugify } from "./utils.js";
import {
  $,
  escapeHtml,
  isActive,
  restoreFocus,
  setActiveFilter,
  truncate,
} from "./dom.js";
import {
  clearInvalidOnInput,
  createDirtyTracker,
  createDrawer,
  createFeedback,
  setBusy,
  setSearching,
} from "./feedback.js";
import {
  bindRowDialog,
  createListLoader,
  isCompactView,
  debounce,
  loadErrorHtml,
  moreRowHtml,
  refreshAfterChange,
  renderMessageRow,
  rowActionsHtml,
  rowToggleHtml,
  runTableAction,
  statusBadgeHtml,
} from "./list.js";
import { confirmAction, showError, showResult } from "./confirm.js";

const list = createListLoader(fetchAllClients, $("clientListSearch"));

let isSaving = false;
let profileRequestId = 0;
let profileAppointments = [];
let profileAppointmentsPage = 1;
let profileAppointmentsTotal = 0;
let profileClient = null;
let profileOpener = null;
let feedback = null;
let dirty = null;
let drawer = null;

// ============================================================
// LISTADO
// ============================================================

function renderClientsList() {
  const body = $("clientsTableBody");
  if (!body) return;

  const clients = list.state.items;

  if (!clients.length) {
    if (list.isPristine()) {
      renderMessageRow(
        body,
        5,
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
        5,
        '<div class="panel-empty" role="status">No hay clientes que coincidan con la búsqueda o el filtro.</div>',
      );
    }
    return;
  }

  body.innerHTML = clients
    .map((client) => {
      const active = isActive(client);
      const alias = escapeHtml(client.alias);
      const id = escapeHtml(client.id);
      const notes = client.notes
        ? `<span title="${escapeHtml(client.notes)}">${escapeHtml(truncate(client.notes))}</span>`
        : "—";

      return `
      <tr data-client-id="${id}" class="client-row">
        <td data-label="Alias" class="cell-primary"><button type="button" class="table-link" data-action="profile" data-id="${id}" aria-label="Ver perfil de ${alias}">${alias}</button>${rowToggleHtml(client.alias, client.id)}</td>
        <td data-label="Código" class="cell-primary">${escapeHtml(client.internal_code || "—")}</td>
        <td data-label="Estado">${statusBadgeHtml(active)}</td>
        <td data-label="Notas">${notes}</td>
        <td data-label="Acciones">${rowActionsHtml(client.id, client.alias, active, { profile: true })}</td>
      </tr>`;
    })
    .join("")
    .concat(list.hasMore() ? moreRowHtml(5) : "");
}

function renderLoadError(error) {
  const body = $("clientsTableBody");
  if (!body) return;

  renderMessageRow(
    body,
    5,
    loadErrorHtml(error, "No se pudieron cargar los clientes."),
  );
}

export async function loadClientsList({ append = false } = {}) {
  try {
    if (await list.load({ append })) renderClientsList();
  } catch (error) {
    logError("Error al cargar clientes:", error);

    if (append) {
      showError(getErrorMessage(error, "No se pudieron cargar más clientes."));
    } else {
      renderLoadError(error);
    }
  }
}

// ============================================================
// PANEL DE ALTA / EDICIÓN
// ============================================================

function showClientModal(client = null) {
  $("managedClientId").value = client?.id || "";
  $("clientAlias").value = client?.alias || "";
  $("clientCode").value = client?.internal_code || "";
  $("clientNotes").value = client?.notes || "";
  $("clientModalTitle").textContent = client
    ? "Editar cliente"
    : "Nuevo cliente";

  feedback.clearInvalid();
  dirty.reset();

  drawer.open($("clientAlias"));
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

  feedback.clearInvalid();

  const id = $("managedClientId").value;
  const data = formData();

  if (!data.alias) {
    feedback.invalidate(["clientAlias"]);
    feedback.focusInvalid();
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

    drawer.close();
    showResult(
      "success",
      id ? "Cliente actualizado" : "Cliente creado",
      id
        ? "Los cambios ya están guardados."
        : "Ya podés agendarle turnos y cargar sus fichas.",
    );

    await refreshAfterChange(list, renderClientsList);
  } catch (error) {
    logError("Error al guardar cliente:", error);
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
  page: 1,
  total: 0,
  totalRecords: 0,
};

let timelineController = null;

function formatProfileDate(value, includeTime = true) {
  const [date, time] = String(value ?? "").split(" ");
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return value || "Fecha no disponible";
  const formattedDate = `${day}/${month}/${year}`;
  return includeTime && time
    ? `${formattedDate} · ${formatTime(time)}`
    : formattedDate;
}

function renderTimeline() {
  const container = $("clientProfileHistory");
  if (!container) return;

  if (timelineState.records.length === 0) {
    container.innerHTML =
      timelineState.totalRecords === 0
        ? '<p class="history-empty">Todavía no hay fichas técnicas para este cliente.</p>'
        : '<p class="history-empty">No hay fichas que coincidan con la búsqueda o el filtro.</p>';
    return;
  }

  container.innerHTML = timelineState.records
    .map((record) => {
      const groups = record.groups
        .map(
          (group) => `
            <section class="timeline-category">
              <h4>${escapeHtml(group.label)}</h4>
              <dl>
                ${group.fields
                  .map(
                    (field) => `
                      <div class="timeline-field">
                        <dt>${escapeHtml(field.label)}</dt>
                        <dd>${escapeHtml(field.value)}</dd>
                      </div>`,
                  )
                  .join("")}
              </dl>
            </section>`,
        )
        .join("");

      return `
        <article class="timeline-node">
          <header class="timeline-header">
            <time class="timeline-date">${escapeHtml(record.date_label)}</time>
            <strong class="timeline-service">${escapeHtml(record.service)}</strong>
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
            <span class="status-badge status-badge--${slugify(displayStatus(appointment) || "")}">${escapeHtml(displayStatus(appointment) || "Sin estado")}</span>
          </div>
          <div class="profile-appointment__meta">
            <time>${escapeHtml(formatProfileDate(appointment.date, false))} · ${escapeHtml(formatTime(appointment.time_start))}${appointment.time_end ? `–${escapeHtml(formatTime(appointment.time_end))}` : ""}</time>
            <span>${escapeHtml(appointment.stylist || "Sin asignar")}</span>
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

function reloadProfileData(client) {
  $("clientProfileHistory").innerHTML =
    '<p class="history-placeholder" role="status">Cargando historial técnico…</p>';
  $("clientProfileAppointments").innerHTML =
    '<p class="history-placeholder" role="status">Cargando turnos…</p>';

  profileRequestId += 1;
  void loadClientProfileData(client, profileRequestId);
}

async function loadClientProfileData(client, requestId) {
  await Promise.all([
    loadProfileTimeline(client, requestId),
    loadProfileAppointments(client, requestId),
  ]);
}

async function fetchTimelinePage(client, page, signal) {
  const response = await fetchClientTimeline(client.id, {
    search: timelineState.search,
    category: timelineState.filter,
    page,
    signal,
  });

  if (!response?.success || !Array.isArray(response.data)) {
    throw new ApiError(
      response?.error || "El historial llegó con un formato inesperado.",
      { kind: "invalid-response" },
    );
  }

  return response;
}

function updateTimelineMore() {
  const more = $("clientProfileHistoryMore");
  if (more) more.hidden = timelineState.records.length >= timelineState.total;
}

async function loadProfileTimeline(client, requestId) {
  timelineController?.abort();
  timelineController = new AbortController();

  const controller = timelineController;

  timelineState.page = 1;
  timelineState.total = 0;
  updateTimelineMore();

  try {
    const response = await fetchTimelinePage(client, 1, controller.signal);
    if (requestId !== profileRequestId) return;
    timelineState.records = response.data;
    timelineState.total = Number(response.total) || 0;
    timelineState.totalRecords = Number(response.total_records) || 0;
    renderTimeline();
    updateTimelineMore();
  } catch (error) {
    if (isAbortError(error) || requestId !== profileRequestId) return;
    logError("Error al cargar historial técnico:", error);
    renderProfileError(
      $("clientProfileHistory"),
      error,
      "No se pudo cargar el historial técnico.",
    );
  } finally {
    if (controller === timelineController) {
      setSearching($("historySearch"), false);
    }
  }
}

async function loadMoreTimeline(button) {
  if (!profileClient || !timelineController) return;

  const requestId = profileRequestId;
  const { signal } = timelineController;
  setBusy(button, true);

  try {
    const response = await fetchTimelinePage(
      profileClient,
      timelineState.page + 1,
      signal,
    );
    if (requestId !== profileRequestId || signal.aborted) return;
    timelineState.page += 1;
    timelineState.records = [...timelineState.records, ...response.data];
    timelineState.total = Number(response.total) || timelineState.records.length;
    renderTimeline();
  } catch (error) {
    if (isAbortError(error) || requestId !== profileRequestId) return;
    logError("Error al cargar más fichas del cliente:", error);
    showError(getErrorMessage(error, "No se pudieron cargar más fichas."));
  } finally {
    setBusy(button, false);
    updateTimelineMore();
  }
}

function reloadTimeline() {
  if (profileClient) {
    void loadProfileTimeline(profileClient, profileRequestId);
  }
}

async function fetchProfileAppointmentsPage(client, page) {
  const response = await fetchClientAppointments(client.id, page);

  if (!Array.isArray(response?.data)) {
    throw new ApiError("Los turnos llegaron con un formato inesperado.", {
      kind: "invalid-response",
    });
  }

  return response;
}

function updateProfileAppointmentsMore() {
  const more = $("clientProfileAppointmentsMore");
  if (more) more.hidden = profileAppointments.length >= profileAppointmentsTotal;
}

async function loadProfileAppointments(client, requestId) {
  profileAppointmentsPage = 1;
  profileAppointmentsTotal = 0;
  updateProfileAppointmentsMore();

  try {
    const response = await fetchProfileAppointmentsPage(client, 1);
    if (requestId !== profileRequestId) return;
    profileAppointments = response.data;
    profileAppointmentsTotal = Number(response.total) || response.data.length;
    renderClientAppointments();
    updateProfileAppointmentsMore();
  } catch (error) {
    if (requestId !== profileRequestId) return;
    logError("Error al cargar turnos del cliente:", error);
    renderProfileError(
      $("clientProfileAppointments"),
      error,
      "No se pudieron cargar los turnos del cliente.",
    );
  }
}

async function loadMoreProfileAppointments(button) {
  if (!profileClient) return;

  const requestId = profileRequestId;
  setBusy(button, true);

  try {
    const response = await fetchProfileAppointmentsPage(
      profileClient,
      profileAppointmentsPage + 1,
    );
    if (requestId !== profileRequestId) return;
    profileAppointmentsPage += 1;
    profileAppointments = [...profileAppointments, ...response.data];
    profileAppointmentsTotal =
      Number(response.total) || profileAppointments.length;
    renderClientAppointments();
  } catch (error) {
    if (requestId !== profileRequestId) return;
    logError("Error al cargar más turnos del cliente:", error);
    showError(getErrorMessage(error, "No se pudieron cargar más turnos."));
  } finally {
    setBusy(button, false);
    updateProfileAppointmentsMore();
  }
}

function initTimelineEvents() {
  const historySearch = $("historySearch");
  const filterTimelineSoon = debounce(() => {
    const search = historySearch.value.trim();

    if (search === timelineState.search) {
      setSearching(historySearch, false);
      return;
    }

    timelineState.search = search;
    reloadTimeline();
  });

  historySearch?.addEventListener("input", () => {
    setSearching(historySearch, true);
    filterTimelineSoon();
  });

  const historyButtons = Array.from(
    document.querySelectorAll("#historyFilters .btn-filter"),
  );

  historyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      timelineState.filter = button.dataset.historyFilter;
      setActiveFilter(historyButtons, button);
      reloadTimeline();
    });
  });
}

// ============================================================
// PERFIL DEL CLIENTE
// ============================================================

function closeClientProfile() {
  profileRequestId += 1;
  timelineController?.abort();
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

  restoreFocus(profileOpener);
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
  const record = active ? RECORD_STATUS.active : RECORD_STATUS.inactive;
  status.textContent = record.label;
  status.className = `status-badge status-badge--${record.slug}`;

  $("clientProfileNotes").textContent =
    client.notes || "Sin notas permanentes.";

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
  timelineState.totalRecords = 0;
  profileAppointments = [];
  $("historySearch").value = "";

  const historyButtons = Array.from(
    document.querySelectorAll("#historyFilters .btn-filter"),
  );
  setActiveFilter(
    historyButtons,
    historyButtons.find((button) => button.dataset.historyFilter === "todos"),
  );

  reloadProfileData(client);

  requestAnimationFrame(() => panel.focus({ preventScroll: true }));
}

function editProfileClient() {
  const client = profileClient;
  if (!client) return;

  closeClientProfile();
  showClientModal(client);
}

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

const runAction = (button, task, success, failure) =>
  runTableAction(button, task, { success, failure }, () =>
    refreshAfterChange(list, renderClientsList),
  );

async function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    if (isCompactView()) return;

    const row = event.target.closest("tr[data-client-id]");
    if (!row) return;

    const client = list.state.items.find(
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

  if (action === "more") {
    setBusy(button, true);
    await loadClientsList({ append: true });
    setBusy(button, false);
    return;
  }

  const id = button.dataset.id;
  const client = list.state.items.find((item) => String(item.id) === id);

  if (!client) return;

  if (action === "profile") {
    if (isCompactView() && button.classList.contains("table-link")) return;

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
      "Cliente eliminado",
      "No se pudo eliminar el cliente.",
    );
    return;
  }

  if (action === "activate") {
    const confirmed = await confirmAction({
      title: "Activar cliente",
      message: `Vas a activar a «${client.alias}». Vuelve a aparecer al buscar clientes para nuevos turnos.`,
      confirmLabel: "Activar",
    });

    if (!confirmed) return;

    await runAction(
      button,
      () => activateClient(id),
      "Cliente activado",
      "No se pudo activar el cliente.",
    );
    return;
  }

  if (action === "deactivate") {
    const confirmed = await confirmAction({
      title: "Desactivar cliente",
      message: `Vas a desactivar a «${client.alias}». Deja de aparecer al buscar clientes para nuevos turnos, pero conserva su historial. Podés activarlo de nuevo cuando quieras.`,
      confirmLabel: "Desactivar",
    });

    if (!confirmed) return;

    await runAction(
      button,
      () => deactivateClient(id),
      "Cliente desactivado",
      "No se pudo desactivar el cliente.",
    );
  }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

export function initClients() {
  initTimelineEvents();

  const panel = $("clientFormPanel");

  feedback = createFeedback(panel);
  dirty = createDirtyTracker(panel);
  clearInvalidOnInput(panel);
  drawer = createDrawer({
    overlay: $("clientModalOverlay"),
    panel,
    feedback,
    dirty,
  });

  $("btnAddClient")?.addEventListener("click", () => showClientModal());

  const reloadSoon = debounce(() => loadClientsList());

  $("clientListSearch")?.addEventListener("input", (event) => {
    list.state.search = event.target.value;
    reloadSoon();
  });

  $("clientsTableBody")?.addEventListener("click", handleTableAction);
  bindRowDialog(
    $("clientsTableBody"),
    $("clientRowDialog"),
    (id) => list.state.items.find((item) => String(item.id) === id)?.notes,
  );

  $("clientProfileClose")?.addEventListener("click", closeClientProfile);
  $("clientProfileOverlay")?.addEventListener("click", closeClientProfile);
  $("clientProfileEdit")?.addEventListener("click", editProfileClient);
  $("clientProfileSchedule")?.addEventListener(
    "click",
    scheduleForProfileClient,
  );

  $("clientProfilePanel")?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-action='retry-profile']")) return;
    if (!profileClient) return;

    reloadProfileData(profileClient);
  });

  $("clientProfileAppointmentsMore")?.addEventListener("click", (event) =>
    loadMoreProfileAppointments(event.currentTarget),
  );
  $("clientProfileHistoryMore")?.addEventListener("click", (event) =>
    loadMoreTimeline(event.currentTarget),
  );

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if ($("clientProfilePanel")?.classList.contains("is-open")) {
      closeClientProfile();
      return;
    }

    if (drawer.isOpen()) {
      drawer.requestClose();
    }
  });

  const filterButtons = Array.from(
    document.querySelectorAll("#viewClients .btn-filter[data-filter]"),
  );

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      list.state.filter = button.dataset.filter;
      setActiveFilter(filterButtons, button);
      loadClientsList();
    });
  });

  $("clientModalClose")?.addEventListener("click", () => drawer.close());
  $("clientModalCancel")?.addEventListener("click", () => drawer.close());
  $("clientModalOverlay")?.addEventListener("click", () =>
    drawer.requestClose(),
  );

  $("clientForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveClient();
  });
}
