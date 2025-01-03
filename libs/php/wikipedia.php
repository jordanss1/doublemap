<?php

    header('Content-Type: application/json');
    require_once dirname(__DIR__) . '/functions.php';
    require_once dirname(__DIR__) . '/error_handle.php';

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    if (!$parsedUrl) {
        http_response_code(401);
        echo json_encode(['data' => ['error' => 'Malformed url', 'details' => 'Please correct URL format']]);
        exit;
    }

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);

    if ($path[2] === 'country_history') {

    }

    if ($path[2] === 'events') {
        $day = $queriesFormatted['day'];
        $month = $queriesFormatted['month'];

        $invalidDayOrMonth = (!is_numeric($day) || $day < 1 || $day > 31) || 
        (!is_numeric($month) || $month < 1 || $month > 12);

        if ($invalidDayOrMonth) {
            http_response_code(401);
            echo json_encode(['error' => 'Incorrect query types', 'details' => 'Month and day are not valid number for month or day']);
            exit;
        }

        $url = "https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/$month/$day";

        $response = fetchApiCall($url, true);

        http_response_code(200);
        echo json_encode($response);
        exit;

        $decodedResponse = decodeResponse($response);

        if (isset($decodedResponse['error'])) {
            http_response_code(500);
            echo json_encode($decodedResponse);
            exit;
        }


    }

    