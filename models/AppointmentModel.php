<?php

require_once __DIR__ . '/../config/database.php';

class AppointmentModel
{
    private mysqli $conn;

    public function __construct()
    {
        $this->conn = getConnection();
    }

    // ============================================================
    // OBTENER TURNOS
    // ============================================================

    // Obtiene los turnos de una fecha determinada,
    // incluyendo la información del servicio.
    public function getByDate(
        string $date,
        string $search = '',
        string $status = 'todos'
    ): array {
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
            WHERE appointments.date = ?
        ";

        $types = 's';
        $params = [$date];


        // Búsqueda por cliente o peluquero/a.
        if (!empty($search)) {

            $query .= "
                AND (
                    COALESCE(clients.alias, appointments.client_name) LIKE ?
                    OR COALESCE(clients.internal_code, '') LIKE ?
                    OR appointments.stylist LIKE ?
                )
            ";

            $types .= 'sss';
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }


        // Filtrado por estado.
        if ($status !== 'todos') {

            $mappedStatus = $status;

            if ($status === 'reservado') {
                $mappedStatus = 'Reservado';
            }

            if ($status === 'en-sala-de-espera') {
                $mappedStatus = 'En sala de espera';
            }

            if ($status === 'en-atencion') {
                $mappedStatus = 'En atención';
            }

            if ($status === 'finalizado') {
                $mappedStatus = 'Finalizado';
            }

            if ($status === 'ausente') {
                $mappedStatus = 'Ausente';
            }

            if ($status === 'cancelado') {
                $mappedStatus = 'Cancelado';
            }

            $query .= "
                AND appointments.status = ?
            ";

            $types .= 's';
            $params[] = $mappedStatus;
        }


        $query .= "
            ORDER BY appointments.time_start ASC
        ";


        $stmt =
            $this->conn->prepare($query);


        if (!$stmt) {
            return [];
        }


        $stmt->bind_param(
            $types,
            ...$params
        );

        $stmt->execute();

        return $stmt
            ->get_result()
            ->fetch_all(MYSQLI_ASSOC);
    }


    // ============================================================
    // OBTENER CLIENTE POR ID
    // ============================================================

