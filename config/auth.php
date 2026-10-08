<?php

require_once __DIR__ . '/../models/UserModel.php';

/**
 * Controla el acceso, las sesiones y los permisos de la aplicación.
 */
final class Auth
{
    // ============================================================
    // CONFIGURACIÓN
    // ============================================================

    // Cookie de sesión para conexiones HTTPS.
    public const SESSION_NAME = '__Host-peluqueria_sid';

    // Cookie usada en localhost, donde se permite HTTP.
    public const SESSION_NAME_HTTP = 'peluqueria_sid';

    // HTTP solo se permite en localhost.
    public const ALLOW_HTTP_LOCALHOST = true;

    // Tiempo máximo de inactividad de la sesión.
    public const IDLE_TIMEOUT = 1800;

    // Duración máxima de la sesión.
    public const ABSOLUTE_TIMEOUT = 43200;

    // Hosts permitidos.
    public const ALLOWED_HOSTS = ['localhost', '127.0.0.1'];

    // Ruta de la pantalla de login.
    public const LOGIN_PATH = 'login.php';

    // Activar solo si un proxy de confianza informa el protocolo original.
    public const TRUST_PROXY_HEADERS = false;

    // Acciones públicas.
    public const PUBLIC_ACTIONS = ['auth_page', 'login', 'register', 'session'];

    // Habilita el registro en localhost o mediante una variable de entorno.
    public static function publicRegistrationEnabled(): bool
    {
        if (getenv('AUTH_ALLOW_PUBLIC_REGISTRATION') === '1') {
            return true;
        }

        $rawHost = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
        $host = $rawHost === '' ? false : parse_url('//' . $rawHost, PHP_URL_HOST);
        $host = is_string($host) ? trim($host, '[]') : '';

        return self::ALLOW_HTTP_LOCALHOST
            && in_array($host, self::LOCAL_HOSTS, true)
            && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
    }

    // Permisos por acción. Las acciones no incluidas se deniegan.
    public const PERMISSIONS = [
        '' => ['owner'],

        // Autenticación (con sesión)
        'logout'          => ['owner', 'admin'],
        'change_password' => ['owner', 'admin'],

        // Turnos
        'list'          => ['owner'],
        'create'        => ['owner'],
        'delete'        => ['owner'],
        'update_status' => ['owner'],
        'history'       => ['owner'],

        // Servicios
        'services'           => ['owner'],
        'services_all'       => ['owner'],
        'service_get'        => ['owner'],
        'service_create'     => ['owner'],
        'service_update'     => ['owner'],
        'service_activate'   => ['owner'],
        'service_deactivate' => ['owner'],
        'service_delete'     => ['owner'],

        // Clientes
        'clients_all'       => ['owner'],
        'client_get'        => ['owner'],
        'client_search'     => ['owner'],
        'client_create'     => ['owner'],
        'client_update'     => ['owner'],
        'client_activate'   => ['owner'],
        'client_deactivate' => ['owner'],
        'client_delete'     => ['owner'],

        // Productos
        'products'           => ['owner'],
        'products_all'       => ['owner'],
        'product_get'        => ['owner'],
        'product_search'     => ['owner'],
        'product_create'     => ['owner'],
        'product_update'     => ['owner'],
        'product_activate'   => ['owner'],
        'product_deactivate' => ['owner'],
        'product_delete'     => ['owner'],

        // Ficha técnica
        'service_history_save'   => ['owner'],
        'client_timeline'        => ['owner'],
        'service_history_detail' => ['owner'],
    ];

    // Acciones que mantienen abierta la sesión.
    private const SESSION_WRITE_ACTIONS = ['login', 'register', 'logout', 'change_password'];

    // Consultar estas acciones no renueva la sesión.
    private const NO_TOUCH_ACTIONS = ['session'];

    private const ALLOWED_METHODS = ['GET', 'HEAD', 'POST'];
    private const SAFE_METHODS = ['GET', 'HEAD'];

    private const TOUCH_INTERVAL = 30;

    private const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

    private static ?array $user = null;
    private static ?string $csrf = null;

    // ============================================================
    // CONTROL DE ACCESO
    // ============================================================

