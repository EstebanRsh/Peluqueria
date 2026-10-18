// ============================================================
// DIÁLOGO DE CONFIRMACIÓN (REEMPLAZA A window.confirm)
//
// Uso:
//   if (await confirmAction({ title: "Eliminar cliente", message: "…",
//                             confirmLabel: "Eliminar", danger: true })) { … }
//
// Devuelve true si el usuario confirma y false si cancela, cierra con
// Escape o hace clic fuera. Mantiene el foco dentro del diálogo.
// Con cancelLabel: null muestra solo el botón de confirmar (avisos).
// ============================================================

const WARNING_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">' +
  '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
  '<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

let counter = 0;

// ============================================================
// PANTALLA DE RESULTADO (ÉXITO, ERROR, ADVERTENCIA)
//
// Esqueleto #resultScreen en layout.php y login.php.
//   showResult(type, title, message, { hold })
//   type: "success" | "error" | "warning"
//
// El éxito se cierra solo a los 2 s, o al tocarlo o pulsar Enter, Espacio o
// Escape. El error y la advertencia quedan hasta cerrarse con el botón o con
// Escape. Un error abierto no lo pisa otro tipo de aviso. Con hold, el éxito
// termina igual pero la pantalla queda pintada mientras la página navega
// (login y cierre de sesión). Devuelve una promesa que se resuelve al terminar.
// ============================================================

const RESULT_MS = 2000;
let resultTimer = null;
let resultHold = false;
let settleResult = null;

const resultScreen = document.getElementById("resultScreen");
const resultClose = document.getElementById("resultClose");

function settle() {
  clearTimeout(resultTimer);
  settleResult?.();
  settleResult = null;
}

function finishSuccess() {
  if (resultHold) {
    settle();
    return;
  }

  resultScreen.close();
}

export function showResult(type, title, message = "", { hold = false } = {}) {
  if (!resultScreen) {
    return Promise.resolve();
  }

  if (
    resultScreen.open &&
    resultScreen.dataset.type === "error" &&
    type !== "error"
  ) {
    return Promise.resolve();
  }

  settle();

  const isSuccess = type === "success";

  resultHold = hold;
  resultScreen.dataset.type = type;
  resultScreen.className = `result-screen result-screen--${type}`;
  document
    .getElementById("resultBody")
    .setAttribute("role", isSuccess ? "status" : "alert");
  document.getElementById("resultTitle").textContent = title;
  document.getElementById("resultMessage").textContent = message;
  resultClose.hidden = isSuccess;

  // Se abre después del microtask de restoreFocus para que, al cerrarse,
  // el foco vuelva al elemento correcto.
  return new Promise((resolve) => {
    settleResult = resolve;

    queueMicrotask(() => {
      if (!resultScreen.open) {
        resultScreen.showModal();
      }

      if (isSuccess) {
        resultTimer = setTimeout(finishSuccess, RESULT_MS);
      } else {
        resultClose.focus();
      }
    });
  });
}

export function showError(message) {
  return showResult("error", "No se pudo completar", message);
}

resultScreen?.addEventListener("click", (event) => {
  if (resultScreen.dataset.type === "success") {
    finishSuccess();
  } else if (event.target.closest("#resultClose")) {
    resultScreen.close();
  }
});

resultScreen?.addEventListener("keydown", (event) => {
  event.stopPropagation();

  if (
    resultScreen.dataset.type === "success" &&
    (event.key === "Enter" || event.key === " ")
  ) {
    event.preventDefault();
    finishSuccess();
  }
});

resultScreen?.addEventListener("cancel", (event) => {
  event.preventDefault();

  if (resultScreen.dataset.type === "success") {
    finishSuccess();
  } else {
    resultScreen.close();
  }
});

resultScreen?.addEventListener("close", settle);

// ============================================================
// CONFIRMACIONES
// ============================================================

export function confirmAction({
  title = "¿Querés continuar?",
  message = "",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const uid = `confirm${++counter}`;
    const opener = document.activeElement;

    const overlay = document.createElement("div");
    overlay.className =
      "side-drawer-overlay side-drawer-overlay--modal is-open";

    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog is-open";
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", `${uid}-title`);
    dialog.setAttribute("aria-describedby", `${uid}-desc`);

    if (danger) {
      const icon = document.createElement("div");
      icon.className = "confirm-dialog__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = WARNING_ICON;
      dialog.appendChild(icon);
    }

    const heading = document.createElement("h3");
    heading.className = "confirm-dialog__title";
    heading.id = `${uid}-title`;
    heading.textContent = title;

    const description = document.createElement("p");
    description.className = "confirm-dialog__desc";
    description.id = `${uid}-desc`;
    description.textContent = message;

    const actions = document.createElement("div");
    actions.className = "confirm-dialog__actions";

    const cancelButton =
      cancelLabel === null ? null : document.createElement("button");

    if (cancelButton) {
      cancelButton.type = "button";
      cancelButton.className = "btn btn--ghost";
      cancelButton.textContent = cancelLabel;
    }

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = `btn ${danger ? "btn--danger" : "btn--primary"}`;
    confirmButton.textContent = confirmLabel;

    actions.append(...[cancelButton, confirmButton].filter(Boolean));
    dialog.append(heading, description, actions);

    let settled = false;

    const settle = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      document.removeEventListener("keydown", handleKeydown, true);
      overlay.remove();
      dialog.remove();

      if (opener && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }

      resolve(result);
    };

    // En captura: Escape y Tab se resuelven aquí y no llegan a otros paneles.
    function handleKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        settle(false);
        return;
      }

      if (event.key === "Tab") {
        const focusable = [cancelButton, confirmButton].filter(Boolean);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (!dialog.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    cancelButton?.addEventListener("click", () => settle(false));
    confirmButton.addEventListener("click", () => settle(true));
    overlay.addEventListener("click", () => settle(false));
    document.addEventListener("keydown", handleKeydown, true);

    document.body.append(overlay, dialog);

    (danger && cancelButton ? cancelButton : confirmButton).focus();
  });
}
