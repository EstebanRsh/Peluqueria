<div class="admin-view">

    <!-- =====================================================
         ENCABEZADO
    ====================================================== -->

    <div class="day-panel__header">
        <span class="day-panel__date">Panel de productos</span>

        <div class="day-panel__actions">
            <button
                type="button"
                class="btn btn--primary btn--sm"
                id="btnAddProduct"
                style="display:none">
                <span aria-hidden="true">➕</span> Nuevo producto
            </button>
        </div>
    </div>


    <!-- =====================================================
         CUERPO
    ====================================================== -->

    <div class="day-panel__body">

        <div class="panel-controls">
            <input
                class="panel-search"
                type="text"
                id="adminProductSearch"
                placeholder="Buscar por nombre o marca..."
                autocomplete="off">

            <div class="panel-filters">
                <button type="button" class="btn-filter active" data-filter="todos">
                    Todos
                </button>

                <button type="button" class="btn-filter" data-filter="activos">
                    Activos
                </button>

                <button type="button" class="btn-filter" data-filter="inactivos">
                    Inactivos
                </button>
            </div>
        </div>

        <table class="data-table" id="productsTable">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Marca</th>
                    <th>Stock</th>
                    <th>Costo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>

            <tbody id="adminProductsTableBody">
                <tr>
                    <td colspan="6" class="panel-loading">
                        Cargando productos...
                    </td>
                </tr>
            </tbody>
        </table>

    </div>

</div>