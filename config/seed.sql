USE peluqueria;

-- Desactivar claves foráneas temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- Borrar los datos usando DELETE (que sí lo permite)
DELETE FROM appointment_history;
DELETE FROM appointments;
DELETE FROM clients;
DELETE FROM services;

-- Resetear los IDs para que vuelvan a empezar desde 1
ALTER TABLE appointment_history AUTO_INCREMENT = 1;
ALTER TABLE appointments AUTO_INCREMENT = 1;
ALTER TABLE clients AUTO_INCREMENT = 1;
ALTER TABLE services AUTO_INCREMENT = 1;

-- Volver a activar las claves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- 1. SERVICIOS (15)
-- =========================================================
INSERT INTO services (id, name, description, duration, price, active) VALUES
(1, 'Corte Masculino Clásico', 'Corte con tijera o máquina, incluye lavado.', 30, 15.00, TRUE),
(2, 'Corte Femenino', 'Corte de puntas, desmechado o cambio de look.', 45, 25.00, TRUE),
(3, 'Tinte Completo', 'Aplicación de color global, marcas premium.', 90, 50.00, TRUE),
(4, 'Balayage / Mechas', 'Técnicas de decoloración y matización.', 120, 85.00, TRUE),
(5, 'Arreglo de Barba', 'Perfilado, recorte y toalla caliente.', 20, 10.00, TRUE),
(6, 'Tratamiento de Keratina', 'Alisado temporal y reducción de frizz.', 90, 45.00, TRUE),
(7, 'Peinado de Fiesta', 'Recogidos, trenzas o brushing elaborado.', 60, 35.00, TRUE),
(8, 'Manicura Tradicional', 'Limpieza, esmaltado normal y crema hidratante.', 40, 12.00, TRUE),
(9, 'Manicura Semipermanente', 'Esmaltado en gel de larga duración (21 días).', 60, 20.00, TRUE),
(10, 'Pedicura Completa', 'Limpieza profunda, exfoliación y esmaltado.', 60, 25.00, TRUE),
(11, 'Alisado Definitivo', 'Alisado permanente con productos sin formol.', 150, 100.00, TRUE),
(12, 'Lavado y Secado', 'Lavado con masaje capilar y secado rápido.', 20, 10.00, TRUE),
(13, 'Baño de Crema / Nutrición', 'Mascarilla hidratante intensiva en lavacabezas.', 30, 18.00, TRUE),
(14, 'Perfilado de Cejas', 'Diseño y depilación con pinza o hilo.', 15, 8.00, TRUE),
(15, 'Decoloración Global', 'Llevar el cabello a tonos platinos.', 120, 70.00, TRUE);

