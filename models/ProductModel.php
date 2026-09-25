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
    public function getActive(): array
    {
        $stmt = $this->conn->prepare("
            SELECT " . self::COLUMNS . "
            FROM products
            WHERE active = 1
            ORDER BY name ASC
            LIMIT 500
        ");

        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    // Listado paginado para el panel de administración.
    // Busca por nombre o marca (contiene el texto).
    public function paginate(string $query, string $filter, int $page, int $perPage): array
    {
        $where = ['1=1'];
        $types = '';
        $params = [];

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
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
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
    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT " . self::COLUMNS . "
            FROM products
            WHERE id = ?
            LIMIT 1
        ");

        $stmt->bind_param('i', $id);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc() ?: null;
    }

    // Autocompletado: productos activos por nombre o marca, máximo 15.
    public function search(string $query): array
    {
        $query = trim($query);

        if ($query === '') {
            return [];
        }

        $stmt = $this->conn->prepare("
            SELECT id, name, brand, measurement_unit
            FROM products
            WHERE active = 1
              AND (name LIKE ? OR brand LIKE ?)
            ORDER BY name ASC
            LIMIT 15
        ");

        $term = '%' . $this->escapeLike($query) . '%';
        $stmt->bind_param('ss', $term, $term);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    // Inserta un producto nuevo en la base de datos.
    public function create(
        string $name,
        ?string $brand,
        string $measurementUnit,
        float $stock,
        float $unitCost
    ): bool {
        $stmt = $this->conn->prepare("
            INSERT INTO products (name, brand, measurement_unit, stock, unit_cost)
            VALUES (?, ?, ?, ?, ?)
        ");

        $stmt->bind_param('sssdd', $name, $brand, $measurementUnit, $stock, $unitCost);

        return $stmt->execute();
    }

    // Actualiza todos los datos de un producto existente.
    public function update(
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
        ");

        $stmt->bind_param('sssddi', $name, $brand, $measurementUnit, $stock, $unitCost, $id);

        return $stmt->execute();
    }

    // Activa / desactiva un producto (solo cambia la columna "active").
    public function activate(int $id): bool
    {
        return $this->setActive($id, 1);
    }

    public function deactivate(int $id): bool
    {
        return $this->setActive($id, 0);
    }

    private function setActive(int $id, int $active): bool
    {
        $stmt = $this->conn->prepare("UPDATE products SET active = ? WHERE id = ?");
        $stmt->bind_param('ii', $active, $id);

        return $stmt->execute();
    }

    // ¿Fue consumido en alguna ficha técnica? Si sí, no se puede eliminar.
    public function hasConsumptions(int $id): bool
    {
        $stmt = $this->conn->prepare("
            SELECT EXISTS(SELECT 1 FROM service_consumptions WHERE product_id = ?) AS used
        ");

        $stmt->bind_param('i', $id);
        $stmt->execute();

        return (bool)$stmt->get_result()->fetch_assoc()['used'];
    }

    // Borra el producto definitivamente. Vuelve a chequear consumos por seguridad.
    public function delete(int $id): bool
    {
        if ($this->hasConsumptions($id)) {
            return false;
        }

        $stmt = $this->conn->prepare("DELETE FROM products WHERE id = ?");
        $stmt->bind_param('i', $id);

        return $stmt->execute();
    }
}
