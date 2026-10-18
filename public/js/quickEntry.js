// ============================================================
// FICHA DE SERVICIO
// ============================================================

import {
  ApiError,
  fetchClientTimeline,
  getErrorMessage,
  saveServiceHistory,
  searchProducts,
  logError,
} from "./api.js";
import { createAutocomplete, createClientAutocomplete } from "./autocomplete.js";
import { UNIT_SHORTS } from "./constants.js";
import { $, escapeHtml } from "./dom.js";
import { clearInvalidOnInput, createFeedback, setBusy } from "./feedback.js";
import { confirmAction, showError, showResult } from "./confirm.js";

// Campos numéricos de la ficha (enteros mayores a 0).
const NUMBER_FIELDS = [
  "colorQuantityValue",
  "colorOxidantValue",
  "colorTimeValue",
  "treatmentMlValue",
  "treatmentTempValue",
  "treatmentPassesValue",
];

// Dónde se guarda cada dato de una ficha anterior dentro del formulario.
const DETAIL_FIELDS = {
  color: {
    type: "colorType",
    ratio: "colorOxidantRatio",
    formula: "colorFormula",
    brand: "colorBrand",
    color_grams: "colorQuantityValue",
    oxidant_vol: "colorOxidantValue",
    exposure_time_min: "colorTimeValue",
    application: "colorApplication",
    result: "colorResult",
  },
  treatment: {
    type: "treatmentType",
    product: "treatmentProduct",
    quantity_ml: "treatmentMlValue",
    iron_temp_c: "treatmentTempValue",
    iron_passes: "treatmentPassesValue",
    processes: "treatmentProcess",
    results: "treatmentResult",
  },
  cut: {
    type: "cutType",
    length: "cutLength",
    condition: "cutCondition",
    tools: "cutTools",
    finish: "cutFinish",
  },
};

// Una categoría tiene datos si algún valor no es nulo ni una lista vacía.
function categoryHasData(category) {
  return Object.values(category).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== null,
  );
}

function isFocusable(element) {
  return Boolean(
    element &&
    element.isConnected &&
    !element.closest("[hidden]") &&
    getComputedStyle(element).visibility !== "hidden",
  );
}

