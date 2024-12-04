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
        $date->modify('+30 seconds');
        $formattedDate = $date->format('Y-m-d\TH:i:s.000\Z');

        $request_body = ["expires" => $formattedDate, "scopes" => ["fonts:read"]];

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

        if (curl_errno($ch)) {
            http_response_code(500);
            echo json_encode(["error" => "Error retrieving token", "Error retrieving token due to {curl_error($ch)}"]);
            exit;
        }

        $decodedResponse = decodeResponse($response);

        if (isset($decodedResponse['error'])) {
            http_response_code(500);
            echo json_encode($decodedResponse);
            exit;
        }

        http_response_code(200);
        echo json_encode(['data' => $decodedResponse]);
    }