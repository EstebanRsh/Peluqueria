// ============================================================
// FICHA DE SERVICIO
// Ficha técnica de un turno o suelta: color, tratamiento, corte y productos usados.
// ============================================================

import {
  ApiError,
  getErrorMessage,
  previewHistoryStock,
  saveServiceHistory,
  searchProducts,
  logError,
  updateAppointment,
  updateServiceHistory,
} from "./api.js";
import { createAutocomplete, createClientAutocomplete } from "./autocomplete.js";
import { UNIT_SHORTS } from "./constants.js";
import { $, setActiveFilter } from "./dom.js";
import { clearInvalidOnInput, createFeedback, setBusy } from "./feedback.js";
import { confirmAction, confirmChoice, showResult } from "./confirm.js";
import { appState } from "./state.js";
import { fillFields } from "./list.js";
import { loadAppointments, syncCalendarDay } from "./ui.js";
import { missingAppointmentNotice, stockChanges } from "./utils.js";

const NUMBER_FIELDS = [
  "colorQuantityValue",
  "colorOxidantValue",
  "colorTimeValue",
  "treatmentMlValue",
  "treatmentTempValue",
  "treatmentPassesValue",
];

const RECORD_FIELDS = {
  general: {
    session_notes: "sessionNotes",
    next_visit_notes: "nextVisitNotes",
  },
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
  let linkedAppointment = null;
  let pendingFinish = null;
  let editingRecord = null;

  // ============================================================
  // APERTURA Y CIERRE
  // ============================================================

  const openDrawer = (appointment = null, finishing = null) => {
    opener = document.activeElement;

    feedback.clearInvalid();

    if (appointment) {
      linkAppointment(appointment, finishing);
    }

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
    panel.classList.remove("is-open", "is-parked");
    overlay.classList.remove("is-open");
    resetForm();

    const target = isFocusable(opener) ? opener : $("fabToggle");
    target?.focus({ preventScroll: true });
    opener = null;
  };

  const requestClose = () => {
    if (isDirty()) {
      feedback.show(
        "warning",
        "Hay datos sin guardar. Usá Cancelar o el botón de cerrar para descartarlos.",
      );
      return;
    }

    if (!linkedAppointment) {
      closeDrawer();
    }
  };

  const cancelDrawer = async () => {
    const options = pendingFinish
      ? {
          title: "Cancelar la finalización",
          message:
            "El turno no se finaliza y se descartan los cambios que hiciste.",
          confirmLabel: "Descartar",
          cancelLabel: "Seguir",
        }
      : {
          title: "Descartar la ficha",
          message: "Hay datos sin guardar. Si salís ahora, se pierden.",
          confirmLabel: "Descartar",
          cancelLabel: "Seguir editando",
        };

    if ((pendingFinish || isDirty()) && !(await confirmAction({ ...options, danger: true }))) {
      return;
    }

    closeDrawer();
  };

  document.addEventListener("quickentry:open", (event) => {
    const appointment = event.detail?.appointment ?? null;
    const finishing = event.detail?.finishing ?? null;

    if (finishing && panel.classList.contains("is-open")) {
      linkAppointment(appointment, finishing);
      panel.classList.remove("is-parked");
      requestAnimationFrame(() => panel.focus({ preventScroll: true }));
      return;
    }

    openDrawer(appointment, finishing);
  });

  document.addEventListener("quickentry:edit", (event) => {
    const { record, client } = event.detail;
    const details = record.technical_details ?? {};
    const brands = new Map(
      (details.general?.cart_items ?? []).map((item) => [
        Number(item.product_id),
        item.brand ?? null,
      ]),
    );

    openDrawer();
    selectClient(client);
    $("quickClientChange").hidden = true;
    $("quickEntryTitle").textContent = record.service_name_snapshot
      ? `Editar ficha · ${record.service_name_snapshot}`
      : "Editar ficha";
    btnSave.textContent = "Guardar cambios";

    Object.entries(RECORD_FIELDS).forEach(([category, fields]) => {
      const values = Array.isArray(details[category])
        ? {}
        : (details[category] ?? {});

      Object.entries(fields).forEach(([key, id]) => {
        $(id).value = values[key] ?? "";
      });
    });

    panel.querySelectorAll("input[data-presets]").forEach((input) => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    cartItems = (record.consumptions ?? []).map((item) => ({
      product_id: Number(item.product_id),
      name: item.name,
      brand: brands.get(Number(item.product_id)) ?? null,
      unit: item.measurement_unit,
      quantity: Number(item.quantity_used),
    }));
    renderCart();

    editingRecord = { id: record.id, snapshot: JSON.stringify(buildJSON()) };
  });
  btnClose?.addEventListener("click", cancelDrawer);
  btnCancel?.addEventListener("click", cancelDrawer);
  overlay.addEventListener("click", requestClose);

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      panel.classList.contains("is-open") &&
      !$("appointmentFormPanel")?.classList.contains("is-open")
    ) {
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

  const showClientChip = (title, meta) => {
    $("quickClientChipTitle").textContent = title;
    $("quickClientChipMeta").textContent = meta;
    clientChip.hidden = false;
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
    );
  };

  const useAlias = (text) => {
    selectedClient = null;
    aliasName = text;
    clientIdInput.value = "";

    showClientChip(text, "Alias de referencia · sin cliente registrado");
  };

  const linkAppointment = (appointment, finishing) => {
    linkedAppointment = appointment;
    pendingFinish = finishing;
    $("quickEntryBack").hidden = !finishing;
    btnCancel.hidden = Boolean(finishing);
    $("quickEntryFinishOnly").hidden = !finishing;

    if (appointment.client_id) {
      selectClient({
        id: appointment.client_id,
        alias: appointment.client_name,
        internal_code: appointment.client_internal_code,
      });
    } else {
      useAlias(appointment.client_name || "");
    }

    $("quickClientChange").hidden = true;
    $("quickEntryTitle").textContent =
      `Ficha de servicio · ${appointment.service_name}`;
  };

  const clearClientUi = () => {
    selectedClient = null;
    aliasName = "";
    clientIdInput.value = "";
    clientChip.hidden = true;
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
      const chips = [...group.querySelectorAll(".preset-chip")];

      setActiveFilter(
        chips,
        chips.find((chip) => chip.dataset.value === input.value) ?? null,
      );
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

    productsTableBody.replaceChildren(
      ...(cartItems.length === 0
        ? [$("cartEmptyTemplate").content.firstElementChild.cloneNode(true)]
        : cartItems.map((item, index) => {
            const row = $("cartRowTemplate").content.firstElementChild.cloneNode(true);
            const quantity = row.querySelector(".cart-quantity");
            const remove = row.querySelector(".cart-remove");

            quantity.value = item.quantity;
            quantity.dataset.index = index;
            quantity.setAttribute("aria-label", `Cantidad de ${item.name}`);
            fillFields(row, {
              unit: UNIT_SHORTS[item.unit] || item.unit || "—",
              name: item.name,
              brand: item.brand || "—",
            });
            remove.dataset.index = index;
            remove.setAttribute("aria-label", `Quitar ${item.name}`);

            return row;
          })),
    );

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

  const buildCategory = (category) =>
    Object.fromEntries(
      Object.entries(RECORD_FIELDS[category]).map(([key, id]) => [
        key,
        NUMBER_FIELDS.includes(id) ? numberOrNull(id) : textOrNull(id),
      ]),
    );

  const buildDetails = () => ({
    general: { cart_items: cartItems, ...buildCategory("general") },
    color: buildCategory("color"),
    treatment: buildCategory("treatment"),
    cut: buildCategory("cut"),
  });

  const buildJSON = () => {
    const clientId = clientIdInput.value || null;
    const typedName = aliasName || clientSearchInput.value.trim();

    return {
      appointment_id: linkedAppointment?.id ?? null,
      client_id: clientId,
      client_name: clientId ? null : typedName || null,
      consumptions: cartItems.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      })),
      details: buildDetails(),
    };
  };

  const hasData = (payload) =>
    Object.values(payload.details).some(categoryHasData);

  const isDirty = () =>
    editingRecord
      ? JSON.stringify(buildJSON()) !== editingRecord.snapshot
      : Boolean(
          (!linkedAppointment &&
            (selectedClient || aliasName || clientSearchInput.value.trim())) ||
          cartItems.length > 0 ||
          hasData(buildJSON()),
        );

  function updateTabIndicators() {
    const details = buildDetails();

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

  const invalidNumberFields = () =>
    NUMBER_FIELDS.filter((id) => {
      const raw = $(id)?.value ?? "";
      return raw !== "" && !/^[1-9]\d*$/.test(raw);
    });

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
        pendingFinish
          ? "Completá al menos un dato de la ficha o usá «Finalizar sin ficha»."
          : "Completá al menos un dato de algún servicio antes de guardar.",
      );
      return;
    }

    if (editingRecord) {
      await saveEdit(data);
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

    const finishing = pendingFinish;
    let turnSaved = false;

    try {
      if (finishing) {
        await commitFinish(finishing);
        pendingFinish = null;
        turnSaved = true;
        $("quickEntryBack").hidden = true;
        btnCancel.hidden = false;
        $("quickEntryFinishOnly").hidden = true;
      }

      const result = await saveServiceHistory(data);

      if (!result.success) {
        throw new ApiError(result.error || "No se pudo guardar la ficha.", {
          kind: "request",
        });
      }

      const savedForAppointment = linkedAppointment !== null;

      showResult(
        "success",
        finishing ? "Turno finalizado" : "Ficha guardada",
        finishing
          ? `Se guardaron el turno y la ficha. ${recordSummary(data)}${missingAppointmentNotice(finishing.data)}`
          : `Ya figura en el historial del cliente. ${recordSummary(data)}`,
      );
      closeDrawer();

      if (finishing) {
        refreshAgenda(finishing);
      } else if (savedForAppointment && appState.activeDay) {
        loadAppointments(appState.activeDay, { showLoading: false });
      }
    } catch (error) {
      logError("Error al guardar ficha:", error);

      const reason = getErrorMessage(
        error,
        "No se pudo guardar la ficha. Intentá de nuevo.",
      );

      feedback.show(
        "error",
        turnSaved
          ? `El turno ya quedó finalizado, pero la ficha no se guardó: ${reason} Podés reintentar o cargarla después con «Cargar ficha» desde el detalle.`
          : reason,
      );

      if (turnSaved) {
        refreshAgenda(finishing);
      }
    } finally {
      isSaving = false;
      setBusy(btnSave, false);
    }
  };

  const saveEdit = async (data) => {
    isSaving = true;
    setBusy(btnSave, true);

    try {
      const preview = await previewHistoryStock(
        editingRecord.id,
        data.consumptions,
      );

      if (!preview?.success || !Array.isArray(preview.data)) {
        throw new ApiError(
          preview?.error || "No se pudo calcular el stock de los productos.",
          { kind: "request" },
        );
      }

      let adjustStock = false;

      if (preview.data.length > 0) {
        const choice = await confirmChoice({
          title: "Cambios en el stock",
          message:
            "Cambiaste los productos de la ficha. Elegí si el stock se ajusta.",
          confirmLabel: "Guardar y ajustar stock",
          extraLabel: "Guardar sin tocar el stock",
          cancelLabel: "Volver a la ficha",
          changes: stockChanges(preview.data),
        });

        if (choice !== "confirm" && choice !== "extra") {
          return;
        }

        adjustStock = choice === "confirm";
      }

      const result = await updateServiceHistory({
        id: editingRecord.id,
        adjust_stock: adjustStock,
        consumptions: data.consumptions,
        details: data.details,
      });

      if (!result.success) {
        throw new ApiError(result.error || "No se pudo guardar la ficha.", {
          kind: "request",
        });
      }

      showResult(
        "success",
        "Ficha actualizada",
        adjustStock
          ? "Los cambios ya están guardados y el stock se ajustó."
          : "Los cambios ya están guardados.",
      );
      closeDrawer();
      document.dispatchEvent(new CustomEvent("servicehistory:changed"));
    } catch (error) {
      logError("Error al actualizar la ficha:", error);
      feedback.show(
        "error",
        getErrorMessage(error, "No se pudo guardar la ficha. Intentá de nuevo."),
      );
    } finally {
      isSaving = false;
      setBusy(btnSave, false);
    }
  };

  const commitFinish = async (finishing) => {
    const result = await updateAppointment(finishing.data);

    if (!result.success) {
      throw new ApiError(result.error || "No se pudo finalizar el turno.", {
        kind: "request",
      });
    }
  };

  const refreshAgenda = (finishing) => {
    syncCalendarDay(finishing.data.date);

    if (finishing.previousDate !== finishing.data.date) {
      syncCalendarDay(finishing.previousDate);
    }

    if (appState.activeDay) {
      loadAppointments(appState.activeDay, { showLoading: false });
    }
  };

  const finishWithoutRecord = async () => {
    const finishing = pendingFinish;
    const button = $("quickEntryFinishOnly");

    if (isSaving || !finishing) return;

    if (
      (cartItems.length > 0 || hasData(buildJSON())) &&
      !(await confirmAction({
        title: "Finalizar sin ficha",
        message: "Los datos que cargaste en la ficha no se van a guardar.",
        confirmLabel: "Finalizar igual",
        cancelLabel: "Volver a la ficha",
        danger: true,
      }))
    ) {
      return;
    }

    isSaving = true;
    setBusy(button, true);

    try {
      await commitFinish(finishing);

      showResult(
        "success",
        "Turno finalizado",
        `Se guardaron los datos del turno. La ficha quedó sin cargar: la cargás con «Cargar ficha» desde el detalle del turno.${missingAppointmentNotice(finishing.data)}`,
      );
      closeDrawer();
      refreshAgenda(finishing);
    } catch (error) {
      logError("Error al finalizar el turno:", error);
      feedback.show(
        "error",
        getErrorMessage(error, "No se pudo finalizar el turno."),
      );
    } finally {
      isSaving = false;
      setBusy(button, false);
    }
  };

  $("quickEntryFinishOnly")?.addEventListener("click", finishWithoutRecord);

  document.addEventListener("quickentry:abort", closeDrawer);

  document.addEventListener("appointment:closed", () => {
    panel.classList.remove("is-parked");
  });

  $("quickEntryBack")?.addEventListener("click", () => {
    if (!pendingFinish) return;

    panel.classList.add("is-parked");

    document.dispatchEvent(
      new CustomEvent("appointment:edit", {
        detail: {
          appointment: { ...pendingFinish.data, ...linkedAppointment },
          finish: true,
          previousDate: pendingFinish.previousDate,
          returning: true,
        },
      }),
    );
  });

  const recordSummary = (data) => {
    const saved = [];
    const empty = [];

    tabs.forEach((tab) => {
      const category = data.details[tab.dataset.category] ?? {};

      (categoryHasData(category) ? saved : empty).push(tab.dataset.label);
    });

    (data.consumptions.length > 0 ? saved : empty).push("productos usados");

    return (
      `Se guardó: ${saved.join(", ")}.` +
      (empty.length > 0 ? ` Sin cargar: ${empty.join(", ")}.` : "")
    );
  };

  $("quickEntryForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveRecord();
  });

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
    linkedAppointment = null;
    pendingFinish = null;
    editingRecord = null;
    btnSave.textContent = "Guardar ficha";
    $("quickEntryBack").hidden = true;
    btnCancel.hidden = false;
    $("quickEntryFinishOnly").hidden = true;
    $("quickClientChange").hidden = false;
    $("quickEntryTitle").textContent = "Ficha de servicio";
    productAutocomplete?.reset();

    activeCategory = DEFAULT_CATEGORY;
    render();

    cartItems = [];
    renderCart();

    feedback.clearInvalid();
    updateTabIndicators();
  }
}
