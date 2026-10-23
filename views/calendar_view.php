<?php

// ============================================================
// VISTA DEL CALENDARIO
// Grilla del mes (6 semanas), resumen, panel del día y ventanita de estado.
// ============================================================

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

$month     = (int)$month;
$year      = (int)$year;
$monthName = $monthNames[$month] ?? '';

$totalCalendarCells = 42;

$isReservado = static fn(array $dayEvent): bool =>
mb_strtolower((string)($dayEvent['status'] ?? ''), 'UTF-8') === 'reservado';

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
$monthTotalFinalizados = 0;
$busyDays = 0;

foreach ($events as $dayEvents) {
    $monthTotalFinalizados += $countStatus($dayEvents, 'finalizado');
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

            <!-- Resumen del mes y leyenda -->
            <ul class="calendar__legend" aria-label="Resumen del mes">
                <li class="legend__item">
                    <span class="legend__swatch cell__status-badge--reservado" aria-hidden="true"></span>
                    <b class="legend__num" data-summary="reservas"><?= $monthTotalReservados ?></b> Reservados
                </li>
                <li class="legend__item">
                    <span class="legend__swatch cell__status-badge--finalizado" aria-hidden="true"></span>
                    <b class="legend__num" data-summary="finalizados"><?= $monthTotalFinalizados ?></b> Finalizados
                </li>
                <li class="legend__item">
                    <b class="legend__num" data-summary="dias"><?= $busyDays ?></b> días con turnos reservados
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
    <div class="surface__header">
        <span class="surface__title" id="panelDate"></span>
        <div class="surface__actions">
            <button type="button" class="btn btn--primary btn--sm" id="btnAddAppointment">+ Turno</button>
            <button type="button" class="surface__close" id="panelClose" aria-label="Cerrar">×</button>
        </div>
    </div>
    <div class="surface__body" id="panelBody"></div>
</aside>

<!-- =====================================================
     VENTANITA DE ESTADO DEL TURNO
====================================================== -->

<dialog class="surface-dialog surface-dialog--full" id="statusDialog" aria-labelledby="statusDialogName">
    <div class="surface__header">
        <div class="surface__heading">
            <h3 class="surface__title" id="statusDialogName"></h3>
            <p class="surface__meta" id="statusDialogMeta"></p>
        </div>
        <button type="button" class="surface__close" id="statusDialogClose" aria-label="Cerrar">×</button>
    </div>
    <div class="surface__body">
        <div class="status-options" role="group" aria-label="Estado del turno">
            <button type="button" class="status-option status-option--reservado" data-set-status="Reservado" aria-pressed="false">
                <svg class="status-option__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                <span class="status-option__text">
                    <span class="status-option__label">Reservado</span>
                    <span class="status-option__desc">El turno está agendado y pendiente de atender.</span>
                </span>
                <svg class="status-option__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12" /></svg></button>
            <button type="button" class="status-option status-option--finalizado" data-set-status="Finalizado" aria-pressed="false">
                <svg class="status-option__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" /></svg>
                <span class="status-option__text">
                    <span class="status-option__label">Finalizado</span>
                    <span class="status-option__desc">Se atendió al cliente. Vas a confirmar los datos y cargar la ficha.</span>
                </span>
                <svg class="status-option__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12" /></svg></button>
            <button type="button" class="status-option status-option--ausente" data-set-status="Ausente" aria-pressed="false">
                <svg class="status-option__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" /><path d="m17 8 5 5M22 8l-5 5" /></svg>
                <span class="status-option__text">
                    <span class="status-option__label">Ausente</span>
                    <span class="status-option__desc">El cliente no se presentó. Libera el horario.</span>
                </span>
                <svg class="status-option__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12" /></svg></button>
            <button type="button" class="status-option status-option--cancelado" data-set-status="Cancelado" aria-pressed="false">
                <svg class="status-option__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></svg>
                <span class="status-option__text">
                    <span class="status-option__label">Cancelado</span>
                    <span class="status-option__desc">Se canceló el turno. Libera el horario.</span>
                </span>
                <svg class="status-option__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12" /></svg></button>
        </div>
    </div>
</dialog>

<?php require __DIR__ . '/service_sheet.php'; ?>
<?php require __DIR__ . '/modal_appointment.php'; ?>