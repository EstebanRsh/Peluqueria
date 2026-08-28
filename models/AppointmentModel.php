<?php
require_once __DIR__ . '/../config/database.php';

class AppointmentModel
{
    private mysqli $conn;

    public function __construct()
    {
        $this->conn = getConnection();
    }

    public function getByDate(string $date, string $search = '', string $status = 'todos'): array
    {
        $query = "SELECT * FROM appointments WHERE date = ?";
        $types = 's';
        $params = [$date];

        if (!empty($search)) {
            $query .= " AND (patient_name LIKE ? OR doctor LIKE ?)";
            $types .= 'ss';
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
        }

        // Sincronización exacta de slugs JS a texto de Base de Datos
        if ($status !== 'todos') {
            $mappedStatus = $status;
            if ($status === 'reservado')           $mappedStatus = 'Reservado';
            if ($status === 'en-sala-de-espera')   $mappedStatus = 'En sala de espera';
            if ($status === 'en-atencion')         $mappedStatus = 'En atención';
            if ($status === 'finalizado')          $mappedStatus = 'Finalizado';
            if ($status === 'ausente')             $mappedStatus = 'Ausente';
            if ($status === 'cancelado')           $mappedStatus = 'Cancelado';

            $query .= " AND status = ?";
            $types .= 's';
            $params[] = $mappedStatus;
        }

        $query .= " ORDER BY time_start ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function create(array $data): bool
    {
        $this->conn->begin_transaction();
        try {
            $stmt = $this->conn->prepare("
                INSERT INTO appointments (patient_name, phone, social_work, payment, doctor, notes, date, time_start, time_end, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param(
                'sssdssssss',
                $data['patient_name'],
                $data['phone'],
                $data['social_work'],
                $data['payment'],
                $data['doctor'],
                $data['notes'],
                $data['date'],
                $data['time_start'],
                $data['time_end'],
                $data['status']
            );
            $stmt->execute();
            $appointmentId = $this->conn->insert_id;

            // Intentar registrar el estado inicial en el historial
            $stmtHist = $this->conn->prepare("INSERT INTO appointment_history (appointment_id, status_from, status_to) VALUES (?, NULL, ?)");
            if ($stmtHist) {
                $stmtHist->bind_param('is', $appointmentId, $data['status']);
                $stmtHist->execute();
            }

            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollback();
            return false;
        }
    }

    public function updateStatus(int $id, string $newStatus): bool
    {
        $this->conn->begin_transaction();
        try {
            // Obtener estado anterior
            $stmtOld = $this->conn->prepare("SELECT status FROM appointments WHERE id = ?");
            $stmtOld->bind_param('i', $id);
            $stmtOld->execute();
            $resOld = $stmtOld->get_result()->fetch_assoc();
            $oldStatus = $resOld ? $resOld['status'] : null;

            // Actualizar estado del turno
            $stmtUp = $this->conn->prepare("UPDATE appointments SET status = ? WHERE id = ?");
            $stmtUp->bind_param('si', $newStatus, $id);
            $stmtUp->execute();

            // Insertar en historial de flujo de forma segura
            $stmtHist = $this->conn->prepare("INSERT INTO appointment_history (appointment_id, status_from, status_to) VALUES (?, ?, ?)");
            if ($stmtHist) {
                $stmtHist->bind_param('iss', $id, $oldStatus, $newStatus);
                $stmtHist->execute();
            }

            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollback();
            return false;
        }
    }

    public function getHistory(int $appointmentId): array
    {
        // Usamos una verificación simple por si la tabla de historial no se creó aún
        try {
            $stmt = $this->conn->prepare("SELECT * FROM appointment_history WHERE appointment_id = ? ORDER BY changed_at ASC");
            if (!$stmt) return [];
            $stmt->bind_param('i', $appointmentId);
            $stmt->execute();
            return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        } catch (Exception $e) {
            return [];
        }
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM appointments WHERE id = ?");
        $stmt->bind_param('i', $id);
        return $stmt->execute();
    }
}
