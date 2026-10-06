const apiUrl = (action) => {
  const url = new URL(`${window.BASE_URL}/index.php`, window.location.origin);
  url.searchParams.set("action", action);
  return url;
};

async function readResponse(response) {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || `Error HTTP ${response.status}`);
  }
  return body;
}

async function clearBrowserStorage() {
  window.localStorage.clear();
  window.sessionStorage.clear();

  if ("caches" in window) {
    const names = await window.caches.keys();
    await Promise.all(
      names.map((name) => window.caches.delete(name)),
    );
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
  };

  const setFormsEnabled = (enabled) => {
    [loginForm, registerForm].forEach((form) => {
      form?.querySelector("fieldset")?.toggleAttribute("disabled", !enabled);
    });
  };

  const redirectToApp = () => {
    window.location.replace(apiUrl(""));
  };

  const switchForm = (showRegistration) => {
    if (!registerSection) return;
    loginSection.hidden = showRegistration;
    registerSection.hidden = !showRegistration;
    showMessage("");
  };

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

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!sessionReady) return;

    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      const data = await readResponse(
        await fetch(apiUrl("login"), {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.get("username"),
            password: form.get("password"),
          }),
          cache: "no-store",
        }),
      );

      if (data.user.role !== "owner") {
        showMessage("Tu cuenta no tiene permiso para acceder a la aplicación.");
        return;
      }

      redirectToApp();
    } catch (error) {
      showMessage(error.message);
    } finally {
      button.disabled = false;
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!sessionReady) return;

    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      const data = await readResponse(
        await fetch(apiUrl("register"), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
          },
          body: JSON.stringify({
            username: form.get("username"),
            password: form.get("password"),
          }),
          cache: "no-store",
        }),
      );

      if (data.user.role !== "owner") {
        showMessage("La cuenta se creó, pero no tiene permiso para acceder a la aplicación.");
        return;
      }

      redirectToApp();
    } catch (error) {
      showMessage(error.message);
    } finally {
      button.disabled = false;
    }
  });

  fetch(apiUrl("session"), {
    credentials: "same-origin",
    cache: "no-store",
  })
    .then(readResponse)
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
      showMessage(`No se pudo comprobar la sesión. Recargá la página para volver a intentar. ${error.message}`);
    });
}

export function initLogout() {
  const button = document.getElementById("logoutButton");
  const message = document.getElementById("logoutMessage");
  if (!button) return;

  button.addEventListener("click", async () => {
    button.disabled = true;
    message.textContent = "";

    try {
      const session = await readResponse(
        await fetch(apiUrl("session"), {
          credentials: "same-origin",
          cache: "no-store",
        }),
      );

      if (!session.authenticated || !session.csrf_token) {
        await clearBrowserStorage();
        window.location.replace(new URL("login.php", window.location.href));
        return;
      }

      await readResponse(
        await fetch(apiUrl("logout"), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrf_token,
          },
          body: "{}",
          cache: "no-store",
        }),
      );

      await clearBrowserStorage();
      window.location.replace(new URL("login.php", window.location.href));
    } catch (error) {
      message.textContent = `No se pudo cerrar la sesión: ${error.message}`;
      button.disabled = false;
    }
  });
}
