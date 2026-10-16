import { BASE_URL } from "./config.js";
import {
  fetchSession,
  getErrorMessage,
  loginUser,
  logoutUser,
  registerUser,
} from "./api.js";
import { setBusy } from "./feedback.js";

async function clearBrowserStorage() {
  window.localStorage.clear();
  window.sessionStorage.clear();

  if ("caches" in window) {
    const names = await window.caches.keys();
    await Promise.all(names.map((name) => window.caches.delete(name)));
  }
}

export function initAuthPage() {
  const message = document.getElementById("authMessage");
  const loginSection = document.getElementById("loginSection");
  const registerSection = document.getElementById("registerSection");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  let csrfToken = null;
  let sessionReady = false;

  const showMessage = (text) => {
    message.textContent = text;
    message.classList.toggle("is-hidden", !text);
  };

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
    showMessage("");
  };

  const submitCredentials = (form, send, failureMessage) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!sessionReady) return;

      const fields = new FormData(form);
      const button = form.querySelector('button[type="submit"]');

      showMessage("");
      setBusy(button, true);

      try {
        const data = await send({
          username: fields.get("username"),
          password: fields.get("password"),
        });

        if (data.user.role !== "owner") {
          showMessage("Tu cuenta no tiene permiso para acceder a la aplicación.");
          return;
        }

        redirectToApp();
      } catch (error) {
        showMessage(getErrorMessage(error, failureMessage));
      } finally {
        setBusy(button, false);
      }
    });
  };

  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    const input = button.closest(".input-with-unit").querySelector("input");

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

  submitCredentials(
    loginForm,
    loginUser,
    "No se pudo iniciar sesión. Intentá de nuevo.",
  );

  if (registerForm) {
    submitCredentials(
      registerForm,
      (credentials) => registerUser(credentials, csrfToken),
      "No se pudo crear la cuenta. Intentá de nuevo.",
    );
  }

  if (new URLSearchParams(window.location.search).has("expired")) {
    showMessage("Tu sesión venció. Volvé a iniciar sesión.");
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
      setFormsEnabled(false);
      showMessage(
        getErrorMessage(
          error,
          "No se pudo comprobar la sesión. Recargá la página e intentá de nuevo.",
        ),
      );
    });
}

export function initLogout() {
  const button = document.getElementById("logoutButton");
  const message = document.getElementById("logoutMessage");
  if (!button) return;

  button.addEventListener("click", async () => {
    message.textContent = "";
    setBusy(button, true);

    try {
      await logoutUser();
      await clearBrowserStorage();
      window.location.replace(new URL("login.php", window.location.href));
    } catch (error) {
      message.textContent = getErrorMessage(
        error,
        "No se pudo cerrar la sesión. Intentá de nuevo.",
      );
      setBusy(button, false);
    }
  });
}