    public static function guard(mixed $rawAction): void
    {
        $action = is_string($rawAction) ? $rawAction : '__invalid__';
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        self::sendSecurityHeaders();

        $host = self::validatedHost();
        self::enforceHttps($host);

        // No activar HSTS en localhost.
        if (!in_array($host['name'], self::LOCAL_HOSTS, true)) {
            header('Strict-Transport-Security: max-age=31536000');
        }

        if (!in_array($method, self::ALLOWED_METHODS, true)) {
            self::deny('Método no permitido.', 405);
        }

        $unsafe = !in_array($method, self::SAFE_METHODS, true);

        if ($unsafe) {
            self::checkOrigin($host);
        }

        $isPublic = in_array($action, self::PUBLIC_ACTIONS, true);

        // Abrir la sesión solo si se recibió la cookie.
        $authenticated = false;
        if (isset($_COOKIE[self::cookieName()])) {
            self::openSession();
            $authenticated = self::loadAuthenticatedUser(
                !in_array($action, self::NO_TOUCH_ACTIONS, true)
            );
        }

        if (!$authenticated && !$isPublic) {
            if ($action === '') {
                self::redirectToLogin();
            }

            self::deny('No autenticado.', 401);
        }

        if ($authenticated) {
            // El login no requiere token CSRF.
            if ($unsafe && $action !== 'login') {
                self::checkCsrfToken();
            }

            if (!$isPublic) {
                $roles = self::PERMISSIONS[$action] ?? [];

                if (!in_array(self::$user['role'], $roles, true)) {
                    self::deny('No tenés permiso para realizar esta acción.', 403);
                }
            }
        }

        // Liberar el bloqueo de sesión cuando no hace falta escribir.
        if (
            session_status() === PHP_SESSION_ACTIVE
            && !in_array($action, self::SESSION_WRITE_ACTIONS, true)
        ) {
            session_write_close();
        }
    }

    // ============================================================
    // SESIÓN PÚBLICA
    // ============================================================

    // Inicia sesión y devuelve el token CSRF.
    public static function login(int $userId): string
    {
        self::openSession();

        $user = (new UserModel())->findById($userId);

        if ($user === null || !$user['active']) {
            throw new RuntimeException('Usuario inválido para iniciar sesión.');
        }

        session_regenerate_id(true);

        $now = time();
        $csrf = bin2hex(random_bytes(32));

        $_SESSION = [
            'uid'      => $user['id'],
            'owner_id' => $user['id'],
            'created'  => $now,
            'last'     => $now,
            'csrf'     => $csrf,
            'pv'       => (string)($user['password_changed_at'] ?? ''),
        ];

        self::$user = [
            'id'       => $user['id'],
            'owner_id' => $user['id'],
            'username' => $user['username'],
            'role'     => $user['role'],
        ];
        self::$csrf = $csrf;

        return $csrf;
    }

    // Cierra la sesión actual.
    public static function logout(): void
    {
        self::destroySession();
    }

    // Actualiza la sesión tras cambiar la contraseña.
    public static function onPasswordChanged(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE || self::$user === null) {
            throw new RuntimeException('No hay una sesión activa.');
        }

        $user = (new UserModel())->findById(self::$user['id']);

        if ($user === null) {
            throw new RuntimeException('Usuario inexistente.');
        }

