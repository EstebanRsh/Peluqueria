USE peluqueria;

-- Desactivar claves foráneas temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- Borrar los datos usando DELETE (que sí lo permite)
DELETE FROM appointment_history;
DELETE FROM appointments;
DELETE FROM services;
DELETE FROM events;

-- Resetear los IDs para que vuelvan a empezar desde 1
ALTER TABLE appointment_history AUTO_INCREMENT = 1;
ALTER TABLE appointments AUTO_INCREMENT = 1;
ALTER TABLE services AUTO_INCREMENT = 1;
ALTER TABLE events AUTO_INCREMENT = 1;

-- Volver a activar las claves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- 1. MÁS SERVICIOS (15 servicios)
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
-- 2. MÁS EVENTOS (12 eventos)
-- =========================================================
INSERT INTO events (id, title, description, event_date) VALUES
(1, 'Mantenimiento de Aire Acondicionado', 'Técnico revisará los equipos de 8 a 10 am.', '2026-08-10'),
(2, 'Día del Peluquero', 'Agasajo interno para el equipo. Cerramos 2 horas antes.', '2026-08-25'),
(3, 'Capacitación L\'Oréal', 'Ana y Martín asisten a masterclass de color.', '2026-09-02'),
(4, 'Mantenimiento de Instalaciones', 'Revisión y pintura de los puestos.', '2026-09-15'),
(5, 'Promoción Primavera - Inicio', '20% off en tratamientos capilares.', '2026-09-21'),
(6, 'Reunión de Equipo', 'Revisión de métricas del mes a puertas cerradas.', '2026-09-30'),
(7, 'Feriado Nacional', 'Local cerrado.', '2026-10-12'),
(8, 'Lanzamiento Nueva Marca', 'Llegan los nuevos productos de Kérastase.', '2026-10-15'),
(9, 'Día de la Madre - Promo', 'Regalos sorpresa a las clientas de este día.', '2026-10-18'),
(10, 'Inventario Mensual', 'Conteo de stock de productos de reventa.', '2026-10-31'),
(11, 'Capacitación Barbería', 'Lucas asiste a seminario de fade.', '2026-11-05'),
(12, 'Feriado Puente', 'Día no laborable.', '2026-11-23');

-- =========================================================
-- 3. MÁS TURNOS (45 turnos)
-- Distribuidos en el pasado (agosto), hoy (4 de sept) y futuro.
-- =========================================================
INSERT INTO appointments (id, client_name, phone, service_id, stylist, price, notes, status, date, time_start, time_end) VALUES
-- Turnos Pasados (Agosto 2026)
(1, 'Roberto G.', '1144445555', 1, 'Lucas', 15.00, '', 'Finalizado', '2026-08-15', '10:00:00', '10:30:00'),
(2, 'Carla T.', '1155556666', 2, 'Ana', 25.00, 'Cortar solo 2 dedos.', 'Finalizado', '2026-08-15', '11:00:00', '11:45:00'),
(3, 'Mariana P.', '1166667777', 9, 'Sofia', 20.00, 'Color rojo.', 'Finalizado', '2026-08-16', '14:00:00', '15:00:00'),
(4, 'Esteban M.', '1177778888', 5, 'Lucas', 10.00, '', 'Ausente', '2026-08-16', '16:00:00', '16:20:00'),
(5, 'Lucía F.', '1188889999', 4, 'Martín', 85.00, 'Trae foto de referencia.', 'Finalizado', '2026-08-17', '09:00:00', '11:00:00'),
(6, 'Javier S.', '1199990000', 1, 'Lucas', 15.00, '', 'Cancelado', '2026-08-18', '18:00:00', '18:30:00'),
(7, 'Camila R.', '1122334455', 11, 'Ana', 100.00, 'Pelo muy largo y abundante.', 'Finalizado', '2026-08-20', '15:00:00', '17:30:00'),
(8, 'Diego A.', '1133445566', 1, 'Martín', 15.00, '', 'Finalizado', '2026-08-22', '10:00:00', '10:30:00'),
(9, 'Valentina L.', '1144556677', 13, 'Sofia', 18.00, '', 'Finalizado', '2026-08-25', '11:00:00', '11:30:00'),
(10, 'Jorge V.', '1155667788', 12, 'Lucas', 10.00, '', 'Finalizado', '2026-08-28', '09:30:00', '09:50:00'),

-- Turnos Recientes (1 al 3 de Septiembre 2026)
(11, 'Marta B.', '1166778899', 3, 'Ana', 50.00, 'Retoque de raíces.', 'Finalizado', '2026-09-01', '10:00:00', '11:30:00'),
(12, 'Fernando C.', '1177889900', 1, 'Lucas', 15.00, '', 'Finalizado', '2026-09-01', '10:30:00', '11:00:00'),
(13, 'Paula N.', '1188990011', 8, 'Sofia', 12.00, '', 'Ausente', '2026-09-01', '14:00:00', '14:40:00'),
(14, 'Hugo P.', '1199001122', 5, 'Martín', 10.00, '', 'Finalizado', '2026-09-02', '15:00:00', '15:20:00'),
(15, 'Romina K.', '1100112233', 6, 'Ana', 45.00, 'Pelo por los hombros.', 'Finalizado', '2026-09-02', '16:00:00', '17:30:00'),
(16, 'Andrea G.', '1111223344', 14, 'Sofia', 8.00, '', 'Cancelado', '2026-09-03', '09:00:00', '09:15:00'),
(17, 'Gustavo M.', '1122334455', 1, 'Lucas', 15.00, '', 'Finalizado', '2026-09-03', '10:00:00', '10:30:00'),
(18, 'Florencia D.', '1133445566', 15, 'Martín', 70.00, 'Primera decoloración.', 'Finalizado', '2026-09-03', '14:00:00', '16:00:00'),

