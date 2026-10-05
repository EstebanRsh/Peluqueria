<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../models/AppointmentModel.php';

class AppointmentController extends BaseController
{
    private AppointmentModel $model;

    // Límite numérico para la columna price DECIMAL(10,2)
    private const MAX_PRICE = 99999999.99;

    // Acciones que requieren estrictamente un método POST
    private const POST_ACTIONS = ['create', 'update_status', 'delete'];

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

        $action = $_GET['action'] ?? '';

        // Valida la restricción de método POST para acciones de escritura
        if (in_array($action, self::POST_ACTIONS, true)) {
            $this->requirePost();
        }

        switch ($action) {

            // Retorna los turnos agendados para un día en particular
            case 'list':
                $date = $this->str($_GET['date'] ?? '') ?: date('Y-m-d');

                if (!$this->isValidDate($date)) {
                    $this->error('Formato de fecha inválido. Use AAAA-MM-DD.');
                }

                $this->json($this->model->getByDate(
                    $date,
                    $this->str($_GET['search'] ?? ''),
                    $this->normalizeStatusFilter($this->str($_GET['status'] ?? 'todos'))
                ));
                break;

            // Agendar un nuevo turno
            case 'create':
                $data = $this->buildAppointmentData($this->readInput());
                $error = $this->validateAppointmentData($data);

                if ($error !== true) {
                    $this->error($error);
                }

                $success = $this->model->create($data);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo guardar el turno en la base de datos.'
                ]);
                break;

            // Cambiar de estado un turno existente (ej. de Reservado a En atención)
            case 'update_status':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'turno');
                $status = $this->str($input['status'] ?? null);

                if (!in_array($status, AppointmentModel::STATUSES, true)) {
                    $this->error('El estado seleccionado no es válido.');
                }

                if (!$this->model->getById($id)) {
                    $this->error('El turno no existe.', 404);
                }

                $success = $this->model->updateStatus($id, $status);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo actualizar el estado del turno.'
                ]);
                break;

            // Obtener el historial de cambios de estado del turno
            case 'history':
                $id = $this->validId($_GET['id'] ?? 0, 'turno');
                $this->json($this->model->getHistory($id));
                break;

            // Eliminar un turno de la agenda
            case 'delete':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'turno');

                if (!$this->model->getById($id)) {
                    $this->error('El turno no existe.', 404);
                }

                $success = $this->model->delete($id);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo eliminar el turno.'
                ]);
                break;
        }

        $this->error('Acción no válida.', 404);
    }

    // ============================================================
    // FILTRO DE ESTADO (acepta "en-atencion" o "En atención")
    // ============================================================

    // Transforma slugs de URL al texto plano exacto que utiliza la BD
    private function normalizeStatusFilter(string $status): string
    {
        if ($status === '' || $status === 'todos') {
            return 'todos';
        }

        if (isset(AppointmentModel::STATUS_SLUGS[$status])) {
            return AppointmentModel::STATUS_SLUGS[$status];
        }

        if (in_array($status, AppointmentModel::STATUSES, true)) {
            return $status;
        }

        $this->error('El filtro de estado no es válido.');
        return 'todos';
    }

    // ============================================================
    // CONSTRUIR DATOS DEL TURNO
    // ============================================================

    // Normaliza y formatea los parámetros recibidos en el payload JSON
    private function buildAppointmentData(array $input): array
    {
        $clientId = filter_var($input['client_id'] ?? 0, FILTER_VALIDATE_INT);

        return [
            'client_id'   => ($clientId === false || $clientId <= 0) ? null : $clientId,
            'client_name' => $this->str($input['client_name'] ?? null),
            'service_id'  => filter_var($input['service_id'] ?? 0, FILTER_VALIDATE_INT),
            'stylist'     => $this->str($input['stylist'] ?? null),
            'price'       => is_numeric($input['price'] ?? null) ? (float)$input['price'] : -1,
            'notes'       => $this->str($input['notes'] ?? null),
            'date'        => $this->str($input['date'] ?? null),
            'time_start'  => $this->str($input['time_start'] ?? null),
            'time_end'    => $this->str($input['time_end'] ?? null),
            'status'      => $this->str($input['status'] ?? 'Reservado') ?: 'Reservado',
        ];
    }

    // ============================================================
    // VALIDAR DATOS DEL TURNO
    // ============================================================

    // Revisa todas las reglas de negocio para guardar o editar un turno
    private function validateAppointmentData(array $data)
    {
        // Validar que exista al menos cliente registrado o nombre ocasional
        if ($data['client_id'] === null && $data['client_name'] === '') {
            return 'Debe seleccionar un cliente o ingresar un alias de referencia.';
        }

        if (mb_strlen($data['client_name']) > 255) {
            return 'El nombre del cliente no puede superar los 255 caracteres.';
        }

        if ($data['client_id'] !== null) {
            $client = $this->model->getClientById($data['client_id']);

            if (!$client || !$client['active']) {
                return 'El cliente seleccionado no existe o está inactivo.';
            }
        }

        // Validar servicio existente y activo
        if ($data['service_id'] === false || $data['service_id'] <= 0) {
            return 'Debe seleccionar un servicio válido.';
        }

        $service = $this->model->getServiceById($data['service_id']);

        if (!$service || !$service['active']) {
            return 'El servicio seleccionado no existe o está inactivo.';
        }

        // Validar estilista
        if (mb_strlen($data['stylist']) > 100) {
            return 'El nombre del profesional no puede superar los 100 caracteres.';
        }

        // Validar precio
        if ($data['price'] < 0 || $data['price'] > self::MAX_PRICE) {
            return 'El precio debe estar entre 0 y 99.999.999,99.';
        }

        // Validar estado
        if (!in_array($data['status'], AppointmentModel::STATUSES, true)) {
            return 'El estado seleccionado no es válido.';
        }

        // Validar fecha y rango horario
        return $this->validateDateTime($data['date'], $data['time_start'], $data['time_end']);
    }

    // ============================================================
    // VALIDAR FECHA Y HORARIOS
    // ============================================================

    // Verifica formatos de fecha, horas válidas y coherencia cronológica (time_start < time_end)
    private function validateDateTime(string $date, string $timeStart, string $timeEnd)
    {
        if ($date === '') {
            return 'La fecha es obligatoria.';
        }

        if (!$this->isValidDate($date)) {
            return 'Formato de fecha inválido. Use AAAA-MM-DD.';
        }

        if ($timeStart === '') {
            return 'La hora de inicio es obligatoria.';
        }

        if ($timeEnd === '') {
            return 'La hora de fin es obligatoria.';
        }

        $startSeconds = $this->parseTime($timeStart);

        if ($startSeconds === false) {
            return 'Hora de inicio inválida. Use HH:MM o HH:MM:SS.';
        }

        $endSeconds = $this->parseTime($timeEnd);

        if ($endSeconds === false) {
            return 'Hora de fin inválida. Use HH:MM o HH:MM:SS.';
        }

        if ($startSeconds >= $endSeconds) {
            return 'La hora de inicio debe ser anterior a la hora de fin.';
        }

        return true;
    }

    private function isValidDate(string $date): bool
    {
        $d = DateTime::createFromFormat('Y-m-d', $date);

        return $d && $d->format('Y-m-d') === $date;
    }

    // Convierte HH:MM o HH:MM:SS a segundos. Retorna false si el formato o los rangos son inválidos.
    private function parseTime(string $time): int|false
    {
        if (!preg_match('/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/', $time, $m)) {
            return false;
        }

        $h = (int)$m[1];
        $min = (int)$m[2];
        $s = isset($m[3]) ? (int)$m[3] : 0;

        if ($h > 23 || $min > 59 || $s > 59) {
            return false;
        }

        return $h * 3600 + $min * 60 + $s;
    }
}
