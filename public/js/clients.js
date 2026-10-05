import {
  fetchAppointments,
  fetchAllClients,
  fetchClientTimeline,
  createClient,
  updateClient,
  activateClient,
  deactivateClient,
  deleteClient,
} from "./api.js";
import { matchesSearch } from "./utils.js";

const clientsState = {
  clients: [],
  filter: "todos",
  search: "",
};

let initialized = false;
let profileRequestId = 0;
let profileAppointments = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isActive(client) {
  return client.active === true || Number(client.active) === 1;
}

// Recorta notas largas para que no rompan la tabla.
function truncate(text, maxLength = 40) {
  const value = String(text ?? "");
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}…`;
}

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

function renderClientsList() {
  const body = document.getElementById("clientsTableBody");
  if (!body) return;

  const clients = visibleClients();
  if (!clients.length) {
    body.innerHTML =
      '<tr><td colspan="5" class="panel-empty">No se encontraron clientes.</td></tr>';
    return;
  }

  body.innerHTML = clients
    .map((client) => {
      const active = isActive(client);
      const action = active ? "deactivate" : "activate";
      const label = active ? "Desactivar" : "Activar";

      return `
      <tr data-client-id="${escapeHtml(client.id)}" class="client-row">
        <td data-label="Alias">${escapeHtml(client.alias)}</td>
        <td data-label="Código">${escapeHtml(client.internal_code || "—")}</td>
        <td data-label="Notas">${escapeHtml(truncate(client.notes))}</td>
        <td data-label="Estado"><span class="status-badge status-badge--${active ? "activo" : "inactivo"}">${active ? "Activo" : "Inactivo"}</span></td>
        <td data-label="Acciones"><div class="data-table__actions">
          <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${escapeHtml(client.id)}">Editar</button>
          <button class="btn btn--ghost btn--sm" data-action="${action}" data-id="${escapeHtml(client.id)}">${label}</button>
          <button class="btn btn--danger btn--sm" data-action="delete" data-id="${escapeHtml(client.id)}">Eliminar</button>
        </div></td>
      </tr>`;
    })
    .join("");
}

function showClientModal(client = null) {
  const overlay = document.getElementById("clientModalOverlay");
  const panel = document.getElementById("clientFormPanel");
  if (!overlay || !panel) return;

  document.getElementById("managedClientId").value = client?.id || "";
  document.getElementById("clientAlias").value = client?.alias || "";
  document.getElementById("clientCode").value = client?.internal_code || "";
  document.getElementById("clientNotes").value = client?.notes || "";
  document.getElementById("clientModalTitle").textContent = client
    ? "Editar cliente"
    : "Nuevo cliente";

  overlay.classList.add("is-open");
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
}

function closeClientModal() {
  document.getElementById("clientModalOverlay")?.classList.remove("is-open");
  const panel = document.getElementById("clientFormPanel");
  panel?.classList.remove("is-open");
  panel?.setAttribute("aria-hidden", "true");
}

function formData() {
  return {
    alias: document.getElementById("clientAlias").value.trim(),
    internal_code: document.getElementById("clientCode").value.trim() || null,
    notes: document.getElementById("clientNotes").value.trim(),
  };
}

function closeClientProfile() {
  profileRequestId += 1;
  const panel = document.getElementById("clientProfilePanel");
  const overlay = document.getElementById("clientProfileOverlay");
  const tableBody = document.getElementById("clientsTableBody");

  panel?.classList.remove("is-open");
  panel?.setAttribute("aria-hidden", "true");
  overlay?.classList.remove("is-open");

  if (tableBody) {
    tableBody
      .querySelectorAll("tr[data-client-id]")
      .forEach((row) => row.classList.remove("client-row--selected"));
  }
}

function openClientProfile(client) {
  const panel = document.getElementById("clientProfilePanel");
  const overlay = document.getElementById("clientProfileOverlay");
  const name = document.getElementById("clientProfileName");
  const code = document.getElementById("clientProfileCode");
  const status = document.getElementById("clientProfileStatus");
  const notes = document.getElementById("clientProfileNotes");
  const avatar = document.getElementById("clientProfileAvatar");

  if (!panel || !client) return;

  const active = isActive(client);
  name.textContent = client.alias || "Cliente";
  code.textContent = client.internal_code || "Sin código";
  status.textContent = active ? "Activo" : "Inactivo";
  status.className = `status-badge status-badge--${active ? "activo" : "inactivo"}`;
  notes.textContent = client.notes || "Sin notas permanentes.";
  document.getElementById("clientProfileBase").textContent =
    client.natural_base_tone || "—";
  document.getElementById("clientProfileHair").textContent =
    client.hair_type || "—";
  document.getElementById("clientProfileGrey").textContent =
    client.grey_hair === null || client.grey_hair === ""
      ? "—"
      : `${client.grey_hair}%`;
  document.getElementById("clientProfileAllergies").textContent =
    client.allergies || "—";

  const initial = String(client.alias || "C")
    .trim()
    .toUpperCase()
    .slice(0, 2);

  avatar.textContent = initial;

  const tableBody = document.getElementById("clientsTableBody");
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
  document.getElementById("historySearch").value = "";
  document
    .querySelectorAll("#historyFilters .btn-filter")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.historyFilter === "todos"),
    );
  document.getElementById("clientProfileHistory").innerHTML =
    '<p class="history-placeholder">Cargando historial técnico...</p>';
  document.getElementById("clientProfileAppointments").innerHTML =
    '<p class="history-placeholder">Cargando turnos...</p>';

  profileRequestId += 1;
  void loadClientProfileData(client, profileRequestId);
}

// ==========================================================================
// ESTADO Y LÓGICA DEL HISTORIAL (Timeline)
// ==========================================================================

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
  } else if (/\b(color|tinte|oxidante|decoloracion|matizador|formula|tono)\b/.test(searchable)) {
    category = "color";
  } else if (/\b(tratamiento|alisado|hidratacion|reconstruccion)\b/.test(searchable)) {
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
  const container = document.getElementById("clientProfileHistory");
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
          key,
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
    container.innerHTML = '<p class="history-empty">Sin historial.</p>';
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
                        <dt>${escapeHtml(field.replace(/_/g, " "))}</dt>
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
  const container = document.getElementById("clientProfileAppointments");
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
            <span class="status-badge">${escapeHtml(appointment.status || "Sin estado")}</span>
          </div>
          <div class="profile-appointment__meta">
            <time>${escapeHtml(formatProfileDate(appointment.date, false))} · ${escapeHtml(String(appointment.time_start || "").slice(0, 5))}${appointment.time_end ? `–${escapeHtml(String(appointment.time_end).slice(0, 5))}` : ""}</time>
            <span>${escapeHtml(appointment.stylist || "Profesional sin asignar")}</span>
          </div>
        </article>`,
    )
    .join("");
}

