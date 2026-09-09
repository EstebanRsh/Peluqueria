<div class="modal-overlay" id="clientModalOverlay">
    <div class="modal">

        <!-- =====================================================
             ENCABEZADO DEL MODAL
        ====================================================== -->

        <div class="modal__header">
            <h3 class="modal__title" id="clientModalTitle">
                Nuevo cliente
            </h3>

            <button
                class="modal__close"
                id="clientModalClose"
                aria-label="Cerrar">
                &#10005;
            </button>
        </div>


        <!-- =====================================================
             FORMULARIO
        ====================================================== -->

        <div class="modal__body">

            <input type="hidden" id="managedClientId">

            <p class="form-privacy-note" style="font-size: 0.85rem; opacity: 0.75; margin: 0 0 14px;">
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

        <div class="modal__footer">

            <button
                class="btn btn--ghost"
                id="clientModalCancel">
                Cancelar
            </button>

            <button
                class="btn btn--primary"
                id="clientModalSave">
                Guardar cliente
            </button>

        </div>

    </div>
</div>