        session_regenerate_id(true);
        $_SESSION['pv'] = (string)($user['password_changed_at'] ?? '');
    }

    // Devuelve el usuario autenticado o null.
    public static function currentUser(): ?array
    {
        return self::$user;
    }

    // Devuelve el token CSRF o null.
    public static function csrfToken(): ?string
    {
        return self::$csrf;
    }

    // ============================================================
    // SESIÓN
    // ============================================================

    private static function openSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');
        ini_set('session.gc_maxlifetime', (string)self::ABSOLUTE_TIMEOUT);

        session_name(self::cookieName());

        session_cache_limiter('');

        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'secure'   => self::isHttps(),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);

        if (!session_start()) {
            throw new RuntimeException('No se pudo iniciar la sesión.');
        }
    }

    // Valida la sesión y carga el usuario actual.
    private static function loadAuthenticatedUser(bool $touch): bool
    {
        $uid = $_SESSION['uid'] ?? null;

        if ($uid === null) {
            return false;
        }

        $created = $_SESSION['created'] ?? null;
        $last    = $_SESSION['last'] ?? null;
        $csrf    = $_SESSION['csrf'] ?? null;

        if (!is_int($uid) || !is_int($created) || !is_int($last) || !is_string($csrf)) {
            self::destroySession();
            return false;
        }

        $now = time();

        if ($now - $created > self::ABSOLUTE_TIMEOUT || $now - $last > self::IDLE_TIMEOUT) {
            self::destroySession();
            return false;
        }

        $user = (new UserModel())->findById($uid);

        if (
            $user === null
            || !$user['active']
            || (string)($user['password_changed_at'] ?? '') !== (string)($_SESSION['pv'] ?? '')
        ) {
            self::destroySession();
            return false;
        }

        if ($touch && $now - $last >= self::TOUCH_INTERVAL) {
            $_SESSION['last'] = $now;
        }

        self::$user = [
            'id'       => $user['id'],
            'username' => $user['username'],
            'role'     => $user['role'],
        ];
        self::$csrf = $csrf;

        return true;
    }

    private static function destroySession(): void
    {
        self::$user = null;
        self::$csrf = null;

        if (session_status() !== PHP_SESSION_ACTIVE) {
            return;
        }

        $_SESSION = [];

        setcookie(self::cookieName(), '', [
            'expires'  => time() - 42000,
            'path'     => '/',
            'secure'   => self::isHttps(),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);

        session_destroy();
    }

    // ============================================================
    // CSRF Y ORIGEN
    // ============================================================

    // Valida el token enviado en X-CSRF-Token.
    private static function checkCsrfToken(): void
    {
        $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

        if (!is_string($sent) || $sent === '' || self::$csrf === null || !hash_equals(self::$csrf, $sent)) {
            self::deny('Token CSRF inválido o ausente.', 403);
        }
    }

    // Comprueba el origen cuando la petición lo incluye.
    private static function checkOrigin(array $host): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? null;

        if ($origin === null) {
            return;
        }

        $parts = is_string($origin) ? parse_url($origin) : false;

        $scheme = self::isHttps() ? 'https' : 'http';
        $defaultPort = $scheme === 'https' ? 443 : 80;

        if (
            $parts === false
            || ($parts['scheme'] ?? '') !== $scheme
            || !isset($parts['host'])
            || strtolower(trim($parts['host'], '[]')) !== $host['name']
            || ($parts['port'] ?? $defaultPort) !== ($host['port'] ?? $defaultPort)
        ) {
            self::deny('Origen no permitido.', 403);
        }
    }

    // ============================================================
    // HOST Y HTTPS
    // ============================================================

    // Valida el host de la petición.
    private static function validatedHost(): array
    {
        $raw = strtolower($_SERVER['HTTP_HOST'] ?? '');
        $parts = $raw === '' ? false : parse_url('//' . $raw);

        if (
            $parts === false
            || !isset($parts['host'])
            || isset($parts['path'])
            || isset($parts['user'])
            || isset($parts['query'])
            || isset($parts['fragment'])
        ) {
            self::deny('Host no válido.', 400);
        }

        $name = trim($parts['host'], '[]');

        if (!in_array($name, self::ALLOWED_HOSTS, true)) {
            self::deny('Host no permitido.', 400);
        }

        return ['name' => $name, 'port' => $parts['port'] ?? null];
    }

    private static function cookieName(): string
    {
        return self::isHttps() ? self::SESSION_NAME : self::SESSION_NAME_HTTP;
    }

    // Comprueba si la petición local puede usar HTTP.
    private static function isLocalHttpAllowed(array $host): bool
    {
        return self::ALLOW_HTTP_LOCALHOST
            && in_array($host['name'], self::LOCAL_HOSTS, true)
            && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
    }

    private static function isHttps(): bool
    {
        if (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') {
            return true;
        }

        if ((int)($_SERVER['SERVER_PORT'] ?? 0) === 443) {
            return true;
        }

        return self::TRUST_PROXY_HEADERS
            && strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    }

    // Redirige las peticiones seguras a HTTPS y rechaza las demás.
    private static function enforceHttps(array $host): void
    {
        if (self::isHttps() || self::isLocalHttpAllowed($host)) {
            return;
        }

        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        if (in_array($method, self::SAFE_METHODS, true)) {
            $uri = (string)($_SERVER['REQUEST_URI'] ?? '/');
            $uri = str_starts_with($uri, '/') ? $uri : '/';
            $name = str_contains($host['name'], ':') ? '[' . $host['name'] . ']' : $host['name'];

            header('Location: https://' . $name . $uri, true, 301);
            exit;
        }

        self::deny('Se requiere HTTPS.', 403);
    }

    private static function sendSecurityHeaders(): void
    {
        header_remove('X-Powered-By');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: same-origin');
        header("Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
    }

    // ============================================================
    // RESPUESTAS
    // ============================================================

    private static function redirectToLogin(): void
    {
        $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');

        header('Location: ' . $base . '/' . self::LOGIN_PATH, true, 302);
        exit;
    }

    // Devuelve un error JSON y termina la petición.
    private static function deny(string $message, int $status): void
    {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
