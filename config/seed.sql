seed.sql

USE peluqueria;

-- Desactivar claves foráneas temporalmente

SET FOREIGN_KEY_CHECKS = 0;

-- Borrar los datos usando DELETE (que sí lo permite)

-- (con FOREIGN_KEY_CHECKS = 0 los ON DELETE CASCADE no se ejecutan,

--  por eso se vacían explícitamente todas las tablas)

DELETE FROM service_consumptions;

DELETE FROM service_history;

DELETE FROM products;

DELETE FROM appointment_history;

DELETE FROM appointments;

DELETE FROM clients;

DELETE FROM services;

DELETE FROM users;

-- Resetear los IDs para que vuelvan a empezar desde 1

ALTER TABLE service_consumptions AUTO_INCREMENT = 1;

ALTER TABLE service_history AUTO_INCREMENT = 1;

ALTER TABLE products AUTO_INCREMENT = 1;

ALTER TABLE appointment_history AUTO_INCREMENT = 1;

ALTER TABLE appointments AUTO_INCREMENT = 1;

ALTER TABLE clients AUTO_INCREMENT = 1;

ALTER TABLE services AUTO_INCREMENT = 1;

ALTER TABLE users AUTO_INCREMENT = 1;

-- Volver a activar las claves foráneas

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- 1. USUARIOS
-- =========================================================
-- admin / admin123
-- owner1 / owner123
-- owner2 / owner456
--
-- Los datos principales pertenecen a owner1 (id 2). El bloque de prueba
-- de owner2 (id 3) permite comprobar el aislamiento de los datos.

INSERT INTO
    users (
        id,
        username,
        password_hash,
        role,
        active,
        password_changed_at
    )
VALUES (
        1,
        'admin',
        '$2y$12$Kwbwf3z1245MB8Ldbmox/Oa12m74nzbOWQa6cr/fkGFK4EpF3eAoG',
        'admin',
        TRUE,
        '2026-08-01 09:00:00'
    ),
    (
        2,
        'owner1',
        '$2y$12$fjlLJru0LHGCL2G/EMBCre1ctavSJJdxg9qCFPJXm9Ng7dBaupG5G',
        'owner',
        TRUE,
        '2026-08-01 09:00:00'
    ),
    (
        3,
        'owner2',
        '$2y$12$XUd535Z6Hm4LQxrvpHLWo.E/3wKpwOo0Lp8AuyaEwm8sVW2mpuZMi',
        'owner',
        TRUE,
        '2026-08-01 09:00:00'
    );

-- =========================================================

-- 2. SERVICIOS (16)

-- =========================================================

INSERT INTO
    services (
        id,
        owner_id,
        name,
        description,
        duration,
        price,
        active
    )
VALUES (
        1,
    2,
        'Corte Masculino Clásico',
        'Corte con tijera o máquina, incluye lavado.',
        30,
        15.00,
        TRUE
    ),
    (
        2,
    2,
        'Corte Femenino',
        'Corte de puntas, desmechado o cambio de look.',
        45,
        25.00,
        TRUE
    ),
    (
        3,
    2,
        'Tinte Completo',
        'Aplicación de color global, marcas premium.',
        90,
        50.00,
        TRUE
    ),
    (
        4,
    2,
        'Balayage / Mechas',
        'Técnicas de decoloración y matización.',
        120,
        85.00,
        TRUE
    ),
    (
        5,
    2,
        'Arreglo de Barba',
        'Perfilado, recorte y toalla caliente.',
        20,
        10.00,
        TRUE
    ),
    (
        6,
    2,
        'Tratamiento de Keratina',
        'Alisado temporal y reducción de frizz.',
        90,
        45.00,
        TRUE
    ),
    (
        7,
    2,
        'Peinado de Fiesta',
        'Recogidos, trenzas o brushing elaborado.',
        60,
        35.00,
        TRUE
    ),
    (
        8,
    2,
        'Manicura Tradicional',
        'Limpieza, esmaltado normal y crema hidratante.',
        40,
        12.00,
        TRUE
    ),
    (
        9,
    2,
        'Manicura Semipermanente',
        'Esmaltado en gel de larga duración (21 días).',
        60,
        20.00,
        TRUE
    ),
    (
        10,
    2,
        'Pedicura Completa',
        'Limpieza profunda, exfoliación y esmaltado.',
        60,
        25.00,
        TRUE
    ),
    (
        11,
    2,
        'Alisado Definitivo',
        'Alisado permanente con productos sin formol.',
        150,
        100.00,
        TRUE
    ),
    (
        12,
    2,
        'Lavado y Secado',
        'Lavado con masaje capilar y secado rápido.',
        20,
        10.00,
        TRUE
    ),
    (
        13,
    2,
        'Baño de Crema / Nutrición',
        'Mascarilla hidratante intensiva en lavacabezas.',
        30,
        18.00,
        TRUE
    ),
    (
        14,
    2,
        'Perfilado de Cejas',
        'Diseño y depilación con pinza o hilo.',
        15,
        8.00,
        TRUE
    ),
    (
        15,
    2,
        'Decoloración Global',
        'Llevar el cabello a tonos platinos.',
        120,
        70.00,
        TRUE
    ),
    (
        16,
        3,
        'Corte y Peinado Express',
        'Corte de mantenimiento con lavado y peinado final.',
        45,
        32.00,
        TRUE
    );

-- =========================================================

-- 3. CLIENTES CON FICHA (26 clientes frecuentes)

-- Incluye el diagnóstico capilar base (tono natural, canas,

-- tipo de cabello y alergias).

-- El resto de los turnos corresponde a clientes ocasionales

-- (client_id NULL), que solo quedan registrados por client_name.

-- =========================================================

INSERT INTO
    clients (
        id,
        owner_id,
        internal_code,
        alias,
        natural_base_tone,
        grey_hair,
        hair_type,
        allergies,
        notes,
        active
    )
