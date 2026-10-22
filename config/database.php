<?php

// ============================================================
// BASE DE DATOS
// Conexión MySQL con los datos del entorno activo.
// ============================================================

require_once __DIR__ . '/environment.php';

$database = appConfigSection('database');

define('DB_HOST', $database['host']);
define('DB_USER', $database['user']);
define('DB_PASS', $database['password']);
define('DB_NAME', $database['name']);
define('DB_PORT', $database['port']);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function getConnection(): mysqli
{
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
        $conn->set_charset('utf8mb4');
        return $conn;
    } catch (mysqli_sql_exception $e) {
        error_log('Error de conexión: ' . $e->getMessage());
        throw new RuntimeException('Error de conexión a la base de datos.');
    }
}
