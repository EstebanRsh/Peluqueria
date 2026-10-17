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
import { UNIT_NAMES } from "./constants.js";
import { $, escapeHtml, isActive, setActiveFilter } from "./dom.js";
import {
  clearInvalidOnInput,
  createDirtyTracker,
  createDrawer,
  createFeedback,
  setBusy,
} from "./feedback.js";
import {
  createListLoader,
  debounce,
  loadErrorHtml,
  moreRowHtml,
  refreshAfterChange,
  renderMessageRow,
  rowActionsHtml,
  runTableAction,
} from "./list.js";
import { confirmAction } from "./confirm.js";
import { notify } from "./toast.js";

const list = createListLoader(fetchAllProducts, $("adminProductSearch"));

let isSaving = false;
let feedback = null;
let dirty = null;
let drawer = null;

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
    unitSelect.value = UNIT_NAMES[value] ? value : "ml";
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

function renderProductsList() {
  const body = $("adminProductsTableBody");
  if (!body) return;

  const products = list.state.items;

  if (!products.length) {
    renderMessageRow(
      body,
      6,
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
      const name = escapeHtml(product.name);
      const id = escapeHtml(product.id);

      return `
      <tr data-product-id="${id}">
        <td data-label="Nombre">${name}</td>
        <td data-label="Marca">${escapeHtml(product.brand || "—")}</td>
        <td data-label="Stock">${escapeHtml(formatStock(product))}</td>
        <td data-label="Costo">${escapeHtml(formatCost(product))}</td>
        <td data-label="Estado"><span class="status-badge status-badge--${active ? "activo" : "inactivo"}">${active ? "Activo" : "Inactivo"}</span></td>
        <td data-label="Acciones">${rowActionsHtml(product.id, product.name, active)}</td>
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
    6,
    loadErrorHtml(error, "No se pudieron cargar los productos."),
  );
}

export async function loadProductsList({ append = false } = {}) {
  try {
    if (await list.load({ append })) renderProductsList();
  } catch (error) {
    console.error("Error al cargar productos:", error);

    if (append) {
      notify.error(
        getErrorMessage(error, "No se pudieron cargar más productos."),
      );
    } else {
      renderLoadError(error);
    }
  }
}

// ============================================================
// PANEL DE ALTA / EDICIÓN
// ============================================================

function showProductModal(product = null) {
  $("managedProductId").value = product?.id || "";
  $("productName").value = product?.name || "";
  $("productBrand").value = product?.brand || "";
  setUnitValue(product?.measurement_unit || "ml");
  $("productStock").value = product ? Number(product.stock) : "";
  $("productCost").value = product ? Number(product.unit_cost) : "";
  $("productModalTitle").textContent = product
    ? "Editar producto"
    : "Nuevo producto";

  feedback.clearInvalid();
  dirty.reset();

  drawer.open($("productName"));
}

function formData() {
  return {
    name: $("productName").value.trim(),
    brand: $("productBrand").value.trim() || null,
    measurement_unit: $("productUnit").value,
    stock: Number($("productStock").value),
    unit_cost: Number($("productCost").value),
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

  if ($("productStock").value === "" || !(data.stock >= 0)) {
    errors.push({
      message: "Indicá el stock (puede ser 0).",
      fields: ["productStock"],
    });
  }

  if ($("productCost").value === "" || !(data.unit_cost >= 0)) {
    errors.push({
      message: "Indicá el costo por unidad (puede ser 0).",
      fields: ["productCost"],
    });
  }

  return errors;
}

async function saveProduct() {
  if (isSaving) return;

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

    drawer.close();
    notify.success(id ? "Producto actualizado." : "Producto creado.");

    await refreshAfterChange(list, renderProductsList);
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

const runAction = (button, task, success, failure) =>
  runTableAction(button, task, { success, failure }, () =>
    refreshAfterChange(list, renderProductsList),
  );

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
    const confirmed = await confirmAction({
      title: "Activar producto",
      message: `Vas a activar «${product.name}». Vuelve a aparecer al armar fichas.`,
      confirmLabel: "Activar",
    });

    if (!confirmed) return;

    await runAction(
      button,
      () => activateProduct(id),
      "Producto activado.",
      "No se pudo activar el producto.",
    );
    return;
  }

  if (action === "deactivate") {
    const confirmed = await confirmAction({
      title: "Desactivar producto",
      message: `Vas a desactivar «${product.name}». Deja de aparecer al armar fichas, pero conserva su historial. Podés activarlo de nuevo cuando quieras.`,
      confirmLabel: "Desactivar",
    });

    if (!confirmed) return;

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
  drawer = createDrawer({
    overlay: $("productModalOverlay"),
    panel,
    feedback,
    dirty,
  });

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

  $("productModalClose")?.addEventListener("click", () => drawer.close());
  $("productModalCancel")?.addEventListener("click", () => drawer.close());
  $("productModalOverlay")?.addEventListener("click", () =>
    drawer.requestClose(),
  );

  $("productForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProduct();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (drawer.isOpen()) {
      drawer.requestClose();
    }
  });
}
