<?php

// ============================================================
// LOGIN
// Página de ingreso y registro de cuentas.
// ============================================================

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
    <style>
        html:not(.is-styled) body {
            visibility: hidden;
            animation: boot-show 0s 5s forwards;
        }

        @keyframes boot-show {
            to {
                visibility: visible;
            }
        }
    </style>
    <link rel="preload" href="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/fonts/inter-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/fonts/cinzel-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/fonts/alex-brush-latin-400.woff2" as="font" type="font/woff2" crossorigin>

    <link rel="stylesheet" href="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/css/base.css">
    <link rel="stylesheet" href="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/css/sidebar.css">
    <link rel="stylesheet" href="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/css/components.css">
    <link rel="stylesheet" href="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/css/app-core.css">
    <script>
        (function() {
            var show = function() {
                document.documentElement.classList.add("is-styled");
            };
            if (!document.fonts) {
                show();
                return;
            }
            var faces = ["400 1rem Inter", "500 1rem Inter", "600 1rem Inter", "700 1rem Inter", "500 1rem Cinzel", "700 1rem Cinzel", "1rem 'Alex Brush'"];
            Promise.race([
                Promise.all(faces.map(function(face) {
                    return document.fonts.load(face);
                })),
                new Promise(function(resolve) {
                    setTimeout(resolve, 3000);
                })
            ]).then(show, show);
        })();
    </script>
</head>


