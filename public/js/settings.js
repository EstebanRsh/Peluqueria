import {
  ApiError,
  changePassword,
  fetchAccount,
  getErrorMessage,
  logError,
} from "./api.js";
import { showResult } from "./confirm.js";
import { $, initPasswordToggles } from "./dom.js";
import {
  clearInvalidOnInput,
  createDirtyTracker,
  createDrawer,
  createFeedback,
  setBusy,
} from "./feedback.js";
import { formatDate } from "./utils.js";

const PASSWORD_FIELDS = [
  "settingsCurrentPassword",
  "settingsNewPassword",
  "settingsNewPasswordConfirm",
];

let drawer = null;
let feedback = null;
let dirty = null;
let isSaving = false;

async function loadAccount() {
  try {
    const { account } = await fetchAccount();

    $("accountUsername").textContent = account.username;
    $("accountEmail").textContent = account.email || "Sin email";
    $("accountCreated").textContent = formatDate(account.created_at.slice(0, 10));
  } catch (error) {
    logError("Error al cargar la cuenta:", error);
    feedback.show(
      "error",
      getErrorMessage(error, "No se pudieron cargar los datos de tu cuenta."),
    );
  }
}

function resetPasswordForm() {
  $("passwordForm").reset();
  $("settingsPanel")
    .querySelectorAll("[data-toggle-password][aria-pressed='true']")
    .forEach((button) => button.click());
  feedback.clearInvalid();
  dirty.reset();
}

function openSettings() {
  resetPasswordForm();
  drawer.open($("settingsModalClose"));
  loadAccount();
}

async function savePassword() {
  if (isSaving) return;

  feedback.clearInvalid();

  const empty = PASSWORD_FIELDS.filter((id) => !$(id).value);

  if (empty.length > 0) {
    feedback.invalidate(empty);
    feedback.focusInvalid();
    return;
  }

  const saveButton = $("passwordSave");
  isSaving = true;
  setBusy(saveButton, true);

  try {
    const result = await changePassword({
      current_password: $("settingsCurrentPassword").value,
      new_password: $("settingsNewPassword").value,
      new_password_confirm: $("settingsNewPasswordConfirm").value,
    });

    if (!result.success) {
      throw new ApiError(result.error || "No se pudo cambiar la contraseña.", {
        kind: "request",
      });
    }

    resetPasswordForm();
    showResult(
      "success",
      "Contraseña actualizada",
      "Cerramos tus otras sesiones abiertas.",
    );
  } catch (error) {
    logError("Error al cambiar la contraseña:", error);
    feedback.show(
      "error",
      getErrorMessage(error, "No se pudo cambiar la contraseña."),
    );
  } finally {
    isSaving = false;
    setBusy(saveButton, false);
  }
}

export function initSettings() {
  const panel = $("settingsPanel");

  if (!panel) return;

  feedback = createFeedback(panel);
  dirty = createDirtyTracker(panel);
  drawer = createDrawer({
    overlay: $("settingsModalOverlay"),
    panel,
    feedback,
    dirty,
  });

  initPasswordToggles(panel);
  clearInvalidOnInput(panel);

  $("navSettings").addEventListener("click", (event) => {
    event.preventDefault();
    openSettings();
  });
  $("settingsModalClose").addEventListener("click", () => drawer.close());
  $("settingsModalCancel").addEventListener("click", () => drawer.close());
  $("settingsModalOverlay").addEventListener("click", () =>
    drawer.requestClose(),
  );

  $("passwordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    savePassword();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.isOpen()) {
      drawer.requestClose();
    }
  });
}
