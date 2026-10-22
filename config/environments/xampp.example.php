<?php

/*
 * Perfil de desarrollo local (XAMPP).
 *
 * Copiá este archivo como xampp.php y ajustá los datos de database si hace
 * falta. xampp.php está ignorado por Git; este ejemplo no contiene secretos.
 */
return [
    'database' => [
        'host'     => 'localhost',
        'port'     => 3306,
        'name'     => 'peluqueria',
        'user'     => 'root',
        'password' => '',
    ],
    'auth' => [
        'session_name_https'   => '__Host-peluqueria_sid',
        'session_name_http'    => 'peluqueria_sid',
        'allow_http_localhost' => true,
        'allow_public_registration' => true,
        'allowed_hosts'        => ['localhost', '127.0.0.1'],
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
