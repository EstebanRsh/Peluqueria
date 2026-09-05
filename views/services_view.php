<div class="admin-view">

    <!-- =====================================================
         ENCABEZADO
    ====================================================== -->

    <div class="day-panel__header">
        <span class="day-panel__date">Gestión de servicios</span>

        <div class="day-panel__actions">
            <button
                type="button"
                class="btn btn--primary btn--sm"
                id="btnAddService">
                <span aria-hidden="true">➕</span> Nuevo servicio
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
                id="serviceSearch"
                placeholder="Buscar servicio..."
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

        <table class="data-table" id="servicesTable">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Duración</th>
                    <th>Precio</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>

            <tbody id="servicesTableBody">
                <tr>
                    <td colspan="5" class="panel-loading">
                        Cargando servicios...
                    </td>
                </tr>
            </tbody>
        </table>

    </div>

</div>