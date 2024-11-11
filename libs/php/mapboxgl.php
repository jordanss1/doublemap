<?php
    header('Content-Type: application/json');
    require_once './functions.php';
    require_once './model/map_db.php';

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    if (!$parsedUrl) {
        http_response_code(401);
        echo ['data' => ['error' => 'Malformed url', 'details' => 'Please correct URL format']];
        exit;
    }

    [$path] = parsePathAndQueryString($parsedUrl, false);

    if ($path === 'mapboxgl') {
        checkRequestCount('mapboxgljs');

        $url = "https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token={$_ENV['MAPBOX_TOKEN_PHP']}";

        $response = fetchApiCall($url, true);
    
        http_response_code(200);
        echo $response;
        exit;
    }