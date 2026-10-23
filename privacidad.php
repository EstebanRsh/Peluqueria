<?php

// ============================================================
// POLÍTICA DE PRIVACIDAD
// Página pública; los datos del responsable salen de la configuración legal del entorno.
// ============================================================

require_once __DIR__ . '/config/auth.php';
Auth::guard('auth_page');

$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
$legal = appConfig()['legal'] ?? [];
$has = static fn(string $key): bool => trim((string)($legal[$key] ?? '')) !== '';
$val = static fn(string $key): string => htmlspecialchars(trim((string)($legal[$key] ?? '')), ENT_QUOTES, 'UTF-8');
$mail = static fn(string $key): string => '<a class="text-link" href="mailto:' . $val($key) . '">' . $val($key) . '</a>';
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Política de privacidad - HairApp</title>
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

<body class="legal-page">
    <div class="legal-shell">
        <main class="admin-view">
            <header class="surface__header">
                <h1 class="surface__title">Política de privacidad</h1>
                <a class="btn btn--ghost btn--sm" href="login.php">Volver</a>
            </header>

            <div class="surface__body legal-doc">
                <h2>1. Quién es el responsable</h2>
                <p><?php if ($has('responsible')): ?>El servicio es prestado por <?= $val('responsible') ?><?php if ($has('tax_id')): ?> (CUIT <?= $val('tax_id') ?>)<?php endif ?><?php if ($has('address')): ?>, con domicilio en <?= $val('address') ?><?php endif ?>.<?php else: ?>El servicio es prestado por el titular de HairApp.<?php endif ?><?php if ($has('updated')): ?> Última actualización: <?= $val('updated') ?>.<?php endif ?></p>
                <?php if ($has('privacy_email')): ?>
                <p>Para consultas sobre tus datos personales, escribinos a <?= $mail('privacy_email') ?>.</p>
                <?php endif ?>

                <h2>2. Qué datos guardamos</h2>
                <ul>
                    <li><strong>De tu cuenta:</strong> usuario, email, tu contraseña (guardada cifrada, de forma que nadie puede leerla), la fecha de alta, la fecha en que aceptaste los términos y el último inicio de sesión.</li>
                    <li><strong>Lo que cargás:</strong> clientes (alias, código interno y notas), servicios, productos y su stock, turnos y fichas de cada atención.</li>
                    <li><strong>Datos técnicos:</strong> una cookie de sesión para mantenerte conectado. Para limitar intentos de acceso guardamos, por hasta 24 horas, un código irreversible derivado de tu conexión; no guardamos tu dirección IP ni tu usuario en esa tabla.</li>
                </ul>
                <p>No pedimos teléfono, documento, domicilio, ubicación ni datos de pago.</p>

                <h2>3. Para qué los usamos</h2>
                <p>Para darte el servicio (agenda, clientes, stock y fichas), mantener la seguridad de tu cuenta y comunicarnos con vos sobre ella. No vendemos tus datos, no hacemos publicidad ni armamos perfiles.</p>

                <h2>4. Con quién los compartimos</h2>
                <ul>
                    <li>Con el proveedor de hosting que almacena la información<?php if ($has('hosting')): ?> (<?= $val('hosting') ?>)<?php endif ?>.</li>
                    <li>Con autoridades, solo si una ley o una orden judicial lo exige.</li>
                </ul>

                <h2>5. Datos sensibles</h2>
                <p>No cargues datos de salud de tus clientes: no hace falta para usar HairApp. El responsable de los datos de tus clientes frente a ellos sos vos; nosotros los guardamos por tu cuenta.</p>

                <h2>6. Cuánto tiempo los conservamos</h2>
                <p>Mientras tu cuenta exista. Si la eliminás, se borran de inmediato de la base de datos. Las copias de seguridad, si existen, se eliminan <?php if ($has('backup_days')): ?>en un máximo de <?= $val('backup_days') ?> días<?php else: ?>en un plazo razonable<?php endif ?>.</p>

                <h2>7. Tus derechos</h2>
                <ul>
                    <li><strong>Acceso y portabilidad:</strong> en Ajustes, "Descargar mis datos" te da un archivo con toda tu información.</li>
                    <li><strong>Rectificación:</strong> podés corregir tus datos en la aplicación y cambiar tu contraseña en Ajustes.</li>
                    <li><strong>Supresión:</strong> en Ajustes, "Eliminar cuenta" borra tu cuenta y todos tus datos.</li>
                </ul>
                <p><?php if ($has('privacy_email')): ?>Para cualquier otro pedido, escribinos a <?= $mail('privacy_email') ?>. <?php endif ?>Respondemos los pedidos de acceso dentro de los 10 días corridos, y los de rectificación o supresión dentro de los 5 días hábiles.</p>

                <h2>8. Aviso de la autoridad de control</h2>
                <p>El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>

                <h2>9. Seguridad</h2>
                <p>Usamos conexión cifrada (HTTPS), guardamos las contraseñas cifradas, protegemos la sesión con una cookie que el navegador no deja leer a otros programas, y cada cuenta ve únicamente sus propios datos. Ninguna medida es infalible, pero trabajamos para proteger tu información.</p>

                <h2>10. Cookies y almacenamiento en tu navegador</h2>
                <p>Solo usamos una cookie de sesión, necesaria para que la aplicación funcione. No guardamos datos en tu navegador ni usamos cookies de publicidad ni de seguimiento.</p>

                <h2>11. Menores</h2>
                <p>HairApp es para profesionales mayores de 18 años.</p>

                <h2>12. Cambios</h2>
                <p>Si cambiamos esta política de forma importante, te avisamos en la aplicación o por email.</p>
            </div>
        </main>
    </div>
</body>

</html>
