<?php

// Valores locales seguros y compatibles con XAMPP/MariaDB/MySQL.
// Si una computadora necesita credenciales específicas, puede definirlas
// mediante variables de entorno antes de iniciar PHP.
$databaseUser = getenv('DB_USER') ?: 'root';
$databasePassword = getenv('DB_PASS') ?: '';
$databaseHost = getenv('DB_HOST') ?: '127.0.0.1';
$databaseName = getenv('DB_NAME') ?: 'peluqueria';
$databasePort = getenv('DB_PORT') ?: '3306';

$validatedPort = filter_var($databasePort, FILTER_VALIDATE_INT);

if ($validatedPort === false || $validatedPort < 1 || $validatedPort > 65535) {
    throw new RuntimeException('DB_PORT debe ser un puerto válido entre 1 y 65535.');
}

define('DB_HOST', $databaseHost);
define('DB_USER', $databaseUser);
define('DB_PASS', $databasePassword);
define('DB_NAME', $databaseName);
define('DB_PORT', $validatedPort);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function getConnection(): mysqli
{
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
        $conn->set_charset('utf8mb4');
        return $conn;
    } catch (mysqli_sql_exception $e) {
        // No se expone el detalle al cliente; el manejador global responde JSON 500.
        error_log('Error de conexión: ' . $e->getMessage());
        throw new RuntimeException('Error de conexión a la base de datos.');
    }
}
