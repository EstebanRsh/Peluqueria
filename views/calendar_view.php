<?php

/**
 * @var int   $month
 * @var int   $year
 * @var int   $prevMonth
 * @var int   $prevYear
 * @var int   $nextMonth
 * @var int   $nextYear
 * @var int   $firstDay
 * @var int   $daysInMonth
 * @var array $events
 */
$monthNames = [
    '',
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
];
$dayNames   = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
$today      = date('Y-m-d');

$monthTotalReservados = 0;
$busyDays = 0;

// Calcular únicamente los turnos RESERVADOS del mes
foreach ($events as $dayEvents) {
    $hasReservations = false;
    foreach ($dayEvents as $dayEvent) {
        if (mb_strtolower($dayEvent['status'], 'UTF-8') === 'reservado') {
            $monthTotalReservados += (int)$dayEvent['total'];
            $hasReservations = true;
        }
    }
    if ($hasReservations) {
        $busyDays++;
    }
}
?>
<div class="admin-view">
    <main class="calendar-wrapper">
        <div class="calendar">
            <div class="calendar__header">
                <h2 class="calendar__title">
                    <span class="calendar__month"><?= $monthNames[$month] ?></span>
                    <span class="calendar__year"><?= $year ?></span>
                </h2>
                <div class="calendar__nav">
                    <a href="?month=<?= $prevMonth ?>&year=<?= $prevYear ?>" class="nav-btn" aria-label="Mes anterior">&#8249;</a>
                    <a href="?month=<?= (int)date('n') ?>&year=<?= (int)date('Y') ?>" class="nav-btn nav-btn--today" aria-label="Ir a hoy">HOY</a>
                    <a href="?month=<?= $nextMonth ?>&year=<?= $nextYear ?>" class="nav-btn" aria-label="Mes siguiente">&#8250;</a>
                </div>
            </div>
            <div class="calendar__grid">
                <?php foreach ($dayNames as $i => $day): ?>
                    <div class="calendar__day-name<?= $i >= 5 ? ' calendar__day-name--weekend' : '' ?>"><?= $day ?></div>
                <?php endforeach; ?>

                <?php
                $offset        = $firstDay - 1;
                $prevMonthDays = (int)date('t', mktime(0, 0, 0, $prevMonth, 1, $prevYear));
                for ($i = $offset; $i > 0; $i--):
                    $ghostDay = $prevMonthDays - $i + 1;
                ?>
                    <div class="calendar__cell calendar__cell--ghost" aria-hidden="true">
                        <span class="cell__number"><?= $ghostDay ?></span>
                    </div>
                <?php endfor; ?>

                <?php for ($d = 1; $d <= $daysInMonth; $d++):
                    $dateKey = sprintf('%04d-%02d-%02d', $year, $month, $d);
                    $isToday  = $dateKey === $today;

                    // Filtrar solo los datos de RESERVADO para la casilla
                    $reservadosCount = 0;
                    if (isset($events[$dateKey])) {
                        foreach ($events[$dateKey] as $dayEvent) {
                            if (mb_strtolower($dayEvent['status'], 'UTF-8') === 'reservado') {
                                $reservadosCount += (int)$dayEvent['total'];
                            }
                        }
                    }

                    $hasEvent = $reservadosCount > 0;
                    $classes  = 'calendar__cell calendar__cell--active';
                    if ($isToday)  $classes .= ' calendar__cell--today';
                    if ($hasEvent) $classes .= ' calendar__cell--has-event';
                ?>
                    <div class="<?= $classes ?>" data-date="<?= $dateKey ?>"
                        role="button" tabindex="0"
                        <?= $isToday ? 'aria-current="date"' : '' ?>
                        aria-label="<?= $d ?> de <?= $monthNames[$month] ?><?= $hasEvent ? ', ' . $reservadosCount . ($reservadosCount === 1 ? ' reserva' : ' reservas') : '' ?>">
                        <span class="cell__number"><?= $d ?></span>

                        <?php if ($hasEvent): ?>
                            <div class="cell__events">
                                <span class="cell__status-badge cell__status-badge--reservado"
                                    data-status="reservado"
                                    data-date="<?= $dateKey ?>"
                                    title="Reservados: <?= $reservadosCount ?>">
                                    <?= $reservadosCount ?>
                                </span>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endfor; ?>

                <?php
                $totalCells = $offset + $daysInMonth;
                $visibleCells = (int)ceil($totalCells / 7) * 7;
                $remaining = $visibleCells - $totalCells;
                for ($i = 1; $i <= $remaining; $i++):
                ?>
                    <div class="calendar__cell calendar__cell--ghost" aria-hidden="true">
                        <span class="cell__number"><?= $i ?></span>
                    </div>
                <?php endfor; ?>
            </div>

            <!-- Resumen limpio y enfocado únicamente en la carga de reservas -->
            <div class="calendar__summary" aria-label="Resumen del mes">
                <span class="summary__item"><b class="summary__num"><?= $monthTotalReservados ?></b> reservas activas</span>
                <span class="summary__item"><b class="summary__num"><?= $busyDays ?></b> días con agenda ocupada</span>
            </div>

            <ul class="calendar__legend" aria-label="Leyenda de estados">
                <li class="legend__item">
                    <span class="legend__swatch cell__status-badge--reservado"></span> Turnos Reservados (Pendientes de atención)
                </li>
            </ul>
        </div>
    </main>
</div>

<!-- =====================================================
     PANEL LATERAL — TURNOS DEL DÍA (AQUÍ SÍ SE GESTIONA EL FLUJO COMPLETO)
====================================================== -->

<div class="side-drawer-overlay" id="dayPanelOverlay"></div>

<aside class="side-drawer side-drawer--wide" id="dayPanel" aria-hidden="true">
    <div class="day-panel__header">
        <span class="day-panel__date" id="panelDate"></span>
        <div class="day-panel__actions">
            <button type="button" class="btn btn--primary btn--sm" id="btnAddAppointment">+ Turno</button>
            <button type="button" class="day-panel__close" id="panelClose" aria-label="Cerrar">×</button>
        </div>
    </div>
    <div class="day-panel__body" id="panelBody"></div>
</aside>

<?php require __DIR__ . '/service_sheet.php'; ?>
<?php require __DIR__ . '/modal_appointment.php'; ?>