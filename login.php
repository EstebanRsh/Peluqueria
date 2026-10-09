<?php
require_once __DIR__ . '/config/auth.php';
Auth::guard('auth_page');

$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
$registrationEnabled = Auth::publicRegistrationEnabled();
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Acceso - Mi Peluquería</title>
</head>

<body>
    <main>
        <h1>Mi Peluquería</h1>
        <p id="authMessage" role="status" aria-live="polite"></p>

        <section id="loginSection">
            <h2>Iniciar sesión</h2>
            <form id="loginForm">
                <fieldset disabled>
                    <label for="loginUsername">Usuario</label>
                    <input id="loginUsername" name="username" type="text" autocomplete="username" minlength="3" maxlength="50" required>

                    <label for="loginPassword">Contraseña</label>
                    <input id="loginPassword" name="password" type="password" autocomplete="current-password" required>

                    <button type="submit">Entrar</button>
                </fieldset>
            </form>
            <?php if ($registrationEnabled): ?>
                <p><a id="showRegistration" href="#registro">Crear una cuenta</a></p>
            <?php endif; ?>
        </section>

        <?php if ($registrationEnabled): ?>
            <section id="registerSection" hidden>
                <h2>Crear cuenta</h2>
                <p>Las cuentas nuevas tendrán acceso completo a la aplicación.</p>
                <form id="registerForm">
                    <fieldset disabled>
                        <label for="registerUsername">Usuario</label>
                        <input id="registerUsername" name="username" type="text" autocomplete="username" minlength="3" maxlength="50" required>

                        <label for="registerPassword">Contraseña (mínimo 12 caracteres)</label>
                        <input id="registerPassword" name="password" type="password" autocomplete="new-password" minlength="12" required>

                        <button type="submit">Registrarme</button>
                    </fieldset>
                </form>
                <p><a id="showLogin" href="#login">Volver al inicio de sesión</a></p>
            </section>
        <?php endif; ?>
    </main>
    <script>
        window.BASE_URL = <?= json_encode($base, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
    </script>
    <script type="module" src="<?= htmlspecialchars($base, ENT_QUOTES, 'UTF-8') ?>/public/js/login.js"></script>
</body>

</html>