-- =========================================================
-- 3. CLIENTES CON FICHA (25 clientes frecuentes)
-- El resto de los turnos corresponde a clientes ocasionales
-- (client_id NULL), que solo quedan registrados por client_name.
-- =========================================================
INSERT INTO clients (id, internal_code, alias, notes, active) VALUES
(1, 'CLI-0001', 'Roberto G.', 'Cliente habitual, corte clásico cada 3 semanas.', TRUE),
(2, 'CLI-0002', 'Carla T.', 'Prefiere cortar solo puntas; evitar keratina por alergia.', TRUE),
(3, 'CLI-0003', 'Mariana P.', 'Le gusta el esmaltado semipermanente en tonos rojos.', TRUE),
(4, 'CLI-0004', 'Lucía F.', 'Balayage, siempre trae foto de referencia.', TRUE),
(5, 'CLI-0005', 'Camila R.', 'Cabello muy largo, requiere turno extendido.', TRUE),
(6, 'CLI-0006', 'Diego A.', 'Corte rápido, viene en su hora de almuerzo.', TRUE),
(7, 'CLI-0007', 'Marta B.', 'Retoque de raíces mensual, sensible al amoníaco.', TRUE),
(8, 'CLI-0008', 'Fernando C.', 'Cliente puntual, siempre pide el mismo estilista.', TRUE),
(9, 'CLI-0009', 'Romina K.', 'Tratamiento de keratina cada 4 meses.', TRUE),
(10, 'CLI-0010', 'Gustavo M.', 'Prefiere máquina, corte bajo.', TRUE),
(11, 'CLI-0011', 'Florencia D.', 'Primera decoloración, seguimiento de cuidado post-color.', TRUE),
(12, 'CLI-0012', 'Silvia Q.', 'Le gusta charlar, conviene agendar con tiempo extra.', TRUE),
(13, 'CLI-0013', 'Laura W.', 'Eligió color rosa pastel en su última manicura.', TRUE),
(14, 'CLI-0014', 'Rocío E.', 'Diseño de cejas cada 3 semanas.', TRUE),
(15, 'CLI-0015', 'Diana C.', 'Cliente VIP, prefiere turnos por la tarde.', TRUE),
(16, 'CLI-0016', 'Oscar V.', 'Pasa rápido antes de entrar a trabajar.', TRUE),
(17, 'CLI-0017', 'Micaela R.', 'Peinados para eventos y casamientos.', TRUE),
(18, 'CLI-0018', 'Ana F.', 'Servicio largo, coordinar con tiempo.', TRUE),
(19, 'CLI-0019', 'Tomás P.', 'Cliente nuevo, llegó recomendado.', TRUE),
(20, 'CLI-0020', 'Victoria M.', 'Cliente nueva, primer corte femenino.', TRUE),
(21, 'CLI-0021', 'Julieta D.', 'Renueva su semipermanente cada 3 semanas.', TRUE),
(22, 'CLI-0022', 'Emiliano G.', 'Barba prolija, viene cada 2 semanas.', TRUE),
(23, 'CLI-0023', 'Federico A.', 'A veces trae a su hijo también.', TRUE),
(24, 'CLI-0024', 'Cristian L.', 'Cliente de la zona, viene caminando.', TRUE),
(25, 'CLI-0025', 'Gabriel O.', 'Prefiere toalla caliente antes del recorte de barba.', TRUE);

-- =========================================================
-- 4. TURNOS (45)
-- Distribuidos en el pasado (agosto), hoy (4 de sept) y futuro.
-- Los turnos de clientes con ficha llevan su client_id; el resto
-- queda en NULL (cliente ocasional, solo con client_name).
-- =========================================================
INSERT INTO appointments (id, client_id, client_name, service_id, stylist, price, notes, status, date, time_start, time_end) VALUES
-- Turnos Pasados (Agosto 2026)
(1, 1, 'Roberto G.', 1, 'Lucas', 15.00, '', 'Finalizado', '2026-08-15', '10:00:00', '10:30:00'),
(2, 2, 'Carla T.', 2, 'Ana', 25.00, 'Cortar solo 2 dedos.', 'Finalizado', '2026-08-15', '11:00:00', '11:45:00'),
(3, 3, 'Mariana P.', 9, 'Sofia', 20.00, 'Color rojo.', 'Finalizado', '2026-08-16', '14:00:00', '15:00:00'),
(4, NULL, 'Esteban M.', 5, 'Lucas', 10.00, '', 'Ausente', '2026-08-16', '16:00:00', '16:20:00'),
(5, 4, 'Lucía F.', 4, 'Martín', 85.00, 'Trae foto de referencia.', 'Finalizado', '2026-08-17', '09:00:00', '11:00:00'),
(6, NULL, 'Javier S.', 1, 'Lucas', 15.00, '', 'Cancelado', '2026-08-18', '18:00:00', '18:30:00'),
(7, 5, 'Camila R.', 11, 'Ana', 100.00, 'Pelo muy largo y abundante.', 'Finalizado', '2026-08-20', '15:00:00', '17:30:00'),
(8, 6, 'Diego A.', 1, 'Martín', 15.00, '', 'Finalizado', '2026-08-22', '10:00:00', '10:30:00'),
(9, NULL, 'Valentina L.', 13, 'Sofia', 18.00, '', 'Finalizado', '2026-08-25', '11:00:00', '11:30:00'),
(10, NULL, 'Jorge V.', 12, 'Lucas', 10.00, '', 'Finalizado', '2026-08-28', '09:30:00', '09:50:00'),

