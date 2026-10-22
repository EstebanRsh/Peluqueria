<?php

require_once __DIR__ . '/../config/database.php';

class AppointmentModel
{
    private mysqli $conn;

    // Estados oficiales del turno dentro del flujo de la agenda
    public const STATUSES = [
        'Reservado',
        'Finalizado',
        'Cancelado',
        'Ausente',
    ];

    // Mapeo de slugs de URL (?status=...) hacia el nombre real registrado en la base de datos
    public const STATUS_SLUGS = [
        'reservado'  => 'Reservado',
        'finalizado' => 'Finalizado',
        'ausente'    => 'Ausente',
        'cancelado'  => 'Cancelado',
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
                clients.internal_code AS client_internal_code,
                EXISTS (
                    SELECT 1 FROM service_history
                    WHERE service_history.appointment_id = appointments.id
                      AND service_history.technical_details IS NOT NULL
                ) AS has_record
            FROM appointments
            INNER JOIN services ON appointments.service_id = services.id
            LEFT JOIN clients ON clients.id = appointments.client_id
            WHERE appointments.owner_id = ?
              AND appointments.date = ?
        ";

        $types = 'is';
        $params = [$ownerId, $date];

        // Búsqueda por cliente: el alias empieza con el texto (dentro del día)
        if ($search !== '') {
            $query .= " AND COALESCE(clients.alias, appointments.client_name) LIKE ?";

            $types .= 's';
            $params[] = addcslashes($search, '%_\\') . '%';
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

        return $this->attachServices($ownerId, $stmt->get_result()->fetch_all(MYSQLI_ASSOC));
    }

    // Suma a cada turno su lista de servicios (con el precio y la duración con que se agendaron),
    // los nombres unidos y la duración total.
    private function attachServices(int $ownerId, array $appointments): array
    {
        if (!$appointments) {
            return $appointments;
        }

        $ids = array_map('intval', array_column($appointments, 'id'));
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $stmt = $this->conn->prepare("
            SELECT aps.appointment_id, aps.service_id AS id, s.name, aps.price, aps.duration
            FROM appointment_services aps
            INNER JOIN services s ON s.id = aps.service_id
            WHERE aps.owner_id = ?
              AND aps.appointment_id IN ({$placeholders})
            ORDER BY aps.appointment_id, aps.position
        ");
        $stmt->bind_param('i' . str_repeat('i', count($ids)), $ownerId, ...$ids);
        $stmt->execute();

        $byAppointment = [];

        foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {
            $byAppointment[$row['appointment_id']][] = [
                'id'       => (int)$row['id'],
                'name'     => $row['name'],
                'price'    => $row['price'],
                'duration' => (int)$row['duration'],
            ];
        }

        foreach ($appointments as &$appointment) {
            $services = $byAppointment[$appointment['id']] ?? [];

            $appointment['services'] = $services;

            if ($services) {
                $appointment['service_name'] = implode(' + ', array_column($services, 'name'));
                $appointment['service_duration'] = array_sum(array_column($services, 'duration'));
            }
        }
        unset($appointment);

        return $appointments;
    }

    // Servicios de un turno, en orden: [id, ...].
    private function getServiceIds(int $ownerId, int $appointmentId): array
    {
        $stmt = $this->conn->prepare("
            SELECT service_id FROM appointment_services
            WHERE appointment_id = ? AND owner_id = ?
            ORDER BY position
        ");
        $stmt->bind_param('ii', $appointmentId, $ownerId);
        $stmt->execute();

        return array_map('intval', array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC), 'service_id'));
    }

    // ============================================================
    // CONSULTAS AUXILIARES
    // ============================================================

    // Retorna el ID y estado de un turno por su ID, o null si no existe
    public function getById(int $ownerId, int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT id, status, client_id, service_id FROM appointments WHERE id = ? AND owner_id = ? LIMIT 1");
        $stmt->bind_param('ii', $id, $ownerId);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        if (!$row) {
            return null;
        }

        $row['service_ids'] = $this->getServiceIds($ownerId, $id);

        return $row;
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

    // Servicios (del owner) por id, en el mismo orden en que se pidieron.
    public function getServicesByIds(int $ownerId, array $ids): array
    {
        $services = [];

        foreach ($ids as $id) {
            $service = $this->getServiceById($ownerId, (int)$id);

            if ($service) {
                $services[] = $service;
            }
        }

        return $services;
    }

    // Guarda la lista de servicios de un turno. Conserva el precio y la duración con que
    // ya estaba cada servicio ($kept) y usa los actuales del catálogo para los nuevos.
    // $durations (duración elegida para este turno) tiene prioridad.
    private function insertServices(int $ownerId, int $appointmentId, array $services, array $durations = [], array $kept = []): void
    {
        $stmt = $this->conn->prepare("
            INSERT INTO appointment_services (owner_id, appointment_id, service_id, position, price, duration)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        foreach ($services as $index => $service) {
            $serviceId = (int)$service['id'];
            $position = $index + 1;
            $price = (float)($kept[$serviceId]['price'] ?? $service['price']);
            $duration = (int)($durations[$serviceId] ?? $kept[$serviceId]['duration'] ?? $service['duration']);

            $stmt->bind_param('iiiidi', $ownerId, $appointmentId, $serviceId, $position, $price, $duration);
            $stmt->execute();
        }
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

            $services = $this->getServicesByIds($ownerId, $data['service_ids']);
            $serviceName = implode(' + ', array_column($services, 'name'));
            $firstServiceId = (int)$services[0]['id'];

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
                $firstServiceId,
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

            $this->insertServices($ownerId, $appointmentId, $services, $data['service_durations']);

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
                $firstServiceId,
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
    // EDITAR TURNO
    // ============================================================

    // Actualiza los datos del turno, registra el cambio de estado si lo hubo y mantiene
    // sincronizada la ficha base. Si la ficha ya fue guardada, el cliente y el servicio
    // no se pueden cambiar (InvalidArgumentException).
    public function update(int $ownerId, int $id, array $data): bool
    {
        $this->conn->begin_transaction();

        try {
            $stmtOld = $this->conn->prepare("SELECT client_id, client_name, status FROM appointments WHERE id = ? AND owner_id = ? FOR UPDATE");
            $stmtOld->bind_param('ii', $id, $ownerId);
            $stmtOld->execute();

            $old = $stmtOld->get_result()->fetch_assoc();

            if (!$old) {
                $this->conn->rollback();
                return false;
            }

            $stmtSh = $this->conn->prepare("SELECT id, technical_details FROM service_history WHERE appointment_id = ? AND owner_id = ? FOR UPDATE");
            $stmtSh->bind_param('ii', $id, $ownerId);
            $stmtSh->execute();

            $record = $stmtSh->get_result()->fetch_assoc();

            $clientId = $data['client_id'] ?? null;
            $clientName = trim((string)($data['client_name'] ?? ''));

            if ($clientId !== null && $clientName === '') {
                $client = $this->getClientById($ownerId, (int)$clientId);
                $clientName = trim((string)($client['alias'] ?? ''));
            }

            $oldClientId = $old['client_id'] === null ? null : (int)$old['client_id'];
            $sameClient = $clientId === null
                ? ($oldClientId === null && (string)$old['client_name'] === $clientName)
                : $oldClientId === (int)$clientId;

            $oldServiceIds = $this->getServiceIds($ownerId, $id);
            $newServiceIds = array_map('intval', $data['service_ids']);
            $sameServices = count($oldServiceIds) === count($newServiceIds)
                && !array_diff($oldServiceIds, $newServiceIds);

            if (
                $record !== null
                && $record['technical_details'] !== null
                && (!$sameClient || !$sameServices)
            ) {
                $this->conn->rollback();
                throw new InvalidArgumentException('El turno ya tiene su ficha guardada: no se puede cambiar el cliente ni el servicio.');
            }

            $stmt = $this->conn->prepare("
                UPDATE appointments
                SET client_id = ?, client_name = ?, service_id = ?, stylist = ?, price = ?,
                    notes = ?, date = ?, time_start = ?, time_end = ?, status = ?
                WHERE id = ? AND owner_id = ?
            ");

            $services = $this->getServicesByIds($ownerId, $newServiceIds);
            $firstServiceId = (int)$services[0]['id'];

            $stmt->bind_param(
                'isisdsssssii',
                $clientId,
                $clientName,
                $firstServiceId,
                $data['stylist'],
                $data['price'],
                $data['notes'],
                $data['date'],
                $data['time_start'],
                $data['time_end'],
                $data['status'],
                $id,
                $ownerId
            );
            $stmt->execute();

            $kept = [];

            $stmtKept = $this->conn->prepare("SELECT service_id, price, duration FROM appointment_services WHERE appointment_id = ? AND owner_id = ?");
            $stmtKept->bind_param('ii', $id, $ownerId);
            $stmtKept->execute();

            foreach ($stmtKept->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {
                $kept[(int)$row['service_id']] = $row;
            }

            $stmtDel = $this->conn->prepare("DELETE FROM appointment_services WHERE appointment_id = ? AND owner_id = ?");
            $stmtDel->bind_param('ii', $id, $ownerId);
            $stmtDel->execute();

            $this->insertServices($ownerId, $id, $services, $data['service_durations'], $kept);

            if ($old['status'] !== $data['status']) {
                $stmtHist = $this->conn->prepare("
                    INSERT INTO appointment_history (owner_id, appointment_id, status_from, status_to)
                    VALUES (?, ?, ?, ?)
                ");
                $stmtHist->bind_param('iiss', $ownerId, $id, $old['status'], $data['status']);
                $stmtHist->execute();
            }

            if ($record !== null && $record['technical_details'] === null) {
                $serviceName = implode(' + ', array_column($services, 'name'));
                $shClientName = $clientId === null ? $clientName : null;
                $performedAt = $data['date'] . ' ' . $data['time_start'];
                $recordId = (int)$record['id'];

                $stmtUp = $this->conn->prepare("
                    UPDATE service_history
                    SET client_id = ?, client_name = ?, service_id = ?, service_name_snapshot = ?, performed_at = ?
                    WHERE id = ? AND owner_id = ?
                ");
                $stmtUp->bind_param('isissii', $clientId, $shClientName, $firstServiceId, $serviceName, $performedAt, $recordId, $ownerId);
                $stmtUp->execute();
            }

            $this->conn->commit();

            return true;
        } catch (InvalidArgumentException $e) {
            throw $e;
        } catch (Throwable $e) {
            $this->conn->rollback();
            error_log('Error al editar turno: ' . $e->getMessage());

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
