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

    function apiCallAttempts($url) {
        $retryLimit = 2;
        $attempt = 0;
        $response = null;

        do {
            $response = fetchApiCall($url, false);
            $attempt++;

            if (!isset($response['error'])) {
                return $response;
            }

            if ($attempt === $retryLimit) {
                http_response_code(500);
                echo json_encode($response);
                exit;
            }

            sleep(2);
        } while ($attempt < $retryLimit);
    }


    if ($path[2] === 'country_history') {
        $country = $queriesFormatted['country'];

        if (str_contains($country, "Congo")) {
            $country = "the_Republic_of_the_Congo";
        }

        $country = str_replace(" ", "_", $country);    

        if (str_contains($country, "United")) {
            $country = "the_$country";
        }

        $url1 = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=History_of_$country";    
        $url2 = "https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=History_of_$country";    
        
        
        $countryHistoryResponse = decodeResponse(apiCallAttempts($url1));

        $countryImageResponse = decodeResponse(apiCallAttempts($url2));
        
        if (isset($countryHistoryResponse['error'])) {
            http_response_code(500);
            echo json_encode($countryHistoryResponse);
            exit;
        }

        $firstPage = reset($countryHistoryResponse['query']['pages']);

        $cleanExtract = preg_replace('/\r\n|\r|\n/', ' ', $firstPage['extract']);

        $finalCountryHistory = [
            'title' => $firstPage['title'],
            'extract' => $cleanExtract,
            'image' => null,
        ];

        if (!isset($countryImageResponse['error'])) {
            $firstPage = reset($countryImageResponse['query']['pages']);

            $finalCountryHistory['image'] = $firstPage['original']['source'] ?? null;
            $finalCountryHistory['imageWidth'] = $firstPage['original']['width'] ?? null;
            $finalCountryHistory['imageHeight'] = $firstPage['original']['height'] ?? null;
        }

        http_response_code(200);
        echo json_encode(['data' => $finalCountryHistory]);
        exit;
    }

    if ($path[2] === 'events') {
        if (!isset($queriesFormatted['day']) || !isset($queriesFormatted['month']) || !isset($queriesFormatted['action'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Incorrect query types', 'details' => 'Must set day and month']);
            exit;
        }

        $day = $queriesFormatted['day'];
        $month = $queriesFormatted['month'];

        $invalidDayOrMonth = (!is_numeric($day) || $day < 1 || $day > 31) || 
        (!is_numeric($month) || $month < 1 || $month > 12);

        if ($invalidDayOrMonth) {
            http_response_code(401);
            echo json_encode(['error' => 'Incorrect query types', 'details' => 'Not valid numbers for month or day']);
            exit;
        }

        if ($queriesFormatted['action'] === 'update') {
            $results = fetchAndUpdateEventsFromDB((int)$day, (int)$month, 'update');

            http_response_code(200);
            echo json_encode($results);
            exit;
        }

        $url = "https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/$month/$day";

        $wikipediaEventsResponse = decodeResponse(apiCallAttempts($url));

        if (isset($wikipediaEventsResponse['error'])) {
            http_response_code(500);
            echo json_encode($wikipediaEventsResponse);
            exit;
        }

        $dbResults = fetchAndUpdateEventsFromDB((int)$day, (int)$month, 'fetch');

        if (count($dbResults)) {
            if (count($dbResults) === count($wikipediaEventsResponse['events'])) {
                $complete = true;

                foreach ($dbResults as $event) {
                    if ((!isset($event['gpt_retries']) || (is_numeric($event['gpt_retries']) && $event['gpt_retries'] < 10))
                    && $event['latitude'] === null 
                    && $event['longitude'] === null) {
                        $complete = false;
                        break;
                    }
                };

                http_response_code(200);
                echo json_encode(['complete' => $complete, 'data' => $dbResults]);
                exit;
            } else {
                $titlesInDB = array_column($dbResults, 'title');

                $wikipediaEventsResponse['events'] = array_filter($wikipediaEventsResponse['events'], function ($event) use ($titlesInDB) {
                    return !in_array($event['text'], $titlesInDB);
                });
            }
        }

        if (isset($wikipediaEventsResponse['error'])) {
            http_response_code(500);
            echo json_encode($wikipediaEventsResponse);
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
        }, $wikipediaEventsResponse['events']);

        foreach (array_chunk($eventsFormatted, 40) as $eventBatches) {
            addEventsToDB($eventBatches);
        }

        http_response_code(200);
        echo json_encode(['complete' => false, 'data' => $eventsFormatted]);
        exit;
    }

    

    