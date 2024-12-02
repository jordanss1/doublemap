<?php

    header('Content-Type: application/json');
    require_once dirname(__DIR__) . '/functions.php';
    require_once dirname(__DIR__) . '/error_handle.php';
    require_once dirname(__DIR__) . '/origin_check.php';

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    if (!$parsedUrl) {
        http_response_code(401);
        echo ['data' => ['error' => 'Malformed url', 'details' => 'Please correct URL format']];
        exit;
    }

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);

    $inputData = file_get_contents('php://input');

    if (!$inputData) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing bounds from request', 'details' => 'Missing bounds please request again with bounds for amenities']);
        exit;
    }

    $bounds = decodeResponse($inputData);

    if (isset($bounds['error'])) {
        http_response_code(500);
        echo json_encode($bounds);
        exit;
    }

    $sw_lat = $bounds['_sw']['lat'];
    $sw_lng = $bounds['_sw']['lng'];
    $ne_lat = $bounds['_ne']['lat'];
    $ne_lng = $bounds['_ne']['lng'];


    if ($path[2] === 'pois') {
        $amenityType = $queriesFormatted['type'];
        $queryKey = '';

        if ($amenityType === 'museum') {
            $queryKey = 'tourism';
        }

        if (isset($amenityType)) {
            $url = 'https://overpass-api.de/api/interpreter?data=';
            $query = "[out:json];(node[$queryKey=$amenityType]($sw_lat,$sw_lng,$ne_lat,$ne_lng););out;";

            $response = fetchApiCall($url . urlencode($query), true);

            $decodedResponse = decodeResponse($response);

            if (isset($decodedResponse['error'])) {
                http_response_code(500);
                echo json_encode($decodedResponse);
                exit;
            }

            http_response_code(200);
            echo json_encode(['data' => $decodedResponse]);
        }   
    }