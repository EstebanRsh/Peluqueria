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

    // En acciones destructivas el foco inicial va a "Cancelar".
    (danger && cancelButton ? cancelButton : confirmButton).focus();
  });
}
