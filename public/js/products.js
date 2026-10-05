import {
  fetchAllProducts,
  createProduct,
  updateProduct,
  activateProduct,
  deactivateProduct,
  deleteProduct,
} from "./api.js";

const productsState = {
  products: [],
  filter: "todos",
  search: "",
};

let initialized = false;

const UNIT_LABELS = {
  ml: "Mililitros (ml)",
  g: "Gramos (g)",
  unidad: "Unidad",
};

// ==========================================================================
// SELECT PROPIO DE UNIDAD DE MEDIDA (BOTÓN + LISTA)
// ==========================================================================

function getUnitSelectEls() {
  return {
    wrapper: document.getElementById("productUnitSelect"),
    hiddenInput: document.getElementById("productUnit"),
    trigger: document.getElementById("productUnitTrigger"),
    valueLabel: document.querySelector(
      "#productUnitTrigger .custom-select__value",
    ),
    list: document.getElementById("productUnitList"),
    options: Array.from(
      document.querySelectorAll("#productUnitList .custom-select__option"),
    ),
  };
}

function isUnitListOpen() {
  return Boolean(
    document.getElementById("productUnitSelect")?.classList.contains("is-open"),
  );
}

// Sincroniza el input oculto (lo que lee formData()), el texto visible
// del botón y el estado "seleccionado" de cada opción de la lista.
function setUnitValue(value) {
  const { hiddenInput, valueLabel, options } = getUnitSelectEls();
  if (!hiddenInput) return;

  const unit = UNIT_LABELS[value] ? value : "ml";

  hiddenInput.value = unit;
  if (valueLabel) valueLabel.textContent = UNIT_LABELS[unit];

  options.forEach((option) => {
    const isSelected = option.dataset.value === unit;
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
  });
}

function openUnitList() {
  const { wrapper, trigger, options } = getUnitSelectEls();
  if (!wrapper) return;

  wrapper.classList.add("is-open");
  trigger?.setAttribute("aria-expanded", "true");

  const selected = options.find((option) =>
    option.classList.contains("is-selected"),
  );
  (selected || options[0])?.focus();
}

function closeUnitList({ refocusTrigger = false } = {}) {
  const { wrapper, trigger } = getUnitSelectEls();
  if (!wrapper) return;

  wrapper.classList.remove("is-open");
  trigger?.setAttribute("aria-expanded", "false");

  if (refocusTrigger) trigger?.focus();
}

