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

        $results = retrieveEventsForDate($day, $month);

        if (count($results)) {
            http_response_code(200);
            echo json_encode(['data' => $results]);
            exit;
        }

        $url = "https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/$month/$day";

        $response = fetchApiCall($url, true);

        $decodedResponse = decodeResponse($response);

        if (isset($decodedResponse['error'])) {
            http_response_code(500);
            echo json_encode($decodedResponse);
            exit;
        }

        $eventBatches = array_chunk($decodedResponse['events'], 10);

        $result = [];


        foreach ($eventBatches as $eventBatch) {
            $prompt = "For each event, provide latitude/longitude in the same order as the events: ";

            foreach ($eventBatch as $event) {
                $prompt .= "Event: {$event['text']} Year: {$event['year']}; ";
            }

            $prompt .= "Response should be in this format: [{'event': 'Event name', 'lat': 'latitude', 'long': 'longitude'}, ...]";

            $data = [
                'model' => 'babbage-002',
                'prompt' => $prompt,
                'max_tokens' => 100, 
                'temperature' => 0.2,
            ];

            $ch = curl_init('https://api.openai.com/v1/completions');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $_ENV['OPEN_AI_KEY'],
                'Content-Type: application/json',
            ]);
            
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));


            $response = curl_exec($ch);

            $response = decodeResponse($response);

            $result = array_push($response);
        }
        

        http_response_code(200);
        echo json_encode(['data' => $result]);
        exit;
    }

    