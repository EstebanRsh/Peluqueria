<!-- =====================================================
     PANEL LATERAL — AJUSTES DE LA CUENTA
====================================================== -->

<div class="side-drawer-overlay" id="settingsModalOverlay"></div>

<aside class="side-drawer" id="settingsPanel"
    role="dialog" aria-modal="true" aria-labelledby="settingsModalTitle" aria-hidden="true" tabindex="-1">

    <div class="day-panel__header">
        <h3 class="day-panel__date" id="settingsModalTitle">
            Ajustes
        </h3>

        <button
            type="button"
            class="day-panel__close"
            id="settingsModalClose"
            aria-label="Cerrar">
            ×
        </button>
    </div>


    <div class="day-panel__body">

        <section class="settings-section" aria-labelledby="settingsAccountTitle">
            <h4 class="history-title" id="settingsAccountTitle">Tu cuenta</h4>

            <dl class="row-dialog__data">
                <div>
                    <dt>Usuario</dt>
                    <dd id="accountUsername">—</dd>
                </div>
                <div>
                    <dt>Email</dt>
                    <dd id="accountEmail">—</dd>
                </div>
                <div>
                    <dt>Cuenta creada</dt>
                    <dd id="accountCreated">—</dd>
                </div>
            </dl>
        </section>

        <section class="settings-section" aria-labelledby="settingsPasswordTitle">
            <h4 class="history-title" id="settingsPasswordTitle">Cambiar contraseña</h4>

            <form class="settings-form" id="passwordForm" novalidate autocomplete="off">

                <input type="text" id="settingsUsername" autocomplete="username" value="<?= $username ?>" hidden>

                <div class="form-row">
                    <div class="form-group form-group--full is-required">
                        <label for="settingsCurrentPassword">Contraseña actual</label>
                        <div class="password-field">
                            <input id="settingsCurrentPassword" type="password" autocomplete="current-password" aria-required="true">
                            <button type="button" class="password-field__toggle" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false">
                                <svg <?= $iconAttrs ?>>
                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                <svg <?= $iconAttrs ?> hidden>
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94" />
                                    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
                                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group form-group--full is-required">
                        <label for="settingsNewPassword">Contraseña nueva (mínimo 12 caracteres)</label>
                        <div class="password-field">
                            <input id="settingsNewPassword" type="password" autocomplete="new-password" aria-required="true">
                            <button type="button" class="password-field__toggle" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false">
                                <svg <?= $iconAttrs ?>>
                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                <svg <?= $iconAttrs ?> hidden>
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94" />
                                    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
                                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group form-group--full is-required">
                        <label for="settingsNewPasswordConfirm">Repetir contraseña nueva</label>
                        <div class="password-field">
                            <input id="settingsNewPasswordConfirm" type="password" autocomplete="new-password" aria-required="true">
                            <button type="button" class="password-field__toggle" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false">
                                <svg <?= $iconAttrs ?>>
                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                <svg <?= $iconAttrs ?> hidden>
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94" />
                                    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
                                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <p class="form-hint">Al cambiarla se cierran tus otras sesiones abiertas.</p>

                <button type="submit" class="btn btn--primary" id="passwordSave">Guardar contraseña</button>

            </form>
        </section>

        <section class="settings-section" aria-labelledby="settingsDataTitle">
            <h4 class="history-title" id="settingsDataTitle">Tus datos</h4>

            <p class="form-hint">Descargá una copia de todo lo que guardaste en HairApp: cuenta, clientes, servicios, productos, turnos y fichas.</p>

            <button type="button" class="btn btn--ghost" id="exportData">Descargar mis datos</button>

            <p class="form-hint">También podés cargar una copia descargada de otra cuenta. Solo funciona en una cuenta sin datos cargados.</p>

            <input type="file" id="importFile" accept=".json,application/json" hidden>

            <button type="button" class="btn btn--ghost" id="importData">Importar datos</button>
        </section>

    </div>


    <div class="appointment-detail-footer">

        <button
            type="button"
            class="btn btn--ghost"
            id="settingsModalCancel">
            Cerrar
        </button>

    </div>

</aside>
