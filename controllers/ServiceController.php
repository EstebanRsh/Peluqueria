<?php

require_once __DIR__ . '/../models/ServiceModel.php';

class ServiceController
{
    private ServiceModel $model;

    public function __construct()
    {
        $this->model = new ServiceModel();
    }


    // ============================================================
    // MANEJO DE PETICIONES
    // ============================================================

    public function handleRequest(): void
    {
        ob_start();

        $action =
            $_GET['action'] ?? '';

        if ($action === 'services') {
            $this->json(
                $this->model->getActive()
            );
        }
        // ========================================================
        // LISTAR TODOS LOS SERVICIOS (ACTIVOS E INACTIVOS)
        // ========================================================

        // Se usa en el panel administrativo. Para el selector
        // de nuevos turnos se sigue usando ?action=services
        // (solo activos), que vive en AppointmentController.
        if ($action === 'services_all') {

            $this->json(
                $this->model->getAll()
            );
        }


        // ========================================================
        // OBTENER SERVICIO POR ID
        // ========================================================

        if ($action === 'service_get') {

            $id =
                filter_var(
                    $_GET['id'] ?? 0,
                    FILTER_VALIDATE_INT
                );


            if (
                $id === false ||
                $id <= 0
            ) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'ID de servicio inválido.'
                ], 400);
            }


            $service =
                $this->model->getById(
                    $id
                );


            if (!$service) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'El servicio no existe.'
                ], 404);
            }


            $this->json(
                $service
            );
        }


        // ========================================================
        // CREAR SERVICIO
        // ========================================================

        if (
            $action === 'service_create' &&
            $_SERVER['REQUEST_METHOD'] === 'POST'
        ) {

            $input =
                json_decode(
                    file_get_contents('php://input'),
                    true
                );


            if (!is_array($input)) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'El cuerpo de la solicitud no contiene un JSON válido.'
                ], 400);
            }


            $data =
                $this->buildServiceData(
                    $input
                );


            $validationError =
                $this->validateServiceData(
                    $data
                );


            if (
                $validationError !== true
            ) {

                $this->json([
                    'success' => false,
                    'error' => $validationError
                ], 400);
            }


            $newId =
                $this->model->create(
                    $data
                );


            $this->json([
                'success' => $newId !== false,
                'id' =>
                $newId !== false
                    ? $newId
                    : null,
                'error' =>
                $newId !== false
                    ? null
                    : 'No se pudo crear el servicio en la base de datos.'
            ]);
        }


        // ========================================================
        // ACTUALIZAR SERVICIO
        // ========================================================

        if (
            $action === 'service_update' &&
            $_SERVER['REQUEST_METHOD'] === 'POST'
        ) {

            $input =
                json_decode(
                    file_get_contents('php://input'),
                    true
                );


            if (!is_array($input)) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'El cuerpo de la solicitud no contiene un JSON válido.'
                ], 400);
            }


            $id =
                filter_var(
                    $input['id'] ?? 0,
                    FILTER_VALIDATE_INT
                );


            if (
                $id === false ||
                $id <= 0
            ) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'ID de servicio inválido.'
                ], 400);
            }


            // Comprobar que el servicio exista antes de editar.
            $existing =
                $this->model->getById(
                    $id
                );


            if (!$existing) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'El servicio no existe.'
                ], 404);
            }


            $data =
                $this->buildServiceData(
                    $input
                );


            $validationError =
                $this->validateServiceData(
                    $data
                );


            if (
                $validationError !== true
            ) {

                $this->json([
                    'success' => false,
                    'error' => $validationError
                ], 400);
            }


            // El cambio de precio base NO altera los turnos
            // ya creados: appointments.price es independiente
            // y no se toca desde acá.
            $success =
                $this->model->update(
                    $id,
                    $data
                );


            $this->json([
                'success' => $success,
                'error' =>
                $success
                    ? null
                    : 'No se pudo actualizar el servicio.'
            ]);
        }


        // ========================================================
        // ACTIVAR SERVICIO
        // ========================================================

        if (
            $action === 'service_activate' &&
            $_SERVER['REQUEST_METHOD'] === 'POST'
        ) {

            $this->handleToggleActive(
                true
            );
        }


        // ========================================================
        // DESACTIVAR SERVICIO
        // ========================================================

        if (
            $action === 'service_deactivate' &&
            $_SERVER['REQUEST_METHOD'] === 'POST'
        ) {

            $this->handleToggleActive(
                false
            );
        }


        // ========================================================
        // ELIMINAR SERVICIO
        // ========================================================

        if (
            $action === 'service_delete' &&
            $_SERVER['REQUEST_METHOD'] === 'POST'
        ) {

            $input =
                json_decode(
                    file_get_contents('php://input'),
                    true
                );


            if (!is_array($input)) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'El cuerpo de la solicitud no contiene un JSON válido.'
                ], 400);
            }


            $id =
                filter_var(
                    $input['id'] ?? 0,
                    FILTER_VALIDATE_INT
                );


            if (
                $id === false ||
                $id <= 0
            ) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'ID de servicio inválido.'
                ], 400);
            }


            $existing =
                $this->model->getById(
                    $id
                );


            if (!$existing) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'El servicio no existe.'
                ], 404);
            }


            // --------------------------------------------------------
            // ELIMINACIÓN SEGURA
            // --------------------------------------------------------
            // No se elimina físicamente un servicio que ya tiene
            // turnos asociados, para no romper el historial.
            // En ese caso se sugiere desactivarlo en su lugar.

            $relatedCount =
                $this->model->countRelatedAppointments(
                    $id
                );


            if ($relatedCount > 0) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'Este servicio tiene turnos asociados y no puede eliminarse. ' .
                        'Podés desactivarlo para que deje de estar disponible.'
                ], 409);
            }


            $success =
                $this->model->delete(
                    $id
                );


            $this->json([
                'success' => $success,
                'error' =>
                $success
                    ? null
                    : 'No se pudo eliminar el servicio.'
            ]);
        }


        // ========================================================
        // ACCIÓN NO ENCONTRADA
        // ========================================================

        $this->json([
            'success' => false,
            'error' => 'Acción no válida.'
        ], 404);
    }


    // ============================================================
    // ACTIVAR / DESACTIVAR (LÓGICA COMPARTIDA)
    // ============================================================

    // Procesa la activación o desactivación de un servicio.
    // Compartido por las acciones service_activate y service_deactivate.
    private function handleToggleActive(
        bool $active
    ): void {

        $input =
            json_decode(
                file_get_contents('php://input'),
                true
            );


        if (!is_array($input)) {

            $this->json([
                'success' => false,
                'error' =>
                'El cuerpo de la solicitud no contiene un JSON válido.'
            ], 400);
        }


        $id =
            filter_var(
                $input['id'] ?? 0,
                FILTER_VALIDATE_INT
            );


        if (
            $id === false ||
            $id <= 0
        ) {

            $this->json([
                'success' => false,
                'error' =>
                'ID de servicio inválido.'
            ], 400);
        }


        $existing =
            $this->model->getById(
                $id
            );


        if (!$existing) {

            $this->json([
                'success' => false,
                'error' =>
                'El servicio no existe.'
            ], 404);
        }


        $success =
            $active
            ? $this->model->activate($id)
            : $this->model->deactivate($id);


        $this->json([
            'success' => $success,
            'error' =>
            $success
                ? null
                : 'No se pudo actualizar el estado del servicio.'
        ]);
    }


    // ============================================================
    // CONSTRUIR DATOS DEL SERVICIO
    // ============================================================

    // Normaliza los datos recibidos desde el body JSON,
    // siguiendo el mismo patrón que AppointmentController
    // usa para construir los datos de un turno.
    private function buildServiceData(
        array $input
    ): array {

        return [

            'name' =>
            trim(
                $input['name'] ?? ''
            ),

            'description' =>
            trim(
                $input['description'] ?? ''
            ),

            'duration' =>
            filter_var(
                $input['duration'] ?? 0,
                FILTER_VALIDATE_INT
            ),

            'price' =>
            is_numeric(
                $input['price'] ?? null
            )
                ? (float)$input['price']
                : -1,
        ];
    }


    // ============================================================
    // VALIDAR DATOS DEL SERVICIO
    // ============================================================

    /**
     * Valida nombre, duración y precio de un servicio.
     * Devuelve true si es válido, o un string con el
     * mensaje de error correspondiente.
     */
    private function validateServiceData(
        array $data
    ) {

        // --------------------------------------------------------
        // NOMBRE
        // --------------------------------------------------------

        if ($data['name'] === '') {
            return 'El nombre del servicio es obligatorio.';
        }


        if (
            mb_strlen($data['name']) > 100
        ) {
            return 'El nombre del servicio no puede superar los 100 caracteres.';
        }


        // --------------------------------------------------------
        // DURACIÓN
        // --------------------------------------------------------

        if (
            $data['duration'] === false ||
            $data['duration'] <= 0
        ) {
            return 'La duración debe ser un número entero mayor a cero.';
        }


        // --------------------------------------------------------
        // PRECIO
        // --------------------------------------------------------

        if ($data['price'] < 0) {
            return 'El precio debe ser igual o mayor a cero.';
        }


        return true;
    }


    // ============================================================
    // RESPUESTAS JSON
    // ============================================================

    // Envía una respuesta JSON al frontend.
    // Mismo formato que AppointmentController, para mantener
    // consistencia en toda la API.
    private function json(
        mixed $data,
        int $status = 200
    ): void {

        ob_end_clean();

        http_response_code(
            $status
        );

        header(
            'Content-Type: application/json; charset=utf-8'
        );


        echo json_encode(
            $data,
            JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
        );


        exit;
    }
}
