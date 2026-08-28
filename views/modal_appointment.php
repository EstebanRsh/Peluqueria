<div class="modal-overlay" id="modalOverlay">
    <div class="modal">
        <div class="modal__header">
            <h3 class="modal__title">Nuevo turno — <span id="modalDate"></span></h3>
            <button class="modal__close" id="modalClose" aria-label="Cerrar">&#10005;</button>
        </div>
        <div class="modal__body">
            <div class="form-row">
                <div class="form-group">
                    <label for="patientName">Paciente</label>
                    <input type="text" id="patientName" placeholder="Nombre completo">
                </div>
                <div class="form-group">
                    <label for="phone">Teléfono</label>
                    <input type="text" id="phone" placeholder="+54 9 ...">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="timeStart">Hora inicio</label>
                    <input type="time" id="timeStart">
                </div>
                <div class="form-group">
                    <label for="timeEnd">Hora fin</label>
                    <input type="time" id="timeEnd">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="socialWork">Obra social</label>
                    <input type="text" id="socialWork" placeholder="OSDE, Swiss Medical...">
                </div>
                <div class="form-group">
                    <label for="payment">Abono ($)</label>
                    <input type="number" id="payment" placeholder="0.00" min="0" step="0.01">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group form-group--full">
                    <label for="doctor">Profesional</label>
                    <input type="text" id="doctor" placeholder="Dr. ...">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group form-group--full">
                    <label for="appointmentStatus">Estado Inicial del Turno</label>
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
            <div class="form-row">
                <div class="form-group form-group--full">
                    <label for="notes">Notas</label>
                    <textarea id="notes" rows="3" placeholder="Observaciones..."></textarea>
                </div>
            </div>
        </div>
        <div class="modal__footer">
            <button class="btn btn--ghost" id="modalCancel">Cancelar</button>
            <button class="btn btn--primary" id="modalSave">Guardar turno</button>
        </div>
    </div>
</div>