VALUES (
        1,
    2,
        'CLI-0001',
        'Roberto G.',
        'Castaño oscuro (3)',
        30,
        'Grueso, liso',
        NULL,
        'Cliente habitual, corte clásico cada 3 semanas.',
        TRUE
    ),
    (
        2,
    2,
        'CLI-0002',
        'Carla T.',
        'Castaño medio (4)',
        5,
        'Fino, ondulado',
        'Keratina (reacción alérgica previa)',
        'Prefiere cortar solo puntas; evitar keratina por alergia.',
        TRUE
    ),
    (
        3,
        2,
        'CLI-0003',
        'Mariana P.',
        'Castaño claro (5)',
        0,
        'Medio, liso',
        NULL,
        'Le gusta el esmaltado semipermanente en tonos rojos.',
        TRUE
    ),
    (
        4,
        2,
        'CLI-0004',
        'Lucía F.',
        'Castaño oscuro (3)',
        0,
        'Grueso, ondulado, poroso',
        'Sensibilidad leve a PPD: hacer test de parche antes de cada coloración',
        'Balayage, siempre trae foto de referencia.',
        TRUE
    ),
    (
        5,
        2,
        'CLI-0005',
        'Camila R.',
        'Castaño medio (4)',
        10,
        'Grueso, muy largo y abundante',
        NULL,
        'Cabello muy largo, requiere turno extendido.',
        TRUE
    ),
    (
        6,
        2,
        'CLI-0006',
        'Diego A.',
        'Negro (1)',
        15,
        'Grueso, liso',
        NULL,
        'Corte rápido, viene en su hora de almuerzo.',
        TRUE
    ),
    (
        7,
        2,
        'CLI-0007',
        'Marta B.',
        'Castaño medio (4)',
        40,
        'Fino, liso',
        'Sensibilidad al amoníaco',
        'Retoque de raíces mensual, sensible al amoníaco.',
        TRUE
    ),
    (
        8,
        2,
        'CLI-0008',
        'Fernando C.',
        'Castaño oscuro (3)',
        50,
        'Medio, liso',
        NULL,
        'Cliente puntual, siempre pide el mismo estilista.',
        TRUE
    ),
    (
        9,
        2,
        'CLI-0009',
        'Romina K.',
        'Rubio oscuro (6)',
        10,
        'Poroso, con frizz',
        NULL,
        'Tratamiento de keratina cada 4 meses.',
        TRUE
    ),
    (
        10,
        2,
        'CLI-0010',
        'Gustavo M.',
        'Negro (1)',
        20,
        'Grueso, rizado',
        NULL,
        'Prefiere máquina, corte bajo.',
        TRUE
    ),
    (
        11,
        2,
        'CLI-0011',
        'Florencia D.',
        'Castaño claro (5)',
        0,
        'Fino, liso, sensibilizado post-decoloración',
        NULL,
        'Primera decoloración, seguimiento de cuidado post-color.',
        TRUE
    ),
    (
        12,
        2,
        'CLI-0012',
        'Silvia Q.',
        'Rubio medio (7)',
        35,
        'Medio, ondulado',
        NULL,
        'Le gusta charlar, conviene agendar con tiempo extra.',
        TRUE
    ),
    (
        13,
        2,
        'CLI-0013',
        'Laura W.',
        'Castaño claro (5)',
        0,
        'Medio, liso',
        NULL,
        'Eligió color rosa pastel en su última manicura.',
        TRUE
    ),
    (
        14,
        2,
        'CLI-0014',
        'Rocío E.',
        'Castaño oscuro (3)',
        0,
        'Medio, liso',
        NULL,
        'Diseño de cejas cada 3 semanas.',
        TRUE
    ),
    (
        15,
        2,
        'CLI-0015',
        'Diana C.',
        'Castaño medio (4)',
        25,
        'Medio, liso, seco',
        NULL,
        'Cliente VIP, prefiere turnos por la tarde.',
        TRUE
    ),
    (
        16,
        2,
        'CLI-0016',
        'Oscar V.',
        'Castaño oscuro (3)',
        10,
        'Grueso, liso',
        NULL,
        'Pasa rápido antes de entrar a trabajar.',
        TRUE
    ),
    (
        17,
        2,
        'CLI-0017',
        'Micaela R.',
        'Rubio claro (8)',
        0,
        'Fino, liso',
        NULL,
        'Peinados para eventos y casamientos.',
        TRUE
    ),
    (
        18,
        2,
        'CLI-0018',
        'Ana F.',
        'Castaño oscuro (3)',
        5,
        'Grueso, ondulado',
        NULL,
        'Servicio largo, coordinar con tiempo.',
        TRUE
    ),
    (
        19,
        2,
        'CLI-0019',
        'Tomás P.',
        'Castaño medio (4)',
        0,
        'Medio, ondulado',
        NULL,
        'Cliente nuevo, llegó recomendado.',
        TRUE
    ),
    (
        20,
        2,
        'CLI-0020',
        'Victoria M.',
        'Castaño claro (5)',
        0,
        'Fino, liso',
        NULL,
        'Cliente nueva, primer corte femenino.',
        TRUE
    ),
    (
        21,
        2,
        'CLI-0021',
        'Julieta D.',
        'Castaño medio (4)',
        0,
        'Medio, liso',
        NULL,
        'Renueva su semipermanente cada 3 semanas.',
        TRUE
    ),
    (
        22,
        2,
        'CLI-0022',
        'Emiliano G.',
        'Negro (1)',
        10,
        'Grueso, liso; barba densa',
        NULL,
        'Barba prolija, viene cada 2 semanas.',
        TRUE
    ),
    (
        23,
        2,
        'CLI-0023',
        'Federico A.',
        'Castaño oscuro (3)',
        45,
        'Medio, liso',
        NULL,
        'A veces trae a su hijo también.',
        TRUE
    ),
    (
        24,
        2,
        'CLI-0024',
        'Cristian L.',
        'Castaño oscuro (3)',
        20,
        'Grueso, liso',
        NULL,
        'Cliente de la zona, viene caminando.',
        TRUE
    ),
    (
        25,
        2,
        'CLI-0025',
        'Gabriel O.',
        'Negro (1)',
        5,
        'Grueso; barba gruesa',
        NULL,
        'Prefiere toalla caliente antes del recorte de barba.',
        TRUE
    ),
    (
        26,
        3,
        'OWN2-0001',
        'Elena S.',
        'Rubio oscuro (6)',
        15,
        'Fino, ondulado',
        NULL,
        'Cliente de prueba exclusiva de owner2.',
        TRUE
    );

