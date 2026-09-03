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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- TURNOS
-- =========================================================

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
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
        ON DELETE RESTRICT
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

-- =========================================================
-- SERVICIOS INICIALES
-- =========================================================

INSERT INTO services (name, description, duration, price) VALUES
('Corte', 'Corte de cabello', 30, 0.00),
('Corte + barba', 'Corte de cabello y arreglo de barba', 45, 0.00),
('Lavado', 'Lavado de cabello', 15, 0.00),
('Peinado', 'Peinado', 30, 0.00),
('Coloración', 'Coloración de cabello', 120, 0.00);
