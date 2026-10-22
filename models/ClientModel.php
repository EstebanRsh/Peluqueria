<?php

// ============================================================
// CLIENTES
// Clientes del owner: listado, búsqueda, alta, edición, estado y baja.
// ============================================================

require_once __DIR__ . '/../config/database.php';

class ClientModel
{
    private mysqli $conn;

    private const COLUMNS = "
        id, internal_code, alias, natural_base_tone,
        hair_type, allergies, notes, active, created_at, updated_at
    ";

    public function __construct()
    {
        $this->conn = getConnection();
    }

    private function escapeLike(string $text): string
    {
        return addcslashes($text, '%_\\');
    }

    public function paginate(int $ownerId, string $query, string $filter, int $page, int $perPage): array
    {
        $where = ['owner_id = ?'];
        $types = 'i';
        $params = [$ownerId];

        if ($filter === 'activos') {
            $where[] = 'active = 1';
        } elseif ($filter === 'inactivos') {
            $where[] = 'active = 0';
        }

        $query = trim($query);
        if ($query !== '') {
            $where[] = 'alias LIKE ?';
            $types .= 's';
            $params[] = $this->escapeLike($query) . '%';
        }

        $whereSql = implode(' AND ', $where);

        $stmt = $this->conn->prepare("SELECT COUNT(*) AS total FROM clients WHERE {$whereSql}");
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $total = (int)$stmt->get_result()->fetch_assoc()['total'];

        $stmt = $this->conn->prepare("
            SELECT " . self::COLUMNS . "
            FROM clients
            WHERE {$whereSql}
            ORDER BY active DESC, alias ASC
            LIMIT ? OFFSET ?
        ");
        $offset = ($page - 1) * $perPage;
        $stmt->bind_param($types . 'ii', ...[...$params, $perPage, $offset]);
        $stmt->execute();

        return [
            'data'     => $stmt->get_result()->fetch_all(MYSQLI_ASSOC),
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
        ];
    }

    public function getById(int $ownerId, int $id): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT " . self::COLUMNS . "
            FROM clients
            WHERE id = ?
              AND owner_id = ?
            LIMIT 1
        ");

        $stmt->bind_param('ii', $id, $ownerId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc() ?: null;
    }

    public function search(int $ownerId, string $query): array
    {
        $query = trim($query);

        if ($query === '') {
            return [];
        }

        $stmt = $this->conn->prepare("
            SELECT id, alias, internal_code
            FROM clients
            WHERE owner_id = ?
              AND active = 1
              AND alias LIKE ?
            ORDER BY alias ASC
            LIMIT 15
        ");

        $aliasStart = $this->escapeLike($query) . '%';
        $stmt->bind_param('is', $ownerId, $aliasStart);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function create(int $ownerId, array $d): bool
    {
        $this->conn->begin_transaction();

        try {
            $stmt = $this->conn->prepare("
                INSERT INTO clients
                    (owner_id, alias, internal_code, natural_base_tone, hair_type, allergies, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->bind_param(
                'issssss',
                $ownerId,
                $d['alias'],
                $d['internal_code'],
                $d['natural_base_tone'],
                $d['hair_type'],
                $d['allergies'],
                $d['notes']
            );
            $stmt->execute();

            $newId = $this->conn->insert_id;

            if ($d['internal_code'] === null) {
                $finalCode = sprintf('CLI-%04d', $newId);

                $stmtUpdate = $this->conn->prepare("UPDATE clients SET internal_code = ? WHERE id = ?");
                $stmtUpdate->bind_param('si', $finalCode, $newId);
                $stmtUpdate->execute();
            }

            $this->conn->commit();
            return true;
        } catch (Throwable $e) {
            $this->conn->rollback();
            error_log('Error al crear cliente: ' . $e->getMessage());
            return false;
        }
    }

    public function update(int $ownerId, int $id, array $d): bool
    {
        $stmt = $this->conn->prepare("
            UPDATE clients
            SET alias = ?,
                internal_code = ?,
                natural_base_tone = ?,
                hair_type = ?,
                allergies = ?,
                notes = ?
            WHERE id = ?
              AND owner_id = ?
        ");

        $stmt->bind_param(
            'ssssssii',
            $d['alias'],
            $d['internal_code'],
            $d['natural_base_tone'],
            $d['hair_type'],
            $d['allergies'],
            $d['notes'],
            $id,
            $ownerId
        );

        return $stmt->execute();
    }

    public function activate(int $ownerId, int $id): bool
    {
        return $this->setActive($ownerId, $id, 1);
    }

    public function deactivate(int $ownerId, int $id): bool
    {
        return $this->setActive($ownerId, $id, 0);
    }

    private function setActive(int $ownerId, int $id, int $active): bool
    {
        $stmt = $this->conn->prepare("UPDATE clients SET active = ? WHERE id = ? AND owner_id = ?");
        $stmt->bind_param('iii', $active, $id, $ownerId);

        return $stmt->execute();
    }

    public function hasRelatedRecords(int $ownerId, int $id): bool
    {
        $stmt = $this->conn->prepare("
            SELECT (
                EXISTS(SELECT 1 FROM appointments WHERE client_id = ? AND owner_id = ?)
                OR EXISTS(SELECT 1 FROM service_history WHERE client_id = ? AND owner_id = ?)
            ) AS used
        ");

        $stmt->bind_param('iiii', $id, $ownerId, $id, $ownerId);
        $stmt->execute();

        return (bool)$stmt->get_result()->fetch_assoc()['used'];
    }

    public function delete(int $ownerId, int $id): bool
    {
        if ($this->hasRelatedRecords($ownerId, $id)) {
            return false;
        }

        $stmt = $this->conn->prepare("DELETE FROM clients WHERE id = ? AND owner_id = ?");
        $stmt->bind_param('ii', $id, $ownerId);

        return $stmt->execute();
    }

    public function existsInternalCode(int $ownerId, string $code, int $excludeId = 0): bool
    {
        $stmt = $this->conn->prepare("
            SELECT id
            FROM clients
            WHERE owner_id = ?
              AND internal_code = ?
              AND id != ?
            LIMIT 1
        ");

        $stmt->bind_param('isi', $ownerId, $code, $excludeId);
        $stmt->execute();

        return $stmt->get_result()->num_rows > 0;
    }
}
