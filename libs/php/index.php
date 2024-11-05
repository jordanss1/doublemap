<?php
    ini_set("display_errors", true);
    header('Content-Type: application/json');

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    $path = explode("/", trim($parsedUrl["path"], "/"))[1];
    $queriesArray = explode("&", $parsedUrl["query"]);
    $queriesFormatted = [];

    if (!isset($path) || empty($path)) {
        http_response_code(400);
        echo json_encode(["message" => "Invalid path added to url"]);
        exit;
    }

    if (count($queriesArray)) {
        foreach ($queriesArray as $query) {
            $newQuery = explode("=", $query);

            $emptyKeyOrValue = empty($newQuery[0]) || empty($newQuery[1]);

            if ($emptyKeyOrValue || count($newQuery) !== 2) {
                http_response_code(400);
                echo json_encode(["message" => "Query param was empty or formatted incorrectly"]);
                exit;
            }

            $queriesFormatted[trim($newQuery[0])] = trim($newQuery[1]);
        }
    }

    if ($path) {
        $countryChoice = $queriesFormatted["country"];

        $countriesArray = json_decode(file_get_contents("./countryBorders.geo.json"), true)["features"];

        if ($countriesArray === null && !JSON_ERROR_NONE) {
            http_response_code(500);
            echo json_encode(['message' => "Error retrieving data from server"]);
            exit;
        }

        $finalCountry;
    
        if ($countryChoice !== "all") {
           $finalCountry = array_filter($countriesArray, function ($countryItem) {
            global $countryChoice;

            $countryItem["properties"]["iso_a2"] === $countryChoice;
            });

            if (!$finalCountry[0]) {
                http_response_code(400);
                echo json_encode(["message" => "Country was not found with this ISO code"]);
                exit;
            }

            http_response_code(200);
            echo json_encode(["data" => $finalCountry]);
            exit;
        }       

        $countryNamesAndISOs = array_map(function ($country) {
            return $country["properties"];
        }, $countriesArray);
        
        http_response_code(200);
        echo json_encode(["data" => $countryNamesAndISOs]);
    }

