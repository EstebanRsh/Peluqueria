<?php
date_default_timezone_set('America/Argentina/Buenos_Aires');

require_once __DIR__ . '/controllers/CalendarController.php';
require_once __DIR__ . '/controllers/AppointmentController.php';

$action = $_GET['action'] ?? '';

// Acciones relacionadas con turnos y servicios
if (
    in_array(
        $action,
        [
            'list',
            'create',
            'delete',
            'update_status',
            'history',
            'services'
        ]
    )
) {
    $controller = new AppointmentController();
    $controller->handleRequest();
    exit;
}

$controller = new CalendarController();
$controller->index();
