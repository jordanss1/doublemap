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
            curl_setopt($ch, CURLOPT_TIMEOUT, 20);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

            
            if ($response === false) throw new Error("Problem retrieving data: " . curl_error($ch));
    
            if ($httpCode !== 200) {
                throw new Exception("Mapbox API error (HTTP $httpCode): $response");
            }

            return $response;
        } catch (Exception $e) {
            $parsedUrl = parse_url($url);
            $errorResponse = ["error" => $e->getMessage(), "details" => "Error making request to {$parsedUrl['host']} API"];

            if ($endOnError) {
                http_response_code(500);
                echo json_encode([$errorResponse, $url]);
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

    function normalizeNode ($node, $queryKey, $category)  {
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
                'place_formatted' =>	$place_formatted,
                'email' => $node['tags']['email'] ?? null,
                'rating' => $node['tags']['fhrs:rating'] ?? null,
                'opening_hours' => $node['tags']['opening_hours'] ?? null,
                'phone' => $node['tags']['phone'] ?? null,
                'website' => $node['tags']['website'] ?? null,
                'coordinates' => [ 'latitude' => $node['lat'], 'longitude' => $node['lon'] ],
                'bbox' => $bbox,
                'language'=> "need_request_lang",
                'maki'=> "marker",
                'id' => bin2hex(random_bytes(8))
                 ],
        ];

    };

    function findNearbyNodesAndNormalize ($nodes, $queryKey, $category, $maxCount) {
        $filteredNodes = [];

        $filteredNodes = array_map(function ($node) use ($queryKey, $category, ) {
            $normalizedNode = normalizeNode($node, $queryKey, $category);
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
            'model' => 'gpt-4-turbo',
            'messages' => [
                ['role' => 'developer', 'content' => 'You are an expert geographer who provides the most accurate latitude and longitude coordinates for historical events. Think before answering.'],
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.2,
            'stream' => true, 

        ];

        $ch = curl_init('https://api.openai.com/v1/chat/completions');

        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $_ENV['OPEN_AI_KEY'],
            'Content-Type: application/json',
        ]);
        
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

        $fullResponse = ''; 

        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $chunk) use (&$fullResponse) {
            $fullResponse .= $chunk; 
            return strlen($chunk); 
        });

        curl_exec($ch);

        if (curl_errno($ch)) {
            $error = curl_error($ch);
            curl_close($ch);
            return ['error' => $error];
        }

        curl_close($ch);

        $lines = explode("\n", $fullResponse);
        $extractedContent = [];

        foreach ($lines as $line) {
            if (preg_match('/^data: (\{.*\})$/', $line, $matches)) {
                $jsonStr = $matches[1];
                $jsonData = json_decode($jsonStr, true);
                
                if ($jsonData && isset($jsonData['choices'][0]['delta']['content'])) {
                    $content = $jsonData['choices'][0]['delta']['content'];
                    $extractedContent[] = $content;
                }
            }
        }

        $fullResponse = implode("", $extractedContent);

        return decodeResponse(sanitizeJsonResponse($fullResponse));
    }

    global $wikipedia_db;


    function updateEventsInDB ($failedEvents, $completedEvents) {
        global $wikipedia_db;

        if (count($failedEvents)) {
            $query = "UPDATE events 
                        SET gpt_retries = CASE 
                            WHEN gpt_retries IS NULL THEN 1
                            ELSE gpt_retries + 1
                        END
                        WHERE title = :title AND event_year = :event_year";
            
            $stmt = $wikipedia_db->prepare($query);

            stmtErrorCheck($stmt, $wikipedia_db, true);

            foreach ($failedEvents as $event) {
                $params = [
                    ':title' => $event['title'],
                    ':event_year' => $event['event_year'],
                ];

                try {
                    $stmt->execute($params);
                } catch (PDOException $e) {
                    retryFailedDBExecution($stmt, $params);
                }
            }
        }

        if (count($completedEvents)) {
            $query = "UPDATE events SET latitude = :latitude, longitude = :longitude WHERE title = :title AND event_date = :event_date";

            $stmt = $wikipedia_db->prepare($query);

            stmtErrorCheck($stmt, $wikipedia_db, true);

            foreach ($completedEvents as $event) {
                if (isset($event['latitude']) && isset($event['longitude'])) {
                    $params = [
                        ':latitude' => $event['latitude'],
                        ':longitude' => $event['longitude'],
                        ':title' => $event['title'],
                        ':event_date' => $event['event_date'],
                    ];
                    try {
                        $stmt->execute($params);
                    } catch (PDOException $e) {
                        retryFailedDBExecution($stmt, $params);
                    }
                }
            }
        }
    }

    function requestCoordsWithEvents ($events) {
        $eventBatches = array_chunk($events, 5);

        $completedEvents = [];
        $failedEvents = [];

        foreach ($eventBatches as $eventBatch) {
            $completedEvents = [];
            $failedEvents = [];

            $prompt = "Identify the geographical location where the event took place and provide only latitude and longitude. If the exact location is unknown, provide lat/long of the country.  Respond in **JSON format as a flat array**, with only `lat` and `long` keys, like this:  [{'lat': 'value', 'long': 'value'}]. Strictly **do not** include location names, comments, or any extra text.";


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

            updateEventsInDB($failedEvents, $completedEvents);
    }
}
