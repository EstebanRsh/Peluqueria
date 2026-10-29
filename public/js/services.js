// ============================================================
// SERVICIOS
// Listado, alta y edición de servicios.
// ============================================================

import {
  ApiError,
  fetchAllServices,
  createService,
  updateService,
  activateService,
  deactivateService,
  deleteService,
  getErrorMessage,
  logError,
} from "./api.js";
import { $, isActive, setActiveFilter } from "./dom.js";
import {
  clearInvalidOnInput,
  createDirtyTracker,
  createDrawer,
  createFeedback,
  setBusy,
} from "./feedback.js";
import {
  bindRowDialog,
  createListLoader,
  debounce,
  emptyBlock,
  errorBlock,
  fillFields,
  moreRow,
  refreshAfterChange,
  renderMessageRow,
  rowActions,
  rowToggle,
  runTableAction,
  setRecordStatus,
} from "./list.js";
import { confirmAction, showError, showResult } from "./confirm.js";

const list = createListLoader(fetchAllServices, $("serviceListSearch"));

let isSaving = false;
let feedback = null;
let dirty = null;
let drawer = null;
let quickCreate = false;

// ============================================================
// LISTADO
// ============================================================

function renderServicesList() {
  const body = $("servicesTableBody");
  if (!body) return;

  const services = list.state.items;

  if (!services.length) {
    renderMessageRow(
      body,
      5,
      list.isPristine()
        ? emptyBlock("Todavía no cargaste servicios.", "Nuevo servicio")
        : emptyBlock("No hay servicios que coincidan con la búsqueda o el filtro."),
    );
    return;
  }

  const rows = services.map((service) => {
    const row = $("serviceRowTemplate").content.firstElementChild.cloneNode(true);
    const active = isActive(service);

    fillFields(row, {
      name: service.name,
      duration: `${service.duration} min`,
      price: `$${service.price}`,
    });
    row
      .querySelector('[data-field="name"]')
      .append(rowToggle(service.name, service.id));
    setRecordStatus(row.querySelector('[data-field="status"]'), active);
    row
      .querySelector('[data-field="actions"]')
      .append(rowActions(service.id, service.name, active));

    return row;
  });

  body.replaceChildren(...rows);

  if (list.hasMore()) {
    body.append(moreRow(5));
  }
}

function renderLoadError(error) {
  const body = $("servicesTableBody");
  if (!body) return;

  renderMessageRow(
    body,
    5,
    errorBlock(error, "No se pudieron cargar los servicios."),
  );
}

export async function loadServicesList({ append = false } = {}) {
  try {
    if (await list.load({ append })) renderServicesList();
  } catch (error) {
    logError("Error al cargar servicios:", error);

    if (append) {
      showError(
        getErrorMessage(error, "No se pudieron cargar más servicios."),
      );
    } else {
      renderLoadError(error);
    }
  }
}

// ============================================================
// PANEL DE ALTA / EDICIÓN
// ============================================================

function showServiceModal(service = null, quickName = null) {
  quickCreate = quickName !== null;
  $("managedServiceId").value = service?.id || "";
  $("serviceName").value = service?.name || quickName || "";
  $("serviceDescription").value = service?.description || "";
  $("serviceDuration").value = service?.duration || "";
  $("servicePrice").value = service ? (service.price ?? "") : "";
  $("serviceModalTitle").textContent = service
    ? "Editar servicio"
    : "Nuevo servicio";

  feedback.clearInvalid();
  dirty.reset();

  drawer.open($("serviceName"));
}

function readForm() {
  return {
    data: {
      name: $("serviceName").value.trim(),
      description: $("serviceDescription").value.trim(),
      duration: Number($("serviceDuration").value),
      price: Number($("servicePrice").value),
    },
    priceRaw: $("servicePrice").value,
  };
}

function validateForm({ data, priceRaw }) {
  const errors = [];

  if (!data.name) {
    errors.push({
      message: "Ingresá el nombre del servicio.",
      fields: ["serviceName"],
    });
  }

  if (!Number.isInteger(data.duration) || data.duration < 1) {
    errors.push({
      message: "La duración debe ser un número entero de minutos (mínimo 1).",
      fields: ["serviceDuration"],
    });
  }

  if (priceRaw === "" || !Number.isFinite(data.price) || data.price < 0) {
    errors.push({
      message: "Indicá el precio (puede ser 0).",
      fields: ["servicePrice"],
    });
  }

  return errors;
}

