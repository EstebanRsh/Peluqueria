// Constantes compartidas: estados de turno y unidades de producto.

export const APPOINTMENT_STATUSES = [
  "Reservado",
  "Finalizado",
  "Ausente",
  "Cancelado",
];

export const DEFAULT_APPOINTMENT_STATUS = "Reservado";

// Estados que no ocupan el horario del profesional.
export const INACTIVE_STATUSES = ["Cancelado", "Ausente"];

export const STATUS_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "reservado", label: "Reservados" },
  { value: "finalizado", label: "Finalizados" },
  { value: "ausente", label: "Ausentes" },
  { value: "cancelado", label: "Cancelados" },
];

export const UNIT_NAMES = {
  ml: "Mililitros (ml)",
  g: "Gramos (g)",
  unidad: "Unidad",
};

export const UNIT_SHORTS = { ml: "ml", g: "g", unidad: "unid." };
