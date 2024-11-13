<?php
    header('Content-Type: application/json');
    session_start();

    require_once './functions.php';
    require_once './model/map_db.php';
    require_once './origin_check.php';

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    if (!$parsedUrl) {
        http_response_code(401);
        echo ['data' => ['error' => 'Malformed url', 'details' => 'Please correct URL format']];
        exit;
    }

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);
    
    if ($path === 'mapboxgljs') {
        $initial = (!isset($_SESSION['mapboxgl_called']) || $_SESSION['mapboxgl_called'] !== true);

        checkRequestCount($path);
        $style = $queriesFormatted['style'];

        $url = "https://api.mapbox.com/styles/v1/mapbox/$style?access_token={$_ENV['MAPBOX_TOKEN_PHP']}";

        $response = fetchApiCall($url, false);

        function isError ($response) { 
            return (isset($response['error']) || empty($response));
        };

        if ($initial && isError($response)) {
            $try = 0;
            global $response;

            while ($try < 5) {
                $try++;
                $endOnError = $try === 5;

                $response = fetchApiCall($url, $endOnError);

                if (!isError($response)) break;

                if ($try === 5 && isError($response)) {
                    http_response_code(500);
                    echo json_encode(['error' => 'Error retrieving map style', 'details' => 'Failed to retrieve the map style after multiple attempts']);
                    exit;
                }
            }
        }

        if ($initial) {
            $_SESSION['mapboxgl_called'] = true;
            incrementRequestCount($path);
        }
    
        http_response_code(200);
        echo $response;
        exit;
    }