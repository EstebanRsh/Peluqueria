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
const extra = document.getElementById("messageExtra");

let timer = null;
let holdScreen = false;
let returnChoice = false;
let choice = "cancel";
let pending = null;

// ============================================================
// PANTALLA DE MENSAJE
// ============================================================

function settle(value = "cancel") {
  clearTimeout(timer);

  const resolve = pending;
  pending = null;
  resolve?.(returnChoice ? value : value === "confirm");
}

function finishSuccess() {
  if (holdScreen) {
    settle();
    return;
  }

  choice = "cancel";
  screen.close();
}

function present(
  type,
  title,
  message,
  {
    hold = false,
    acceptLabel = "Entendido",
    cancelLabel = "",
    extraLabel = "",
    focusCancel = false,
    action = false,
    duration = SUCCESS_MS,
    choices = false,
  } = {},
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
  returnChoice = choices;
  choice = "cancel";
  screen.dataset.type = type;
  screen.className = `message-screen message-screen--${type}`;
  body.setAttribute("role", isSuccess ? "status" : "alert");
  document.getElementById("messageTitle").textContent = title;
  document.getElementById("messageText").textContent = message;
  accept.textContent = acceptLabel;
  accept.hidden = isSuccess && !action;
  cancel.textContent = cancelLabel;
  cancel.hidden = type !== "confirm";
  extra.textContent = extraLabel;
  extra.hidden = !extraLabel;

  return new Promise((resolve) => {
    pending = resolve;

    queueMicrotask(() => {
      if (!screen.open) {
        screen.showModal();
      }

      if (isSuccess) {
        timer = setTimeout(finishSuccess, duration);
      }

      if (!isSuccess || action) {
        (focusCancel ? cancel : accept).focus();
      }
    });
  });
}

screen?.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (screen.dataset.type === "success" && button !== accept) {
    finishSuccess();
    return;
  }

  if (button) {
    choice =
      button === accept ? "confirm" : button === extra ? "extra" : "cancel";
    screen.close();
  }
});

screen?.addEventListener("keydown", (event) => {
  event.stopPropagation();

  if (
    screen.dataset.type === "success" &&
    event.target !== accept &&
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
    choice = "cancel";
    screen.close();
  }
});

screen?.addEventListener("close", () => {
  settle(choice);
  choice = "cancel";
});

// ============================================================
// FUNCIONES PÚBLICAS
// ============================================================

export function showResult(
  type,
  title,
  message = "",
  { hold = false, actionLabel = "", duration = SUCCESS_MS } = {},
) {
  return present(type, title, message, {
    hold,
    duration,
    ...(actionLabel ? { acceptLabel: actionLabel, action: true } : {}),
  });
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

export function confirmChoice({
  title,
  message = "",
  confirmLabel,
  cancelLabel,
  extraLabel,
}) {
  return present("confirm", title, message, {
    acceptLabel: confirmLabel,
    cancelLabel,
    extraLabel,
    focusCancel: true,
    choices: true,
  });
}
