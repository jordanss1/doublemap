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

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl, false);

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
            $url = 'https://overpass-api.de/api/interpreter?data=';
            $query = "[out:json];(node['tourism'='museum']($sw_lat,$sw_lng,$ne_lat,$ne_lng);node['tourism'='hotel']($sw_lat,$sw_lng,$ne_lat,$ne_lng););out;";

            $response = fetchApiCall($url . urlencode($query), true);

            $decodedResponse = decodeResponse($response);

            if (isset($decodedResponse['error'])) {
                http_response_code(500);
                echo json_encode($decodedResponse);
                exit;
            }

            $museumsData = array_filter($decodedResponse['elements'], function($node) {
                return isset($node['tags']['tourism']) && $node['tags']['tourism'] === 'museum';
            });

            $hotelsData = array_filter($decodedResponse['elements'], function($node) {
                return isset($node['tags']['tourism']) && $node['tags']['tourism'] === 'hotel';
            });

            $centerLat = ($sw_lat + $ne_lat) / 2;
            $centerLng = ($sw_lng + $ne_lng) / 2;

            function calculateDistance($lat1, $lon1, $lat2, $lon2) {
                $earthRadius = 6371; 
            
                $lat1 = deg2rad($lat1);
                $lon1 = deg2rad($lon1);
                $lat2 = deg2rad($lat2);
                $lon2 = deg2rad($lon2);
                
                $dLat = $lat2 - $lat1;
                $dLon = $lon2 - $lon1;
            
                $a = sin($dLat / 2) * sin($dLat / 2) +
                     cos($lat1) * cos($lat2) *
                     sin($dLon / 2) * sin($dLon / 2);
            
                $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
            
                return $earthRadius * $c; 
            }

            function normalizeNode ($node)  {
                global $centerLat;
                global $centerLng;

                $distance = calculateDistance($centerLat, $centerLng, $node['lat'], $node['lon']);

                $name = $node['tags']['name'] ?? $node['tags']['not:name'] ?? $node['tags']['old_name'] ??  $node['tags']['brand'] ?? null;

                return $distance <= 10 && $name ? 
                 [
                    'lat' => $node['lat'],
                    'lon' => $node['lon'],
                    'name' => $node['tags']['name'] ?? $node['tags']['not:name'] ?? $node['tags']['old_name'] ??  $node['tags']['brand'] ?? null,
                    'housenumber' => $node['tags']['addr:housenumber'] ?? null,
                    'street' => $node['tags']['addr:street'] ?? null,
                    'postcode' => $node['tags']['addr:postcode'] ?? null,
                    'city' => $node['tags']['addr:city'] ?? null,
                    'country' => $node['tags']['addr:country'] ?? null,
                    'type' => $node['tags']['tourism'] ?? null,
                    'website' => $node['tags']['website'] ?? $node['tags']['contact:website'] ?? null,
                    'phone' => $node['tags']['phone'] ?? null
                ] : null;
            };

            $hotels = array_values(array_filter(array_map('normalizeNode', $hotelsData)));
            $museums = array_values(array_filter(array_map('normalizeNode', $museumsData)));

            http_response_code(200);
            echo json_encode(['data' => ['hotels' => $hotels, 'museums' => $museums]]);
            exit;
    }