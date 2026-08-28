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
?>
<div class="app-layout">
    <main class="calendar-wrapper">
        <div class="calendar">
            <div class="calendar__header">
                <h2 class="calendar__title">
                    <span class="calendar__month"><?= $monthNames[$month] ?></span>
                    <span class="calendar__year"><?= $year ?></span>
                </h2>
                <div class="calendar__nav">
                    <a href="?month=<?= $prevMonth ?>&year=<?= $prevYear ?>" class="nav-btn" aria-label="Mes anterior">&#8249;</a>
                    <a href="?month=<?= $nextMonth ?>&year=<?= $nextYear ?>" class="nav-btn" aria-label="Mes siguiente">&#8250;</a>
                </div>
            </div>

            <div class="calendar__grid">
                <?php foreach ($dayNames as $day): ?>
                    <div class="calendar__day-name"><?= $day ?></div>
                <?php endforeach; ?>

                <?php
                $offset        = $firstDay - 1;
                $prevMonthDays = (int)date('t', mktime(0, 0, 0, $prevMonth, 1, $prevYear));
                for ($i = $offset; $i > 0; $i--):
                    $ghostDay = $prevMonthDays - $i + 1;
                ?>
                    <div class="calendar__cell calendar__cell--ghost">
                        <span class="cell__number"><?= $ghostDay ?></span>
                    </div>
                <?php endfor; ?>

                <?php for ($d = 1; $d <= $daysInMonth; $d++):
                    $dateKey  = "$year-" . str_pad($month, 2, '0', STR_PAD_LEFT) . "-" . str_pad($d, 2, '0', STR_PAD_LEFT);
                    $isToday  = $dateKey === $today;
                    $hasEvent = isset($events[$dateKey]);
                    $classes  = 'calendar__cell calendar__cell--active';
                    if ($isToday)  $classes .= ' calendar__cell--today';
                    if ($hasEvent) $classes .= ' calendar__cell--has-event';
                ?>
                    <div class="<?= $classes ?>" data-date="<?= $dateKey ?>">
                        <span class="cell__number"><?= $d ?></span>
                        <?php if ($hasEvent): ?>
                            <div class="cell__events">
                                <?php foreach ($events[$dateKey] as $st):
                                    // Normalizamos el nombre del estado para la clase CSS de manera segura
                                    $statusSlug = strtolower(str_replace([' ', 'ó', 'á', 'é', 'í', 'ú'], ['-', 'o', 'a', 'e', 'i', 'u'], $st['status']));
                                ?>
                                    <span class="cell__status-badge cell__status-badge--<?= $statusSlug ?>"
                                        data-status="<?= $statusSlug ?>"
                                        data-date="<?= $dateKey ?>"
                                        title="<?= htmlspecialchars($st['status']) ?>: <?= $st['total'] ?>">
                                        <?= $st['total'] ?>
                                    </span>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endfor; ?>

                <?php
                $totalCells = $offset + $daysInMonth;
                $remaining  = 42 - $totalCells;
                for ($i = 1; $i <= $remaining; $i++):
                ?>
                    <div class="calendar__cell calendar__cell--ghost">
                        <span class="cell__number"><?= $i ?></span>
                    </div>
                <?php endfor; ?>
            </div>
        </div>
    </main>

    <aside class="day-panel" id="dayPanel">
        <div class="day-panel__header">
            <span class="day-panel__date" id="panelDate"></span>
            <div class="day-panel__actions">
                <button class="btn btn--primary btn--sm" id="btnAddAppointment">+ Turno</button>
                <button class="day-panel__close" id="panelClose" aria-label="Cerrar">&#10005;</button>
            </div>
        </div>
        <div class="day-panel__body" id="panelBody"></div>
    </aside>
</div>

<?php require __DIR__ . '/modal_appointment.php'; ?>