async function saveService() {
  if (isSaving) return;

  feedback.clearInvalid();

  const id = $("managedServiceId").value;
  const form = readForm();
  const errors = validateForm(form);

  if (errors.length > 0) {
    errors.forEach((error) => feedback.invalidate(error.fields));
    feedback.focusInvalid();
    return;
  }

  const saveButton = $("serviceModalSave");
  isSaving = true;
  setBusy(saveButton, true);

  try {
    const result = id
      ? await updateService(id, form.data)
      : await createService(form.data);

    if (!result.success) {
      throw new ApiError(result.error || "No se pudo guardar el servicio.", {
        kind: "request",
      });
    }

    drawer.close();

    if (quickCreate) {
      document.dispatchEvent(
        new CustomEvent("service:saved", {
          detail: { service: { id: result.id, ...form.data } },
        }),
      );
    } else {
      showResult(
        "success",
        id ? "Servicio actualizado" : "Servicio creado",
        id
          ? "Los cambios ya están guardados."
          : "Ya podés usarlo al agendar turnos.",
      );
    }

    await refreshAfterChange(list, renderServicesList);
  } catch (error) {
    logError("Error al guardar servicio:", error);

    const repeated = error instanceof ApiError && error.status === 409;

    if (repeated) feedback.invalidate(["serviceName"]);

    feedback.show(
      repeated ? "warning" : "error",
      getErrorMessage(error, "No se pudo guardar el servicio."),
    );
  } finally {
    isSaving = false;
    setBusy(saveButton, false);
  }
}

// ============================================================
// ACCIONES DE LA TABLA
// ============================================================

const runAction = (button, task, success, failure) =>
  runTableAction(button, task, { success, failure }, () =>
    refreshAfterChange(list, renderServicesList),
  );

async function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "new") {
    showServiceModal();
    return;
  }

  if (action === "retry") {
    await loadServicesList();
    return;
  }

  if (action === "more") {
    setBusy(button, true);
    await loadServicesList({ append: true });
    setBusy(button, false);
    return;
  }

  const id = button.dataset.id;
  const service = list.state.items.find((item) => String(item.id) === id);

  if (!service) return;

  if (action === "edit") {
    showServiceModal(service);
    return;
  }

  if (action === "delete") {
    const confirmed = await confirmAction({
      title: "Eliminar servicio",
      message: `Vas a eliminar «${service.name}». Esta acción no se puede deshacer. Si ya tiene turnos asociados no se podrá eliminar: en ese caso desactivalo.`,
      confirmLabel: "Eliminar",
      danger: true,
    });

    if (!confirmed) return;

    await runAction(
      button,
      () => deleteService(id),
      "Servicio eliminado",
      "No se pudo eliminar el servicio.",
    );
    return;
  }

  if (action === "activate") {
    const confirmed = await confirmAction({
      title: "Activar servicio",
      message: `Vas a activar «${service.name}». Vuelve a estar disponible para nuevos turnos.`,
      confirmLabel: "Activar",
    });

    if (!confirmed) return;

    await runAction(
      button,
      () => activateService(id),
      "Servicio activado",
      "No se pudo activar el servicio.",
    );
    return;
  }

  if (action === "deactivate") {
    const confirmed = await confirmAction({
      title: "Desactivar servicio",
      message: `Vas a desactivar «${service.name}». Deja de estar disponible para nuevos turnos, pero conserva su historial. Podés activarlo de nuevo cuando quieras.`,
      confirmLabel: "Desactivar",
    });

    if (!confirmed) return;

    await runAction(
      button,
      () => deactivateService(id),
      "Servicio desactivado",
      "No se pudo desactivar el servicio.",
    );
  }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

export function initServices() {
  const panel = $("serviceFormPanel");

  feedback = createFeedback(panel);
  dirty = createDirtyTracker(panel);
  clearInvalidOnInput(panel);
  drawer = createDrawer({
    overlay: $("serviceModalOverlay"),
    panel,
    feedback,
    dirty,
  });

  $("btnAddService")?.addEventListener("click", () => showServiceModal());
  document.addEventListener("service:new", (event) =>
    showServiceModal(null, event.detail.name),
  );

  const reloadSoon = debounce(() => loadServicesList());

  $("serviceListSearch")?.addEventListener("input", (event) => {
    list.state.search = event.target.value;
    reloadSoon();
  });

  $("servicesTableBody")?.addEventListener("click", handleTableAction);
  bindRowDialog(
    $("servicesTableBody"),
    $("serviceRowDialog"),
    (id) =>
      list.state.items.find((item) => String(item.id) === id)?.description,
  );

  const filterButtons = Array.from(
    document.querySelectorAll("#viewServices .btn-filter[data-filter]"),
  );

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      list.state.filter = button.dataset.filter;
      setActiveFilter(filterButtons, button);
      loadServicesList();
    });
  });

  $("serviceModalClose")?.addEventListener("click", () => drawer.close());
  $("serviceModalCancel")?.addEventListener("click", () => drawer.close());
  $("serviceModalOverlay")?.addEventListener("click", () =>
    drawer.requestClose(),
  );

  $("serviceForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveService();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (drawer.isOpen()) {
      drawer.requestClose();
    }
  });
}
