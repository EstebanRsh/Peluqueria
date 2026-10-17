<?php
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$baseAttr = htmlspecialchars($base, ENT_QUOTES, 'UTF-8');
$currentUser = Auth::currentUser();

// La inicial se calcula sobre el nombre original y recién después se escapa
$rawUsername = trim((string)($currentUser['username'] ?? '')) ?: 'Usuario';
$username = htmlspecialchars($rawUsername, ENT_QUOTES, 'UTF-8');
$userInitial = htmlspecialchars(
    mb_strtoupper(mb_substr($rawUsername, 0, 1, 'UTF-8'), 'UTF-8'),
    ENT_QUOTES,
    'UTF-8'
);

// URL de un recurso público con versión (fecha de modificación) para evitar caché vieja
$asset = static function (string $path) use ($baseAttr): string {
    $file = dirname(__DIR__) . '/public/' . $path;
    $version = is_file($file) ? '?v=' . filemtime($file) : '';

    return $baseAttr . '/public/' . $path . $version;
};

// Atributos comunes de los íconos del menú
$iconAttrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HairApp</title>
    <!-- Fuentes: Alex Brush y Cinzel para la marca, Inter para el texto -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="<?= $asset('css/base.css') ?>">
    <link rel="stylesheet" href="<?= $asset('css/sidebar.css') ?>">
    <link rel="stylesheet" href="<?= $asset('css/components.css') ?>">
    <link rel="stylesheet" href="<?= $asset('css/app-core.css') ?>">
</head>

<body>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>

    <header class="mobile-header">
        <button type="button" class="mobile-burger" id="mobileBurger" aria-label="Abrir menú de navegación" aria-controls="sidebar" aria-expanded="false">
            <span></span>
            <span></span>
            <span></span>
        </button>
        <div class="mobile-header__brand">
            <span class="brand-script">Hair</span>
            <span class="brand-script brand-script--space">App</span>
        </div>
        <div class="mobile-header__spacer" aria-hidden="true"></div>
    </header>

    <div class="app-viewport-container">

        <aside class="premium-sidebar" id="sidebar" aria-label="Menú principal">
            <div class="premium-sidebar__header">
                <div class="premium-sidebar__brand">
                    <span class="brand-script">Hair</span>
                    <span class="brand-script brand-script--space">App</span>
                </div>
            </div>

            <nav class="premium-sidebar__nav" aria-label="Secciones">
                <a href="#" class="nav-item is-active" data-view="appointments" aria-current="page">
                    <span class="nav-item__icon" aria-hidden="true">
                        <svg <?= $iconAttrs ?>>
                            <rect x="3" y="4" width="18" height="17" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </span>
                    <span class="nav-item__label">Turnos</span>
                </a>
                <a href="#" class="nav-item" data-view="clients">
                    <span class="nav-item__icon" aria-hidden="true">
                        <svg <?= $iconAttrs ?>>
                            <circle cx="9" cy="7.5" r="3.5" />
                            <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                            <path d="M16 4.3a3.5 3.5 0 0 1 0 6.4" />
                            <path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
                        </svg>
                    </span>
                    <span class="nav-item__label">Clientes</span>
                </a>
                <a href="#" class="nav-item" data-view="services">
                    <span class="nav-item__icon" aria-hidden="true">
                        <svg <?= $iconAttrs ?>>
                            <circle cx="6" cy="6" r="3" />
                            <circle cx="6" cy="18" r="3" />
                            <line x1="20" y1="4" x2="8.12" y2="15.88" />
                            <line x1="14.47" y1="14.48" x2="20" y2="20" />
                            <line x1="8.12" y1="8.12" x2="12" y2="12" />
                        </svg>
                    </span>
                    <span class="nav-item__label">Servicios</span>
                </a>
                <a href="#" class="nav-item" data-view="products">
                    <span class="nav-item__icon" aria-hidden="true">
                        <svg <?= $iconAttrs ?>>
                            <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8" />
                            <path d="M3.27 6.96 12 12l8.73-5.04" />
                            <path d="M12 22V12" />
                            <path d="M8.5 4.27 16 8.5" />
                        </svg>
                    </span>
                    <span class="nav-item__label">Productos</span>
                </a>
                <!-- Sin vista todavía: se muestra deshabilitado -->
                <span class="nav-item nav-item--disabled" aria-disabled="true" title="Próximamente">
                    <span class="nav-item__icon" aria-hidden="true">
                        <svg <?= $iconAttrs ?>>
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="4" y1="12" x2="20" y2="12" />
                            <line x1="4" y1="18" x2="20" y2="18" />
                            <circle cx="9" cy="6" r="2" />
                            <circle cx="15" cy="12" r="2" />
                            <circle cx="8" cy="18" r="2" />
                        </svg>
                    </span>
                    <span class="nav-item__label">Ajustes</span>
                </span>
            </nav>

            <div class="premium-sidebar__footer">
                <div class="premium-sidebar__user-box">
                    <div class="premium-sidebar__avatar" aria-hidden="true"><?= $userInitial ?></div>
                    <div class="premium-sidebar__user-info">
                        <span class="premium-sidebar__user"><?= $username ?></span>
                        <span class="premium-sidebar__role">Sesión activa</span>
                    </div>
                </div>
                <button type="button" id="logoutButton" class="premium-sidebar__logout">
                    <span class="logout-icon" aria-hidden="true">
                        <svg <?= $iconAttrs ?>>
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </span>
                    <span class="logout-label">Cerrar sesión</span>
                </button>
                <p id="logoutMessage" role="status" aria-live="polite" class="logout-message"></p>
            </div>
        </aside>

        <main class="app-main-content" id="mainContent">
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
            <div id="viewProducts" class="is-hidden">
                <?php require __DIR__ . '/products_view.php'; ?>
                <?php require __DIR__ . '/modal_product.php'; ?>
            </div>
        </main>
    </div>

    <div class="fab-actions-backdrop" id="fabBackdrop"></div>
    <div class="fab-actions" id="fabActions" hidden>
        <div class="fab-actions__menu" id="fabMenu"></div>
        <button class="fab-actions__toggle" id="fabToggle" type="button" aria-label="Abrir acciones rápidas" aria-expanded="false" aria-controls="fabMenu">
            <svg class="fab-actions__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
    </div>

    <script>
        window.BASE_URL = <?= json_encode($base, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
    </script>
    <script src="<?= $asset('js/main.js') ?>" type="module"></script>
</body>

</html>