async function loadClientProfileData(client, requestId) {
  const historyContainer = document.getElementById("clientProfileHistory");
  const appointmentsContainer = document.getElementById(
    "clientProfileAppointments",
  );

  let records;
  try {
    const response = await fetchClientTimeline(client.id);
    if (!response?.success || !Array.isArray(response.data)) {
      throw new TypeError("La respuesta del historial no tiene un formato válido.");
    }
    if (requestId !== profileRequestId) return;
    records = response.data;
    timelineState.records = records;
    renderTimeline();
  } catch (error) {
    if (requestId !== profileRequestId) return;
    console.error("Error al cargar historial técnico:", error);
    if (historyContainer) {
      historyContainer.innerHTML =
        '<p class="history-error">No se pudo cargar el historial técnico.</p>';
    }
    if (appointmentsContainer) {
      appointmentsContainer.innerHTML =
        '<p class="history-error">No se pudieron cargar los turnos asociados.</p>';
    }
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
    if (appointmentsContainer) {
      appointmentsContainer.innerHTML =
        '<p class="history-error">No se pudieron cargar los turnos asociados.</p>';
    }
  }
}

function initTimelineEvents() {
  document
    .getElementById("historySearch")
    ?.addEventListener("input", (event) => {
      timelineState.search = event.target.value.trim();
      renderTimeline();
    });

  // Eventos de los filtros (Píldoras)
  document.querySelectorAll("#historyFilters .btn-filter").forEach((button) => {
    button.addEventListener("click", () => {
      timelineState.filter = button.dataset.historyFilter;
      document
        .querySelectorAll("#historyFilters .btn-filter")
        .forEach((btn) => {
          btn.classList.toggle("active", btn === button);
        });
      renderTimeline();
    });
  });
}

async function saveClient() {
  const id = document.getElementById("managedClientId").value;
  const data = formData();

  if (!data.alias) {
    alert("El alias o nombre de referencia es obligatorio.");
    return;
  }

  try {
    const result = id
      ? await handleUpdateClient(id, data)
      : await handleCreateClient(data);
    if (!result.success)
      throw new Error(result.error || "No se pudo guardar el cliente.");
    closeClientModal();
    renderClientsList();
  } catch (error) {
    console.error("Error al guardar cliente:", error);
    alert(error.message);
  }
}

