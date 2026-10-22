<?php

// ============================================================
// CLIENTES (API)
// Listado, búsqueda, alta, edición, activación y baja de clientes.
// ============================================================

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

    public function handleRequest(): void
    {
        ob_start();

        $action = $_GET['action'] ?? '';

        if (in_array($action, self::POST_ACTIONS, true)) {
            $this->requirePost();
        }

        switch ($action) {

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

            case 'client_get':
                $id = $this->validId($_GET['id'] ?? 0, 'cliente');
                $client = $this->model->getById($this->ownerId(), $id);

                if (!$client) {
                    $this->error('El registro del cliente no existe.', 404);
                }

                $this->json($client);
                break;

            case 'client_search':
                $q = $this->str($_GET['q'] ?? '');
                $this->json($q === '' ? [] : $this->model->search($this->ownerId(), $q));
                break;

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

            case 'client_activate':
                $this->handleToggleActive(true);
                break;

            case 'client_deactivate':
                $this->handleToggleActive(false);
                break;

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

        $this->error('Acción no válida.', 404);
    }

    // ============================================================
    // ACTIVAR / DESACTIVAR (LÓGICA COMPARTIDA)
    // ============================================================

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

    private function buildClientData(array $input, ?array $existing = null): array
    {
        $keep = fn(string $key) => $existing !== null && !array_key_exists($key, $input);

        $code = $this->formatInternalCode($this->str($input['internal_code'] ?? null));
        if ($code === null && $existing !== null) {
            $code = $existing['internal_code'];
        }

        return [
            'alias'             => $this->str($input['alias'] ?? null),
            'internal_code'     => $code,
            'natural_base_tone' => $keep('natural_base_tone')
                ? $existing['natural_base_tone']
                : ($this->str($input['natural_base_tone'] ?? null) ?: null),
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

        if (mb_strlen($data['natural_base_tone'] ?? '') > 30) {
            return 'El tono natural no puede superar los 30 caracteres.';
        }

        if (mb_strlen($data['hair_type'] ?? '') > 100) {
            return 'El tipo de cabello no puede superar los 100 caracteres.';
        }

        if (mb_strlen($data['allergies'] ?? '') > 500) {
            return 'Las alergias no pueden superar los 500 caracteres.';
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

        if (ctype_digit($code)) {
            return sprintf('CLI-%04d', (int)$code);
        }

        if (preg_match('/^CLI-(\d+)$/i', $code, $matches)) {
            return sprintf('CLI-%04d', (int)$matches[1]);
        }

        return strtoupper($code);
    }
}
