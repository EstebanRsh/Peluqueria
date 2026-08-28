// js/config.js

// Si se definió una URL global en el HTML se usa esa, de lo contrario
// usamos un punto "." para que sea una ruta relativa a la ubicación actual.
export const BASE_URL =
  typeof window.BASE_URL !== "undefined" ? window.BASE_URL : ".";
