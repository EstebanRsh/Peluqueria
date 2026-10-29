// ============================================================
// FORMATO
// Formato de fechas, horas, textos y cambios de stock compartido por las vistas.
// ============================================================

import { UNIT_SHORTS } from "./constants.js";

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

export function displayStatus(appointment) {
  return appointment.display_status || appointment.status;
}

export function toMinutes(time) {
  const [hours, minutes] = String(time ?? "")
    .split(":")
    .map(Number);

  return Number.isFinite(hours) && Number.isFinite(minutes)
    ? hours * 60 + minutes
    : null;
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

// ============================================================
// CAMBIOS DE STOCK
// ============================================================

export function stockChanges(rows) {
  const amount = (value, unit) =>
    `${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 2 })} ${UNIT_SHORTS[unit] ?? unit}`;

  return rows.map((row) => ({
    name: row.name,
    from: amount(row.before, row.unit),
    to: amount(row.after, row.unit),
    up: Number(row.after) > Number(row.before),
  }));
}