-- Turnos del Día Actual (4 de Septiembre 2026)
(19, 'Carlos I.', '1144556677', 1, 'Lucas', 15.00, 'Primer turno del día', 'Finalizado', '2026-09-04', '09:00:00', '09:30:00'),
(20, 'Silvia Q.', '1155667788', 2, 'Ana', 25.00, '', 'Finalizado', '2026-09-04', '09:30:00', '10:15:00'),
(21, 'Pedro O.', '1166778899', 5, 'Martín', 10.00, '', 'En atención', '2026-09-04', '10:20:00', '10:40:00'),
(22, 'Laura W.', '1177889900', 9, 'Sofia', 20.00, 'Eligió color rosa paste.', 'En atención', '2026-09-04', '10:00:00', '11:00:00'),
(23, 'Ignacio Z.', '1188990011', 1, 'Lucas', 15.00, 'Esperando tomando café.', 'En sala de espera', '2026-09-04', '10:45:00', '11:15:00'),
(24, 'Rocío E.', '1199001122', 14, 'Sofia', 8.00, '', 'Reservado', '2026-09-04', '11:30:00', '11:45:00'),
(25, 'Marcelo Y.', '1100112233', 1, 'Martín', 15.00, '', 'Reservado', '2026-09-04', '15:00:00', '15:30:00'),
(26, 'Diana C.', '1111223344', 3, 'Ana', 50.00, '', 'Reservado', '2026-09-04', '16:00:00', '17:30:00'),
(27, 'Oscar V.', '1122334455', 12, 'Lucas', 10.00, '', 'Reservado', '2026-09-04', '17:30:00', '17:50:00'),

-- Turnos Futuros (Septiembre / Octubre 2026)
(28, 'Micaela R.', '1133445566', 7, 'Ana', 35.00, 'Peinado para casamiento.', 'Reservado', '2026-09-05', '14:00:00', '15:00:00'),
(29, 'Bruno L.', '1144556677', 1, 'Lucas', 15.00, '', 'Reservado', '2026-09-06', '10:00:00', '10:30:00'),
(30, 'Ana F.', '1155667788', 4, 'Martín', 85.00, '', 'Reservado', '2026-09-07', '09:00:00', '11:00:00'),
(31, 'Claudio H.', '1166778899', 5, 'Lucas', 10.00, '', 'Reservado', '2026-09-08', '18:00:00', '18:20:00'),
(32, 'Daniela J.', '1177889900', 10, 'Sofia', 25.00, '', 'Reservado', '2026-09-10', '15:00:00', '16:00:00'),
(33, 'Tomás P.', '1188990011', 1, 'Martín', 15.00, '', 'Reservado', '2026-09-12', '10:00:00', '10:30:00'),
(34, 'Victoria M.', '1199001122', 2, 'Ana', 25.00, '', 'Reservado', '2026-09-15', '11:00:00', '11:45:00'),
(35, 'Joaquín S.', '1100112233', 12, 'Lucas', 10.00, '', 'Reservado', '2026-09-18', '17:00:00', '17:20:00'),
(36, 'Julieta D.', '1111223344', 9, 'Sofia', 20.00, '', 'Reservado', '2026-09-20', '14:00:00', '15:00:00'),
(37, 'Sebastián K.', '1122334455', 1, 'Martín', 15.00, '', 'Reservado', '2026-09-22', '09:30:00', '10:00:00'),
(38, 'Agustina T.', '1133445566', 3, 'Ana', 50.00, '', 'Reservado', '2026-09-25', '15:30:00', '17:00:00'),
(39, 'Emiliano G.', '1144556677', 5, 'Lucas', 10.00, '', 'Reservado', '2026-09-28', '18:00:00', '18:20:00'),
(40, 'Lorena P.', '1155667788', 11, 'Ana', 100.00, '', 'Reservado', '2026-10-02', '14:00:00', '16:30:00'),
(41, 'Federico A.', '1166778899', 1, 'Martín', 15.00, '', 'Reservado', '2026-10-05', '10:00:00', '10:30:00'),
(42, 'Tatiana R.', '1177889900', 8, 'Sofia', 12.00, '', 'Reservado', '2026-10-10', '11:00:00', '11:40:00'),
(43, 'Cristian L.', '1188990011', 1, 'Lucas', 15.00, '', 'Reservado', '2026-10-15', '16:30:00', '17:00:00'),
(44, 'Mónica F.', '1199001122', 15, 'Ana', 70.00, '', 'Reservado', '2026-10-20', '09:00:00', '11:00:00'),
(45, 'Gabriel O.', '1100112233', 5, 'Martín', 10.00, '', 'Reservado', '2026-10-25', '18:00:00', '18:20:00');

-- =========================================================
-- 4. HISTORIAL DE TURNOS MÁS COMPLETO
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