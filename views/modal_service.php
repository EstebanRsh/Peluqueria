<div class="modal-overlay" id="serviceModalOverlay">
    <div class="modal">

        <!-- =====================================================
             ENCABEZADO DEL MODAL
        ====================================================== -->

        <div class="modal__header">
            <h3 class="modal__title" id="serviceModalTitle">
                Nuevo servicio
            </h3>

            <button
                class="modal__close"
                id="serviceModalClose"
                aria-label="Cerrar">
                &#10005;
            </button>
        </div>


        <!-- =====================================================
             FORMULARIO
        ====================================================== -->

        <div class="modal__body">

            <input type="hidden" id="managedServiceId">

            <div class="form-row">
                <div class="form-group form-group--full">
                    <label for="serviceName">Nombre</label>

                    <input
                        type="text"
                        id="serviceName"
                        maxlength="100"
                        placeholder="Ej: Corte de cabello">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group form-group--full">
                    <label for="serviceDescription">Descripción</label>

                    <textarea
                        id="serviceDescription"
                        rows="2"
                        placeholder="Descripción opcional..."></textarea>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="serviceDuration">Duración (minutos)</label>

                    <input
                        type="number"
                        id="serviceDuration"
                        min="1"
                        step="1"
                        placeholder="30">
                </div>

                <div class="form-group">
                    <label for="servicePrice">Precio base ($)</label>

                    <input
                        type="number"
                        id="servicePrice"
                        min="0"
                        step="0.01"
                        placeholder="0.00">
                </div>
            </div>

        </div>


        <!-- =====================================================
             BOTONES
        ====================================================== -->

        <div class="modal__footer">

            <button
                class="btn btn--ghost"
                id="serviceModalCancel">
                Cancelar
            </button>

            <button
                class="btn btn--primary"
                id="serviceModalSave">
                Guardar servicio
            </button>

        </div>

    </div>
</div>