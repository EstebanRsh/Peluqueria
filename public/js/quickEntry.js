// ============================================================
// FICHA RÁPIDA DE SERVICIO
// ============================================================

export function initQuickEntry() {
  // REFERENCIAS AL DOM
  const panel = document.getElementById("quickEntryPanel");
  const overlay = document.getElementById("quickEntryOverlay");
  const btnClose = document.getElementById("quickEntryClose");
  const btnCancel = document.getElementById("quickEntryCancel");
  const btnSave = document.getElementById("quickEntrySave");
  const btnNewHistory = document.getElementById("btnNewHistory");

  let cartItems = [];

  // CONTROL DE APERTURA Y CIERRE
  const openDrawer = () => {
    panel.setAttribute("aria-hidden", "false");
    panel.classList.add("is-open");
    overlay.classList.add("is-open");
  };

  const closeDrawer = () => {
    panel.setAttribute("aria-hidden", "true");
    panel.classList.remove("is-open");
    overlay.classList.remove("is-open");
    resetForm();
  };

  if (btnNewHistory) btnNewHistory.addEventListener("click", openDrawer);
  if (btnClose) btnClose.addEventListener("click", closeDrawer);
  if (btnCancel) btnCancel.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);

  // NAVEGACIÓN POR PESTAÑAS

  const tabs = Array.from(document.querySelectorAll(".quick-cat-btn"));
  const allDynamicPanels = Array.from(
    document.querySelectorAll(".dynamic-panel"),
  );

  const DEFAULT_CATEGORY = tabs[0]?.dataset.category || null;
  let activeCategory = DEFAULT_CATEGORY;

  const render = () => {
    tabs.forEach((tab) => {
      const active = tab.dataset.category === activeCategory;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    allDynamicPanels.forEach((p) => {
      p.classList.toggle("is-active", p.dataset.category === activeCategory);
    });
  };

  const setActive = (category) => {
    activeCategory = category;
    render();
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActive(tab.dataset.category));
  });

  // Navegación con flechas entre pestañas.
  const tablist = document.getElementById("quickCategories");

  if (tablist) {
    tablist.addEventListener("keydown", (event) => {
      const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (!keys.includes(event.key)) return;

      event.preventDefault();

      const currentIndex = tabs.findIndex(
        (tab) => tab.dataset.category === activeCategory,
      );

      let nextIndex;
      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else {
        const step = event.key === "ArrowRight" ? 1 : -1;
        nextIndex = (currentIndex + step + tabs.length) % tabs.length;
      }

      const nextTab = tabs[nextIndex];
      setActive(nextTab.dataset.category);
      nextTab.focus();
    });
  }

  render();

  // SINCRONIZACIÓN DE SLIDERS
  document.querySelectorAll(".label-with-val").forEach((group) => {
    const range = group.querySelector('input[type="range"]');
    const number = group.querySelector('input[type="number"]');

    if (range && number) {
      range.addEventListener("input", () => (number.value = range.value));
      number.addEventListener("input", () => (range.value = number.value));
    }
  });

  //  MINI POS: BÚSQUEDA Y CARRITO
  const productSearch = document.getElementById("productSearch");
  const productsTableBody = document.getElementById("productsTableBody");

  if (productSearch) {
    productSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.value.trim() !== "") {
        e.preventDefault();
        const mockProduct = {
          item_id: Date.now(),
          sku: "PROD-01",
          name: e.target.value,
          quantity: 1,
          type: "product",
        };
        cartItems.push(mockProduct);
        renderCart();
        e.target.value = "";
      }
    });
  }

  const renderCart = () => {
    if (cartItems.length === 0) {
      productsTableBody.innerHTML =
        '<tr><td colspan="6" class="panel-loading">No hay productos en la sesión.</td></tr>';
      return;
    }

    productsTableBody.innerHTML = cartItems
      .map(
        (item, index) => `
            <tr>
                <td>
                    <input type="number" min="1" class="input-base" style="width:60px; padding:0.2rem;" 
                           value="${item.quantity}" onchange="window.updateCartQty(${index}, this.value)">
                </td>
                <td>Unid.</td>
                <td>${item.name}</td>
                <td>${item.sku}</td>
                <td>-</td>
                <td>
                    <button class="btn btn--ghost" style="color:red; padding:0.2rem;" onclick="window.removeCartItem(${index})">X</button>
                </td>
            </tr>
        `,
      )
      .join("");
  };

  window.updateCartQty = (index, val) => {
    cartItems[index].quantity = parseInt(val, 10);
  };
  window.removeCartItem = (index) => {
    cartItems.splice(index, 1);
    renderCart();
  };
  // RECOLECCIÓN DE DATOS
  //
  // Ya no hay una lista de categorías "seleccionadas": las cuatro secciones
  // viajan siempre. Lo que decide si un campo llega con datos o en null es
  // si la peluquera escribió algo en él, no si pasó por esa pestaña.

  // Devuelve el valor recortado de un input/textarea, o null si está vacío.
  const textOrNull = (id) => {
    const value = document.getElementById(id)?.value.trim() || "";
    return value === "" ? null : value;
  };

  // Los campos numéricos están atados a un slider, así que siempre traen un
  // valor (el del slider). Se guardan como número; solo dan null si el
  // elemento no existiera.
  const numberOrNull = (id) => {
    const raw = document.getElementById(id)?.value;
    if (raw === undefined || raw === "") return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const buildGeneral = () => ({
    cart_items: cartItems,
    session_notes: textOrNull("sessionNotes"),
    next_visit_notes: textOrNull("nextVisitNotes"),
  });

  const buildColor = () => ({
    type: textOrNull("colorType"),
    ratio: textOrNull("colorOxidantRatio"),
    formula: textOrNull("colorFormula"),
    brand: textOrNull("colorBrand"),
    color_grams: numberOrNull("colorQuantityValue"),
    oxidant_vol: numberOrNull("colorOxidantValue"),
    exposure_time_min: numberOrNull("colorTimeValue"),
    application: textOrNull("colorApplication"),
    result: textOrNull("colorResult"),
  });

  const buildTreatment = () => ({
    type: textOrNull("treatmentType"),
    product: textOrNull("treatmentProduct"),
    quantity_ml: numberOrNull("treatmentMlValue"),
    iron_temp_c: numberOrNull("treatmentTempValue"),
    iron_passes: numberOrNull("treatmentPassesValue"),
    processes: textOrNull("treatmentProcess"),
    results: textOrNull("treatmentResult"),
  });

  const buildCut = () => ({
    type: textOrNull("cutType"),
    length: textOrNull("cutLength"),
    condition: textOrNull("cutCondition"),
    tools: textOrNull("cutTools"),
    finish: textOrNull("cutFinish"),
  });

  const buildJSON = () => ({
    record_id: null,
    client_id: document.getElementById("clientId").value || null,
    date: new Date().toISOString().split("T")[0],
    details: {
      general: buildGeneral(),
      color: buildColor(),
      treatment: buildTreatment(),
      cut: buildCut(),
    },
  });

  // Un objeto de categoría "vacío" es aquel donde todos los campos son null
  // (el carrito cuenta como dato si tiene productos). Se usa solo para el
  // aviso al guardar, no cambia lo que se envía.
  const hasData = (payload) => {
    const { general, color, treatment, cut } = payload.details;

    const categoryHasData = (category) =>
      Object.values(category).some((value) =>
        Array.isArray(value) ? value.length > 0 : value !== null,
      );

    return [general, color, treatment, cut].some(categoryHasData);
  };

  // GUARDAR
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      const data = buildJSON();

      if (!data.client_id && !document.getElementById("clientSearch").value) {
        alert("Por favor, seleccione un cliente.");
        return;
      }
      if (!hasData(data)) {
        alert("Complete al menos un campo de algún servicio antes de guardar.");
        return;
      }

      console.log(
        "JSON empaquetado para el Backend:",
        JSON.stringify(data, null, 2),
      );

      try {
        btnSave.disabled = true;
        btnSave.textContent = "Guardando...";

        // const response = await fetch('/api/services/record', { method: 'POST', body: JSON.stringify(data) });
        await new Promise((resolve) => setTimeout(resolve, 800));

        alert("Ficha guardada con éxito.");
        closeDrawer();
      } catch (error) {
        console.error("Error al guardar ficha:", error);
        alert("Ocurrió un error al guardar.");
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = "Guardar Ficha";
      }
    });
  }

  // RESETEO DE FORMULARIO
  const resetForm = () => {
    document
      .querySelectorAll(
        '#quickEntryPanel input[type="text"], #quickEntryPanel textarea',
      )
      .forEach((input) => (input.value = ""));
    document.getElementById("clientId").value = "";

    document.querySelectorAll('input[type="range"]').forEach((range) => {
      const defVal = range.getAttribute("value") || range.min;
      range.value = defVal;
      const num = range.parentElement.querySelector('input[type="number"]');
      if (num) num.value = defVal;
    });

    activeCategory = DEFAULT_CATEGORY;
    render();

    cartItems = [];
    renderCart();
  };
}
