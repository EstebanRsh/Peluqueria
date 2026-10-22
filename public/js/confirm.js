// ============================================================
// MENSAJES Y CONFIRMACIONES
// Pantalla completa de éxito, error, advertencia, información y
// confirmación (reemplaza a window.confirm).
// ============================================================

const SUCCESS_MS = 2000;

const screen = document.getElementById("messageScreen");
const body = document.getElementById("messageBody");
const accept = document.getElementById("messageAccept");
const cancel = document.getElementById("messageCancel");

let timer = null;
let holdScreen = false;
let accepted = false;
let pending = null;

// ============================================================
// PANTALLA DE MENSAJE
// ============================================================

function settle(value = false) {
  clearTimeout(timer);

  const resolve = pending;
  pending = null;
  resolve?.(value);
}

function finishSuccess() {
  if (holdScreen) {
    settle(true);
    return;
  }

  accepted = true;
  screen.close();
}

function present(
  type,
  title,
  message,
  { hold = false, acceptLabel = "Entendido", cancelLabel = "", focusCancel = false } = {},
) {
  if (!screen) {
    return Promise.resolve(false);
  }

  if (screen.open && screen.dataset.type === "error" && type !== "error") {
    return Promise.resolve(false);
  }

  settle();

  const isSuccess = type === "success";

  holdScreen = hold;
  accepted = false;
  screen.dataset.type = type;
  screen.className = `message-screen message-screen--${type}`;
  body.setAttribute("role", isSuccess ? "status" : "alert");
  document.getElementById("messageTitle").textContent = title;
  document.getElementById("messageText").textContent = message;
  accept.textContent = acceptLabel;
  accept.hidden = isSuccess;
  cancel.textContent = cancelLabel;
  cancel.hidden = type !== "confirm";

  return new Promise((resolve) => {
    pending = resolve;

    queueMicrotask(() => {
      if (!screen.open) {
        screen.showModal();
      }

      if (isSuccess) {
        timer = setTimeout(finishSuccess, SUCCESS_MS);
      } else {
        (focusCancel ? cancel : accept).focus();
      }
    });
  });
}

screen?.addEventListener("click", (event) => {
  if (screen.dataset.type === "success") {
    finishSuccess();
    return;
  }

  const button = event.target.closest("button");

  if (button) {
    accepted = button === accept;
    screen.close();
  }
});

screen?.addEventListener("keydown", (event) => {
  event.stopPropagation();

  if (
    screen.dataset.type === "success" &&
    (event.key === "Enter" || event.key === " ")
  ) {
    event.preventDefault();
    finishSuccess();
  }
});

screen?.addEventListener("cancel", (event) => {
  event.preventDefault();

  if (screen.dataset.type === "success") {
    finishSuccess();
  } else {
    accepted = false;
    screen.close();
  }
});

screen?.addEventListener("close", () => {
  settle(accepted);
  accepted = false;
});

// ============================================================
// FUNCIONES PÚBLICAS
// ============================================================

export function showResult(type, title, message = "", { hold = false } = {}) {
  return present(type, title, message, { hold });
}

export function showError(message) {
  return showResult("error", "No se pudo completar", message);
}

export function confirmAction({
  title = "¿Querés continuar?",
  message = "",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
} = {}) {
  return present("confirm", title, message, {
    acceptLabel: confirmLabel,
    cancelLabel,
    focusCancel: danger,
  });
}