-- Turnos Recientes (1 al 3 de Septiembre 2026)
(11, 7, 'Marta B.', 3, 'Ana', 50.00, 'Retoque de raíces.', 'Finalizado', '2026-09-01', '10:00:00', '11:30:00'),
(12, 8, 'Fernando C.', 1, 'Lucas', 15.00, '', 'Finalizado', '2026-09-01', '10:30:00', '11:00:00'),
(13, NULL, 'Paula N.', 8, 'Sofia', 12.00, '', 'Ausente', '2026-09-01', '14:00:00', '14:40:00'),
(14, NULL, 'Hugo P.', 5, 'Martín', 10.00, '', 'Finalizado', '2026-09-02', '15:00:00', '15:20:00'),
(15, 9, 'Romina K.', 6, 'Ana', 45.00, 'Pelo por los hombros.', 'Finalizado', '2026-09-02', '16:00:00', '17:30:00'),
(16, NULL, 'Andrea G.', 14, 'Sofia', 8.00, '', 'Cancelado', '2026-09-03', '09:00:00', '09:15:00'),
(17, 10, 'Gustavo M.', 1, 'Lucas', 15.00, '', 'Finalizado', '2026-09-03', '10:00:00', '10:30:00'),
(18, 11, 'Florencia D.', 15, 'Martín', 70.00, 'Primera decoloración.', 'Finalizado', '2026-09-03', '14:00:00', '16:00:00'),

-- Turnos del Día Actual (4 de Septiembre 2026)
(19, NULL, 'Carlos I.', 1, 'Lucas', 15.00, 'Primer turno del día', 'Finalizado', '2026-09-04', '09:00:00', '09:30:00'),
(20, 12, 'Silvia Q.', 2, 'Ana', 25.00, '', 'Finalizado', '2026-09-04', '09:30:00', '10:15:00'),
(21, NULL, 'Pedro O.', 5, 'Martín', 10.00, '', 'En atención', '2026-09-04', '10:20:00', '10:40:00'),
(22, 13, 'Laura W.', 9, 'Sofia', 20.00, 'Eligió color rosa paste.', 'En atención', '2026-09-04', '10:00:00', '11:00:00'),
(23, NULL, 'Ignacio Z.', 1, 'Lucas', 15.00, 'Esperando tomando café.', 'En sala de espera', '2026-09-04', '10:45:00', '11:15:00'),
(24, 14, 'Rocío E.', 14, 'Sofia', 8.00, '', 'Reservado', '2026-09-04', '11:30:00', '11:45:00'),
(25, NULL, 'Marcelo Y.', 1, 'Martín', 15.00, '', 'Reservado', '2026-09-04', '15:00:00', '15:30:00'),
(26, 15, 'Diana C.', 3, 'Ana', 50.00, '', 'Reservado', '2026-09-04', '16:00:00', '17:30:00'),
(27, 16, 'Oscar V.', 12, 'Lucas', 10.00, '', 'Reservado', '2026-09-04', '17:30:00', '17:50:00'),

-- Turnos Futuros (Septiembre / Octubre 2026)
(28, 17, 'Micaela R.', 7, 'Ana', 35.00, 'Peinado para casamiento.', 'Reservado', '2026-09-05', '14:00:00', '15:00:00'),
(29, NULL, 'Bruno L.', 1, 'Lucas', 15.00, '', 'Reservado', '2026-09-06', '10:00:00', '10:30:00'),
(30, 18, 'Ana F.', 4, 'Martín', 85.00, '', 'Reservado', '2026-09-07', '09:00:00', '11:00:00'),
(31, NULL, 'Claudio H.', 5, 'Lucas', 10.00, '', 'Reservado', '2026-09-08', '18:00:00', '18:20:00'),
(32, NULL, 'Daniela J.', 10, 'Sofia', 25.00, '', 'Reservado', '2026-09-10', '15:00:00', '16:00:00'),
(33, 19, 'Tomás P.', 1, 'Martín', 15.00, '', 'Reservado', '2026-09-12', '10:00:00', '10:30:00'),
(34, 20, 'Victoria M.', 2, 'Ana', 25.00, '', 'Reservado', '2026-09-15', '11:00:00', '11:45:00'),
(35, NULL, 'Joaquín S.', 12, 'Lucas', 10.00, '', 'Reservado', '2026-09-18', '17:00:00', '17:20:00'),
(36, 21, 'Julieta D.', 9, 'Sofia', 20.00, '', 'Reservado', '2026-09-20', '14:00:00', '15:00:00'),
(37, NULL, 'Sebastián K.', 1, 'Martín', 15.00, '', 'Reservado', '2026-09-22', '09:30:00', '10:00:00'),
(38, NULL, 'Agustina T.', 3, 'Ana', 50.00, '', 'Reservado', '2026-09-25', '15:30:00', '17:00:00'),
(39, 22, 'Emiliano G.', 5, 'Lucas', 10.00, '', 'Reservado', '2026-09-28', '18:00:00', '18:20:00'),
(40, NULL, 'Lorena P.', 11, 'Ana', 100.00, '', 'Reservado', '2026-10-02', '14:00:00', '16:30:00'),
(41, 23, 'Federico A.', 1, 'Martín', 15.00, '', 'Reservado', '2026-10-05', '10:00:00', '10:30:00'),
(42, NULL, 'Tatiana R.', 8, 'Sofia', 12.00, '', 'Reservado', '2026-10-10', '11:00:00', '11:40:00'),
(43, 24, 'Cristian L.', 1, 'Lucas', 15.00, '', 'Reservado', '2026-10-15', '16:30:00', '17:00:00'),
(44, NULL, 'Mónica F.', 15, 'Ana', 70.00, '', 'Reservado', '2026-10-20', '09:00:00', '11:00:00'),
(45, 25, 'Gabriel O.', 5, 'Martín', 10.00, '', 'Reservado', '2026-10-25', '18:00:00', '18:20:00');

