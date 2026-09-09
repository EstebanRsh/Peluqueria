<div class="admin-view">

    <!-- =====================================================
         ENCABEZADO
    ====================================================== -->

    <div class="day-panel__header">
        <span class="day-panel__date">Panel de clientes</span>

        <div class="day-panel__actions">
            <button
                type="button"
                class="btn btn--primary btn--sm"
                id="btnAddClient">
                <span aria-hidden="true">➕</span> Nuevo cliente
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
                id="clientSearch"
                placeholder="Buscar por alias o código..."
                autocomplete="off">

            <div class="panel-filters">
                <button class="btn-filter active" data-filter="todos">
                    Todos
                </button>

                <button class="btn-filter" data-filter="activos">
                    Activos
                </button>

                <button class="btn-filter" data-filter="inactivos">
                    Inactivos
                </button>
            </div>
        </div>

        <table class="data-table" id="clientsTable">
            <thead>
                <tr>
                    <th>Alias</th>
                    <th>Código</th>
                    <th>Notas</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>

            <tbody id="clientsTableBody">
                <tr>
                    <td colspan="5" class="panel-loading">
                        Cargando clientes...
                    </td>
                </tr>
            </tbody>
        </table>

    </div>

</div>