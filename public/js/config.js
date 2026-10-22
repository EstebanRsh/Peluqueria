// ============================================================
// CONFIGURACIÓN
// URL base de la aplicación para armar los pedidos al servidor.
// ============================================================

export const BASE_URL =
  typeof window.BASE_URL !== "undefined" && window.BASE_URL
    ? window.BASE_URL
    : ".";