-- =========================================================
-- 5. HISTORIAL DE ESTADOS DE LOS TURNOS MÁS COMPLETO
-- Se simulan las transiciones (Reservado -> Espera -> Atención -> Finalizado)
-- =========================================================
INSERT INTO appointment_history (appointment_id, status_from, status_to, changed_at) VALUES
-- Turno 1 (Finalizado)
(1, NULL, 'Reservado', '2026-08-10 10:00:00'),
(1, 'Reservado', 'En sala de espera', '2026-08-15 09:50:00'),
(1, 'En sala de espera', 'En atención', '2026-08-15 10:05:00'),
(1, 'En atención', 'Finalizado', '2026-08-15 10:35:00'),

-- Turno 2 (Finalizado)
(2, NULL, 'Reservado', '2026-08-12 11:30:00'),
(2, 'Reservado', 'En sala de espera', '2026-08-15 10:55:00'),
(2, 'En sala de espera', 'En atención', '2026-08-15 11:02:00'),
(2, 'En atención', 'Finalizado', '2026-08-15 11:50:00'),

-- Turno 3 (Finalizado)
(3, NULL, 'Reservado', '2026-08-13 14:00:00'),
(3, 'Reservado', 'En atención', '2026-08-16 14:00:00'),
(3, 'En atención', 'Finalizado', '2026-08-16 15:05:00'),

-- Turno 4 (Ausente)
(4, NULL, 'Reservado', '2026-08-14 09:00:00'),
(4, 'Reservado', 'Ausente', '2026-08-16 16:30:00'),

-- Turno 5 (Finalizado)
(5, NULL, 'Reservado', '2026-08-15 18:00:00'),
(5, 'Reservado', 'En sala de espera', '2026-08-17 08:50:00'),
(5, 'En sala de espera', 'En atención', '2026-08-17 09:00:00'),
(5, 'En atención', 'Finalizado', '2026-08-17 11:00:00'),

-- Turno 6 (Cancelado)
(6, NULL, 'Reservado', '2026-08-15 15:00:00'),
(6, 'Reservado', 'Cancelado', '2026-08-18 10:00:00'),

-- Turno 7 al 10 (Solo simulo Reservado y Finalizado directo para ahorrar espacio, común en sistemas rápidos)
(7, NULL, 'Reservado', '2026-08-18 10:00:00'),
(7, 'Reservado', 'Finalizado', '2026-08-20 17:30:00'),
(8, NULL, 'Reservado', '2026-08-20 11:00:00'),
(8, 'Reservado', 'Finalizado', '2026-08-22 10:30:00'),
(9, NULL, 'Reservado', '2026-08-22 12:00:00'),
(9, 'Reservado', 'Finalizado', '2026-08-25 11:30:00'),
(10, NULL, 'Reservado', '2026-08-25 15:00:00'),
(10, 'Reservado', 'Finalizado', '2026-08-28 09:50:00'),

-- Turnos recientes (Septiembre)
(11, NULL, 'Reservado', '2026-08-30 09:00:00'),
(11, 'Reservado', 'En sala de espera', '2026-09-01 09:55:00'),
(11, 'En sala de espera', 'En atención', '2026-09-01 10:00:00'),
(11, 'En atención', 'Finalizado', '2026-09-01 11:30:00'),

