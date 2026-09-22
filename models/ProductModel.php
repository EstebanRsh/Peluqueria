<?php

require_once __DIR__ . '/../config/database.php';

class ProductModel
{
    private mysqli $conn;

    private const COLUMNS = "
        id,
        name,
        brand,
        measurement_unit,
        stock,
        unit_cost,
        active,
        created_at,
        updated_at
    ";

    public function __construct()
    {
        $this->conn = getConnection();
    }

    public function getActive(): array
    {
        $stmt = $this->conn->prepare("
            SELECT " . self::COLUMNS . "
            FROM products
            WHERE active = 1
            ORDER BY name ASC
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
            SELECT " . self::COLUMNS . "
            FROM products
            ORDER BY active DESC, name ASC
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
            SELECT " . self::COLUMNS . "
            FROM products
            WHERE id = ?
            LIMIT 1
        ");

        if (!$stmt) {
            return null;
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();

        $product = $stmt
            ->get_result()
            ->fetch_assoc();

        return $product ?: null;
    }

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

        if (!$stmt) {
            return false;
        }

        $brandValue = $brand !== null ? trim((string) $brand) : '';

        $stmt->bind_param(
            'sssdd',
            $name,
            $brandValue,
            $measurementUnit,
            $stock,
            $unitCost
        );

        return $stmt->execute();
    }

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
            SET
                name = ?,
                brand = ?,
                measurement_unit = ?,
                stock = ?,
                unit_cost = ?
            WHERE id = ?
        ");

        if (!$stmt) {
            return false;
        }

        $brandValue = $brand !== null ? trim((string) $brand) : '';

        $stmt->bind_param(
            'sssddi',
            $name,
            $brandValue,
            $measurementUnit,
            $stock,
            $unitCost,
            $id
        );

        return $stmt->execute();
    }

    public function activate(int $id): bool
    {
        $stmt = $this->conn->prepare("
            UPDATE products
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
            UPDATE products
            SET active = 0
            WHERE id = ?
        ");

        if (!$stmt) {
            return false;
        }

        $stmt->bind_param('i', $id);

        return $stmt->execute();
    }

    public function hasConsumptions(int $id): bool
    {
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as total
            FROM service_consumptions
            WHERE product_id = ?
        ");

        if (!$stmt) {
            return false;
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();

        $result = $stmt->get_result()->fetch_assoc();

        return ($result['total'] ?? 0) > 0;
    }

    public function delete(int $id): bool
    {
        if ($this->hasConsumptions($id)) {
            return false;
        }

        $stmt = $this->conn->prepare("
            DELETE FROM products
            WHERE id = ?
        ");

        if (!$stmt) {
            return false;
        }

        $stmt->bind_param('i', $id);

        return $stmt->execute();
    }
}
