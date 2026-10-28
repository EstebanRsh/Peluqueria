<?php

// ============================================================
// TURNOS (API)
// Listado del día, alta, edición, cambio de estado, historial y baja de turnos,
// con sus reglas de negocio.
// ============================================================

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../models/AppointmentModel.php';
require_once __DIR__ . '/../models/UserModel.php';

class AppointmentController extends BaseController
{
    private AppointmentModel $model;

    private const MAX_PRICE = 99999999.99;

    private const MAX_SERVICES = 10;

    private const POST_ACTIONS = ['create', 'update', 'update_status', 'delete'];

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

        if (in_array($action, self::POST_ACTIONS, true)) {
            $this->requirePost();
        }

        switch ($action) {

            case 'list':
                $date = $this->str($_GET['date'] ?? '') ?: date('Y-m-d');

                if (!$this->isValidDate($date)) {
                    $this->error('Formato de fecha inválido. Use AAAA-MM-DD.');
                }

                $this->json($this->model->getByDate(
                    $this->ownerId(),
                    $date,
                    $this->str($_GET['search'] ?? ''),
                    $this->normalizeStatusFilter($this->str($_GET['status'] ?? 'todos'))
                ));
                break;

            case 'day_schedule':
                $date = $this->str($_GET['date'] ?? '');
                $duration = filter_var($_GET['duration'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 1440]]);
                $exclude = filter_var($_GET['exclude'] ?? 0, FILTER_VALIDATE_INT) ?: 0;
                $start = $this->str($_GET['start'] ?? '');
                $end = $this->str($_GET['end'] ?? '');

                if (!$this->isValidDate($date)) {
                    $this->error('Formato de fecha inválido. Use AAAA-MM-DD.');
                }

                if ($duration === false) {
                    $this->error('La duración no es válida.');
                }

                $hours = (new UserModel())->getBusinessHours($this->ownerId());
                $today = date('Y-m-d');
                $schedule = ['state' => 'open', 'ranges' => $hours['ranges'], 'gaps' => [], 'within' => null];

                if ($date < $today) {
                    $this->json(['success' => true, 'data' => ['state' => 'past'] + $schedule]);
                }

                if (!in_array((int)date('N', strtotime($date)), $hours['days'], true)) {
                    $this->json(['success' => true, 'data' => ['state' => 'closed', 'within' => false] + $schedule]);
                }

                $timePattern = '/^([01]\d|2[0-3]):[0-5]\d$/';

                if (preg_match($timePattern, $start) && preg_match($timePattern, $end) && $end > $start) {
                    $schedule['within'] = false;

                    foreach ($hours['ranges'] as $range) {
                        if ($start >= $range['start'] && $end <= $range['end']) {
                            $schedule['within'] = true;
                        }
                    }
                }

                if ($duration > 0) {
                    $from = $date === $today ? (int)ceil(((int)date('G') * 60 + (int)date('i')) / 5) * 5 : 0;
                    $schedule['gaps'] = $this->model->getFreeGaps($this->ownerId(), $date, $duration, $exclude, $hours['ranges'], $from);
                }

                $this->json(['success' => true, 'data' => $schedule]);
                break;

            case 'client_appointments':
                $clientId = $this->validId($_GET['client_id'] ?? 0, 'cliente');
                [$page, $perPage] = $this->pagination();
                $this->json($this->model->getByClient($this->ownerId(), $clientId, $page, $perPage));
                break;

            case 'create':
                $data = $this->buildAppointmentData($this->readInput());
                $error = $this->validateAppointmentData($data);

                if ($error !== true) {
                    $this->error($error);
                }

