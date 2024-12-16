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
        echo json_encode(['data' => ['error' => 'Malformed url', 'details' => 'Please correct URL format']]);
        exit;
    }

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);

    if ($path[2] === 'search') {
        checkRequestCount('search');

        $endpoint = $queriesFormatted['endpoint'];

        if (isset($endpoint) && $endpoint === 'forward') {
            $query = $queriesFormatted['q'];
            $query = trim(strip_tags($query));
            $query = urlencode($query);
            $proximity = isset($queriesFormatted['proximity']) ? "&proximity={$queriesFormatted['proximity']}" : "";
            $limit = isset($queriesFormatted['limit']) ? $queriesFormatted['limit'] : 10;
            
            $url = "https://api.mapbox.com/search/searchbox/v1/forward?q=$query&limit=$limit&auto_complete=true$proximity&access_token={$_ENV['MAPBOX_TOKEN_DEFAULT']}";

            $response = fetchApiCall($url, true);
            
            incrementRequestCount('search');

            $decodedResponse = decodeResponse($response);

            if (isset($decodedResponse['error'])) {
                http_response_code(500);
                echo json_encode($decodedResponse);
                exit;
            }

            http_response_code(200);
            echo json_encode(['data' => $decodedResponse['features']]);
            exit;
        }

        if ((isset($endpoint) && $endpoint === 'reverse')) {
            $latitude = $queriesFormatted['latitude'];
            $longitude = $queriesFormatted['longitude'];
            $limit = $queriesFormatted['limit'];

            $url = "https://api.mapbox.com/search/searchbox/v1/reverse?longitude=$longitude&latitude=$latitude&limit=$limit&access_token={$_ENV['MAPBOX_TOKEN_DEFAULT']}";

            $response = fetchApiCall($url, true);

            incrementRequestCount('search');

            $decodedResponse = decodeResponse($response);

            if (isset($decodedResponse['error'])) {
                http_response_code(500);
                echo json_encode($decodedResponse);
                exit;
            }

            $results = [];

            if (count($decodedResponse['features']) === 0) {
                http_response_code(200);
                echo json_encode(['data' => null]);
                exit;
            }

            foreach ($decodedResponse['features'] as $feature) {
                $context = $feature['properties']['context'];

                foreach ($context as $key => $value) {
                    if (($key === 'region' || $key === 'place' || $key === 'district' || $key === 'neighborhood')  && (!isset($results[$key]) || $results[$key] !== null)) {
                        $results[$key] = $value['name'];
                    }
                }
            }

            http_response_code(200);
            echo json_encode(['data' => $results]);
            exit;
        }   
    }