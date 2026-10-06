<?php

$databaseUser = getenv('DB_USER');
$databasePassword = getenv('DB_PASS');

if ($databaseUser === false || $databaseUser === '' || $databasePassword === false || $databasePassword === '') {
    throw new RuntimeException('Configurá DB_USER y DB_PASS como variables de entorno.');
}

$databaseHost = getenv('DB_HOST');
$databaseName = getenv('DB_NAME');
$databasePort = getenv('DB_PORT');
$validatedPort = $databasePort === false ? 3306 : filter_var($databasePort, FILTER_VALIDATE_INT);

if ($validatedPort === false || $validatedPort < 1 || $validatedPort > 65535) {
    throw new RuntimeException('DB_PORT debe ser un puerto válido entre 1 y 65535.');
}

define('DB_HOST', $databaseHost !== false && $databaseHost !== '' ? $databaseHost : '127.0.0.1');
define('DB_USER', $databaseUser);
define('DB_PASS', $databasePassword);
define('DB_NAME', $databaseName !== false && $databaseName !== '' ? $databaseName : 'peluqueria1');

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
