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

    $centerLat = ($sw_lat + $ne_lat) / 2;
    $centerLng = ($sw_lng + $ne_lng) / 2;

    if ($path[2] === 'pois') {
        $category = $queriesFormatted['category'];
        $url = 'https://overpass-api.de/api/interpreter?data=';

        if ($category === 'default') {
            $queryKey = 'tourism';
            $query = "[out:json];(node['$queryKey'='museum']($sw_lat,$sw_lng,$ne_lat,$ne_lng);node['$queryKey'='hotel']($sw_lat,$sw_lng,$ne_lat,$ne_lng););out;";

            $response = fetchApiCall($url . urlencode($query), true);

            $decodedResponse = decodeResponse($response);

            if (isset($decodedResponse['error'])) {
                http_response_code(500);
                echo json_encode($decodedResponse);
                exit;
            }

            $decodedResponse = $decodedResponse['elements'];

            if (!isset($decodedResponse) || !count($decodedResponse)) {
                http_response_code(200);
                echo json_encode(['data' => []]);
                exit;
            }

            $allNodesList = [
                'museum' => [],
                'hotel' => [],
            ];

            foreach ($decodedResponse as $currentNode) {
                if (isset($currentNode['tags'][$queryKey]) && array_key_exists($currentNode['tags'][$queryKey], $allNodesList)) {
                    $allNodesList[$currentNode['tags'][$queryKey]][] = $currentNode;
                }
            }

            $filteredResult = [];

            foreach ($allNodesList as $nodeList) {
                $filteredResult = array_merge($filteredResult, findNearbyNodesAndNormalize($nodeList, $centerLat, $centerLng, $queryKey, 20));
            }

            http_response_code(200);
            echo json_encode(['data' => $filteredResult]);
            exit;
        
        } else if ($category === 'shopping') {
            $queryKey = 'shop';
            $query = "[out:json];(node['$queryKey'='supermarket']($sw_lat,$sw_lng,$ne_lat,$ne_lng);
            node['$queryKey'='convenience']($sw_lat,$sw_lng,$ne_lat,$ne_lng);
            node['$queryKey'='clothes']($sw_lat,$sw_lng,$ne_lat,$ne_lng);
            node['$queryKey'='mall']($sw_lat,$sw_lng,$ne_lat,$ne_lng););out;";

            $response = fetchApiCall($url . urlencode($query), true);

            $decodedResponse = decodeResponse($response);

            if (isset($decodedResponse['error'])) {
                http_response_code(500);
                echo json_encode($decodedResponse);
                exit;
            }

            $decodedResponse = $decodedResponse['elements'];

            if (!isset($decodedResponse) || !count($decodedResponse)) {
                http_response_code(200);
                echo json_encode(['data' => []]);
                exit;
            }

            $allNodesList = [
                'supermarket' => [],
                'convenience' => [],
                'clothes' => [],
                'mall' => []
            ];

            foreach ($decodedResponse as $currentNode) {
                if (isset($currentNode['tags']['shop']) && array_key_exists($currentNode['tags']['shop'], $allNodesList)) {
                    $allNodesList[$currentNode['tags']['shop']][] = $currentNode;
                } 
            }

            $filteredResult = [];

            foreach ($allNodesList as $nodeList) {
                $filteredResult = array_merge($filteredResult, findNearbyNodesAndNormalize($nodeList, $centerLat, $centerLng, $queryKey, 10));
            }

            http_response_code(200);
            echo json_encode(['data' => $filteredResult]);
            exit;

            
        } else if ($category === 'health_services') {
            $queryKey = 'amenity';
            $query = "[out:json];(node['$queryKey'='hospital']($sw_lat,$sw_lng,$ne_lat,$ne_lng);
            node['$queryKey'='clinic']($sw_lat,$sw_lng,$ne_lat,$ne_lng);
            node['$queryKey'='pharmacy']($sw_lat,$sw_lng,$ne_lat,$ne_lng);
            node['$queryKey'='doctors']($sw_lat,$sw_lng,$ne_lat,$ne_lng););out;";

            $response = fetchApiCall($url . urlencode($query), true);

            $decodedResponse = decodeResponse($response);

            if (isset($decodedResponse['error'])) {
                http_response_code(500);
                echo json_encode($decodedResponse);
                exit;
            }

            $decodedResponse = $decodedResponse['elements'];

            if (!isset($decodedResponse) || !count($decodedResponse)) {
                http_response_code(200);
                echo json_encode(['data' => []]);
                exit;
            }

            $allNodesList = [
                "hospital" => [],
                "clinic" => [],
                "pharmacy" => [],
                "doctors" => [],
            ];

            foreach ($decodedResponse as $currentNode) {
                if (isset($currentNode['tag'][$queryKey]) && array_key_exists($currentNode['tag'][$queryKey], $allNodesList)) {
                    $allNodesList[$currentNode['tag'][$queryKey]][] = $currentNode;
                }
            }

            $filteredResult = [];

            foreach ($allNodesList as $nodeList) {
                $filteredResult = array_merge($filteredResult, findNearbyNodesAndNormalize($nodeList, $centerLat, $centerLng, $queryKey, 10));
            }

            http_response_code(200);
            echo json_encode(['data' => $filteredResult]);
            exit;


        } else if ($category === 'food_and_drink') {
           $query = "[out:json];(
                node['amenity'='restaurant']($sw_lat,$sw_lng,$ne_lat,$ne_lng);
                node['amenity'='cafe']($sw_lat,$sw_lng,$ne_lat,$ne_lng);
                node['amenity'='fast_food']($sw_lat,$sw_lng,$ne_lat,$ne_lng);
                node['amenity'='pub']($sw_lat,$sw_lng,$ne_lat,$ne_lng);
                node['amenity'='bar']($sw_lat,$sw_lng,$ne_lat,$ne_lng);
                );out;";

            $response = fetchApiCall($url . urlencode($query), true);

            $decodedResponse = decodeResponse($response);

            if (isset($decodedResponse['error'])) {
                http_response_code(500);
                echo json_encode($decodedResponse);
                exit;
            }

            $decodedResponse = $decodedResponse['elements'];

            if (!isset($decodedResponse) || !count($decodedResponse)) {
                http_response_code(200);
                echo json_encode(['data' => []]);
                exit;
            }

            $allNodesList = [
                "restaurant" => [],
                "cafe" => [],
                "fast_food" => [],
                "pub" => [],
                "bar" => [],
            ];

            foreach ($decodedResponse as $currentNode) {
                if (isset($currentNode['tag'][$queryKey]) && array_key_exists($currentNode['tag'][$queryKey], $allNodesList)) {
                    $allNodesList[$currentNode['tag'][$queryKey]][] = $currentNode;
                }
            }

            $filteredResult = [];

            foreach ($allNodesList as $nodeList) {
                $filteredResult = array_merge($filteredResult, findNearbyNodesAndNormalize($nodeList, $centerLat, $centerLng, $queryKey, 5));
            }

            http_response_code(200);
            echo json_encode(['food_and_drink' => $decodedResponse]);
            exit;
        }  else {
            $queryKey = '';
            $categoriesThatAreAmenities = ['post_office', 'park', 'restaurant', 'cinema', 'bank', 'hospital', 'cafe', 'coffee'];
            $categoryKey = '=' . "'$category'";

            if ($category === 'supermarket') {
                $queryKey = 'shop';
            } 

            if ($category === 'entertainment') {
                $queryKey = 'leisure';
                $categoryKey = '';
            }

            if (in_array($category, $categoriesThatAreAmenities)) {
                $queryKey = 'amenity';
            }

            if ($category === 'hotel' || $category === 'museum') {
                $queryKey = 'tourism';
            }

            $query = "[out:json];node['$queryKey'$categoryKey]($sw_lat,$sw_lng,$ne_lat,$ne_lng);out;";

            $response = fetchApiCall($url . urlencode($query), true);

            $decodedResponse = decodeResponse($response);

            if (isset($decodedResponse['error'])) {
                http_response_code(500);
                echo json_encode($decodedResponse);
                exit;
            }

            $decodedResponse = $decodedResponse['elements'];

            if (!isset($decodedResponse) || !count($decodedResponse)) {
                http_response_code(200);
                echo json_encode(['data' => []]);
                exit;
            }

            $filteredResult = findNearbyNodesAndNormalize($decodedResponse, $centerLat, $centerLng, $queryKey);

            http_response_code(200);
            echo json_encode([$category => $decodedResponse]);
            exit;
        }        
    }