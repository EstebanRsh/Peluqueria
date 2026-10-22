// ============================================================
// FORMATO
// Formato de fechas, horas y textos compartido por las vistas.
// ============================================================

// ============================================================
// FORMATEO DE FECHAS
// ============================================================

export function formatDate(dateStr) {
  if (!dateStr) {
    return "";
  }

  const [y, m, d] = dateStr.split("-");

  const months = [
    "",
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  return `${parseInt(d, 10)} de ${months[parseInt(m, 10)]} ${y}`;
}

// ============================================================
// NORMALIZACIÓN DE TEXTOS Y BÚSQUEDA
// ============================================================

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

export function todayIso() {
  const now = new Date();

  return [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join(
    "-",
  );
}

export function formatTime(value) {
  return String(value ?? "").substring(0, 5);
}

export function missingAppointmentNotice(data) {
  const missing = [];

  if (!(data.price > 0)) {
    missing.push("el precio");
  }

  if (!data.stylist) {
    missing.push("el profesional");
  }

  return missing.length === 0
    ? ""
    : ` Quedó sin cargar ${missing.join(" y ")}: lo completás con «Editar turno» desde el detalle.`;
}
