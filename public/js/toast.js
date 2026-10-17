// ============================================================
// AVISOS NO BLOQUEANTES (TOASTS)
// ============================================================

const REGION_ID = "toastRegion";
const MAX_VISIBLE = 3;
const LEAVE_MS = 200;

const DURATIONS = {
  success: 3500,
  info: 4000,
  warning: 6000,
  error: 7000,
};

// Contenedor único, creado la primera vez que se necesita.
function getRegion() {
  let region = document.getElementById(REGION_ID);

  if (!region) {
    region = document.createElement("div");
    region.id = REGION_ID;
    region.className = "toast-region";
    region.setAttribute("role", "region");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-label", "Avisos");
    document.body.appendChild(region);
  }

  return region;
}

function removeToast(toast) {
  if (!toast.isConnected || toast.classList.contains("is-leaving")) {
    return;
  }

  clearTimeout(toast._timer);
  toast.classList.add("is-leaving");
  setTimeout(() => toast.remove(), LEAVE_MS);
}

function scheduleRemoval(toast, duration) {
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => removeToast(toast), duration);
}

// Muestra un aviso. Con "action" ({ label, onClick }) suma un botón, por ejemplo "Deshacer".
function showToast(message, { type = "info", duration, action = null } = {}) {
  const region = getRegion();
  const lifetime = duration ?? DURATIONS[type] ?? DURATIONS.info;

  const duplicate = action
    ? null
    : Array.from(region.children).find(
        (toast) =>
          toast.dataset.message === message &&
          toast.dataset.type === type &&
          !toast.classList.contains("is-leaving"),
      );

  if (duplicate) {
    scheduleRemoval(duplicate, lifetime);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.dataset.message = message;
  toast.dataset.type = type;

  if (type === "error") {
    toast.setAttribute("role", "alert");
  }

  const text = document.createElement("span");
  text.className = "toast__message";
  text.textContent = message;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast__close";
  close.setAttribute("aria-label", "Cerrar aviso");
  close.textContent = "×";
  close.addEventListener("click", () => removeToast(toast));

  toast.append(text);

  if (action) {
    const actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.className = "toast__action";
    actionButton.textContent = action.label;
    actionButton.addEventListener("click", () => {
      removeToast(toast);
      action.onClick();
    });
    toast.append(actionButton);
  }

  toast.append(close);

  toast.addEventListener("pointerenter", () => clearTimeout(toast._timer));
  toast.addEventListener("pointerleave", () => scheduleRemoval(toast, 2000));

  region.appendChild(toast);

  const visible = Array.from(region.children).filter(
    (item) => !item.classList.contains("is-leaving"),
  );

  visible
    .slice(0, Math.max(0, visible.length - MAX_VISIBLE))
    .forEach(removeToast);

  scheduleRemoval(toast, lifetime);
}

export const notify = {
  success: (message, options) =>
    showToast(message, { ...options, type: "success" }),
  error: (message, options) =>
    showToast(message, { ...options, type: "error" }),
  warning: (message, options) =>
    showToast(message, { ...options, type: "warning" }),
  info: (message, options) => showToast(message, { ...options, type: "info" }),
};
