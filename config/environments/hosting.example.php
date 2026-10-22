<?php

// ============================================================
// PERFIL DE PRODUCCIÓN (EJEMPLO)
// Copiá este archivo como hosting.php y completá database con los datos del hosting.
// hosting.php está ignorado por Git y la carpeta no se puede abrir desde la web.
// ============================================================

return [
    'database' => [
        'host'     => '',
        'port'     => 0,
        'name'     => '',
        'user'     => '',
        'password' => '',
    ],
    'auth' => [
        'session_name_https'   => '__Host-peluqueria_sid',
        'session_name_http'    => 'peluqueria_sid',
        'allow_http_localhost' => false,
        'allow_public_registration' => false,
        'allowed_hosts'        => ['imperialsoft.site', 'www.imperialsoft.site'],
        'local_hosts'          => ['localhost', '127.0.0.1', '::1'],
        'trust_proxy_headers'  => false,
    ],
    'legal' => [
        'responsible'   => '',
        'tax_id'        => '',
        'address'       => '',
        'support_email' => '',
        'privacy_email' => '',
        'hosting'       => '',
        'jurisdiction'  => '',
        'backup_days'   => '',
        'updated'       => '',
    ],
];
