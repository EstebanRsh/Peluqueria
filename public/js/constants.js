// ============================================================
// CONSTANTES
// Estados de turno, estados de registros y unidades de producto, definidos una sola vez.
// ============================================================

export const DEFAULT_APPOINTMENT_STATUS = "Reservado";

export const FINISHED_STATUS = "Finalizado";

export const RECORD_STATUS = {
  active: { slug: "activo", label: "Activo" },
  inactive: { slug: "inactivo", label: "Inactivo" },
};

export const INACTIVE_STATUSES = ["Cancelado", "Ausente"];

export const STATUS_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "reservado", label: "Reservados" },
  { value: "pendiente-de-cierre", label: "Pendientes de cierre" },
  { value: "finalizado", label: "Finalizados" },
  { value: "ausente", label: "Ausentes" },
  { value: "cancelado", label: "Cancelados" },
];

export const UNIT_NAMES = {
  ml: "Mililitros (ml)",
  g: "Gramos (g)",
  unidad: "Unidad",
};

export const UNIT_SHORTS = { ml: "ml", g: "g", unidad: "unidad" };
