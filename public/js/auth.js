import { BASE_URL } from "./config.js";
import {
  ApiError,
  fetchSession,
  getErrorMessage,
  logError,
  loginUser,
  logoutUser,
  registerUser,
} from "./api.js";
import { clearInvalidOnInput, setBusy } from "./feedback.js";
import { showResult } from "./confirm.js";

async function clearBrowserStorage() {
  window.localStorage.clear();
  window.sessionStorage.clear();

  if ("caches" in window) {
    const names = await window.caches.keys();
    await Promise.all(names.map((name) => window.caches.delete(name)));
  }
}

// Pantalla de acceso. Cada resultado se informa con la pantalla completa:
// verde al entrar (queda pintada mientras carga la agenda), rojo si falla y
// ámbar si la sesión venció.
export function initAuthPage() {
  const loginSection = document.getElementById("loginSection");
  const registerSection = document.getElementById("registerSection");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  let csrfToken = null;
  let sessionReady = false;

  const setFormsEnabled = (enabled) => {
    [loginForm, registerForm].forEach((form) => {
      form?.querySelector("fieldset")?.toggleAttribute("disabled", !enabled);
    });
  };

  const redirectToApp = () => {
    window.location.replace(`${BASE_URL}/index.php`);
  };

  const switchForm = (showRegistration) => {
    if (!registerSection) return;
    loginSection.hidden = showRegistration;
    registerSection.hidden = !showRegistration;
  };

  const submitCredentials = (form, send, texts) => {
    form.noValidate = true;
    clearInvalidOnInput(form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!sessionReady) return;

      const missing = [...form.querySelectorAll("[required]")].filter(
        (input) => !input.value.trim(),
      );

      missing.forEach((input) => input.setAttribute("aria-invalid", "true"));

      if (missing.length > 0) {
        missing[0].focus();
        return;
      }

      const fields = new FormData(form);
      const button = form.querySelector('button[type="submit"]');

      setBusy(button, true);

      try {
        const data = await send({
          username: fields.get("username"),
          password: fields.get("password"),
        });

        if (data.user.role !== "owner") {
          showResult(
            "error",
            texts.failureTitle,
            "Tu cuenta no tiene permiso para acceder a la aplicación.",
          );
          return;
        }

        await showResult(
          "success",
          texts.successTitle,
          "Te estamos llevando a tu agenda…",
          { hold: true },
        );
        redirectToApp();
      } catch (error) {
        logError(texts.failureTitle, error);
        showResult(
          "error",
          texts.failureTitle,
          getErrorMessage(error, "Ocurrió un problema inesperado. Intentá de nuevo."),
        );
      } finally {
        setBusy(button, false);
      }
    });
  };

  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    const input = button.closest(".password-field").querySelector("input");

    button.addEventListener("click", () => {
      const show = input.type === "password";

      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute(
        "aria-label",
        show ? "Ocultar contraseña" : "Mostrar contraseña",
      );
      button
        .querySelectorAll("svg")
        .forEach((icon) => icon.toggleAttribute("hidden"));
    });
  });

  document
    .getElementById("showRegistration")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      switchForm(true);
    });

  document.getElementById("showLogin")?.addEventListener("click", (event) => {
    event.preventDefault();
    switchForm(false);
  });

  submitCredentials(loginForm, loginUser, {
    successTitle: "Sesión iniciada",
    failureTitle: "No se pudo iniciar sesión",
  });

  if (registerForm) {
    submitCredentials(
      registerForm,
      (credentials) => registerUser(credentials, csrfToken),
      {
        successTitle: "Cuenta creada",
        failureTitle: "No se pudo crear la cuenta",
      },
    );
  }

  if (new URLSearchParams(window.location.search).has("expired")) {
    showResult(
      "warning",
      "Tu sesión venció",
      "Volvé a iniciar sesión para seguir trabajando.",
    );
    window.history.replaceState(null, "", window.location.pathname);
  }

  fetchSession()
    .then((data) => {
      csrfToken = data.authenticated ? data.csrf_token : null;

      if (data.authenticated && data.user.role === "owner") {
        redirectToApp();
        return;
      }

      sessionReady = true;
      setFormsEnabled(true);
    })
    .catch((error) => {
      logError("Error al comprobar la sesión:", error);
      setFormsEnabled(false);
      showResult(
        "error",
        "No se pudo comprobar la sesión",
        getErrorMessage(error, "Recargá la página e intentá de nuevo."),
      );
    });
}

// Cierre de sesión: el servidor confirma que la sesión se invalidó antes de
// mostrar el verde y volver al login.
export function initLogout() {
  const button = document.getElementById("logoutButton");
  if (!button) return;

  button.addEventListener("click", async () => {
    setBusy(button, true);

    try {
      const result = await logoutUser();

      if (!result?.success) {
        throw new ApiError(result?.error || "No se pudo cerrar la sesión.", {
          kind: "request",
        });
      }

      await clearBrowserStorage();
    } catch (error) {
      logError("Error al cerrar sesión:", error);
      showResult(
        "error",
        "No se pudo cerrar la sesión",
        getErrorMessage(error, "Intentá de nuevo en unos segundos."),
      );
      setBusy(button, false);
      return;
    }

    await showResult(
      "success",
      "Sesión cerrada",
      "Cerraste sesión correctamente. ¡Hasta la próxima!",
      { hold: true },
    );
    window.location.replace(new URL("login.php", window.location.href));
  });
}
