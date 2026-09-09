<?php
date_default_timezone_set('America/Argentina/Buenos_Aires');

require_once __DIR__ . '/controllers/CalendarController.php';
require_once __DIR__ . '/controllers/AppointmentController.php';
require_once __DIR__ . '/controllers/ServiceController.php';
require_once __DIR__ . '/controllers/ClientController.php';

$action = $_GET['action'] ?? '';

// Acciones relacionadas con turnos
if (
    in_array(
        $action,
        [
            'list',
            'create',
            'delete',
            'update_status',
            'history'
        ]
    )
) {
    $controller = new AppointmentController();
    $controller->handleRequest();
    exit;
}

// Acciones relacionadas con la gestión de servicios
if (
    in_array(
        $action,
        [
            'services',
            'services_all',
            'service_get',
            'service_create',
            'service_update',
            'service_activate',
            'service_deactivate',
            'service_delete'
        ]
    )
) {
    $controller = new ServiceController();
    $controller->handleRequest();
    exit;
}

// Acciones relacionadas con la gestión de clientes
if (
    in_array(
        $action,
        [
            'clients',
            'clients_all',
            'client_get',
            'client_search',
            'client_create',
            'client_update',
            'client_activate',
            'client_deactivate',
            'client_delete'
        ]
    )
) {
    $controller = new ClientController();
    $controller->handleRequest();
    exit;
}

$controller = new CalendarController();
$controller->index();
