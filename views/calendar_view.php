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

// Valores numéricos garantizados antes de imprimirlos o armar fechas
$month     = (int)$month;
$year      = (int)$year;
$monthName = $monthNames[$month] ?? '';

// El calendario siempre muestra 6 semanas (42 celdas), sin importar el mes
$totalCalendarCells = 42;

/** Indica si un evento corresponde a un turno RESERVADO. */
$isReservado = static fn(array $dayEvent): bool =>
mb_strtolower((string)($dayEvent['status'] ?? ''), 'UTF-8') === 'reservado';

/** Cantidad de turnos de un día con el estado indicado (por ejemplo, "finalizado"). */
$countStatus = static function (array $dayEvents, string $status): int {
    $total = 0;
    foreach ($dayEvents as $dayEvent) {
        if (mb_strtolower((string)($dayEvent['status'] ?? ''), 'UTF-8') === $status) {
            $total += (int)($dayEvent['total'] ?? 0);
        }
    }

    return $total;
};

$monthTotalReservados = 0;
$busyDays = 0;

// Calcular únicamente los turnos RESERVADOS del mes
foreach ($events as $dayEvents) {
    $hasReservations = false;
    foreach ($dayEvents as $dayEvent) {
        if ($isReservado($dayEvent)) {
            $monthTotalReservados += (int)($dayEvent['total'] ?? 0);
            $hasReservations = true;
        }
    }
    if ($hasReservations) {
        $busyDays++;
    }
}
?>
<div class="admin-view admin-view--calendar">
    <section class="calendar-wrapper" aria-label="Calendario de turnos">
        <div class="calendar">
            <div class="calendar__header">
                <h2 class="calendar__title" tabindex="-1">
                    <span class="calendar__month"><?= $monthName ?></span>
                    <span class="calendar__year"><?= $year ?></span>
                </h2>
                <div class="calendar__nav">
                    <a href="?month=<?= (int)$prevMonth ?>&amp;year=<?= (int)$prevYear ?>" class="nav-btn" aria-label="Mes anterior">&#8249;</a>
                    <a href="?month=<?= (int)date('n') ?>&amp;year=<?= (int)date('Y') ?>" class="nav-btn nav-btn--today" aria-label="Ir a hoy">HOY</a>
                    <a href="?month=<?= (int)$nextMonth ?>&amp;year=<?= (int)$nextYear ?>" class="nav-btn" aria-label="Mes siguiente">&#8250;</a>
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

                    $reservadosCount  = $countStatus($events[$dateKey] ?? [], 'reservado');
                    $finalizadosCount = $countStatus($events[$dateKey] ?? [], 'finalizado');

                    $hasEvent = $reservadosCount > 0 || $finalizadosCount > 0;
                    $classes  = 'calendar__cell calendar__cell--active';
                    if ($isToday)  $classes .= ' calendar__cell--today';
                ?>
                    <div class="<?= $classes ?>" data-date="<?= $dateKey ?>"
                        role="button" tabindex="0"
                        <?= $isToday ? 'aria-current="date"' : '' ?>
                        aria-label="<?= $d ?> de <?= $monthName ?><?= $reservadosCount > 0 ? ', ' . $reservadosCount . ($reservadosCount === 1 ? ' reserva' : ' reservas') : '' ?><?= $finalizadosCount > 0 ? ', ' . $finalizadosCount . ($finalizadosCount === 1 ? ' finalizado' : ' finalizados') : '' ?>">
                        <span class="cell__number"><?= $d ?></span>

                        <?php if ($hasEvent): ?>
                            <div class="cell__events">
                                <?php if ($finalizadosCount > 0): ?>
                                    <span class="cell__status-badge cell__status-badge--finalizado"
                                        data-status="finalizado"
                                        data-date="<?= $dateKey ?>"
                                        title="Finalizados: <?= $finalizadosCount ?>">
                                        <?= $finalizadosCount ?>
                                    </span>
                                <?php endif; ?>
                                <?php if ($reservadosCount > 0): ?>
                                    <span class="cell__status-badge cell__status-badge--reservado"
                                        data-status="reservado"
                                        data-date="<?= $dateKey ?>"
                                        title="Reservados: <?= $reservadosCount ?>">
                                        <?= $reservadosCount ?>
                                    </span>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endfor; ?>

                <?php
                $remaining = max(0, $totalCalendarCells - ($offset + $daysInMonth));
                for ($i = 1; $i <= $remaining; $i++):
                ?>
                    <div class="calendar__cell calendar__cell--ghost" aria-hidden="true">
                        <span class="cell__number"><?= $i ?></span>
                    </div>
                <?php endfor; ?>
            </div>

            <!-- Resumen limpio y enfocado únicamente en la carga de reservas -->
            <div class="calendar__summary" role="group" aria-label="Resumen del mes">
                <span class="summary__item"><b class="summary__num" data-summary="reservas"><?= $monthTotalReservados ?></b> reservas activas</span>
                <span class="summary__item"><b class="summary__num" data-summary="dias"><?= $busyDays ?></b> días con agenda ocupada</span>
            </div>

            <ul class="calendar__legend" aria-label="Leyenda de estados">
                <li class="legend__item">
                    <span class="legend__swatch cell__status-badge--reservado" aria-hidden="true"></span> Turnos Reservados (Pendientes de atención)
                </li>
                <li class="legend__item">
                    <span class="legend__swatch cell__status-badge--finalizado" aria-hidden="true"></span> Turnos Finalizados
                </li>
            </ul>
        </div>
    </section>