    public function getClientById(
        int $clientId
    ): ?array {

        $stmt =
            $this->conn->prepare("
                SELECT
                    id,
                    alias,
                    internal_code,
                    active
                FROM clients
                WHERE id = ?
                LIMIT 1
            ");

        if (!$stmt) {
            return null;
        }

        $stmt->bind_param('i', $clientId);
        $stmt->execute();

        $client =
            $stmt
            ->get_result()
            ->fetch_assoc();

        return $client ?: null;
    }


    // ============================================================
    // OBTENER SERVICIO
    // ============================================================

    // Obtiene un servicio por su ID.
    // Se utiliza para comprobar que el servicio seleccionado
    // realmente existe antes de crear un turno.
    public function getServiceById(
        int $serviceId
    ): ?array {

        $stmt =
            $this->conn->prepare("
                SELECT
                    id,
                    name,
                    description,
                    duration,
                    price,
                    active
                FROM services
                WHERE id = ?
                LIMIT 1
            ");


        if (!$stmt) {
            return null;
        }


        $stmt->bind_param(
            'i',
            $serviceId
        );

        $stmt->execute();

        $service =
            $stmt
            ->get_result()
            ->fetch_assoc();


        return $service ?: null;
    }

    // ============================================================
    // CREAR TURNO
    // ============================================================

    // Crea un nuevo turno y registra su estado inicial en el historial.
    public function create(array $data): bool
    {
        $this->conn->begin_transaction();

        try {
            $clientId = $data['client_id'] ?? null;
            $clientName = trim($data['client_name'] ?? '');

            if ($clientId !== null && $clientId > 0 && $clientName === '') {
                $client = $this->getClientById((int)$clientId);

                if ($client && !empty($client['alias'])) {
                    $clientName = trim((string)$client['alias']);
                }
            }

            if ($clientId !== null && $clientId > 0) {
                $stmt = $this->conn->prepare("
                INSERT INTO appointments
                (
                    client_id,
                    client_name,
                    service_id,
                    stylist,
                    price,
                    notes,
                    date,
                    time_start,
                    time_end,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

                if (!$stmt) {
                    throw new Exception(
                        "No se pudo preparar la creación del turno: " .
                            $this->conn->error
                    );
                }

                $stmt->bind_param(
                    'issisdsssss',
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
            } else {
                $stmt = $this->conn->prepare("
                INSERT INTO appointments
                (
                    client_name,
                    service_id,
                    stylist,
                    price,
                    notes,
                    date,
                    time_start,
                    time_end,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

                if (!$stmt) {
                    throw new Exception(
                        "No se pudo preparar la creación del turno: " .
                            $this->conn->error
                    );
                }

                $stmt->bind_param(
                    'ssisdsssss',
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
            }

            if (!$stmt->execute()) {
                throw new Exception(
                    "No se pudo crear el turno: " .
                        $stmt->error
                );
            }

            $appointmentId = $this->conn->insert_id;

            $stmtHist = $this->conn->prepare("
            INSERT INTO appointment_history
            (
                appointment_id,
                status_from,
                status_to
            )
            VALUES (?, NULL, ?)
        ");

            if (!$stmtHist) {
                throw new Exception(
                    "No se pudo preparar el historial: " .
                        $this->conn->error
                );
            }

            $stmtHist->bind_param('is', $appointmentId, $data['status']);

            if (!$stmtHist->execute()) {
                throw new Exception(
                    "No se pudo registrar el historial: " .
                        $stmtHist->error
                );
            }

            // Registro mínimo de historial de atención por cliente
            // usando snapshot del servicio y precio del turno.
            $serviceName = '';
            $serviceStmt = $this->conn->prepare("SELECT name FROM services WHERE id = ? LIMIT 1");
            if ($serviceStmt) {
                $serviceStmt->bind_param('i', $data['service_id']);
                $serviceStmt->execute();
                $serviceRes = $serviceStmt->get_result()->fetch_assoc();
                $serviceName = $serviceRes['name'] ?? '';
            }

            $performedAt = $data['date'] . ' ' . $data['time_start'];

            if (!empty($data['client_id'])) {
                $stmtServiceHistory = $this->conn->prepare("
                    INSERT INTO service_history
                    (
                        client_id,
                        appointment_id,
                        service_id,
                        service_name_snapshot,
                        price,
                        performed_at,
                        stylist,
                        notes
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");

                if (!$stmtServiceHistory) {
                    throw new Exception(
                        "No se pudo preparar el historial de servicio: " .
                            $this->conn->error
                    );
                }

                $stmtServiceHistory->bind_param(
                    'iiisdsss',
                    $data['client_id'],
                    $appointmentId,
                    $data['service_id'],
                    $serviceName,
                    $data['price'],
                    $performedAt,
                    $data['stylist'],
                    $data['notes']
                );
            } else {
                $stmtServiceHistory = $this->conn->prepare("
                    INSERT INTO service_history
                    (
                        appointment_id,
                        service_id,
                        service_name_snapshot,
                        price,
                        performed_at,
                        stylist,
                        notes
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");

                if (!$stmtServiceHistory) {
                    throw new Exception(
                        "No se pudo preparar el historial de servicio: " .
                            $this->conn->error
                    );
                }

                $stmtServiceHistory->bind_param(
                    'iisdsss',
                    $appointmentId,
                    $data['service_id'],
                    $serviceName,
                    $data['price'],
                    $performedAt,
                    $data['stylist'],
                    $data['notes']
                );
            }

            if (!$stmtServiceHistory->execute()) {
                throw new Exception(
                    "No se pudo registrar el historial de servicio: " .
                        $stmtServiceHistory->error
                );
            }

            $this->conn->commit();

            return true;
        } catch (Exception $e) {
            $this->conn->rollback();
            error_log("Error al crear turno: " . $e->getMessage());
            return false;
        }
    }


    // ============================================================
    // ACTUALIZAR ESTADO
    // ============================================================

    // Actualiza el estado de un turno y registra
    // el cambio en el historial.
    public function updateStatus(
        int $id,
        string $newStatus
    ): bool {

        $this->conn->begin_transaction();


        try {

            // Obtener estado anterior.
            $stmtOld =
                $this->conn->prepare("
                    SELECT status
                    FROM appointments
                    WHERE id = ?
                ");


            if (!$stmtOld) {
                throw new Exception(
                    "No se pudo consultar el turno."
                );
            }


            $stmtOld->bind_param(
                'i',
                $id
            );

            $stmtOld->execute();


            $resOld =
                $stmtOld
                ->get_result()
                ->fetch_assoc();


            if (!$resOld) {
                throw new Exception(
                    "El turno no existe."
                );
            }


            $oldStatus =
                $resOld['status'];


            // Actualizar estado.
            $stmtUp =
                $this->conn->prepare("
                    UPDATE appointments
                    SET status = ?
                    WHERE id = ?
                ");


            if (!$stmtUp) {
                throw new Exception(
                    "No se pudo preparar la actualización."
                );
            }


            $stmtUp->bind_param(
                'si',
                $newStatus,
                $id
            );


            if (!$stmtUp->execute()) {
                throw new Exception(
                    "No se pudo actualizar el estado."
                );
            }


            // Registrar historial.
            $stmtHist =
                $this->conn->prepare("
                    INSERT INTO appointment_history
                    (
                        appointment_id,
                        status_from,
                        status_to
                    )
                    VALUES (?, ?, ?)
                ");


            if (!$stmtHist) {
                throw new Exception(
                    "No se pudo preparar el historial."
                );
            }


            $stmtHist->bind_param(
                'iss',
                $id,
                $oldStatus,
                $newStatus
            );


            if (!$stmtHist->execute()) {
                throw new Exception(
                    "No se pudo registrar el historial."
                );
            }


            $this->conn->commit();

            return true;
        } catch (Exception $e) {

            $this->conn->rollback();

            error_log(
                "Error al actualizar estado: " .
                    $e->getMessage()
            );

            return false;
        }
    }


    // ============================================================
    // HISTORIAL
    // ============================================================

    // Obtiene el historial de estados de un turno.
    public function getHistory(
        int $appointmentId
    ): array {

        try {

            $stmt =
                $this->conn->prepare("
                    SELECT *
                    FROM appointment_history
                    WHERE appointment_id = ?
                    ORDER BY changed_at ASC
                ");


            if (!$stmt) {
                return [];
            }


            $stmt->bind_param(
                'i',
                $appointmentId
            );

            $stmt->execute();


            return $stmt
                ->get_result()
                ->fetch_all(MYSQLI_ASSOC);
        } catch (Exception $e) {

            error_log(
                "Error al obtener historial: " .
                    $e->getMessage()
            );

            return [];
        }
    }


    // ============================================================
    // ELIMINAR TURNO
    // ============================================================

    // Elimina un turno por su ID.
    public function delete(
        int $id
    ): bool {

        $stmt =
            $this->conn->prepare("
                DELETE FROM appointments
                WHERE id = ?
            ");


        if (!$stmt) {
            return false;
        }


        $stmt->bind_param(
            'i',
            $id
        );


        return $stmt->execute();
    }
}
