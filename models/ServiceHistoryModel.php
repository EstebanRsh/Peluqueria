<?php

// ============================================================
// FICHA TÉCNICA
// Fichas de servicio, descuento de stock de los productos usados e historial técnico.
// ============================================================

require_once __DIR__ . '/../config/database.php';

class ServiceHistoryException extends RuntimeException {}

class ServiceHistoryModel
{
    private mysqli $conn;

    public function __construct()
    {
        $this->conn = getConnection();
    }

    // ============================================================
    // CONSULTAS DE CONTEXTO (TURNO Y SERVICIO)
    // ============================================================

    public function getAppointmentContext(int $ownerId, int $appointmentId): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT
                a.id,
                a.client_id,
                a.client_name,
                a.service_id,
                a.status,
                COALESCE((
                    SELECT GROUP_CONCAT(sv.name ORDER BY aps.position SEPARATOR ' + ')
                    FROM appointment_services aps
                    INNER JOIN services sv ON sv.id = aps.service_id
                    WHERE aps.appointment_id = a.id
                ), s.name) AS service_name
            FROM appointments a
            INNER JOIN services s ON s.id = a.service_id
            WHERE a.id = ?
              AND a.owner_id = ?
            LIMIT 1
        ");

        $stmt->bind_param('ii', $appointmentId, $ownerId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc() ?: null;
    }

    public function getServiceName(int $ownerId, int $serviceId): ?string
    {
        $stmt = $this->conn->prepare("SELECT name FROM services WHERE id = ? AND owner_id = ? LIMIT 1");
        $stmt->bind_param('ii', $serviceId, $ownerId);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        return $row['name'] ?? null;
    }

    // ============================================================
    // GUARDAR FICHA DE SERVICIO (TRANSACCIÓN)
    // ============================================================

