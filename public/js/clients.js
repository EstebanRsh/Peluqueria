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
      <tr>
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
  const modal = document.getElementById("clientModalOverlay");
  if (!modal) return;

  document.getElementById("managedClientId").value = client?.id || "";
  document.getElementById("clientAlias").value = client?.alias || "";
  document.getElementById("clientCode").value = client?.internal_code || "";
  document.getElementById("clientNotes").value = client?.notes || "";
  document.getElementById("clientModalTitle").textContent = client
    ? "Editar cliente"
    : "Nuevo cliente";
  modal.classList.add("is-open");
}

function closeClientModal() {
  document.getElementById("clientModalOverlay")?.classList.remove("is-open");
}

function formData() {
  return {
    alias: document.getElementById("clientAlias").value.trim(),
    internal_code: document.getElementById("clientCode").value.trim() || null,
    notes: document.getElementById("clientNotes").value.trim(),
  };
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
  if (!button) return;

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

  // Los filtros se buscan solo dentro de #viewClients para no interferir
  // con los mismos botones .btn-filter que usa el panel de servicios.
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
    ?.addEventListener("click", (event) => {
      if (event.target.id === "clientModalOverlay") closeClientModal();
    });
}