-- =========================================================

-- 4. TURNOS (46)

-- Distribuidos en el pasado (agosto), hoy (4 de sept) y futuro.

-- Los turnos de clientes con ficha llevan su client_id; el resto

-- queda en NULL (cliente ocasional, solo con client_name).

-- =========================================================

INSERT INTO
    appointments (
        id,
        owner_id,
        client_id,
        client_name,
        service_id,
        stylist,
        price,
        notes,
        status,
        date,
        time_start,
        time_end
    )
VALUES

-- Turnos Pasados (Agosto 2026)

(
    1,
    2,
    1,
    'Roberto G.',
    1,
    'Lucas',
    15.00,
    '',
    'Finalizado',
    '2026-08-15',
    '10:00:00',
    '10:30:00'
),
(
    2,
    2,
    2,
    'Carla T.',
    2,
    'Ana',
    25.00,
    'Cortar solo 2 dedos.',
    'Finalizado',
    '2026-08-15',
    '11:00:00',
    '11:45:00'
),
(
    3,
    2,
    3,
    'Mariana P.',
    9,
    'Sofia',
    20.00,
    'Color rojo.',
    'Finalizado',
    '2026-08-16',
    '14:00:00',
    '15:00:00'
),
(
    4,
    2,
    NULL,
    'Esteban M.',
    5,
    'Lucas',
    10.00,
    '',
    'Ausente',
    '2026-08-16',
    '16:00:00',
    '16:20:00'
),
(
    5,
    2,
    4,
    'Lucía F.',
    4,
    'Martín',
    85.00,
    'Trae foto de referencia.',
    'Finalizado',
    '2026-08-17',
    '09:00:00',
    '11:00:00'
),
(
    6,
    2,
    NULL,
    'Javier S.',
    1,
    'Lucas',
    15.00,
    '',
    'Cancelado',
    '2026-08-18',
    '18:00:00',
    '18:30:00'
),
(
    7,
    2,
    5,
    'Camila R.',
    11,
    'Ana',
    100.00,
    'Pelo muy largo y abundante.',
    'Finalizado',
    '2026-08-20',
    '15:00:00',
    '17:30:00'
),
(
    8,
    2,
    6,
    'Diego A.',
    1,
    'Martín',
    15.00,
    '',
    'Finalizado',
    '2026-08-22',
    '10:00:00',
    '10:30:00'
),
(
    9,
    2,
    NULL,
    'Valentina L.',
    13,
    'Sofia',
    18.00,
    '',
    'Finalizado',
    '2026-08-25',
    '11:00:00',
    '11:30:00'
),
(
    10,
    2,
    NULL,
    'Jorge V.',
    12,
    'Lucas',
    10.00,
    '',
    'Finalizado',
    '2026-08-28',
    '09:30:00',
    '09:50:00'
),

-- Turnos Recientes (1 al 3 de Septiembre 2026)

(
    11,
    2,
    7,
    'Marta B.',
    3,
    'Ana',
    50.00,
    'Retoque de raíces.',
    'Finalizado',
    '2026-09-01',
    '10:00:00',
    '11:30:00'
),
(
    12,
    2,
    8,
    'Fernando C.',
    1,
    'Lucas',
    15.00,
    '',
    'Finalizado',
    '2026-09-01',
    '10:30:00',
    '11:00:00'
),
(
    13,
    2,
    NULL,
    'Paula N.',
    8,
    'Sofia',
    12.00,
    '',
    'Ausente',
    '2026-09-01',
    '14:00:00',
    '14:40:00'
),
(
    14,
    2,
    NULL,
    'Hugo P.',
    5,
    'Martín',
    10.00,
    '',
    'Finalizado',
    '2026-09-02',
    '15:00:00',
    '15:20:00'
),
(
    15,
    2,
    9,
    'Romina K.',
    6,
    'Ana',
    45.00,
    'Pelo por los hombros.',
    'Finalizado',
    '2026-09-02',
    '16:00:00',
    '17:30:00'
),
(
    16,
    2,
    NULL,
    'Andrea G.',
    14,
    'Sofia',
    8.00,
    '',
    'Cancelado',
    '2026-09-03',
    '09:00:00',
    '09:15:00'
),
(
    17,
    2,
    10,
    'Gustavo M.',
    1,
    'Lucas',
    15.00,
    '',
    'Finalizado',
    '2026-09-03',
    '10:00:00',
    '10:30:00'
),
(
    18,
    2,
    11,
    'Florencia D.',
    15,
    'Martín',
    70.00,
    'Primera decoloración.',
    'Finalizado',
    '2026-09-03',
    '14:00:00',
    '16:00:00'
),

-- Turnos del Día Actual (4 de Septiembre 2026)

