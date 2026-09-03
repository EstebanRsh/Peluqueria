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
                services.duration AS service_duration
            FROM appointments
            INNER JOIN services
                ON appointments.service_id = services.id
            WHERE appointments.date = ?
        ";

        $types = 's';
        $params = [$date];


        // Búsqueda por cliente o peluquero/a.
        if (!empty($search)) {

            $query .= "
                AND (
                    appointments.client_name LIKE ?
                    OR appointments.stylist LIKE ?
                )
            ";

            $types .= 'ss';

            $searchParam = "%$search%";

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
    // OBTENER SERVICIOS
    // ============================================================

    // Obtiene todos los servicios activos de la peluquería.
    public function getServices(): array
    {
        $stmt =
            $this->conn->prepare("
                SELECT
                    id,
                    name,
                    description,
                    duration,
                    price
                FROM services
                WHERE active = TRUE
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


    // ============================================================
    // CREAR TURNO
    // ============================================================

    // Crea un nuevo turno y registra su estado inicial
    // en el historial.
    public function create(
        array $data
    ): bool {

        $this->conn->begin_transaction();


        try {

            $stmt =
                $this->conn->prepare("
                    INSERT INTO appointments
                    (
                        client_name,
                        phone,
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
                $data['client_name'],
                $data['phone'],
                $data['service_id'],
                $data['stylist'],
                $data['price'],
                $data['notes'],
                $data['date'],
                $data['time_start'],
                $data['time_end'],
                $data['status']
            );


            if (!$stmt->execute()) {
                throw new Exception(
                    "No se pudo crear el turno: " .
                        $stmt->error
                );
            }


            $appointmentId =
                $this->conn->insert_id;


            // --------------------------------------------------------
            // HISTORIAL
            // --------------------------------------------------------

            $stmtHist =
                $this->conn->prepare("
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


            $stmtHist->bind_param(
                'is',
                $appointmentId,
                $data['status']
            );


            if (!$stmtHist->execute()) {
                throw new Exception(
                    "No se pudo registrar el historial: " .
                        $stmtHist->error
                );
            }


            $this->conn->commit();

            return true;
        } catch (Exception $e) {

            $this->conn->rollback();

            error_log(
                "Error al crear turno: " .
                    $e->getMessage()
            );

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
