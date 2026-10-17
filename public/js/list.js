// Listados con búsqueda y filtro en el servidor, paginados con "Cargar más".
import {
  ApiError,
  getErrorMessage,
  isAbortError,
  LIST_PAGE_SIZE,
} from "./api.js";
import { escapeHtml } from "./dom.js";
import { setBusy, setSearching } from "./feedback.js";
import { notify } from "./toast.js";

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

// Botones Editar / Activar o Desactivar / Eliminar de una fila de la tabla.
export function rowActionsHtml(id, name, active) {
  const toggle = active ? "deactivate" : "activate";
  const label = active ? "Desactivar" : "Activar";
  const safeId = escapeHtml(id);
  const safeName = escapeHtml(name);

  return `<div class="data-table__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-id="${safeId}" aria-label="Editar ${safeName}">Editar</button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="${toggle}" data-id="${safeId}" aria-label="${label} ${safeName}">${label}</button>
          <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${safeId}" aria-label="Eliminar ${safeName}">Eliminar</button>
        </div>`;
}

// Vuelve a pedir la lista; si falla, avisa sin dar por perdido el cambio.
export async function refreshAfterChange(list, render) {
  try {
    if (await list.load()) render();
  } catch (error) {
    console.error("Error al actualizar la lista:", error);
    notify.warning(
      "El cambio se guardó, pero no se pudo actualizar la lista. Recargá la sección.",
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

    notify.success(messages.success);
    await refresh();
  } catch (error) {
    console.error(messages.failure, error);
    notify.error(getErrorMessage(error, messages.failure));
  } finally {
    setBusy(button, false);
  }
}
