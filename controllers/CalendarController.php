<?php
require_once __DIR__ . '/../models/CalendarModel.php';

class CalendarController
{
    private CalendarModel $model;

    public function __construct()
    {
        $this->model = new CalendarModel();
    }

    // Renderiza la vista principal HTML del calendario del mes solicitado
    public function index(): void
    {
        // Obtiene mes y año de la URL o toma la fecha actual por defecto
        $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('n');
        $year  = isset($_GET['year'])  ? (int)$_GET['year']  : (int)date('Y');

        // Normalización de navegación previa o posterior (ej. mes 0 a mes 12 del año anterior)
        if ($month < 1) {
            $month = 12;
            $year--;
        }
        if ($month > 12) {
            $month = 1;
            $year++;
        }

        // Restricción de límites para evitar valores fuera de rango o maliciosos en la URL
        $month = min(12, max(1, $month));
        $year  = min(2100, max(2000, $year));

        // Obtiene resumen de eventos e información técnica para construir la grilla del mes
        $ownerId     = Auth::currentUser()['id'];
        $events      = $this->model->getEventsByMonth($ownerId, $year, $month);
        $firstDay    = (int)date('N', mktime(0, 0, 0, $month, 1, $year)); // Día de la semana en que empieza (1=Lun, 7=Dom)
        $daysInMonth = (int)date('t', mktime(0, 0, 0, $month, 1, $year)); // Total de días del mes
        $prevMonth   = $month - 1 < 1  ? 12 : $month - 1;
        $nextMonth   = $month + 1 > 12 ? 1  : $month + 1;
        $prevYear    = $month - 1 < 1  ? $year - 1 : $year;
        $nextYear    = $month + 1 > 12 ? $year + 1 : $year;

        // Carga la plantilla que genera la respuesta HTML completa
        require __DIR__ . '/../views/layout.php';
    }
}
