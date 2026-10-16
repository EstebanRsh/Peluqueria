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
// Ejemplo: "Cliente nuevo" -> "cliente-nuevo"
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

export const pad = (value) => String(value).padStart(2, "0");

// Fecha de hoy como "AAAA-MM-DD" en la hora local.
export function todayIso() {
  const now = new Date();

  return [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join(
    "-",
  );
}

// "HH:MM:SS" -> "HH:MM"
export function formatTime(value) {
  return String(value ?? "").substring(0, 5);
}