<body class="login-page">
    <div class="login-shell">

        <!-- Columna izquierda -->
        <div class="login-col login-col--main">
            <header class="login-hero">
                <h1 class="login-hero__brand" aria-label="HairApp">
                    <span class="brand-script" aria-hidden="true">Hair</span>
                    <span class="brand-script brand-script--space" aria-hidden="true">App</span>
                </h1>
            </header>

            <article class="login-story" aria-labelledby="loginStoryTitle" tabindex="0">
                <p class="login-story__kicker">Para peluquerías</p>
                <h2 class="login-story__title" id="loginStoryTitle">Pensada para ayudarte.</h2>

                <div class="login-story__body">
                    <p>HairApp está pensada para ayudarte con la organización en tu peluquería. Anotar en cuadernos, recordar turnos o revisar WhatsApp todo el tiempo para no olvidarte de ninguno puede ser desgastante. Tener todo al alcance y poder acceder desde tu celular, tablet o computadora, puede facilitarte el día a día.</p>

                    <p>No es solo una agenda: además de gestionar tus turnos, podés guardar tus servicios con su duración estimada y su precio, y tus productos con su stock y su costo. Todo en un mismo lugar, sin perder tiempo buscando dónde anotaste cada cosa.</p>

                    <p>Después de cada atención podés registrar en una ficha lo que hiciste: color, tratamiento y los productos que usaste, que se descuentan automaticamente del stock.</p>

                    <p>Al ingresar verás un calendario, pensado como panel principal para que veas rápidamente los días con turnos agendados, con el detalle de los reservados y los terminados. Al agendar, HairApp te sugiere el horario a continuación del último turno y calcula la hora de fin según el tiempo que configuraste para cada servicio, para que tu día tenga un orden claro.</p>

                    <p>HairApp se encuentra en desarrollo y se irán agregando funciones a medida que los usuarios las necesiten. Entrá y probala sin compromiso: tal vez sea la aplicación que estabas esperando.</p>
                </div>
            </article>
        </div>

        <!-- Columna derecha -->
        <div class="login-col login-col--side">
            <main class="admin-view">
                <header class="surface__header">
                    <div class="surface__heading">
                        <span class="surface__kicker login-greeting" id="loginGreeting">Bienvenido</span>
                    </div>
                </header>

                <section id="loginSection">
                    <form id="loginForm" novalidate>
                        <fieldset class="login-fieldset" disabled>
                            <h3 class="history-title">Iniciar sesión</h3>

                            <div class="form-group">
                                <label for="loginUsername">Usuario o email</label>
                                <input id="loginUsername" name="username" type="text" autocomplete="username" maxlength="254" required>
                            </div>

                            <div class="form-group">
                                <label for="loginPassword">Contraseña</label>
                                <div class="password-field">
                                    <input id="loginPassword" name="password" type="password" autocomplete="current-password" required>
                                    <button type="button" class="password-field__toggle" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false">
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
                        <p class="surface__footer">
                            <a id="showRegistration" href="#registro" class="nav-btn nav-btn--today">Crear una cuenta</a>
                        </p>
                    <?php endif; ?>
                </section>

                <?php if ($registrationEnabled): ?>
                    <section id="registerSection" hidden>
                        <form id="registerForm" novalidate>
                            <fieldset class="login-fieldset" disabled>
                                <h3 class="history-title">Crear cuenta</h3>

                                <div class="form-group">
                                    <label for="registerUsername">Usuario</label>
                                    <input id="registerUsername" name="username" type="text" autocomplete="username" minlength="3" maxlength="50" required>
                                </div>

                                <div class="form-group">
                                    <label for="registerEmail">Email</label>
                                    <input id="registerEmail" name="email" type="email" autocomplete="email" maxlength="254" required>
                                </div>

                                <div class="form-group">
                                    <label for="registerPassword">Contraseña (mínimo 12 caracteres)</label>
                                    <div class="password-field">
                                        <input id="registerPassword" name="password" type="password" autocomplete="new-password" minlength="12" required>
                                        <button type="button" class="password-field__toggle" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false">
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

                                <div class="form-group">
                                    <label for="registerPasswordConfirm">Repetir contraseña</label>
                                    <div class="password-field">
                                        <input id="registerPasswordConfirm" name="password_confirm" type="password" autocomplete="new-password" minlength="12" required>
                                        <button type="button" class="password-field__toggle" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false">
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
                                    <p class="form-hint">Guardala en un lugar seguro: por ahora no se puede recuperar.</p>
                                </div>

                                <label class="check-field" for="registerTerms">
                                    <input id="registerTerms" name="accept_terms" type="checkbox" required>
                                    <span>Acepto los <a class="text-link" href="terminos.php" data-legal="terminos">Términos</a> y la <a class="text-link" href="privacidad.php" data-legal="privacidad">Política de privacidad</a>.</span>
                                </label>

                                <button type="submit" class="btn btn--primary">Registrarme</button>
                            </fieldset>
                        </form>
                        <p class="surface__footer">
                            <a id="showLogin" href="#login" class="nav-btn nav-btn--today">Volver al inicio de sesión</a>
                        </p>
                    </section>
                <?php endif; ?>
            </main>
        </div>
    </div>

    <dialog class="surface-dialog surface-dialog--wide" id="legalDialog" aria-labelledby="legalDialogTitle">
        <div class="surface__header">
            <h3 class="surface__title" id="legalDialogTitle"></h3>
            <button type="button" class="surface__close" aria-label="Cerrar">×</button>
        </div>
        <div class="surface__body legal-doc" id="legalDialogContent"></div>
    </dialog>

    <dialog class="message-screen" id="messageScreen" aria-labelledby="messageTitle" aria-describedby="messageText" tabindex="-1">
        <svg class="message-screen__icon message-screen__icon--success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" />
            <path class="message-screen__mark" d="M7.5 12.5l3 3 6-7" pathLength="1" />
        </svg>
        <svg class="message-screen__icon message-screen__icon--error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" />
            <path class="message-screen__mark" d="M8.5 8.5l7 7M15.5 8.5l-7 7" pathLength="1" />
        </svg>
        <svg class="message-screen__icon message-screen__icon--warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path class="message-screen__mark" d="M12 9v4M12 17h.01" pathLength="1" />
        </svg>
        <svg class="message-screen__icon message-screen__icon--info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" />
            <path class="message-screen__mark" d="M12 11v5M12 8h.01" pathLength="1" />
        </svg>
        <div class="message-screen__body" id="messageBody">
            <h2 class="message-screen__title" id="messageTitle"></h2>
            <p class="message-screen__text" id="messageText"></p>
        </div>
        <div class="message-screen__actions">
            <button type="button" class="btn message-screen__button message-screen__button--cancel" id="messageCancel" hidden>Cancelar</button>
            <button type="button" class="btn message-screen__button" id="messageAccept" hidden>Entendido</button>
        </div>
    </dialog>

    <script>
        window.BASE_URL = <?= json_encode($base, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;

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