export function initQuickEntry() {
  const panel = $("quickEntryPanel");
  const overlay = $("quickEntryOverlay");
  const btnClose = $("quickEntryClose");
  const btnCancel = $("quickEntryCancel");
  const btnSave = $("quickEntrySave");

  if (!panel || !overlay) {
    return;
  }

  const feedback = createFeedback(panel);
  clearInvalidOnInput(panel);

  let cartItems = [];
  let opener = null;
  let isSaving = false;

  let selectedClient = null;
  let aliasName = "";

  // ============================================================
  // APERTURA Y CIERRE
  // ============================================================

  const openDrawer = () => {
    opener = document.activeElement;

    feedback.clearInvalid();

    panel.setAttribute("aria-hidden", "false");
    panel.classList.add("is-open");
    overlay.classList.add("is-open");

    requestAnimationFrame(() => {
      const target = !$("quickEntryClientSearch").hidden
        ? $("quickEntryClientSearch")
        : panel;
      target.focus({ preventScroll: true });
    });
  };

  const closeDrawer = () => {
    panel.setAttribute("aria-hidden", "true");
    panel.classList.remove("is-open");
    overlay.classList.remove("is-open");
    resetForm();

    const target = isFocusable(opener) ? opener : $("fabToggle");
    target?.focus({ preventScroll: true });
    opener = null;
  };

  // Un clic fuera del panel o Escape no deben borrar lo ya cargado.
  const requestClose = () => {
    if (isDirty()) {
      feedback.show(
        "warning",
        "Hay datos sin guardar. Usá Cancelar o × para descartarlos.",
      );
      return;
    }

    closeDrawer();
  };

  document.addEventListener("quickentry:open", openDrawer);
  btnClose?.addEventListener("click", closeDrawer);
  btnCancel?.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", requestClose);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) {
      requestClose();
    }
  });

  // ============================================================
  // CLIENTE (BÚSQUEDA, ALIAS Y CHIP)
  // ============================================================

  const clientSearchInput = $("quickEntryClientSearch");
  const clientSuggestionsList = $("clientSuggestions");
  const clientIdInput = $("quickEntryClientId");
  const clientChip = $("quickClientSelected");
  const clientHelp = $("quickClientHelp");
  const repeatButton = $("quickRepeatLast");

  const showClientChip = (title, meta, registered) => {
    $("quickClientChipTitle").textContent = title;
    $("quickClientChipMeta").textContent = meta;
    clientChip.hidden = false;
    repeatButton.hidden = !registered;
    clientSearchInput.hidden = true;
    clientSearchInput.value = "";
    clientSearchInput.removeAttribute("aria-invalid");
    clientHelp.hidden = true;
  };

  const selectClient = (client) => {
    selectedClient = client;
    aliasName = "";
    clientIdInput.value = String(client.id);

    showClientChip(
      client.alias ?? client.name ?? "Cliente",
      client.internal_code
        ? `Código ${client.internal_code}`
        : "Cliente registrado",
      true,
    );
  };

  const useAlias = (text) => {
    selectedClient = null;
    aliasName = text;
    clientIdInput.value = "";

    showClientChip(text, "Alias de referencia · sin cliente registrado", false);
  };

  const clearClientUi = () => {
    selectedClient = null;
    aliasName = "";
    clientIdInput.value = "";
    clientChip.hidden = true;
    repeatButton.hidden = true;
    clientSearchInput.hidden = false;
    clientHelp.hidden = false;
    clientAutocomplete?.reset();
  };

  const clientAutocomplete =
    clientSearchInput && clientSuggestionsList
      ? createClientAutocomplete({
          input: clientSearchInput,
          list: clientSuggestionsList,
          onSelect: selectClient,
          onAlias: useAlias,
        })
      : null;

  $("quickClientChange")?.addEventListener("click", () => {
    clearClientUi();
    clientSearchInput.focus();
  });

  // ============================================================
  // NAVEGACIÓN POR PESTAÑAS
  // ============================================================

  const tabs = Array.from(document.querySelectorAll(".quick-cat-btn"));
  const allDynamicPanels = Array.from(
    document.querySelectorAll(".dynamic-panel"),
  );

  tabs.forEach((tab) => {
    tab.dataset.label = tab.textContent.trim();
  });

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

  const tablist = $("quickCategories");

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
  // VALORES FRECUENTES DE LOS CAMPOS NUMÉRICOS
  // ============================================================

  panel.querySelectorAll("input[data-presets]").forEach((input) => {
    const values = input.dataset.presets
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const label = document.querySelector(`label[for="${input.id}"]`);
    const group = document.createElement("div");

    group.className = "preset-chips";
    group.setAttribute("role", "group");
    group.setAttribute(
      "aria-label",
      `Valores frecuentes${label ? ` de ${label.textContent.trim().toLowerCase()}` : ""}`,
    );

    values.forEach((value) => {
      const chip = document.createElement("button");

      chip.type = "button";
      chip.className = "btn-filter preset-chip";
      chip.dataset.value = value;
      chip.setAttribute("aria-pressed", "false");
      chip.textContent = value;

      chip.addEventListener("click", () => {
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

      group.appendChild(chip);
    });

    input.closest(".input-with-unit")?.insertAdjacentElement("afterend", group);

    input.addEventListener("input", () => {
      group.querySelectorAll(".preset-chip").forEach((chip) => {
        const selected = input.value === chip.dataset.value;

        chip.classList.toggle("is-active", selected);
        chip.setAttribute("aria-pressed", String(selected));
      });
    });
  });

  // ============================================================
  // MINI POS: PRODUCTOS USADOS
  // ============================================================

  const productSearch = $("quickEntryProductSearch");
  const productSuggestionsList = $("quickEntryProductSuggestions");
  const productsTableBody = $("quickEntryProductsTableBody");

  const addProductToCart = (product) => {
    const existing = cartItems.find((entry) => entry.product_id === product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cartItems.push({
        product_id: product.id,
        name: product.name,
        brand: product.brand || null,
        unit: product.measurement_unit,
        quantity: 1,
      });
    }

    renderCart();
    productSearch.value = "";
  };

  const productAutocomplete =
    productSearch && productSuggestionsList
      ? createAutocomplete({
          input: productSearch,
          list: productSuggestionsList,
          emptyMessage: "No se encontraron productos.",
          search: (query, signal) => searchProducts(query, signal),
          getTitle: (product) => product.name ?? "",
          getSubtitle: (product) =>
            [
              product.brand,
              UNIT_SHORTS[product.measurement_unit] ?? product.measurement_unit,
            ]
              .filter(Boolean)
              .join(" · "),
          onSelect: addProductToCart,
        })
      : null;

  function renderCart() {
    if (!productsTableBody) return;

    if (cartItems.length === 0) {
      productsTableBody.innerHTML =
        '<tr><td colspan="5" class="panel-empty">Todavía no agregaste productos.</td></tr>';
      updateTabIndicators();
      return;
    }

    productsTableBody.innerHTML = cartItems
      .map(
        (item, index) => `
          <tr>
            <td data-label="Cantidad">
              <input type="number" min="1" step="1" inputmode="numeric" class="cart-quantity"
                value="${item.quantity}" data-index="${index}"
                aria-label="Cantidad de ${escapeHtml(item.name)}">
            </td>
            <td data-label="Unidad">${escapeHtml(UNIT_SHORTS[item.unit] || item.unit || "—")}</td>
            <td data-label="Nombre">${escapeHtml(item.name)}</td>
            <td data-label="Marca">${escapeHtml(item.brand || "—")}</td>
            <td data-label="Acciones">
              <button type="button" class="btn btn--ghost btn--sm cart-remove" data-index="${index}"
                aria-label="Quitar ${escapeHtml(item.name)}">Quitar</button>
            </td>
          </tr>`,
      )
      .join("");

    updateTabIndicators();
  }

  productsTableBody?.addEventListener("change", (event) => {
    const input = event.target.closest(".cart-quantity");
    if (!input) return;

    const item = cartItems[Number(input.dataset.index)];
    if (!item) return;

    const quantity = Number.parseInt(input.value, 10);

    if (!Number.isFinite(quantity) || quantity < 1) {
      input.value = String(item.quantity);
      showResult(
        "warning",
        "Cantidad no válida",
        "Ingresá un número entero mayor a 0.",
      );
      return;
    }

    item.quantity = quantity;
    input.value = String(quantity);
  });

  productsTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest(".cart-remove");
    if (!button) return;

    cartItems.splice(Number(button.dataset.index), 1);
    renderCart();
  });

  // ============================================================
  // RECOLECCIÓN DE DATOS
  // ============================================================

  const textOrNull = (id) => {
    const value = $(id)?.value.trim() || "";
    return value === "" ? null : value;
  };

  const numberOrNull = (id) => {
    const raw = $(id)?.value ?? "";
    if (raw === "") {
      return null;
    }
    const parsed = Number.parseInt(raw, 10);
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
    const clientId = clientIdInput.value || null;
    const typedName = aliasName || clientSearchInput.value.trim();

    return {
      client_id: clientId,
      client_name: clientId ? null : typedName || null,
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

  const hasData = (payload) =>
    Object.values(payload.details).some(categoryHasData);

  const isDirty = () =>
    Boolean(
      selectedClient ||
      aliasName ||
      clientSearchInput.value.trim() ||
      hasData(buildJSON()),
    );

  // Un punto en la pestaña indica que esa categoría ya tiene datos.
  function updateTabIndicators() {
    const details = {
      general: buildGeneral(),
      color: buildColor(),
      treatment: buildTreatment(),
      cut: buildCut(),
    };

    tabs.forEach((tab) => {
      const filled = categoryHasData(details[tab.dataset.category] ?? {});

      tab.classList.toggle("has-data", filled);
      tab.setAttribute(
        "aria-label",
        filled ? `${tab.dataset.label} (con datos)` : tab.dataset.label,
      );
    });
  }

  panel.addEventListener("input", updateTabIndicators);
  panel.addEventListener("change", updateTabIndicators);

  // Campos numéricos con un valor que no es un entero mayor a 0.
  const invalidNumberFields = () =>
    NUMBER_FIELDS.filter((id) => {
      const raw = $(id)?.value ?? "";
      return raw !== "" && !/^[1-9]\d*$/.test(raw);
    });

  // ============================================================
  // COPIAR LA ÚLTIMA FICHA DEL CLIENTE
  // ============================================================

  const setFieldValue = (id, value) => {
    const field = $(id);
    if (!field) return;

    field.value = value === null || value === undefined ? "" : String(value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const repeatLastRecord = async () => {
    if (!selectedClient) return;

    setBusy(repeatButton, true);

    try {
      const response = await fetchClientTimeline(selectedClient.id);

      if (!response?.success || !Array.isArray(response.data)) {
        throw new ApiError(
          response?.error || "El historial llegó con un formato inesperado.",
          { kind: "invalid-response" },
        );
      }

      const last = response.data
        .filter((record) => {
          const details = record.technical_details;

          return (
            details &&
            typeof details === "object" &&
            Object.keys(DETAIL_FIELDS).some(
              (category) =>
                details[category] &&
                typeof details[category] === "object" &&
                categoryHasData(details[category]),
            )
          );
        })
        .sort((a, b) =>
          String(b.performed_at).localeCompare(String(a.performed_at)),
        )[0];

      if (!last) {
        showResult(
          "warning",
          "Sin fichas anteriores",
          "Este cliente todavía no tiene fichas para copiar.",
        );
        return;
      }

      const current = buildJSON().details;
      const hasCurrent = Object.keys(DETAIL_FIELDS).some((category) =>
        categoryHasData(current[category]),
      );

      if (hasCurrent) {
        const confirmed = await confirmAction({
          title: "Reemplazar los datos cargados",
          message:
            "Ya completaste datos de color, tratamiento o corte. Si copiás la última ficha, se van a reemplazar.",
          confirmLabel: "Reemplazar",
          danger: true,
        });

        if (!confirmed) return;
      }

      let firstFilled = null;

      Object.entries(DETAIL_FIELDS).forEach(([category, fields]) => {
        const source = last.technical_details[category] || {};

        Object.entries(fields).forEach(([key, id]) =>
          setFieldValue(id, source[key]),
        );

        if (!firstFilled && categoryHasData(source)) {
          firstFilled = category;
        }
      });

      if (firstFilled) {
        setActive(firstFilled);
      }

      const date = String(last.performed_at)
        .slice(0, 10)
        .split("-")
        .reverse()
        .join("/");

      const copied = showResult(
        "success",
        "Ficha copiada",
        `Se copiaron los datos de la ficha del ${date}. Revisalos antes de guardar.`,
      );

      const reminder = last.technical_details.general?.next_visit_notes;

      if (reminder) {
        await copied;
        showResult(
          "warning",
          "Recordatorio",
          `Para esta visita habías anotado: ${reminder}`,
        );
      }
    } catch (error) {
      logError("Error al copiar la última ficha:", error);
      showError(getErrorMessage(error, "No se pudo copiar la última ficha."));
    } finally {
      setBusy(repeatButton, false);
    }
  };

  repeatButton?.addEventListener("click", repeatLastRecord);

  // ============================================================
  // GUARDAR
  // ============================================================

  const saveRecord = async () => {
    if (isSaving) return;

    feedback.clearInvalid();

    const data = buildJSON();

    if (!data.client_id && !data.client_name) {
      feedback.invalidate(["quickEntryClientSearch"]);
      feedback.focusInvalid();
      return;
    }

    const badNumbers = invalidNumberFields();

    if (badNumbers.length > 0) {
      feedback.invalidate(badNumbers);

      const firstField = $(badNumbers[0]);
      const category = firstField?.closest(".dynamic-panel")?.dataset.category;

      if (category) setActive(category);
      firstField?.focus();
      return;
    }

    if (!hasData(data)) {
      feedback.show(
        "warning",
        "Completá al menos un dato de algún servicio antes de guardar.",
      );
      return;
    }

    if (!data.client_id && !aliasName) {
      const saveAnyway = await confirmAction({
        title: "Cliente no seleccionado",
        message:
          "No elegiste un cliente registrado para esta ficha. Si continuás, el registro va a quedar guardado sin vínculo con un cliente de la base, lo que puede dificultar encontrarlo más adelante.",
        confirmLabel: "Guardar sin cliente",
        cancelLabel: "Volver a buscar cliente",
      });

      if (!saveAnyway) {
        clientSearchInput.focus();
        return;
      }
    }

    isSaving = true;
    setBusy(btnSave, true);

    try {
      const result = await saveServiceHistory(data);

      if (!result.success) {
        throw new ApiError(result.error || "No se pudo guardar la ficha.", {
          kind: "request",
        });
      }

      showResult(
        "success",
        "Ficha guardada",
        "Ya figura en el historial del cliente.",
      );
      closeDrawer();
    } catch (error) {
      logError("Error al guardar ficha:", error);
      feedback.show(
        "error",
        getErrorMessage(
          error,
          "No se pudo guardar la ficha. Intentá de nuevo.",
        ),
      );
    } finally {
      isSaving = false;
      setBusy(btnSave, false);
    }
  };

  btnSave?.addEventListener("click", saveRecord);

  // ============================================================
  // RESETEO DE FORMULARIO
  // ============================================================

  function resetForm() {
    panel
      .querySelectorAll('input[type="text"], input[type="number"], textarea')
      .forEach((input) => {
        input.value = "";
      });

    panel.querySelectorAll("input[data-presets]").forEach((input) => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    clearClientUi();
    productAutocomplete?.reset();

    activeCategory = DEFAULT_CATEGORY;
    render();

    cartItems = [];
    renderCart();

    feedback.clearInvalid();
    updateTabIndicators();
  }
}
