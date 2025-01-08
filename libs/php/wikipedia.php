<?php

    header('Content-Type: application/json');
    require_once __DIR__ . '/functions.php';
    require_once __DIR__ . '/error_handle.php';
    require_once __DIR__ . '/model/wikipedia_db.php';

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    if (!$parsedUrl) {
        http_response_code(401);
        echo json_encode(['data' => ['error' => 'Malformed url', 'details' => 'Please correct URL format']]);
        exit;
    }

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);

    if ($path[2] === 'country_history') {

    }

    if ($path[2] === 'events') {
        $day = $queriesFormatted['day'];
        $month = $queriesFormatted['month'];

        $invalidDayOrMonth = (!is_numeric($day) || $day < 1 || $day > 31) || 
        (!is_numeric($month) || $month < 1 || $month > 12);

        if ($invalidDayOrMonth) {
            http_response_code(401);
            echo json_encode(['error' => 'Incorrect query types', 'details' => 'Month and day are not valid number for month or day']);
            exit;
        }

        $results = retrieveDateEventsFromDB($day, $month);

        if (count($results)) {
            http_response_code(200);
            echo json_encode(['data' => $results]);
            exit;
        }

        $url = "https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/$month/$day";

        $wikipediaResponse = fetchApiCall($url, true);

        $wikipediaResponse = decodeResponse($wikipediaResponse);

        if (isset($wikipediaResponse['error'])) {
            http_response_code(500);
            echo json_encode($wikipediaResponse);
            exit;
        }

        $eventBatches = array_chunk($wikipediaResponse['events'], 5);

        $eventsWithCoords = [];

        foreach ($eventBatches as $eventBatch) {
            $prompt = "Provide latitude and longitude in the same order as events, if you don't know the exact, ALWAYS provide rough lat and long. Response in JSON, no nested arrays, only wrapped in array (no newline characters): [{'lat': 'value', 'long': 'value'} ...]";

            foreach ($eventBatch as $event) {
                $prompt .= " - Event: {$event['text']}, Year: {$event['year']}\n ";
            }

            $data = [
                'model' => 'gpt-3.5-turbo',
                'messages' => [
                    ['role' => 'developer', 'content' => 'You are a helpful assistant who provides coordinates.'],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'temperature' => 0.2,
            ];

            $ch = curl_init('https://api.openai.com/v1/chat/completions');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $_ENV['OPEN_AI_KEY'],
                'Content-Type: application/json',
            ]);
            
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

            $response = curl_exec($ch);

            curl_close($ch);

            $response = decodeResponse($response);

            $coordArray = decodeResponse(sanitizeJsonResponse($response['choices'][0]['message']['content']));

            $eventsWithCoords = array_merge($eventsWithCoords, $coordArray);

            $index = 0;

            foreach ($eventBatch as $event) {
                $eventDate = sprintf('%04d-%02d-%02d', $event['year'], $month, $day);
                $thumbnail = $event['pages'][0]['thumbnail']['source'] ?? null;
                $thumbnailWidth = $event['pages'][0]['thumbnail']['width'] ?? null;
                $thumbnailHeight = $event['pages'][0]['thumbnail']['height'] ?? null;

                $eventsWithCoords[] = ['title' => $event['text'], 'eventDate' => $eventDate, 'eventDay' => $day, 'eventMonth' => (int)$month, 'eventYear' => (int)$event['year'], 'latitude' => (float)$coordArray[$index]['lat'], 'longitude' => (float)$coordArray[$index]['long'], 'thumbnail' => $thumbnail, 'thumbnailWidth' => $thumbnailWidth, 'thumbnailHeight' => $thumbnailHeight];

                $index++;
            }
        }

        // $eventsWithCoordsBatches = array_chunk($eventsWithCoords, 40);

        // foreach ($eventsWithCoordsBatches as $eventBatches) {
        //     addEventsToDB($eventBatches);
        // }

        

        http_response_code(200);
        echo json_encode($eventsWithCoords);
        exit;
    }

    