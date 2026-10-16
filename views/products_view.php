<div class="admin-view">

    <!-- =====================================================
         ENCABEZADO
         El botón "Nuevo producto" está oculto: lo activa el botón
         flotante de acciones rápidas (fab.js).
    ====================================================== -->

    <div class="day-panel__header">
        <h2 class="day-panel__date">Panel de productos</h2>

        <div class="day-panel__actions">
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

    <div class="day-panel__body">

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
                        Cargando productos...
                    </td>
                </tr>
            </tbody>
        </table>

    </div>

</div>