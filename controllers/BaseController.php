<?php

/**
 * Clase base para los controladores de la API.
 * Proporciona métodos auxiliares estandarizados para la lectura de datos,
 * formato de respuestas JSON, manejo de encabezados y validaciones comunes.
 */
abstract class BaseController
{
    // Limpia y recorta espacios de una cadena de texto.
    // Retorna string vacío si el valor recibido no es una cadena válida.
    protected function str(mixed $value): string
    {
        return is_string($value) ? trim($value) : '';
    }

    // Emite una respuesta en formato JSON con su código HTTP y finaliza la ejecución.
    protected function json(mixed $data, int $status = 200): void
    {
        // Limpia cualquier buffer previo para evitar enviar HTML/advertencias accidentales
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // Emite una respuesta de error estandarizada en formato JSON
    protected function error(string $message, int $status = 400): void
    {
        $this->json(['success' => false, 'error' => $message], $status);
    }

    // Restringe el acceso asegurando que la petición sea de tipo POST
    protected function requirePost(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            $this->error('Método no permitido. Usá POST.', 405);
        }
    }

    // Lee y decodifica el cuerpo (body) de una petición JSON entrante.
    // Retorna un array asociativo o finaliza con error 400 si el JSON es inválido.
    protected function readInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!is_array($input)) {
            $this->error('El cuerpo de la solicitud no contiene un JSON válido.');
        }

        return $input;
    }

    // Valida que el parámetro sea un entero positivo mayor a cero (ID).
    // Retorna el ID validado o interrumpe la ejecución con error 400.
    protected function validId(mixed $value, string $label): int
    {
        $id = filter_var($value, FILTER_VALIDATE_INT);

        if ($id === false || $id <= 0) {
            $this->error("ID de {$label} inválido.");
        }

        return $id;
    }

    // Parsea los parámetros de paginación desde la URL (?page=X&per_page=Y).
    // Garantiza valores dentro de rangos seguros (máximo 100 registros por página).
    protected function pagination(): array
    {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 25)));

        return [$page, $perPage];
    }

    // Normaliza el parámetro de filtro por estado (todos | activos | inactivos)
    protected function statusFilter(): string
    {
        $filter = $_GET['filter'] ?? 'todos';

        return in_array($filter, ['activos', 'inactivos'], true) ? $filter : 'todos';
    }
}
