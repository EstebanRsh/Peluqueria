<div class="admin-view">

    <!-- =====================================================
         ENCABEZADO
         El botón "Nuevo servicio" está oculto: lo activa el botón
         flotante de acciones rápidas (fab.js).
    ====================================================== -->

    <div class="day-panel__header">
        <h2 class="day-panel__date">Gestión de servicios</h2>

        <div class="day-panel__actions">
            <button
                type="button"
                class="btn btn--primary btn--sm"
                id="btnAddService"
                hidden>
                Nuevo servicio
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
                aria-label="Buscar servicios"
                placeholder="Buscar servicio"
                autocomplete="off">

            <div class="panel-filters" role="group" aria-label="Filtrar servicios por estado">
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

        <table class="data-table" id="servicesTable">
            <caption class="sr-only">Listado de servicios</caption>
            <thead>
                <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Duración</th>
                    <th scope="col">Precio</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                </tr>
            </thead>

            <tbody id="servicesTableBody">
                <tr>
                    <td colspan="5" class="panel-loading" role="status">
                        Cargando servicios...
                    </td>
                </tr>
            </tbody>
        </table>

    </div>

</div>