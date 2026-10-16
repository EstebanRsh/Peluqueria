<!-- =====================================================
     PANEL LATERAL — ALTA / EDICIÓN DE SERVICIO
     Mismo drawer que el resto: overlay + aside con
     day-panel__header / formulario / botones.
====================================================== -->

<div class="side-drawer-overlay" id="serviceModalOverlay"></div>

<aside class="side-drawer" id="serviceFormPanel"
    role="dialog" aria-modal="true" aria-labelledby="serviceModalTitle" aria-hidden="true" tabindex="-1">

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


    <form class="drawer-form" id="serviceForm" novalidate autocomplete="off">

        <div class="day-panel__body">

            <input type="hidden" id="managedServiceId">

            <div class="form-group is-required">
                <label for="serviceName">Nombre</label>

                <input
                    type="text"
                    id="serviceName"
                    aria-required="true"
                    maxlength="100"
                    placeholder="Ej: Corte de cabello">
            </div>

            <div class="form-group">
                <label for="serviceDescription">Descripción</label>

                <textarea
                    id="serviceDescription"
                    rows="2"
                    placeholder="Descripción opcional"></textarea>
            </div>

            <div class="form-row">
                <div class="form-group is-required">
                    <label for="serviceDuration">Duración (min)</label>

                    <input
                        type="number"
                        id="serviceDuration"
                        aria-required="true"
                        min="1"
                        step="1"
                        inputmode="numeric"
                        placeholder="30">
                </div>

                <div class="form-group is-required">
                    <label for="servicePrice">Precio base ($)</label>

                    <input
                        type="number"
                        id="servicePrice"
                        aria-required="true"
                        min="0"
                        step="0.01"
                        inputmode="decimal"
                        placeholder="0.00">
                </div>
            </div>

            <p class="form-hint">Los campos con * son obligatorios.</p>

        </div>


        <div class="appointment-detail-footer">

            <button
                type="button"
                class="btn btn--ghost"
                id="serviceModalCancel">
                Cancelar
            </button>

            <button
                type="submit"
                class="btn btn--primary"
                id="serviceModalSave">
                Guardar servicio
            </button>

        </div>

    </form>

</aside>