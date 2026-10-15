// Listados con búsqueda y filtro en el servidor, paginados con "Cargar más".
import { ApiError, isAbortError, LIST_PAGE_SIZE } from "./api.js";

const SEARCH_DEBOUNCE_MS = 250;

export function debounce(callback) {
  let timer = null;

  return () => {
    clearTimeout(timer);
    timer = setTimeout(callback, SEARCH_DEBOUNCE_MS);
  };
}

// load() devuelve false si la respuesta quedó obsoleta (otro pedido la reemplazó).
export function createListLoader(fetchPage) {
  const state = { items: [], total: 0, page: 1, search: "", filter: "todos" };
  let controller = null;
  let token = 0;

  async function load({ append = false } = {}) {
    controller?.abort();
    controller = new AbortController();
    const current = ++token;
    const page = append ? state.page + 1 : 1;

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
