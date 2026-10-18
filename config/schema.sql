-- =========================================================
-- BASE DE DATOS: peluqueria
-- Crea la base y todas sus tablas.
-- =========================================================

CREATE DATABASE IF NOT EXISTS peluqueria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE peluqueria;

-- =========================================================
-- 1. USUARIOS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL COMMENT 'Nombre de usuario para iniciar sesión',
    email VARCHAR(254) NULL,
    password_hash VARCHAR(255) NOT NULL COMMENT 'Hash de la contraseña (password_hash de PHP)',
    role ENUM('owner', 'admin') NOT NULL DEFAULT 'owner' COMMENT 'owner = peluquero (acceso total) | admin = usuario administrador futuro',
    active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Puede iniciar sesión (1=Sí, 0=No)',
    last_login_at DATETIME NULL COMMENT 'Último inicio de sesión exitoso',
    password_changed_at DATETIME NULL COMMENT 'Última vez que se cambió la contraseña',
    terms_accepted_at DATETIME NULL,
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
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del servicio',
    owner_id INT NOT NULL COMMENT 'Identificador del owner que posee el servicio',
    name VARCHAR(100) NOT NULL COMMENT 'Nombre descriptivo',
    description TEXT COMMENT 'Descripción detallada',
    duration INT NOT NULL COMMENT 'Duración estimada en minutos',
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Precio base',
    active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Disponible para agendar (1=Sí, 0=No)',
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
    owner_id INT NOT NULL COMMENT 'Owner propietario del cliente',
    internal_code VARCHAR(40) NULL COMMENT 'Código interno para búsqueda rápida',
    alias VARCHAR(100) NOT NULL COMMENT 'Nombre o apodo',
    natural_base_tone VARCHAR(30) NULL COMMENT 'Tono natural, ej: Castaño oscuro (3)',
    hair_type VARCHAR(100) NULL COMMENT 'Textura: Fino, grueso, poroso',
    allergies TEXT NULL COMMENT 'Alergias o sensibilidad',
    notes TEXT COMMENT 'Notas generales',
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
    owner_id INT NOT NULL COMMENT 'Owner propietario del turno',
    client_id INT NULL COMMENT 'NULL si es cliente no registrado',
    client_name VARCHAR(255) NULL COMMENT 'Nombre manual si no está en DB',
    service_id INT NOT NULL,
    stylist VARCHAR(100) COMMENT 'Profesional asignado',
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Precio final cobrado',
    notes TEXT COMMENT 'Anotaciones particulares del turno',
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
-- 5. HISTORIAL DE ESTADOS DE TURNOS
-- =========================================================

CREATE TABLE IF NOT EXISTS appointment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL COMMENT 'Owner propietario del historial',
    appointment_id INT NOT NULL,
    status_from VARCHAR(50) NULL,
    status_to VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
);

-- =========================================================
-- 6. HISTORIAL TÉCNICO
-- =========================================================

CREATE TABLE IF NOT EXISTS service_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL COMMENT 'Owner propietario de la ficha',
    client_id INT NULL,
    client_name VARCHAR(255) NULL COMMENT 'Nombre manual si no hay cliente registrado o no hay turno asociado',
    appointment_id INT NULL COMMENT 'NULL si la ficha se registró sin turno o si el turno fue eliminado',
    service_id INT NULL COMMENT 'NULL si la ficha no está ligada a un servicio del catálogo',
    service_name_snapshot VARCHAR(100) NULL COMMENT 'Snapshot del nombre del servicio, si aplica',
    performed_at DATETIME NOT NULL COMMENT 'Fecha de realización',
    technical_details JSON COMMENT 'Detalles técnicos dinámicos (color, alisado, corte)',
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
    owner_id INT NOT NULL COMMENT 'Owner propietario del producto',
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100) NULL,
    measurement_unit ENUM('ml', 'g', 'unidad') NOT NULL DEFAULT 'ml',
    stock DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Cantidad disponible actual',
    unit_cost DECIMAL(10, 4) NOT NULL DEFAULT 0.0000 COMMENT 'Costo por cada 1 ml, g o unidad',
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
    owner_id INT NOT NULL COMMENT 'Owner propietario del consumo',
    service_history_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_used DECIMAL(8, 2) NOT NULL COMMENT 'Cantidad exacta utilizada en el servicio',
    cost_snapshot DECIMAL(12, 4) NOT NULL COMMENT 'Costo calculado al momento del servicio (quantity * unit_cost)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_consumptions_owner_history (owner_id, service_history_id),
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (service_history_id) REFERENCES service_history (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
);
