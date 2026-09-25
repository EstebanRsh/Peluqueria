<?php

require_once __DIR__ . '/../config/database.php';

// Excepción personalizada para errores de negocio (retorna código de estado HTTP adecuado)
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

    // Trae la información técnica del turno para asociarla automáticamente a la ficha
    public function getAppointmentContext(int $appointmentId): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT
                a.id,
                a.client_id,
                a.client_name,
                a.service_id,
                a.status,
                s.name AS service_name
            FROM appointments a
            INNER JOIN services s ON s.id = a.service_id
            WHERE a.id = ?
            LIMIT 1
        ");

        $stmt->bind_param('i', $appointmentId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc() ?: null;
    }

    // Obtiene el nombre del servicio para guardar la captura histórica (snapshot)
    public function getServiceName(int $serviceId): ?string
    {
        $stmt = $this->conn->prepare("SELECT name FROM services WHERE id = ? LIMIT 1");
        $stmt->bind_param('i', $serviceId);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        return $row['name'] ?? null;
    }

    // ============================================================
    // GUARDAR FICHA DE SERVICIO (TRANSACCIÓN)
    // ============================================================

    // Registra o actualiza la ficha técnica y procesa el descuento de stock de insumos.
    // Garantiza atomicidad: si falla el stock de un producto, se revierte toda la ficha.
    public function save(array $data, array $consumptions = []): int
    {
        $this->conn->begin_transaction();

        try {
            $details = $data['technical_details'];

            // Mantiene las categorías vacías como objetos de JSON {} en lugar de arrays []
            foreach ($details as $key => $category) {
                if ($category === []) {
                    $details[$key] = new stdClass();
                }
            }

            $json = json_encode(
                $details,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            );

            // Si viene de un turno, actualiza el registro base preexistente; si es suelto, inserta uno nuevo
            if ($data['appointment_id'] !== null) {
                $historyId = $this->saveForAppointment($data, $json);
            } else {
                $historyId = $this->insert($data, $json);
            }

            // Descuenta stock y registra consumos de insumos si existen
            if ($consumptions) {
                $this->applyConsumptions($historyId, $consumptions);
            }

            $this->conn->commit();

            return $historyId;
        } catch (Throwable $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    // Completa el registro base de un turno previamente creado
    private function saveForAppointment(array $data, string $json): int
    {
        // Se utiliza FOR UPDATE para bloquear el registro y evitar guardar dos fichas concurrentes
        $stmt = $this->conn->prepare("
            SELECT id, technical_details
            FROM service_history
            WHERE appointment_id = ?
            FOR UPDATE
        ");
        $stmt->bind_param('i', $data['appointment_id']);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        // En caso de que el turno no posea registro base en service_history
        if (!$row) {
            return $this->insert($data, $json);
        }

        // Si ya tenía detalles guardados, se rechaza para no descontar stock doblemente
        if ($row['technical_details'] !== null) {
            throw new ServiceHistoryException('La ficha de este turno ya fue guardada.', 409);
        }

        $id = (int)$row['id'];

        $stmtUp = $this->conn->prepare("UPDATE service_history SET technical_details = ? WHERE id = ?");
        $stmtUp->bind_param('si', $json, $id);
        $stmtUp->execute();

        return $id;
    }

    // Inserta una ficha de servicio sin turno previo (cliente ocasional o directo)
    private function insert(array $data, string $json): int
    {
        $stmt = $this->conn->prepare("
            INSERT INTO service_history
                (client_id, client_name, appointment_id, service_id,
                 service_name_snapshot, performed_at, technical_details)
            VALUES (?, ?, ?, ?, ?, NOW(), ?)
        ");

        $stmt->bind_param(
            'isiiss',
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

    // Registra los productos consumidos en service_consumptions y descuenta del inventario
    private function applyConsumptions(int $historyId, array $consumptions): void
    {
        // Se ordenan los IDs de forma ascendente para evitar bloqueos mutuos (deadlocks) en la base de datos
        ksort($consumptions);

        $stmtProduct = $this->conn->prepare("
            SELECT name, stock, unit_cost, active
            FROM products
            WHERE id = ?
            FOR UPDATE
        ");

        $stmtInsert = $this->conn->prepare("
            INSERT INTO service_consumptions (service_history_id, product_id, quantity_used, cost_snapshot)
            VALUES (?, ?, ?, ?)
        ");

        $stmtStock = $this->conn->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

        foreach ($consumptions as $productId => $quantity) {
            $productId = (int)$productId;

            $stmtProduct->bind_param('i', $productId);
            $stmtProduct->execute();

            $product = $stmtProduct->get_result()->fetch_assoc();

            if (!$product) {
                throw new ServiceHistoryException("El producto con ID {$productId} no existe.", 400);
            }

            if (!$product['active']) {
                throw new ServiceHistoryException("El producto \"{$product['name']}\" está inactivo.", 409);
            }

            if ((float)$product['stock'] < $quantity) {
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

            $stmtInsert->bind_param('iidd', $historyId, $productId, $quantity, $cost);
            $stmtInsert->execute();

            $stmtStock->bind_param('di', $quantity, $productId);
            $stmtStock->execute();
        }
    }

    // ============================================================
    // OBTENER FICHA TÉCNICA POR ID
    // ============================================================

    // Trae una ficha individual por su ID de historial
    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT
                id, client_id, client_name, appointment_id, service_id,
                service_name_snapshot, performed_at, technical_details, created_at
            FROM service_history
            WHERE id = ?
            LIMIT 1
        ");

        $stmt->bind_param('i', $id);
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
}
