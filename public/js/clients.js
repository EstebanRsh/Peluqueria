import {
  fetchAllClients,
  createClient,
  updateClient,
  activateClient,
  deactivateClient,
  deleteClient,
} from "./api.js";

const clientsState = {
  clients: [],
  filter: "todos",
  search: "",
};

let initialized = false;

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
  const search = clientsState.search.toLowerCase();

  return clientsState.clients.filter((client) => {
    const matchesFilter =
      clientsState.filter === "todos" ||
      (clientsState.filter === "activos" && isActive(client)) ||
      (clientsState.filter === "inactivos" && !isActive(client));
    const text =
      `${client.alias} ${client.internal_code || ""} ${client.notes || ""}`.toLowerCase();

    return matchesFilter && (!search || text.includes(search));
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
}

// ==========================================================================
// ESTADO Y LÓGICA DEL HISTORIAL (Timeline)
// ==========================================================================

const timelineState = {
  records: [], // Queda vacío. Aquí se inyectará el JSON del backend.
  filter: "todos",
  search: "",
};

function renderTimeline() {
  const container = document.getElementById("clientProfileHistory");
  if (!container) return;

  // Filtrado dinámico en memoria
  const filtered = timelineState.records.filter((record) => {
    const matchFilter =
      timelineState.filter === "todos" ||
      record.category === timelineState.filter;
    const matchSearch =
      !timelineState.search ||
      record.serviceName
        .toLowerCase()
        .includes(timelineState.search.toLowerCase()) ||
      record.notes.toLowerCase().includes(timelineState.search.toLowerCase());

    return matchFilter && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="history-empty">Sin historial.</p>';
    return;
  }

  container.innerHTML = filtered
    .map(
      (record) => `
    <div class="timeline-node">
      <div class="timeline-header">
        <span class="timeline-date">${escapeHtml(record.date)}</span>
        <span class="timeline-service">${escapeHtml(record.serviceName)}</span>
      </div>
      <div class="timeline-details">
        ${record.detailsHtml} <!-- HTML pre-formateado desde el parser del JSON -->
      </div>
    </div>
  `,
    )
    .join("");
}

function initTimelineEvents() {
  // Evento de búsqueda por texto
  document
    .getElementById("historySearch")
    ?.addEventListener("input", (event) => {
      timelineState.search = event.target.value.trim();
      renderTimeline();
    });

  // Eventos de los filtros (Píldoras)
  document.querySelectorAll("#historyFilters .btn-filter").forEach((button) => {
    button.addEventListener("click", (event) => {
      timelineState.filter = event.target.dataset.historyFilter;

      // Manejo del estado visual "activo"
      document
        .querySelectorAll("#historyFilters .btn-filter")
        .forEach((btn) => {
          btn.classList.remove("active");
        });
      event.target.classList.add("active");

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

export async function loadClients() {
  const clients = await fetchAllClients();
  clientsState.clients = Array.isArray(clients) ? clients : [];
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

export async function handleCreateClient(data) {
  const result = await createClient(data);
  await loadClients();
  return result;
}

export async function handleUpdateClient(id, data) {
  const result = await updateClient(id, data);
  await loadClients();
  return result;
}

export async function handleActivateClient(id) {
  const result = await activateClient(id);
  await loadClients();
  return result;
}

export async function handleDeactivateClient(id) {
  const result = await deactivateClient(id);
  await loadClients();
  return result;
}

export async function handleDeleteClient(id) {
  const result = await deleteClient(id);
  await loadClients();
  return result;
}

export function initClients() {
  if (initialized) return;
  initialized = true;

  document
    .getElementById("btnAddClient")
    ?.addEventListener("click", () => showClientModal());
  document
    .getElementById("clientSearch")
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