(
    19,
    2,
    NULL,
    'Carlos I.',
    1,
    'Lucas',
    15.00,
    'Primer turno del día',
    'Finalizado',
    '2026-09-04',
    '09:00:00',
    '09:30:00'
),
(
    20,
    2,
    12,
    'Silvia Q.',
    2,
    'Ana',
    25.00,
    '',
    'Finalizado',
    '2026-09-04',
    '09:30:00',
    '10:15:00'
),
(
    21,
    2,
    NULL,
    'Pedro O.',
    5,
    'Martín',
    10.00,
    '',
    'En atención',
    '2026-09-04',
    '10:20:00',
    '10:40:00'
),
(
    22,
    2,
    13,
    'Laura W.',
    9,
    'Sofia',
    20.00,
    'Eligió color rosa paste.',
    'En atención',
    '2026-09-04',
    '10:00:00',
    '11:00:00'
),
(
    23,
    2,
    NULL,
    'Ignacio Z.',
    1,
    'Lucas',
    15.00,
    'Esperando tomando café.',
    'En sala de espera',
    '2026-09-04',
    '10:45:00',
    '11:15:00'
),
(
    24,
    2,
    14,
    'Rocío E.',
    14,
    'Sofia',
    8.00,
    '',
    'Reservado',
    '2026-09-04',
    '11:30:00',
    '11:45:00'
),
(
    25,
    2,
    NULL,
    'Marcelo Y.',
    1,
    'Martín',
    15.00,
    '',
    'Reservado',
    '2026-09-04',
    '15:00:00',
    '15:30:00'
),
(
    26,
    2,
    15,
    'Diana C.',
    3,
    'Ana',
    50.00,
    '',
    'Reservado',
    '2026-09-04',
    '16:00:00',
    '17:30:00'
),
(
    27,
    2,
    16,
    'Oscar V.',
    12,
    'Lucas',
    10.00,
    '',
    'Reservado',
    '2026-09-04',
    '17:30:00',
    '17:50:00'
),

-- Turnos Futuros (Septiembre / Octubre 2026)

(
    28,
    2,
    17,
    'Micaela R.',
    7,
    'Ana',
    35.00,
    'Peinado para casamiento.',
    'Reservado',
    '2026-09-05',
    '14:00:00',
    '15:00:00'
),
(
    29,
    2,
    NULL,
    'Bruno L.',
    1,
    'Lucas',
    15.00,
    '',
    'Reservado',
    '2026-09-06',
    '10:00:00',
    '10:30:00'
),
(
    30,
    2,
    18,
    'Ana F.',
    4,
    'Martín',
    85.00,
    '',
    'Reservado',
    '2026-09-07',
    '09:00:00',
    '11:00:00'
),
(
    31,
    2,
    NULL,
    'Claudio H.',
    5,
    'Lucas',
    10.00,
    '',
    'Reservado',
    '2026-09-08',
    '18:00:00',
    '18:20:00'
),
(
    32,
    2,
    NULL,
    'Daniela J.',
    10,
    'Sofia',
    25.00,
    '',
    'Reservado',
    '2026-09-10',
    '15:00:00',
    '16:00:00'
),
(
    33,
    2,
    19,
    'Tomás P.',
    1,
    'Martín',
    15.00,
    '',
    'Reservado',
    '2026-09-12',
    '10:00:00',
    '10:30:00'
),
(
    34,
    2,
    20,
    'Victoria M.',
    2,
    'Ana',
    25.00,
    '',
    'Reservado',
    '2026-09-15',
    '11:00:00',
    '11:45:00'
),
(
    35,
    2,
    NULL,
    'Joaquín S.',
    12,
    'Lucas',
    10.00,
    '',
    'Reservado',
    '2026-09-18',
    '17:00:00',
    '17:20:00'
),
(
    36,
    2,
    21,
    'Julieta D.',
    9,
    'Sofia',
    20.00,
    '',
    'Reservado',
    '2026-09-20',
    '14:00:00',
    '15:00:00'
),
(
    37,
    2,
    NULL,
    'Sebastián K.',
    1,
    'Martín',
    15.00,
    '',
    'Reservado',
    '2026-09-22',
    '09:30:00',
    '10:00:00'
),
(
    38,
    2,
    NULL,
    'Agustina T.',
    3,
    'Ana',
    50.00,
    '',
    'Reservado',
    '2026-09-25',
    '15:30:00',
    '17:00:00'
),
(
    39,
    2,
    22,
    'Emiliano G.',
    5,
    'Lucas',
    10.00,
    '',
    'Reservado',
    '2026-09-28',
    '18:00:00',
    '18:20:00'
),
(
    40,
    2,
    NULL,
    'Lorena P.',
    11,
    'Ana',
    100.00,
    '',
    'Reservado',
    '2026-10-02',
    '14:00:00',
    '16:30:00'
),
(
    41,
    2,
    23,
    'Federico A.',
    1,
    'Martín',
    15.00,
    '',
    'Reservado',
    '2026-10-05',
    '10:00:00',
    '10:30:00'
),
(
    42,
    2,
    NULL,
    'Tatiana R.',
    8,
    'Sofia',
    12.00,
    '',
    'Reservado',
    '2026-10-10',
    '11:00:00',
    '11:40:00'
),
(
    43,
    2,
    24,
    'Cristian L.',
    1,
    'Lucas',
    15.00,
    '',
    'Reservado',
    '2026-10-15',
    '16:30:00',
    '17:00:00'
),
(
    44,
    2,
    NULL,
    'Mónica F.',
    15,
    'Ana',
    70.00,
    '',
    'Reservado',
    '2026-10-20',
    '09:00:00',
    '11:00:00'
),
    (
        45,
        2,
    25,
    'Gabriel O.',
    5,
    'Martín',
    10.00,
    '',
    'Reservado',
        '2026-10-25',
        '18:00:00',
        '18:20:00'
),
(
    46,
    3,
    26,
    'Elena S.',
    16,
    'Valeria',
    32.00,
    'Turno de prueba de owner2.',
    'Finalizado',
    '2026-09-06',
    '11:00:00',
    '11:45:00'
);

-- =========================================================

-- 5. HISTORIAL DE ESTADOS DE LOS TURNOS

-- Se simulan las transiciones (Reservado -> Espera -> Atención -> Finalizado)

-- =========================================================

