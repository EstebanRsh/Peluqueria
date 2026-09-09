CREATE DATABASE IF NOT EXISTS peluqueria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE peluqueria;

-- =========================================================
-- EVENTOS DEL CALENDARIO
-- =========================================================

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- SERVICIOS DE LA PELUQUERÍA
-- =========================================================

CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration INT NOT NULL COMMENT 'Duración en minutos',
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- CLIENTES
-- =========================================================

CREATE TABLE IF NOT EXISTS clients (

    id INT AUTO_INCREMENT PRIMARY KEY,

    internal_code VARCHAR(40) UNIQUE,

    alias VARCHAR(100) NOT NULL,

    notes TEXT,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_clients_alias (alias),

    INDEX idx_clients_active (active)

);

-- =========================================================
-- TURNOS
-- =========================================================

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NULL,
    client_name VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    service_id INT NOT NULL,
    stylist VARCHAR(100),
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    status ENUM('Reservado', 'En sala de espera', 'En atención', 'Finalizado', 'Cancelado', 'Ausente') NOT NULL DEFAULT 'Reservado',
    date DATE NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE RESTRICT,
    FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE SET NULL
);

-- =========================================================
-- HISTORIAL DE SERVICIOS REALIZADOS (SNAPSHOT OPERATIVO)
-- =========================================================

CREATE TABLE IF NOT EXISTS service_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NULL,
    appointment_id INT NOT NULL,
    service_id INT NOT NULL,
    service_name_snapshot VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    performed_at DATETIME NOT NULL,
    stylist VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE SET NULL,
    FOREIGN KEY (appointment_id)
        REFERENCES appointments(id)
        ON DELETE CASCADE,
    FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE RESTRICT,
    UNIQUE (appointment_id)
);

-- =========================================================
-- HISTORIAL DE ESTADOS DE LOS TURNOS
-- =========================================================

CREATE TABLE IF NOT EXISTS appointment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    status_from VARCHAR(50) NULL,
    status_to VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);
