<?php

require_once __DIR__ . '/../config/database.php';

class ServiceModel
{
    private mysqli $conn;

    public function __construct()
    {
        $this->conn = getConnection();
    }


    // ============================================================
    // OBTENER TODOS LOS SERVICIOS (ACTIVOS E INACTIVOS)
    // ============================================================

    // Obtiene todos los servicios, sin filtrar por estado activo.
    // Se utiliza en el panel administrativo de gestión de servicios.
    public function getAll(): array
    {
        $stmt =
            $this->conn->prepare("
                SELECT
                    id,
                    name,
                    description,
                    duration,
                    price,
                    active,
                    created_at,
                    updated_at
                FROM services
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

    public function getActive(): array
    {
        $stmt = $this->conn->prepare("
        SELECT
            id,
            name,
            description,
            duration,
            price,
            active
        FROM services
        WHERE active = 1
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
    // OBTENER SERVICIO POR ID
    // ============================================================

    // Obtiene un servicio puntual por su ID,
    // sin importar si está activo o inactivo.
    // Se usa para editar, activar/desactivar y validar antes de eliminar.
    public function getById(
        int $id
    ): ?array {

        $stmt =
            $this->conn->prepare("
                SELECT
                    id,
                    name,
                    description,
                    duration,
                    price,
                    active,
                    created_at,
                    updated_at
                FROM services
                WHERE id = ?
                LIMIT 1
            ");


        if (!$stmt) {
            return null;
        }


        $stmt->bind_param(
            'i',
            $id
        );

        $stmt->execute();

        $service =
            $stmt
            ->get_result()
            ->fetch_assoc();


        return $service ?: null;
    }


    // ============================================================
    // CREAR SERVICIO
    // ============================================================

    // Crea un nuevo servicio con estado activo por defecto.
    // Devuelve el ID generado o false si falló.
    public function create(
        array $data
    ): int|false {

        $stmt =
            $this->conn->prepare("
                INSERT INTO services
                (
                    name,
                    description,
                    duration,
                    price,
                    active
                )
                VALUES (?, ?, ?, ?, TRUE)
            ");


        if (!$stmt) {

            error_log(
                "Error al preparar creación de servicio: " .
                    $this->conn->error
            );

            return false;
        }


        $stmt->bind_param(
            'ssid',
            $data['name'],
            $data['description'],
            $data['duration'],
            $data['price']
        );


        if (!$stmt->execute()) {

            error_log(
                "Error al crear servicio: " .
                    $stmt->error
            );

            return false;
        }


        return $this->conn->insert_id;
    }


    // ============================================================
    // ACTUALIZAR SERVICIO
    // ============================================================

    /**
     * Actualiza nombre, descripción, duración y precio base.
     *
     * No modifica el campo "active" (para eso están
     * activate() y deactivate()), ni tampoco los turnos ya
     * creados: appointments.price es una copia independiente
     * del precio, por lo que un cambio acá nunca altera
     * turnos anteriores.
     */
    public function update(
        int $id,
        array $data
    ): bool {

        $stmt =
            $this->conn->prepare("
                UPDATE services
                SET
                    name = ?,
                    description = ?,
                    duration = ?,
                    price = ?
                WHERE id = ?
            ");


        if (!$stmt) {

            error_log(
                "Error al preparar actualización de servicio: " .
                    $this->conn->error
            );

            return false;
        }


        $stmt->bind_param(
            'ssidi',
            $data['name'],
            $data['description'],
            $data['duration'],
            $data['price'],
            $id
        );


        if (!$stmt->execute()) {

            error_log(
                "Error al actualizar servicio: " .
                    $stmt->error
            );

            return false;
        }


        return true;
    }


    // ============================================================
    // ACTIVAR / DESACTIVAR SERVICIO
    // ============================================================

    // Reactiva un servicio dado de baja.
    // Vuelve a aparecer en el selector de nuevos turnos.
    public function activate(
        int $id
    ): bool {

        return $this->setActiveState(
            $id,
            true
        );
    }


    // Desactiva un servicio sin eliminarlo (baja lógica).
    // Deja de aparecer en el selector de nuevos turnos,
    // pero los turnos históricos que lo usan no se ven afectados,
    // ya que la relación se mantiene intacta.
    public function deactivate(
        int $id
    ): bool {

        return $this->setActiveState(
            $id,
            false
        );
    }


    // Cambia el estado activo/inactivo de un servicio.
    // Método interno compartido por activate() y deactivate().
    private function setActiveState(
        int $id,
        bool $active
    ): bool {

        $stmt =
            $this->conn->prepare("
                UPDATE services
                SET active = ?
                WHERE id = ?
            ");


        if (!$stmt) {

            error_log(
                "Error al preparar cambio de estado del servicio: " .
                    $this->conn->error
            );

            return false;
        }


        $activeInt =
            $active ? 1 : 0;


        $stmt->bind_param(
            'ii',
            $activeInt,
            $id
        );


        if (!$stmt->execute()) {

            error_log(
                "Error al cambiar estado del servicio: " .
                    $stmt->error
            );

            return false;
        }


        return true;
    }


    // ============================================================
    // CONTAR TURNOS RELACIONADOS
    // ============================================================

    // Cuenta cuántos turnos utilizan este servicio.
    // Se usa antes de eliminar, para no romper el historial
    // de turnos ya creados.
    public function countRelatedAppointments(
        int $id
    ): int {

        $stmt =
            $this->conn->prepare("
                SELECT COUNT(*) AS total
                FROM appointments
                WHERE service_id = ?
            ");


        if (!$stmt) {

            // Ante la duda, se asume que sí tiene turnos
            // relacionados, para evitar un borrado inseguro.
            return 1;
        }


        $stmt->bind_param(
            'i',
            $id
        );

        $stmt->execute();

        $row =
            $stmt
            ->get_result()
            ->fetch_assoc();


        return (int)($row['total'] ?? 0);
    }


    // ============================================================
    // ELIMINAR SERVICIO
    // ============================================================

    /**
     * Elimina físicamente un servicio.
     *
     * IMPORTANTE: este método NO valida si tiene turnos
     * relacionados; esa comprobación la hace el controlador,
     * llamando antes a countRelatedAppointments().
     * La FK de "appointments" (ON DELETE RESTRICT) actúa como
     * red de seguridad final si igualmente se intentara borrar
     * un servicio con turnos asociados.
     */
    public function delete(
        int $id
    ): bool {

        $stmt =
            $this->conn->prepare("
                DELETE FROM services
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
