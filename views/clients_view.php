<div class="admin-view">

    <!-- =====================================================
         ENCABEZADO
         El botón "Nuevo cliente" está oculto: lo activa el botón
         flotante de acciones rápidas (fab.js).
    ====================================================== -->

    <div class="day-panel__header">
        <h2 class="day-panel__date" tabindex="-1">Panel de clientes</h2>

        <div class="day-panel__actions">
            <button
                type="button"
                class="btn btn--primary btn--sm"
                id="btnAddClient"
                hidden>
                Nuevo cliente
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
                    id="clientListSearch"
                    aria-label="Buscar clientes por alias"
                    placeholder="Buscar por alias"
                    autocomplete="off">
            </div>

            <div class="panel-filters" role="group" aria-label="Filtrar clientes por estado">
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

        <table class="data-table" id="clientsTable">
            <caption class="sr-only">Listado de clientes</caption>
            <thead>
                <tr>
                    <th scope="col">Alias</th>
                    <th scope="col">Código</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Notas</th>
                    <th scope="col">Acciones</th>
                </tr>
            </thead>

            <tbody id="clientsTableBody">
                <tr>
                    <td colspan="5" class="panel-loading" role="status">
                        Cargando clientes…
                    </td>
                </tr>
            </tbody>
        </table>

    </div>

</div>

<!-- =====================================================
     PANEL LATERAL — PERFIL DE CLIENTE
====================================================== -->

<div class="side-drawer-overlay" id="clientProfileOverlay"></div>

<aside class="side-drawer side-drawer--wide" id="clientProfilePanel"
    role="dialog" aria-modal="true" aria-labelledby="clientProfileName" aria-hidden="true" tabindex="-1">
    <div class="day-panel__header">
        <div class="profile-drawer__identity">
            <span class="profile-drawer__avatar" id="clientProfileAvatar" aria-hidden="true">CR</span>
            <div class="profile-drawer__identity-text">
                <h3 class="day-panel__date" id="clientProfileName">Cliente</h3>
                <span class="profile-drawer__code" id="clientProfileCode">CLI-0000</span>
            </div>
        </div>
        <button type="button" class="day-panel__close" id="clientProfileClose" aria-label="Cerrar perfil">
            ×
        </button>
    </div>

    <div class="day-panel__body">

        <div class="detail-grid">
            <div class="detail-card">
                <span class="detail-label">Estado</span>
                <span class="detail-value">
                    <span class="status-badge status-badge--activo" id="clientProfileStatus">Activo</span>
                </span>
            </div>
            <div class="detail-card detail-card-full">
                <span class="detail-label">Notas</span>
                <span class="detail-value" id="clientProfileNotes">Sin notas.</span>
            </div>
        </div>

        <div class="profile-drawer__section">
            <h4 class="history-title">Alergias</h4>
            <div class="detail-grid">
                <div class="detail-card detail-card-full">
                    <span class="detail-value" id="clientProfileAllergies">Sin alergias registradas.</span>
                </div>
            </div>
        </div>

        <div class="profile-drawer__section">
            <h4 class="history-title">Historial técnico</h4>

            <div class="history-controls">
                <div class="search-field">
                    <input
                        type="text"
                        id="historySearch"
                        class="panel-search"
                        aria-label="Buscar en el historial técnico"
                        placeholder="Buscar en el historial"
                        autocomplete="off">
                </div>
                <div class="panel-filters" id="historyFilters" role="group" aria-label="Filtrar historial por tipo">
                    <button type="button" class="btn-filter is-active" data-history-filter="todos" aria-pressed="true">Todos</button>
                    <button type="button" class="btn-filter" data-history-filter="color" aria-pressed="false">Color</button>
                    <button type="button" class="btn-filter" data-history-filter="tratamiento" aria-pressed="false">Tratamientos</button>
                    <button type="button" class="btn-filter" data-history-filter="corte" aria-pressed="false">Cortes</button>
                </div>
            </div>

            <div class="timeline-container" id="clientProfileHistory">
                <p class="history-empty">Sin historial.</p>
            </div>
        </div>

        <div class="profile-drawer__section">
            <h4 class="history-title">Turnos con ficha</h4>
            <div class="history-items" id="clientProfileAppointments">
                <p class="history-empty">Sin turnos.</p>
            </div>
        </div>

    </div>

    <div class="appointment-detail-footer">
        <button type="button" class="btn btn--ghost btn--sm" id="clientProfileEdit">
            Editar perfil
        </button>
        <button type="button" class="btn btn--primary btn--sm" id="clientProfileSchedule">
            Nuevo turno
        </button>
    </div>
</aside>

<!-- Ventanita de la fila (celular): datos y acciones -->
<dialog class="status-dialog" id="clientRowDialog" aria-labelledby="clientRowDialogName">
    <div class="status-dialog__body">
        <div class="status-dialog__header">
            <h3 class="status-dialog__name" id="clientRowDialogName"></h3>
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
