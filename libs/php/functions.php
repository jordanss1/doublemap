<?php

    function stmtErrorCheck ($stmt, $db, $endOnError = true) {
        if (!$stmt) {
            if (!$endOnError) return false;

            http_response_code(500);
            echo json_encode(["error" => $db->errorInfo(), "details" => "Could not execute SQL statement"]);
            exit;
        }
    }

    function decodeResponse ($response, $dataType = 'json') {
        if ($dataType === "xml") {
            $xmlObject = simplexml_load_string($response);
            
            if (!$xmlObject)   return ["error" => "Problem decoding xml", "details" => "Problem retrieving this info"];

            return json_decode(json_encode($xmlObject), true);
        } else {
            $decodedResponse = json_decode($response, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return ["error" => "Problem decoding JSON " . json_last_error_msg(), "details" => "Problem retrieving this info"];
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
            
            if ($response === false) throw new Error("Problem retrieving data: " . curl_error($ch) . "url: $url");

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

    function normalizeNode ($node, $queryKey, $category, $index)  {
        $name = $node['tags']['name'] ?? $node['tags']['official_name'] ?? $node['tags']['not:name'] ?? $node['tags']['old_name'] ??  $node['tags']['brand'] ?? null;

        if (!$name || !isset($node['tags'][$queryKey])) {
            return null;
        }

        $houseNumber = $node['tags']['addr:housenumber'] ?? '';
        $street = $node['tags']['addr:street'] ?? '';

        $address_parts = array_filter([
            trim("$houseNumber $street"),
            $node['tags']['addr:city'] ?? null,
            $node['tags']['addr:postcode'] ?? null,
        ]);
        
        $place_formatted = implode(', ', $address_parts);
        $place_formatted = $place_formatted ? trim($place_formatted) : null;

        $latitude_offset = 0.109793;
        $longitude_offset = 0.133655;
    
        $minLatitude = $node['lat'] - $latitude_offset;
        $maxLatitude = $node['lat'] + $latitude_offset;
        $minLongitude = $node['lon'] - $longitude_offset;
        $maxLongitude = $node['lon'] + $longitude_offset;
    
        $bbox = [$minLongitude, $minLatitude, $maxLongitude, $maxLatitude];

        return [
            'type' =>	"Feature",
            'geometry' => [ 'type' => "Point", 'coordinates' => [$node['lon'], $node['lat']] ],
            'properties' => [ 
                'name' => $name,
                'name_preferred' =>	$node['tags']['official_name'] ?? $node['tags']['name'] ?? $node['tags']['not:name'] ?? $node['tags']['old_name'] ??  $node['tags']['brand'] ?? null,
                'feature_type' => "place",
                'canonical_id' => $category,
                'place_formatted'=>	$place_formatted,
                'coordinates' => [ 'latitude' => $node['lat'], 'longitude' => $node['lon'] ],
                'bbox' => $bbox,
                'language'=> "need_request_lang",
                'maki'=> "marker",
                'index' => $index
                 ],
        ];

    };

    function findNearbyNodesAndNormalize ($nodes, $queryKey, $category, $maxCount) {
        $filteredNodes = [];

        $index = 0;

        $filteredNodes = array_map(function ($node) use ($queryKey, $category, &$index) {
            $normalizedNode = normalizeNode($node, $queryKey, $category, $index);
            $index++;
            return $normalizedNode;
        }, $nodes);

        $filteredNodes = array_values(array_filter($filteredNodes));

        if (count($filteredNodes) > $maxCount) {
            $filteredNodes = array_slice($filteredNodes, 0, $maxCount);
        }

        return $filteredNodes;
    }

    function sanitizeJsonResponse(string $response): string {
        $response = trim($response);
        
        if ($response[0] !== '[') {
            $response = '[' . $response;
        }
        if (substr($response, -1) !== ']') {
            $response .= ']';
        }
        
        $response = preg_replace('/}\]\[{\s*/', '},{', $response);
        
        $response = str_replace("'", '"', $response);
        
        $response = preg_replace('/,\s*([\]}])/m', '$1', $response);
        
        $response = preg_replace('/([{,])(\s*)(\w+):/', '$1"$3":', $response);
        
        return $response;
    }

    function requestCoordsFromGPT ($prompt) {
        $data = [
            'model' => 'gpt-3.5-turbo',
            'messages' => [
                ['role' => 'developer', 'content' => 'You are a helpful assistant who provides coordinates.'],
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.2,
        ];

        $ch = curl_init('https://api.openai.com/v1/chat/completions');

        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $_ENV['OPEN_AI_KEY'],
            'Content-Type: application/json',
        ]);
        
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

        $response = curl_exec($ch);

        if (curl_errno($ch)) {
            $error = curl_error($ch);
            curl_close($ch);
            return ['error' => $error];
        }

        curl_close($ch);

        $response = decodeResponse($response);

        return decodeResponse(sanitizeJsonResponse($response['choices'][0]['message']['content']));
    }

    function requestCoordsWithEvents ($events) {
        $eventBatches = array_chunk($events, 5);

        $completedEvents = [];
        $failedEvents = [];

        foreach ($eventBatches as $eventBatch) {
            $prompt = "Provide latitude and longitude as a guess if exact values are not known. Respond in JSON format as a flat array: [{'lat': 'value', 'long': 'value'}].";

            foreach ($eventBatch as $event) {
                $prompt .= " - Event: {$event['title']}, Year: {$event['event_year']}\n ";
            }

            $arrayOfCoords = requestCoordsFromGPT($prompt);

            if (isset($arrayOfCoords['error'])) {
                $completedEvents = array_merge($completedEvents, $eventBatch);
                continue;
            }

            foreach ($eventBatch as $index => $event) {
                if (!isset($arrayOfCoords[$index])  || 
                !is_numeric($arrayOfCoords[$index]['lat']) || 
                !is_numeric($arrayOfCoords[$index]['long'])) {
                    $failedEvents[] = $event;
                    continue;
                }

                $event['latitude'] = (float)$arrayOfCoords[$index]['lat'];
                $event['longitude'] = (float)$arrayOfCoords[$index]['long'];

                $completedEvents[] = $event;
            }

    }

    return [$completedEvents,  $failedEvents];
}
