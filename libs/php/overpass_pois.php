<?php

header('Content-Type: application/json');
require_once './functions.php';
require_once './error_handle.php';

$parsedUrl = parse_url($_SERVER['REQUEST_URI']);

if (!$parsedUrl) {
    http_response_code(401);
    echo json_encode(['data' => ['error' => 'Malformed url', 'details' => 'Please correct URL format']]);
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

if ($path[1] === 'overpass_pois') {
    $category = $queriesFormatted['category']; /* * DEFAULT * Museums + hotels */
    if ($category === 'default') {
        $queryKey = 'tourism';

        $query = "[out:json][timeout:25]; ( node['tourism'='museum']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['tourism'='hotel']($sw_lat,$sw_lng,$ne_lat,$ne_lng); ); out body;";

        $decodedResponse = fetchOverpassQuery($query);

        if (isset($decodedResponse['error'])) {
            http_response_code(500);
            echo json_encode($decodedResponse);
            exit;
        }

        $elements = $decodedResponse['elements'] ?? [];

        if (!count($elements)) {
            http_response_code(200);
            echo json_encode(['data' => []]);
            exit;
        }

        $allNodesList = ['museum' => [], 'hotel' => [],];

        foreach ($elements as $currentNode) {
            if (isset($currentNode['tags'][$queryKey]) && array_key_exists($currentNode['tags'][$queryKey], $allNodesList)) {
                $type = $currentNode['tags'][$queryKey];
                $allNodesList[$type][] = $currentNode;
            }
        }

        $filteredResult = [];

        foreach ($allNodesList as $type => $nodeList) {
            $filteredResult = array_merge($filteredResult, findNearbyNodesAndNormalize($nodeList, $queryKey, $type, 60));
        }

        http_response_code(200);
        echo json_encode(['data' => $filteredResult]);
        exit;
    } /* * SHOPPING */ else if ($category === 'shopping') {
        $queryKey = 'shop';

        $query = "[out:json][timeout:25]; ( node['shop'='supermarket']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['shop'='convenience']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['shop'='clothes']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['shop'='mall']($sw_lat,$sw_lng,$ne_lat,$ne_lng); ); out body;";

        $decodedResponse = fetchOverpassQuery($query);

        if (isset($decodedResponse['error'])) {
            http_response_code(500);
            echo json_encode($decodedResponse);
            exit;
        }

        $elements = $decodedResponse['elements'] ?? [];

        if (!count($elements)) {
            http_response_code(200);
            echo json_encode(['data' => []]);
            exit;
        }

        $allNodesList = ['supermarket' => [], 'convenience' => [], 'clothes' => [], 'mall' => []];

        foreach ($elements as $currentNode) {
            if (isset($currentNode['tags'][$queryKey]) && array_key_exists($currentNode['tags'][$queryKey], $allNodesList)) {
                $type = $currentNode['tags'][$queryKey];
                $allNodesList[$type][] = $currentNode;
            }
        }

        $filteredResult = [];

        foreach ($allNodesList as $shopType => $nodeList) {
            $filteredResult = array_merge($filteredResult, findNearbyNodesAndNormalize($nodeList, $queryKey, $shopType, 40));
        }

        http_response_code(200);
        echo json_encode(['data' => $filteredResult]);
        exit;
    } /* * HEALTH SERVICES */ else if ($category === 'health_services') {
        $queryKey = 'amenity';

        $query = "[out:json][timeout:25]; ( node['amenity'='hospital']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['amenity'='clinic']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['amenity'='pharmacy']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['amenity'='doctors']($sw_lat,$sw_lng,$ne_lat,$ne_lng); ); out body;";

        $decodedResponse = fetchOverpassQuery($query);

        if (isset($decodedResponse['error'])) {
            http_response_code(500);
            echo json_encode($decodedResponse);
            exit;
        }

        $elements = $decodedResponse['elements'] ?? [];

        if (!count($elements)) {
            http_response_code(200);
            echo json_encode(['data' => []]);
            exit;
        }

        $allNodesList = ['hospital' => [], 'clinic' => [], 'pharmacy' => [], 'doctors' => [],];

        foreach ($elements as $currentNode) {
            if (isset($currentNode['tags'][$queryKey]) && array_key_exists($currentNode['tags'][$queryKey], $allNodesList)) {
                $type = $currentNode['tags'][$queryKey];
                $allNodesList[$type][] = $currentNode;
            }
        }

        $filteredResult = [];
        foreach ($allNodesList as $type => $nodeList) {
            $filteredResult = array_merge($filteredResult, findNearbyNodesAndNormalize($nodeList, $queryKey, $type, 30));
        }

        http_response_code(200);
        echo json_encode(['data' => $filteredResult]);
        exit;
    } /* * FOOD & DRINK */ else if ($category === 'food_and_drink' || $category === 'food') {
        $queryKey = 'amenity';

        $query = "[out:json][timeout:25]; ( node['amenity'='restaurant']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['amenity'='cafe']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['amenity'='fast_food']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['amenity'='pub']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['amenity'='bar']($sw_lat,$sw_lng,$ne_lat,$ne_lng); ); out body;";

        $decodedResponse = fetchOverpassQuery($query);

        if (isset($decodedResponse['error'])) {
            http_response_code(500);
            echo json_encode($decodedResponse);
            exit;
        }
        $elements = $decodedResponse['elements'] ?? [];

        if (!count($elements)) {
            http_response_code(200);
            echo json_encode(['data' => []]);
            exit;
        }

        $allNodesList = ['restaurant' => [], 'cafe' => [], 'fast_food' => [], 'pub' => [], 'bar' => [],];
        foreach ($elements as $currentNode) {
            if (isset($currentNode['tags'][$queryKey]) && array_key_exists($currentNode['tags'][$queryKey], $allNodesList)) {
                $type = $currentNode['tags'][$queryKey];
                $allNodesList[$type][] = $currentNode;
            }
        }

        $filteredResult = [];
        foreach ($allNodesList as $type => $nodeList) {
            $filteredResult = array_merge($filteredResult, findNearbyNodesAndNormalize($nodeList, $queryKey, $type, 30));
        }

        http_response_code(200);
        echo json_encode(['data' => $filteredResult]);
        exit;
    } /* * GENERIC CATEGORY */ else {
        $queryKey = '';

        $categoriesThatAreAmenities = ['post_office', 'restaurant', 'bank', 'hospital', 'cafe', 'coffee'];
        if ($category === 'coffee') {
            $category = 'cafe';
        }

        $categoryKey = "='$category'";
        if ($category === 'supermarket' || $category === 'grocery') {
            $queryKey = 'shop';
        }

        if ($category === 'entertainment' || $category === 'park') {
            $queryKey = 'leisure';
            $categoryKey = '';
        }

        if (in_array($category, $categoriesThatAreAmenities)) {
            $queryKey = 'amenity';
        }

        if ($category === 'hotel' || $category === 'museum') {
            $queryKey = 'tourism';
        } /* * GROCERY */

        if ($category === 'grocery') {
            $query = "[out:json][timeout:25]; ( node['shop'='supermarket']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['shop'='convenience']($sw_lat,$sw_lng,$ne_lat,$ne_lng); ); out body;";
        } /* * PARK / OUTDOORS */ 
        
        else if ($category === 'park' || $category === 'outdoors') {
            $query = "[out:json][timeout:25]; ( node['leisure'='park']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['leisure'='garden']($sw_lat,$sw_lng,$ne_lat,$ne_lng); node['leisure'='nature_reserve']($sw_lat,$sw_lng,$ne_lat,$ne_lng); ); out body;";
        } /* * STANDARD SINGLE CATEGORY */ 
        
        else {
            $query = "[out:json][timeout:25]; node['$queryKey'$categoryKey]($sw_lat,$sw_lng,$ne_lat,$ne_lng); out body;";
        }
        
        $decodedResponse = fetchOverpassQuery($query);
        if (isset($decodedResponse['error'])) {
            http_response_code(500);
            echo json_encode($decodedResponse);
            exit;
        }
        
        $elements = $decodedResponse['elements'] ?? [];
        if (!count($elements)) {
            http_response_code(200);
            echo json_encode(['data' => []]);
            exit;
        }
        $filteredResult = findNearbyNodesAndNormalize($elements, $queryKey, $category, 60);
        http_response_code(200);
        echo json_encode(['data' => $filteredResult]);
        exit;
    }
}