async function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    const row = event.target.closest("tr[data-client-id]");
    if (!row) return;

    const id = row.dataset.clientId;
    const client = clientsState.clients.find((item) => String(item.id) === id);
    if (client) {
      openClientProfile(client);
    }
    return;
  }

  const id = button.dataset.id;
  const client = clientsState.clients.find((item) => String(item.id) === id);

  try {
    if (button.dataset.action === "edit") {
      showClientModal(client);
      return;
    }

    if (button.dataset.action === "delete") {
      if (!confirm("¿Eliminar este cliente?")) return;
      const result = await handleDeleteClient(id);
      if (!result.success)
        throw new Error(result.error || "No se pudo eliminar el cliente.");
    }

    if (button.dataset.action === "activate") {
      const result = await handleActivateClient(id);
      if (!result.success)
        throw new Error(result.error || "No se pudo activar el cliente.");
    }

    if (button.dataset.action === "deactivate") {
      const result = await handleDeactivateClient(id);
      if (!result.success)
        throw new Error(result.error || "No se pudo desactivar el cliente.");
    }

    renderClientsList();
  } catch (error) {
    console.error("Error al modificar cliente:", error);
    alert(error.message);
  }
}

async function loadClients() {
  const firstPage = await fetchAllClients();
  if (!Array.isArray(firstPage?.data)) {
    throw new TypeError("La respuesta de clientes no contiene una lista válida.");
  }

  const clients = [...firstPage.data];
  const perPage = Number(firstPage.per_page);
  const totalPages = Math.ceil(Number(firstPage.total) / perPage);

  for (let page = 2; page <= totalPages; page += 1) {
    const result = await fetchAllClients(page, perPage);
    if (!Array.isArray(result?.data)) {
      throw new TypeError("La respuesta de clientes no contiene una lista válida.");
    }
    clients.push(...result.data);
  }

  clientsState.clients = clients;
  return clientsState.clients;
}

export async function loadClientsList() {
  const body = document.getElementById("clientsTableBody");
  try {
    await loadClients();
    renderClientsList();
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    if (body)
      body.innerHTML =
        '<tr><td colspan="5" class="panel-empty">Error al cargar clientes.</td></tr>';
  }
}

async function handleCreateClient(data) {
  const result = await createClient(data);
  await loadClients();
  return result;
}

async function handleUpdateClient(id, data) {
  const result = await updateClient(id, data);
  await loadClients();
  return result;
}

async function handleActivateClient(id) {
  const result = await activateClient(id);
  await loadClients();
  return result;
}

async function handleDeactivateClient(id) {
  const result = await deactivateClient(id);
  await loadClients();
  return result;
}

async function handleDeleteClient(id) {
  const result = await deleteClient(id);
  await loadClients();
  return result;
}

export function initClients() {
  if (initialized) return;
  initialized = true;
  initTimelineEvents();

  document
    .getElementById("btnAddClient")
    ?.addEventListener("click", () => showClientModal());
  document
    .getElementById("clientListSearch")
    ?.addEventListener("input", (event) => {
      clientsState.search = event.target.value;
      renderClientsList();
    });
  document
    .getElementById("clientsTableBody")
    ?.addEventListener("click", handleTableAction);

  document
    .getElementById("clientProfileClose")
    ?.addEventListener("click", closeClientProfile);
  document
    .getElementById("clientProfileOverlay")
    ?.addEventListener("click", closeClientProfile);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (
      document
        .getElementById("clientProfilePanel")
        ?.classList.contains("is-open")
    ) {
      closeClientProfile();
      return;
    }
    if (
      document.getElementById("clientFormPanel")?.classList.contains("is-open")
    ) {
      closeClientModal();
    }
  });

  document
    .querySelectorAll("#viewClients .btn-filter[data-filter]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        clientsState.filter = button.dataset.filter;
        document
          .querySelectorAll("#viewClients .btn-filter[data-filter]")
          .forEach((item) => {
            item.classList.toggle("active", item === button);
          });
        renderClientsList();
      });
    });

  document
    .getElementById("clientModalClose")
    ?.addEventListener("click", closeClientModal);
  document
    .getElementById("clientModalCancel")
    ?.addEventListener("click", closeClientModal);
  document
    .getElementById("clientModalSave")
    ?.addEventListener("click", saveClient);
  document
    .getElementById("clientModalOverlay")
    ?.addEventListener("click", closeClientModal);
}
