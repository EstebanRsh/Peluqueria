// Listados con búsqueda y filtro en el servidor, paginados con "Cargar más".
import {
  ApiError,
  getErrorMessage,
  isAbortError,
  LIST_PAGE_SIZE,
  logError,
} from "./api.js";
import { escapeHtml } from "./dom.js";
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

// load() devuelve false si la respuesta quedó obsoleta (otro pedido la reemplazó).
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

export function moreRowHtml(colspan) {
  return `<tr><td colspan="${colspan}" class="panel-empty"><button type="button" class="btn btn--ghost btn--sm" data-action="more">Cargar más</button></td></tr>`;
}

export function renderMessageRow(body, colspan, html) {
  body.innerHTML = `<tr><td colspan="${colspan}">${html}</td></tr>`;
}

export function loadErrorHtml(error, fallback) {
  return `<div class="panel-error" role="alert">
      <div>${escapeHtml(getErrorMessage(error, fallback))}</div>
      <div class="panel-empty__action">
        <button type="button" class="btn btn--ghost btn--sm" data-action="retry">Reintentar</button>
      </div>
    </div>`;
}

const svgIcon = (paths) =>
  `<span class="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">${paths}</svg></span>`;

const ROW_ICONS = {
  profile: svgIcon(
    '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  ),
  edit: svgIcon(
    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  ),
  activate: svgIcon(
    '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  ),
  deactivate: svgIcon(
    '<circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/>',
  ),
  delete: svgIcon(
    '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
  ),
};

const CHEVRON_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="9 6 15 12 9 18"/></svg>';

// Botones Editar / Activar o Desactivar / Eliminar de una fila de la tabla.
// Con { profile: true } suma "Ver perfil", que solo se ve en la ventanita del celular.
export function rowActionsHtml(id, name, active, { profile = false } = {}) {
  const toggle = active ? "deactivate" : "activate";
  const toggleLabel = active ? "Desactivar" : "Activar";
  const safeId = escapeHtml(id);
  const safeName = escapeHtml(name);
  const button = (action, label, style) =>
    `<button type="button" class="btn ${style} btn--sm" data-action="${action}" data-id="${safeId}" title="${label}" aria-label="${label} ${safeName}">${ROW_ICONS[action]}<span class="btn__label">${label}</span></button>`;

  return `<div class="data-table__actions">
          ${profile ? button("profile", "Ver perfil", "btn--ghost btn--row-extra") : ""}
          ${button("edit", "Editar", "btn--ghost")}
          ${button(toggle, toggleLabel, "btn--ghost")}
          ${button("delete", "Eliminar", "btn--danger")}
        </div>`;
}

// Botón de cada fila que abre su ventanita en el celular (oculto en escritorio).
export function rowToggleHtml(name, id) {
  const safeName = escapeHtml(name);

  return `<button type="button" class="row-toggle" data-id="${escapeHtml(id)}" data-title="${safeName}" aria-haspopup="dialog" aria-label="Ver detalles de ${safeName}">${CHEVRON_ICON}</button>`;
}

export const isCompactView = () => matchMedia("(max-width: 768px)").matches;

// En el celular, tocar una fila abre una ventanita con sus datos y acciones.
// Los botones de la ventanita ejecutan el botón original de la fila.
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
    dialog.querySelector(".status-dialog__name").textContent =
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

    if (event.target === dialog || event.target.closest(".day-panel__close")) {
      dialog.close();
    }
  });
}

// Vuelve a pedir la lista; si falla, avisa sin dar por perdido el cambio.
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

// Ejecuta una acción de la fila (activar, desactivar, eliminar) y refresca.
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
