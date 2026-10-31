// ============================================================
// PÁGINA DE LOGIN
// Punto de entrada de login.php.
// ============================================================

import { initAuthPage } from "./auth.js";
import { initLegal } from "./legal.js";
import { registerServiceWorker } from "./pwa.js";

initAuthPage();
initLegal();
registerServiceWorker();
