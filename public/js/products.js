import {
  ApiError,
  fetchAllProducts,
  createProduct,
  updateProduct,
  activateProduct,
  deactivateProduct,
  deleteProduct,
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

const list = createListLoader(fetchAllProducts);

let isSaving = false;
let modalOpener = null;
let feedback = null;
let dirty = null;

const UNIT_LABELS = {
  ml: "Mililitros (ml)",
  g: "Gramos (g)",
  unidad: "Unidad",
};

// Texto de las etiquetas del formulario según la unidad elegida.
const UNIT_FIELD_TEXT = {
  ml: { stock: "Stock disponible (ml)", cost: "Costo por ml ($)" },
  g: { stock: "Stock disponible (g)", cost: "Costo por g ($)" },
  unidad: {
    stock: "Stock disponible (unidades)",
    cost: "Costo por unidad ($)",
  },
};

function setUnitValue(value) {
  const unitSelect = $("productUnit");
  if (unitSelect) {
    unitSelect.value = UNIT_LABELS[value] ? value : "ml";
  }
  updateUnitLabels();
}

function updateUnitLabels() {
  const unit = $("productUnit")?.value;
  const text = UNIT_FIELD_TEXT[unit] || UNIT_FIELD_TEXT.ml;

  $("productStockLabel").textContent = text.stock;
  $("productCostLabel").textContent = text.cost;
}

function formatStock(product) {
  return `${Number(product.stock)} ${product.measurement_unit}`;
}

function formatCost(product) {
  return `$${Number(product.unit_cost).toFixed(2)} / ${product.measurement_unit}`;
}

// ============================================================
// LISTADO
// ============================================================

function renderMessageRow(body, html) {
  body.innerHTML = `<tr><td colspan="6">${html}</td></tr>`;
}

function renderProductsList() {
  const body = $("adminProductsTableBody");
  if (!body) return;

  const products = list.state.items;

  if (!products.length) {
    renderMessageRow(
      body,
      list.isPristine()
        ? `<div class="panel-empty" role="status">
            <div>Todavía no cargaste productos.</div>
            <div class="panel-empty__action">
              <button type="button" class="btn btn--primary btn--sm" data-action="new">Nuevo producto</button>
            </div>
          </div>`
        : '<div class="panel-empty" role="status">No hay productos que coincidan con la búsqueda o el filtro.</div>',
    );
    return;
  }

  body.innerHTML = products
    .map((product) => {
      const active = isActive(product);
      const action = active ? "deactivate" : "activate";
      const label = active ? "Desactivar" : "Activar";
      const name = escapeHtml(product.name);
      const id = escapeHtml(product.id);

      return `
      <tr data-product-id="${id}">
        <td data-label="Nombre">${name}</td>
        <td data-label="Marca">${escapeHtml(product.brand || "—")}</td>
        <td data-label="Stock">${escapeHtml(formatStock(product))}</td>
        <td data-label="Costo">${escapeHtml(formatCost(product))}</td>
        <td data-label="Estado"><span class="status-badge status-badge--${active ? "activo" : "inactivo"}">${active ? "Activo" : "Inactivo"}</span></td>
        <td data-label="Acciones"><div class="data-table__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-id="${id}" aria-label="Editar ${name}">Editar</button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="${action}" data-id="${id}" aria-label="${label} ${name}">${label}</button>
          <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${id}" aria-label="Eliminar ${name}">Eliminar</button>
        </div></td>
      </tr>`;
    })
    .join("")
    .concat(list.hasMore() ? moreRowHtml(6) : "");
}

function renderLoadError(error) {
  const body = $("adminProductsTableBody");
  if (!body) return;

  renderMessageRow(
    body,
    `<div class="panel-error" role="alert">
      <div>${escapeHtml(getErrorMessage(error, "No se pudieron cargar los productos."))}</div>
      <div class="panel-empty__action">
        <button type="button" class="btn btn--ghost btn--sm" data-action="retry">Reintentar</button>
      </div>
    </div>`,
  );
}

export async function loadProductsList({ append = false } = {}) {
  try {
    if (await list.load({ append })) renderProductsList();
  } catch (error) {
    console.error("Error al cargar productos:", error);

    if (append) {
      notify.error(getErrorMessage(error, "No se pudieron cargar más productos."));
    } else {
      renderLoadError(error);
    }
  }
}

// ============================================================
// PANEL DE ALTA / EDICIÓN
// ============================================================

function showProductModal(product = null) {
  const overlay = $("productModalOverlay");
  const panel = $("productFormPanel");
  if (!overlay || !panel) return;

  modalOpener = document.activeElement;

  $("managedProductId").value = product?.id || "";
  $("productName").value = product?.name || "";
  $("productBrand").value = product?.brand || "";
  setUnitValue(product?.measurement_unit || "ml");
  $("productStock").value = product ? Number(product.stock) : "";
  $("productCost").value = product ? Number(product.unit_cost) : "";
  $("productModalTitle").textContent = product
    ? "Editar producto"
    : "Nuevo producto";

  feedback.clear();
  feedback.clearInvalid();
  dirty.reset();

  overlay.classList.add("is-open");
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => $("productName").focus({ preventScroll: true }));
}

