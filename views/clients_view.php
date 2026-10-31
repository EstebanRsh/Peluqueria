<!-- =====================================================
     VISTA DE CLIENTES
     Listado de clientes, perfil y ventanita de fila.
====================================================== -->

<div class="admin-view">

    <!-- =====================================================
         ENCABEZADO
    ====================================================== -->

    <div class="surface__header">
        <h2 class="surface__title" tabindex="-1">Panel de clientes</h2>

        <div class="surface__actions">
            <button
                type="button"
                class="btn btn--primary btn--sm add-action"
                id="btnAddClient">
                <svg <?= $iconAttrs ?>><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <span class="add-action__label">Nuevo cliente</span>
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

        <template id="clientRowTemplate">
            <tr class="client-row">
                <td data-label="Alias" class="cell-primary"><button type="button" class="table-link" data-action="profile" data-field="alias"></button></td>
                <td data-label="Código" class="cell-primary" data-field="code"></td>
                <td data-label="Estado"><span data-field="status"></span></td>
                <td data-label="Notas" data-field="notes"></td>
                <td data-label="Acciones" data-field="actions"></td>
            </tr>
        </template>

    </div>

</div>

<!-- =====================================================
     PANEL LATERAL — PERFIL DE CLIENTE
====================================================== -->

<div class="side-drawer-overlay" id="clientProfileOverlay"></div>

<aside class="side-drawer" id="clientProfilePanel"
    role="dialog" aria-modal="true" aria-labelledby="clientProfileName" aria-hidden="true" tabindex="-1">
    <div class="surface__header">
        <div class="profile-drawer__identity">
            <span class="profile-drawer__avatar" id="clientProfileAvatar" aria-hidden="true">CR</span>
            <div class="profile-drawer__identity-text">
                <h3 class="surface__title" id="clientProfileName">Cliente</h3>
                <span class="profile-drawer__code" id="clientProfileCode">CLI-0000</span>
            </div>
        </div>
        <button type="button" class="surface__close" id="clientProfileClose" aria-label="Cerrar perfil"></button>
    </div>

    <div class="surface__body">

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
            <p class="panel-empty__action">
                <button type="button" class="btn btn--ghost btn--sm" id="clientProfileHistoryMore" hidden>Cargar más</button>
            </p>

            <template id="timelineNodeTemplate">
                <article class="timeline-node">
                    <header class="timeline-header">
                        <time class="timeline-date"></time>
                        <strong class="timeline-service"></strong>
                        <div class="timeline-actions">
                            <button type="button" class="btn btn--ghost btn--sm" data-timeline-action="edit" title="Editar ficha">
                                <span class="btn__icon" aria-hidden="true"><svg <?= $iconAttrs ?>><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></span>
                            </button>
                            <button type="button" class="btn btn--danger btn--sm" data-timeline-action="delete" title="Eliminar ficha">
                                <span class="btn__icon" aria-hidden="true"><svg <?= $iconAttrs ?>><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg></span>
                            </button>
                        </div>
                    </header>
                    <div class="timeline-details"></div>
                </article>
            </template>
            <template id="timelineGroupTemplate">
                <section class="timeline-category">
                    <h4></h4>
                    <dl></dl>
                </section>
            </template>
            <template id="timelineFieldTemplate">
                <div class="timeline-field"><dt></dt><dd></dd></div>
            </template>
            <template id="historyEmptyTemplate">
                <p class="history-empty"></p>
            </template>
            <template id="historyPlaceholderTemplate">
                <p class="history-placeholder" role="status"></p>
            </template>
            <template id="profileErrorTemplate">
                <p class="history-error" role="alert"></p>
                <button type="button" class="btn btn--ghost btn--sm" data-action="retry-profile">Reintentar</button>
            </template>
            <template id="profileAppointmentTemplate">
                <article class="profile-appointment">
                    <div class="profile-appointment__header">
                        <strong data-field="service"></strong>
                        <span class="status-badge" data-field="status"></span>
                    </div>
                    <div class="profile-appointment__meta">
                        <time data-field="when"></time>
                        <span data-field="stylist"></span>
                    </div>
                </article>
            </template>
        </div>

        <div class="profile-drawer__section">
            <h4 class="history-title">Turnos</h4>
            <div class="history-items" id="clientProfileAppointments">
                <p class="history-empty">Sin turnos.</p>
            </div>
            <p class="panel-empty__action">
                <button type="button" class="btn btn--ghost btn--sm" id="clientProfileAppointmentsMore" hidden>Cargar más</button>
            </p>
        </div>

    </div>

    <div class="surface__footer">
        <button type="button" class="btn btn--ghost btn--sm" id="clientProfileEdit">
            Editar perfil
        </button>
        <button type="button" class="btn btn--primary btn--sm" id="clientProfileSchedule">
            Nuevo turno
        </button>
    </div>
</aside>

<!-- Ventanita de la fila -->
<dialog class="surface-dialog" id="clientRowDialog" aria-labelledby="clientRowDialogName">
    <div class="surface__header">
        <h3 class="surface__title" id="clientRowDialogName"></h3>
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
