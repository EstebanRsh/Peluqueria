<?php
date_default_timezone_set('America/Argentina/Buenos_Aires');

// Registra los errores no controlados y responde con JSON.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

set_exception_handler(function (Throwable $e) {
    error_log($e);
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        ['success' => false, 'error' => 'Error interno del servidor.'],
        JSON_UNESCAPED_UNICODE
    );
});

require_once __DIR__ . '/config/auth.php';

// Valida la petición antes de despachar la acción.
Auth::guard($_GET['action'] ?? '');

require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/CalendarController.php';
require_once __DIR__ . '/controllers/AppointmentController.php';
require_once __DIR__ . '/controllers/ServiceController.php';
require_once __DIR__ . '/controllers/ClientController.php';
require_once __DIR__ . '/controllers/ProductController.php';
require_once __DIR__ . '/controllers/ServiceHistoryController.php';

// Router principal: según el "action" recibido, decide qué controlador
// se hace cargo del pedido. Cada bloque de abajo agrupa las acciones
// (?action=...) que le corresponden a un mismo controlador.
$action = $_GET['action'] ?? '';

// Acciones de autenticación
if (in_array($action, [
    'login',
    'register',
    'logout',
    'session',
    'change_password'
], true)) {
    $controller = new AuthController();
    $controller->handleRequest();
    exit;
}

// Acciones relacionadas con turnos
if (in_array($action, [
    'list',
    'create',
    'delete',
    'update_status',
    'history'
], true)) {
    $controller = new AppointmentController();
    $controller->handleRequest();
    exit;
}

// Acciones relacionadas con la gestión de servicios
if (in_array($action, [
    'services',
    'services_all',
    'service_get',
    'service_create',
    'service_update',
    'service_activate',
    'service_deactivate',
    'service_delete'
], true)) {
    $controller = new ServiceController();
    $controller->handleRequest();
    exit;
}

// Acciones relacionadas con la gestión de clientes
if (in_array($action, [
    'clients_all',
    'client_get',
    'client_search',
    'client_create',
    'client_update',
    'client_activate',
    'client_deactivate',
    'client_delete'
], true)) {
    $controller = new ClientController();
    $controller->handleRequest();
    exit;
}

// Acciones relacionadas con la gestión de productos
if (in_array($action, [
    'products',
    'products_all',
    'product_get',
    'product_search',
    'product_create',
    'product_update',
    'product_activate',
    'product_deactivate',
    'product_delete'
], true)) {
    $controller = new ProductController();
    $controller->handleRequest();
    exit;
}

// Ficha Rápida de servicio (historial técnico y timeline)
if (in_array($action, [
    'service_history_save',
    'client_timeline',
    'service_history_detail'
], true)) {
    $controller = new ServiceHistoryController();
    $controller->handleRequest();
    exit;
}

if ($action !== '') {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        ['success' => false, 'error' => 'Acción no válida.'],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

$controller = new CalendarController();
$controller->index();
