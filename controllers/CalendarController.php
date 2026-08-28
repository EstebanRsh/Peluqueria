<?php
require_once __DIR__ . '/../models/CalendarModel.php';

class CalendarController {
    private CalendarModel $model;

    public function __construct() {
        $this->model = new CalendarModel();
    }

    public function index(): void {
        $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('n');
        $year  = isset($_GET['year'])  ? (int)$_GET['year']  : (int)date('Y');

        if ($month < 1) { $month = 12; $year--; }
        if ($month > 12) { $month = 1;  $year++; }

        $events    = $this->model->getEventsByMonth($year, $month);
        $firstDay  = (int)date('N', mktime(0, 0, 0, $month, 1, $year));
        $daysInMonth = (int)date('t', mktime(0, 0, 0, $month, 1, $year));
        $prevMonth = $month - 1 < 1  ? 12 : $month - 1;
        $nextMonth = $month + 1 > 12 ? 1  : $month + 1;
        $prevYear  = $month - 1 < 1  ? $year - 1 : $year;
        $nextYear  = $month + 1 > 12 ? $year + 1 : $year;

        require __DIR__ . '/../views/layout.php';
    }
}