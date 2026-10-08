<?php

require_once __DIR__ . '/../config/database.php';

class ServiceModel
{
    private mysqli $conn;

    private const COLUMNS = "
        id, name, description, duration, price, active, created_at, updated_at
    ";

    public function __construct()
    {
        $this->conn = getConnection();
    }

    // ============================================================
    // LISTADOS
    // ============================================================

    // Servicios activos: selector de nuevos turnos.
    public function getActive(int $ownerId): array
    {
        $stmt = $this->conn->prepare("
            SELECT id, name, description, duration, price, active
            FROM services
            WHERE owner_id = ?
              AND active = 1
            ORDER BY name ASC
        ");

        $stmt->bind_param('i', $ownerId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    // Listado paginado (activos e inactivos) para el panel administrativo.
    // Busca por nombre (empieza con el texto ingresado).
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
            $where[] = 'name LIKE ?';
            $types .= 's';
            $params[] = addcslashes($query, '%_\\') . '%';
        }

        $whereSql = implode(' AND ', $where);

        $stmt = $this->conn->prepare("SELECT COUNT(*) AS total FROM services WHERE {$whereSql}");
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $total = (int)$stmt->get_result()->fetch_assoc()['total'];

        $stmt = $this->conn->prepare("
            SELECT " . self::COLUMNS . "
            FROM services
            WHERE {$whereSql}
            ORDER BY active DESC, name ASC
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

    // Trae un solo servicio por su ID, esté activo o no
    // (a diferencia de getActive(), que solo trae los activos).
    public function getById(int $ownerId, int $id): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT " . self::COLUMNS . "
            FROM services
            WHERE id = ?
              AND owner_id = ?
            LIMIT 1
        ");

        $stmt->bind_param('ii', $id, $ownerId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc() ?: null;
    }

    // ============================================================
    // ALTA / MODIFICACIÓN
    // ============================================================

    // Crea un servicio activo. Devuelve el ID generado o false si falló.
    public function create(int $ownerId, array $data): int|false
    {
        $stmt = $this->conn->prepare("
            INSERT INTO services (owner_id, name, description, duration, price, active)
            VALUES (?, ?, ?, ?, ?, TRUE)
        ");

        $stmt->bind_param(
            'issid',
            $ownerId,
            $data['name'],
            $data['description'],
            $data['duration'],
            $data['price']
        );

        if (!$stmt->execute()) {
            return false;
        }

        return $this->conn->insert_id;
    }

    // Actualiza nombre, descripción, duración y precio base.
    // No toca "active" ni los turnos ya creados (appointments.price es independiente).
    public function update(int $ownerId, int $id, array $data): bool
    {
        $stmt = $this->conn->prepare("
            UPDATE services
            SET name = ?,
                description = ?,
                duration = ?,
                price = ?
            WHERE id = ?
              AND owner_id = ?
        ");

        $stmt->bind_param(
            'ssidii',
            $data['name'],
            $data['description'],
            $data['duration'],
            $data['price'],
            $id,
            $ownerId
        );

        return $stmt->execute();
    }

    // ============================================================
    // ACTIVAR / DESACTIVAR
    // ============================================================

    // Reactiva un servicio (vuelve a aparecer en el selector de turnos).
    public function activate(int $ownerId, int $id): bool
    {
        return $this->setActiveState($ownerId, $id, 1);
    }

    // Baja lógica: deja de aparecer en el selector, pero el historial no se afecta.
    public function deactivate(int $ownerId, int $id): bool
    {
        return $this->setActiveState($ownerId, $id, 0);
    }

    private function setActiveState(int $ownerId, int $id, int $active): bool
    {
        $stmt = $this->conn->prepare("UPDATE services SET active = ? WHERE id = ? AND owner_id = ?");
        $stmt->bind_param('iii', $active, $id, $ownerId);

        return $stmt->execute();
    }

    // ============================================================
    // ELIMINACIÓN
    // ============================================================

    // Cuenta turnos y fichas técnicas que usan este servicio.
    public function countRelatedAppointments(int $ownerId, int $id): int
    {
        $stmt = $this->conn->prepare("
            SELECT
                (SELECT COUNT(*) FROM appointments WHERE service_id = ? AND owner_id = ?)
              + (SELECT COUNT(*) FROM service_history WHERE service_id = ? AND owner_id = ?) AS total
        ");

        $stmt->bind_param('iiii', $id, $ownerId, $id, $ownerId);
        $stmt->execute();

        return (int)($stmt->get_result()->fetch_assoc()['total'] ?? 0);
    }

    // Elimina físicamente un servicio. La comprobación de relaciones la hace el
    // controlador; la FK ON DELETE RESTRICT es la red de seguridad final.
    public function delete(int $ownerId, int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM services WHERE id = ? AND owner_id = ?");
        $stmt->bind_param('ii', $id, $ownerId);

        return $stmt->execute();
    }
}
