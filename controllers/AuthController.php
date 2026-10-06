<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../models/UserModel.php';

class AuthController extends BaseController
{
    private UserModel $model;

    private const POST_ACTIONS = [
        'login',
        'register',
        'logout',
        'change_password',
    ];

    // Límites para las credenciales recibidas.
    private const MAX_USERNAME_LENGTH = 50;
    private const MAX_LOGIN_PASSWORD_BYTES = 1024;

    public function __construct()
    {
        $this->model = new UserModel();
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

                $input = $this->readInput();
                $username = $this->str($input['username'] ?? null);
                $password = is_string($input['password'] ?? null) ? $input['password'] : '';

                if (!UserModel::isValidUsername($username)) {
                    $this->error('El usuario debe tener entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo.');
                }

                $passwordError = UserModel::validatePassword($password);
                if ($passwordError !== null) {
                    $this->error($passwordError);
                }

                try {
                    $userId = $this->model->create($username, $password, 'owner');
                } catch (InvalidArgumentException $e) {
                    $this->error($e->getMessage(), 409);
                } catch (mysqli_sql_exception $e) {
                    if ($e->getCode() === 1062) {
                        $this->error('El nombre de usuario ya existe.', 409);
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

            // Inicia sesión.
            case 'login':
                $input = $this->readInput();
                $username = $this->str($input['username'] ?? null);
                $password = is_string($input['password'] ?? null) ? $input['password'] : '';

                if ($username === '' || $password === '') {
                    $this->error('Completá usuario y contraseña.');
                }

                // No revelar si el usuario existe.
                if (
                    mb_strlen($username) > self::MAX_USERNAME_LENGTH
                    || strlen($password) > self::MAX_LOGIN_PASSWORD_BYTES
                ) {
                    $this->error('Usuario o contraseña incorrectos.', 401);
                }

                $user = $this->model->authenticate($username, $password);

                if ($user === null) {
                    $this->error('Usuario o contraseña incorrectos.', 401);
                }

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

                if ($current === '' || $new === '') {
                    $this->error('Completá la contraseña actual y la nueva.');
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
