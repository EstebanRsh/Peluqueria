<?php

// ============================================================
// CALENDARIO
// Resumen mensual de turnos por día y estado.
// ============================================================

require_once __DIR__ . '/../config/database.php';

class CalendarModel
{
    private mysqli $conn;

    public function __construct()
    {
        $this->conn = getConnection();
    }

    public function getEventsByMonth(int $ownerId, int $year, int $month): array
    {
        $firstDay = mktime(0, 0, 0, $month, 1, $year);
        $start = date('Y-m-01', $firstDay);
        $end   = date('Y-m-t', $firstDay);

        $stmt = $this->conn->prepare("
            SELECT date, status, COUNT(*) AS total
            FROM appointments
            WHERE owner_id = ?
              AND date BETWEEN ? AND ?
            GROUP BY date, status
            ORDER BY date ASC,
                FIELD(status, 'Reservado', 'Finalizado', 'Ausente', 'Cancelado') ASC
        ");

        $stmt->bind_param('iss', $ownerId, $start, $end);
        $stmt->execute();

        $summary = [];

        foreach ($stmt->get_result() as $row) {
            $summary[$row['date']][] = [
                'status' => $row['status'],
                'total'  => (int)$row['total'],
            ];
        }

        return $summary;
    }
}
