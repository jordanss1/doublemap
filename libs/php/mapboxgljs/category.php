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
        if (isset($queriesFormatted['list'])) {
            $categoryList = [
                [ 'name'=> "Shopping", 'canonical_id'=> "shopping", 'icon' => null ],
                [ 'name'=> "Food and Drink", 'canonical_id'=> "food_and_drink", 'icon' => "fast-food" ],
                [ 'name'=> "Health Services", 'canonical_id'=> "health_services", 'icon' => null ],
                [ 'name'=> "Restaurant", 'canonical_id'=> "restaurant", 'icon' => "restaurant" ],
                [ 'name'=> "Park", 'canonical_id'=> "park", 'icon' => "park" ],
                [ 'name'=> "Cinema", 'canonical_id'=> "cinema", 'icon' => "cinema" ],
                [ 'name'=> "Supermarket", 'canonical_id'=> "supermarket", 'icon' => null ],
                [ 'name'=> "Café", 'canonical_id'=> "cafe", 'icon' => "cafe" ],
                [ 'name'=> "Bank", 'canonical_id'=> "bank", 'icon' => null ],
                [ 'name'=> "Hospital", 'canonical_id'=> "hospital", 'icon' => "hospital" ],
                [ 'name'=> "Hotel", 'canonical_id'=> "hotel", 'icon' => "hotel" ],
                [ 'name'=> "Entertainment", 'canonical_id'=> "entertainment", 'icon' => "cinema" ],
                [ 'name'=> "Coffee", 'canonical_id'=> "coffee", 'icon' => "cafe" ],
                [ 'name'=> "Post Office", 'canonical_id'=> "post_office", 'icon' => "post" ],
                [ 'name'=> "Museum", 'canonical_id'=> "museum", 'icon' => "museum" ]
            ];

            http_response_code(200);
            echo json_encode(['data' => $categoryList]);
            exit;
        }
    }