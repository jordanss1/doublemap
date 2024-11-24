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

    if ($path[2] === 'category') {
        $categoryList = $queriesFormatted['list'];

        if (isset($categoryList) && $categoryList = 'true') {
            $url = "https://api.mapbox.com/search/searchbox/v1/list/category?access_token={$_ENV['MAPBOX_TOKEN_DEFAULT']}";

            $categoryList = ['Food and Drink', 'Services', 'Shopping', 'Food', 'Health Services', 'Restaurant', 'Grocery', 'Outdoors', 'Park', 'Supermarket', 'Café', 'Bank', 'Hospital', 'Entertainment', 'Coffee', 'Post Office'];

            $response = fetchApiCall($url, true);

            if (isset($response['error']) || empty($response)) {
                http_response_code(500);
                echo json_encode($response);
                exit;
            }

            $decodedResponse = decodeResponse($response);

            $filteredResponse = array_map(function($category)  {
                return ['name' => $category['name'], 'canonical_id' => $category['canonical_id']];
            }, $decodedResponse['listItems']);

            $filteredResponse = array_values(array_filter($filteredResponse, function($category) use ($categoryList) {
                return in_array($category['name'], $categoryList);
            }));

            http_response_code(200);
            echo json_encode(['data' => $filteredResponse]);
        }
    }