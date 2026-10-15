import {
  ApiError,
  fetchAllServices,
  createService,
  updateService,
  activateService,
  deactivateService,
  deleteService,
  getErrorMessage,
} from "./api.js";
import { $, escapeHtml, isActive, setActiveFilter } from "./dom.js";
import {
  clearInvalidOnInput,
  createDirtyTracker,
  createFeedback,
  setBusy,
} from "./feedback.js";
import { createListLoader, debounce, moreRowHtml } from "./list.js";
import { confirmAction } from "./confirm.js";
import { notify } from "./toast.js";

const list = createListLoader(fetchAllServices);

let isSaving = false;
let modalOpener = null;
let feedback = null;
let dirty = null;

// ============================================================
// LISTADO
// ============================================================

function renderMessageRow(body, html) {
  body.innerHTML = `<tr><td colspan="5">${html}</td></tr>`;
}

function renderServicesList() {
  const body = $("servicesTableBody");
  if (!body) return;

  const services = list.state.items;

  if (!services.length) {
    if (list.isPristine()) {
      renderMessageRow(
        body,
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
        '<div class="panel-empty" role="status">No hay servicios que coincidan con la búsqueda o el filtro.</div>',
      );
    }
    return;
  }

  body.innerHTML = services
    .map((service) => {
      const active = isActive(service);
      const action = active ? "deactivate" : "activate";
      const label = active ? "Desactivar" : "Activar";
      const name = escapeHtml(service.name);
      const id = escapeHtml(service.id);

      return `
      <tr>
        <td data-label="Nombre">${name}</td>
        <td data-label="Duración">${escapeHtml(service.duration)} min</td>
        <td data-label="Precio">$${escapeHtml(service.price)}</td>
        <td data-label="Estado"><span class="status-badge status-badge--${active ? "activo" : "inactivo"}">${active ? "Activo" : "Inactivo"}</span></td>
        <td data-label="Acciones"><div class="data-table__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-id="${id}" aria-label="Editar ${name}">Editar</button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="${action}" data-id="${id}" aria-label="${label} ${name}">${label}</button>
          <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${id}" aria-label="Eliminar ${name}">Eliminar</button>
        </div></td>
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
    `<div class="panel-error" role="alert">
      <div>${escapeHtml(getErrorMessage(error, "No se pudieron cargar los servicios."))}</div>
      <div class="panel-empty__action">
        <button type="button" class="btn btn--ghost btn--sm" data-action="retry">Reintentar</button>
      </div>
    </div>`,
  );
}

export async function loadServicesList({ append = false } = {}) {
  try {
    if (await list.load({ append })) renderServicesList();
  } catch (error) {
    console.error("Error al cargar servicios:", error);

    if (append) {
      notify.error(getErrorMessage(error, "No se pudieron cargar más servicios."));
    } else {
      renderLoadError(error);
    }
  }
}

// ============================================================
// PANEL DE ALTA / EDICIÓN
// ============================================================

function showServiceModal(service = null) {
  const overlay = $("serviceModalOverlay");
  const panel = $("serviceFormPanel");
  if (!overlay || !panel) return;

  modalOpener = document.activeElement;

  $("managedServiceId").value = service?.id || "";
  $("serviceName").value = service?.name || "";
  $("serviceDescription").value = service?.description || "";
  $("serviceDuration").value = service?.duration || "";
  $("servicePrice").value = service ? (service.price ?? "") : "";
  $("serviceModalTitle").textContent = service
    ? "Editar servicio"
    : "Nuevo servicio";

  feedback.clear();
  feedback.clearInvalid();
  dirty.reset();

  overlay.classList.add("is-open");
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => $("serviceName").focus({ preventScroll: true }));
}

function closeServiceModal() {
  $("serviceModalOverlay")?.classList.remove("is-open");
  const panel = $("serviceFormPanel");
  panel?.classList.remove("is-open");
  panel?.setAttribute("aria-hidden", "true");

  if (modalOpener && modalOpener.isConnected) {
    modalOpener.focus({ preventScroll: true });
  }
  modalOpener = null;
}

// Un clic fuera del panel o Escape no deben borrar lo ya escrito.
function requestCloseServiceModal() {
  if (dirty.isDirty()) {
    feedback.show(
      "warning",
      "Hay datos sin guardar. Usá Cancelar o × para descartarlos.",
      "dirty",
    );
    return;
  }

  closeServiceModal();
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

  feedback.clear();
  feedback.clearInvalid();

  const id = $("managedServiceId").value;
  const form = readForm();
  const errors = validateForm(form);

  if (errors.length > 0) {
    errors.forEach((error) => feedback.invalidate(error.fields));
    feedback.show(
      "error",
      errors.length === 1
        ? errors[0].message
        : "Completá los campos marcados para continuar.",
    );
    document.querySelector("#serviceFormPanel [aria-invalid='true']")?.focus();
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

    closeServiceModal();
    notify.success(id ? "Servicio actualizado." : "Servicio creado.");

    await refreshAfterChange();
  } catch (error) {
    console.error("Error al guardar servicio:", error);
    feedback.show(
      "error",
      getErrorMessage(error, "No se pudo guardar el servicio."),
    );
  } finally {
    isSaving = false;
    setBusy(saveButton, false);
  }
}

// Vuelve a pedir la lista; si falla, avisa sin dar por perdido el cambio.
async function refreshAfterChange() {
  try {
    if (await list.load()) renderServicesList();
  } catch (error) {
    console.error("Error al actualizar la lista de servicios:", error);
    notify.warning(
      "El cambio se guardó, pero no se pudo actualizar la lista. Recargá la sección.",
    );
  }
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
      "Servicio eliminado.",
      "No se pudo eliminar el servicio.",
    );
    return;
  }

  if (action === "activate") {
    await runAction(
      button,
      () => activateService(id),
      "Servicio activado.",
      "No se pudo activar el servicio.",
    );
    return;
  }

  if (action === "deactivate") {
    await runAction(
      button,
      () => deactivateService(id),
      "Servicio desactivado.",
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
  panel.addEventListener("input", () => feedback.clear("dirty"));

  $("btnAddService")?.addEventListener("click", () => showServiceModal());

  const reloadSoon = debounce(() => loadServicesList());

  $("serviceSearch")?.addEventListener("input", (event) => {
    list.state.search = event.target.value;
    reloadSoon();
  });

  $("servicesTableBody")?.addEventListener("click", handleTableAction);

  // Acotado a #viewServices para no interferir con los mismos
  // botones .btn-filter que usan los demás paneles.
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

  $("serviceModalClose")?.addEventListener("click", closeServiceModal);
  $("serviceModalCancel")?.addEventListener("click", closeServiceModal);
  $("serviceModalOverlay")?.addEventListener("click", requestCloseServiceModal);

  $("serviceForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveService();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if ($("serviceFormPanel")?.classList.contains("is-open")) {
      requestCloseServiceModal();
    }
  });
}
