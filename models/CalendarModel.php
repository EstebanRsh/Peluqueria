<?php
require_once __DIR__ . '/../config/database.php';

class CalendarModel
{
    private mysqli $conn;

    public function __construct()
    {
        $this->conn = getConnection();
    }

    public function getEventsByMonth(int $year, int $month): array
    {
        $start = "$year-" . str_pad($month, 2, '0', STR_PAD_LEFT) . "-01";
        $end   = date('Y-m-t', strtotime($start));
        // Consultamos la tabla appointments agrupando por fecha y estado
        $query = "
            SELECT date, status, COUNT(*) as total 
            FROM appointments 
            WHERE date BETWEEN ? AND ? 
            GROUP BY date, status
            ORDER BY date ASC, FIELD(status, 'En atención', 'En sala de espera', 'Reservado', 'Ausente', 'Cancelado', 'Finalizado') ASC
            ";

        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('ss', $start, $end);
        $stmt->execute();
        $result = $stmt->get_result();

        $summary = [];
        while ($row = $result->fetch_assoc()) {
            // Estructuramos el array indexado por fecha
            $summary[$row['date']][] = [
                'status' => $row['status'],
                'total'  => (int)$row['total']
            ];
        }
        return $summary;
    }
}
