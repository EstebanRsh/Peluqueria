<?php

// ============================================================
// SIN CONEXIÓN
// Pantalla que el service worker muestra cuando la aplicación se abre sin internet.
// ============================================================

require_once __DIR__ . '/config/auth.php';
Auth::guard('auth_page');

$base = htmlspecialchars(rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/'), ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#1a1511">
    <title>Sin conexión - HairApp</title>
    <link rel="stylesheet" href="<?= $base ?>/public/css/base.css">
    <link rel="stylesheet" href="<?= $base ?>/public/css/components.css">
</head>

<body>
    <dialog class="message-screen message-screen--warning" open aria-labelledby="offlineTitle" aria-describedby="offlineText">
        <svg class="message-screen__icon message-screen__icon--warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path class="message-screen__mark" d="M12 9v4M12 17h.01" pathLength="1" />
        </svg>
        <div class="message-screen__body" role="alert">
            <h1 class="message-screen__title" id="offlineTitle">Sin conexión</h1>
            <p class="message-screen__text" id="offlineText">Revisá tu conexión a internet y volvé a intentar.</p>
        </div>
        <div class="message-screen__actions">
            <a class="btn message-screen__button" href="">Reintentar</a>
        </div>
    </dialog>
</body>

</html>
