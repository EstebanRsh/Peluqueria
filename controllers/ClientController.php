<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../models/ClientModel.php';

class ClientController extends BaseController
{
    private ClientModel $model;

    private const POST_ACTIONS = [
        'client_create',
        'client_update',
        'client_activate',
        'client_deactivate',
        'client_delete',
    ];

    public function __construct()
    {
        $this->model = new ClientModel();
    }

    // ============================================================
    // MANEJO DE PETICIONES
    // ============================================================

    // Punto de entrada: index.php llama a este método para cualquier
    // ?action= de clientes. Acá se decide qué hacer según la acción.
    public function handleRequest(): void
    {
        ob_start();

        $action = $_GET['action'] ?? '';

        // Las acciones que modifican datos (crear, editar, borrar, etc.)
        // solo se pueden pedir por POST, nunca por GET.
        if (in_array($action, self::POST_ACTIONS, true)) {
            $this->requirePost();
        }

        switch ($action) {

            // Listado paginado: ?page=1&per_page=25&filter=todos|activos|inactivos&q=texto
            case 'clients_all':
                [$page, $perPage] = $this->pagination();
                $this->json($this->model->paginate(
                    $this->ownerId(),
                    $this->str($_GET['q'] ?? ''),
                    $this->statusFilter(),
                    $page,
                    $perPage
                ));
                break;

            // Trae un cliente puntual (para abrir el formulario de edición).
            case 'client_get':
                $id = $this->validId($_GET['id'] ?? 0, 'cliente');
                $client = $this->model->getById($this->ownerId(), $id);

                if (!$client) {
                    $this->error('El registro del cliente no existe.', 404);
                }

                $this->json($client);
                break;

            // Autocompletado por alias (máximo 15 resultados)
            case 'client_search':
                $q = $this->str($_GET['q'] ?? '');
                $this->json($q === '' ? [] : $this->model->search($this->ownerId(), $q));
                break;

            // Crea un cliente nuevo.
            case 'client_create':
                $data = $this->buildClientData($this->readInput());
                $error = $this->validateClientData($data);

                if ($error !== true) {
                    $this->error($error);
                }

                $success = $this->model->create($this->ownerId(), $data);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo crear el registro en la base de datos.'
                ]);
                break;

