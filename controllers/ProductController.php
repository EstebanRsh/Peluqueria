<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../models/ProductModel.php';

class ProductController extends BaseController
{
    private ProductModel $model;

    // Unidades de medida válidas para los insumos de la peluquería
    private const UNITS = ['ml', 'g', 'unidad'];

    // Límites de las columnas SQL: stock DECIMAL(10,2) y unit_cost DECIMAL(10,4)
    private const MAX_STOCK = 99999999.99;
    private const MAX_COST = 999999.9999;

    // Acciones que requieren estrictamente un método POST
    private const POST_ACTIONS = [
        'product_create',
        'product_update',
        'product_activate',
        'product_deactivate',
        'product_delete',
    ];

    public function __construct()
    {
        $this->model = new ProductModel();
    }

    // ============================================================
    // MANEJO DE PETICIONES
    // ============================================================

    public function handleRequest(): void
    {
        ob_start();

        $action = $_GET['action'] ?? '';

        // Si la acción modifica datos, exige POST
        if (in_array($action, self::POST_ACTIONS, true)) {
            $this->requirePost();
        }

        switch ($action) {

            // Productos activos (tope 500). Para selectores rápidos usar product_search.
            case 'products':
                $this->json($this->model->getActive($this->ownerId()));
                break;

            // Listado paginado para abm: ?page=1&per_page=25&filter=todos|activos|inactivos&q=texto
            case 'products_all':
                [$page, $perPage] = $this->pagination();
                $this->json($this->model->paginate(
                    $this->ownerId(),
                    $this->str($_GET['q'] ?? ''),
                    $this->statusFilter(),
                    $page,
                    $perPage
                ));
                break;

            // Obtiene los datos completos de un producto por ID para edición
            case 'product_get':
                $id = $this->validId($_GET['id'] ?? 0, 'producto');
                $product = $this->model->getById($this->ownerId(), $id);

                if (!$product) {
                    $this->error('El producto no existe.', 404);
                }

                $this->json($product);
                break;

            // Autocompletado rápido al armar ficha de servicio (máximo 15 resultados)
            case 'product_search':
                $q = $this->str($_GET['q'] ?? '');
                $this->json($q === '' ? [] : $this->model->search($this->ownerId(), $q));
                break;

            // Alta de nuevo producto
            case 'product_create':
                $data = $this->buildProductData($this->readInput());
                $error = $this->validateProductData($data);

                if ($error !== true) {
                    $this->error($error);
                }

                $success = $this->model->create(
                    $this->ownerId(),
                    $data['name'],
                    $data['brand'],
                    $data['measurement_unit'],
                    $data['stock'],
                    $data['unit_cost']
                );

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo crear el producto en la base de datos.'
                ]);
                break;

            // Modificación o ajuste manual de stock de un producto
            case 'product_update':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'producto');

                if (!$this->model->getById($this->ownerId(), $id)) {
                    $this->error('El producto no existe.', 404);
                }

                $data = $this->buildProductData($input);
                $error = $this->validateProductData($data);

                if ($error !== true) {
                    $this->error($error);
                }

                $success = $this->model->update(
                    $this->ownerId(),
                    $id,
                    $data['name'],
                    $data['brand'],
                    $data['measurement_unit'],
                    $data['stock'],
                    $data['unit_cost']
                );

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo actualizar el producto.'
                ]);
                break;

            // Activa un producto previamente dado de baja
            case 'product_activate':
                $this->handleToggleActive(true);
                break;

            // Desactiva un producto para ocultarlo en las búsquedas
            case 'product_deactivate':
                $this->handleToggleActive(false);
                break;

            // Eliminación física (solo si nunca fue utilizado en un consumo de servicio)
            case 'product_delete':
                $input = $this->readInput();
                $id = $this->validId($input['id'] ?? 0, 'producto');

                if ($this->model->hasConsumptions($this->ownerId(), $id)) {
                    $this->error('No se puede eliminar el producto porque ya fue usado en servicios. Podés desactivarlo.');
                }

                $success = $this->model->delete($this->ownerId(), $id);

                $this->json([
                    'success' => $success,
                    'error'   => $success ? null : 'No se pudo eliminar el producto.'
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
        $id = $this->validId($input['id'] ?? 0, 'producto');
        $ownerId = $this->ownerId();

        if (!$this->model->getById($ownerId, $id)) {
            $this->error('El producto no existe.', 404);
        }

        $success = $active ? $this->model->activate($ownerId, $id) : $this->model->deactivate($ownerId, $id);

        $this->json([
            'success' => $success,
            'error'   => $success ? null : 'No se pudo actualizar el estado del producto.'
        ]);
    }

    // ============================================================
    // CONSTRUIR DATOS DEL PRODUCTO (NORMALIZACIÓN INCLUIDA)
    // ============================================================

    private function buildProductData(array $input): array
    {
        $stock = $input['stock'] ?? 0;
        $unitCost = $input['unit_cost'] ?? 0;

        return [
            'name'             => $this->str($input['name'] ?? null),
            'brand'            => $this->str($input['brand'] ?? null) ?: null,
            'measurement_unit' => $this->str($input['measurement_unit'] ?? 'ml'),
            // Un string vacío cuenta como 0; si no es numérico la validación lo rechaza.
            'stock'            => $stock === '' ? 0 : $stock,
            'unit_cost'        => $unitCost === '' ? 0 : $unitCost,
        ];
    }

    // ============================================================
    // VALIDAR DATOS DEL PRODUCTO
    // ============================================================

    private function validateProductData(array &$data)
    {
        if ($data['name'] === '') {
            return 'El nombre del producto es obligatorio.';
        }

        if (mb_strlen($data['name']) > 150) {
            return 'El nombre no puede superar los 150 caracteres.';
        }

        if ($data['brand'] !== null && mb_strlen($data['brand']) > 100) {
            return 'La marca no puede superar los 100 caracteres.';
        }

        if (!in_array($data['measurement_unit'], self::UNITS, true)) {
            return 'La unidad de medida debe ser ml, g o unidad.';
        }

        if (!is_numeric($data['stock']) || (float)$data['stock'] < 0) {
            return 'El stock debe ser un número mayor o igual a 0.';
        }

        if (!is_numeric($data['unit_cost']) || (float)$data['unit_cost'] < 0) {
            return 'El costo unitario debe ser un número mayor o igual a 0.';
        }

        // Redondeo de precisión según columnas en BD
        $data['stock'] = round((float)$data['stock'], 2);
        $data['unit_cost'] = round((float)$data['unit_cost'], 4);

        if ($data['stock'] > self::MAX_STOCK) {
            return 'El stock supera el valor máximo permitido.';
        }

        if ($data['unit_cost'] > self::MAX_COST) {
            return 'El costo unitario supera el valor máximo permitido.';
        }

        return true;
    }
}
