// ============================================================
// AUTOCOMPLETADO
// Buscador accesible con resultados del servidor: teclado, resaltado, estados
// de carga, vacío y error, y cancelación de pedidos.
// ============================================================

import { isAbortError, searchClients, logError } from "./api.js";
import { setSearching } from "./feedback.js";

const ACCENT_MARKS = /[\u0300-\u036f]/g;

const LOADING_DELAY_MS = 250;
const LOADING_MESSAGE = "Buscando…";
const ERROR_MESSAGE = "No se pudo realizar la búsqueda. Intentá de nuevo.";

function fold(value) {
  return String(value).normalize("NFD").replace(ACCENT_MARKS, "").toLowerCase();
}

function highlightMatch(text, query) {
  const source = String(text ?? "");
  const needle = fold(query.trim());

  if (!needle) {
    return [source];
  }

  const chars = Array.from(source);
  const foldedChars = chars.map(fold);
  const starts = [];
  let folded = "";

  foldedChars.forEach((piece) => {
    starts.push(folded.length);
    folded += piece;
  });

  const matchStart = folded.indexOf(needle);

  if (matchStart === -1) {
    return [source];
  }

  const matchEnd = matchStart + needle.length;
  let from = starts.findIndex(
    (start, index) => start + foldedChars[index].length > matchStart,
  );
  let to = starts.findIndex((start) => start >= matchEnd);

  if (from === -1) from = 0;
  if (to === -1) to = chars.length;

  const mark = document.createElement("mark");
  mark.textContent = chars.slice(from, to).join("");

  return [chars.slice(0, from).join(""), mark, chars.slice(to).join("")];
}

let instanceCounter = 0;

