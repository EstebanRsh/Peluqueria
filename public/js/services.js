import {
  fetchAllServices,
  createService,
  updateService,
  activateService,
  deactivateService,
  deleteService,
} from "./api.js";

const servicesState = {
  services: [],
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

function isActive(service) {
  return service.active === true || Number(service.active) === 1;
}

function visibleServices() {
  const search = servicesState.search.toLowerCase();

  return servicesState.services.filter((service) => {
    const matchesFilter =
      servicesState.filter === "todos" ||
      (servicesState.filter === "activos" && isActive(service)) ||
      (servicesState.filter === "inactivos" && !isActive(service));
    const text = `${service.name} ${service.description || ""}`.toLowerCase();

    return matchesFilter && (!search || text.includes(search));
  });
}

function renderServicesList() {
  const body = document.getElementById("servicesTableBody");
  if (!body) return;

  const services = visibleServices();
  if (!services.length) {
    body.innerHTML =
      '<tr><td colspan="5" class="panel-empty">No se encontraron servicios.</td></tr>';
    return;
  }

  body.innerHTML = services
    .map((service) => {
      const active = isActive(service);
      const action = active ? "deactivate" : "activate";
      const label = active ? "Desactivar" : "Activar";

      return `
      <tr>
        <td data-label="Nombre">${escapeHtml(service.name)}</td>
        <td data-label="Duración">${escapeHtml(service.duration)} min</td>
        <td data-label="Precio">$${escapeHtml(service.price)}</td>
        <td data-label="Estado"><span class="status-badge status-badge--${active ? "activo" : "inactivo"}">${active ? "Activo" : "Inactivo"}</span></td>
        <td data-label="Acciones"><div class="data-table__actions">
          <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${escapeHtml(service.id)}">Editar</button>
          <button class="btn btn--ghost btn--sm" data-action="${action}" data-id="${escapeHtml(service.id)}">${label}</button>
          <button class="btn btn--danger btn--sm" data-action="delete" data-id="${escapeHtml(service.id)}">Eliminar</button>
        </div></td>
      </tr>`;
    })
    .join("");
}

function showServiceModal(service = null) {
  const modal = document.getElementById("serviceModalOverlay");
  if (!modal) return;

  document.getElementById("managedServiceId").value = service?.id || "";
  document.getElementById("serviceName").value = service?.name || "";
  document.getElementById("serviceDescription").value =
    service?.description || "";
  document.getElementById("serviceDuration").value = service?.duration || "";
  document.getElementById("servicePrice").value = service?.price || "";
  document.getElementById("serviceModalTitle").textContent = service
    ? "Editar servicio"
    : "Nuevo servicio";
  modal.classList.add("is-open");
}

function closeServiceModal() {
  document.getElementById("serviceModalOverlay")?.classList.remove("is-open");
}

function formData() {
  return {
    name: document.getElementById("serviceName").value.trim(),
    description: document.getElementById("serviceDescription").value.trim(),
    duration: Number(document.getElementById("serviceDuration").value),
    price: Number(document.getElementById("servicePrice").value),
  };
}

async function saveService() {
  const id = document.getElementById("managedServiceId").value;
  const data = formData();

  if (!data.name || data.duration < 1 || data.price < 0) {
    alert("Completa correctamente el nombre, la duración y el precio.");
    return;
  }

  try {
    const result = id
      ? await handleUpdateService(id, data)
      : await handleCreateService(data);
    if (!result.success)
      throw new Error(result.error || "No se pudo guardar el servicio.");
    closeServiceModal();
    renderServicesList();
  } catch (error) {
    console.error("Error al guardar servicio:", error);
    alert(error.message);
  }
}

async function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const service = servicesState.services.find((item) => String(item.id) === id);

  try {
    if (button.dataset.action === "edit") {
      showServiceModal(service);
      return;
    }

    if (button.dataset.action === "delete") {
      if (!confirm("¿Eliminar este servicio?")) return;
      const result = await handleDeleteService(id);
      if (!result.success)
        throw new Error(result.error || "No se pudo eliminar el servicio.");
    }

    if (button.dataset.action === "activate") {
      const result = await handleActivateService(id);
      if (!result.success)
        throw new Error(result.error || "No se pudo activar el servicio.");
    }

    if (button.dataset.action === "deactivate") {
      const result = await handleDeactivateService(id);
      if (!result.success)
        throw new Error(result.error || "No se pudo desactivar el servicio.");
    }

    renderServicesList();
  } catch (error) {
    console.error("Error al modificar servicio:", error);
    alert(error.message);
  }
}

export async function loadServices() {
  const services = await fetchAllServices();
  servicesState.services = Array.isArray(services) ? services : [];
  return servicesState.services;
}

export async function loadServicesList() {
  const body = document.getElementById("servicesTableBody");
  try {
    await loadServices();
    renderServicesList();
  } catch (error) {
    console.error("Error al cargar servicios:", error);
    if (body)
      body.innerHTML =
        '<tr><td colspan="5" class="panel-empty">Error al cargar servicios.</td></tr>';
  }
}

export async function handleCreateService(data) {
  const result = await createService(data);
  await loadServices();
  return result;
}

export async function handleUpdateService(id, data) {
  const result = await updateService(id, data);
  await loadServices();
  return result;
}

export async function handleActivateService(id) {
  const result = await activateService(id);
  await loadServices();
  return result;
}

export async function handleDeactivateService(id) {
  const result = await deactivateService(id);
  await loadServices();
  return result;
}

export async function handleDeleteService(id) {
  const result = await deleteService(id);
  await loadServices();
  return result;
}

export function initServices() {
  if (initialized) return;
  initialized = true;

  document
    .getElementById("btnAddService")
    ?.addEventListener("click", () => showServiceModal());
  document
    .getElementById("serviceSearch")
    ?.addEventListener("input", (event) => {
      servicesState.search = event.target.value;
      renderServicesList();
    });
  document
    .getElementById("servicesTableBody")
    ?.addEventListener("click", handleTableAction);

  document.querySelectorAll(".btn-filter[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      servicesState.filter = button.dataset.filter;
      document.querySelectorAll(".btn-filter[data-filter]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      renderServicesList();
    });
  });

  document
    .getElementById("serviceModalClose")
    ?.addEventListener("click", closeServiceModal);
  document
    .getElementById("serviceModalCancel")
    ?.addEventListener("click", closeServiceModal);
  document
    .getElementById("serviceModalSave")
    ?.addEventListener("click", saveService);
  document
    .getElementById("serviceModalOverlay")
    ?.addEventListener("click", (event) => {
      if (event.target.id === "serviceModalOverlay") closeServiceModal();
    });
}
