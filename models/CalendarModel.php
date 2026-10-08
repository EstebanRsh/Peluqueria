<?php
require_once __DIR__ . '/../config/database.php';

class CalendarModel
{
    private mysqli $conn;

    public function __construct()
    {
        $this->conn = getConnection();
    }

    // Retorna el resumen mensual agrupado por fecha y estado de turno.
    // Permite al calendario pintar los marcadores/contadores numéricos de cada día.
    public function getEventsByMonth(int $ownerId, int $year, int $month): array
    {
        // Primer y último día del mes solicitado
        $firstDay = mktime(0, 0, 0, $month, 1, $year);
        $start = date('Y-m-01', $firstDay);
        $end   = date('Y-m-t', $firstDay);

        // Agrupa por fecha y estado respetando el orden de flujo del negocio
        $stmt = $this->conn->prepare("
            SELECT date, status, COUNT(*) AS total
            FROM appointments
            WHERE owner_id = ?
              AND date BETWEEN ? AND ?
            GROUP BY date, status
            ORDER BY date ASC,
                FIELD(status, 'Reservado', 'En sala de espera', 'En atención', 'Finalizado', 'Ausente', 'Cancelado') ASC
        ");

        $stmt->bind_param('iss', $ownerId, $start, $end);
        $stmt->execute();

        $summary = [];

        // Modela la respuesta indexando por fecha (ej: $summary['2026-09-25'])
        foreach ($stmt->get_result() as $row) {
            $summary[$row['date']][] = [
                'status' => $row['status'],
                'total'  => (int)$row['total'],
            ];
        }

        return $summary;
    }
}