</div>

<!-- =====================================================
     PANEL LATERAL — TURNOS DEL DÍA (AQUÍ SÍ SE GESTIONA EL FLUJO COMPLETO)
====================================================== -->

<div class="side-drawer-overlay" id="dayPanelOverlay"></div>

<aside class="side-drawer side-drawer--wide" id="dayPanel"
    role="dialog" aria-modal="true" aria-labelledby="panelDate" aria-hidden="true" tabindex="-1">
    <div class="day-panel__header">
        <span class="day-panel__date" id="panelDate"></span>
        <div class="day-panel__actions">
            <button type="button" class="btn btn--primary btn--sm" id="btnAddAppointment">+ Turno</button>
            <button type="button" class="day-panel__close" id="panelClose" aria-label="Cerrar">×</button>
        </div>
    </div>
    <div class="day-panel__body" id="panelBody"></div>
</aside>

<!-- =====================================================
     VENTANITA DE ESTADO DEL TURNO
====================================================== -->

<dialog class="status-dialog" id="statusDialog" aria-labelledby="statusDialogName">
    <div class="status-dialog__body">
        <div class="status-dialog__header">
            <div>
                <h3 class="status-dialog__name" id="statusDialogName"></h3>
                <p class="status-dialog__meta" id="statusDialogMeta"></p>
            </div>
            <button type="button" class="day-panel__close" id="statusDialogClose" aria-label="Cerrar">×</button>
        </div>

        <div class="status-dialog__options" role="group" aria-label="Estado del turno">
            <button type="button" class="status-dialog__option status-dialog__option--reservado" data-set-status="Reservado" aria-pressed="false">Reservado<svg class="status-dialog__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12" /></svg></button>
            <button type="button" class="status-dialog__option status-dialog__option--finalizado" data-set-status="Finalizado" aria-pressed="false">Finalizado<svg class="status-dialog__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12" /></svg></button>
            <button type="button" class="status-dialog__option status-dialog__option--ausente" data-set-status="Ausente" aria-pressed="false">Ausente<svg class="status-dialog__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12" /></svg></button>
            <button type="button" class="status-dialog__option status-dialog__option--cancelado" data-set-status="Cancelado" aria-pressed="false">Cancelado<svg class="status-dialog__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12" /></svg></button>
        </div>
    </div>
</dialog>

<?php require __DIR__ . '/service_sheet.php'; ?>
<?php require __DIR__ . '/modal_appointment.php'; ?>