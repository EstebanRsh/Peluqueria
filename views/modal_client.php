<!-- =====================================================
     PANEL LATERAL — ALTA / EDICIÓN DE CLIENTE
====================================================== -->

<div class="side-drawer-overlay" id="clientModalOverlay"></div>

<aside class="side-drawer" id="clientFormPanel" aria-hidden="true">

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


    <!-- =====================================================
         FORMULARIO
    ====================================================== -->

    <div class="day-panel__body">

        <input type="hidden" id="managedClientId">

        <p class="form-privacy-note">
            <span class="form-privacy-note__icon" aria-hidden="true">🔒</span>
            Para cuidar la privacidad, usá un alias o nombre de referencia.
            Evitá guardar teléfonos, documentos, direcciones u otros datos
            personales en este registro.
        </p>

        <div class="form-row">
            <div class="form-group form-group--full">
                <label for="clientAlias">Alias o nombre de referencia</label>

                <input
                    type="text"
                    id="clientAlias"
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
                <label for="clientNotes">Notas</label>

                <textarea
                    id="clientNotes"
                    rows="3"
                    placeholder="Preferencias, observaciones generales..."></textarea>
            </div>
        </div>

    </div>


    <!-- =====================================================
         BOTONES
    ====================================================== -->

    <div class="appointment-detail-footer">

        <button
            type="button"
            class="btn btn--ghost"
            id="clientModalCancel">
            Cancelar
        </button>

        <button
            type="button"
            class="btn btn--primary"
            id="clientModalSave">
            Guardar cliente
        </button>

    </div>

</aside>