<!-- =====================================================
     PANEL LATERAL — ALTA / EDICIÓN DE SERVICIO
     Mismo drawer que perfil/alta de cliente: overlay + aside
     con day-panel__header / day-panel__body / footer.
====================================================== -->

<div class="side-drawer-overlay" id="serviceModalOverlay"></div>

<aside class="side-drawer" id="serviceFormPanel" aria-hidden="true">

    <div class="day-panel__header">
        <h3 class="day-panel__date" id="serviceModalTitle">
            Nuevo servicio
        </h3>

        <button
            type="button"
            class="day-panel__close"
            id="serviceModalClose"
            aria-label="Cerrar">
            ×
        </button>
    </div>


    <!-- =====================================================
         FORMULARIO
    ====================================================== -->

    <div class="day-panel__body">

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

    <div class="appointment-detail-footer">

        <button
            type="button"
            class="btn btn--ghost"
            id="serviceModalCancel">
            Cancelar
        </button>

        <button
            type="button"
            class="btn btn--primary"
            id="serviceModalSave">
            Guardar servicio
        </button>

    </div>

</aside>