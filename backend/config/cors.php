<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // In production, replace with your actual frontend domain
    // e.g., ['https://watermonitor.yourdomain.com']
    'allowed_origins' => [
        'https://water-level-system.coeofjrmsu.com',  // Production frontend
        'http://water-level-system.coeofjrmsu.com',   // Production frontend (http)
        'http://localhost:5173',  // Vite dev server
        'http://localhost:5174',  // Vite dev server (fallback port)
        'http://localhost:3000',  // Alternative dev port
        'http://localhost:82',    // Docker frontend port
        'http://localhost:8080',  // Docker frontend port (new)
        'http://127.0.0.1:82',
        'http://127.0.0.1:8080',
    ],

    'allowed_origins_patterns' => [
        '#^https?://.*\.coeofjrmsu\.com$#',  // All subdomains of coeofjrmsu.com
        '#^http(s)?://.*:82$#',  // Allows access from any host on port 82
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    // Cache preflight requests for 24 hours (reduces OPTIONS requests)
    'max_age' => 86400,

    // Required for Sanctum token authentication via cookies/headers
    'supports_credentials' => true,

];
