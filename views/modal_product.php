<!-- =====================================================
     PANEL LATERAL — ALTA / EDICIÓN DE PRODUCTO
====================================================== -->

<div class="side-drawer-overlay" id="productModalOverlay"></div>

<aside class="side-drawer" id="productFormPanel" aria-hidden="true">

    <div class="day-panel__header">
        <h3 class="day-panel__date" id="productModalTitle">
            Nuevo producto
        </h3>

        <button
            type="button"
            class="day-panel__close"
            id="productModalClose"
            aria-label="Cerrar">
            ×
        </button>
    </div>


    <!-- =====================================================
         FORMULARIO
    ====================================================== -->

    <div class="day-panel__body">

        <input type="hidden" id="managedProductId">

        <div class="form-row">
            <div class="form-group form-group--full">
                <label for="productName">Nombre</label>

                <input
                    type="text"
                    id="productName"
                    maxlength="150"
                    placeholder="Ej: Tintura 6.0 Rubio oscuro">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group form-group--full">
                <label for="productBrand">Marca</label>

                <input
                    type="text"
                    id="productBrand"
                    maxlength="100"
                    placeholder="Opcional">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group form-group--full">
                <label for="productUnit">Unidad de medida</label>

                <select id="productUnit" class="form-select">
                    <option value="ml">Mililitros (ml)</option>
                    <option value="g">Gramos (g)</option>
                    <option value="unidad">Unidad</option>
                </select>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group form-group--full">
                <label for="productStock">Stock disponible</label>

                <input
                    type="number"
                    id="productStock"
                    min="0"
                    step="0.01"
                    placeholder="0">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group form-group--full">
                <label for="productCost">Costo por unidad de medida</label>

                <input
                    type="number"
                    id="productCost"
                    min="0"
                    step="0.01"
                    placeholder="Costo de 1 ml, 1 g o 1 unidad">
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
            id="productModalCancel">
            Cancelar
        </button>

        <button
            type="button"
            class="btn btn--primary"
            id="productModalSave">
            Guardar producto
        </button>

    </div>

</aside>