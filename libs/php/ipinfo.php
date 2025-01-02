<?php
    header('Content-Type: application/json');

    require_once "functions.php";
    require_once './error_handle.php';


    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    [$path] = parsePathAndQueryString($parsedUrl, false);

    if ($path[1] === "ipinfo") {
        $url = "https://ipinfo.io/json?token={$_ENV['IPINFO_TOKEN']}";
        $response = fetchApiCall($url, true);
        $decodedResponse = decodeResponse($response);
        
        if (isset($decodedResponse['error'])) {
            http_response_code(500);
            echo json_encode(["data" => $decodedResponse]);
        }

        http_response_code(200);
        echo json_encode(["data" => $decodedResponse]);
    }