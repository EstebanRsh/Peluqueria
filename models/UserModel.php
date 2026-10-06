<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Acceso a los usuarios del sistema y sus contraseñas.
 */
class UserModel
{
    public const ROLES = ['owner', 'admin'];
    public const MIN_PASSWORD_LENGTH = 12;

    // Límite compatible con bcrypt.
    public const MAX_PASSWORD_BYTES = 72;

    private mysqli $conn;

    public function __construct()
    {
        $this->conn = getConnection();
    }

    // ============================================================
    // VALIDACIONES
    // ============================================================

    // Valida el nombre de usuario.
    public static function isValidUsername(string $username): bool
    {
        return preg_match('/^[A-Za-z0-9._-]{3,50}$/', $username) === 1;
    }

    // Devuelve null si la contraseña es válida.
    public static function validatePassword(string $password): ?string
    {
        if (str_contains($password, "\0")) {
            return 'La contraseña contiene caracteres no válidos.';
        }

        if (mb_strlen($password) < self::MIN_PASSWORD_LENGTH) {
            return 'La nueva contraseña debe tener al menos ' . self::MIN_PASSWORD_LENGTH . ' caracteres.';
        }

        if (strlen($password) > self::MAX_PASSWORD_BYTES) {
            return 'La contraseña es demasiado larga (máximo ' . self::MAX_PASSWORD_BYTES . ' bytes).';
        }

        return null;
    }

    // ============================================================
    // LECTURA
    // ============================================================

    // Devuelve un usuario por ID, sin incluir el hash.
    public function findById(int $id): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT id, username, role, active, last_login_at, password_changed_at, created_at
            FROM users
            WHERE id = ?
            LIMIT 1
        ");

        $stmt->bind_param('i', $id);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        if (!$row) {
            return null;
        }

        $row['id'] = (int)$row['id'];
        $row['active'] = (bool)$row['active'];

        return $row;
    }

    // Comprueba si el nombre de usuario ya existe.
    public function usernameExists(string $username): bool
    {
        $stmt = $this->conn->prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
        $stmt->bind_param('s', $username);
        $stmt->execute();

        return $stmt->get_result()->num_rows > 0;
    }

    // ============================================================
    // AUTENTICACIÓN
    // ============================================================

    // Valida las credenciales y devuelve los datos públicos del usuario.
    public function authenticate(string $username, string $password): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT id, username, password_hash, role, active
            FROM users
            WHERE username = ?
            LIMIT 1
        ");

        $stmt->bind_param('s', $username);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc() ?: null;

        $valid = $this->verifyPassword($password, $row['password_hash'] ?? null);

        if ($row === null || !$valid || !(bool)$row['active']) {
            return null;
        }

        $id = (int)$row['id'];

        if (password_needs_rehash($row['password_hash'], self::hashAlgo(), self::hashOptions())) {
            $this->updateHash($id, self::hashPassword($password));
        }

        $this->touchLastLogin($id);

        return [
            'id'       => $id,
            'username' => $row['username'],
            'role'     => $row['role'],
        ];
    }

    // Comprueba la contraseña de un usuario.
    public function verifyUserPassword(int $id, string $password): bool
    {
        $stmt = $this->conn->prepare("SELECT password_hash FROM users WHERE id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc() ?: null;

        return $this->verifyPassword($password, $row['password_hash'] ?? null);
    }

    // ============================================================
    // ESCRITURA
    // ============================================================

    // Crea un usuario y devuelve su ID.
    public function create(string $username, string $password, string $role = 'owner'): int
    {
        if (!self::isValidUsername($username)) {
            throw new InvalidArgumentException('El usuario debe tener entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo.');
        }

        $passwordError = self::validatePassword($password);
        if ($passwordError !== null) {
            throw new InvalidArgumentException($passwordError);
        }

        if (!in_array($role, self::ROLES, true)) {
            throw new InvalidArgumentException('Rol inválido.');
        }

        if ($this->usernameExists($username)) {
            throw new InvalidArgumentException('El nombre de usuario ya existe.');
        }

        $hash = self::hashPassword($password);

        $stmt = $this->conn->prepare("
            INSERT INTO users (username, password_hash, role, password_changed_at)
            VALUES (?, ?, ?, NOW())
        ");

        $stmt->bind_param('sss', $username, $hash, $role);
        $stmt->execute();

        return (int)$this->conn->insert_id;
    }

    // Actualiza la contraseña de un usuario.
    public function changePassword(int $id, string $newPassword): bool
    {
        $passwordError = self::validatePassword($newPassword);
        if ($passwordError !== null) {
            throw new InvalidArgumentException($passwordError);
        }

        $hash = self::hashPassword($newPassword);

        $stmt = $this->conn->prepare("
            UPDATE users
            SET password_hash = ?, password_changed_at = NOW()
            WHERE id = ?
        ");

        $stmt->bind_param('si', $hash, $id);
        $stmt->execute();

        return $stmt->affected_rows === 1;
    }

    // ============================================================
    // INTERNOS
    // ============================================================

    // Usa Argon2id o bcrypt según el soporte de PHP.
    private static function hashAlgo(): string
    {
        return defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
    }

    private static function hashOptions(): array
    {
        if (self::hashAlgo() === PASSWORD_BCRYPT) {
            return ['cost' => 12];
        }

        return ['memory_cost' => 65536, 'time_cost' => 4, 'threads' => 1];
    }

    private static function hashPassword(string $password): string
    {
        return password_hash($password, self::hashAlgo(), self::hashOptions());
    }

    // Verifica la contraseña; si no hay usuario, calcula un hash de relleno.
    private function verifyPassword(string $password, ?string $hash): bool
    {
        if ($hash === null) {
            self::hashPassword('relleno-para-igualar-tiempos');
            return false;
        }

        return password_verify($password, $hash);
    }

    // Actualiza el hash sin cambiar la fecha de cambio de contraseña.
    private function updateHash(int $id, string $hash): void
    {
        $stmt = $this->conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $stmt->bind_param('si', $hash, $id);
        $stmt->execute();
    }

    private function touchLastLogin(int $id): void
    {
        $stmt = $this->conn->prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
    }
}
