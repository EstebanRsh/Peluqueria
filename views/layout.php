<?php

// ============================================================
// ESTRUCTURA DE LA APLICACIÓN
// Documento base: sidebar, menú móvil, vistas, paneles, botón flotante y pantallas de mensaje.
// ============================================================

$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$baseAttr = htmlspecialchars($base, ENT_QUOTES, 'UTF-8');
$currentUser = Auth::currentUser();

$rawUsername = trim((string)($currentUser['username'] ?? '')) ?: 'Usuario';
$username = htmlspecialchars($rawUsername, ENT_QUOTES, 'UTF-8');
$userInitial = htmlspecialchars(
    mb_strtoupper(mb_substr($rawUsername, 0, 1, 'UTF-8'), 'UTF-8'),
    ENT_QUOTES,
    'UTF-8'
);

$asset = static function (string $path) use ($baseAttr): string {
    $file = dirname(__DIR__) . '/public/' . $path;
    $version = is_file($file) ? '?v=' . filemtime($file) : '';

    return $baseAttr . '/public/' . $path . $version;
};

$iconAttrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HairApp</title>
    <meta name="theme-color" content="#1a1511">
    <meta name="apple-mobile-web-app-title" content="HairApp">
    <link rel="manifest" href="<?= $baseAttr ?>/public/manifest.webmanifest">
    <link rel="icon" type="image/png" sizes="32x32" href="<?= $baseAttr ?>/public/icons/favicon-32.png">
    <link rel="apple-touch-icon" href="<?= $baseAttr ?>/public/icons/apple-touch-icon.png">
    <style>
        html:not(.is-styled) body { visibility: hidden; animation: boot-show 0s 5s forwards; }
        @keyframes boot-show { to { visibility: visible; } }
    </style>
    <link rel="preload" href="<?= $baseAttr ?>/public/fonts/inter-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="<?= $baseAttr ?>/public/fonts/cinzel-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="<?= $baseAttr ?>/public/fonts/alex-brush-latin-400.woff2" as="font" type="font/woff2" crossorigin>

    <link rel="stylesheet" href="<?= $asset('css/base.css') ?>">
    <link rel="stylesheet" href="<?= $asset('css/sidebar.css') ?>">
    <link rel="stylesheet" href="<?= $asset('css/components.css') ?>">
    <link rel="stylesheet" href="<?= $asset('css/app-core.css') ?>">
    <script>
        (function () {
            var show = function () { document.documentElement.classList.add("is-styled"); };
            if (!document.fonts) { show(); return; }
            var faces = ["400 1rem Inter", "500 1rem Inter", "600 1rem Inter", "700 1rem Inter", "500 1rem Cinzel", "700 1rem Cinzel", "1rem 'Alex Brush'"];
            Promise.race([
                Promise.all(faces.map(function (face) { return document.fonts.load(face); })),
                new Promise(function (resolve) { setTimeout(resolve, 3000); })
            ]).then(show, show);
        })();
    </script>
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
                <a href="#" class="nav-item" id="navSettings" aria-haspopup="dialog">
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
                </a>
                <button type="button" class="nav-item" id="navInstall" hidden>
                    <span class="nav-item__icon" aria-hidden="true">
                        <svg <?= $iconAttrs ?>>
                            <path d="M12 3v12" />
                            <path d="M7 10l5 5 5-5" />
                            <path d="M5 21h14" />
                        </svg>
                    </span>
                    <span class="nav-item__label">Instalar app</span>
                </button>
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
            </div>
        </aside>

        <main class="app-main-content" id="mainContent">
            <div id="viewAppointments">
                <?php require __DIR__ . '/calendar_view.php'; ?>
            </div>
            <div id="viewServices" class="is-hidden">
                <?php require __DIR__ . '/services_view.php'; ?>
            </div>
            <div id="viewClients" class="is-hidden">
                <?php require __DIR__ . '/clients_view.php'; ?>
            </div>
            <div id="viewProducts" class="is-hidden">
                <?php require __DIR__ . '/products_view.php'; ?>
            </div>
            <?php require __DIR__ . '/modal_client.php'; ?>
            <?php require __DIR__ . '/modal_product.php'; ?>
            <?php require __DIR__ . '/modal_service.php'; ?>
            <?php require __DIR__ . '/modal_settings.php'; ?>
            <?php require __DIR__ . '/modal_delete_account.php'; ?>
            <?php require __DIR__ . '/service_sheet.php'; ?>
            <?php require __DIR__ . '/modal_appointment.php'; ?>
        </main>
    </div>

    <div class="fab-actions-backdrop" id="fabBackdrop"></div>
    <div class="fab-actions" id="fabActions" hidden>
        <div class="fab-actions__menu" id="fabMenu"></div>
        <template id="fabItemTemplate">
            <button type="button" class="fab-actions__item" tabindex="-1"><span class="fab-actions__label"></span></button>
        </template>
        <template id="fabIconAppointment">
            <svg <?= $iconAttrs ?>><rect x="3" y="4" width="18" height="17" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="12" y1="14" x2="12" y2="18" /><line x1="10" y1="16" x2="14" y2="16" /></svg>
        </template>
        <template id="fabIconHistory">
            <svg <?= $iconAttrs ?>><path d="M9 3h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V4a1 1 0 0 1 1-1z" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="16" y2="15" /></svg>
        </template>
        <template id="fabIconProduct">
            <svg <?= $iconAttrs ?>><path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8" /><path d="M3.27 6.96 12 12l8.73-5.04" /><path d="M12 22V12" /><path d="M8.5 4.27L16 8.5" /></svg>
        </template>
        <template id="fabIconClient">
            <svg <?= $iconAttrs ?>><circle cx="12" cy="7.5" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>
        </template>
        <template id="fabIconService">
            <svg <?= $iconAttrs ?>><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
        </template>
        <button class="fab-actions__toggle" id="fabToggle" type="button" aria-label="Abrir acciones rápidas" title="Abrir acciones rápidas" aria-expanded="false" aria-controls="fabMenu">
            <svg class="fab-actions__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
    </div>

    <dialog class="surface-dialog surface-dialog--wide" id="legalDialog" aria-labelledby="legalDialogTitle">
        <div class="surface__header">
            <h3 class="surface__title" id="legalDialogTitle"></h3>
            <button type="button" class="surface__close" aria-label="Cerrar"></button>
        </div>
        <div class="surface__body legal-doc" id="legalDialogContent"></div>
    </dialog>

    <dialog class="message-screen" id="messageScreen" aria-labelledby="messageTitle" aria-describedby="messageText" tabindex="-1">
        <svg class="message-screen__icon message-screen__icon--success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" />
            <path class="message-screen__mark" d="M7.5 12.5l3 3 6-7" pathLength="1" />
        </svg>
        <svg class="message-screen__icon message-screen__icon--error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" />
            <path class="message-screen__mark" d="M8.5 8.5l7 7M15.5 8.5l-7 7" pathLength="1" />
        </svg>
        <svg class="message-screen__icon message-screen__icon--warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path class="message-screen__mark" d="M12 9v4M12 17h.01" pathLength="1" />
        </svg>
        <svg class="message-screen__icon message-screen__icon--info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" />
            <path class="message-screen__mark" d="M12 11v5M12 8h.01" pathLength="1" />
        </svg>
        <div class="message-screen__body" id="messageBody">
            <h2 class="message-screen__title" id="messageTitle"></h2>
            <p class="message-screen__text" id="messageText"></p>
        </div>
        <ul class="message-screen__changes" id="messageChanges" hidden></ul>
        <template id="messageChangeTemplate">
            <li class="message-screen__change">
                <span class="message-screen__change-name"></span>
                <span class="message-screen__change-stock">
                    <span class="message-screen__change-from"></span>
                    <span class="message-screen__change-arrow" aria-hidden="true"></span>
                    <span class="message-screen__change-to"></span>
                    <svg class="message-screen__change-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                        <path d="M12 19V5M6 11l6-6 6 6" />
                    </svg>
                </span>
            </li>
        </template>
        <div class="message-screen__actions">
            <button type="button" class="btn message-screen__button message-screen__button--cancel" id="messageExtra" hidden></button>
            <button type="button" class="btn message-screen__button message-screen__button--cancel" id="messageCancel" hidden>Cancelar</button>
            <button type="button" class="btn message-screen__button" id="messageAccept" hidden>Entendido</button>
        </div>
    </dialog>

    <!-- Plantillas compartidas de los listados -->
    <template id="tableMessageTemplate">
        <tr><td></td></tr>
    </template>
    <template id="tableMoreTemplate">
        <tr><td class="panel-empty"><button type="button" class="btn btn--ghost btn--sm" data-action="more">Cargar más</button></td></tr>
    </template>
    <template id="panelEmptyTemplate">
        <div class="panel-empty" role="status">
            <div data-text></div>
            <div class="panel-empty__action">
                <button type="button" class="btn btn--primary btn--sm" data-action="new"></button>
            </div>
        </div>
    </template>
    <template id="panelErrorTemplate">
        <div class="panel-error" role="alert">
            <div data-text></div>
            <div class="panel-empty__action">
                <button type="button" class="btn btn--ghost btn--sm" data-action="retry">Reintentar</button>
            </div>
        </div>
    </template>
    <template id="rowToggleTemplate">
        <button type="button" class="row-toggle" aria-haspopup="dialog">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="9 6 15 12 9 18" /></svg>
        </button>
    </template>
    <template id="rowActionsTemplate">
        <div class="data-table__actions">
            <button type="button" class="btn btn--ghost btn--sm btn--row-extra" data-action="profile" title="Ver perfil">
                <span class="btn__icon" aria-hidden="true"><svg <?= $iconAttrs ?>><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg></span><span class="btn__label">Ver perfil</span>
            </button>
            <button type="button" class="btn btn--ghost btn--sm" data-action="edit" title="Editar">
                <span class="btn__icon" aria-hidden="true"><svg <?= $iconAttrs ?>><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></span><span class="btn__label">Editar</span>
            </button>
            <button type="button" class="btn btn--ghost btn--sm" data-action="deactivate" title="Desactivar">
                <span class="btn__icon" aria-hidden="true"><svg <?= $iconAttrs ?>><circle cx="12" cy="12" r="9" /><line x1="8" y1="12" x2="16" y2="12" /></svg></span><span class="btn__label">Desactivar</span>
            </button>
            <button type="button" class="btn btn--ghost btn--sm" data-action="activate" title="Activar">
                <span class="btn__icon" aria-hidden="true"><svg <?= $iconAttrs ?>><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></svg></span><span class="btn__label">Activar</span>
            </button>
            <button type="button" class="btn btn--danger btn--sm" data-action="delete" title="Eliminar">
                <span class="btn__icon" aria-hidden="true"><svg <?= $iconAttrs ?>><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg></span><span class="btn__label">Eliminar</span>
            </button>
        </div>
    </template>

    <script>
        window.BASE_URL = <?= json_encode($base, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
    </script>
    <script src="<?= $asset('js/main.js') ?>" type="module"></script>
</body>

</html>