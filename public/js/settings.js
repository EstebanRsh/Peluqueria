import {
  ApiError,
  changePassword,
  fetchAccount,
  fetchAccountExport,
  getErrorMessage,
  importAccountData,
  logError,
} from "./api.js";
import { confirmAction, showResult } from "./confirm.js";
import { $, initPasswordToggles } from "./dom.js";
import {
  clearInvalidOnInput,
  createDirtyTracker,
  createDrawer,
  createFeedback,
  setBusy,
} from "./feedback.js";
import { formatDate, todayIso } from "./utils.js";

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const INVALID_FILE_MESSAGE = "El archivo no es una copia válida de HairApp.";

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

async function exportData() {
  const button = $("exportData");

  setBusy(button, true);

  try {
    const { data } = await fetchAccountExport();
    const file = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(file);
    link.download = `hairapp-datos-${todayIso()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);

    showResult(
      "success",
      "Datos descargados",
      "Guardá el archivo en un lugar seguro: tiene la información de tus clientes.",
    );
  } catch (error) {
    logError("Error al descargar los datos:", error);
    feedback.show(
      "error",
      getErrorMessage(error, "No se pudieron descargar tus datos."),
    );
  } finally {
    setBusy(button, false);
  }
}

async function readImportFile(file) {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new ApiError("El archivo es demasiado grande (máximo 10 MB).", {
      kind: "request",
    });
  }

  try {
    return JSON.parse(await file.text());
  } catch {
    throw new ApiError(INVALID_FILE_MESSAGE, { kind: "request" });
  }
}

async function importData(file) {
  const button = $("importData");

  try {
    const data = await readImportFile(file);
    const count = (table) => (Array.isArray(data?.[table]) ? data[table].length : 0);

    const confirmed = await confirmAction({
      title: "Importar datos",
      message: `Se van a cargar ${count("clients")} clientes, ${count("services")} servicios, ${count("products")} productos, ${count("appointments")} turnos y ${count("service_history")} fichas en esta cuenta.`,
      confirmLabel: "Importar",
    });

    if (!confirmed) return;

    setBusy(button, true);

    const result = await importAccountData(data);

    if (!result.success) {
      throw new ApiError(result.error || "No se pudieron importar los datos.", {
        kind: "request",
      });
    }

    await showResult(
      "success",
      "Datos importados",
      "Tu información ya está cargada en esta cuenta.",
      { hold: true },
    );
    window.location.reload();
  } catch (error) {
    logError("Error al importar los datos:", error);
    feedback.show(
      "error",
      getErrorMessage(error, "No se pudieron importar los datos."),
    );
    setBusy(button, false);
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

  $("exportData").addEventListener("click", exportData);
  $("importData").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (event) => {
    const [file] = event.target.files;

    event.target.value = "";

    if (file) importData(file);
  });

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
