<?php

require_once __DIR__ . '/../config/database.php';

class ClientModel
{
    private mysqli $conn;

    public function __construct()
    {
        $this->conn = getConnection();
    }

    public function getActive(): array
    {
        $stmt = $this->conn->prepare("
            SELECT
                id,
                internal_code,
                alias,
                notes,
                active,
                created_at,
                updated_at
            FROM clients
            WHERE active = 1
            ORDER BY id ASC
        ");

        if (!$stmt) {
            return [];
        }

        $stmt->execute();

        return $stmt
            ->get_result()
            ->fetch_all(MYSQLI_ASSOC);
    }

    public function getAll(): array
    {
        $stmt = $this->conn->prepare("
            SELECT
                id,
                internal_code,
                alias,
                notes,
                active,
                created_at,
                updated_at
            FROM clients
            ORDER BY active DESC, alias ASC
        ");

        if (!$stmt) {
            return [];
        }

        $stmt->execute();

        return $stmt
            ->get_result()
            ->fetch_all(MYSQLI_ASSOC);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT
                id,
                internal_code,
                alias,
                notes,
                active,
                created_at,
                updated_at
            FROM clients
            WHERE id = ?
            LIMIT 1
        ");

        if (!$stmt) {
            return null;
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();

        $client = $stmt
            ->get_result()
            ->fetch_assoc();

        return $client ?: null;
    }

    public function search(string $query): array
    {
        $stmt = $this->conn->prepare("
            SELECT
                id,
                internal_code,
                alias,
                notes,
                active,
                created_at,
                updated_at
            FROM clients
            WHERE active = 1
              AND (
                  alias LIKE ?
                  OR internal_code LIKE ?
              )
            ORDER BY alias ASC
        ");

        if (!$stmt) {
            return [];
        }

        $search = "%{$query}%";

        $stmt->bind_param(
            'ss',
            $search,
            $search
        );

        $stmt->execute();

        return $stmt
            ->get_result()
            ->fetch_all(MYSQLI_ASSOC);
    }

    public function create(
        string $alias,
        ?string $internalCode,
        ?string $notes
    ): bool {
        $this->conn->begin_transaction();

        try {
            $stmt = $this->conn->prepare("
                INSERT INTO clients (alias, notes, internal_code)
                VALUES (?, ?, ?)
            ");

            if (!$stmt) {
                throw new Exception("Error al preparar la consulta de inserción.");
            }

            $normalizedCode = $internalCode !== null && trim($internalCode) !== ''
                ? strtoupper(trim($internalCode))
                : null;

            $stmt->bind_param('sss', $alias, $notes, $normalizedCode);
            $stmt->execute();

            $newId = $this->conn->insert_id;

            if ($normalizedCode === null || trim($normalizedCode) === '') {
                $finalCode = sprintf('CLI-%04d', $newId);

                $stmtUpdate = $this->conn->prepare("
                    UPDATE clients
                    SET internal_code = ?
                    WHERE id = ?
                ");

                if (!$stmtUpdate) {
                    throw new Exception("Error al asignar código interno.");
                }

                $stmtUpdate->bind_param('si', $finalCode, $newId);
                $stmtUpdate->execute();
            }

            $this->conn->commit();
            return true;
        } catch (Throwable $e) {
            $this->conn->rollback();
            error_log("Error al crear cliente: " . $e->getMessage());
            return false;
        }
    }

    public function update(
        int $id,
        string $alias,
        ?string $internalCode,
        ?string $notes
    ): bool {
        $stmt = $this->conn->prepare("
            UPDATE clients
            SET
                alias = ?,
                internal_code = ?,
                notes = ?
            WHERE id = ?
        ");

        if (!$stmt) {
            return false;
        }

        $stmt->bind_param(
            'sssi',
            $alias,
            $internalCode,
            $notes,
            $id
        );

        return $stmt->execute();
    }

    public function activate(int $id): bool
    {
        $stmt = $this->conn->prepare("
            UPDATE clients
            SET active = 1
            WHERE id = ?
        ");

        if (!$stmt) {
            return false;
        }

        $stmt->bind_param('i', $id);

        return $stmt->execute();
    }

    public function deactivate(int $id): bool
    {
        $stmt = $this->conn->prepare("
            UPDATE clients
            SET active = 0
            WHERE id = ?
        ");

        if (!$stmt) {
            return false;
        }

        $stmt->bind_param('i', $id);

        return $stmt->execute();
    }

    // ============================================================
    // VERIFICACIÓN DE RELACIONES CON TURNOS
    // ============================================================

    public function hasAppointments(int $id): bool
    {
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as total
            FROM appointments
            WHERE client_id = ?
        ");

        if (!$stmt) {
            return false;
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();

        $result = $stmt->get_result()->fetch_assoc();

        return ($result['total'] ?? 0) > 0;
    }

    // ============================================================
    // ELIMINAR CLIENTE
    // ============================================================

    public function delete(int $id): bool
    {
        if ($this->hasAppointments($id)) {
            return false;
        }

        $stmt = $this->conn->prepare("
            DELETE FROM clients
            WHERE id = ?
        ");

        if (!$stmt) {
            return false;
        }

        $stmt->bind_param('i', $id);

        return $stmt->execute();
    }

    // ============================================================
    // COMPROBAR UNICIDAD DE CÓDIGO INTERNO
    // ============================================================

    public function existsInternalCode(string $code, int $excludeId = 0): bool
    {
        $stmt = $this->conn->prepare("
            SELECT id 
            FROM clients 
            WHERE internal_code = ? AND id != ? 
            LIMIT 1
        ");

        if (!$stmt) {
            return false;
        }

        $stmt->bind_param('si', $code, $excludeId);
        $stmt->execute();

        return $stmt->get_result()->num_rows > 0;
    }
}
