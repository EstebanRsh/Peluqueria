<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/AuthAttemptModel.php';
require_once __DIR__ . '/../models/AccountModel.php';

class AuthController extends BaseController
{
    private UserModel $model;
    private AuthAttemptModel $attempts;

    private const POST_ACTIONS = [
        'login',
        'register',
        'logout',
        'change_password',
        'account_import',
    ];

    // Límites para las credenciales recibidas.
    private const MAX_LOGIN_PASSWORD_BYTES = 1024;

    // Límite de intentos: [máximo, ventana en segundos].
    private const LOGIN_BY_ACCOUNT = [5, 900];
    private const LOGIN_BY_IP = [20, 900];
    private const REGISTER_BY_IP = [5, 3600];

    private const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

    public function __construct()
    {
        $this->model = new UserModel();
        $this->attempts = new AuthAttemptModel();
    }

    private function clientIp(): string
    {
        return (string)($_SERVER['REMOTE_ADDR'] ?? '');
    }

    // ============================================================
    // MANEJO DE PETICIONES
    // ============================================================

    // Procesa las acciones de autenticación.
    public function handleRequest(): void
    {
        ob_start();

        $action = $_GET['action'] ?? '';

        if (in_array($action, self::POST_ACTIONS, true)) {
            $this->requirePost();
        }

        switch ($action) {

            case 'register':
                if (!Auth::publicRegistrationEnabled()) {
                    $this->error('El registro público está deshabilitado.', 403);
                }

                $ipKey = 'ip|' . $this->clientIp();

                if ($this->attempts->tooMany('register', $ipKey, ...self::REGISTER_BY_IP)) {
                    $this->error('Hiciste demasiados intentos de registro. Probá de nuevo más tarde.', 429);
                }

                $input = $this->readInput();
                $username = $this->str($input['username'] ?? null);
                $email = UserModel::normalizeEmail($this->str($input['email'] ?? null));
                $password = is_string($input['password'] ?? null) ? $input['password'] : '';
                $confirm = is_string($input['password_confirm'] ?? null) ? $input['password_confirm'] : '';

                if (!UserModel::isValidUsername($username)) {
                    $this->error('El usuario debe tener entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo.');
                }

                if (!UserModel::isValidEmail($email)) {
                    $this->error('Ingresá un email válido.');
                }

                $passwordError = UserModel::validatePassword($password);
                if ($passwordError !== null) {
                    $this->error($passwordError);
                }

                if (!hash_equals($password, $confirm)) {
                    $this->error('Las contraseñas no coinciden.');
                }

                if (($input['accept_terms'] ?? null) !== true) {
                    $this->error('Tenés que aceptar los Términos y la Política de privacidad.');
                }

                $this->attempts->record('register', $ipKey);

                try {
                    $userId = $this->model->create($username, $email, $password, true, 'owner');
                } catch (InvalidArgumentException $e) {
                    $this->error($e->getMessage(), 409);
                } catch (mysqli_sql_exception $e) {
                    if ($e->getCode() === 1062) {
                        $this->error(UserModel::IDENTITY_TAKEN_MESSAGE, 409);
                    }

                    throw $e;
                }

                $user = $this->model->findById($userId);
                if ($user === null) {
                    throw new RuntimeException('No se pudo recuperar el usuario recién registrado.');
                }

                $csrf = Auth::login($userId);

                $this->json([
                    'success'    => true,
                    'user'       => ['username' => $user['username'], 'role' => $user['role']],
                    'csrf_token' => $csrf,
                ], 201);
                break;

            // Devuelve el estado de la sesión.
            case 'session':
                $user = Auth::currentUser();

                if ($user === null) {
                    $this->json(['success' => true, 'authenticated' => false]);
                }

                $this->json([
                    'success'       => true,
                    'authenticated' => true,
                    'user'          => ['username' => $user['username'], 'role' => $user['role']],
                    'csrf_token'    => Auth::csrfToken(),
                ]);
                break;

            // Devuelve los datos de la cuenta autenticada.
            case 'account':
                $user = Auth::currentUser();

                if ($user === null) {
                    $this->error('No autenticado.', 401);
                }

                $account = $this->model->findById($user['id']);

                if ($account === null) {
                    $this->error('No se encontró la cuenta.', 404);
                }

                $this->json([
                    'success' => true,
                    'account' => [
                        'username'   => $account['username'],
                        'email'      => $account['email'],
                        'created_at' => $account['created_at'],
                    ],
                ]);
                break;

            // Devuelve todos los datos de la cuenta para descargarlos.
            case 'account_export':
                $user = Auth::currentUser();

                if ($user === null) {
                    $this->error('No autenticado.', 401);
                }

                $this->json([
                    'success' => true,
                    'data'    => ['exported_at' => date('c')] + (new AccountModel())->export($user['id']),
                ]);
                break;

            // Carga una copia descargada en una cuenta sin datos.
            case 'account_import':
                $user = Auth::currentUser();

                if ($user === null) {
                    $this->error('No autenticado.', 401);
                }

                if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > self::MAX_IMPORT_BYTES) {
                    $this->error('El archivo es demasiado grande (máximo 10 MB).', 413);
                }

                $input = $this->readInput();
                $accounts = new AccountModel();

                if (!$accounts->isEmpty($user['id'])) {
                    $this->error('Solo podés importar datos en una cuenta sin datos cargados.', 409);
                }

                try {
                    $totals = $accounts->import($user['id'], is_array($input['data'] ?? null) ? $input['data'] : []);
                } catch (InvalidArgumentException $e) {
                    $this->error($e->getMessage());
                }

                $this->json(['success' => true, 'imported' => $totals]);
                break;

            // Inicia sesión.
            case 'login':
                $input = $this->readInput();
                $identifier = $this->str($input['username'] ?? null);
                $password = is_string($input['password'] ?? null) ? $input['password'] : '';

                if ($identifier === '' || $password === '') {
                    $this->error('Completá usuario o email y contraseña.');
                }

                $accountKey = 'account|' . mb_strtolower($identifier) . '|' . $this->clientIp();
                $ipKey = 'ip|' . $this->clientIp();

                if (
                    $this->attempts->tooMany('login', $accountKey, ...self::LOGIN_BY_ACCOUNT)
                    || $this->attempts->tooMany('login', $ipKey, ...self::LOGIN_BY_IP)
                ) {
                    $this->error('Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.', 429);
                }

                // No revelar si el usuario existe.
                if (
                    mb_strlen($identifier) > UserModel::MAX_EMAIL_LENGTH
                    || strlen($password) > self::MAX_LOGIN_PASSWORD_BYTES
                ) {
                    $this->error('Usuario o contraseña incorrectos.', 401);
                }

                $user = $this->model->authenticate($identifier, $password);

                if ($user === null) {
                    $this->attempts->record('login', $accountKey);
                    $this->attempts->record('login', $ipKey);

                    $this->error('Usuario o contraseña incorrectos.', 401);
                }

                $this->attempts->clear('login', $accountKey);

                $csrf = Auth::login($user['id']);

                $this->json([
                    'success'    => true,
                    'user'       => ['username' => $user['username'], 'role' => $user['role']],
                    'csrf_token' => $csrf,
                ]);
                break;

            // Cierra la sesión.
            case 'logout':
                Auth::logout();

                $this->json(['success' => true]);
                break;

            // Cambia la contraseña.
            case 'change_password':
                $user = Auth::currentUser();

                if ($user === null) {
                    $this->error('No autenticado.', 401);
                }

                $input = $this->readInput();
                $current = is_string($input['current_password'] ?? null) ? $input['current_password'] : '';
                $new = is_string($input['new_password'] ?? null) ? $input['new_password'] : '';
                $confirm = is_string($input['new_password_confirm'] ?? null) ? $input['new_password_confirm'] : '';

                if ($current === '' || $new === '' || $confirm === '') {
                    $this->error('Completá la contraseña actual, la nueva y su repetición.');
                }

                if (!hash_equals($new, $confirm)) {
                    $this->error('Las contraseñas nuevas no coinciden.');
                }

                if (strlen($current) > self::MAX_LOGIN_PASSWORD_BYTES) {
                    $this->error('La contraseña actual no es correcta.', 403);
                }

                $policyError = UserModel::validatePassword($new);
                if ($policyError !== null) {
                    $this->error($policyError);
                }

                if (hash_equals($current, $new)) {
                    $this->error('La nueva contraseña debe ser distinta de la actual.');
                }

                if (!$this->model->verifyUserPassword($user['id'], $current)) {
                    $this->error('La contraseña actual no es correcta.', 403);
                }

                if (!$this->model->changePassword($user['id'], $new)) {
                    $this->error('No se pudo actualizar la contraseña.', 500);
                }

                // Actualizar la sesión e invalidar las demás.
                Auth::onPasswordChanged();

                $this->json(['success' => true]);
                break;
        }

        $this->error('Acción no válida.', 404);
    }
}
