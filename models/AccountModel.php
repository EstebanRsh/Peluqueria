<?php

// ============================================================
// CUENTA
// Descarga, importación y eliminación de todos los datos de una cuenta.
// ============================================================

require_once __DIR__ . '/../config/database.php';

class AccountModel
{
    public const DELETE_CONFIRMATION = 'ELIMINAR MI CUENTA';

    private const OWNED_TABLES = [
        'clients',
        'services',
        'products',
        'appointments',
        'appointment_services',
        'appointment_history',
        'service_history',
        'service_consumptions',
    ];

    private const SECTION_NAMES = [
        'services'             => 'Servicios',
        'clients'              => 'Clientes',
        'products'             => 'Productos',
        'appointments'         => 'Turnos',
        'appointment_services' => 'Servicios de los turnos',
        'appointment_history'  => 'Historial de estados',
        'service_history'      => 'Fichas',
        'service_consumptions' => 'Consumos',
    ];

    private const EXPORT_FORMAT = 'hairapp';
    private const EXPORT_VERSION = 1;
    private const MAX_RECORDS = 20000;
    private const MAX_TEXT_BYTES = 65535;
    private const MAX_DETAILS_BYTES = 100000;
    private const MAX_PRICE = 99999999.99;
    private const MAX_COST = 999999.9999;
    private const MAX_QUANTITY = 999999.99;
    private const MAX_COST_SNAPSHOT = 99999999.9999;
    private const MAX_DURATION = 1440;
    private const STATUSES = ['Reservado', 'Finalizado', 'Cancelado', 'Ausente'];
    private const UNITS = ['ml', 'g', 'unidad'];

    private mysqli $conn;

    private string $section = '';
    private int $position = 0;

    public function __construct()
    {
        $this->conn = getConnection();
    }

    // ============================================================
    // DESCARGA
    // ============================================================

