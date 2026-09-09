<?php

require_once __DIR__ . '/../models/AppointmentModel.php';

class AppointmentController
{
    private AppointmentModel $model;

    public function __construct()
    {
        $this->model = new AppointmentModel();
    }


    // ============================================================
    // MANEJO DE PETICIONES
    // ============================================================

    public function handleRequest(): void
    {
        ob_start();

        $action =
            $_GET['action'] ?? '';

        // ========================================================
        // LISTADO DE TURNOS
        // ========================================================

        if ($action === 'list') {

            $date =
                $_GET['date'] ??
                date('Y-m-d');

            $search =
                trim(
                    $_GET['search'] ?? ''
                );

            $status =
                trim(
                    $_GET['status'] ?? 'todos'
                );


            $this->json(
                $this->model->getByDate(
                    $date,
                    $search,
                    $status
                )
            );
        }


        // ========================================================
        // CREAR TURNO
        // ========================================================

        if (
            $action === 'create' &&
            $_SERVER['REQUEST_METHOD'] === 'POST'
        ) {

            // ----------------------------------------------------
            // LEER JSON
            // ----------------------------------------------------

            $rawInput =
                file_get_contents(
                    'php://input'
                );


            $input =
                json_decode(
                    $rawInput,
                    true
                );


            if (!is_array($input)) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'El cuerpo de la solicitud no contiene un JSON válido.'
                ], 400);
            }


            // ----------------------------------------------------
            // CONSTRUIR DATOS DEL TURNO
            // ----------------------------------------------------

            $clientId =
                filter_var(
                    $input['client_id'] ?? 0,
                    FILTER_VALIDATE_INT
                );

            $data = [

                'client_id' => ($clientId === false || $clientId <= 0)
                    ? null
                    : $clientId,

                'client_name' =>
                trim(
                    $input['client_name'] ?? ''
                ),

                'phone' =>
                trim(
                    $input['phone'] ?? ''
                ),

                'service_id' =>
                filter_var(
                    $input['service_id'] ?? 0,
                    FILTER_VALIDATE_INT
                ),

                'stylist' =>
                trim(
                    $input['stylist'] ?? ''
                ),

                'price' =>
                is_numeric(
                    $input['price'] ?? null
                )
                    ? (float)$input['price']
                    : -1,

                'notes' =>
                trim(
                    $input['notes'] ?? ''
                ),

                'date' =>
                trim(
                    $input['date'] ?? ''
                ),

                'time_start' =>
                trim(
                    $input['time_start'] ?? ''
                ),

                'time_end' =>
                trim(
                    $input['time_end'] ?? ''
                ),

                'status' =>
                trim(
                    $input['status'] ??
                        'Reservado'
                ),
            ];


            // ----------------------------------------------------
            // VALIDAR CLIENTE
            // ----------------------------------------------------

            if (
                $data['client_id'] === null &&
                $data['client_name'] === ''
            ) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'Debe seleccionar un cliente o ingresar un alias de referencia.'
                ], 400);
            }

            if (
                $data['client_id'] !== null
            ) {
                $client =
                    $this->model->getClientById(
                        $data['client_id']
                    );

                if (
                    !$client ||
                    !$client['active']
                ) {
                    $this->json([
                        'success' => false,
                        'error' =>
                        'El cliente seleccionado no existe o está inactivo.'
                    ], 400);
                }
            }


            // ----------------------------------------------------
            // VALIDAR SERVICIO
            // ----------------------------------------------------

            if (
                $data['service_id'] === false ||
                $data['service_id'] <= 0
            ) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'Debe seleccionar un servicio válido.'
                ], 400);
            }


            // Comprobar que el servicio existe y está activo.
            $service =
                $this->model->getServiceById(
                    $data['service_id']
                );


            if (
                !$service ||
                !$service['active']
            ) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'El servicio seleccionado no existe o está inactivo.'
                ], 400);
            }


            // ----------------------------------------------------
            // VALIDAR PRECIO
            // ----------------------------------------------------

            if ($data['price'] < 0) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'El precio debe ser igual o mayor a cero.'
                ], 400);
            }


            // ----------------------------------------------------
            // VALIDAR ESTADO
            // ----------------------------------------------------

            $validStatuses = [
                'Reservado',
                'En sala de espera',
                'En atención',
                'Finalizado',
                'Cancelado',
                'Ausente',
            ];


            if (
                !in_array(
                    $data['status'],
                    $validStatuses,
                    true
                )
            ) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'El estado seleccionado no es válido.'
                ], 400);
            }


            // ----------------------------------------------------
            // VALIDAR FECHA Y HORARIOS
            // ----------------------------------------------------

            $validationError =
                $this->validateAppointmentDateTime(
                    $data['date'],
                    $data['time_start'],
                    $data['time_end']
                );


            if (
                $validationError !== true
            ) {

                $this->json([
                    'success' => false,
                    'error' => $validationError
                ], 400);
            }


            // ----------------------------------------------------
            // CREAR TURNO
            // ----------------------------------------------------

            $success =
                $this->model->create(
                    $data
                );


            $this->json([
                'success' => $success,
                'error' =>
                $success
                    ? null
                    : 'No se pudo guardar el turno en la base de datos.'
            ]);
        }


        // ========================================================
        // ACTUALIZAR ESTADO
        // ========================================================

        if (
            $action === 'update_status' &&
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


            $status =
                trim(
                    $input['status'] ?? ''
                );


            if (
                $id === false ||
                $id <= 0
            ) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'ID de turno inválido.'
                ], 400);
            }


            $validStatuses = [
                'Reservado',
                'En sala de espera',
                'En atención',
                'Finalizado',
                'Cancelado',
                'Ausente',
            ];


            if (
                !in_array(
                    $status,
                    $validStatuses,
                    true
                )
            ) {

                $this->json([
                    'success' => false,
                    'error' =>
                    'El estado seleccionado no es válido.'
                ], 400);
            }


            $this->json([
                'success' =>
                $this->model->updateStatus(
                    $id,
                    $status
                )
            ]);
        }


        // ========================================================
        // HISTORIAL
        // ========================================================

        if ($action === 'history') {

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
                    'ID de turno inválido.'
                ], 400);
            }


            $this->json(
                $this->model->getHistory(
                    $id
                )
            );
        }


        // ========================================================
        // ELIMINAR TURNO
        // ========================================================

        if (
            $action === 'delete' &&
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
                    'ID de turno inválido.'
                ], 400);
            }


            $this->json([
                'success' =>
                $this->model->delete(
                    $id
                )
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
    // RESPUESTAS JSON
    // ============================================================

    // Envía una respuesta JSON al frontend.
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


    // ============================================================
    // VALIDAR FECHA Y HORARIOS
    // ============================================================

    /**
     * Valida fecha, hora de inicio y hora de fin.
     *
     * La duración del servicio NO se valida contra
     * la duración del turno porque la hora de fin
     * puede ser modificada manualmente por la peluquera.
     */
    private function validateAppointmentDateTime(
        string $date,
        string $timeStart,
        string $timeEnd
    ) {

        // --------------------------------------------------------
        // FECHA
        // --------------------------------------------------------

        $date =
            trim($date);


        if ($date === '') {
            return 'La fecha es obligatoria.';
        }


        $d =
            \DateTime::createFromFormat(
                'Y-m-d',
                $date
            );


        if (
            !(
                $d &&
                $d->format('Y-m-d') === $date
            )
        ) {

            return
                'Formato de fecha inválido. Use AAAA-MM-DD.';
        }


        // --------------------------------------------------------
        // HORARIOS
        // --------------------------------------------------------

        $timeStart =
            trim($timeStart);

        $timeEnd =
            trim($timeEnd);


        if ($timeStart === '') {
            return
                'La hora de inicio es obligatoria.';
        }


        if ($timeEnd === '') {
            return
                'La hora de fin es obligatoria.';
        }


        // Convierte HH:MM o HH:MM:SS a segundos.
        $parseTime =
            function (string $time) {

                if (
                    !preg_match(
                        '/^(\d{1,2}):(\d{2})(:(\d{2}))?$/',
                        $time,
                        $matches
                    )
                ) {
                    return false;
                }


                $hours =
                    (int)$matches[1];

                $minutes =
                    (int)$matches[2];

                $seconds =
                    isset($matches[4])
                    ? (int)$matches[4]
                    : 0;


                if (
                    $hours < 0 ||
                    $hours > 23 ||
                    $minutes < 0 ||
                    $minutes > 59 ||
                    $seconds < 0 ||
                    $seconds > 59
                ) {
                    return false;
                }


                return
                    $hours * 3600 +
                    $minutes * 60 +
                    $seconds;
            };


        $startSeconds =
            $parseTime(
                $timeStart
            );


        if (
            $startSeconds === false
        ) {

            return
                'Hora de inicio inválida. Use HH:MM o HH:MM:SS.';
        }


        $endSeconds =
            $parseTime(
                $timeEnd
            );


        if (
            $endSeconds === false
        ) {

            return
                'Hora de fin inválida. Use HH:MM o HH:MM:SS.';
        }


        // La hora de inicio debe ser anterior
        // a la hora de fin.
        if (
            $startSeconds >=
            $endSeconds
        ) {

            return
                'La hora de inicio debe ser anterior a la hora de fin.';
        }


        return true;
    }
}