    public function save(int $ownerId, array $data, array $consumptions = []): int
    {
        $this->conn->begin_transaction();

        try {
            $json = $this->encodeDetails($data['technical_details']);

            if ($data['appointment_id'] !== null) {
                $historyId = $this->saveForAppointment($ownerId, $data, $json);
            } else {
                $historyId = $this->insert($ownerId, $data, $json);
            }

            if ($consumptions) {
                $this->applyConsumptions($ownerId, $historyId, $consumptions);
            }

            $this->conn->commit();

            return $historyId;
        } catch (Throwable $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    private function encodeDetails(array $details): string
    {
        foreach ($details as $key => $category) {
            if ($category === []) {
                $details[$key] = new stdClass();
            }
        }

        return json_encode(
            $details,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        );
    }

    private function saveForAppointment(int $ownerId, array $data, string $json): int
    {
        $stmt = $this->conn->prepare("
            SELECT id, technical_details
            FROM service_history
            WHERE appointment_id = ?
              AND owner_id = ?
            FOR UPDATE
        ");
        $stmt->bind_param('ii', $data['appointment_id'], $ownerId);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        if (!$row) {
            return $this->insert($ownerId, $data, $json);
        }

        if ($row['technical_details'] !== null) {
            throw new ServiceHistoryException('La ficha de este turno ya fue guardada.', 409);
        }

        $id = (int)$row['id'];

        $stmtUp = $this->conn->prepare("UPDATE service_history SET technical_details = ? WHERE id = ? AND owner_id = ?");
        $stmtUp->bind_param('sii', $json, $id, $ownerId);
        $stmtUp->execute();

        return $id;
    }

    private function insert(int $ownerId, array $data, string $json): int
    {
        $stmt = $this->conn->prepare("
            INSERT INTO service_history
                (owner_id, client_id, client_name, appointment_id, service_id,
                 service_name_snapshot, performed_at, technical_details)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
        ");

        $stmt->bind_param(
            'iisiiss',
            $ownerId,
            $data['client_id'],
            $data['client_name'],
            $data['appointment_id'],
            $data['service_id'],
            $data['service_name_snapshot'],
            $json
        );
        $stmt->execute();

        return $this->conn->insert_id;
    }

    // ============================================================
    // APLICAR CONSUMOS Y DESCUENTO DE STOCK
    // ============================================================

    private function applyConsumptions(int $ownerId, int $historyId, array $consumptions, bool $touchStock = true, array $keptProducts = []): void
    {
        ksort($consumptions);

        $stmtProduct = $this->conn->prepare("
            SELECT name, stock, unit_cost, active
            FROM products
            WHERE id = ?
              AND owner_id = ?
            FOR UPDATE
        ");

        $stmtInsert = $this->conn->prepare("
            INSERT INTO service_consumptions (owner_id, service_history_id, product_id, quantity_used, cost_snapshot)
            VALUES (?, ?, ?, ?, ?)
        ");

        $stmtStock = $this->conn->prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND owner_id = ?");

        foreach ($consumptions as $productId => $quantity) {
            $productId = (int)$productId;

            $stmtProduct->bind_param('ii', $productId, $ownerId);
            $stmtProduct->execute();

            $product = $stmtProduct->get_result()->fetch_assoc();

            if (!$product) {
                throw new ServiceHistoryException("Uno de los productos ya no existe (identificador {$productId}). Consultá con soporte.", 400);
            }

            if (!$product['active'] && !in_array($productId, $keptProducts, true)) {
                throw new ServiceHistoryException("El producto \"{$product['name']}\" está inactivo.", 409);
            }

            if ($touchStock && (float)$product['stock'] < $quantity) {
                throw new ServiceHistoryException(
                    "Stock insuficiente de \"{$product['name']}\" " .
                        "(disponible: {$product['stock']}, requerido: {$quantity}).",
                    409
                );
            }

            $cost = round($quantity * (float)$product['unit_cost'], 4);

            if ($cost > 99999999.9999) {
                throw new ServiceHistoryException("El costo calculado de \"{$product['name']}\" supera el máximo permitido.", 400);
            }

            $stmtInsert->bind_param('iiidd', $ownerId, $historyId, $productId, $quantity, $cost);
            $stmtInsert->execute();

            if ($touchStock) {
                $stmtStock->bind_param('dii', $quantity, $productId, $ownerId);
                $stmtStock->execute();
            }
        }
    }

    private function restoreStock(int $ownerId, array $totals): void
    {
        $stmt = $this->conn->prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND owner_id = ?");

        foreach ($totals as $productId => $quantity) {
            $productId = (int)$productId;
            $stmt->bind_param('dii', $quantity, $productId, $ownerId);
            $stmt->execute();
        }
    }

    // ============================================================
    // EDITAR Y ELIMINAR FICHA
    // ============================================================

    public function getConsumptionTotals(int $ownerId, int $historyId): array
    {
        $stmt = $this->conn->prepare("
            SELECT product_id, SUM(quantity_used) AS total
            FROM service_consumptions
            WHERE service_history_id = ?
              AND owner_id = ?
            GROUP BY product_id
        ");
        $stmt->bind_param('ii', $historyId, $ownerId);
        $stmt->execute();

        $totals = [];

        foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {
            $totals[(int)$row['product_id']] = round((float)$row['total'], 2);
        }

        return $totals;
    }

    public function stockPreview(int $ownerId, array $current, array $next): array
    {
        $stmt = $this->conn->prepare("
            SELECT name, measurement_unit, stock
            FROM products
            WHERE id = ?
              AND owner_id = ?
        ");

        $changes = [];
        $productIds = array_unique(array_merge(array_keys($current), array_keys($next)));
        sort($productIds);

        foreach ($productIds as $productId) {
            $productId = (int)$productId;
            $delta = round(($current[$productId] ?? 0) - ($next[$productId] ?? 0), 2);

            if ($delta == 0) {
                continue;
            }

            $stmt->bind_param('ii', $productId, $ownerId);
            $stmt->execute();
            $product = $stmt->get_result()->fetch_assoc();

            if (!$product) {
                throw new ServiceHistoryException("Uno de los productos ya no existe (identificador {$productId}). Consultá con soporte.", 400);
            }

            $changes[] = [
                'product_id' => $productId,
                'name'       => $product['name'],
                'unit'       => $product['measurement_unit'],
                'before'     => round((float)$product['stock'], 2),
                'after'      => round((float)$product['stock'] + $delta, 2),
            ];
        }

        return $changes;
    }

    public function update(int $ownerId, int $id, array $details, array $consumptions, bool $adjustStock): void
    {
        $this->conn->begin_transaction();

        try {
            $this->lockRecord($ownerId, $id);

            $previous = $this->getConsumptionTotals($ownerId, $id);

            if ($adjustStock) {
                $this->restoreStock($ownerId, $previous);
            }

            $stmt = $this->conn->prepare("DELETE FROM service_consumptions WHERE service_history_id = ? AND owner_id = ?");
            $stmt->bind_param('ii', $id, $ownerId);
            $stmt->execute();

            if ($consumptions) {
                $this->applyConsumptions($ownerId, $id, $consumptions, $adjustStock, array_keys($previous));
            }

            $json = $this->encodeDetails($details);
            $stmt = $this->conn->prepare("UPDATE service_history SET technical_details = ? WHERE id = ? AND owner_id = ?");
            $stmt->bind_param('sii', $json, $id, $ownerId);
            $stmt->execute();

            $this->conn->commit();
        } catch (Throwable $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    public function delete(int $ownerId, int $id, bool $adjustStock): void
    {
        $this->conn->begin_transaction();

        try {
            $this->lockRecord($ownerId, $id);

            if ($adjustStock) {
                $this->restoreStock($ownerId, $this->getConsumptionTotals($ownerId, $id));
            }

            $stmt = $this->conn->prepare("DELETE FROM service_history WHERE id = ? AND owner_id = ?");
            $stmt->bind_param('ii', $id, $ownerId);
            $stmt->execute();

            $this->conn->commit();
        } catch (Throwable $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    private function lockRecord(int $ownerId, int $id): void
    {
        $stmt = $this->conn->prepare("SELECT id FROM service_history WHERE id = ? AND owner_id = ? FOR UPDATE");
        $stmt->bind_param('ii', $id, $ownerId);
        $stmt->execute();

        if (!$stmt->get_result()->fetch_assoc()) {
            throw new ServiceHistoryException('La ficha no existe.', 404);
        }
    }

    // ============================================================
    // OBTENER FICHA TÉCNICA Y LECTURA
    // ============================================================

    public function getById(int $ownerId, int $id): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT
                id, client_id, client_name, appointment_id, service_id,
                service_name_snapshot, performed_at, technical_details, created_at
            FROM service_history
            WHERE id = ?
              AND owner_id = ?
            LIMIT 1
        ");

        $stmt->bind_param('ii', $id, $ownerId);
        $stmt->execute();

        $record = $stmt->get_result()->fetch_assoc();

        if (!$record) {
            return null;
        }

        $record['technical_details'] = $record['technical_details'] !== null
            ? json_decode($record['technical_details'], true)
            : null;

        return $record;
    }

    public function getTimelineByClient(int $ownerId, int $clientId): array
    {
        $stmt = $this->conn->prepare("
            SELECT 
                id, appointment_id, service_name_snapshot, performed_at, technical_details
            FROM service_history
            WHERE client_id = ?
              AND owner_id = ?
            ORDER BY performed_at DESC
        ");

        $stmt->bind_param('ii', $clientId, $ownerId);
        $stmt->execute();
        $result = $stmt->get_result();

        $timeline = [];
        while ($row = $result->fetch_assoc()) {
            $row['technical_details'] = $row['technical_details'] ? json_decode($row['technical_details'], true) : null;
            $timeline[] = $row;
        }

        return $timeline;
    }

    public function getConsumptions(int $ownerId, int $historyId): array
    {
        $stmt = $this->conn->prepare("
            SELECT 
                sc.product_id, sc.quantity_used, sc.cost_snapshot, p.name, p.measurement_unit
            FROM service_consumptions sc
            INNER JOIN products p ON sc.product_id = p.id
            WHERE sc.service_history_id = ?
              AND sc.owner_id = ?
        ");

        $stmt->bind_param('ii', $historyId, $ownerId);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}
