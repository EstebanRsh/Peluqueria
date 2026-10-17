<?php

/*
 * Plantilla del perfil productivo.
 *
 * Copiá este archivo como hosting.php y completá los valores de database con
 * los datos entregados por el hosting. hosting.php está ignorado por Git y el
 * directorio deniega el acceso web directo mediante .htaccess.
 */
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
];
