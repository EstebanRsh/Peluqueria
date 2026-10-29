<?php

// ============================================================
// FICHA TÉCNICA (API)
// Guarda fichas de servicio y devuelve el historial técnico de un cliente.
// ============================================================

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../models/ServiceHistoryModel.php';
require_once __DIR__ . '/../models/ClientModel.php';

class ServiceHistoryController extends BaseController
{
    private ServiceHistoryModel $model;
    private ClientModel $clientModel;

    private const MAX_CONSUMPTION_ITEMS = 50;
    private const MAX_QUANTITY = 999999.99;
    private const MAX_DETAILS_BYTES = 100000;

    private const TIMELINE_CATEGORIES = [
        'general'   => 'General',
        'color'     => 'Color',
        'treatment' => 'Tratamiento',
        'cut'       => 'Corte',
    ];

    private const TIMELINE_FILTERS = [
        'color'       => 'color',
        'tratamiento' => 'treatment',
        'corte'       => 'cut',
    ];

    private const FIELD_LABELS = [
        'general' => [
            'cart_items'       => 'Productos usados',
            'session_notes'    => 'Observaciones',
            'next_visit_notes' => 'Para la próxima visita',
        ],
        'color' => [
            'type'              => 'Tipo de color',
            'ratio'             => 'Proporción',
            'formula'           => 'Fórmula / tono',
            'brand'             => 'Marca / línea',
            'color_grams'       => 'Cantidad de color (g)',
            'oxidant_vol'       => 'Oxidante (vol)',
            'exposure_time_min' => 'Exposición (min)',
            'application'       => 'Aplicación',
            'result'            => 'Resultado / corrección',
        ],
        'treatment' => [
            'type'        => 'Tipo de tratamiento',
            'product'     => 'Producto / línea',
            'quantity_ml' => 'Cantidad aplicada (ml)',
            'iron_temp_c' => 'Temperatura de plancha (°C)',
            'iron_passes' => 'Pasadas por mecha',
            'processes'   => 'Proceso realizado',
            'results'     => 'Resultado',
        ],
        'cut' => [
            'type'      => 'Tipo de corte',
            'length'    => 'Largo / referencia',
            'condition' => 'Condición',
            'tools'     => 'Técnicas / herramientas',
            'finish'    => 'Terminación',
        ],
    ];

