// ============================================================
// LISTADOS
// Listados con búsqueda y filtro en el servidor, paginados con «Cargar más»,
// y acciones de cada fila.
// ============================================================

import {
  ApiError,
  getErrorMessage,
  isAbortError,
  LIST_PAGE_SIZE,
  logError,
} from "./api.js";
import { RECORD_STATUS } from "./constants.js";
import { setBusy, setSearching } from "./feedback.js";
import { showError, showResult } from "./confirm.js";

const SEARCH_DEBOUNCE_MS = 250;

export function debounce(callback) {
  let timer = null;

  return () => {
    clearTimeout(timer);
    timer = setTimeout(callback, SEARCH_DEBOUNCE_MS);
  };
}

export function createListLoader(fetchPage, searchInput = null) {
  const state = { items: [], total: 0, page: 1, search: "", filter: "todos" };
  let controller = null;
  let token = 0;

  async function load({ append = false } = {}) {
    controller?.abort();
    controller = new AbortController();
    const current = ++token;
    const page = append ? state.page + 1 : 1;

    if (!append) setSearching(searchInput, true);

    try {
      const response = await fetchPage({
        search: state.search.trim(),
        filter: state.filter,
        page,
        perPage: LIST_PAGE_SIZE,
        signal: controller.signal,
      });

      if (current !== token) return false;

      if (!Array.isArray(response?.data)) {
        throw new ApiError("La lista llegó con un formato inesperado.", {
          kind: "invalid-response",
        });
      }

      state.items = append ? [...state.items, ...response.data] : response.data;
      state.total = Number(response.total) || state.items.length;
      state.page = page;

      return true;
    } catch (error) {
      if (isAbortError(error) || current !== token) return false;
      throw error;
    } finally {
      if (current === token) setSearching(searchInput, false);
    }
  }

  return {
    state,
    load,
    hasMore: () => state.items.length < state.total,
    isPristine: () => state.search.trim() === "" && state.filter === "todos",
  };
}

const cloneTemplate = (id) =>
  document.getElementById(id).content.firstElementChild.cloneNode(true);

export function renderMessageRow(body, colspan, content) {
  const row = cloneTemplate("tableMessageTemplate");
  const cell = row.firstElementChild;

  cell.colSpan = colspan;
  cell.append(content);
  body.replaceChildren(row);
}

export function moreRow(colspan) {
  const row = cloneTemplate("tableMoreTemplate");

  row.firstElementChild.colSpan = colspan;

  return row;
}

export function emptyBlock(text, actionLabel = "") {
  const block = cloneTemplate("panelEmptyTemplate");
  const action = block.querySelector(".panel-empty__action");

  block.querySelector("[data-text]").textContent = text;

  if (actionLabel) {
    action.querySelector("button").textContent = actionLabel;
  } else {
    action.remove();
  }

  return block;
}

export function errorBlock(error, fallback) {
  const block = cloneTemplate("panelErrorTemplate");

  block.querySelector("[data-text]").textContent = getErrorMessage(
    error,
    fallback,
  );

  return block;
}

export function rowToggle(name, id) {
  const button = cloneTemplate("rowToggleTemplate");

  button.dataset.id = id;
  button.dataset.title = name;
  button.setAttribute("aria-label", `Ver detalles de ${name}`);

  return button;
}

export function rowActions(id, name, active, { profile = false } = {}) {
  const actions = cloneTemplate("rowActionsTemplate");
  const unused = active ? "activate" : "deactivate";

  actions.querySelector(`[data-action="${unused}"]`).remove();

  if (!profile) {
    actions.querySelector('[data-action="profile"]').remove();
  }

  actions.querySelectorAll("button").forEach((button) => {
    button.dataset.id = id;
    button.setAttribute("aria-label", `${button.title} ${name}`);
  });

  return actions;
}

export function setRecordStatus(badge, active) {
  const status = active ? RECORD_STATUS.active : RECORD_STATUS.inactive;

  badge.className = `status-badge status-badge--${status.slug}`;
  badge.textContent = status.label;
}

export function fillFields(row, values) {
  Object.entries(values).forEach(([field, value]) => {
    row.querySelector(`[data-field="${field}"]`).textContent = value;
  });
}

export const isCompactView = () => matchMedia("(max-width: 768px)").matches;

export function bindRowDialog(body, dialog, getNotes) {
  if (!body || !dialog) return;

  const data = dialog.querySelector(".row-dialog__data");
  const notes = dialog.querySelector(".row-dialog__notes");
  const actions = dialog.querySelector(".row-dialog__actions");
  let currentRow = null;

  body.addEventListener("click", (event) => {
    if (!isCompactView() || event.target.closest(".data-table__actions"))
      return;

    const row = event.target.closest("tr");
    const toggle = row?.querySelector(".row-toggle");
    if (!toggle) return;

    currentRow = row;
    dialog.querySelector(".surface__title").textContent =
      toggle.dataset.title;

    data.replaceChildren(
      ...[...row.cells]
        .slice(1)
        .filter(
          (cell) =>
            cell.dataset.label &&
            cell.dataset.label !== "Notas" &&
            !cell.querySelector(".data-table__actions"),
        )
        .map((cell) => {
          const item = document.createElement("div");
          const label = document.createElement("dt");
          const value = document.createElement("dd");

          label.textContent = cell.dataset.label;
          value.append(
            ...[...cell.childNodes].map((node) => node.cloneNode(true)),
          );
          item.append(label, value);

          return item;
        }),
    );

    actions.replaceChildren(
      ...[...row.querySelectorAll(".data-table__actions .btn")].map((button) =>
        button.cloneNode(true),
      ),
    );

    const text = getNotes?.(toggle.dataset.id)?.trim();
    notes.hidden = !text;
    notes.querySelector("p").textContent = text ?? "";

    dialog.showModal();
  });

  dialog.addEventListener("click", (event) => {
    const button = event.target.closest(".row-dialog__actions .btn");

    if (button) {
      const original = currentRow?.querySelector(
        `.data-table__actions [data-action="${button.dataset.action}"]`,
      );

      dialog.close();
      original?.click();
      return;
    }

    if (event.target === dialog || event.target.closest(".surface__close")) {
      dialog.close();
    }
  });
}

export async function refreshAfterChange(list, render) {
  try {
    if (await list.load()) render();
  } catch (error) {
    logError("Error al actualizar la lista:", error);
    showResult(
      "warning",
      "Cambio guardado",
      "No se pudo actualizar la lista. Recargá la sección.",
    );
  }
}

export async function runTableAction(button, task, messages, refresh) {
  setBusy(button, true);

  try {
    const result = await task();

    if (!result.success) {
      throw new ApiError(result.error || messages.failure, { kind: "request" });
    }

    showResult("success", messages.success);
    await refresh();
  } catch (error) {
    logError(messages.failure, error);
    showError(getErrorMessage(error, messages.failure));
  } finally {
    setBusy(button, false);
  }
}
