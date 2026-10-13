<?php

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
];
