<?php
    header('Content-Type: application/json');
    session_start();

    require_once dirname(__DIR__) . '/functions.php';
    require_once dirname(__DIR__) . '/error_handle.php';
    require_once dirname(__DIR__) . '/model/map_db.php';
    require_once dirname(__DIR__) . '/origin_check.php';

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);


    if (!$parsedUrl) {
        http_response_code(401);
        echo ['data' => ['error' => 'Malformed url', 'details' => 'Please correct URL format']];
        exit;
    }

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);

    if ($path[2] === 'search') {
        checkRequestCount('search');

        $query = $queriesFormatted['q'];
        $proximity = $queriesFormatted['proximity'];

        

        if (isset($query)) {
            $query = trim(strip_tags($query));
            $query = urlencode($query);
            

            $url = "https://api.mapbox.com/search/searchbox/v1/forward?q=$query&limit=10&auto_complete=true&proximity=$proximity&access_token={$_ENV['MAPBOX_TOKEN_DEFAULT']}";

            $response = fetchApiCall($url, true);

            incrementRequestCount('search');

            $decodedResponse = decodeResponse($response);

            if (isset($decodedResponse['error'])) {
                curl_close($ch);                    
                http_response_code(500);
                echo json_encode($decodedResponse);
                exit;
            }

            http_response_code(200);
            echo json_encode(['data' => $decodedResponse['features']]);
            exit;
        }
    }