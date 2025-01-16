<?php
    header('Content-Type: application/json');
    session_start();

    require_once dirname(__DIR__) . '/functions.php';
    require_once dirname(__DIR__) . '/error_handle.php';
    require_once dirname(__DIR__) . '/model/map_db.php';

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    if (!$parsedUrl) {
        http_response_code(401);
        echo json_encode(['data' => ['error' => 'Malformed url', 'details' => 'Please correct URL format']]);
        exit;
    }

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);

    if ($path[2] === 'category') {
        checkRequestCount('search');
        
        if (isset($queriesFormatted['list'])) {
            $url = "https://api.mapbox.com/search/searchbox/v1/list/category?access_token={$_ENV['MAPBOX_TOKEN_DEFAULT']}";

            $categoryList = ['food_and_drink', 'shopping', 'food', 'hotel', 'health_services', 'restaurant', 'grocery', 'outdoors', 'museum', 'park', 'supermarket', 'cafe', 'bank', 'hospital', 'entertainment', 'post_office', 'coffee'];
            $shopping = ['grocery', 'shopping', 'supermarket'];

            $colorList = [
                ['color' => '#d9534f', 'hospital', 'museum', 'lodging', 'bank'], 
                ['color' => '#5b9bd5', 'clothing-store', 'restaurant', 'coffee', 'cafe'], 
                ['color' => '#5a6d83', 'post'], 
                ['color' => '#2e8b57', 'park'],
                ['color' => '#c8559d', 'cinema'] 
            ];

            $response = fetchApiCall($url, true);

            incrementRequestCount('search');

            if (isset($response['error']) || empty($response)) {
                http_response_code(500);
                echo json_encode($response);
                exit;
            }

            $decodedResponse = decodeResponse($response);

            $filteredResponse = array_values(array_filter($decodedResponse['listItems'], function($category) use ($categoryList) {
                return in_array($category['canonical_id'], $categoryList);
            }));    

            $filteredResponse = array_map(function($category) use ($shopping, $colorList)  {
                $icon = $category['icon'];
                $color = '';

                if (in_array($category['canonical_id'], $shopping)) {
                    $icon = 'clothing-store';
                } else if ($category['canonical_id'] === 'bank') {
                    $icon = 'bank';
                } else if ($category['canonical_id'] === 'outdoors') {
                    $icon = 'park';
                } else if ($category['canonical_id'] === 'health_services') {
                    $icon = 'hospital';
                } else if ($category['canonical_id'] === 'food_and_drink') {
                    $icon = 'restaurant';
                }

                foreach ($colorList as $item) {
                    if (in_array($icon, $item)) {
                        $color = $item['color'];
                        break;
                    }
                }

                return ['name' => $category['name'], 'canonical_id' => $category['canonical_id'], 'icon' => $icon, 'color' => $color];
            }, $filteredResponse);



            http_response_code(200);
            echo json_encode(['data' => $filteredResponse]);
            exit;
        }
    }