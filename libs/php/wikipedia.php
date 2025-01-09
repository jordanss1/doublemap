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

        $results = updateAndRetrieveEventsFromDB((int)$day, (int)$month);

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


        $eventsFormatted = array_map(function ($event) use ($month, $day) {
            $eventDate = sprintf('%04d-%02d-%02d', $event['year'], $month, $day);
            $thumbnail = $event['pages'][0]['thumbnail']['source'] ?? null;
            $thumbnailWidth = $event['pages'][0]['thumbnail']['width'] ?? null;
            $thumbnailHeight = $event['pages'][0]['thumbnail']['height'] ?? null;
            
            return [
                'title' => $event['text'], 
                'event_date' => $eventDate, 
                'event_day' => (int)$day, 
                'event_month' => (int)$month, 
                'event_year' => (int)$event['year'], 
                'latitude' => null, 
                'longitude' => null, 
                'thumbnail' => $thumbnail, 
                'thumbnail_width' => $thumbnailWidth, 
                'thumbnail_height' => $thumbnailHeight
            ];
        }, $wikipediaResponse['events']);

        $events = [];

        foreach (array_chunk($eventsFormatted, 40) as $eventBatches) {
            $returnedEvents = addEventsToDB($eventBatches);

            array_merge($events, $returnedEvents);
        }

        http_response_code(200);
        echo json_encode(['data' => $events, 'initial' => true]);
        exit;
    }

    

    