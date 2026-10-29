<!-- =====================================================
     VISTA DE PRODUCTOS
     Listado de productos y ventanita de fila.
====================================================== -->

<div class="admin-view">

    <!-- =====================================================
         ENCABEZADO
    ====================================================== -->

    <div class="surface__header">
        <h2 class="surface__title" tabindex="-1">Panel de productos</h2>

        <div class="surface__actions">
            <button
                type="button"
                class="btn btn--primary btn--sm"
                id="btnAddProduct"
                hidden>
                Nuevo producto
            </button>
        </div>
    </div>


    <!-- =====================================================
         CUERPO
    ====================================================== -->

    <div class="surface__body">

        <div class="panel-controls">
            <div class="search-field">
                <input
                    class="panel-search"
                    type="text"
                    id="adminProductSearch"
                    aria-label="Buscar productos por nombre"
                    placeholder="Buscar por nombre"
                    autocomplete="off">
            </div>

            <div class="panel-filters" role="group" aria-label="Filtrar productos por estado">
                <button type="button" class="btn-filter is-active" data-filter="todos" aria-pressed="true">
                    Todos
                </button>

                <button type="button" class="btn-filter" data-filter="activos" aria-pressed="false">
                    Activos
                </button>

                <button type="button" class="btn-filter" data-filter="inactivos" aria-pressed="false">
                    Inactivos
                </button>
            </div>
        </div>

        <table class="data-table" id="productsTable">
            <caption class="sr-only">Listado de productos</caption>
            <thead>
                <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Marca</th>
                    <th scope="col">Stock</th>
                    <th scope="col">Costo</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                </tr>
            </thead>

            <tbody id="adminProductsTableBody">
                <tr>
                    <td colspan="6" class="panel-loading" role="status">
                        Cargando productos…
                    </td>
                </tr>
            </tbody>
        </table>

        <template id="productRowTemplate">
            <tr>
                <td data-label="Nombre" class="cell-primary" data-field="name"></td>
                <td data-label="Marca" data-field="brand"></td>
                <td data-label="Stock" data-field="stock"></td>
                <td data-label="Costo" data-field="cost"></td>
                <td data-label="Estado"><span data-field="status"></span></td>
                <td data-label="Acciones" data-field="actions"></td>
            </tr>
        </template>

    </div>

</div>

<!-- Ventanita de la fila -->
<dialog class="surface-dialog" id="productRowDialog" aria-labelledby="productRowDialogName">
    <div class="surface__header">
        <h3 class="surface__title" id="productRowDialogName"></h3>
        <button type="button" class="surface__close" aria-label="Cerrar"></button>
    </div>
    <div class="surface__body">
        <dl class="row-dialog__data"></dl>
        <div class="row-dialog__notes" hidden>
            <h4 class="row-dialog__notes-title">Notas</h4>
            <p></p>
        </div>
    </div>
    <div class="surface__footer row-dialog__actions"></div>
</dialog>
