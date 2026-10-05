<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../models/ServiceHistoryModel.php';
require_once __DIR__ . '/../models/ClientModel.php';

class ServiceHistoryController extends BaseController
{
    private ServiceHistoryModel $model;
    private ClientModel $clientModel;

    private const MAX_CONSUMPTION_ITEMS = 50;
    private const MAX_QUANTITY = 999999.99;   // Límite de la columna DECIMAL(8,2)
    private const MAX_DETAILS_BYTES = 100000; // Límite de tamaño para el JSON de datos técnicos (~100 KB)

    public function __construct()
    {
        $this->model = new ServiceHistoryModel();
        $this->clientModel = new ClientModel();
    }

    // ============================================================
    // MANEJO DE PETICIONES
    // ============================================================

    public function handleRequest(): void
    {
        ob_start();

        $action = $_GET['action'] ?? '';

        // Guardar ficha técnica de servicio (con o sin turno asociado)
        if ($action === 'service_history_save') {
            $this->requirePost();

            $input = $this->readInput();

            $data = $this->buildData($input);
            $consumptions = $this->buildConsumptions($input['consumptions'] ?? []);

            $error = $this->validate($data, $consumptions);

            if ($error !== true) {
                $this->error($error);
            }

            try {
                $newId = $this->model->save($data, $consumptions);
            } catch (ServiceHistoryException $e) {
                $this->error($e->getMessage(), $e->getCode() ?: 400);
                return;
            }

            $this->json(['success' => true, 'id' => $newId, 'error' => null]);
        }

        // Obtener historial completo de un cliente (para el perfil tipo feed)
        if ($action === 'client_timeline') {
            $clientId = filter_var($_GET['client_id'] ?? null, FILTER_VALIDATE_INT);

            if (!$clientId || $clientId <= 0) {
                $this->error('ID de cliente inválido.', 400);
            }

            $timeline = $this->model->getTimelineByClient($clientId);
            $this->json(['success' => true, 'data' => $timeline]);
        }

        // Obtener detalle completo de una ficha individual (incluyendo consumos)
        if ($action === 'service_history_detail') {
            $historyId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);

            if (!$historyId || $historyId <= 0) {
                $this->error('ID de ficha inválido.', 400);
            }

            $record = $this->model->getById($historyId);

            if (!$record) {
                $this->error('Ficha no encontrada.', 404);
            }

            $record['consumptions'] = $this->model->getConsumptions($historyId);

            $this->json(['success' => true, 'data' => $record]);
        }

