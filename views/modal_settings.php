<!-- =====================================================
     PANEL LATERAL — AJUSTES DE LA CUENTA
     Datos de la cuenta, cambio de contraseña, descarga, importación y eliminación.
====================================================== -->

<div class="side-drawer-overlay" id="settingsModalOverlay"></div>

<aside class="side-drawer" id="settingsPanel"
    role="dialog" aria-modal="true" aria-labelledby="settingsModalTitle" aria-hidden="true" tabindex="-1">

    <div class="surface__header">
        <h3 class="surface__title" id="settingsModalTitle">
            Ajustes
        </h3>

        <button
            type="button"
            class="surface__close"
            id="settingsModalClose"
            aria-label="Cerrar"></button>
    </div>


    <div class="surface__body">

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

        <section class="settings-section" aria-labelledby="settingsHoursTitle">
            <h4 class="history-title" id="settingsHoursTitle">Horario de atención</h4>

            <form class="settings-form hours-form" id="hoursForm" novalidate>
                <fieldset class="form-group">
                    <legend class="form-label">Tipo de horario</legend>
                    <div class="preset-chips" id="hoursMode">
                        <label class="btn-filter"><input type="radio" class="sr-only" name="hoursMode" value="continuous">Corrido</label>
                        <label class="btn-filter"><input type="radio" class="sr-only" name="hoursMode" value="split">Mañana y tarde</label>
                    </div>
                </fieldset>

                <div class="form-row">
                    <div class="form-group is-required">
                        <label for="hoursOpening">Apertura<span class="hours-split-only"> mañana</span></label>
                        <input type="time" id="hoursOpening" aria-required="true">
                    </div>

                    <div class="form-group is-required">
                        <label for="hoursClosing">Cierre<span class="hours-split-only"> mañana</span></label>
                        <input type="time" id="hoursClosing" aria-required="true">
                    </div>
                </div>

                <div class="form-row hours-split-only">
                    <div class="form-group is-required">
                        <label for="hoursOpening2">Apertura tarde</label>
                        <input type="time" id="hoursOpening2" aria-required="true">
                    </div>

                    <div class="form-group is-required">
                        <label for="hoursClosing2">Cierre tarde</label>
                        <input type="time" id="hoursClosing2" aria-required="true">
                    </div>
                </div>

                <fieldset class="form-group">
                    <legend class="form-label">Días que atendés</legend>
                    <div class="preset-chips" id="hoursDays">
                        <label class="btn-filter"><input type="checkbox" class="sr-only" value="1">Lun</label>
                        <label class="btn-filter"><input type="checkbox" class="sr-only" value="2">Mar</label>
                        <label class="btn-filter"><input type="checkbox" class="sr-only" value="3">Mié</label>
                        <label class="btn-filter"><input type="checkbox" class="sr-only" value="4">Jue</label>
                        <label class="btn-filter"><input type="checkbox" class="sr-only" value="5">Vie</label>
                        <label class="btn-filter"><input type="checkbox" class="sr-only" value="6">Sáb</label>
                        <label class="btn-filter"><input type="checkbox" class="sr-only" value="7">Dom</label>
                    </div>
                </fieldset>

                <p class="form-hint">Al cargar un turno te muestra el lugar libre y te avisa si queda fuera de horario.</p>
                <p class="form-hint">Los campos con * son obligatorios.</p>

                <button type="submit" class="btn btn--primary" id="hoursSave">Guardar horario</button>
            </form>
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
                <p class="form-hint">Los campos con * son obligatorios.</p>

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

        <section class="settings-section" aria-labelledby="settingsLegalTitle">
            <h4 class="history-title" id="settingsLegalTitle">Legal</h4>

            <p class="form-hint">
                <a class="text-link" href="terminos.php" data-legal="terminos">Términos y condiciones</a>
                ·
                <a class="text-link" href="privacidad.php" data-legal="privacidad">Política de privacidad</a>
            </p>
        </section>

        <section class="settings-section" aria-labelledby="settingsDeleteTitle">
            <h4 class="history-title" id="settingsDeleteTitle">Eliminar cuenta</h4>

            <p class="form-hint">Se borran para siempre tu cuenta y todos tus datos. No se puede deshacer.</p>

            <button type="button" class="btn btn--danger" id="openDeleteAccount">Eliminar cuenta</button>
        </section>

    </div>

</aside>
