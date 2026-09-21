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
                    $dateKey = sprintf('%04d-%02d-%02d', $year, $month, $d);
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
                                    $lowerStatus = mb_strtolower($st['status'], 'UTF-8');
                                    $statusSlug  = str_replace(
                                        [' ', 'á', 'é', 'í', 'ó', 'ú', 'ñ'],
                                        ['-', 'a', 'e', 'i', 'o', 'u', 'n'],
                                        $lowerStatus
                                    );
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

</div>

<!-- =====================================================
     PANEL LATERAL — TURNOS DEL DÍA
====================================================== -->

<div class="side-drawer-overlay" id="dayPanelOverlay"></div>

<aside class="side-drawer side-drawer--wide" id="dayPanel" aria-hidden="true">
    <div class="day-panel__header">
        <span class="day-panel__date" id="panelDate"></span>
        <div class="day-panel__actions">
            <button class="btn btn--primary btn--sm" id="btnAddAppointment">+ Turno</button>
            <button class="day-panel__close" id="panelClose" aria-label="Cerrar">×</button>
        </div>
    </div>
    <div class="day-panel__body" id="panelBody"></div>
</aside>
<!-- ============================================================
     BOTÓN FLOTANTE DE ACCIONES RÁPIDAS (FAB)
============================================================= -->
<div class="fab-actions-backdrop" id="fabBackdrop"></div>

<div class="fab-actions" id="fabActions">
    <div class="fab-actions__menu" id="fabMenu">
        <button class="fab-actions__item fab-actions__item--accent" id="btnNewAppointment" type="button" tabindex="-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="12" y1="14" x2="12" y2="18" />
                <line x1="10" y1="16" x2="14" y2="16" />
            </svg>
            <span>Nuevo Turno</span>
        </button>
        <button class="fab-actions__item" id="btnNewHistory" type="button" tabindex="-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 3h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V4a1 1 0 0 1 1-1z" />
                <line x1="8" y1="11" x2="16" y2="11" />
                <line x1="8" y1="15" x2="16" y2="15" />
            </svg>
            <span>Nueva Historia</span>
        </button>

        <button class="fab-actions__item" id="btnNewProduct" type="button" tabindex="-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8" />
                <path d="M3.27 6.96 12 12l8.73-5.04" />
                <path d="M12 22V12" />
                <path d="M8.5 4.27L16 8.5" />
            </svg>
            <span>Nuevo Producto</span>
        </button>

        <button class="fab-actions__item" id="btnNewCustomer" type="button" tabindex="-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="7.5" r="4" />
                <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
            </svg>
            <span>Nuevo Cliente</span>
        </button>

    </div>

    <button class="fab-actions__toggle" id="fabToggle" type="button" aria-label="Abrir acciones rápidas" aria-expanded="false" aria-controls="fabMenu">
        <span class="fab-actions__toggle-icon">+</span>
    </button>
</div>
<?php require __DIR__ . '/service_sheet.php'; ?>
<?php require __DIR__ . '/modal_appointment.php'; ?>