    private const UNIT_SHORTS = ['ml' => 'ml', 'g' => 'g', 'unidad' => 'unidad'];

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
                $newId = $this->model->save($this->ownerId(), $data, $consumptions);
            } catch (ServiceHistoryException $e) {
                $this->error($e->getMessage(), $e->getCode() ?: 400);
                return;
            }

            $this->json(['success' => true, 'id' => $newId, 'error' => null]);
        }

        if ($action === 'client_timeline') {
            $clientId = filter_var($_GET['client_id'] ?? null, FILTER_VALIDATE_INT);

            if (!$clientId || $clientId <= 0) {
                $this->error('ID de cliente inválido.', 400);
            }

            [$page, $perPage] = $this->pagination();
            $search = $this->normalizeText(mb_substr($this->str($_GET['q'] ?? ''), 0, 100));
            $category = self::TIMELINE_FILTERS[$_GET['category'] ?? ''] ?? null;

            $records = array_map(
                fn(array $row): array => $this->presentTimelineRecord($row),
                $this->model->getTimelineByClient($this->ownerId(), $clientId),
            );

            $filtered = array_values(array_filter(
                $records,
                fn(array $record): bool =>
                    ($category === null || in_array($category, array_column($record['groups'], 'key'), true))
                    && ($search === '' || str_contains($record['search'], $search)),
            ));

            $this->json([
                'success'       => true,
                'data'          => array_map(
                    fn(array $record): array => array_diff_key($record, ['search' => true]),
                    array_slice($filtered, ($page - 1) * $perPage, $perPage),
                ),
                'total'         => count($filtered),
                'total_records' => count($records),
                'page'          => $page,
                'per_page'      => $perPage,
            ]);
        }

        if ($action === 'service_history_detail') {
            $historyId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);

            if (!$historyId || $historyId <= 0) {
                $this->error('ID de ficha inválido.', 400);
            }

            $record = $this->model->getById($this->ownerId(), $historyId);

            if (!$record) {
                $this->error('Ficha no encontrada.', 404);
            }

            $record['consumptions'] = $this->model->getConsumptions($this->ownerId(), $historyId);

            $this->json(['success' => true, 'data' => $record]);
        }

        if (in_array($action, ['service_history_stock_preview', 'service_history_update', 'service_history_delete'], true)) {
            $this->requirePost();

            $input = $this->readInput();
            $historyId = $this->validId($input['id'] ?? 0, 'ficha');

            if (!$this->model->getById($this->ownerId(), $historyId)) {
                $this->error('La ficha no existe.', 404);
            }

            $consumptions = $action === 'service_history_delete' ? [] : $this->buildConsumptions($input['consumptions'] ?? []);

            if (is_string($consumptions)) {
                $this->error($consumptions);
            }

            $adjustStock = !empty($input['adjust_stock']);

            try {
                if ($action === 'service_history_stock_preview') {
                    $changes = $this->model->stockPreview(
                        $this->ownerId(),
                        $this->model->getConsumptionTotals($this->ownerId(), $historyId),
                        $consumptions,
                    );

                    $this->json(['success' => true, 'data' => $changes]);
                }

                if ($action === 'service_history_update') {
                    $details = $this->buildData($input)['technical_details'];
                    $error = $this->validateDetails($details, $consumptions);

                    if ($error !== true) {
                        $this->error($error);
                    }

                    $this->model->update($this->ownerId(), $historyId, $details, $consumptions, $adjustStock);
                } else {
                    $this->model->delete($this->ownerId(), $historyId, $adjustStock);
                }
            } catch (ServiceHistoryException $e) {
                $this->error($e->getMessage(), $e->getCode() ?: 400);
            }

            $this->json(['success' => true, 'error' => null]);
        }

        $this->error('Acción no válida.', 404);
    }

    // ============================================================
    // CONSTRUIR DATOS DE LA FICHA
    // ============================================================

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

    private function validate(array &$data, array|string $consumptions)
    {
        if (is_string($consumptions)) {
            return $consumptions;
        }

        if ($data['appointment_id'] !== null) {
            $appointment = $this->model->getAppointmentContext($this->ownerId(), $data['appointment_id']);

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
            if ($data['client_id'] === null && $data['client_name'] === null) {
                return 'Debe seleccionar un cliente registrado o indicar un nombre.';
            }

            if ($data['client_id'] !== null && !$this->clientModel->getById($this->ownerId(), $data['client_id'])) {
                return 'El cliente seleccionado no existe.';
            }

            if ($data['client_name'] !== null && mb_strlen($data['client_name']) > 255) {
                return 'El nombre del cliente no puede superar los 255 caracteres.';
            }

            if ($data['service_id'] !== null) {
                $serviceName = $this->model->getServiceName($this->ownerId(), $data['service_id']);

                if ($serviceName === null) {
                    return 'El servicio seleccionado no existe.';
                }

                $data['service_name_snapshot'] = $serviceName;
            }
        }

        return $this->validateDetails($data['technical_details'], $consumptions);
    }

    private function validateDetails(array $details, array $consumptions)
    {
        if (!$this->hasMeaningfulData($details) && $consumptions === []) {
            return 'Complete al menos un campo de alguna categoría antes de guardar.';
        }

        $encoded = json_encode($details, JSON_UNESCAPED_UNICODE);

        if ($encoded === false || strlen($encoded) > self::MAX_DETAILS_BYTES) {
            return 'Los datos técnicos de la ficha son demasiado extensos.';
        }

        return true;
    }

    // ============================================================
    // COMPROBAR CONTENIDO EN CATEGORÍAS
    // ============================================================

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

    // ============================================================
    // HISTORIAL TÉCNICO PARA MOSTRAR
    // ============================================================

    private function presentTimelineRecord(array $row): array
    {
        $service = $row['service_name_snapshot'] ?: 'Ficha técnica';
        $details = is_array($row['technical_details']) ? $row['technical_details'] : [];
        [$date, $time] = array_pad(explode(' ', (string)$row['performed_at']), 2, '');
        $parts = explode('-', $date);
        $dateLabel = count($parts) === 3 ? "{$parts[2]}/{$parts[1]}/{$parts[0]}" : 'Fecha no disponible';

        if ($time !== '') {
            $dateLabel .= ' · ' . substr($time, 0, 5);
        }

        $groups = array_map(
            fn(array $group): array => [
                'key'    => $group['key'],
                'label'  => $group['label'],
                'fields' => array_map(
                    fn(string $field, mixed $value): array => [
                        'label' => $this->fieldLabel($group['key'], $field),
                        'value' => $this->formatTechnicalValue($field, $value),
                    ],
                    array_keys($group['entries']),
                    $group['entries'],
                ),
            ],
            $this->timelineGroups($details, $service),
        );

        $searchParts = [$dateLabel, $service];

        foreach ($groups as $group) {
            $searchParts[] = $group['label'];

            foreach ($group['fields'] as $field) {
                $searchParts[] = $field['label'];
                $searchParts[] = $field['value'];
            }
        }

        return [
            'id'         => (int)$row['id'],
            'date_label' => $dateLabel,
            'service'    => $service,
            'editable'   => array_filter(array_intersect_key($details, self::TIMELINE_CATEGORIES), 'is_array') !== [],
            'groups'     => $groups,
            'search'     => $this->normalizeText(implode(' ', $searchParts)),
        ];
    }

    private function timelineGroups(array $details, string $service): array
    {
        $groups = [];
        $hasCategories = false;

        foreach (self::TIMELINE_CATEGORIES as $key => $label) {
            if (!isset($details[$key]) || !is_array($details[$key])) {
                continue;
            }

            $hasCategories = true;
            $entries = $this->technicalEntries($details[$key]);

            if ($entries) {
                $groups[] = ['key' => $key, 'label' => $label, 'entries' => $entries];
            }
        }

        if ($hasCategories) {
            $others = $this->technicalEntries(array_diff_key($details, self::TIMELINE_CATEGORIES));

            if ($others) {
                $groups[] = ['key' => 'general', 'label' => 'Otros datos', 'entries' => $others];
            }

            return $groups;
        }

        $entries = $this->technicalEntries($details);

        if (!$entries) {
            return [];
        }

        $searchable = $this->normalizeText($service . ' ' . implode(' ', array_keys($entries)));
        $category = 'general';

        if (preg_match('/\b(corte|tijera|maquina|capas|bob|pixie)\b/', $searchable)) {
            $category = 'cut';
        } elseif (preg_match('/\b(color|tinte|oxidante|decoloracion|matizador|formula|tono)\b/', $searchable)) {
            $category = 'color';
        } elseif (preg_match('/\b(tratamiento|alisado|hidratacion|reconstruccion)\b/', $searchable)) {
            $category = 'treatment';
        }

        return [['key' => $category, 'label' => self::TIMELINE_CATEGORIES[$category], 'entries' => $entries]];
    }

    private function technicalEntries(array $values): array
    {
        return array_filter($values, fn(mixed $value): bool => $value !== null && $value !== '' && $value !== []);
    }

    private function fieldLabel(string $groupKey, string|int $field): string
    {
        $text = str_replace('_', ' ', (string)$field);

        return self::FIELD_LABELS[$groupKey][$field] ?? mb_strtoupper(mb_substr($text, 0, 1)) . mb_substr($text, 1);
    }

    private function formatTechnicalValue(string|int $field, mixed $value): string
    {
        if ($field === 'cart_items' && is_array($value)) {
            return implode(', ', array_map(function (mixed $item): string {
                $item = is_array($item) ? $item : [];
                $name = ($item['name'] ?? '') ?: 'Producto ' . ($item['product_id'] ?? '');
                $unit = isset($item['unit']) && $item['unit'] !== '' ? ' ' . (self::UNIT_SHORTS[$item['unit']] ?? $item['unit']) : '';

                return $name . ' × ' . ($item['quantity'] ?? '') . $unit;
            }, $value));
        }

        if (is_array($value) && array_is_list($value)) {
            return implode(', ', array_map(fn(mixed $item): string => $this->formatTechnicalValue('', $item), $value));
        }

        if (is_array($value)) {
            return implode(', ', array_map(
                fn(string|int $key, mixed $child): string => str_replace('_', ' ', (string)$key) . ': ' . $this->formatTechnicalValue($key, $child),
                array_keys($value),
                $value,
            ));
        }

        if (is_bool($value)) {
            return $value ? 'Sí' : 'No';
        }

        return (string)$value;
    }

    private function normalizeText(string $text): string
    {
        return strtr(mb_strtolower($text, 'UTF-8'), ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']);
    }
}
