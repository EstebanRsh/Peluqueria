<?php

// ============================================================
// TÉRMINOS Y CONDICIONES
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
    <title>Términos y condiciones - HairApp</title>
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
            <header class="day-panel__header">
                <h1 class="day-panel__date">Términos y condiciones</h1>
                <a class="btn btn--ghost btn--sm" href="login.php">Volver</a>
            </header>

            <div class="day-panel__body legal-doc">
                <h2>1. Qué es HairApp</h2>
                <p>HairApp es una aplicación web para peluquerías y barberías: agenda de turnos, clientes, servicios, productos con su stock y fichas de cada atención. Estas condiciones rigen su uso. Al crear tu cuenta y tildar la casilla, las aceptás.</p>
                <p><?php if ($has('responsible')): ?>El servicio es prestado por <?= $val('responsible') ?><?php if ($has('tax_id')): ?> (CUIT <?= $val('tax_id') ?>)<?php endif ?><?php if ($has('address')): ?>, con domicilio en <?= $val('address') ?><?php endif ?>.<?php else: ?>El servicio es prestado por el titular de HairApp.<?php endif ?><?php if ($has('updated')): ?> Última actualización: <?= $val('updated') ?>.<?php endif ?></p>

                <h2>2. Versión beta</h2>
                <p>HairApp está en etapa beta: puede tener errores, cambiar, interrumpirse o dejar de ofrecer alguna función, y no garantizamos que esté siempre disponible. Te recomendamos descargar una copia de tus datos cada tanto desde Ajustes.</p>

                <h2>3. Tu cuenta</h2>
                <p>Tenés que ser mayor de 18 años y usar HairApp para tu actividad profesional. Los datos de tu cuenta tienen que ser verdaderos.</p>
                <p>Sos responsable de tu contraseña y de lo que se haga con tu cuenta. Por ahora no hay recuperación automática de la contraseña.<?php if ($has('support_email')): ?> Si la perdés, escribinos a <?= $mail('support_email') ?>.<?php endif ?></p>

                <h2>4. Tus datos y los de tus clientes</h2>
                <p>Los datos que cargás son tuyos. Respecto de los datos de tus clientes (alias, notas, alergias, fichas), el responsable frente a ellos sos vos: tenés que contar con su consentimiento, cargar solo lo necesario y atender sus pedidos de acceso, corrección o supresión.</p>
                <p>HairApp actúa solo como prestador del servicio de almacenamiento: trata esos datos únicamente por tu cuenta y según tus indicaciones, no los usa para otros fines ni los cede a terceros (artículo 25 de la Ley 25.326).</p>
                <p>Para cuidar la privacidad, usá un alias o nombre de referencia y evitá cargar teléfonos, documentos o direcciones. Las alergias son datos de salud, considerados sensibles: anotá solo las que importen para el servicio.</p>

                <h2>5. Alergias y tratamientos</h2>
                <p>HairApp es una herramienta de registro. No verifica la información que cargás ni brinda asesoramiento sobre alergias, productos o tratamientos. Las decisiones sobre cada atención y sus consecuencias son del profesional que la realiza.</p>

                <h2>6. Uso permitido</h2>
                <p>No podés usar HairApp para fines ilegales, intentar acceder a datos de otras cuentas, ni dañar o sobrecargar el servicio.</p>

                <h2>7. Descarga, importación y eliminación</h2>
                <p>Desde Ajustes podés descargar tus datos, importarlos en una cuenta sin datos y eliminar tu cuenta. La eliminación es inmediata y definitiva: no podemos recuperar lo que borres. Las copias de seguridad que puedan existir se eliminan <?php if ($has('backup_days')): ?>en un máximo de <?= $val('backup_days') ?> días<?php else: ?>en un plazo razonable<?php endif ?>.</p>

                <h2>8. Precio</h2>
                <p>Durante la beta el uso es gratuito. Si en el futuro se cobra, te lo vamos a avisar con anticipación y vas a poder eliminar tu cuenta antes.</p>

                <h2>9. Responsabilidad</h2>
                <p>HairApp se ofrece "tal como está". En la medida que lo permite la ley, no respondemos por la pérdida de datos, la falta de disponibilidad ni las ganancias que dejes de percibir, y nuestra responsabilidad total, si existiera, se limita al monto que hayas pagado por el servicio en los últimos 12 meses. Nada de esto limita la responsabilidad que la ley no permite excluir ni los derechos irrenunciables que te reconoce.</p>

                <h2>10. Cambios en estas condiciones</h2>
                <p>Podemos modificarlas. Si el cambio es importante, te avisamos en la aplicación o por email. Si seguís usando HairApp después del aviso, lo entendemos como aceptación; si no estás de acuerdo, podés eliminar tu cuenta.</p>

                <h2>11. Ley aplicable y jurisdicción</h2>
                <p>Rigen las leyes de la República Argentina. Antes de iniciar un reclamo, intentamos resolverlo entre las partes<?php if ($has('support_email')): ?>: escribinos a <?= $mail('support_email') ?><?php endif ?>. Si no se resuelve, serán competentes los tribunales ordinarios <?php if ($has('jurisdiction')): ?>de <?= $val('jurisdiction') ?><?php else: ?>del domicilio del responsable<?php endif ?>.</p>

                <?php if ($has('support_email')): ?>
                <h2>12. Contacto</h2>
                <p>Para cualquier consulta, escribinos a <?= $mail('support_email') ?>.</p>
                <?php endif ?>
            </div>
        </main>
    </div>
</body>

</html>