    public function export(int $ownerId): array
    {
        $stmt = $this->conn->prepare("
            SELECT username, email, role, created_at, terms_accepted_at
            FROM users
            WHERE id = ?
        ");

        $stmt->bind_param('i', $ownerId);
        $stmt->execute();

        $data = [
            'format'  => self::EXPORT_FORMAT,
            'version' => self::EXPORT_VERSION,
            'account' => $stmt->get_result()->fetch_assoc(),
        ];

        foreach (self::OWNED_TABLES as $table) {
            $stmt = $this->conn->prepare("SELECT * FROM {$table} WHERE owner_id = ? ORDER BY id");
            $stmt->bind_param('i', $ownerId);
            $stmt->execute();

            $data[$table] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        }

        foreach ($data['service_history'] as &$record) {
            $record['technical_details'] = json_decode((string)$record['technical_details'], true);
        }
        unset($record);

        return $data;
    }

    // ============================================================
    // ELIMINACIÓN
    // ============================================================

    public function deleteOwner(int $ownerId): void
    {
        $this->conn->begin_transaction();

        try {
            foreach (['service_consumptions', 'service_history', 'appointment_history', 'appointment_services', 'appointments', 'clients', 'products', 'services'] as $table) {
                $stmt = $this->conn->prepare("DELETE FROM {$table} WHERE owner_id = ?");
                $stmt->bind_param('i', $ownerId);
                $stmt->execute();
            }

            $stmt = $this->conn->prepare("DELETE FROM users WHERE id = ?");
            $stmt->bind_param('i', $ownerId);
            $stmt->execute();

            $this->conn->commit();
        } catch (Throwable $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    // ============================================================
    // IMPORTACIÓN
    // ============================================================

    public function isEmpty(int $ownerId): bool
    {
        foreach (self::OWNED_TABLES as $table) {
            $stmt = $this->conn->prepare("SELECT 1 FROM {$table} WHERE owner_id = ? LIMIT 1");
            $stmt->bind_param('i', $ownerId);
            $stmt->execute();

            if ($stmt->get_result()->num_rows > 0) {
                return false;
            }
        }

        return true;
    }

    public function import(int $ownerId, array $data): array
    {
        if (($data['format'] ?? self::EXPORT_FORMAT) !== self::EXPORT_FORMAT || ($data['version'] ?? self::EXPORT_VERSION) !== self::EXPORT_VERSION) {
            throw new InvalidArgumentException('El archivo no es una copia válida de HairApp.');
        }

        $services = $this->validateServices($this->table($data, 'services'));
        $clients = $this->validateClients($this->table($data, 'clients'));
        $products = $this->validateProducts($this->table($data, 'products'));
        $appointments = $this->validateAppointments($this->table($data, 'appointments'), $services, $clients);
        $appointmentServices = $this->validateAppointmentServices($data, $appointments, $services);
        $history = $this->validateAppointmentHistory($this->table($data, 'appointment_history'), $appointments);
        $records = $this->validateServiceHistory($this->table($data, 'service_history'), $clients, $appointments, $services);
        $consumptions = $this->validateConsumptions($this->table($data, 'service_consumptions'), $records, $products);

        $this->conn->begin_transaction();

        try {
            $serviceIds = $this->insertServices($ownerId, $services);
            $clientIds = $this->insertClients($ownerId, $clients);
            $productIds = $this->insertProducts($ownerId, $products);
            $appointmentIds = $this->insertAppointments($ownerId, $appointments, $serviceIds, $clientIds);
            $this->insertAppointmentServices($ownerId, $appointmentServices, $appointmentIds, $serviceIds);
            $this->insertAppointmentHistory($ownerId, $history, $appointmentIds);
            $recordIds = $this->insertServiceHistory($ownerId, $records, $clientIds, $appointmentIds, $serviceIds);
            $this->insertConsumptions($ownerId, $consumptions, $recordIds, $productIds);

            $this->conn->commit();
        } catch (Throwable $e) {
            $this->conn->rollback();
            throw $e;
        }

        return [
            'clients'         => count($clients),
            'services'        => count($services),
            'products'        => count($products),
            'appointments'    => count($appointments),
            'service_history' => count($records),
        ];
    }

    // ------------------------------------------------------------
    // Validación por tabla (devuelve filas normalizadas indexadas por el id del archivo)
    // ------------------------------------------------------------

    private function validateServices(array $rows): array
    {
        $result = [];

        foreach ($rows as $i => $row) {
            $id = $this->recordId($row, $i, $result);

            $result[$id] = [
                'name'        => $this->text($row, 'name', 'el nombre', 100, true),
                'description' => $this->longText($row, 'description', 'la descripción'),
                'duration'    => $this->integer($row, 'duration', 'la duración', 1, self::MAX_DURATION),
                'price'       => $this->decimal($row, 'price', 'el precio', 0, self::MAX_PRICE),
                'active'      => $this->boolean($row, 'active'),
                'created_at'  => $this->dateTime($row, 'created_at', 'la fecha de alta', false),
            ];
        }

        return $result;
    }

    private function validateClients(array $rows): array
    {
        $result = [];
        $codes = [];

        foreach ($rows as $i => $row) {
            $id = $this->recordId($row, $i, $result);
            $code = $this->text($row, 'internal_code', 'el código interno', 40, false);

            if ($code !== null) {
                if (isset($codes[$code])) {
                    $this->fail('el código interno está repetido.');
                }

                $codes[$code] = true;
            }

            $result[$id] = [
                'internal_code'     => $code,
                'alias'             => $this->text($row, 'alias', 'el alias', 100, true),
                'natural_base_tone' => $this->text($row, 'natural_base_tone', 'el tono natural', 30, false),
                'hair_type'         => $this->text($row, 'hair_type', 'el tipo de cabello', 100, false),
                'notes'             => $this->longText($row, 'notes', 'las notas'),
                'active'            => $this->boolean($row, 'active'),
                'created_at'        => $this->dateTime($row, 'created_at', 'la fecha de alta', false),
            ];
        }

        return $result;
    }

    private function validateProducts(array $rows): array
    {
        $result = [];

        foreach ($rows as $i => $row) {
            $id = $this->recordId($row, $i, $result);
            $unit = $row['measurement_unit'] ?? null;

            if (!in_array($unit, self::UNITS, true)) {
                $this->fail('la unidad de medida no es válida.');
            }

            $result[$id] = [
                'name'             => $this->text($row, 'name', 'el nombre', 150, true),
                'brand'            => $this->text($row, 'brand', 'la marca', 100, false),
                'measurement_unit' => $unit,
                'stock'            => $this->decimal($row, 'stock', 'el stock', 0, self::MAX_PRICE),
                'unit_cost'        => $this->decimal($row, 'unit_cost', 'el costo', 0, self::MAX_COST),
                'active'           => $this->boolean($row, 'active'),
                'created_at'       => $this->dateTime($row, 'created_at', 'la fecha de alta', false),
            ];
        }

        return $result;
    }

    private function validateAppointments(array $rows, array $services, array $clients): array
    {
        $result = [];

        foreach ($rows as $i => $row) {
            $id = $this->recordId($row, $i, $result);
            $status = $row['status'] ?? null;

            if (!in_array($status, self::STATUSES, true)) {
                $this->fail('el estado no es válido.');
            }

            $start = $this->time($row, 'time_start', 'la hora de inicio');
            $end = $this->time($row, 'time_end', 'la hora de fin');

            if ($end <= $start) {
                $this->fail('la hora de fin tiene que ser posterior a la de inicio.');
            }

            $result[$id] = [
                'client_id'   => $this->reference($row, 'client_id', 'el cliente', $clients, false),
                'client_name' => $this->text($row, 'client_name', 'el nombre del cliente', 255, false),
                'service_id'  => $this->reference($row, 'service_id', 'el servicio', $services, true),
                'stylist'     => $this->text($row, 'stylist', 'el profesional', 100, false),
                'price'       => $this->decimal($row, 'price', 'el precio', 0, self::MAX_PRICE),
                'notes'       => $this->longText($row, 'notes', 'las notas'),
                'status'      => $status,
                'date'        => $this->date($row, 'date', 'la fecha'),
                'time_start'  => $start,
                'time_end'    => $end,
                'created_at'  => $this->dateTime($row, 'created_at', 'la fecha de alta', false),
            ];
        }

        return $result;
    }

    private function validateAppointmentServices(array $data, array $appointments, array $services): array
    {
        $result = [];
        $used = [];

        if (array_key_exists('appointment_services', $data)) {
            foreach ($this->table($data, 'appointment_services') as $i => $row) {
                $this->recordId($row, $i, $result);

                $appointmentId = $this->reference($row, 'appointment_id', 'el turno', $appointments, true);
                $serviceId = $this->reference($row, 'service_id', 'el servicio', $services, true);

                if (isset($used[$appointmentId][$serviceId])) {
                    $this->fail('el servicio está repetido en el turno.');
                }

                $used[$appointmentId][$serviceId] = true;

                $result[] = [
                    'appointment_id' => $appointmentId,
                    'service_id'     => $serviceId,
                    'position'       => $this->integer($row, 'position', 'la posición', 1, 255),
                    'price'          => $this->decimal($row, 'price', 'el precio', 0, self::MAX_PRICE),
                    'duration'       => $this->integer($row, 'duration', 'la duración', 1, self::MAX_DURATION),
                ];
            }
        }

        foreach ($appointments as $appointmentId => $appointment) {
            if (!empty($used[$appointmentId])) {
                continue;
            }

            $result[] = [
                'appointment_id' => $appointmentId,
                'service_id'     => $appointment['service_id'],
                'position'       => 1,
                'price'          => $appointment['price'],
                'duration'       => $services[$appointment['service_id']]['duration'],
            ];
        }

        return $result;
    }

    private function validateAppointmentHistory(array $rows, array $appointments): array
    {
        $result = [];

        foreach ($rows as $i => $row) {
            $id = $this->recordId($row, $i, $result);

            $result[$id] = [
                'appointment_id' => $this->reference($row, 'appointment_id', 'el turno', $appointments, true),
                'status_from'    => $this->text($row, 'status_from', 'el estado anterior', 50, false),
                'status_to'      => $this->text($row, 'status_to', 'el estado nuevo', 50, true),
                'changed_at'     => $this->dateTime($row, 'changed_at', 'la fecha del cambio', false),
            ];
        }

        return $result;
    }

    private function validateServiceHistory(array $rows, array $clients, array $appointments, array $services): array
    {
        $result = [];
        $usedAppointments = [];

        foreach ($rows as $i => $row) {
            $id = $this->recordId($row, $i, $result);
            $appointmentId = $this->reference($row, 'appointment_id', 'el turno', $appointments, false);

            if ($appointmentId !== null) {
                if (isset($usedAppointments[$appointmentId])) {
                    $this->fail('el turno ya tiene otra ficha.');
                }

                $usedAppointments[$appointmentId] = true;
            }

            $details = $row['technical_details'] ?? null;

            if ($details !== null && !is_array($details)) {
                $this->fail('el detalle técnico no es válido.');
            }

            $encoded = $details === null ? null : json_encode($details, JSON_UNESCAPED_UNICODE);

            if ($encoded === false || ($encoded !== null && strlen($encoded) > self::MAX_DETAILS_BYTES)) {
                $this->fail('el detalle técnico es demasiado largo.');
            }

            $result[$id] = [
                'client_id'             => $this->reference($row, 'client_id', 'el cliente', $clients, false),
                'client_name'           => $this->text($row, 'client_name', 'el nombre del cliente', 255, false),
                'appointment_id'        => $appointmentId,
                'service_id'            => $this->reference($row, 'service_id', 'el servicio', $services, false),
                'service_name_snapshot' => $this->text($row, 'service_name_snapshot', 'el nombre del servicio', 100, false),
                'performed_at'          => $this->dateTime($row, 'performed_at', 'la fecha de la atención', true),
                'technical_details'     => $encoded,
                'created_at'            => $this->dateTime($row, 'created_at', 'la fecha de alta', false),
            ];
        }

        return $result;
    }

    private function validateConsumptions(array $rows, array $records, array $products): array
    {
        $result = [];

        foreach ($rows as $i => $row) {
            $id = $this->recordId($row, $i, $result);
            $quantity = $this->decimal($row, 'quantity_used', 'la cantidad', 0, self::MAX_QUANTITY);

            if ((float)$quantity <= 0) {
                $this->fail('la cantidad tiene que ser mayor a 0.');
            }

            $result[$id] = [
                'service_history_id' => $this->reference($row, 'service_history_id', 'la ficha', $records, true),
                'product_id'         => $this->reference($row, 'product_id', 'el producto', $products, true),
                'quantity_used'      => $quantity,
                'cost_snapshot'      => $this->decimal($row, 'cost_snapshot', 'el costo', 0, self::MAX_COST_SNAPSHOT),
                'created_at'         => $this->dateTime($row, 'created_at', 'la fecha de alta', false),
            ];
        }

        return $result;
    }

    // ------------------------------------------------------------
    // Carga (devuelve el mapa id del archivo => id nuevo)
    // ------------------------------------------------------------

    private function insertServices(int $ownerId, array $rows): array
    {
        $stmt = $this->conn->prepare("
            INSERT INTO services (owner_id, name, description, duration, price, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))
        ");
        $ids = [];

        foreach ($rows as $oldId => $r) {
            $stmt->bind_param('ississs', $ownerId, $r['name'], $r['description'], $r['duration'], $r['price'], $r['active'], $r['created_at']);
            $stmt->execute();
            $ids[$oldId] = $this->conn->insert_id;
        }

        return $ids;
    }

    private function insertClients(int $ownerId, array $rows): array
    {
        $stmt = $this->conn->prepare("
            INSERT INTO clients (owner_id, internal_code, alias, natural_base_tone, hair_type, notes, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))
        ");
        $ids = [];

        foreach ($rows as $oldId => $r) {
            $stmt->bind_param('isssssis', $ownerId, $r['internal_code'], $r['alias'], $r['natural_base_tone'], $r['hair_type'], $r['notes'], $r['active'], $r['created_at']);
            $stmt->execute();
            $ids[$oldId] = $this->conn->insert_id;
        }

        return $ids;
    }

    private function insertProducts(int $ownerId, array $rows): array
    {
        $stmt = $this->conn->prepare("
            INSERT INTO products (owner_id, name, brand, measurement_unit, stock, unit_cost, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))
        ");
        $ids = [];

        foreach ($rows as $oldId => $r) {
            $stmt->bind_param('isssssis', $ownerId, $r['name'], $r['brand'], $r['measurement_unit'], $r['stock'], $r['unit_cost'], $r['active'], $r['created_at']);
            $stmt->execute();
            $ids[$oldId] = $this->conn->insert_id;
        }

        return $ids;
    }

    private function insertAppointments(int $ownerId, array $rows, array $serviceIds, array $clientIds): array
    {
        $stmt = $this->conn->prepare("
            INSERT INTO appointments (owner_id, client_id, client_name, service_id, stylist, price, notes, status, date, time_start, time_end, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))
        ");
        $ids = [];

        foreach ($rows as $oldId => $r) {
            $clientId = $r['client_id'] === null ? null : $clientIds[$r['client_id']];
            $serviceId = $serviceIds[$r['service_id']];

            $stmt->bind_param('iisissssssss', $ownerId, $clientId, $r['client_name'], $serviceId, $r['stylist'], $r['price'], $r['notes'], $r['status'], $r['date'], $r['time_start'], $r['time_end'], $r['created_at']);
            $stmt->execute();
            $ids[$oldId] = $this->conn->insert_id;
        }

        return $ids;
    }

    private function insertAppointmentServices(int $ownerId, array $rows, array $appointmentIds, array $serviceIds): void
    {
        $stmt = $this->conn->prepare("
            INSERT INTO appointment_services (owner_id, appointment_id, service_id, position, price, duration)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        foreach ($rows as $r) {
            $appointmentId = $appointmentIds[$r['appointment_id']];
            $serviceId = $serviceIds[$r['service_id']];

            $stmt->bind_param('iiiisi', $ownerId, $appointmentId, $serviceId, $r['position'], $r['price'], $r['duration']);
            $stmt->execute();
        }
    }

    private function insertAppointmentHistory(int $ownerId, array $rows, array $appointmentIds): void
    {
        $stmt = $this->conn->prepare("
            INSERT INTO appointment_history (owner_id, appointment_id, status_from, status_to, changed_at)
            VALUES (?, ?, ?, ?, COALESCE(?, NOW()))
        ");

        foreach ($rows as $r) {
            $appointmentId = $appointmentIds[$r['appointment_id']];

            $stmt->bind_param('iisss', $ownerId, $appointmentId, $r['status_from'], $r['status_to'], $r['changed_at']);
            $stmt->execute();
        }
    }

    private function insertServiceHistory(int $ownerId, array $rows, array $clientIds, array $appointmentIds, array $serviceIds): array
    {
        $stmt = $this->conn->prepare("
            INSERT INTO service_history (owner_id, client_id, client_name, appointment_id, service_id, service_name_snapshot, performed_at, technical_details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))
        ");
        $ids = [];

        foreach ($rows as $oldId => $r) {
            $clientId = $r['client_id'] === null ? null : $clientIds[$r['client_id']];
            $appointmentId = $r['appointment_id'] === null ? null : $appointmentIds[$r['appointment_id']];
            $serviceId = $r['service_id'] === null ? null : $serviceIds[$r['service_id']];

            $stmt->bind_param('iisiissss', $ownerId, $clientId, $r['client_name'], $appointmentId, $serviceId, $r['service_name_snapshot'], $r['performed_at'], $r['technical_details'], $r['created_at']);
            $stmt->execute();
            $ids[$oldId] = $this->conn->insert_id;
        }

        return $ids;
    }

    private function insertConsumptions(int $ownerId, array $rows, array $recordIds, array $productIds): void
    {
        $stmt = $this->conn->prepare("
            INSERT INTO service_consumptions (owner_id, service_history_id, product_id, quantity_used, cost_snapshot, created_at)
            VALUES (?, ?, ?, ?, ?, COALESCE(?, NOW()))
        ");

        foreach ($rows as $r) {
            $recordId = $recordIds[$r['service_history_id']];
            $productId = $productIds[$r['product_id']];

            $stmt->bind_param('iiisss', $ownerId, $recordId, $productId, $r['quantity_used'], $r['cost_snapshot'], $r['created_at']);
            $stmt->execute();
        }
    }

    // ------------------------------------------------------------
    // Reglas de campo
    // ------------------------------------------------------------

    private function table(array $data, string $table): array
    {
        $rows = $data[$table] ?? null;

        if (!is_array($rows) || !array_is_list($rows)) {
            throw new InvalidArgumentException('El archivo no es una copia válida de HairApp.');
        }

        if (count($rows) > self::MAX_RECORDS) {
            throw new InvalidArgumentException(self::SECTION_NAMES[$table] . ': hay demasiados registros (máximo ' . self::MAX_RECORDS . ').');
        }

        $this->section = $table;

        return $rows;
    }

    private function fail(string $message): never
    {
        throw new InvalidArgumentException(self::SECTION_NAMES[$this->section] . ', registro ' . $this->position . ': ' . $message);
    }

    private function recordId(mixed $row, int $index, array $seen): int
    {
        $this->position = $index + 1;

        if (!is_array($row)) {
            $this->fail('el formato no es válido.');
        }

        $id = $row['id'] ?? null;

        if (!is_int($id) || $id <= 0) {
            $this->fail('el identificador no es válido.');
        }

        if (isset($seen[$id])) {
            $this->fail('el identificador está repetido.');
        }

        return $id;
    }

    private function text(array $row, string $field, string $label, int $maxChars, bool $required): ?string
    {
        $value = $row[$field] ?? null;

        if ($value === null || $value === '') {
            if ($required) {
                $this->fail("falta {$label}.");
            }

            return null;
        }

        if (!is_string($value) || mb_strlen($value) > $maxChars) {
            $this->fail("revisá {$label}: no es un texto válido o supera los {$maxChars} caracteres.");
        }

        return $value;
    }

    private function longText(array $row, string $field, string $label): ?string
    {
        $value = $row[$field] ?? null;

        if ($value === null) {
            return null;
        }

        if (!is_string($value) || strlen($value) > self::MAX_TEXT_BYTES) {
            $this->fail("revisá {$label}: no es un texto válido o es demasiado largo.");
        }

        return $value;
    }

    private function integer(array $row, string $field, string $label, int $min, int $max): int
    {
        $value = filter_var($row[$field] ?? null, FILTER_VALIDATE_INT);

        if ($value === false || $value < $min || $value > $max) {
            $this->fail("{$label} tiene que ser un número entero entre {$min} y {$max}.");
        }

        return $value;
    }

    private function decimal(array $row, string $field, string $label, float $min, float $max): string
    {
        $value = $row[$field] ?? null;

        if (!is_int($value) && !is_float($value) && !(is_string($value) && is_numeric($value))) {
            $this->fail("{$label} no es un número válido.");
        }

        if ((float)$value < $min || (float)$value > $max) {
            $this->fail("{$label} está fuera del rango permitido.");
        }

        return (string)$value;
    }

    private function boolean(array $row, string $field): int
    {
        $value = $row[$field] ?? 1;

        if (!in_array($value, [true, false, 0, 1, '0', '1'], true)) {
            $this->fail('el estado activo no es válido.');
        }

        return (int)(bool)$value;
    }

    private function reference(array $row, string $field, string $label, array $targets, bool $required): ?int
    {
        $value = $row[$field] ?? null;

        if ($value === null) {
            if ($required) {
                $this->fail("falta {$label}.");
            }

            return null;
        }

        if (!is_int($value) || !isset($targets[$value])) {
            $this->fail("{$label} no existe en el archivo.");
        }

        return $value;
    }

    private function date(array $row, string $field, string $label): string
    {
        return $this->formatted($row, $field, $label, 'Y-m-d', true);
    }

    private function time(array $row, string $field, string $label): string
    {
        $value = $row[$field] ?? null;

        if (is_string($value) && preg_match('/^\d{2}:\d{2}$/', $value) === 1) {
            $row[$field] .= ':00';
        }

        return $this->formatted($row, $field, $label, 'H:i:s', true);
    }

    private function dateTime(array $row, string $field, string $label, bool $required): ?string
    {
        return $this->formatted($row, $field, $label, 'Y-m-d H:i:s', $required);
    }

    private function formatted(array $row, string $field, string $label, string $format, bool $required): ?string
    {
        $value = $row[$field] ?? null;

        if ($value === null) {
            if ($required) {
                $this->fail("falta {$label}.");
            }

            return null;
        }

        $parsed = is_string($value) ? DateTime::createFromFormat('!' . $format, $value) : false;

        if ($parsed === false || $parsed->format($format) !== $value) {
            $this->fail("{$label} no es válida.");
        }

        return $value;
    }
}
