<?php

require_once __DIR__ . '/../models/ProductModel.php';

class ProductController
{
    private ProductModel $model;

    private const UNITS = ['ml', 'g', 'unidad'];

    // Límite de DECIMAL(10,2)
    private const MAX_DECIMAL = 99999999.99;

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


        // ========================================================
        // LISTAR PRODUCTOS ACTIVOS
        // ========================================================

        if ($action === 'products') {
            $this->json($this->model->getActive());
        }


        // ========================================================
        // LISTAR TODOS LOS PRODUCTOS (ACTIVOS E INACTIVOS)
        // ========================================================

        if ($action === 'products_all') {
            $this->json($this->model->getAll());
        }


        // ========================================================
        // OBTENER PRODUCTO POR ID
        // ========================================================

        if ($action === 'product_get') {
            $id = filter_var($_GET['id'] ?? 0, FILTER_VALIDATE_INT);

            if ($id === false || $id <= 0) {
                $this->json([
                    'success' => false,
                    'error' => 'ID de producto inválido.'
                ], 400);
            }

            $product = $this->model->getById($id);

            if (!$product) {
                $this->json([
                    'success' => false,
                    'error' => 'El producto no existe.'
                ], 404);
            }

            $this->json($product);
        }


        // ========================================================
        // CREAR PRODUCTO
        // ========================================================

        if ($action === 'product_create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!is_array($input)) {
                $this->json([
                    'success' => false,
                    'error' => 'El cuerpo de la solicitud no contiene un JSON válido.'
                ], 400);
            }

            $data = $this->buildProductData($input);
            $validationError = $this->validateProductData($data);

            if ($validationError !== true) {
                $this->json([
                    'success' => false,
                    'error' => $validationError
                ], 400);
            }

            $success = $this->model->create(
                $data['name'],
                $data['brand'],
                $data['measurement_unit'],
                $data['stock'],
                $data['unit_cost']
            );

            $this->json([
                'success' => $success,
                'error' => $success ? null : 'No se pudo crear el producto en la base de datos.'
            ]);
        }


        // ========================================================
        // ACTUALIZAR PRODUCTO
        // ========================================================

        if ($action === 'product_update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
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
                    'error' => 'ID de producto inválido.'
                ], 400);
            }

            $existing = $this->model->getById($id);

            if (!$existing) {
                $this->json([
                    'success' => false,
                    'error' => 'El producto no existe.'
                ], 404);
            }

            $data = $this->buildProductData($input);
            $validationError = $this->validateProductData($data);

            if ($validationError !== true) {
                $this->json([
                    'success' => false,
                    'error' => $validationError
                ], 400);
            }

            $success = $this->model->update(
                $id,
                $data['name'],
                $data['brand'],
                $data['measurement_unit'],
                $data['stock'],
                $data['unit_cost']
            );

            $this->json([
                'success' => $success,
                'error' => $success ? null : 'No se pudo actualizar el producto.'
            ]);
        }


        // ========================================================
        // ACTIVAR PRODUCTO
        // ========================================================

        if ($action === 'product_activate' && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->handleToggleActive(true);
        }


        // ========================================================
        // DESACTIVAR PRODUCTO
        // ========================================================

        if ($action === 'product_deactivate' && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->handleToggleActive(false);
        }


        // ========================================================
        // ELIMINAR PRODUCTO
        // ========================================================

        if ($action === 'product_delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
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
                    'error' => 'ID de producto inválido.'
                ], 400);
            }

            if ($this->model->hasConsumptions($id)) {
                $this->json([
                    'success' => false,
                    'error' => 'No se puede eliminar el producto porque ya fue usado en servicios. Podés desactivarlo.'
                ], 400);
            }

            $success = $this->model->delete($id);

            $this->json([
                'success' => $success,
                'error' => $success ? null : 'No se pudo eliminar el producto.'
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
                'error' => 'ID de producto inválido.'
            ], 400);
        }

        $existing = $this->model->getById($id);

        if (!$existing) {
            $this->json([
                'success' => false,
                'error' => 'El producto no existe.'
            ], 404);
        }

        $success = $active ? $this->model->activate($id) : $this->model->deactivate($id);

        $this->json([
            'success' => $success,
            'error' => $success ? null : 'No se pudo actualizar el estado del producto.'
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
            'name' => trim((string)($input['name'] ?? '')),
            'brand' => trim((string)($input['brand'] ?? '')) ?: null,
            'measurement_unit' => trim((string)($input['measurement_unit'] ?? 'ml')),
            // Se deja el valor original si no es numérico para que la
            // validación lo detecte (un string vacío cuenta como 0).
            'stock' => $stock === '' ? 0 : $stock,
            'unit_cost' => $unitCost === '' ? 0 : $unitCost,
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

        $data['stock'] = round((float)$data['stock'], 2);
        $data['unit_cost'] = round((float)$data['unit_cost'], 2);

        if ($data['stock'] > self::MAX_DECIMAL || $data['unit_cost'] > self::MAX_DECIMAL) {
            return 'El stock o el costo unitario superan el valor máximo permitido.';
        }

        return true;
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