export function createAutocomplete(config) {
  const {
    input,
    list,
    search,
    getTitle,
    getSubtitle = () => "",
    onSelect,
    customOption = null,
    minChars = 1,
    maxResults = 5,
    debounceMs = 200,
    emptyMessage = "No se encontraron resultados.",
  } = config;

  const uid = `ac${++instanceCounter}`;

  list.id = list.id || `${uid}-list`;
  list.setAttribute("role", "listbox");

  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", list.id);
  input.setAttribute("autocomplete", "off");

  const liveRegion = document.createElement("div");
  liveRegion.className = "sr-only";
  liveRegion.setAttribute("role", "status");
  list.insertAdjacentElement("afterend", liveRegion);

  let optionNodes = [];
  let activeIndex = -1;
  let controller = null;
  let timer = null;

  // ----------------------------------------------------------
  // RENDERIZADO
  // ----------------------------------------------------------

  function setActive(index) {
    optionNodes.forEach((node, nodeIndex) => {
      const isActive = nodeIndex === index;

      node.element.classList.toggle("is-active", isActive);
      node.element.setAttribute("aria-selected", String(isActive));
    });

    activeIndex = index;

    if (index >= 0) {
      const element = optionNodes[index].element;

      input.setAttribute("aria-activedescendant", element.id);
      element.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function addStatus(message, isError = false) {
    const row = document.createElement("li");

    row.className = `autocomplete-status${isError ? " autocomplete-status--error" : ""}`;
    row.setAttribute("role", "presentation");
    row.textContent = message;
    list.appendChild(row);
  }

  function addOption({ titleParts, subtitle, isAction = false, choose }) {
    const element = document.createElement("li");

    element.id = `${uid}-option-${optionNodes.length}`;
    element.className = `autocomplete-item${isAction ? " autocomplete-item--action" : ""}`;
    element.setAttribute("role", "option");
    element.setAttribute("aria-selected", "false");

    const title = document.createElement("span");
    title.className = "autocomplete-item__title";
    title.append(...titleParts);
    element.appendChild(title);

    if (subtitle) {
      const meta = document.createElement("span");
      meta.className = "autocomplete-item__meta";
      meta.textContent = subtitle;
      element.appendChild(meta);
    }

    list.appendChild(element);
    optionNodes.push({ element, choose });
  }

  function render(query, state, items = []) {
    list.replaceChildren();
    optionNodes = [];
    activeIndex = -1;
    input.removeAttribute("aria-activedescendant");

    if (state === "loading") {
      addStatus(LOADING_MESSAGE);
    } else if (state === "empty") {
      addStatus(emptyMessage);
    } else if (state === "error") {
      addStatus(ERROR_MESSAGE, true);
    }

    if (state === "results") {
      items.forEach((item) => {
        addOption({
          titleParts: highlightMatch(getTitle(item), query),
          subtitle: getSubtitle(item),
          choose: () => select(item),
        });
      });
    }

    if (customOption && state !== "loading") {
      addOption({
        titleParts: [customOption.label(query)],
        subtitle: "",
        isAction: true,
        choose: () => selectCustom(query),
      });
    }

    input.setAttribute("aria-expanded", String(list.children.length > 0));

    if (state === "results" && optionNodes.length > 0) {
      setActive(0);
      liveRegion.textContent = `${items.length} ${items.length === 1 ? "resultado" : "resultados"}.`;
    } else if (state === "empty") {
      liveRegion.textContent = emptyMessage;
      if (optionNodes.length > 0) setActive(0);
    } else if (state === "error") {
      liveRegion.textContent = ERROR_MESSAGE;
    }
  }

  function close() {
    list.replaceChildren();
    optionNodes = [];
    activeIndex = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function select(item) {
    close();
    onSelect(item);
  }

  function selectCustom(query) {
    close();
    customOption.onSelect(query);
  }

  // ----------------------------------------------------------
  // BÚSQUEDA
  // ----------------------------------------------------------

  async function runSearch(query) {
    controller?.abort();

    const current = new AbortController();
    controller = current;

    const loadingTimer = setTimeout(() => {
      if (list.children.length === 0 && !current.signal.aborted) {
        render(query, "loading");
      }
    }, LOADING_DELAY_MS);

    list.setAttribute("aria-busy", "true");
    setSearching(input, true);

    try {
      const results = await search(query, current.signal);

      if (current.signal.aborted) {
        return;
      }

      const items = Array.isArray(results) ? results.slice(0, maxResults) : [];
      render(query, items.length > 0 ? "results" : "empty", items);
    } catch (error) {
      if (isAbortError(error) || current.signal.aborted) {
        return;
      }

      logError("Error en la búsqueda:", error);
      render(query, "error");
    } finally {
      clearTimeout(loadingTimer);

      if (controller === current) {
        list.removeAttribute("aria-busy");
        setSearching(input, false);
      }
    }
  }

  function handleInput() {
    const query = input.value.trim();

    clearTimeout(timer);
    controller?.abort();

    if (query.length < minChars) {
      setSearching(input, false);
      close();
      liveRegion.textContent = "";
      return;
    }

    timer = setTimeout(() => runSearch(query), debounceMs);
  }

  // ----------------------------------------------------------
  // EVENTOS
  // ----------------------------------------------------------

  function move(step) {
    if (optionNodes.length === 0) {
      return;
    }

    const next =
      activeIndex === -1
        ? step > 0
          ? 0
          : optionNodes.length - 1
        : (activeIndex + step + optionNodes.length) % optionNodes.length;

    setActive(next);
  }

  input.addEventListener("input", handleInput);

  input.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();

        if (optionNodes.length === 0) {
          const query = input.value.trim();

          if (query.length >= minChars) {
            clearTimeout(timer);
            runSearch(query);
          }
        } else {
          move(1);
        }
        break;

      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;

      case "Enter":
        if (optionNodes.length > 0 && activeIndex >= 0) {
          event.preventDefault();
          optionNodes[activeIndex].choose();
        }
        break;

      case "Escape":
        if (list.children.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        break;

      case "Tab":
        close();
        break;

      default:
        break;
    }
  });

  list.addEventListener("mousedown", (event) => {
    const element = event.target.closest("[role='option']");

    if (!element) {
      return;
    }

    event.preventDefault();

    const index = optionNodes.findIndex((node) => node.element === element);

    if (index >= 0) {
      optionNodes[index].choose();
    }
  });

  list.addEventListener("mousemove", (event) => {
    const element = event.target.closest("[role='option']");
    const index = optionNodes.findIndex((node) => node.element === element);

    if (index >= 0 && index !== activeIndex) {
      setActive(index);
    }
  });

  const handleOutsidePointer = (event) => {
    if (!input.contains(event.target) && !list.contains(event.target)) {
      close();
    }
  };

  document.addEventListener("pointerdown", handleOutsidePointer);

  return {
    close,

    reset() {
      clearTimeout(timer);
      controller?.abort();
      setSearching(input, false);
      close();
      liveRegion.textContent = "";
    },

    destroy() {
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("pointerdown", handleOutsidePointer);
      setSearching(input, false);
      close();
      liveRegion.remove();
    },
  };
}

export function createClientAutocomplete({ input, list, onSelect, onAlias }) {
  return createAutocomplete({
    input,
    list,
    emptyMessage: "No hay clientes registrados con ese nombre.",
    search: (query, signal) => searchClients(query, signal),
    getTitle: (client) => client.alias ?? client.name ?? "",
    getSubtitle: (client) =>
      client.internal_code ? `Código ${client.internal_code}` : "",
    onSelect,
    customOption: {
      label: (query) => `Usar «${query}» como alias`,
      onSelect: onAlias,
    },
  });
}
