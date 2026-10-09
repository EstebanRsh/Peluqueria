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
                id="btnAddClient"
                style="display:none">
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
                id="clientListSearch"
                placeholder="Buscar por alias o código..."
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

<!-- =====================================================
     PANEL LATERAL — PERFIL DE CLIENTE
====================================================== -->

<div class="side-drawer-overlay" id="clientProfileOverlay"></div>

<aside class="side-drawer side-drawer--wide" id="clientProfilePanel" aria-hidden="true">
    <div class="day-panel__header">
        <div class="profile-drawer__identity">
            <span class="profile-drawer__avatar" id="clientProfileAvatar">CR</span>
            <div class="profile-drawer__identity-text">
                <span class="day-panel__date" id="clientProfileName">Cliente</span>
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
            <span class="history-title">Diagnóstico capilar</span>
            <div class="detail-grid">
                <div class="detail-card">
                    <span class="detail-label">Base natural</span>
                    <span class="detail-value" id="clientProfileBase">—</span>
                </div>
                <div class="detail-card">
                    <span class="detail-label">Tipo de cabello</span>
                    <span class="detail-value" id="clientProfileHair">—</span>
                </div>
                <div class="detail-card">
                    <span class="detail-label">Canas</span>
                    <span class="detail-value" id="clientProfileGrey">—</span>
                </div>
                <div class="detail-card">
                    <span class="detail-label">Alergias</span>
                    <span class="detail-value" id="clientProfileAllergies">—</span>
                </div>
            </div>
        </div>

        <div class="profile-drawer__section">
            <span class="history-title">Historial técnico</span>

            <div class="history-controls">
                <input
                    type="text"
                    id="historySearch"
                    class="panel-search panel-search--sm"
                    placeholder="Buscar en el historial..."
                    autocomplete="off">
                <div class="panel-filters" id="historyFilters">
                    <button type="button" class="btn-filter active" data-history-filter="todos">Todos</button>
                    <button type="button" class="btn-filter" data-history-filter="color">Color</button>
                    <button type="button" class="btn-filter" data-history-filter="tratamiento">Tratamientos</button>
                    <button type="button" class="btn-filter" data-history-filter="corte">Cortes</button>
                </div>
            </div>

            <div class="timeline-container" id="clientProfileHistory">
                <p class="history-empty">Sin historial.</p>
            </div>
        </div>

        <div class="profile-drawer__section">
            <span class="history-title">Turnos</span>
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