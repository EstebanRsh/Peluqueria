<?php require_once __DIR__ . '/../models/AccountModel.php'; ?>
<!-- =====================================================
     PANEL LATERAL — ELIMINAR CUENTA
     Pide la contraseña y la frase de confirmación antes de borrar la cuenta.
====================================================== -->

<div class="side-drawer-overlay side-drawer-overlay--nested" id="deleteModalOverlay"></div>

<aside class="side-drawer side-drawer--nested" id="deletePanel"
    role="dialog" aria-modal="true" aria-labelledby="deleteModalTitle" aria-hidden="true" tabindex="-1">

    <div class="surface__header">
        <h3 class="surface__title" id="deleteModalTitle">
            Eliminar cuenta
        </h3>

        <button
            type="button"
            class="surface__close"
            id="deleteModalClose"
            aria-label="Cerrar">
            ×
        </button>
    </div>


    <form class="drawer-form" id="deleteAccountForm" novalidate autocomplete="off">

        <div class="surface__body">

            <div class="alert alert--error">
                <div>
                    <strong>Esta acción es definitiva.</strong>
                    Se borran para siempre tu cuenta y todos tus datos: clientes, servicios, productos, turnos y fichas.
                    No se puede deshacer ni recuperar. Si querés conservarlos, descargá antes una copia desde "Tus datos".
                </div>
            </div>

            <div class="form-row">
                <div class="form-group form-group--full is-required">
                    <label for="deletePassword">Tu contraseña</label>
                    <div class="password-field">
                        <input id="deletePassword" type="password" autocomplete="off" aria-required="true">
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
                    <label for="deleteConfirmation">Escribí esta frase para confirmar</label>
                    <p class="confirm-phrase" id="deletePhrase"><?= AccountModel::DELETE_CONFIRMATION ?></p>
                    <input id="deleteConfirmation" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-required="true" aria-describedby="deletePhrase deleteConfirmationHint" maxlength="40" placeholder="Escribila acá">
                    <p class="form-hint" id="deleteConfirmationHint">Tiene que ser igual, letra por letra y en mayúsculas.</p>
                </div>
            </div>

        </div>


        <div class="surface__footer">

            <button
                type="button"
                class="btn btn--ghost"
                id="deleteModalCancel">
                Cancelar
            </button>

            <button
                type="submit"
                class="btn btn--danger"
                id="deleteAccountButton">
                Eliminar mi cuenta
            </button>

        </div>

    </form>

</aside>
