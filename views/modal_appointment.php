<div class="modal-overlay" id="modalOverlay">
    <div class="modal">

        <!-- =====================================================
             ENCABEZADO DEL MODAL
        ====================================================== -->

        <div class="modal__header">
            <h3 class="modal__title">
                Nuevo turno — <span id="modalDate"></span>
            </h3>

            <button
                class="modal__close"
                id="modalClose"
                aria-label="Cerrar">
                &#10005;
            </button>
        </div>


        <!-- =====================================================
             FORMULARIO
        ====================================================== -->

        <div class="modal__body">

            <!-- Cliente y teléfono -->
            <div class="form-row">
                <div class="form-group">
                    <label for="clientId">Cliente</label>
                    <select id="clientId" class="form-select">
                        <option value="">Sin cliente asociado</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="clientName">Alias o referencia</label>
                    <input
                        type="text"
                        id="clientName"
                        placeholder="Alias o referencia">
                </div>
            </div>


            <!-- Horario -->
            <div class="form-row">

                <div class="form-group">
                    <label for="timeStart">Hora inicio</label>

                    <input
                        type="time"
                        id="timeStart">
                </div>


                <div class="form-group">
                    <label for="timeEnd">Hora fin</label>

                    <input
                        type="time"
                        id="timeEnd">
                </div>

            </div>


            <!-- Servicio y precio -->
            <div class="form-row">

                <div class="form-group">
                    <label for="serviceId">Servicio</label>

                    <select
                        id="serviceId"
                        class="form-select">
                        <option value="">
                            Seleccionar servicio
                        </option>
                    </select>
                </div>


                <div class="form-group">
                    <label for="price">Precio ($)</label>

                    <input
                        type="number"
                        id="price"
                        placeholder="0.00"
                        min="0"
                        step="0.01">
                </div>

            </div>


            <!-- Peluquero/a -->
            <div class="form-row">

                <div class="form-group form-group--full">
                    <label for="stylist">Peluquero/a</label>

                    <input
                        type="text"
                        id="stylist"
                        placeholder="Nombre del peluquero/a">
                </div>

            </div>


            <!-- Estado -->
            <div class="form-row">

                <div class="form-group form-group--full">
                    <label for="appointmentStatus">
                        Estado Inicial del Turno
                    </label>

                    <select
                        id="appointmentStatus"
                        class="form-select">
                        <option value="Reservado" selected>
                            Reservado
                        </option>

                        <option value="En sala de espera">
                            En sala de espera
                        </option>

                        <option value="En atención">
                            En atención
                        </option>

                        <option value="Finalizado">
                            Finalizado
                        </option>

                        <option value="Cancelado">
                            Cancelado
                        </option>

                        <option value="Ausente">
                            Ausente
                        </option>
                    </select>
                </div>

            </div>


            <!-- Notas -->
            <div class="form-row">

                <div class="form-group form-group--full">
                    <label for="notes">Notas</label>

                    <textarea
                        id="notes"
                        rows="3"
                        placeholder="Observaciones del turno..."></textarea>
                </div>

            </div>

        </div>


        <!-- =====================================================
             BOTONES
        ====================================================== -->

        <div class="modal__footer">

            <button
                class="btn btn--ghost"
                id="modalCancel">
                Cancelar
            </button>


            <button
                class="btn btn--primary"
                id="modalSave">
                Guardar turno
            </button>

        </div>

    </div>
</div>