function initUnitSelect() {
  const { hiddenInput, trigger, list, options } = getUnitSelectEls();
  if (!trigger || !list) return;

  setUnitValue(hiddenInput?.value);

  trigger.addEventListener("click", () => {
    if (isUnitListOpen()) {
      closeUnitList();
    } else {
      openUnitList();
    }
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      setUnitValue(option.dataset.value);
      closeUnitList({ refocusTrigger: true });
    });
  });

  list.addEventListener("keydown", (event) => {
    const currentIndex = options.indexOf(document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      (options[currentIndex + 1] || options[0]).focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      (options[currentIndex - 1] || options[options.length - 1]).focus();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const focused = options[currentIndex];
      if (focused) {
        setUnitValue(focused.dataset.value);
        closeUnitList({ refocusTrigger: true });
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      options[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      options[options.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeUnitList({ refocusTrigger: true });
    }
  });

  document.addEventListener("click", (event) => {
    if (!isUnitListOpen()) return;
    const { wrapper } = getUnitSelectEls();
    if (wrapper && !wrapper.contains(event.target)) {
      closeUnitList();
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isActive(product) {
  return product.active === true || Number(product.active) === 1;
}

function formatStock(product) {
  return `${Number(product.stock)} ${product.measurement_unit}`;
}

function formatCost(product) {
  return `$${Number(product.unit_cost).toFixed(2)} / ${product.measurement_unit}`;
}

function renderProductsList() {
  const body = document.querySelector("#viewProducts #adminProductsTableBody");
  if (!body) return;

  const products = productsState.products;

  if (!products.length) {
    body.innerHTML =
      '<tr><td colspan="6" class="panel-empty">No se encontraron productos.</td></tr>';
    return;
  }

  body.innerHTML = products
    .map((product) => {
      const active = isActive(product);
      const action = active ? "deactivate" : "activate";
      const label = active ? "Desactivar" : "Activar";

      return `
      <tr data-product-id="${escapeHtml(product.id)}">
        <td data-label="Nombre">${escapeHtml(product.name)}</td>
        <td data-label="Marca">${escapeHtml(product.brand || "—")}</td>
        <td data-label="Stock">${escapeHtml(formatStock(product))}</td>
        <td data-label="Costo">${escapeHtml(formatCost(product))}</td>
        <td data-label="Estado"><span class="status-badge status-badge--${active ? "activo" : "inactivo"}">${active ? "Activo" : "Inactivo"}</span></td>
        <td data-label="Acciones"><div class="data-table__actions">
          <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${escapeHtml(product.id)}">Editar</button>
          <button class="btn btn--ghost btn--sm" data-action="${action}" data-id="${escapeHtml(product.id)}">${label}</button>
          <button class="btn btn--danger btn--sm" data-action="delete" data-id="${escapeHtml(product.id)}">Eliminar</button>
        </div></td>
      </tr>`;
    })
    .join("");
}

function showProductModal(product = null) {
  const overlay = document.getElementById("productModalOverlay");
  const panel = document.getElementById("productFormPanel");
  if (!overlay || !panel) return;

  document.getElementById("managedProductId").value = product?.id || "";
  document.getElementById("productName").value = product?.name || "";
  document.getElementById("productBrand").value = product?.brand || "";
  setUnitValue(product?.measurement_unit || "ml");
  document.getElementById("productStock").value = product
    ? Number(product.stock)
    : "";
  document.getElementById("productCost").value = product
    ? Number(product.unit_cost)
    : "";
  document.getElementById("productModalTitle").textContent = product
    ? "Editar producto"
    : "Nuevo producto";

  overlay.classList.add("is-open");
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
}

function closeProductModal() {
  document.getElementById("productModalOverlay")?.classList.remove("is-open");
  const panel = document.getElementById("productFormPanel");
  panel?.classList.remove("is-open");
  panel?.setAttribute("aria-hidden", "true");
  closeUnitList();
}

function formData() {
  return {
    name: document.getElementById("productName").value.trim(),
    brand: document.getElementById("productBrand").value.trim() || null,
    measurement_unit: document.getElementById("productUnit").value,
    stock: Number(document.getElementById("productStock").value) || 0,
    unit_cost: Number(document.getElementById("productCost").value) || 0,
  };
}

async function saveProduct() {
  const id = document.getElementById("managedProductId").value;
  const data = formData();

  if (!data.name) {
    alert("El nombre del producto es obligatorio.");
    return;
  }

  try {
    const result = id
      ? await handleUpdateProduct(id, data)
      : await handleCreateProduct(data);
    if (!result.success)
      throw new Error(result.error || "No se pudo guardar el producto.");
    closeProductModal();
    renderProductsList();
  } catch (error) {
    console.error("Error al guardar producto:", error);
    alert(error.message);
  }
}

async function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const product = productsState.products.find((item) => String(item.id) === id);

  try {
    if (button.dataset.action === "edit") {
      showProductModal(product);
      return;
    }

    if (button.dataset.action === "delete") {
      if (!confirm("¿Eliminar este producto?")) return;
      const result = await handleDeleteProduct(id);
      if (!result.success)
        throw new Error(result.error || "No se pudo eliminar el producto.");
    }

    if (button.dataset.action === "activate") {
      const result = await handleActivateProduct(id);
      if (!result.success)
        throw new Error(result.error || "No se pudo activar el producto.");
    }

    if (button.dataset.action === "deactivate") {
      const result = await handleDeactivateProduct(id);
      if (!result.success)
        throw new Error(result.error || "No se pudo desactivar el producto.");
    }

    renderProductsList();
  } catch (error) {
    console.error("Error al modificar producto:", error);
    alert(error.message);
  }
}

async function loadProducts(signal = null) {
  const firstPage = await fetchAllProducts(
    productsState.search,
    productsState.filter,
    signal,
  );

  if (!Array.isArray(firstPage?.data)) {
    throw new TypeError("La respuesta de productos no contiene una lista válida.");
  }

  const products = [...firstPage.data];
  const perPage = Number(firstPage.per_page);
  const totalPages = Math.ceil(Number(firstPage.total) / perPage);

  for (let page = 2; page <= totalPages; page += 1) {
    const result = await fetchAllProducts(
      productsState.search,
      productsState.filter,
      signal,
      page,
      perPage,
    );
    if (!Array.isArray(result?.data)) {
      throw new TypeError("La respuesta de productos no contiene una lista válida.");
    }
    products.push(...result.data);
  }

  productsState.products = products;
  return productsState.products;
}

export async function loadProductsList(signal = null) {
  const body = document.querySelector("#viewProducts #adminProductsTableBody");
  try {
    await loadProducts(signal);
    renderProductsList();
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error("Error al cargar productos:", error);
    if (body)
      body.innerHTML =
        '<tr><td colspan="6" class="panel-empty">Error al cargar productos.</td></tr>';
  }
}

async function handleCreateProduct(data) {
  const result = await createProduct(data);
  await loadProducts();
  return result;
}

async function handleUpdateProduct(id, data) {
  const result = await updateProduct(id, data);
  await loadProducts();
  return result;
}

async function handleActivateProduct(id) {
  const result = await activateProduct(id);
  await loadProducts();
  return result;
}

async function handleDeactivateProduct(id) {
  const result = await deactivateProduct(id);
  await loadProducts();
  return result;
}

async function handleDeleteProduct(id) {
  const result = await deleteProduct(id);
  await loadProducts();
  return result;
}

export function initProducts() {
  if (initialized) return;
  initialized = true;

  initUnitSelect();

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

  document
    .querySelector("#viewProducts #btnAddProduct")
    ?.addEventListener("click", () => showProductModal());

  // Variables para la cancelación de peticiones
  let adminSearchDebounce = null;
  let adminSearchController = null;

  // Listener para el input de búsqueda (remota)
  document
    .querySelector("#viewProducts #adminProductSearch")
    ?.addEventListener("input", (event) => {
      productsState.search = String(event.target.value ?? "").trim();

      clearTimeout(adminSearchDebounce);

      if (adminSearchController) {
        adminSearchController.abort();
      }
      adminSearchController = new AbortController();

      adminSearchDebounce = setTimeout(async () => {
        await loadProductsList(adminSearchController.signal);
      }, 150);
    });

  document
    .querySelector("#viewProducts #adminProductsTableBody")
    ?.addEventListener("click", handleTableAction);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (
      document.getElementById("productFormPanel")?.classList.contains("is-open")
    ) {
      closeProductModal();
    }
  });

  // Listener para los botones de estado (dispara carga remota)
  document
    .querySelectorAll("#viewProducts .btn-filter[data-filter]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        productsState.filter = button.dataset.filter;

        document
          .querySelectorAll("#viewProducts .btn-filter[data-filter]")
          .forEach((item) => {
            item.classList.toggle("active", item === button);
          });

        await loadProductsList();
      });
    });

  document
    .getElementById("productModalClose")
    ?.addEventListener("click", closeProductModal);
  document
    .getElementById("productModalCancel")
    ?.addEventListener("click", closeProductModal);
  document
    .getElementById("productModalSave")
    ?.addEventListener("click", saveProduct);
  document
    .getElementById("productModalOverlay")
    ?.addEventListener("click", closeProductModal);
}
