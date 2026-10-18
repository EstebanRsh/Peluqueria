<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Registro de intentos de acceso para limitar la fuerza bruta y los registros masivos.
 * Guarda solo el hash de la clave, nunca la IP, el usuario ni el email.
 */
class AuthAttemptModel
{
    private mysqli $conn;

    public function __construct()
    {
        $this->conn = getConnection();
    }

    public function tooMany(string $scope, string $key, int $max, int $seconds): bool
    {
        $hash = self::hashKey($key);

        $stmt = $this->conn->prepare("
            SELECT COUNT(*) AS total
            FROM auth_attempts
            WHERE scope = ? AND key_hash = ? AND created_at > NOW() - INTERVAL ? SECOND
        ");

        $stmt->bind_param('ssi', $scope, $hash, $seconds);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        return (int)($row['total'] ?? 0) >= $max;
    }

    public function record(string $scope, string $key): void
    {
        $hash = self::hashKey($key);

        $stmt = $this->conn->prepare("INSERT INTO auth_attempts (scope, key_hash) VALUES (?, ?)");
        $stmt->bind_param('ss', $scope, $hash);
        $stmt->execute();

        $this->conn->query("DELETE FROM auth_attempts WHERE created_at < NOW() - INTERVAL 1 DAY");
    }

    public function clear(string $scope, string $key): void
    {
        $hash = self::hashKey($key);

        $stmt = $this->conn->prepare("DELETE FROM auth_attempts WHERE scope = ? AND key_hash = ?");
        $stmt->bind_param('ss', $scope, $hash);
        $stmt->execute();
    }

    private static function hashKey(string $key): string
    {
        return hash('sha256', $key);
    }
}