INSERT INTO
    appointment_history (
        appointment_id,
        owner_id,
        status_from,
        status_to,
        changed_at
    )
VALUES

-- Turno 1 (Finalizado)

(
    1,
    2,
    NULL,
    'Reservado',
    '2026-08-10 10:00:00'
),
(
    1,
    2,
    'Reservado',
    'En sala de espera',
    '2026-08-15 09:50:00'
),
(
    1,
    2,
    'En sala de espera',
    'En atención',
    '2026-08-15 10:05:00'
),
(
    1,
    2,
    'En atención',
    'Finalizado',
    '2026-08-15 10:35:00'
),

-- Turno 2 (Finalizado)

(
    2,
    2,
    NULL,
    'Reservado',
    '2026-08-12 11:30:00'
),
(
    2,
    2,
    'Reservado',
    'En sala de espera',
    '2026-08-15 10:55:00'
),
(
    2,
    2,
    'En sala de espera',
    'En atención',
    '2026-08-15 11:02:00'
),
(
    2,
    2,
    'En atención',
    'Finalizado',
    '2026-08-15 11:50:00'
),

-- Turno 3 (Finalizado)

(
    3,
    2,
    NULL,
    'Reservado',
    '2026-08-13 14:00:00'
),
(
    3,
    2,
    'Reservado',
    'En atención',
    '2026-08-16 14:00:00'
),
(
    3,
    2,
    'En atención',
    'Finalizado',
    '2026-08-16 15:05:00'
),

-- Turno 4 (Ausente)

(
    4,
    2,
    NULL,
    'Reservado',
    '2026-08-14 09:00:00'
),
(
    4,
    2,
    'Reservado',
    'Ausente',
    '2026-08-16 16:30:00'
),

-- Turno 5 (Finalizado)

(
    5,
    2,
    NULL,
    'Reservado',
    '2026-08-15 18:00:00'
),
(
    5,
    2,
    'Reservado',
    'En sala de espera',
    '2026-08-17 08:50:00'
),
(
    5,
    2,
    'En sala de espera',
    'En atención',
    '2026-08-17 09:00:00'
),
(
    5,
    2,
    'En atención',
    'Finalizado',
    '2026-08-17 11:00:00'
),

-- Turno 6 (Cancelado)

(
    6,
    2,
    NULL,
    'Reservado',
    '2026-08-15 15:00:00'
),
(
    6,
    2,
    'Reservado',
    'Cancelado',
    '2026-08-18 10:00:00'
),

-- Turno 7 al 10 (Solo simulo Reservado y Finalizado directo para ahorrar espacio, común en sistemas rápidos)

(
    7,
    2,
    NULL,
    'Reservado',
    '2026-08-18 10:00:00'
),
(
    7,
    2,
    'Reservado',
    'Finalizado',
    '2026-08-20 17:30:00'
),
(
    8,
    2,
    NULL,
    'Reservado',
    '2026-08-20 11:00:00'
),
(
    8,
    2,
    'Reservado',
    'Finalizado',
    '2026-08-22 10:30:00'
),
(
    9,
    2,
    NULL,
    'Reservado',
    '2026-08-22 12:00:00'
),
(
    9,
    2,
    'Reservado',
    'Finalizado',
    '2026-08-25 11:30:00'
),
(
    10,
    2,
    NULL,
    'Reservado',
    '2026-08-25 15:00:00'
),
(
    10,
    2,
    'Reservado',
    'Finalizado',
    '2026-08-28 09:50:00'
),

-- Turnos recientes (Septiembre)

(
    11,
    2,
    NULL,
    'Reservado',
    '2026-08-30 09:00:00'
),
(
    11,
    2,
    'Reservado',
    'En sala de espera',
    '2026-09-01 09:55:00'
),
(
    11,
    2,
    'En sala de espera',
    'En atención',
    '2026-09-01 10:00:00'
),
(
    11,
    2,
    'En atención',
    'Finalizado',
    '2026-09-01 11:30:00'
),
(
    12,
    2,
    NULL,
    'Reservado',
    '2026-08-31 16:00:00'
),
(
    12,
    2,
    'Reservado',
    'En atención',
    '2026-09-01 10:35:00'
),
(
    12,
    2,
    'En atención',
    'Finalizado',
    '2026-09-01 11:05:00'
),
(
    13,
    2,
    NULL,
    'Reservado',
    '2026-09-01 08:00:00'
),
(
    13,
    2,
    'Reservado',
    'Ausente',
    '2026-09-01 14:45:00'
),
(
    14,
    2,
    NULL,
    'Reservado',
    '2026-09-01 12:00:00'
),
(
    14,
    2,
    'Reservado',
    'Finalizado',
    '2026-09-02 15:20:00'
),
(
    15,
    2,
    NULL,
    'Reservado',
    '2026-09-01 13:00:00'
),
(
    15,
    2,
    'Reservado',
    'Finalizado',
    '2026-09-02 17:30:00'
),
(
    16,
    2,
    NULL,
    'Reservado',
    '2026-09-02 10:00:00'
),
(
    16,
    2,
    'Reservado',
    'Cancelado',
    '2026-09-02 18:00:00'
),
(
    17,
    2,
    NULL,
    'Reservado',
    '2026-09-02 11:00:00'
),
(
    17,
    2,
    'Reservado',
    'Finalizado',
    '2026-09-03 10:30:00'
),
(
    18,
    2,
    NULL,
    'Reservado',
    '2026-09-02 12:00:00'
),
(
    18,
    2,
    'Reservado',
    'Finalizado',
    '2026-09-03 16:00:00'
),

-- Turnos de HOY (4 de Septiembre)