function closeProductModal() {
  $("productModalOverlay")?.classList.remove("is-open");
  const panel = $("productFormPanel");
  panel?.classList.remove("is-open");
  panel?.setAttribute("aria-hidden", "true");

  if (modalOpener && modalOpener.isConnected) {
    modalOpener.focus({ preventScroll: true });
  }
  modalOpener = null;
}

// Un clic fuera del panel o Escape no deben borrar lo ya escrito.
function requestCloseProductModal() {
  if (dirty.isDirty()) {
    feedback.show(
      "warning",
      "Hay datos sin guardar. Usá Cancelar o × para descartarlos.",
      "dirty",
    );
    return;
  }

  closeProductModal();
}

function formData() {
  return {
    name: $("productName").value.trim(),
    brand: $("productBrand").value.trim() || null,
    measurement_unit: $("productUnit").value,
    stock: Number($("productStock").value) || 0,
    unit_cost: Number($("productCost").value) || 0,
  };
}

function validateForm(data) {
  const errors = [];

  if (!data.name) {
    errors.push({
      message: "Ingresá el nombre del producto.",
      fields: ["productName"],
    });
  }

  if (data.stock < 0) {
    errors.push({
      message: "El stock no puede ser negativo.",
      fields: ["productStock"],
    });
  }

  if (data.unit_cost < 0) {
    errors.push({
      message: "El costo no puede ser negativo.",
      fields: ["productCost"],
    });
  }

  return errors;
}

async function saveProduct() {
  if (isSaving) return;

  feedback.clear();
  feedback.clearInvalid();

  const id = $("managedProductId").value;
  const data = formData();
  const errors = validateForm(data);

  if (errors.length > 0) {
    errors.forEach((error) => feedback.invalidate(error.fields));
    feedback.show(
      "error",
      errors.length === 1
        ? errors[0].message
        : "Completá los campos marcados para continuar.",
    );
    document.querySelector("#productFormPanel [aria-invalid='true']")?.focus();
    return;
  }

  const saveButton = $("productModalSave");
  isSaving = true;
  setBusy(saveButton, true);

  try {
    const result = id
      ? await updateProduct(id, data)
      : await createProduct(data);

    if (!result.success) {
      throw new ApiError(result.error || "No se pudo guardar el producto.", {
        kind: "request",
      });
    }

    closeProductModal();
    notify.success(id ? "Producto actualizado." : "Producto creado.");

    await loadProductsList();
  } catch (error) {
    console.error("Error al guardar producto:", error);
    feedback.show(
      "error",
      getErrorMessage(error, "No se pudo guardar el producto."),
    );
  } finally {
    isSaving = false;
    setBusy(saveButton, false);
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
    await loadProductsList();
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
    showProductModal();
    return;
  }

  if (action === "retry") {
    await loadProductsList();
    return;
  }

  if (action === "more") {
    setBusy(button, true);
    await loadProductsList({ append: true });
    setBusy(button, false);
    return;
  }

  const id = button.dataset.id;
  const product = list.state.items.find((item) => String(item.id) === id);

  if (!product) return;

  if (action === "edit") {
    showProductModal(product);
    return;
  }

  if (action === "delete") {
    const confirmed = await confirmAction({
      title: "Eliminar producto",
      message: `Vas a eliminar «${product.name}». Esta acción no se puede deshacer. Si ya se usó en alguna ficha no se podrá eliminar: en ese caso desactivalo.`,
      confirmLabel: "Eliminar",
      danger: true,
    });

    if (!confirmed) return;

    await runAction(
      button,
      () => deleteProduct(id),
      "Producto eliminado.",
      "No se pudo eliminar el producto.",
    );
    return;
  }

  if (action === "activate") {
    await runAction(
      button,
      () => activateProduct(id),
      "Producto activado.",
      "No se pudo activar el producto.",
    );
    return;
  }

  if (action === "deactivate") {
    await runAction(
      button,
      () => deactivateProduct(id),
      "Producto desactivado.",
      "No se pudo desactivar el producto.",
    );
  }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

export function initProducts() {
  const panel = $("productFormPanel");

  feedback = createFeedback(panel);
  dirty = createDirtyTracker(panel);
  clearInvalidOnInput(panel);
  panel.addEventListener("input", () => feedback.clear("dirty"));

  const refreshProducts = () => {
    void loadProductsList();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshProducts, {
      once: true,
    });
  } else {
    refreshProducts();
  }

  $("btnAddProduct")?.addEventListener("click", () => showProductModal());

  const reloadSoon = debounce(() => loadProductsList());

  $("adminProductSearch")?.addEventListener("input", (event) => {
    list.state.search = event.target.value;
    reloadSoon();
  });

  $("adminProductsTableBody")?.addEventListener("click", handleTableAction);

  const filterButtons = Array.from(
    document.querySelectorAll("#viewProducts .btn-filter[data-filter]"),
  );

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      list.state.filter = button.dataset.filter;
      setActiveFilter(filterButtons, button);
      loadProductsList();
    });
  });

  $("productUnit")?.addEventListener("change", updateUnitLabels);

  $("productModalClose")?.addEventListener("click", closeProductModal);
  $("productModalCancel")?.addEventListener("click", closeProductModal);
  $("productModalOverlay")?.addEventListener("click", requestCloseProductModal);

  $("productForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProduct();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if ($("productFormPanel")?.classList.contains("is-open")) {
      requestCloseProductModal();
    }
  });
}
