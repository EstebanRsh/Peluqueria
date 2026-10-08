<?php

require_once __DIR__ . '/../config/database.php';

class AppointmentModel
{
    private mysqli $conn;

    // Estados oficiales del turno dentro del flujo de la agenda
    public const STATUSES = [
        'Reservado',
        'En sala de espera',
        'En atención',
        'Finalizado',
        'Cancelado',
        'Ausente',
    ];

    // Mapeo de slugs de URL (?status=...) hacia el nombre real registrado en la base de datos
    public const STATUS_SLUGS = [
        'reservado'         => 'Reservado',
        'en-sala-de-espera' => 'En sala de espera',
        'en-atencion'       => 'En atención',
        'finalizado'        => 'Finalizado',
        'ausente'           => 'Ausente',
        'cancelado'         => 'Cancelado',
    ];

    public function __construct()
    {
        $this->conn = getConnection();
    }

    // ============================================================
    // OBTENER TURNOS
    // ============================================================

    // Trae la lista de turnos de un día específico con datos relacionales (servicio y cliente).
    // $status debe ser 'todos' o el nombre exacto del estado.
    public function getByDate(int $ownerId, string $date, string $search = '', string $status = 'todos'): array
    {
        $query = "
            SELECT
                appointments.*,
                services.name AS service_name,
                services.duration AS service_duration,
                COALESCE(clients.alias, appointments.client_name) AS client_name,
                clients.internal_code AS client_internal_code
            FROM appointments
            INNER JOIN services ON appointments.service_id = services.id
            LEFT JOIN clients ON clients.id = appointments.client_id
            WHERE appointments.owner_id = ?
              AND appointments.date = ?
        ";

        $types = 'is';
        $params = [$ownerId, $date];

        // Búsqueda por cliente, código interno o profesional (filtrado dentro del día)
        if ($search !== '') {
            $query .= "
                AND (
                    COALESCE(clients.alias, appointments.client_name) LIKE ?
                    OR COALESCE(clients.internal_code, '') LIKE ?
                    OR appointments.stylist LIKE ?
                )
            ";

            $like = '%' . addcslashes($search, '%_\\') . '%';
            $types .= 'sss';
            array_push($params, $like, $like, $like);
        }

        if ($status !== 'todos') {
            $query .= " AND appointments.status = ?";
            $types .= 's';
            $params[] = $status;
        }

        $query .= " ORDER BY appointments.time_start ASC LIMIT 500";

        $stmt = $this->conn->prepare($query);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    // ============================================================
    // CONSULTAS AUXILIARES
    // ============================================================

    // Retorna el ID y estado de un turno por su ID, o null si no existe
    public function getById(int $ownerId, int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT id, status FROM appointments WHERE id = ? AND owner_id = ? LIMIT 1");
        $stmt->bind_param('ii', $id, $ownerId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc() ?: null;
    }

    // Consulta los datos de un cliente para verificar existencia y estado
    public function getClientById(int $ownerId, int $clientId): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT id, alias, internal_code, active
            FROM clients
            WHERE id = ?
              AND owner_id = ?
            LIMIT 1
        ");

        $stmt->bind_param('ii', $clientId, $ownerId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc() ?: null;
    }

    // Consulta los datos de un servicio para verificar existencia y estado
    public function getServiceById(int $ownerId, int $serviceId): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT id, name, description, duration, price, active
            FROM services
            WHERE id = ?
              AND owner_id = ?
            LIMIT 1
        ");

        $stmt->bind_param('ii', $serviceId, $ownerId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc() ?: null;
    }

    // ============================================================
    // CREAR TURNO
    // ============================================================

    // Crea un turno en la agenda, inicializa el historial de estados y genera un
    // registro base en service_history (sin detalles técnicos aún). Todo en una transacción.
    public function create(int $ownerId, array $data): bool
    {
        $this->conn->begin_transaction();

        try {
            $clientId = $data['client_id'] ?? null;
            $clientName = trim((string)($data['client_name'] ?? ''));

            // Si es un cliente registrado sin nombre provisto, se usa su alias actual
            if ($clientId !== null && $clientName === '') {
                $client = $this->getClientById($ownerId, (int)$clientId);
                $clientName = trim((string)($client['alias'] ?? ''));
            }

            $service = $this->getServiceById($ownerId, (int)$data['service_id']);
            $serviceName = $service['name'] ?? '';

            // ---- 1. Guardar turno ----
            $stmt = $this->conn->prepare("
                INSERT INTO appointments
                    (owner_id, client_id, client_name, service_id, stylist, price, notes,
                     date, time_start, time_end, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->bind_param(
                'iisisdsssss',
                $ownerId,
                $clientId,
                $clientName,
                $data['service_id'],
                $data['stylist'],
                $data['price'],
                $data['notes'],
                $data['date'],
                $data['time_start'],
                $data['time_end'],
                $data['status']
            );
            $stmt->execute();

            $appointmentId = $this->conn->insert_id;

            // ---- 2. Registrar el estado inicial ----
            $stmtHist = $this->conn->prepare("
                INSERT INTO appointment_history (owner_id, appointment_id, status_from, status_to)
                VALUES (?, ?, NULL, ?)
            ");
            $stmtHist->bind_param('iis', $ownerId, $appointmentId, $data['status']);
            $stmtHist->execute();

            // ---- 3. Generar la ficha técnica base ----
            $shClientId = $clientId;
            $shClientName = $clientId === null ? $clientName : null;
            $performedAt = $data['date'] . ' ' . $data['time_start'];

            $stmtSh = $this->conn->prepare("
                INSERT INTO service_history
                    (owner_id, client_id, client_name, appointment_id, service_id,
                     service_name_snapshot, performed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtSh->bind_param(
                'iisiiss',
                $ownerId,
                $shClientId,
                $shClientName,
                $appointmentId,
                $data['service_id'],
                $serviceName,
                $performedAt
            );
            $stmtSh->execute();

            $this->conn->commit();

            return true;
        } catch (Throwable $e) {
            $this->conn->rollback();
            error_log('Error al crear turno: ' . $e->getMessage());

            return false;
        }
    }

    // ============================================================
    // ACTUALIZAR ESTADO
    // ============================================================

    // Cambia el estado del turno y agrega el paso al historial.
    // Si el estado enviado es igual al actual, omite el guardado para no duplicar historial.
    public function updateStatus(int $ownerId, int $id, string $newStatus): bool
    {
        $this->conn->begin_transaction();

        try {
            // Se usa FOR UPDATE para bloquear la fila y prevenir inconsistencias por concurrencia
            $stmtOld = $this->conn->prepare("SELECT status FROM appointments WHERE id = ? AND owner_id = ? FOR UPDATE");
            $stmtOld->bind_param('ii', $id, $ownerId);
            $stmtOld->execute();

            $row = $stmtOld->get_result()->fetch_assoc();

            if (!$row) {
                $this->conn->rollback();
                return false;
            }

            $oldStatus = $row['status'];

            // Si no cambió de estado, cerramos la transacción sin modificar nada
            if ($oldStatus === $newStatus) {
                $this->conn->commit();
                return true;
            }

            $stmtUp = $this->conn->prepare("UPDATE appointments SET status = ? WHERE id = ? AND owner_id = ?");
            $stmtUp->bind_param('sii', $newStatus, $id, $ownerId);
            $stmtUp->execute();

            $stmtHist = $this->conn->prepare("
                INSERT INTO appointment_history (owner_id, appointment_id, status_from, status_to)
                VALUES (?, ?, ?, ?)
            ");
            $stmtHist->bind_param('iiss', $ownerId, $id, $oldStatus, $newStatus);
            $stmtHist->execute();

            $this->conn->commit();

            return true;
        } catch (Throwable $e) {
            $this->conn->rollback();
            error_log('Error al actualizar estado: ' . $e->getMessage());

            return false;
        }
    }

    // ============================================================
    // HISTORIAL DE ESTADOS
    // ============================================================

    // Retorna la trazabilidad cronológica de los cambios de estado de un turno
    public function getHistory(int $ownerId, int $appointmentId): array
    {
        $stmt = $this->conn->prepare("
            SELECT id, appointment_id, status_from, status_to, changed_at
            FROM appointment_history
            WHERE appointment_id = ?
              AND owner_id = ?
            ORDER BY changed_at ASC, id ASC
        ");

        $stmt->bind_param('ii', $appointmentId, $ownerId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    // ============================================================
    // ELIMINAR TURNO
    // ============================================================

    // Elimina un turno. Solo elimina el registro de service_history asociado si este
    // NO tiene detalles técnicos completados; si ya posee ficha cargada se preserva.
    public function delete(int $ownerId, int $id): bool
    {
        $this->conn->begin_transaction();

        try {
            // Borra la ficha técnica base vacía (si aún no fue completada)
            $stmtSh = $this->conn->prepare("
                DELETE FROM service_history
                WHERE appointment_id = ?
                  AND owner_id = ?
                  AND technical_details IS NULL
            ");
            $stmtSh->bind_param('ii', $id, $ownerId);
            $stmtSh->execute();

            $stmt = $this->conn->prepare("DELETE FROM appointments WHERE id = ? AND owner_id = ?");
            $stmt->bind_param('ii', $id, $ownerId);
            $stmt->execute();

            $deleted = $stmt->affected_rows > 0;

            $this->conn->commit();

            return $deleted;
        } catch (Throwable $e) {
            $this->conn->rollback();
            error_log('Error al eliminar turno: ' . $e->getMessage());

            return false;
        }
    }
}
