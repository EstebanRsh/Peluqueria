<!-- =====================================================
     PANEL LATERAL — ALTA / EDICIÓN DE CLIENTE
====================================================== -->

<div class="side-drawer-overlay" id="clientModalOverlay"></div>

<aside class="side-drawer" id="clientFormPanel"
    role="dialog" aria-modal="true" aria-labelledby="clientModalTitle" aria-hidden="true" tabindex="-1">

    <div class="day-panel__header">
        <h3 class="day-panel__date" id="clientModalTitle">
            Nuevo cliente
        </h3>

        <button
            type="button"
            class="day-panel__close"
            id="clientModalClose"
            aria-label="Cerrar">
            ×
        </button>
    </div>


    <form class="drawer-form" id="clientForm" novalidate autocomplete="off">

        <div class="day-panel__body">

            <input type="hidden" id="managedClientId">

            <p class="form-privacy-note">
                <span class="form-privacy-note__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">
                        <rect x="4" y="11" width="16" height="10" rx="1" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                </span>
                Para cuidar la privacidad, usá un alias o nombre de referencia.
                Evitá guardar teléfonos, documentos o direcciones. Anotá solo
                las alergias que importen para el servicio.
            </p>

            <div class="form-row">
                <div class="form-group form-group--full is-required">
                    <label for="clientAlias">Alias o nombre de referencia</label>

                    <input
                        type="text"
                        id="clientAlias"
                        aria-required="true"
                        maxlength="100"
                        placeholder="Ej: María R.">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group form-group--full">
                    <label for="clientCode">Código interno</label>

                    <input
                        type="text"
                        id="clientCode"
                        maxlength="40"
                        placeholder="Se genera automáticamente si lo dejás vacío">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group form-group--full">
                    <label for="clientAllergies">Alergias</label>

                    <textarea
                        id="clientAllergies"
                        rows="2"
                        maxlength="500"
                        placeholder="Ej: alergia al amoníaco o a la parafenilendiamina"></textarea>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group form-group--full">
                    <label for="clientNotes">Notas</label>

                    <textarea
                        id="clientNotes"
                        rows="3"
                        placeholder="Preferencias, observaciones generales..."></textarea>
                </div>
            </div>

            <p class="form-hint">Los campos con * son obligatorios.</p>

        </div>


        <div class="appointment-detail-footer">

            <button
                type="button"
                class="btn btn--ghost"
                id="clientModalCancel">
                Cancelar
            </button>

            <button
                type="submit"
                class="btn btn--primary"
                id="clientModalSave">
                Guardar cliente
            </button>

        </div>

    </form>

</aside>
