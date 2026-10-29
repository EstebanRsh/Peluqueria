<!-- =====================================================
     PANEL LATERAL — NUEVO TURNO
     Formulario de alta, edición y finalización de un turno.
====================================================== -->

<div class="side-drawer-overlay side-drawer-overlay--nested" id="modalOverlay"></div>

<aside class="side-drawer side-drawer--nested" id="appointmentFormPanel"
    role="dialog" aria-modal="true" aria-labelledby="appointmentFormTitle" aria-hidden="true" tabindex="-1">

    <div class="surface__header">
        <h3 class="surface__title" id="appointmentFormTitle">Nuevo turno</h3>

        <button
            type="button"
            class="surface__close"
            id="modalClose"
            aria-label="Cerrar"></button>
    </div>

    <form class="drawer-form" id="appointmentForm" novalidate autocomplete="off">

        <div class="surface__body">

            <!-- Cliente -->
            <div class="form-row">
                <div class="form-group form-group--full is-required">
                    <label for="clientSearch">Cliente</label>

                    <button type="button" class="selected-field" id="clientSelected" hidden>
                        <span class="sr-only">Cambiar cliente: </span>
                        <span class="selected-field__main">
                            <span class="selected-field__title" id="clientChipTitle"></span>
                            <span class="selected-field__meta" id="clientChipMeta"></span>
                        </span>
                        <svg class="selected-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                    </button>

                    <div class="search-field">
                        <input
                            type="text"
                            id="clientSearch"
                            aria-required="true"
                            placeholder="Buscar por nombre o código, o escribir un alias">

                        <ul class="autocomplete-list" id="appointmentClientSuggestions"></ul>
                    </div>

                    <input type="hidden" id="clientId">
                    <input type="hidden" id="clientName">
                </div>
            </div>

            <!-- Servicios -->
            <div class="form-row">
                <div class="form-group form-group--full is-required">
                    <label for="serviceSearch">Servicios</label>

                    <div class="search-field">
                        <input
                            type="text"
                            id="serviceSearch"
                            aria-required="true"
                            placeholder="Buscar servicio por nombre">

                        <ul class="autocomplete-list" id="serviceSuggestions"></ul>
                    </div>

                    <ul class="service-list" id="serviceList"></ul>
                </div>
            </div>

            <!-- Fecha -->
            <div class="form-row">
                <div class="form-group form-group--full is-required">
                    <label for="appointmentDate">Fecha</label>
                    <input type="date" id="appointmentDate" aria-required="true">
                </div>
            </div>

            <!-- Horario -->
            <div class="form-row">
                <div class="form-group is-required">
                    <label for="timeStart">Hora de inicio</label>
                    <input type="time" id="timeStart" aria-required="true">
                </div>

                <div class="form-group is-required">
                    <label for="timeEnd">Hora de fin</label>
                    <input type="time" id="timeEnd" aria-required="true">
                </div>
            </div>

            <p class="form-hint" id="scheduleHint" hidden></p>

            <!-- Lugar libre -->
            <div id="freeSlots" hidden>
                <p class="form-hint" id="freeSlotsText"></p>
                <div class="preset-chips" id="freeSlotsList" role="group" aria-labelledby="freeSlotsText"></div>
            </div>
            <template id="freeSlotTemplate">
                <button type="button" class="btn-filter preset-chip" aria-pressed="false"></button>
            </template>

            <!-- Precio -->
            <div class="form-row">
                <div class="form-group form-group--full">
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

            <!-- Estado -->
            <div class="form-row">
                <div class="form-group form-group--full">
                    <label for="appointmentStatus" id="appointmentStatusLabel">Estado inicial</label>

                    <select id="appointmentStatus" class="form-select">
                        <option value="Reservado" selected>Reservado</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Cancelado">Cancelado</option>
                        <option value="Ausente">Ausente</option>
                    </select>
                </div>
            </div>

            <!-- Campos opcionales -->
            <details class="form-optional">
                <summary class="form-optional__summary">Más datos (opcional)</summary>
                <div class="form-optional__fields">
                    <div class="form-row">
                        <div class="form-group form-group--full">
                            <label for="stylist">Profesional</label>
                            <input
                                type="text"
                                id="stylist"
                                list="stylistOptions"
                                placeholder="Nombre">
                            <datalist id="stylistOptions"></datalist>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group form-group--full">
                            <label for="notes">Notas</label>

                            <textarea
                                id="notes"
                                rows="3"
                                placeholder="Observaciones del turno"></textarea>
                        </div>
                    </div>
                </div>
            </details>

            <p class="form-hint">Los campos con * son obligatorios.</p>

        </div>

        <!-- =====================================================
             BOTONES
        ====================================================== -->

        <div class="surface__footer">
            <button type="button" class="btn btn--ghost" id="modalCancel">
                Cancelar
            </button>

            <button type="submit" class="btn btn--primary" id="modalSave">
                Guardar turno
            </button>
        </div>

    </form>

</aside>