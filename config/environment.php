<?php

// ============================================================
// ENTORNO
// Para usar otro perfil, cambiá solo HAIRAPP_ENVIRONMENT. Cada perfil vive en
// config/environments/<entorno>.php; si no es válido, la petición termina sin usar otro.
// ============================================================

const HAIRAPP_ENVIRONMENT = 'xampp';

function appConfig(): array
{
    static $config = null;

    if ($config !== null) {
        return $config;
    }

    $environment = HAIRAPP_ENVIRONMENT;

    if (!is_string($environment) || preg_match('/^[a-z][a-z0-9_-]*$/', $environment) !== 1) {
        appConfigurationError('El nombre del entorno seleccionado no es válido.');
    }

    $profile = __DIR__ . '/environments/' . $environment . '.php';

    if (!is_file($profile) || !is_readable($profile)) {
        appConfigurationError('No existe un perfil legible para el entorno seleccionado.');
    }

    try {
        $config = require $profile;
    } catch (Throwable $e) {
        error_log('HairApp: no se pudo cargar el perfil "' . $environment . '": ' . $e->getMessage());
        appConfigurationError('No se pudo cargar la configuración del entorno seleccionado.');
    }

    if (!is_array($config)) {
        appConfigurationError('El perfil seleccionado no contiene una configuración válida.');
    }

    validateAppConfig($config);

    return $config;
}

function appConfigSection(string $section): array
{
    $config = appConfig();

    if (!isset($config[$section]) || !is_array($config[$section])) {
        appConfigurationError('Falta una sección obligatoria en la configuración del entorno.');
    }

    return $config[$section];
}

function validateAppConfig(array $config): void
{
    $database = $config['database'] ?? null;
    $auth = $config['auth'] ?? null;

    if (!is_array($database) || !is_array($auth)) {
        appConfigurationError('El perfil debe incluir las secciones database y auth.');
    }

    foreach (['host', 'name', 'user', 'password'] as $key) {
        if (!array_key_exists($key, $database) || !is_string($database[$key])) {
            appConfigurationError('La configuración de base de datos está incompleta.');
        }
    }

    if ($database['host'] === '' || $database['name'] === '' || $database['user'] === '') {
        appConfigurationError('La configuración de base de datos está incompleta.');
    }

    if (!isset($database['port']) || !is_int($database['port']) || $database['port'] < 1 || $database['port'] > 65535) {
        appConfigurationError('El puerto de base de datos no es válido.');
    }

    foreach (['session_name_https', 'session_name_http'] as $key) {
        if (!isset($auth[$key]) || !is_string($auth[$key]) || $auth[$key] === '') {
            appConfigurationError('La configuración de cookies de sesión está incompleta.');
        }
    }

    foreach (['allow_http_localhost', 'allow_public_registration', 'trust_proxy_headers'] as $key) {
        if (!array_key_exists($key, $auth) || !is_bool($auth[$key])) {
            appConfigurationError('La configuración de seguridad del entorno no es válida.');
        }
    }

    foreach (['allowed_hosts', 'local_hosts'] as $key) {
        if (!isset($auth[$key]) || !is_array($auth[$key]) || $auth[$key] === []) {
            appConfigurationError('La configuración de hosts permitidos está incompleta.');
        }

        foreach ($auth[$key] as $host) {
            if (!is_string($host) || $host === '') {
                appConfigurationError('La configuración de hosts permitidos no es válida.');
            }
        }
    }
}

function appConfigurationError(string $message): void
{
    error_log('HairApp: ' . $message);

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    }

    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

appConfig();
