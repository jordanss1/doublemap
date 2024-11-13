<?php
    header('Content-Type: application/json');

    require_once "functions.php";
    require_once './origin_check.php';


    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    [$path] = parsePathAndQueryString($parsedUrl, false);

    if ($path === "ipinfo") {
        $url = "https://ipinfo.io/json?token={$_ENV['IPINFO_TOKEN']}";
        $response = fetchApiCall($url, true);
        $decodedResponse = decodeResponse($response);

        http_response_code(200);
        echo json_encode(["data" => $response]);
    }