// ============================================================
// FUNCIONES ÚTILES Y FORMATEADORES
// ============================================================

// ============================================================
// FORMATEO DE FECHAS
// ============================================================

// Convierte una fecha en formato YYYY-MM-DD
// a un formato legible para mostrar en la interfaz.
//
// Ejemplo: "2026-09-02" -> "2 de Septiembre 2026"
export function formatDate(dateStr) {
  if (!dateStr) {
    return "";
  }

  const [y, m, d] = dateStr.split("-");

  const months = [
    "",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return `${parseInt(d, 10)} de ${months[parseInt(m, 10)]} ${y}`;
}

// ============================================================
// NORMALIZACIÓN DE TEXTOS Y BÚSQUEDA
// ============================================================

// Convierte un texto en una versión simplificada
// adecuada para utilizar como clase CSS, identificador
// o valor de comparación.
//
// Ejemplo: "En sala de espera" -> "en-sala-de-espera"
export function slugify(text) {
  if (!text) {
    return "";
  }

  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

/**
 * Quita tildes/diacríticos y convierte a minúsculas
 */
export function normalizeText(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Verifica si alguna palabra del texto empieza con cada uno de los términos ingresados
 */
export function matchesSearch(haystack, search) {
  const normalizedSearch = normalizeText(search);
  if (!normalizedSearch) return true;

  const normalizedHaystack = normalizeText(haystack);
  const searchTerms = normalizedSearch.split(/\s+/);
  const words = normalizedHaystack.split(/\s+/);

  // Cada término escrito por el usuario debe coincidir con el inicio de alguna palabra del texto
  return searchTerms.every((term) =>
    words.some((word) => word.startsWith(term)),
  );
}
