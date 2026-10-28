-- =========================================================
-- BASE DE DATOS: peluqueria
-- Crea la base y todas sus tablas para una instalación nueva.
-- =========================================================

CREATE DATABASE IF NOT EXISTS peluqueria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE peluqueria;

-- =========================================================
-- 1. USUARIOS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(254) NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('owner', 'admin') NOT NULL DEFAULT 'owner',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME NULL,
    password_changed_at DATETIME NULL,
    terms_accepted_at DATETIME NULL,
    opening_time TIME NOT NULL DEFAULT '09:00:00',
    closing_time TIME NOT NULL DEFAULT '20:00:00',
    opening_time_2 TIME NULL,
    closing_time_2 TIME NULL,
    work_days VARCHAR(13) NOT NULL DEFAULT '1,2,3,4,5,6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email)
);

-- =========================================================
-- 1.1 INTENTOS DE ACCESO
-- =========================================================

CREATE TABLE IF NOT EXISTS auth_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scope ENUM('login', 'register') NOT NULL,
    key_hash CHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auth_attempts_lookup (scope, key_hash, created_at)
);

-- =========================================================
-- 2. SERVICIOS
-- =========================================================

CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_services_owner_active (owner_id, active),
    INDEX idx_services_owner_name (owner_id, name),
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

-- =========================================================
-- 3. CLIENTES
-- =========================================================

CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    internal_code VARCHAR(40) NULL,
    alias VARCHAR(100) NOT NULL,
    natural_base_tone VARCHAR(30) NULL,
    hair_type VARCHAR(100) NULL,
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_clients_owner_code (owner_id, internal_code),
    INDEX idx_clients_owner_alias (owner_id, alias),
    INDEX idx_clients_owner_active_alias (owner_id, active, alias),
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

-- =========================================================
-- 4. TURNOS
-- =========================================================

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    client_id INT NULL,
    client_name VARCHAR(255) NULL,
    service_id INT NOT NULL,
    stylist VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    status ENUM(
        'Reservado',
        'Finalizado',
        'Cancelado',
        'Ausente'
    ) NOT NULL DEFAULT 'Reservado',
    date DATE NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_appt_owner_date_time (owner_id, date, time_start),
    INDEX idx_appt_owner_status_date (owner_id, status, date),
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL
);

-- =========================================================
-- 4.1 SERVICIOS DEL TURNO
-- =========================================================

CREATE TABLE IF NOT EXISTS appointment_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    appointment_id INT NOT NULL,
    service_id INT NOT NULL,
    position TINYINT UNSIGNED NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    duration INT NOT NULL,
    UNIQUE KEY uq_appt_services (appointment_id, service_id),
    INDEX idx_appt_services_owner (owner_id, appointment_id),
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE RESTRICT
);

-- =========================================================
-- 5. HISTORIAL DE ESTADOS DE TURNOS
-- =========================================================

CREATE TABLE IF NOT EXISTS appointment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    appointment_id INT NOT NULL,
    status_from VARCHAR(50) NULL,
    status_to VARCHAR(50) NOT NULL,
    reason VARCHAR(255) NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
);

-- =========================================================
-- 6. HISTORIAL TÉCNICO
-- =========================================================

CREATE TABLE IF NOT EXISTS service_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    client_id INT NULL,
    client_name VARCHAR(255) NULL,
    appointment_id INT NULL,
    service_id INT NULL,
    service_name_snapshot VARCHAR(100) NULL,
    performed_at DATETIME NOT NULL,
    technical_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_service_history_owner_client (owner_id, client_id, performed_at),
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE RESTRICT,
    UNIQUE (appointment_id)
);

-- =========================================================
-- 7. PRODUCTOS
-- =========================================================

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100) NULL,
    measurement_unit ENUM('ml', 'g', 'unidad') NOT NULL DEFAULT 'ml',
    stock DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    unit_cost DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_products_owner_active_name (owner_id, active, name),
    INDEX idx_products_owner_brand (owner_id, brand),
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

-- =========================================================
-- 8. CONSUMOS POR SERVICIO
-- =========================================================

CREATE TABLE IF NOT EXISTS service_consumptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    service_history_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_used DECIMAL(8, 2) NOT NULL,
    cost_snapshot DECIMAL(12, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_consumptions_owner_history (owner_id, service_history_id),
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (service_history_id) REFERENCES service_history (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
);