                $success = $this->model->create($this->ownerId(), $data);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo guardar el turno en la base de datos.'
                ]);
                break;

            case 'update':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'turno');
                $current = $this->model->getById($this->ownerId(), $id);

                if (!$current) {
                    $this->error('El turno no existe.', 404);
                }

                $data = $this->buildAppointmentData($input);
                $error = $this->validateAppointmentData($data, $current);

                if ($error !== true) {
                    $this->error($error);
                }

                try {
                    $success = $this->model->update($this->ownerId(), $id, $data);
                } catch (InvalidArgumentException $e) {
                    $this->error($e->getMessage(), 409);
                }

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo guardar el turno.'
                ]);
                break;

            case 'update_status':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'turno');
                $status = $this->str($input['status'] ?? null);

                $reason = $this->str($input['reason'] ?? null) ?: null;

                if (!in_array($status, AppointmentModel::STATUSES, true)) {
                    $this->error('El estado seleccionado no es válido.');
                }

                if ($reason !== null && mb_strlen($reason) > 255) {
                    $this->error('El motivo no puede superar los 255 caracteres.');
                }

                if (!in_array($status, AppointmentModel::REASON_STATUSES, true)) {
                    $reason = null;
                }

                if (!$this->model->getById($this->ownerId(), $id)) {
                    $this->error('El turno no existe.', 404);
                }

                $success = $this->model->updateStatus($this->ownerId(), $id, $status, $reason);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo actualizar el estado del turno.'
                ]);
                break;

            case 'history':
                $id = $this->validId($_GET['id'] ?? 0, 'turno');
                $this->json($this->model->getHistory($this->ownerId(), $id));
                break;

            case 'delete':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'turno');

                if (!$this->model->getById($this->ownerId(), $id)) {
                    $this->error('El turno no existe.', 404);
                }

                $success = $this->model->delete($this->ownerId(), $id);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo eliminar el turno.'
                ]);
                break;
        }

        $this->error('Acción no válida.', 404);
    }

    // ============================================================
    // FILTRO DE ESTADO (acepta "finalizado" o "Finalizado")
    // ============================================================

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

    private function buildAppointmentData(array $input): array
    {
        $clientId = filter_var($input['client_id'] ?? 0, FILTER_VALIDATE_INT);

        return [
            'client_id'   => ($clientId === false || $clientId <= 0) ? null : $clientId,
            'client_name' => $this->str($input['client_name'] ?? null),
            'service_ids' => $this->serviceIds($input),
            'service_durations' => $this->serviceDurations($input),
            'stylist'     => $this->str($input['stylist'] ?? null),
            'price'       => is_numeric($input['price'] ?? null) ? (float)$input['price'] : -1,
            'notes'       => $this->str($input['notes'] ?? null),
            'date'        => $this->str($input['date'] ?? null),
            'time_start'  => $this->str($input['time_start'] ?? null),
            'time_end'    => $this->str($input['time_end'] ?? null),
            'status'      => $this->str($input['status'] ?? 'Reservado') ?: 'Reservado',
        ];
    }

    private function serviceIds(array $input): array|false
    {
        $raw = $input['service_ids'] ?? (isset($input['service_id']) ? [$input['service_id']] : []);

        if (!is_array($raw)) {
            return false;
        }

        $ids = [];

        foreach ($raw as $value) {
            $id = filter_var($value, FILTER_VALIDATE_INT);

            if ($id === false || $id <= 0 || in_array($id, $ids, true)) {
                return false;
            }

            $ids[] = $id;
        }

        return $ids;
    }

    private function serviceDurations(array $input): array|false
    {
        $raw = $input['service_durations'] ?? [];

        if (!is_array($raw)) {
            return false;
        }

        $durations = [];

        foreach ($raw as $id => $minutes) {
            $minutes = filter_var($minutes, FILTER_VALIDATE_INT);

            if (!is_numeric($id) || $minutes === false || $minutes < 1 || $minutes > 1440) {
                return false;
            }

            $durations[(int)$id] = $minutes;
        }

        return $durations;
    }

    // ============================================================
    // VALIDAR DATOS DEL TURNO
    // ============================================================

    private function validateAppointmentData(array $data, ?array $current = null)
    {
        if ($data['client_id'] === null && $data['client_name'] === '') {
            return 'Debe seleccionar un cliente o ingresar un alias de referencia.';
        }

        if (mb_strlen($data['client_name']) > 255) {
            return 'El nombre del cliente no puede superar los 255 caracteres.';
        }

        if ($data['client_id'] !== null) {
            $client = $this->model->getClientById($this->ownerId(), $data['client_id']);

            $unchangedClient = $current !== null && (int)$current['client_id'] === $data['client_id'];

            if (!$client || (!$client['active'] && !$unchangedClient)) {
                return 'El cliente seleccionado no existe o está inactivo.';
            }
        }

        if ($data['service_ids'] === false) {
            return 'Los servicios seleccionados no son válidos o están repetidos.';
        }

        if ($data['service_ids'] === []) {
            return 'Debe seleccionar al menos un servicio.';
        }

        if (count($data['service_ids']) > self::MAX_SERVICES) {
            return 'Un turno no puede tener más de ' . self::MAX_SERVICES . ' servicios.';
        }

        if ($data['service_durations'] === false) {
            return 'La duración de los servicios debe ser un número entero de minutos (entre 1 y 1440).';
        }

        foreach ($data['service_ids'] as $serviceId) {
            $service = $this->model->getServiceById($this->ownerId(), $serviceId);
            $unchangedService = $current !== null && in_array($serviceId, $current['service_ids'], true);

            if (!$service || (!$service['active'] && !$unchangedService)) {
                return 'Alguno de los servicios seleccionados no existe o está inactivo.';
            }
        }

        if (mb_strlen($data['stylist']) > 100) {
            return 'El nombre del profesional no puede superar los 100 caracteres.';
        }

        if ($data['price'] < 0 || $data['price'] > self::MAX_PRICE) {
            return 'El precio debe estar entre 0 y 99.999.999,99.';
        }

        if (!in_array($data['status'], AppointmentModel::STATUSES, true)) {
            return 'El estado seleccionado no es válido.';
        }

        return $this->validateDateTime($data['date'], $data['time_start'], $data['time_end']);
    }

    // ============================================================
    // VALIDAR FECHA Y HORARIOS
    // ============================================================

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
