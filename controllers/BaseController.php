<?php

// ============================================================
// CONTROLADOR BASE
// Lectura de datos, respuestas JSON y validaciones comunes de los controladores de la API.
// ============================================================

require_once __DIR__ . '/../config/auth.php';

abstract class BaseController
{
    protected function ownerId(): int
    {
        $user = Auth::currentUser();

        if ($user === null || !isset($user['id']) || !is_int($user['id']) || $user['id'] <= 0) {
            $this->error('No se pudo identificar el owner autenticado.', 401);
        }

        return $user['id'];
    }

    protected function str(mixed $value): string
    {
        return is_string($value) ? trim($value) : '';
    }

    protected function json(mixed $data, int $status = 200): void
    {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    protected function error(string $message, int $status = 400): void
    {
        $this->json(['success' => false, 'error' => $message], $status);
    }

    protected function requirePost(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            $this->error('Método no permitido. Usá POST.', 405);
        }
    }

    protected function readInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!is_array($input)) {
            $this->error('El cuerpo de la solicitud no contiene un JSON válido.');
        }

        return $input;
    }

    protected function validId(mixed $value, string $label): int
    {
        $id = filter_var($value, FILTER_VALIDATE_INT);

        if ($id === false || $id <= 0) {
            $this->error("ID de {$label} inválido.");
        }

        return $id;
    }

    protected function pagination(): array
    {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 25)));

        return [$page, $perPage];
    }

    protected function statusFilter(): string
    {
        $filter = $_GET['filter'] ?? 'todos';

        return in_array($filter, ['activos', 'inactivos'], true) ? $filter : 'todos';
    }
}
