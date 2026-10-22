<?php

// ============================================================
// SERVICIOS (API)
// Listado, búsqueda, alta, edición, activación y baja de servicios.
// ============================================================

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../models/ServiceModel.php';

class ServiceController extends BaseController
{
    private ServiceModel $model;

    private const MAX_DURATION = 1440;
    private const MAX_PRICE = 99999999.99;

    private const POST_ACTIONS = [
        'service_create',
        'service_update',
        'service_activate',
        'service_deactivate',
        'service_delete',
    ];

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

        $action = $_GET['action'] ?? '';

        if (in_array($action, self::POST_ACTIONS, true)) {
            $this->requirePost();
        }

        switch ($action) {

            case 'services':
                $this->json($this->model->getActive($this->ownerId(), $this->str($_GET['q'] ?? '')));
                break;

            case 'services_all':
                [$page, $perPage] = $this->pagination();
                $this->json($this->model->paginate(
                    $this->ownerId(),
                    $this->str($_GET['q'] ?? ''),
                    $this->statusFilter(),
                    $page,
                    $perPage
                ));
                break;

            case 'service_get':
                $id = $this->validId($_GET['id'] ?? 0, 'servicio');
                $service = $this->model->getById($this->ownerId(), $id);

                if (!$service) {
                    $this->error('El servicio no existe.', 404);
                }

                $this->json($service);
                break;

            case 'service_create':
                $data = $this->buildServiceData($this->readInput());
                $error = $this->validateServiceData($data);

                if ($error !== true) {
                    $this->error($error);
                }

                if ($this->model->nameExists($this->ownerId(), $data['name'])) {
                    $this->error('Ya tenés un servicio llamado «' . $data['name'] . '». Elegí otro nombre.', 409);
                }

                $newId = $this->model->create($this->ownerId(), $data);

                $this->json([
                    'success' => $newId !== false,
                    'id'      => $newId !== false ? $newId : null,
                    'error'   => $newId !== false ? null : 'No se pudo crear el servicio en la base de datos.'
                ]);
                break;

            case 'service_update':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'servicio');

                $current = $this->model->getById($this->ownerId(), $id);

                if (!$current) {
                    $this->error('El servicio no existe.', 404);
                }

                $data = $this->buildServiceData($input);
                $error = $this->validateServiceData($data);

                if ($error !== true) {
                    $this->error($error);
                }

                if (
                    mb_strtolower($current['name']) !== mb_strtolower($data['name'])
                    && $this->model->nameExists($this->ownerId(), $data['name'], $id)
                ) {
                    $this->error('Ya tenés un servicio llamado «' . $data['name'] . '». Elegí otro nombre.', 409);
                }

                $success = $this->model->update($this->ownerId(), $id, $data);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo actualizar el servicio.'
                ]);
                break;

            case 'service_activate':
                $this->handleToggleActive(true);
                break;

            case 'service_deactivate':
                $this->handleToggleActive(false);
                break;

            case 'service_delete':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'servicio');

                if (!$this->model->getById($this->ownerId(), $id)) {
                    $this->error('El servicio no existe.', 404);
                }

                if ($this->model->countRelatedAppointments($this->ownerId(), $id) > 0) {
                    $this->error(
                        'Este servicio tiene turnos o fichas asociadas y no puede eliminarse. ' .
                            'Podés desactivarlo para que deje de estar disponible.',
                        409
                    );
                }

                $success = $this->model->delete($this->ownerId(), $id);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo eliminar el servicio.'
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
        $id = $this->validId($input['id'] ?? 0, 'servicio');
        $ownerId = $this->ownerId();

        if (!$this->model->getById($ownerId, $id)) {
            $this->error('El servicio no existe.', 404);
        }

        $success = $active ? $this->model->activate($ownerId, $id) : $this->model->deactivate($ownerId, $id);

        $this->json([
            'success' => $success,
            'error'   => $success ? null : 'No se pudo actualizar el estado del servicio.'
        ]);
    }

    // ============================================================
    // CONSTRUIR DATOS DEL SERVICIO
    // ============================================================

    private function buildServiceData(array $input): array
    {
        return [
            'name'        => $this->str($input['name'] ?? null),
            'description' => $this->str($input['description'] ?? null),
            'duration'    => filter_var($input['duration'] ?? 0, FILTER_VALIDATE_INT),
            'price'       => is_numeric($input['price'] ?? null) ? (float)$input['price'] : -1,
        ];
    }

    // ============================================================
    // VALIDAR DATOS DEL SERVICIO
    // ============================================================

    private function validateServiceData(array $data)
    {
        if ($data['name'] === '') {
            return 'El nombre del servicio es obligatorio.';
        }

        if (mb_strlen($data['name']) > 100) {
            return 'El nombre del servicio no puede superar los 100 caracteres.';
        }

        if (
            $data['duration'] === false ||
            $data['duration'] <= 0 ||
            $data['duration'] > self::MAX_DURATION
        ) {
            return 'La duración debe ser un número entero entre 1 y ' . self::MAX_DURATION . ' minutos.';
        }

        if ($data['price'] < 0 || $data['price'] > self::MAX_PRICE) {
            return 'El precio debe estar entre 0 y 99.999.999,99.';
        }

        return true;
    }
}
