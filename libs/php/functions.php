<?php

    function decodeResponse ($response, $dataType = 'json') {
        if ($dataType === "xml") {
            $xmlObject = simplexml_load_string($response);
            
            if (!$xmlObject)   return ["error" => "Problem decoding xml", "details" => "Problem retrieving response"];

            return json_decode(json_encode($xmlObject), true);
        } else {
            $decodedResponse = json_decode($response, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return ["error" => "Problem decoding JSON " . json_last_error_msg(), "details" => "Problem retrieving response"];
            }

            return $decodedResponse;
        } 
    }

    function fetchApiCall ($url, $endOnError) {
        $ch = null;

        try {
            $ch = curl_init();

            if (!$ch) throw new Exception("Error initializing curl session");

            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            $response = curl_exec($ch);
            
            if ($response === false) throw new Error("Problem retrieving data: " . curl_error($ch));

            return $response;
        } catch (Exception $e) {
            $parsedUrl = parse_url($url);
            $errorResponse = ["error" => $e->getMessage(), "details" => "Error making request to {$parsedUrl['host']} API"];

            if ($endOnError) {
                http_response_code(500);
                echo json_encode($errorResponse);
                exit;
            }

            return $errorResponse;
        } finally {
            if ($ch !== null) curl_close($ch);
        }
    }

    function parsePathAndQueryString ($parsedUrl, $queries = true) {
        $path = explode("/", trim($parsedUrl["path"], "/"));
        $queriesFormatted = $queries ? [] : null;
    
        if (!isset($path) || empty($path)) {
            http_response_code(400);
            echo json_encode(["details" => "Invalid path added to url"]);
            exit;
        }
        
        if ($queries) {
         $queryStringArray = explode("&", $parsedUrl["query"]);

            if (count($queryStringArray) ) {
                foreach ($queryStringArray as $queryString) {
                    $newQueryString = explode("=", $queryString);
        
                    $emptyKeyOrValue = empty($newQueryString[0]) || empty($newQueryString[1]);
        
                    if ($emptyKeyOrValue || count($newQueryString) !== 2) {
                        http_response_code(400);
                        echo json_encode(["details" => "Query string param was empty or formatted incorrectly"]);
                        exit;
                    }
        
                    $queriesFormatted[trim($newQueryString[0])] = trim($newQueryString[1]);
                }
            }
        }

        return [$path, $queriesFormatted];
    }


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

    function normalizeNode ($node, $queryKey)  {
        $name = $node['tags']['name'] ?? $node['tags']['not:name'] ?? $node['tags']['old_name'] ??  $node['tags']['brand'] ?? null;

        if (!$name || !isset($node['tags'][$queryKey])) {
            return null;
        }

        return [
            'lat' => $node['lat'],
            'lon' => $node['lon'],
            'name' => $node['tags']['name'] ?? $node['tags']['not:name'] ?? $node['tags']['old_name'] ??  $node['tags']['brand'] ?? null,
            'housenumber' => $node['tags']['addr:housenumber'] ?? null,
            'street' => $node['tags']['addr:street'] ?? null,
            'postcode' => $node['tags']['addr:postcode'] ?? null,
            'city' => $node['tags']['addr:city'] ?? null,
            'country' => $node['tags']['addr:country'] ?? null,
            'type' => $node['tags'][$queryKey] ?? null,
            'website' => $node['tags']['website'] ?? $node['tags']['contact:website'] ?? null,
            'phone' => $node['tags']['phone'] ?? null
         ];
    };

    function findNearbyNodesAndNormalize ($nodes, $centerLat, $centerLng, $queryKey, $maxNodes = 30) {
        $targetDistance = 10;
        $targetCount = 20;
        $maxCount = $maxNodes;
        $filteredNodes = [];

        while (true) {
            $filteredNodes = array_filter($nodes, function ($node) 
            use ($centerLat, $centerLng, $targetDistance) {
                $totalDistance = calculateDistance($centerLat, $centerLng, $node['lat'], $node['lon']);
                return $totalDistance <= $targetDistance;
            });

            $filteredNodes = array_map(function ($node) use ($queryKey) {
                return normalizeNode($node, $queryKey);
            }, $filteredNodes);

            if (count($filteredNodes) < $targetCount) {
                $targetDistance += 5;
                continue;
            }

            $filteredNodes = array_values(array_filter($filteredNodes));

            usort($filteredNodes, function($a, $b) use ($centerLat, $centerLng) {
                $distanceA = calculateDistance($centerLat, $centerLng, $a['lat'], $a['lon']);
                $distanceB = calculateDistance($centerLat, $centerLng, $b['lat'], $b['lon']);
                return $distanceA <=> $distanceB; 
            });

            if (count($filteredNodes) > $maxCount) {
                $filteredNodes = array_slice($filteredNodes, 0, $maxCount);
                break;
            } 

            if ($targetDistance === 100) {
                break;
            }
        }

        return $filteredNodes;
    }