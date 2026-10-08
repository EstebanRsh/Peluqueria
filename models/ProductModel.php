<?php

require_once __DIR__ . '/../config/database.php';

class ProductModel
{
    private mysqli $conn;

    // Campos standard a retornar en las consultas de productos
    private const COLUMNS = "
        id, name, brand, measurement_unit, stock,
        unit_cost, active, created_at, updated_at
    ";

    public function __construct()
    {
        $this->conn = getConnection();
    }

    // Escapa % y _ para que se busquen como texto literal en un LIKE.
    private function escapeLike(string $text): string
    {
        return addcslashes($text, '%_\\');
    }

    // Productos activos (con tope de seguridad; para selectores usar search()).
    public function getActive(int $ownerId): array
    {
        $stmt = $this->conn->prepare("
            SELECT " . self::COLUMNS . "
            FROM products
            WHERE owner_id = ?
              AND active = 1
            ORDER BY name ASC
            LIMIT 500
        ");

        $stmt->bind_param('i', $ownerId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    // Listado paginado para el panel de administración.
    // Busca por nombre o marca (contiene el texto).
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
            $like = '%' . $this->escapeLike($query) . '%';
            $where[] = '(name LIKE ? OR brand LIKE ?)';
            $types .= 'ss';
            array_push($params, $like, $like);
        }

        $whereSql = implode(' AND ', $where);

        // Total de registros que cumplen el filtro
        $stmt = $this->conn->prepare("SELECT COUNT(*) AS total FROM products WHERE {$whereSql}");
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $total = (int)$stmt->get_result()->fetch_assoc()['total'];

        // Página solicitada
        $stmt = $this->conn->prepare("
            SELECT " . self::COLUMNS . "
            FROM products
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

    // Trae un solo producto por su ID, o null si no existe.
    public function getById(int $ownerId, int $id): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT " . self::COLUMNS . "
            FROM products
            WHERE id = ?
              AND owner_id = ?
            LIMIT 1
        ");

        $stmt->bind_param('ii', $id, $ownerId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc() ?: null;
    }

    // Autocompletado: productos activos por nombre o marca, máximo 15.
    public function search(int $ownerId, string $query): array
    {
        $query = trim($query);

        if ($query === '') {
            return [];
        }

        $stmt = $this->conn->prepare("
            SELECT id, name, brand, measurement_unit
            FROM products
            WHERE owner_id = ?
              AND active = 1
              AND (name LIKE ? OR brand LIKE ?)
            ORDER BY name ASC
            LIMIT 15
        ");

        $term = '%' . $this->escapeLike($query) . '%';
        $stmt->bind_param('iss', $ownerId, $term, $term);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    // Inserta un producto nuevo en la base de datos.
    public function create(
        int $ownerId,
        string $name,
        ?string $brand,
        string $measurementUnit,
        float $stock,
        float $unitCost
    ): bool {
        $stmt = $this->conn->prepare("
            INSERT INTO products (owner_id, name, brand, measurement_unit, stock, unit_cost)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        $stmt->bind_param('isssdd', $ownerId, $name, $brand, $measurementUnit, $stock, $unitCost);

        return $stmt->execute();
    }

    // Actualiza todos los datos de un producto existente.
    public function update(
        int $ownerId,
        int $id,
        string $name,
        ?string $brand,
        string $measurementUnit,
        float $stock,
        float $unitCost
    ): bool {
        $stmt = $this->conn->prepare("
            UPDATE products
            SET name = ?,
                brand = ?,
                measurement_unit = ?,
                stock = ?,
                unit_cost = ?
            WHERE id = ?
              AND owner_id = ?
        ");

        $stmt->bind_param('sssddii', $name, $brand, $measurementUnit, $stock, $unitCost, $id, $ownerId);

        return $stmt->execute();
    }

    // Activa / desactiva un producto (solo cambia la columna "active").
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
        $stmt = $this->conn->prepare("UPDATE products SET active = ? WHERE id = ? AND owner_id = ?");
        $stmt->bind_param('iii', $active, $id, $ownerId);

        return $stmt->execute();
    }

    // ¿Fue consumido en alguna ficha técnica? Si sí, no se puede eliminar.
    public function hasConsumptions(int $ownerId, int $id): bool
    {
        $stmt = $this->conn->prepare("
            SELECT EXISTS(SELECT 1 FROM service_consumptions WHERE product_id = ? AND owner_id = ?) AS used
        ");

        $stmt->bind_param('ii', $id, $ownerId);
        $stmt->execute();

        return (bool)$stmt->get_result()->fetch_assoc()['used'];
    }

    // Borra el producto definitivamente. Vuelve a chequear consumos por seguridad.
    public function delete(int $ownerId, int $id): bool
    {
        if ($this->hasConsumptions($ownerId, $id)) {
            return false;
        }

        $stmt = $this->conn->prepare("DELETE FROM products WHERE id = ? AND owner_id = ?");
        $stmt->bind_param('ii', $id, $ownerId);

        return $stmt->execute();
    }
}
