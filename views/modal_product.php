<!-- =====================================================
     PANEL LATERAL — ALTA / EDICIÓN DE PRODUCTO
     Formulario de los datos del producto.
====================================================== -->

<div class="side-drawer-overlay" id="productModalOverlay"></div>

<aside class="side-drawer" id="productFormPanel"
    role="dialog" aria-modal="true" aria-labelledby="productModalTitle" aria-hidden="true" tabindex="-1">

    <div class="surface__header">
        <h3 class="surface__title" id="productModalTitle">
            Nuevo producto
        </h3>

        <button
            type="button"
            class="surface__close"
            id="productModalClose"
            aria-label="Cerrar">
            ×
        </button>
    </div>


    <form class="drawer-form" id="productForm" novalidate autocomplete="off">

        <div class="surface__body">

            <input type="hidden" id="managedProductId">

            <div class="form-row">
                <div class="form-group form-group--full is-required">
                    <label for="productName">Nombre</label>

                    <input
                        type="text"
                        id="productName"
                        aria-required="true"
                        maxlength="150"
                        placeholder="Ej: Tintura 6.0 Rubio oscuro">
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
                    <label for="productStock" id="productStockLabel">Stock disponible</label>

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
                    <label for="productCost" id="productCostLabel">Costo por unidad de medida</label>

                    <input
                        type="number"
                        id="productCost"
                        min="0"
                        step="0.01"
                        placeholder="Costo de 1 ml, 1 g o 1 unidad">
                </div>
            </div>

            <details class="form-optional">
                <summary class="form-optional__summary">Más datos (opcional)</summary>
                <div class="form-optional__fields">
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
                </div>
            </details>

            <p class="form-hint">Los campos con * son obligatorios.</p>

        </div>


        <div class="surface__footer">

            <button
                type="button"
                class="btn btn--ghost"
                id="productModalCancel">
                Cancelar
            </button>

            <button
                type="submit"
                class="btn btn--primary"
                id="productModalSave">
                Guardar producto
            </button>

        </div>

    </form>

</aside>
