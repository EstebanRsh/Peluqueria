<div class="admin-view">

    <!-- =====================================================
         ENCABEZADO
         El botón "Nuevo servicio" está oculto: lo activa el botón
         flotante de acciones rápidas (fab.js).
    ====================================================== -->

    <div class="day-panel__header">
        <h2 class="day-panel__date" tabindex="-1">Gestión de servicios</h2>

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
            <div class="search-field">
                <input
                    class="panel-search"
                    type="text"
                    id="serviceSearch"
                    aria-label="Buscar servicios"
                    placeholder="Buscar servicio"
                    autocomplete="off">
            </div>

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
                        Cargando servicios…
                    </td>
                </tr>
            </tbody>
        </table>

    </div>

</div>

<!-- Ventanita de la fila (celular): datos y acciones -->
<dialog class="status-dialog" id="serviceRowDialog" aria-labelledby="serviceRowDialogName">
    <div class="status-dialog__body">
        <div class="status-dialog__header">
            <h3 class="status-dialog__name" id="serviceRowDialogName"></h3>
            <button type="button" class="day-panel__close" aria-label="Cerrar">×</button>
        </div>
        <dl class="row-dialog__data"></dl>
        <div class="row-dialog__notes" hidden>
            <h4 class="row-dialog__notes-title">Notas</h4>
            <p></p>
        </div>
        <div class="row-dialog__actions"></div>
    </div>
</dialog>