(
    19,
    2,
    NULL,
    'Reservado',
    '2026-09-03 15:00:00'
),
(
    19,
    2,
    'Reservado',
    'En sala de espera',
    '2026-09-04 08:50:00'
),
(
    19,
    2,
    'En sala de espera',
    'En atención',
    '2026-09-04 09:02:00'
),
(
    19,
    2,
    'En atención',
    'Finalizado',
    '2026-09-04 09:35:00'
),
(
    20,
    2,
    NULL,
    'Reservado',
    '2026-09-03 16:00:00'
),
(
    20,
    2,
    'Reservado',
    'En atención',
    '2026-09-04 09:30:00'
),
(
    20,
    2,
    'En atención',
    'Finalizado',
    '2026-09-04 10:15:00'
),
(
    21,
    2,
    NULL,
    'Reservado',
    '2026-09-03 17:00:00'
),
(
    21,
    2,
    'Reservado',
    'En sala de espera',
    '2026-09-04 10:10:00'
),
(
    21,
    2,
    'En sala de espera',
    'En atención',
    '2026-09-04 10:20:00'
),
(
    22,
    2,
    NULL,
    'Reservado',
    '2026-09-03 18:00:00'
),
(
    22,
    2,
    'Reservado',
    'En atención',
    '2026-09-04 10:00:00'
),
(
    23,
    2,
    NULL,
    'Reservado',
    '2026-09-03 19:00:00'
),
(
    23,
    2,
    'Reservado',
    'En sala de espera',
    '2026-09-04 10:30:00'
),

-- Creación inicial ("Reservado") para el resto de los turnos de hoy y futuros

(
    24,
    2,
    NULL,
    'Reservado',
    '2026-09-04 08:00:00'
),
(
    25,
    2,
    NULL,
    'Reservado',
    '2026-09-04 08:15:00'
),
(
    26,
    2,
    NULL,
    'Reservado',
    '2026-09-04 08:30:00'
),
(
    27,
    2,
    NULL,
    'Reservado',
    '2026-09-04 09:00:00'
),
(
    28,
    2,
    NULL,
    'Reservado',
    '2026-09-02 14:00:00'
),
(
    29,
    2,
    NULL,
    'Reservado',
    '2026-09-02 15:00:00'
),
(
    30,
    2,
    NULL,
    'Reservado',
    '2026-09-02 16:00:00'
),
(
    31,
    2,
    NULL,
    'Reservado',
    '2026-09-02 17:00:00'
),
(
    32,
    2,
    NULL,
    'Reservado',
    '2026-09-03 10:00:00'
),
(
    33,
    2,
    NULL,
    'Reservado',
    '2026-09-03 11:00:00'
),
(
    34,
    2,
    NULL,
    'Reservado',
    '2026-09-03 12:00:00'
),
(
    35,
    2,
    NULL,
    'Reservado',
    '2026-09-03 13:00:00'
),
(
    36,
    2,
    NULL,
    'Reservado',
    '2026-09-04 09:00:00'
),
(
    37,
    2,
    NULL,
    'Reservado',
    '2026-09-04 09:15:00'
),
(
    38,
    2,
    NULL,
    'Reservado',
    '2026-09-04 09:30:00'
),
(
    39,
    2,
    NULL,
    'Reservado',
    '2026-09-04 09:45:00'
),
(
    40,
    2,
    NULL,
    'Reservado',
    '2026-09-04 10:00:00'
),
(
    41,
    2,
    NULL,
    'Reservado',
    '2026-09-04 10:05:00'
),
(
    42,
    2,
    NULL,
    'Reservado',
    '2026-09-04 10:10:00'
),
(
    43,
    2,
    NULL,
    'Reservado',
    '2026-09-04 10:15:00'
),
(
    44,
    2,
    NULL,
    'Reservado',
    '2026-09-04 10:20:00'
),
(
    45,
    2,
    NULL,
    'Reservado',
    '2026-09-04 10:25:00'
),

-- Turno 46 (owner2, finalizado)
(
    46,
    3,
    NULL,
    'Reservado',
    '2026-09-02 10:00:00'
),
(
    46,
    3,
    'Reservado',
    'En atención',
    '2026-09-06 11:00:00'
),
(
    46,
    3,
    'En atención',
    'Finalizado',
    '2026-09-06 11:45:00'
);

-- =========================================================

-- 6. HISTORIAL TÉCNICO (17)

-- Un registro por cada turno "Finalizado" (appointment_id es UNIQUE).

-- technical_details es JSON y varía según el tipo de servicio.

-- Los clientes ocasionales (Valentina, Jorge, Hugo, Carlos)

-- llevan client_id NULL.

-- =========================================================

INSERT INTO
    service_history (
        id,
        owner_id,
        client_id,
        appointment_id,
        service_id,
        service_name_snapshot,
        performed_at,
        technical_details
    )
VALUES

-- Corte Masculino (turno 1)

(
    1,
    2,
    1,
    1,
    1,
    'Corte Masculino Clásico',
    '2026-08-15 10:00:00',
    '{"tipo_corte": "Clásico", "tecnica": "Tijera", "largo_final_cm": 4, "lavado": true, "peinado_final": "Gel"}'
),

-- Corte Femenino (turno 2)

(
    2,
    2,
    2,
    2,
    2,
    'Corte Femenino',
    '2026-08-15 11:00:00',
    '{"tipo_corte": "Puntas", "tecnica": "Tijera", "largo_removido_cm": 3, "lavado": true, "secado": "Brushing"}'
),

-- Manicura Semipermanente (turno 3)

(
    3,
    2,
    3,
    3,
    9,
    'Manicura Semipermanente',
    '2026-08-16 14:00:00',
    '{"tipo": "Semipermanente", "color": "Rojo cereza", "marca": "Gelish", "base_coat": true, "top_coat": true, "curado_led_seg": 60, "duracion_estimada_dias": 21}'
),

-- Balayage (turno 5)

