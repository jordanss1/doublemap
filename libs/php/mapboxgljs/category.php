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

    if ($path[2] === 'category') {
        checkRequestCount('search');
        
        if (isset($queriesFormatted['list'])) {
            $url = "https://api.mapbox.com/search/searchbox/v1/list/category?access_token={$_ENV['MAPBOX_TOKEN_DEFAULT']}";

            $categoryList = ['food_and_drink', 'shopping', 'food', 'hotel', 'health_services', 'restaurant', 'grocery', 'outdoors', 'museum', 'park', 'supermarket', 'cafe', 'bank', 'hospital', 'entertainment', 'coffee', 'post_office'];
            $shopping = ['grocery', 'shopping', 'supermarket'];

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

            $filteredResponse = array_map(function($category) use ($shopping)  {
                $icon = $category['icon'];
                $color = '';

                if (in_array($category['canonical_id'], $shopping)) {
                    $icon = 'shopping';
                } else if ($category['canonical_id'] === 'bank') {
                    $icon = 'bank';
                } else if ($category['canonical_id'] === 'outdoors') {
                    $icon = 'park';
                } else if ($category['canonical_id'] === 'health_services') {
                    $icon = 'hospital';
                }

                if ($icon === 'lodging') {
                    $color = '#b093ec';
                }

                if ($icon === 'museum' ) {
                    $color = '#ec93ce';
                }

                if ($icon === 'hotel' || $icon === 'cinema') {
                    $color = '#f66151'; 
                }   

                if ($icon === 'post' ||  $icon === 'bank' || $icon === 'hospital') {
                    $color = '#ed333b'; 
                }   

                if ($icon === 'shopping' || $icon === 'fast-food' || $icon === 'cafe' || $icon === 'restaurant') {
                    $color = '#63a6e9'; 
                }   

                if ($icon === 'park') {
                    $color = '#2aa70b';
                }

                return ['name' => $category['name'], 'canonical_id' => $category['canonical_id'], 'icon' => $icon, 'color' => $color];
            }, $filteredResponse);



            http_response_code(200);
            echo json_encode(['data' => $filteredResponse]);
            exit;
        }
    }