            // Edita un cliente existente. Primero se busca el registro actual
            // para poder conservar los campos que no vengan en el body.
            case 'client_update':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'cliente');
                $existing = $this->model->getById($this->ownerId(), $id);

                if (!$existing) {
                    $this->error('El registro del cliente no existe.', 404);
                }

                $data = $this->buildClientData($input, $existing);
                $error = $this->validateClientData($data, $id);

                if ($error !== true) {
                    $this->error($error);
                }

                $success = $this->model->update($this->ownerId(), $id, $data);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo actualizar el registro.'
                ]);
                break;

            // Activar / desactivar comparten la misma lógica (ver más abajo).
            case 'client_activate':
                $this->handleToggleActive(true);
                break;

            case 'client_deactivate':
                $this->handleToggleActive(false);
                break;

            // Borra un cliente definitivamente. Solo si no tiene turnos ni
            // fichas técnicas asociadas (si tiene, se rechaza el borrado).
            case 'client_delete':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'cliente');

                if ($this->model->hasRelatedRecords($this->ownerId(), $id)) {
                    $this->error('No se puede eliminar el cliente porque tiene turnos o fichas técnicas asociadas. Podés desactivarlo.');
                }

                $success = $this->model->delete($this->ownerId(), $id);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo eliminar el registro.'
                ]);
                break;
        }

        // Si el switch no encontró ningún case (acción desconocida), llega acá.
        $this->error('Acción no válida.', 404);
    }

    // ============================================================
    // ACTIVAR / DESACTIVAR (LÓGICA COMPARTIDA)
    // ============================================================

    // Lógica compartida por client_activate y client_deactivate:
    // solo cambia la columna "active" del cliente.
    private function handleToggleActive(bool $active): void
    {
        $input = $this->readInput();
        $id = $this->validId($input['id'] ?? 0, 'cliente');
        $ownerId = $this->ownerId();

        if (!$this->model->getById($ownerId, $id)) {
            $this->error('El registro no existe.', 404);
        }

        $success = $active ? $this->model->activate($ownerId, $id) : $this->model->deactivate($ownerId, $id);

        $this->json([
            'success' => $success,
            'error'   => $success ? null : 'No se pudo actualizar el estado del registro.'
        ]);
    }

    // ============================================================
    // CONSTRUIR DATOS DEL CLIENTE (NORMALIZACIÓN INCLUIDA)
    // ============================================================

    // Si es una edición ($existing), los campos de diagnóstico y el código
    // que no vengan en el JSON conservan su valor actual (no se borran).
    private function buildClientData(array $input, ?array $existing = null): array
    {
        $keep = fn(string $key) => $existing !== null && !array_key_exists($key, $input);

        // Normaliza el código interno (ej: "1" -> "CLI-0001").
        // Si no vino código y es una edición, se conserva el que ya tenía.
        $code = $this->formatInternalCode($this->str($input['internal_code'] ?? null));
        if ($code === null && $existing !== null) {
            $code = $existing['internal_code'];
        }

        // Igual que arriba, pero para el porcentaje de canas.
        if ($keep('grey_hair')) {
            $grey = $existing['grey_hair'] !== null ? (int)$existing['grey_hair'] : null;
        } else {
            $rawGrey = $input['grey_hair'] ?? null;
            $grey = ($rawGrey === null || $rawGrey === '')
                ? null
                : filter_var($rawGrey, FILTER_VALIDATE_INT);
        }

        return [
            'alias'             => $this->str($input['alias'] ?? null),
            'internal_code'     => $code,
            'natural_base_tone' => $keep('natural_base_tone')
                ? $existing['natural_base_tone']
                : ($this->str($input['natural_base_tone'] ?? null) ?: null),
            'grey_hair'         => $grey,
            'hair_type'         => $keep('hair_type')
                ? $existing['hair_type']
                : ($this->str($input['hair_type'] ?? null) ?: null),
            'allergies'         => $keep('allergies')
                ? $existing['allergies']
                : ($this->str($input['allergies'] ?? null) ?: null),
            'notes'             => $this->str($input['notes'] ?? null) ?: null,
        ];
    }

    // ============================================================
    // VALIDAR DATOS DEL CLIENTE
    // ============================================================

    // Revisa que los datos del cliente sean válidos antes de guardar.
    // Devuelve "true" si está todo OK, o un mensaje de error (string) si no.
    private function validateClientData(array $data, int $currentId = 0)
    {
        if ($data['alias'] === '') {
            return 'El alias o nombre de referencia es obligatorio.';
        }

        if (mb_strlen($data['alias']) > 100) {
            return 'El alias no puede superar los 100 caracteres.';
        }

        if ($data['internal_code'] !== null) {
            if (mb_strlen($data['internal_code']) > 40) {
                return 'El código interno no puede superar los 40 caracteres.';
            }

            if ($this->model->existsInternalCode($this->ownerId(), $data['internal_code'], $currentId)) {
                return 'El código interno (' . $data['internal_code'] . ') ya está en uso por otro cliente.';
            }
        }

        if (
            $data['grey_hair'] !== null &&
            ($data['grey_hair'] === false || $data['grey_hair'] < 0 || $data['grey_hair'] > 100)
        ) {
            return 'El porcentaje de canas debe ser un número entero entre 0 y 100.';
        }

        if (mb_strlen($data['natural_base_tone'] ?? '') > 30) {
            return 'El tono natural no puede superar los 30 caracteres.';
        }

        if (mb_strlen($data['hair_type'] ?? '') > 100) {
            return 'El tipo de cabello no puede superar los 100 caracteres.';
        }

        return true;
    }

    // ============================================================
    // FORMATEAR CÓDIGO INTERNO (Ej: "1" -> "CLI-0001")
    // ============================================================

    private function formatInternalCode(string $code): ?string
    {
        if ($code === '') {
            return null;
        }

        // Números puros ("26" -> "CLI-0026")
        if (ctype_digit($code)) {
            return sprintf('CLI-%04d', (int)$code);
        }

        // Formatos incompletos ("CLI-1" -> "CLI-0001")
        if (preg_match('/^CLI-(\d+)$/i', $code, $matches)) {
            return sprintf('CLI-%04d', (int)$matches[1]);
        }

        return strtoupper($code);
    }
}
