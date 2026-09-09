<?php

require_once __DIR__ . '/../models/ClientModel.php';

class ClientController
{
    private ClientModel $model;

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


        // ========================================================
        // LISTAR CLIENTES ACTIVOS
        // ========================================================

        if ($action === 'clients') {
            $this->json($this->model->getActive());
        }


        // ========================================================
        // LISTAR TODOS LOS CLIENTES (ACTIVOS E INACTIVOS)
        // ========================================================

        if ($action === 'clients_all') {
            $this->json($this->model->getAll());
        }


        // ========================================================
        // OBTENER CLIENTE POR ID
        // ========================================================

        if ($action === 'client_get') {
            $id = filter_var($_GET['id'] ?? 0, FILTER_VALIDATE_INT);

            if ($id === false || $id <= 0) {
                $this->json([
                    'success' => false,
                    'error' => 'ID de cliente inválido.'
                ], 400);
            }

            $client = $this->model->getById($id);

            if (!$client) {
                $this->json([
                    'success' => false,
                    'error' => 'El registro del cliente no existe.'
                ], 404);
            }

            $this->json($client);
        }


        // ========================================================
        // BUSCAR CLIENTES (POR ALIAS O CÓDIGO)
        // ========================================================

        if ($action === 'client_search') {
            $q = trim($_GET['q'] ?? '');

            if ($q === '') {
                $this->json([]);
            }

            $this->json($this->model->search($q));
        }


        // ========================================================
        // CREAR CLIENTE
        // ========================================================

        if ($action === 'client_create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!is_array($input)) {
                $this->json([
                    'success' => false,
                    'error' => 'El cuerpo de la solicitud no contiene un JSON válido.'
                ], 400);
            }

            $data = $this->buildClientData($input);
            $validationError = $this->validateClientData($data);

            if ($validationError !== true) {
                $this->json([
                    'success' => false,
                    'error' => $validationError
                ], 400);
            }

            $success = $this->model->create(
                $data['alias'],
                $data['internal_code'],
                $data['notes']
            );

            $this->json([
                'success' => $success,
                'error' => $success ? null : 'No se pudo crear el registro en la base de datos.'
            ]);
        }


        // ========================================================
        // ACTUALIZAR CLIENTE
        // ========================================================

        if ($action === 'client_update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!is_array($input)) {
                $this->json([
                    'success' => false,
                    'error' => 'El cuerpo de la solicitud no contiene un JSON válido.'
                ], 400);
            }

            $id = filter_var($input['id'] ?? 0, FILTER_VALIDATE_INT);

            if ($id === false || $id <= 0) {
                $this->json([
                    'success' => false,
                    'error' => 'ID de cliente inválido.'
                ], 400);
            }

            $existing = $this->model->getById($id);

            if (!$existing) {
                $this->json([
                    'success' => false,
                    'error' => 'El registro del cliente no existe.'
                ], 404);
            }

            $data = $this->buildClientData($input);
            $validationError = $this->validateClientData($data, $id);

            if ($validationError !== true) {
                $this->json([
                    'success' => false,
                    'error' => $validationError
                ], 400);
            }

            $success = $this->model->update(
                $id,
                $data['alias'],
                $data['internal_code'],
                $data['notes']
            );

            $this->json([
                'success' => $success,
                'error' => $success ? null : 'No se pudo actualizar el registro.'
            ]);
        }


        // ========================================================
        // ACTIVAR CLIENTE
        // ========================================================

        if ($action === 'client_activate' && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->handleToggleActive(true);
        }


        // ========================================================
        // DESACTIVAR CLIENTE
        // ========================================================

        if ($action === 'client_deactivate' && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->handleToggleActive(false);
        }


        // ========================================================
        // ELIMINAR CLIENTE
        // ========================================================

        if ($action === 'client_delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!is_array($input)) {
                $this->json([
                    'success' => false,
                    'error' => 'El cuerpo de la solicitud no contiene un JSON válido.'
                ], 400);
            }

            $id = filter_var($input['id'] ?? 0, FILTER_VALIDATE_INT);

            if ($id === false || $id <= 0) {
                $this->json([
                    'success' => false,
                    'error' => 'ID de cliente inválido.'
                ], 400);
            }

            if ($this->model->hasAppointments($id)) {
                $this->json([
                    'success' => false,
                    'error' => 'No se puede eliminar el cliente porque tiene turnos asociados en el historial.'
                ], 400);
            }

            $success = $this->model->delete($id);

            $this->json([
                'success' => $success,
                'error' => $success ? null : 'No se pudo eliminar el registro.'
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

    private function handleToggleActive(bool $active): void
    {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!is_array($input)) {
            $this->json([
                'success' => false,
                'error' => 'El cuerpo de la solicitud no contiene un JSON válido.'
            ], 400);
        }

        $id = filter_var($input['id'] ?? 0, FILTER_VALIDATE_INT);

        if ($id === false || $id <= 0) {
            $this->json([
                'success' => false,
                'error' => 'ID de cliente inválido.'
            ], 400);
        }

        $existing = $this->model->getById($id);

        if (!$existing) {
            $this->json([
                'success' => false,
                'error' => 'El registro no existe.'
            ], 404);
        }

        $success = $active ? $this->model->activate($id) : $this->model->deactivate($id);

        $this->json([
            'success' => $success,
            'error' => $success ? null : 'No se pudo actualizar el estado del registro.'
        ]);
    }


    // ============================================================
    // CONSTRUIR DATOS DEL CLIENTE (NORMALIZACIÓN INCLUIDA)
    // ============================================================

    private function buildClientData(array $input): array
    {
        $rawCode = trim($input['internal_code'] ?? '');

        return [
            'alias' => trim($input['alias'] ?? ''),
            'internal_code' => $this->formatInternalCode($rawCode),
            'notes' => trim($input['notes'] ?? '') ?: null,
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

            if ($this->model->existsInternalCode($data['internal_code'], $currentId)) {
                return 'El código interno (' . $data['internal_code'] . ') ya está en uso por otro cliente.';
            }
        }

        return true;
    }


    // ============================================================
    // FORMATEAR CÓDIGO INTERNO (Ej: "1" -> "CLI-0001")
    // ============================================================

    private function formatInternalCode(?string $code): ?string
    {
        if ($code === null || trim($code) === '') {
            return null;
        }

        $clean = trim($code);

        // Convierte números puros ("26" -> "CLI-0026")
        if (ctype_digit($clean)) {
            return sprintf('CLI-%04d', (int)$clean);
        }

        // Normaliza formatos incompletos ("CLI-1" -> "CLI-0001")
        if (preg_match('/^CLI-(\d+)$/i', $clean, $matches)) {
            return sprintf('CLI-%04d', (int)$matches[1]);
        }

        return strtoupper($clean);
    }


    // ============================================================
    // RESPUESTAS JSON
    // ============================================================

    private function json(mixed $data, int $status = 200): void
    {
        ob_end_clean();

        http_response_code($status);

        header('Content-Type: application/json; charset=utf-8');

        echo json_encode(
            $data,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        exit;
    }
}
