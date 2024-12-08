<?php
    header('Content-Type: application/json');

    require_once dirname(__DIR__) . '/functions.php';
    require_once dirname(__DIR__) . '/error_handle.php';
    require_once dirname(__DIR__) . '/model/map_db.php';
    require_once dirname(__DIR__) . '/origin_check.php';

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    if (!$parsedUrl) {
        http_response_code(401);
        echo ['data' => ['error' => 'Malformed url', 'details' => 'Please correct URL format']];
        exit;
    }

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl, false);

    if ($path[2] === 'token') {
        $url = "https://api.mapbox.com/tokens/v2/{$_ENV['MAPBOX_USERNAME']}?access_token={$_ENV['MAPBOX_TOKEN_PHP']}";
        $date = new DateTime('now', new DateTimeZone('UTC'));
        $date->modify('+60 seconds');
        $formattedDate = $date->format('Y-m-d\TH:i:s.000\Z');

        $request_body = ["expires" => $formattedDate, "scopes" => ["styles:read", "styles:tiles", "fonts:read"]];

        $ch = curl_init($url);

        if ($ch === false) {
            http_response_code(500);
            echo json_encode(["error" => "Error initializing curl session", "Error retrieving token due to server error"]);
            exit;
        }

        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($request_body));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: '. strlen(json_encode($request_body)),
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
     
        if ($response === false || curl_errno($ch)) {
            $try = 0;

            while ($try < 5) {
                $try++;
                $endOnError = $try === 5;

                $response = curl_exec($ch);

                if ($response !== false) break;

                if ($try === 5 && ($response === false || curl_errno($ch))) {
                    curl_close($ch);                    
                    http_response_code(500);
                    echo json_encode(['error' => 'Error retrieving map style', 'details' => 'Failed to retrieve the map style after multiple attempts']);
                    exit;
                }

                usleep(500000);
            }
        }

        $decodedResponse = decodeResponse($response);

        if (isset($decodedResponse['error'])) {
            curl_close($ch);                    
            http_response_code(500);
            echo json_encode($decodedResponse);
            exit;
        }

        curl_close($ch);                    
        http_response_code(200);
        echo json_encode(['data' => $decodedResponse]);
    }