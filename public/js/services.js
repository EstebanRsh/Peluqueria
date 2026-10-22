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
import { $, escapeHtml, isActive, setActiveFilter } from "./dom.js";
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
  loadErrorHtml,
  moreRowHtml,
  refreshAfterChange,
  renderMessageRow,
  rowActionsHtml,
  rowToggleHtml,
  runTableAction,
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
    if (list.isPristine()) {
      renderMessageRow(
        body,
        5,
        `<div class="panel-empty" role="status">
          <div>Todavía no cargaste servicios.</div>
          <div class="panel-empty__action">
            <button type="button" class="btn btn--primary btn--sm" data-action="new">Nuevo servicio</button>
          </div>
        </div>`,
      );
    } else {
      renderMessageRow(
        body,
        5,
        '<div class="panel-empty" role="status">No hay servicios que coincidan con la búsqueda o el filtro.</div>',
      );
    }
    return;
  }

  body.innerHTML = services
    .map((service) => {
      const active = isActive(service);
      const name = escapeHtml(service.name);

      return `
      <tr>
        <td data-label="Nombre" class="cell-primary">${name}${rowToggleHtml(service.name, service.id)}</td>
        <td data-label="Duración">${escapeHtml(service.duration)} min</td>
        <td data-label="Precio">$${escapeHtml(service.price)}</td>
        <td data-label="Estado"><span class="status-badge status-badge--${active ? "activo" : "inactivo"}">${active ? "Activo" : "Inactivo"}</span></td>
        <td data-label="Acciones">${rowActionsHtml(service.id, service.name, active)}</td>
      </tr>`;
    })
    .join("")
    .concat(list.hasMore() ? moreRowHtml(5) : "");
}

function renderLoadError(error) {
  const body = $("servicesTableBody");
  if (!body) return;

  renderMessageRow(
    body,
    5,
    loadErrorHtml(error, "No se pudieron cargar los servicios."),
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

// Con quickName, el servicio se crea desde el formulario del turno.
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