(12, NULL, 'Reservado', '2026-08-31 16:00:00'),
(12, 'Reservado', 'En atención', '2026-09-01 10:35:00'),
(12, 'En atención', 'Finalizado', '2026-09-01 11:05:00'),

(13, NULL, 'Reservado', '2026-09-01 08:00:00'),
(13, 'Reservado', 'Ausente', '2026-09-01 14:45:00'),

(14, NULL, 'Reservado', '2026-09-01 12:00:00'),
(14, 'Reservado', 'Finalizado', '2026-09-02 15:20:00'),

(15, NULL, 'Reservado', '2026-09-01 13:00:00'),
(15, 'Reservado', 'Finalizado', '2026-09-02 17:30:00'),

(16, NULL, 'Reservado', '2026-09-02 10:00:00'),
(16, 'Reservado', 'Cancelado', '2026-09-02 18:00:00'),

(17, NULL, 'Reservado', '2026-09-02 11:00:00'),
(17, 'Reservado', 'Finalizado', '2026-09-03 10:30:00'),

(18, NULL, 'Reservado', '2026-09-02 12:00:00'),
(18, 'Reservado', 'Finalizado', '2026-09-03 16:00:00'),

-- Turnos de HOY (4 de Septiembre)
(19, NULL, 'Reservado', '2026-09-03 15:00:00'),
(19, 'Reservado', 'En sala de espera', '2026-09-04 08:50:00'),
(19, 'En sala de espera', 'En atención', '2026-09-04 09:02:00'),
(19, 'En atención', 'Finalizado', '2026-09-04 09:35:00'),

(20, NULL, 'Reservado', '2026-09-03 16:00:00'),
(20, 'Reservado', 'En atención', '2026-09-04 09:30:00'),
(20, 'En atención', 'Finalizado', '2026-09-04 10:15:00'),

(21, NULL, 'Reservado', '2026-09-03 17:00:00'),
(21, 'Reservado', 'En sala de espera', '2026-09-04 10:10:00'),
(21, 'En sala de espera', 'En atención', '2026-09-04 10:20:00'),

(22, NULL, 'Reservado', '2026-09-03 18:00:00'),
(22, 'Reservado', 'En atención', '2026-09-04 10:00:00'),

(23, NULL, 'Reservado', '2026-09-03 19:00:00'),
(23, 'Reservado', 'En sala de espera', '2026-09-04 10:30:00'),

-- Creación inicial ("Reservado") para el resto de los turnos de hoy y futuros
(24, NULL, 'Reservado', '2026-09-04 08:00:00'),
(25, NULL, 'Reservado', '2026-09-04 08:15:00'),
(26, NULL, 'Reservado', '2026-09-04 08:30:00'),
(27, NULL, 'Reservado', '2026-09-04 09:00:00'),
(28, NULL, 'Reservado', '2026-09-02 14:00:00'),
(29, NULL, 'Reservado', '2026-09-02 15:00:00'),
(30, NULL, 'Reservado', '2026-09-02 16:00:00'),
(31, NULL, 'Reservado', '2026-09-02 17:00:00'),
(32, NULL, 'Reservado', '2026-09-03 10:00:00'),
(33, NULL, 'Reservado', '2026-09-03 11:00:00'),
(34, NULL, 'Reservado', '2026-09-03 12:00:00'),
(35, NULL, 'Reservado', '2026-09-03 13:00:00'),
(36, NULL, 'Reservado', '2026-09-04 09:00:00'),
(37, NULL, 'Reservado', '2026-09-04 09:15:00'),
(38, NULL, 'Reservado', '2026-09-04 09:30:00'),
(39, NULL, 'Reservado', '2026-09-04 09:45:00'),
(40, NULL, 'Reservado', '2026-09-04 10:00:00'),
(41, NULL, 'Reservado', '2026-09-04 10:05:00'),
(42, NULL, 'Reservado', '2026-09-04 10:10:00'),
(43, NULL, 'Reservado', '2026-09-04 10:15:00'),
(44, NULL, 'Reservado', '2026-09-04 10:20:00'),
(45, NULL, 'Reservado', '2026-09-04 10:25:00');