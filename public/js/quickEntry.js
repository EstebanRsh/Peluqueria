// ============================================================
// FICHA RÁPIDA DE SERVICIO
// ============================================================

import { saveServiceHistory, searchClients, searchProducts } from "./api.js";

export function initQuickEntry() {
  // REFERENCIAS AL DOM
  const panel = document.getElementById("quickEntryPanel");
  const overlay = document.getElementById("quickEntryOverlay");
  const btnClose = document.getElementById("quickEntryClose");
  const btnCancel = document.getElementById("quickEntryCancel");
  const btnSave = document.getElementById("quickEntrySave");
  const btnNewHistory = document.getElementById("btnNewHistory");

  // Confirmación: guardar ficha sin cliente registrado
  const noClientOverlay = document.getElementById("noClientOverlay");
  const noClientDialog = document.getElementById("noClientDialog");
  const noClientBack = document.getElementById("noClientBack");
  const noClientConfirm = document.getElementById("noClientConfirm");

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

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // ============================================================
  // BÚSQUEDA DE CLIENTE (AUTOCOMPLETE CON CACHE Y ABORTCONTROLLER)
  // ============================================================

  const clientSearchInput = document.getElementById("quickEntryClientSearch");
  const clientSuggestionsList = document.getElementById("clientSuggestions");
  const clientIdInput = document.getElementById("quickEntryClientId");

  let clientSearchDebounce = null;
  let clientSearchController = null;
  const clientSearchCache = new Map();

  const renderClientSuggestions = (clients) => {
    if (!clientSuggestionsList) return;

    if (!clients.length) {
      clientSuggestionsList.style.display = "none";
      clientSuggestionsList.innerHTML = "";
      return;
    }

    clientSuggestionsList.innerHTML = clients
      .map(
        (client) => `
        <li data-id="${escapeHtml(client.id)}" data-alias="${escapeHtml(client.alias)}">
          ${escapeHtml(client.alias)}${client.internal_code ? ` (${escapeHtml(client.internal_code)})` : ""}
        </li>`,
      )
      .join("");
    clientSuggestionsList.style.display = "block";
  };

  const clearClientSelection = () => {
    if (clientIdInput) clientIdInput.value = "";
    renderClientSuggestions([]);
  };

  if (clientSearchInput && clientSuggestionsList && clientIdInput) {
    clientSearchInput.addEventListener("input", () => {
      clientIdInput.value = "";
      const query = clientSearchInput.value.trim();

      clearTimeout(clientSearchDebounce);

      if (!query) {
        renderClientSuggestions([]);
        return;
      }

      const cacheKey = query.toLowerCase();

      if (clientSearchCache.has(cacheKey)) {
        renderClientSuggestions(clientSearchCache.get(cacheKey));
        return;
      }

      if (clientSearchController) {
        clientSearchController.abort();
      }
      clientSearchController = new AbortController();

      clientSearchDebounce = setTimeout(async () => {
        try {
          const results = await searchClients(
            query,
            clientSearchController.signal,
          );
          const validResults = Array.isArray(results) ? results : [];

          clientSearchCache.set(cacheKey, validResults);
          renderClientSuggestions(validResults);
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Error al buscar clientes:", error);
            renderClientSuggestions([]);
          }
        }
      }, 150);
    });

    clientSuggestionsList.addEventListener("click", (event) => {
      const item = event.target.closest("li[data-id]");
      if (!item) return;

      clientIdInput.value = item.dataset.id;
      clientSearchInput.value = item.dataset.alias;
      renderClientSuggestions([]);

      if (clientSearchController) {
        clientSearchController.abort();
      }
    });

    document.addEventListener("click", (event) => {
      if (
        !clientSuggestionsList.contains(event.target) &&
        event.target !== clientSearchInput
      ) {
        clientSuggestionsList.style.display = "none";
      }
    });

    clientSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        clientSuggestionsList.style.display = "none";
      }
    });
  }

  // ============================================================
  // NAVEGACIÓN POR PESTAÑAS
  // ============================================================

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

  // ============================================================
  // SINCRONIZACIÓN DE SLIDERS
  // ============================================================

  document.querySelectorAll(".label-with-val").forEach((group) => {
    const range = group.querySelector('input[type="range"]');
    const number = group.querySelector('input[type="number"]');

    if (range && number) {
      range.addEventListener("input", () => {
        number.value = range.value;
        number.dataset.edited = "true";
      });
      number.addEventListener("input", () => {
        range.value = number.value;
        number.dataset.edited = "true";
      });
    }
  });

  // ============================================================
  // MINI POS: BÚSQUEDA DE PRODUCTOS (SERVIDOR + CACHE + ABORTCONTROLLER)
  // ============================================================

  const quickEntryRoot = document.getElementById("panelGeneral");
  const productSearch = quickEntryRoot?.querySelector(
    "#quickEntryProductSearch",
  );
  const productSuggestionsList = quickEntryRoot?.querySelector(
    "#quickEntryProductSuggestions",
  );
  const productsTableBody = quickEntryRoot?.querySelector(
    "#quickEntryProductsTableBody",
  );

  const UNIT_LABELS = { ml: "ml", g: "g", unidad: "unid." };

  let productSearchDebounce = null;
  let productSearchController = null;
  const productSearchCache = new Map();
  let lastFetchedProducts = [];

  const hideProductSuggestions = () => {
    if (!productSuggestionsList) return;
    productSuggestionsList.style.display = "none";
    productSuggestionsList.innerHTML = "";
  };

  const renderProductSuggestions = (products) => {
    if (!productSuggestionsList) return;

    if (!products.length) {
      productSuggestionsList.innerHTML = `<li class="autocomplete-hint" aria-disabled="true">No se encontraron productos.</li>`;
      productSuggestionsList.style.display = "block";
      return;
    }

    productSuggestionsList.innerHTML = products
      .map(
        (product) => `
        <li data-id="${escapeHtml(product.id)}">
          ${escapeHtml(product.name)}${product.brand ? ` — ${escapeHtml(product.brand)}` : ""}
        </li>`,
      )
      .join("");
    productSuggestionsList.style.display = "block";
  };

  if (productSearch && productSuggestionsList) {
    productSearch.addEventListener("input", () => {
      const query = productSearch.value.trim();

      clearTimeout(productSearchDebounce);

      if (!query) {
        hideProductSuggestions();
        return;
      }

      const cacheKey = query.toLowerCase();

      if (productSearchCache.has(cacheKey)) {
        const cached = productSearchCache.get(cacheKey);
        lastFetchedProducts = cached;
        renderProductSuggestions(cached);
        return;
      }

      if (productSearchController) {
        productSearchController.abort();
      }
      productSearchController = new AbortController();

      productSearchDebounce = setTimeout(async () => {
        try {
          const results = await searchProducts(
            query,
            productSearchController.signal,
          );
          const validResults = Array.isArray(results) ? results : [];

          productSearchCache.set(cacheKey, validResults);
          lastFetchedProducts = validResults;
          renderProductSuggestions(validResults);
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Error al buscar productos:", error);
            hideProductSuggestions();
          }
        }
      }, 150);
    });

    productSuggestionsList.addEventListener("click", (event) => {
      const item = event.target.closest("li[data-id]");
      if (!item) return;

      const product = lastFetchedProducts.find(
        (p) => String(p.id) === item.dataset.id,
      );
      if (!product) return;

      const existing = cartItems.find(
        (entry) => entry.product_id === product.id,
      );

      if (existing) {
        existing.quantity += 1;
      } else {
        cartItems.push({
          item_id: Date.now(),
          product_id: product.id,
          name: product.name,
          brand: product.brand || null,
          unit: product.measurement_unit,
          quantity: 1,
        });
      }

      renderCart();
      productSearch.value = "";
      hideProductSuggestions();

      if (productSearchController) {
        productSearchController.abort();
      }
    });

    document.addEventListener("click", (event) => {
      if (
        !productSuggestionsList.contains(event.target) &&
        event.target !== productSearch
      ) {
        hideProductSuggestions();
      }
    });

    productSearch.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideProductSuggestions();
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
                <td>${escapeHtml(UNIT_LABELS[item.unit] || item.unit || "—")}</td>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.brand || "—")}</td>
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

  // ============================================================
  // RECOLECCIÓN DE DATOS
  // ============================================================

  const textOrNull = (id) => {
    const value = document.getElementById(id)?.value.trim() || "";
    return value === "" ? null : value;
  };

  const numberOrNull = (id) => {
    const input = document.getElementById(id);
    const raw = input?.value;
    if (raw === undefined || raw === "" || input.dataset.edited !== "true") {
      return null;
    }
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

  const buildJSON = () => {
    const clientId = document.getElementById("quickEntryClientId").value || null;
    const clientNameTyped = document
      .getElementById("quickEntryClientSearch")
      .value.trim();

    return {
      client_id: clientId,
      client_name: clientId ? null : clientNameTyped || null,
      consumptions: cartItems.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      })),
      details: {
        general: buildGeneral(),
        color: buildColor(),
        treatment: buildTreatment(),
        cut: buildCut(),
      },
    };
  };

  const hasData = (payload) => {
    const { general, color, treatment, cut } = payload.details;

    const categoryHasData = (category) =>
      Object.values(category).some((value) =>
        Array.isArray(value) ? value.length > 0 : value !== null,
      );

    return [general, color, treatment, cut].some(categoryHasData);
  };

  // ============================================================
  // CONFIRMACIÓN: GUARDAR SIN CLIENTE
  // ============================================================

  let resolveNoClientDialog = null;

  const openNoClientDialog = () => {
    if (!noClientOverlay || !noClientDialog) return;
    noClientOverlay.classList.add("is-open");
    noClientDialog.classList.add("is-open");
    noClientDialog.setAttribute("aria-hidden", "false");
  };

  const closeNoClientDialog = () => {
    if (!noClientOverlay || !noClientDialog) return;
    noClientOverlay.classList.remove("is-open");
    noClientDialog.classList.remove("is-open");
    noClientDialog.setAttribute("aria-hidden", "true");
  };

  const askConfirmSaveWithoutClient = () => {
    if (!noClientDialog) return Promise.resolve(false);

    return new Promise((resolve) => {
      resolveNoClientDialog = resolve;
      openNoClientDialog();
    });
  };

  const settleNoClientDialog = (result) => {
    closeNoClientDialog();
    if (resolveNoClientDialog) {
      resolveNoClientDialog(result);
      resolveNoClientDialog = null;
    }
  };

  if (noClientConfirm) {
    noClientConfirm.addEventListener("click", () => settleNoClientDialog(true));
  }
  if (noClientBack) {
    noClientBack.addEventListener("click", () => settleNoClientDialog(false));
  }
  if (noClientOverlay) {
    noClientOverlay.addEventListener("click", () =>
      settleNoClientDialog(false),
    );
  }
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      noClientDialog &&
      noClientDialog.classList.contains("is-open")
    ) {
      settleNoClientDialog(false);
    }
  });

  // ============================================================
  // GUARDAR
  // ============================================================

  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      const data = buildJSON();

      if (!data.client_id && !data.client_name) {
        alert("Por favor, seleccione un cliente o ingrese al menos su nombre.");
        return;
      }

      if (!data.client_id) {
        const wantsToSaveAnyway = await askConfirmSaveWithoutClient();
        if (!wantsToSaveAnyway) {
          document.getElementById("quickEntryClientSearch").focus();
          return;
        }
      }

      if (!hasData(data)) {
        alert("Complete al menos un campo de algún servicio antes de guardar.");
        return;
      }

      try {
        btnSave.disabled = true;
        btnSave.textContent = "Guardando...";

        const result = await saveServiceHistory(data);

        if (!result.success) {
          throw new Error(result.error || "No se pudo guardar la ficha.");
        }

        alert("Ficha guardada con éxito.");
        closeDrawer();
      } catch (error) {
        console.error("Error al guardar ficha:", error);
        alert(error.message || "Ocurrió un error al guardar.");
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = "Guardar Ficha";
      }
    });
  }

  // ============================================================
  // RESETEO DE FORMULARIO
  // ============================================================

  const resetForm = () => {
    document
      .querySelectorAll(
        '#quickEntryPanel input[type="text"], #quickEntryPanel textarea',
      )
      .forEach((input) => (input.value = ""));
    document.getElementById("quickEntryClientId").value = "";
    clearClientSelection();

    document.querySelectorAll('input[type="range"]').forEach((range) => {
      const defVal = range.getAttribute("value") || range.min;
      range.value = defVal;
      const num = range.parentElement.querySelector('input[type="number"]');
      if (num) {
        num.value = defVal;
        delete num.dataset.edited;
      }
    });

    activeCategory = DEFAULT_CATEGORY;
    render();

    cartItems = [];
    renderCart();
    hideProductSuggestions();
  };
}