        $this->error('Acción no válida.', 404);
    }

    // ============================================================
    // CONSTRUIR DATOS DE LA FICHA
    // ============================================================

    // Mapea y estructura los parámetros técnicos recibidos desde la petición HTTP
    private function buildData(array $input): array
    {
        $clientId = filter_var($input['client_id'] ?? null, FILTER_VALIDATE_INT);
        $hasClientId = $clientId !== false && $clientId > 0;

        $clientName = $this->str($input['client_name'] ?? null);

        $appointmentId = filter_var($input['appointment_id'] ?? null, FILTER_VALIDATE_INT);
        $hasAppointment = $appointmentId !== false && $appointmentId > 0;

        $serviceId = filter_var($input['service_id'] ?? null, FILTER_VALIDATE_INT);
        $hasService = $serviceId !== false && $serviceId > 0;

        $details = is_array($input['details'] ?? null) ? $input['details'] : [];

        return [
            'client_id'      => $hasClientId ? $clientId : null,
            'client_name'    => (!$hasClientId && $clientName !== '') ? $clientName : null,
            'appointment_id' => $hasAppointment ? $appointmentId : null,
            'service_id'     => $hasService ? $serviceId : null,
            'service_name_snapshot' => null,

            'technical_details' => [
                'general'   => is_array($details['general'] ?? null) ? $details['general'] : [],
                'color'     => is_array($details['color'] ?? null) ? $details['color'] : [],
                'treatment' => is_array($details['treatment'] ?? null) ? $details['treatment'] : [],
                'cut'       => is_array($details['cut'] ?? null) ? $details['cut'] : [],
            ],
        ];
    }

    // Normaliza el array de consumos agrupando cantidades por product_id
    private function buildConsumptions(mixed $raw): array|string
    {
        if (!is_array($raw) || $raw === []) {
            return [];
        }

        if (count($raw) > self::MAX_CONSUMPTION_ITEMS) {
            return 'No se pueden registrar más de ' . self::MAX_CONSUMPTION_ITEMS . ' productos por ficha.';
        }

        $result = [];

        foreach ($raw as $item) {
            if (!is_array($item)) {
                return 'Cada consumo debe ser un objeto con product_id y quantity.';
            }

            $productId = filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT);

            if ($productId === false || $productId <= 0) {
                return 'ID de producto inválido en los consumos.';
            }

            $quantity = $item['quantity'] ?? null;

            if (!is_numeric($quantity) || (float)$quantity <= 0) {
                return 'La cantidad usada debe ser un número mayor a cero.';
            }

            $quantity = round((float)$quantity, 2);

            if ($quantity <= 0 || $quantity > self::MAX_QUANTITY) {
                return 'La cantidad usada está fuera del rango permitido.';
            }

            $result[$productId] = round(($result[$productId] ?? 0) + $quantity, 2);

            if ($result[$productId] > self::MAX_QUANTITY) {
                return 'La cantidad total de un producto supera el máximo permitido.';
            }
        }

        return $result;
    }

    // ============================================================
    // VALIDACIÓN DE NEGOCIO
    // ============================================================

    // Modifica $data por referencia para autocompletar contexto desde el turno
    private function validate(array &$data, array|string $consumptions)
    {
        if (is_string($consumptions)) {
            return $consumptions;
        }

        // Validación con turno asociado
        if ($data['appointment_id'] !== null) {
            $appointment = $this->model->getAppointmentContext($data['appointment_id']);

            if (!$appointment) {
                $this->error('El turno indicado no existe.', 404);
            }

            if (in_array($appointment['status'], ['Cancelado', 'Ausente'], true)) {
                $this->error('No se puede registrar una ficha para un turno cancelado o ausente.', 409);
            }

            $hasClient = $appointment['client_id'] !== null;

            $data['client_id'] = $hasClient ? (int)$appointment['client_id'] : null;
            $data['client_name'] = $hasClient ? null : $appointment['client_name'];
            $data['service_id'] = (int)$appointment['service_id'];
            $data['service_name_snapshot'] = $appointment['service_name'];
        } else {
            // Validación para ficha suelta (sin turno)
            if ($data['client_id'] === null && $data['client_name'] === null) {
                return 'Debe seleccionar un cliente registrado o indicar un nombre.';
            }

            if ($data['client_id'] !== null && !$this->clientModel->getById($data['client_id'])) {
                return 'El cliente seleccionado no existe.';
            }

            if ($data['client_name'] !== null && mb_strlen($data['client_name']) > 255) {
                return 'El nombre del cliente no puede superar los 255 caracteres.';
            }

            if ($data['service_id'] !== null) {
                $serviceName = $this->model->getServiceName($data['service_id']);

                if ($serviceName === null) {
                    return 'El servicio seleccionado no existe.';
                }

                $data['service_name_snapshot'] = $serviceName;
            }
        }

        // Verifica que la ficha no esté vacía (debe incluir detalles técnicos o productos consumidos)
        if (!$this->hasMeaningfulData($data['technical_details']) && $consumptions === []) {
            return 'Complete al menos un campo de alguna categoría antes de guardar.';
        }

        $encoded = json_encode($data['technical_details'], JSON_UNESCAPED_UNICODE);

        if ($encoded === false || strlen($encoded) > self::MAX_DETAILS_BYTES) {
            return 'Los datos técnicos de la ficha son demasiado extensos.';
        }

        return true;
    }

    // ============================================================
    // COMPROBAR CONTENIDO EN CATEGORÍAS
    // ============================================================

    // Revisa que al menos un campo dentro del JSON contenga información no vacía
    private function hasMeaningfulData(array $technicalDetails): bool
    {
        foreach ($technicalDetails as $category) {
            foreach ($category as $value) {
                if ($this->hasMeaningfulValue($value)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function hasMeaningfulValue(mixed $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }

        if (!is_array($value)) {
            return true;
        }

        foreach ($value as $nestedValue) {
            if ($this->hasMeaningfulValue($nestedValue)) {
                return true;
            }
        }

        return false;
    }
}
