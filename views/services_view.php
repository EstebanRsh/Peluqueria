<!-- =====================================================
     VISTA DE SERVICIOS
     Listado de servicios y ventanita de fila.
====================================================== -->

<div class="admin-view">

    <!-- =====================================================
         ENCABEZADO
    ====================================================== -->

    <div class="surface__header">
        <h2 class="surface__title" tabindex="-1">Gestión de servicios</h2>

        <div class="surface__actions">
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

    <div class="surface__body">

        <div class="panel-controls">
            <div class="search-field">
                <input
                    class="panel-search"
                    type="text"
                    id="serviceListSearch"
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

<!-- Ventanita de la fila -->
<dialog class="surface-dialog" id="serviceRowDialog" aria-labelledby="serviceRowDialogName">
    <div class="surface__header">
        <h3 class="surface__title" id="serviceRowDialogName"></h3>
        <button type="button" class="surface__close" aria-label="Cerrar">×</button>
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
