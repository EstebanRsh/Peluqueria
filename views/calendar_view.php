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

/* --- Solo presentación (lectura de $events, no altera datos) --- */
$monthTotal = 0;
$busyDays   = 0;
foreach ($events as $dayEvents) {
    $busyDays++;
    foreach ($dayEvents as $st) {
        $monthTotal += (int)$st['total'];
    }
}
$legend = [
    'reservado'         => 'Reservado',
    'en-sala-de-espera' => 'Espera',
    'en-atencion'       => 'Atención',
    'finalizado'        => 'Finalizado',
    'cancelado'         => 'Cancelado',
    'ausente'           => 'Ausente',
];
?>
<div class="app-layout">
    <main class="calendar-wrapper">
        <div class="calendar">

            <!-- ===== CABECERA ===== -->
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

            <!-- ===== RESUMEN DEL MES ===== -->
            <div class="calendar__summary" aria-label="Resumen del mes">
                <span class="summary__item"><b class="summary__num"><?= $monthTotal ?></b> turnos</span>
                <span class="summary__item"><b class="summary__num"><?= $busyDays ?></b> días con agenda</span>
            </div>

            <!-- ===== GRILLA ===== -->
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
                    $dateKey  = sprintf('%04d-%02d-%02d', $year, $month, $d);
                    $isToday  = $dateKey === $today;
                    $hasEvent = isset($events[$dateKey]);
                    $classes  = 'calendar__cell calendar__cell--active';
                    if ($isToday)  $classes .= ' calendar__cell--today';
                    if ($hasEvent) $classes .= ' calendar__cell--has-event';
                    $dayTotal = 0;
                    if ($hasEvent) {
                        foreach ($events[$dateKey] as $st) {
                            $dayTotal += (int)$st['total'];
                        }
                    }
                ?>
                    <div class="<?= $classes ?>" data-date="<?= $dateKey ?>"
                        role="button" tabindex="0"
                        <?= $isToday ? 'aria-current="date"' : '' ?>
                        aria-label="<?= $d ?> de <?= $monthNames[$month] ?><?= $hasEvent ? ', ' . $dayTotal . ' turnos' : '' ?>">
                        <div class="cell__head">
                            <span class="cell__number"><?= $d ?></span>
                            <?php if ($hasEvent): ?>
                                <span class="cell__total"><?= $dayTotal ?></span>
                            <?php endif; ?>
                        </div>
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
                    <div class="calendar__cell calendar__cell--ghost" aria-hidden="true">
                        <span class="cell__number"><?= $i ?></span>
                    </div>
                <?php endfor; ?>
            </div>

            <!-- ===== LEYENDA DE ESTADOS ===== -->
            <ul class="calendar__legend" aria-label="Leyenda de estados">
                <?php foreach ($legend as $slug => $label): ?>
                    <li class="legend__item">
                        <span class="legend__swatch cell__status-badge--<?= $slug ?>"></span><?= $label ?>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>
    </main>
</div>

<!-- =====================================================
     PANEL LATERAL — TURNOS DEL DÍA
====================================================== -->

<div class="side-drawer-overlay" id="dayPanelOverlay"></div>

<aside class="side-drawer side-drawer--wide" id="dayPanel" aria-hidden="true">
    <div class="day-panel__header">
        <div class="day-panel__title">
            <span class="day-panel__kicker">Agenda del día</span>
            <span class="day-panel__date" id="panelDate"></span>
        </div>
        <div class="day-panel__actions">
            <button class="btn btn--primary btn--sm" id="btnAddAppointment" type="button">+ Turno</button>
            <button class="day-panel__close" id="panelClose" type="button" aria-label="Cerrar">×</button>
        </div>
    </div>
    <div class="day-panel__body" id="panelBody"></div>
</aside>

<!-- ============================================================
     ACCIONES RÁPIDAS (FAB) — rectangular, anclado sobre la bottom bar
============================================================= -->
<div class="fab-actions-backdrop" id="fabBackdrop"></div>

<div class="fab-actions" id="fabActions">
    <div class="fab-actions__menu" id="fabMenu">
        <button class="fab-actions__item fab-actions__item--accent" id="btnNewAppointment" type="button" tabindex="-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
                <rect x="3" y="4" width="18" height="17" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="12" y1="14" x2="12" y2="18" />
                <line x1="10" y1="16" x2="14" y2="16" />
            </svg>
            <span>Nuevo Turno</span>
        </button>
        <button class="fab-actions__item" id="btnNewHistory" type="button" tabindex="-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
                <path d="M9 3h6v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2z" />
                <line x1="8" y1="11" x2="16" y2="11" />
                <line x1="8" y1="15" x2="16" y2="15" />
            </svg>
            <span>Nueva Historia</span>
        </button>
        <button class="fab-actions__item" id="btnNewProduct" type="button" tabindex="-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
                <path d="M21 8v8l-9 5-9-5V8" />
                <path d="M3 8l9 5 9-5-9-5z" />
                <path d="M12 22V13" />
            </svg>
            <span>Nuevo Producto</span>
        </button>
        <button class="fab-actions__item" id="btnNewCustomer" type="button" tabindex="-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
                <rect x="8" y="3" width="8" height="8" />
                <path d="M4 21v-3a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v3" />
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

<!-- Microinteracción mecánica: feedback de pulsado + vibración corta.
     Autónomo: no toca la lógica de la app. Mover luego a public/js/ui-feel.js -->
<script>
(function () {
  if (window.__uiFeel) return;
  window.__uiFeel = true;
  var SEL = '.btn, .nav-btn, .btn-filter, .fab-actions__item, .fab-actions__toggle, .calendar__cell--active, .day-panel__close';
  var held = null;
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest(SEL);
    if (!el) return;
    held = el;
    el.classList.add('is-pressed');
    if (navigator.vibrate) navigator.vibrate(8);
  }, { passive: true });
  function release() {
    if (held) { held.classList.remove('is-pressed'); held = null; }
  }
  ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach(function (t) {
    document.addEventListener(t, release, true);
  });
  /* Teclado: Enter/Espacio sobre celdas role="button" disparan click */
  document.addEventListener('keydown', function (e) {
    var c = e.target.closest && e.target.closest('.calendar__cell--active');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.click(); }
  });
})();
</script>