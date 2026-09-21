-- =========================================================
-- BASE DE DATOS: peluqueria
-- =========================================================
CREATE DATABASE IF NOT EXISTS peluqueria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE peluqueria;

-- =========================================================
-- 1. SERVICIOS
-- =========================================================
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del servicio',
    name VARCHAR(100) NOT NULL COMMENT 'Nombre descriptivo',
    description TEXT COMMENT 'Descripción detallada',
    duration INT NOT NULL COMMENT 'Duración estimada en minutos',
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Precio base',
    active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Disponible para agendar (1=Sí, 0=No)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- 2. CLIENTES (Perfil y Diagnóstico Capilar Integrado)
-- =========================================================
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    internal_code VARCHAR(40) UNIQUE COMMENT 'Código interno para búsqueda rápida',
    alias VARCHAR(100) NOT NULL COMMENT 'Nombre o apodo',
    
    -- Diagnóstico Base
    natural_base_tone VARCHAR(30) NULL COMMENT 'Tono natural, ej: Castaño oscuro (3)',
    grey_hair TINYINT NULL COMMENT 'Porcentaje de canas (0-100)',
    hair_type VARCHAR(100) NULL COMMENT 'Textura: Fino, grueso, poroso',
    allergies TEXT NULL COMMENT 'Alergias o sensibilidad',
    
    notes TEXT COMMENT 'Notas generales',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_clients_alias (alias),
    INDEX idx_clients_active (active)
);

-- =========================================================
-- 3. TURNOS
-- =========================================================
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NULL COMMENT 'NULL si es cliente no registrado',
    client_name VARCHAR(255) NULL COMMENT 'Nombre manual si no está en DB',
    service_id INT NOT NULL,
    stylist VARCHAR(100) COMMENT 'Profesional asignado',
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Precio final cobrado',
    notes TEXT COMMENT 'Anotaciones particulares del turno',
    status ENUM('Reservado', 'En sala de espera', 'En atención', 'Finalizado', 'Cancelado', 'Ausente') NOT NULL DEFAULT 'Reservado',
    date DATE NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

-- =========================================================
-- 4. HISTORIAL DE ESTADOS DE TURNOS (Auditoría)
-- =========================================================
CREATE TABLE IF NOT EXISTS appointment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    status_from VARCHAR(50) NULL,
    status_to VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- =========================================================
-- 5. HISTORIAL TÉCNICO (Ficha Dinámica con JSON)
-- =========================================================
CREATE TABLE IF NOT EXISTS service_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NULL,
    appointment_id INT NOT NULL,
    service_id INT NOT NULL,
    service_name_snapshot VARCHAR(100) NOT NULL COMMENT 'Snapshot del nombre del servicio',
    performed_at DATETIME NOT NULL COMMENT 'Fecha de realización',
    
    -- Columna JSON para almacenar datos específicos según el tipo de servicio
    technical_details JSON COMMENT 'Detalles técnicos dinámicos (color, alisado, corte)',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
    UNIQUE (appointment_id)
);

-- =========================================================
-- 6. INVENTARIO (Productos)
-- =========================================================
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100) NULL,
    measurement_unit ENUM('ml', 'g', 'unidad') NOT NULL DEFAULT 'ml',
    stock DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Cantidad disponible actual',
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Costo por cada 1 ml, g o unidad',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- 7. CONSUMOS POR SERVICIO (Rentabilidad)
-- =========================================================
CREATE TABLE IF NOT EXISTS service_consumptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_history_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_used DECIMAL(8,2) NOT NULL COMMENT 'Cantidad exacta utilizada en el servicio',
    cost_snapshot DECIMAL(10,2) NOT NULL COMMENT 'Costo calculado al momento del servicio (quantity * unit_cost)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (service_history_id) REFERENCES service_history(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);