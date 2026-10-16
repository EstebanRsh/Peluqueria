<?php
require_once __DIR__ . '/config/auth.php';
Auth::guard('auth_page');

$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
$registrationEnabled = Auth::publicRegistrationEnabled();
$iconAttrs = 'viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Acceso - HairApp</title>
    <!-- Mismas fuentes y hojas de estilo que el resto de la aplicación -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/css/base.css">
    <link rel="stylesheet" href="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/css/sidebar.css">
    <link rel="stylesheet" href="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/css/components.css">
    <link rel="stylesheet" href="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/css/app-core.css">
</head>

<!-- El fondo (textura SVG del sidebar) y todo el layout del login viven en app-core.css (.login-page) -->

<body class="login-page">
    <div class="login-shell">

        <!-- Columna izquierda: marca y la historia de la app (el texto tiene su propio scroll en escritorio) -->
        <div class="login-col login-col--main">
            <header class="login-hero">
                <h1 class="login-hero__brand" aria-label="HairApp">
                    <span class="brand-script" aria-hidden="true">Hair</span>
                    <span class="brand-script brand-script--space" aria-hidden="true">App</span>
                </h1>
                <p class="login-hero__tagline">Atelier de belleza</p>
                <p class="login-hero__lead">Tu agenda, tus clientes y tu estilo, en un solo lugar.</p>
            </header>

            <article class="login-story" aria-labelledby="loginStoryTitle" tabindex="0">
                <p class="login-story__kicker">Una agenda pensada para el ritmo del salón</p>
                <h2 class="login-story__title" id="loginStoryTitle">Que todo tenga su lugar.</h2>

                <div class="login-story__body">
                    <p>Un día de peluquería se va construyendo turno a turno. Alguien llega antes, otro necesita cambiar el horario, aparece una consulta y, entre una atención y la siguiente, también hay que recordar nombres, servicios y detalles de cada cliente.</p>

                    <p>Cuando toda esa información está repartida en distintos lugares, encontrarla puede convertirse en una tarea más.</p>

                    <p><strong>HairApp reúne esa parte del trabajo en un mismo espacio.</strong></p>

                    <p>Desde la agenda podés consultar los turnos del día, ver en qué estado se encuentra cada uno y ubicar rápidamente la información que necesitás. También tenés un apartado para administrar tus clientes y otro para organizar los servicios de tu peluquería o barbería.</p>

                    <p>La idea no es cambiar tu manera de trabajar de un día para otro, ni llenar tu jornada de opciones que no necesitás. Es darte un lugar donde consultar lo importante, mantener las cosas ordenadas y llevar un seguimiento más claro de lo que sucede durante el día.</p>

                    <p>Un día de trabajo no deja tiempo para cargar datos: por eso HairApp busca ser ligera y rápida. Lo de todos los días se resuelve con un toque, sin pasos de más ni confirmaciones que cansen, y si te equivocás lo corregís con «Deshacer». Está pensada para evitar errores y cansancio, no para sumarte tareas.</p>

                    <p>HairApp está en desarrollo y todavía tiene camino por recorrer. Queremos seguir incorporando herramientas que hagan más completa la organización del salón, siempre con una prioridad: que sean útiles en la práctica y sencillas de manejar.</p>

                    <p><strong>Entrá, recorré la aplicación y fijate cómo encaja en tu forma de trabajar.</strong> Las necesidades de cada peluquería son distintas, y conocer las experiencias de quienes la utilizan es parte de construir una herramienta que realmente sirva.</p>
                </div>

                <p class="login-story__sign">HairApp<br>Tu agenda, tus clientes y tus servicios. Cada cosa en su lugar.</p>
            </article>
        </div>

        <!-- Columna derecha: acceso y vista previa de los módulos -->
        <div class="login-col login-col--side">
            <main class="admin-view">
                <header class="day-panel__header">
                    <div class="day-panel__title">
                        <span class="day-panel__kicker login-greeting" id="loginGreeting">Bienvenido</span>
                        <h2 class="day-panel__date">Tu agenda te espera</h2>
                    </div>
                </header>

                <div class="alert alert--error is-hidden" id="authMessage" role="alert"></div>

                <section id="loginSection">
                    <form id="loginForm">
                        <fieldset class="appointment-detail-body login-fieldset" disabled>
                            <h3 class="history-title">Iniciar sesión</h3>

                            <div class="form-group">
                                <label for="loginUsername">Usuario</label>
                                <input id="loginUsername" name="username" type="text" autocomplete="username" minlength="3" maxlength="50" required>
                            </div>

                            <div class="form-group">
                                <label for="loginPassword">Contraseña</label>
                                <div class="input-with-unit">
                                    <input id="loginPassword" name="password" type="password" autocomplete="current-password" required>
                                    <button type="button" class="nav-btn" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false">
                                        <svg <?= $iconAttrs ?>>
                                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                        <svg <?= $iconAttrs ?> hidden>
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94" />
                                            <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
                                            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <button type="submit" class="btn btn--primary">Entrar</button>
                        </fieldset>
                    </form>
                    <?php if ($registrationEnabled): ?>
                        <p class="appointment-detail-footer">
                            <a id="showRegistration" href="#registro" class="nav-btn nav-btn--today">Crear una cuenta</a>
                        </p>
                    <?php endif; ?>
                </section>

                <?php if ($registrationEnabled): ?>
                    <section id="registerSection" hidden>
                        <form id="registerForm">
                            <fieldset class="appointment-detail-body login-fieldset" disabled>
                                <h3 class="history-title">Crear cuenta</h3>
                                <p class="form-privacy-note">Las cuentas nuevas tendrán acceso completo a la aplicación.</p>

                                <div class="form-group">
                                    <label for="registerUsername">Usuario</label>
                                    <input id="registerUsername" name="username" type="text" autocomplete="username" minlength="3" maxlength="50" required>
                                </div>

                                <div class="form-group">
                                    <label for="registerPassword">Contraseña (mínimo 12 caracteres)</label>
                                    <div class="input-with-unit">
                                    <input id="registerPassword" name="password" type="password" autocomplete="new-password" minlength="12" required>
                                    <button type="button" class="nav-btn" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false">
                                        <svg <?= $iconAttrs ?>>
                                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                        <svg <?= $iconAttrs ?> hidden>
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94" />
                                            <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
                                            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    </button>
                                </div>
                                </div>

                                <button type="submit" class="btn btn--primary">Registrarme</button>
                            </fieldset>
                        </form>
                        <p class="appointment-detail-footer">
                            <a id="showLogin" href="#login" class="nav-btn nav-btn--today">Volver al inicio de sesión</a>
                        </p>
                    </section>
                <?php endif; ?>
            </main>

            <!-- Qué hay dentro de la app (mismos íconos que el menú lateral). El detalle sale al pasar el cursor -->
            <ul class="login-features" aria-label="Qué encontrarás en HairApp">
                <li class="login-feature" title="Tu agenda con estados al instante: de reservado a finalizado.">
                    <span class="login-feature__icon" aria-hidden="true">
                        <svg <?= $iconAttrs ?>>
                            <rect x="3" y="4" width="18" height="17" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </span>
                    <strong class="login-feature__title">Turnos</strong>
                </li>
                <li class="login-feature" title="Tu libreta de clientes, con alias, código y notas.">
                    <span class="login-feature__icon" aria-hidden="true">
                        <svg <?= $iconAttrs ?>>
                            <circle cx="9" cy="7.5" r="3.5" />
                            <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                            <path d="M16 4.3a3.5 3.5 0 0 1 0 6.4" />
                            <path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
                        </svg>
                    </span>
                    <strong class="login-feature__title">Clientes</strong>
                </li>
                <li class="login-feature" title="Tu catálogo de servicios y fichas rápidas, siempre a mano.">
                    <span class="login-feature__icon" aria-hidden="true">
                        <svg <?= $iconAttrs ?>>
                            <circle cx="6" cy="6" r="3" />
                            <circle cx="6" cy="18" r="3" />
                            <line x1="20" y1="4" x2="8.12" y2="15.88" />
                            <line x1="14.47" y1="14.48" x2="20" y2="20" />
                            <line x1="8.12" y1="8.12" x2="12" y2="12" />
                        </svg>
                    </span>
                    <strong class="login-feature__title">Servicios</strong>
                </li>
                <li class="login-feature" title="El control de tus productos y su stock.">
                    <span class="login-feature__icon" aria-hidden="true">
                        <svg <?= $iconAttrs ?>>
                            <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8" />
                            <path d="M3.27 6.96 12 12l8.73-5.04" />
                            <path d="M12 22V12" />
                            <path d="M8.5 4.27 16 8.5" />
                        </svg>
                    </span>
                    <strong class="login-feature__title">Productos</strong>
                </li>
            </ul>
        </div>
    </div>

    <script>
        window.BASE_URL = <?= json_encode($base, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;

        // Saludo según la hora local de quien entra
        (function() {
            var hour = new Date().getHours();
            var greeting = hour < 6 ? 'Buenas noches' : hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
            var el = document.getElementById('loginGreeting');
            if (el) {
                el.textContent = greeting;
            }
        })();
    </script>
    <script src="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/js/service-worker-cleanup.js" defer></script>
    <script type="module" src="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/js/login.js"></script>
</body>

</html>
