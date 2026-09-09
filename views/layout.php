<?php
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Peluquería</title>
    <link rel="stylesheet" href="<?= $base ?>/public/css/base.css">
    <link rel="stylesheet" href="<?= $base ?>/public/css/sidebar.css">
    <link rel="stylesheet" href="<?= $base ?>/public/css/components.css">
    <link rel="stylesheet" href="<?= $base ?>/public/css/app-core.css">
</head>

<body>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>

    <header class="mobile-header">
        <button class="mobile-burger" id="mobileBurger" aria-label="Abrir menú de navegación">
            <span></span>
            <span></span>
            <span></span>
        </button>
        <div class="mobile-header__brand">Mi Peluquería</div>
        <div style="width: 28px;"></div>
    </header>

    <div class="app-viewport-container">

        <aside class="premium-sidebar">
            <div class="premium-sidebar__header">
                <div class="premium-sidebar__logo"></div>
                <div class="premium-sidebar__brand">Mi Peluquería</div>
            </div>

            <nav class="premium-sidebar__nav">
                <a href="#" class="nav-item is-active" data-view="appointments">
                    <span style="font-size: 1.1rem;">📅</span> Turnos
                </a>
                <a href="#" class="nav-item" data-view="clients">
                    <span style="font-size: 1.1rem;">👥</span> Clientes
                </a>
                <a href="#" class="nav-item" data-view="services">
                    <span style="font-size: 1.1rem;">✂️</span> Servicios
                </a>
                <a href="#" class="nav-item">
                    <span style="font-size: 1.1rem;">🧴</span> Productos
                </a>
                <a href="#" class="nav-item">
                    <span style="font-size: 1.1rem;">⚙️</span> Ajustes
                </a>
            </nav>

            <div class="premium-sidebar__footer">
                <span class="premium-sidebar__user">Recepción / Admin</span>
                <span>En línea • Conectado</span>
            </div>
        </aside>

        <main class="app-main-content">
            <div id="viewAppointments">
                <?php require __DIR__ . '/calendar_view.php'; ?>
            </div>
            <div id="viewServices" class="is-hidden">
                <?php require __DIR__ . '/services_view.php'; ?>
                <?php require __DIR__ . '/modal_service.php'; ?>
            </div>
            <div id="viewClients" class="is-hidden">
                <?php require __DIR__ . '/clients_view.php'; ?>
                <?php require __DIR__ . '/modal_client.php'; ?>
            </div>
        </main>
    </div>

    <script>
        window.BASE_URL = '<?= $base ?>';
    </script>
    <script src="<?= $base ?>/public/js/main.js" type="module"></script>
</body>

</html>