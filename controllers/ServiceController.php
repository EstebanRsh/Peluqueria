<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../models/ServiceModel.php';

class ServiceController extends BaseController
{
    private ServiceModel $model;

    private const MAX_DURATION = 1440;      // minutos (24 hs)
    private const MAX_PRICE = 99999999.99;  // límite de DECIMAL(10,2)

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

    // Punto de entrada: index.php llama a este método para cualquier
    // ?action= de servicios. Acá se decide qué hacer según la acción.
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

            // Servicios activos (selector de nuevos turnos)
            case 'services':
                $this->json($this->model->getActive($this->ownerId()));
                break;

            // Listado paginado (activos e inactivos) para administración:
            // ?page=1&per_page=25&filter=todos|activos|inactivos&q=texto
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

            // Trae un servicio puntual (para abrir el formulario de edición).
            case 'service_get':
                $id = $this->validId($_GET['id'] ?? 0, 'servicio');
                $service = $this->model->getById($this->ownerId(), $id);

                if (!$service) {
                    $this->error('El servicio no existe.', 404);
                }

                $this->json($service);
                break;

            // Crea un servicio nuevo (siempre queda activo).
            case 'service_create':
                $data = $this->buildServiceData($this->readInput());
                $error = $this->validateServiceData($data);

                if ($error !== true) {
                    $this->error($error);
                }

                $newId = $this->model->create($this->ownerId(), $data);

                $this->json([
                    'success' => $newId !== false,
                    'id'      => $newId !== false ? $newId : null,
                    'error'   => $newId !== false ? null : 'No se pudo crear el servicio en la base de datos.'
                ]);
                break;

            // Edita un servicio existente (nombre, descripción, duración, precio).
            case 'service_update':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'servicio');

                if (!$this->model->getById($this->ownerId(), $id)) {
                    $this->error('El servicio no existe.', 404);
                }

                $data = $this->buildServiceData($input);
                $error = $this->validateServiceData($data);

                if ($error !== true) {
                    $this->error($error);
                }

                // El cambio de precio base NO altera los turnos ya creados.
                $success = $this->model->update($this->ownerId(), $id, $data);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo actualizar el servicio.'
                ]);
                break;

            // Activar / desactivar comparten la misma lógica (ver más abajo).
            case 'service_activate':
                $this->handleToggleActive(true);
                break;

            case 'service_deactivate':
                $this->handleToggleActive(false);
                break;

            // Borra un servicio definitivamente. Solo si no tiene turnos ni
            // fichas técnicas asociadas (si tiene, se rechaza el borrado).
            case 'service_delete':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'servicio');

                if (!$this->model->getById($this->ownerId(), $id)) {
                    $this->error('El servicio no existe.', 404);
                }

                // Eliminación segura: no se borra un servicio con turnos o fichas asociadas.
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

        // Si el switch no encontró ningún case (acción desconocida), llega acá.
        $this->error('Acción no válida.', 404);
    }

    // ============================================================
    // ACTIVAR / DESACTIVAR (LÓGICA COMPARTIDA)
    // ============================================================

    // Lógica compartida por service_activate y service_deactivate:
    // solo cambia la columna "active" del servicio.
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

    // Ordena y castea lo que llegó del body (JSON) a los tipos que espera el modelo.
    // No valida nada acá; eso lo hace validateServiceData().
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

    // Revisa que los datos del servicio sean válidos antes de guardar.
    // Devuelve "true" si está todo OK, o un mensaje de error (string) si no.
    private function validateServiceData(array $data)
    {
        if ($data['name'] === '') {
            return 'El nombre del servicio es obligatorio.';
        }

        if (mb_strlen($data['name']) > 100) {
            return 'El nombre del servicio no puede superar los 100 caracteres.';
        }

        // "duration" viene de filter_var(..., FILTER_VALIDATE_INT): si no era un
        // entero válido, acá vale "false".
        if (
            $data['duration'] === false ||
            $data['duration'] <= 0 ||
            $data['duration'] > self::MAX_DURATION
        ) {
            return 'La duración debe ser un número entero entre 1 y ' . self::MAX_DURATION . ' minutos.';
        }

        // "price" viene en -1 desde buildServiceData() si no era numérico,
        // así que ese caso también cae acá (queda fuera del rango permitido).
        if ($data['price'] < 0 || $data['price'] > self::MAX_PRICE) {
            return 'El precio debe estar entre 0 y 99.999.999,99.';
        }

        return true;
    }
}
