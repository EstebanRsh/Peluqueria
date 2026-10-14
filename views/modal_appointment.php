<!-- =====================================================
     PANEL LATERAL — NUEVO TURNO
     Se abre por encima del panel del día (capa anidada).
     Orden del formulario: cliente, servicio, fecha y precio,
     horario, profesional y estado, notas.
====================================================== -->

<div class="side-drawer-overlay side-drawer-overlay--nested" id="modalOverlay"></div>

<aside class="side-drawer side-drawer--nested" id="appointmentFormPanel"
    role="dialog" aria-modal="true" aria-labelledby="appointmentFormTitle" aria-hidden="true" tabindex="-1">

    <div class="day-panel__header">
        <h3 class="day-panel__date" id="appointmentFormTitle">Nuevo turno</h3>

        <button
            type="button"
            class="day-panel__close"
            id="modalClose"
            aria-label="Cerrar">
            ×
        </button>
    </div>

    <form class="drawer-form" id="appointmentForm" novalidate autocomplete="off">

        <div class="day-panel__body">

            <!-- Cliente: búsqueda o alias en un solo campo -->
            <div class="form-group is-required">
                <label for="clientSearch">Cliente</label>

                <div class="selected-chip" id="clientSelected" role="group" aria-label="Cliente elegido" hidden>
                    <div class="selected-chip__main">
                        <span class="selected-chip__title" id="clientChipTitle"></span>
                        <span class="selected-chip__meta" id="clientChipMeta"></span>
                    </div>
                    <button type="button" class="btn btn--ghost btn--sm" id="clientChange">Cambiar</button>
                </div>

                <input
                    type="text"
                    id="clientSearch"
                    placeholder="Buscar por nombre o código, o escribir un alias"
                    aria-describedby="clientHelp">

                <ul class="autocomplete-list" id="appointmentClientSuggestions"></ul>

                <input type="hidden" id="clientId">
                <input type="hidden" id="clientName">

                <p class="form-hint" id="clientHelp">
                    Si escribís un nombre y no elegís a nadie, se guarda como alias.
                </p>
            </div>

            <!-- Servicio -->
            <div class="form-group is-required">
                <label for="serviceId">Servicio</label>

                <select id="serviceId" class="form-select">
                    <option value="">Seleccionar servicio</option>
                </select>
            </div>

            <!-- Fecha y precio -->
            <div class="form-row">
                <div class="form-group is-required">
                    <label for="appointmentDate">Fecha</label>
                    <input type="date" id="appointmentDate">
                </div>

                <div class="form-group">
                    <label for="price">Precio ($)</label>
                    <input
                        type="number"
                        id="price"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        inputmode="decimal">
                </div>
            </div>

            <!-- Horario -->
            <div class="form-row">
                <div class="form-group is-required">
                    <label for="timeStart">Hora de inicio</label>
                    <input type="time" id="timeStart">
                </div>

                <div class="form-group is-required">
                    <label for="timeEnd">Hora de fin</label>
                    <input type="time" id="timeEnd">
                </div>
            </div>

            <p class="form-hint" id="scheduleHint" hidden></p>
            <div class="alert alert--warning" id="scheduleWarning" role="status" hidden></div>

            <!-- Profesional y estado -->
            <div class="form-row">
                <div class="form-group">
                    <label for="stylist">Peluquero/a</label>
                    <input
                        type="text"
                        id="stylist"
                        list="stylistOptions"
                        placeholder="Nombre">
                    <datalist id="stylistOptions"></datalist>
                </div>

                <div class="form-group">
                    <label for="appointmentStatus">Estado inicial</label>

                    <select id="appointmentStatus" class="form-select">
                        <option value="Reservado" selected>Reservado</option>
                        <option value="En sala de espera">En sala de espera</option>
                        <option value="En atención">En atención</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Cancelado">Cancelado</option>
                        <option value="Ausente">Ausente</option>
                    </select>
                </div>
            </div>

            <!-- Notas -->
            <div class="form-group">
                <label for="notes">Notas</label>

                <textarea
                    id="notes"
                    rows="3"
                    placeholder="Observaciones del turno"></textarea>
            </div>

            <p class="form-hint">Los campos con * son obligatorios.</p>

        </div>

        <!-- =====================================================
             BOTONES
        ====================================================== -->

        <div class="appointment-detail-footer">
            <button type="button" class="btn btn--ghost" id="modalCancel">
                Cancelar
            </button>

            <button type="submit" class="btn btn--primary" id="modalSave">
                Guardar turno
            </button>
        </div>

    </form>

</aside>