(
    4,
    2,
    4,
    5,
    4,
    'Balayage / Mechas',
    '2026-08-17 09:00:00',
    '{"tecnica": "Balayage", "nivel_inicial": 3, "nivel_alcanzado": 6, "decolorante": {"producto": "Polvo Decolorante", "gramos": 80}, "oxidante": {"volumen": 20, "ml": 160}, "tiempo_exposicion_min": 50, "matizador": {"producto": "Matizador Violeta", "ml": 40, "tiempo_min": 10}, "test_de_parche": true, "foto_referencia": true}'
),

-- Alisado Definitivo (turno 7)

(
    5,
    2,
    5,
    7,
    11,
    'Alisado Definitivo',
    '2026-08-20 15:00:00',
    '{"producto": "Alisador Definitivo sin Formol", "ml": 180, "tiempo_exposicion_min": 40, "temperatura_plancha_c": 210, "pasadas_plancha": 8, "largo_cabello": "Muy largo"}'
),

-- Corte Masculino (turno 8)

(
    6,
    2,
    6,
    8,
    1,
    'Corte Masculino Clásico',
    '2026-08-22 10:00:00',
    '{"tipo_corte": "Clásico", "tecnica": "Máquina y tijera", "numero_maquina": 2, "largo_superior_cm": 4, "lavado": true}'
),

-- Baño de Crema (turno 9) - cliente ocasional

(
    7,
    2,
    NULL,
    9,
    13,
    'Baño de Crema / Nutrición',
    '2026-08-25 11:00:00',
    '{"producto": "Mascarilla Nutritiva Intensiva", "gramos": 60, "tiempo_exposicion_min": 15, "con_calor": true, "tipo_cabello": "Seco"}'
),

-- Lavado y Secado (turno 10) - cliente ocasional

(
    8,
    2,
    NULL,
    10,
    12,
    'Lavado y Secado',
    '2026-08-28 09:30:00',
    '{"lavado": "Shampoo neutro", "masaje_capilar": true, "secado": "Secador", "peinado_final": "Natural"}'
),

-- Tinte Completo / Retoque de raíces (turno 11)

(
    9,
    2,
    7,
    11,
    3,
    'Tinte Completo',
    '2026-09-01 10:00:00',
    '{"tipo": "Retoque de raíces", "formula": [{"producto": "Tinte Sin Amoníaco 4.0 Castaño Medio", "gramos": 60}], "oxidante": {"volumen": 20, "ml": 60}, "proporcion": "1:1", "tiempo_exposicion_min": 35, "sin_amoniaco": true, "cobertura_canas": true}'
),

-- Corte Masculino (turno 12)

(
    10,
    2,
    8,
    12,
    1,
    'Corte Masculino Clásico',
    '2026-09-01 10:30:00',
    '{"tipo_corte": "Clásico", "tecnica": "Tijera", "largo_final_cm": 3, "lavado": true, "peinado_final": "Raya al costado"}'
),

-- Arreglo de Barba (turno 14) - cliente ocasional

(
    11,
    2,
    NULL,
    14,
    5,
    'Arreglo de Barba',
    '2026-09-02 15:00:00',
    '{"estilo": "Perfilado", "largo_final_mm": 8, "toalla_caliente": true, "aceite_final": "Aceite para Barba"}'
),

-- Tratamiento de Keratina (turno 15)

(
    12,
    2,
    9,
    15,
    6,
    'Tratamiento de Keratina',
    '2026-09-02 16:00:00',
    '{"producto": "Keratina Alisadora", "ml": 90, "tiempo_exposicion_min": 30, "temperatura_plancha_c": 210, "pasadas_plancha": 6, "largo_cabello": "Hombros", "recomendacion_post": "No lavar durante 48 horas"}'
),

-- Corte Masculino (turno 17)

(
    13,
    2,
    10,
    17,
    1,
    'Corte Masculino Clásico',
    '2026-09-03 10:00:00',
    '{"tipo_corte": "Degradado bajo", "tecnica": "Máquina", "numero_maquina": 1, "lavado": true}'
),

-- Decoloración Global (turno 18)

(
    14,
    2,
    11,
    18,
    15,
    'Decoloración Global',
    '2026-09-03 14:00:00',
    '{"tecnica": "Decoloración global", "primera_decoloracion": true, "nivel_inicial": 5, "nivel_alcanzado": 8, "decolorante": {"producto": "Polvo Decolorante", "gramos": 100}, "oxidante": {"volumen": 20, "ml": 200}, "tiempo_exposicion_min": 60, "matizador": {"producto": "Matizador Violeta", "ml": 50, "tiempo_min": 10}, "tratamiento_post": "Mascarilla Nutritiva Intensiva"}'
),

-- Corte Masculino (turno 19) - cliente ocasional

(
    15,
    2,
    NULL,
    19,
    1,
    'Corte Masculino Clásico',
    '2026-09-04 09:00:00',
    '{"tipo_corte": "Clásico", "tecnica": "Máquina y tijera", "numero_maquina": 3, "lavado": true}'
),

-- Corte Femenino (turno 20)

(
    16,
    2,
    12,
    20,
    2,
    'Corte Femenino',
    '2026-09-04 09:30:00',
    '{"tipo_corte": "Cambio de look", "tecnica": "Tijera", "largo_removido_cm": 5, "estilo": "Capas suaves", "lavado": true, "secado": "Brushing"}'
),

-- Corte y Peinado Express (turno 46, owner2)
(
    17,
    3,
    26,
    46,
    16,
    'Corte y Peinado Express',
    '2026-09-06 11:00:00',
    '{"tipo_corte": "Mantenimiento", "tecnica": "Tijera", "lavado": true, "peinado_final": "Brushing suave"}'
);

-- =========================================================

-- 7. INVENTARIO (18 productos)

-- unit_cost = costo por cada 1 ml, g o unidad.

-- El stock es el stock actual y no se descuenta con los consumos del seed.

-- Incluye un producto con stock bajo (Polvo Decolorante) y uno inactivo.

-- =========================================================

INSERT INTO
    products (
        id,
        owner_id,
        name,
        brand,
        measurement_unit,
        stock,
        unit_cost,
        active
    )
