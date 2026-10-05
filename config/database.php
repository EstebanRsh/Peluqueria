<?php
define('DB_HOST', '127.0.0.1');
define('DB_USER', 'root');
define('DB_PASS', '1234');
define('DB_NAME', 'peluqueria');

define('DB_PORT', 3306);

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