VALUES (
        1,
    2,
        'Tinte Permanente 6.0 Rubio Oscuro',
        'Wella',
        'g',
        1440.00,
        0.12,
        TRUE
    ),
    (
        2,
    2,
        'Tinte Sin Amoníaco 4.0 Castaño Medio',
        'Wella',
        'g',
        1620.00,
        0.14,
        TRUE
    ),
    (
        3,
    2,
        'Oxidante 20 Vol',
        'Wella',
        'ml',
        4200.00,
        0.02,
        TRUE
    ),
    (
        4,
    2,
        'Polvo Decolorante',
        'Schwarzkopf',
        'g',
        180.00,
        0.09,
        TRUE
    ),
    (
        5,
    2,
        'Matizador Violeta',
        'Alfaparf',
        'ml',
        850.00,
        0.06,
        TRUE
    ),
    (
        6,
    2,
        'Keratina Alisadora',
        'Inoar',
        'ml',
        760.00,
        0.14,
        TRUE
    ),
    (
        7,
    2,
        'Alisador Definitivo sin Formol',
        'Inoar',
        'ml',
        1500.00,
        0.11,
        TRUE
    ),
    (
        8,
    2,
        'Shampoo Neutro Profesional',
        'Alfaparf',
        'ml',
        8500.00,
        0.01,
        TRUE
    ),
    (
        9,
    2,
        'Mascarilla Nutritiva Intensiva',
        'Alfaparf',
        'g',
        2400.00,
        0.04,
        TRUE
    ),
    (
        10,
    2,
        'Esmalte Semipermanente Rojo Cereza',
        'Gelish',
        'ml',
        110.00,
        0.60,
        TRUE
    ),
    (
        11,
    2,
        'Esmalte Semipermanente Rosa Pastel',
        'Gelish',
        'ml',
        95.00,
        0.60,
        TRUE
    ),
    (
        12,
    2,
        'Esmalte Tradicional Transparente',
        'Essie',
        'ml',
        90.00,
        0.40,
        TRUE
    ),
    (
        13,
    2,
        'Crema Hidratante de Manos',
        'Nivea',
        'g',
        900.00,
        0.03,
        TRUE
    ),
    (
        14,
    2,
        'Toalla Descartable',
        NULL,
        'unidad',
        180.00,
        0.30,
        TRUE
    ),
    (
        15,
    2,
        'Aceite para Barba',
        'Proraso',
        'ml',
        300.00,
        0.10,
        TRUE
    ),
    (
        16,
    2,
        'Spray Fijador',
        'Schwarzkopf',
        'ml',
        700.00,
        0.03,
        TRUE
    ),
    (
        17,
    2,
        'Crema Decolorante (discontinuada)',
        NULL,
        'g',
        0.00,
        0.10,
        FALSE
    ),
    (
        18,
        3,
        'Shampoo Reparador',
        'L''Oréal Professionnel',
        'ml',
        600.00,
        0.05,
        TRUE
    );

-- =========================================================

-- 8. CONSUMOS POR SERVICIO (Rentabilidad)

-- cost_snapshot = quantity_used * unit_cost del producto.

-- Las cantidades coinciden con las registradas en technical_details.

-- =========================================================

INSERT INTO
    service_consumptions (
        service_history_id,
        owner_id,
        product_id,
        quantity_used,
        cost_snapshot
    )
VALUES

-- SH 1: Corte masculino (Roberto)

(1, 2, 8, 10.00, 0.10),

-- SH 2: Corte femenino (Carla)

(2, 2, 8, 15.00, 0.15),

-- SH 3: Semipermanente (Mariana)

(3, 2, 10, 2.00, 1.20), (3, 2, 13, 5.00, 0.15),

-- SH 4: Balayage (Lucía)

(4, 2, 4, 80.00, 7.20),
(4, 2, 3, 160.00, 3.20),
(4, 2, 5, 40.00, 2.40),
(4, 2, 8, 40.00, 0.40),
(4, 2, 9, 30.00, 1.20),

-- SH 5: Alisado definitivo (Camila)

(5, 2, 7, 180.00, 19.80), (5, 2, 8, 60.00, 0.60), (5, 2, 9, 60.00, 2.40),

-- SH 6: Corte masculino (Diego)

(6, 2, 8, 10.00, 0.10),

-- SH 7: Baño de crema (Valentina)

(7, 2, 9, 60.00, 2.40), (7, 2, 8, 20.00, 0.20),

-- SH 8: Lavado y secado (Jorge)

(8, 2, 8, 20.00, 0.20),

-- SH 9: Tinte / retoque de raíces (Marta)

(9, 2, 2, 60.00, 8.40), (9, 2, 3, 60.00, 1.20), (9, 2, 8, 30.00, 0.30),

-- SH 10: Corte masculino (Fernando)

(10, 2, 8, 10.00, 0.10),

-- SH 11: Arreglo de barba (Hugo)

(11, 2, 14, 1.00, 0.30), (11, 2, 15, 3.00, 0.30),

-- SH 12: Keratina (Romina)

(12, 2, 6, 90.00, 12.60), (12, 2, 8, 40.00, 0.40),

-- SH 13: Corte masculino (Gustavo)

(13, 2, 8, 10.00, 0.10),

-- SH 14: Decoloración global (Florencia)

(14, 2, 4, 100.00, 9.00),
(14, 2, 3, 200.00, 4.00),
(14, 2, 5, 50.00, 3.00),
(14, 2, 8, 40.00, 0.40),
(14, 2, 9, 40.00, 1.60),

-- SH 15: Corte masculino (Carlos)

(15, 2, 8, 10.00, 0.10),

-- SH 16: Corte femenino (Silvia)

(16, 2, 8, 15.00, 0.15),

-- SH 17: Corte y Peinado Express (Elena, owner2)

(17, 3, 18, 20.00, 1.00);
