<?php
    header('Content-Type: application/json');

    require_once 'errorHandle.php';
    require_once 'functions.php';

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);

    if ($path === "countries") { 
        $countryISO = $queriesFormatted["country"];

        $countriesArray = json_decode(file_get_contents("./countryBorders.geo.json"), true)["features"];

        if ($countriesArray === null || json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(500);
            echo json_encode(['details' => "Error retrieving data from server"]);
            exit;
        }

        $countryResponse;
    
        if ($countryISO !== "all") {
           $countryResponse = array_values(array_filter($countriesArray, function ($countryItem) {
                global $countryISO;

                return $countryItem["properties"]["iso_a2"] === $countryISO;
            }));

            if (!isset($countryResponse[0])) {
                http_response_code(400);
                echo json_encode(["details" => "Country was not found with this ISO code"]);
                exit;
            }

            $ch = curl_init();
            $geonamesUrl = "https://secure.geonames.org/countryInfo?country=$countryISO&username={$_ENV['USERNAME']}";
            $restCountriesUrl = "https://restcountries.com/v3.1/alpha?codes=$countryISO";

            $geonamesResponse = fetchApiCall($geonamesUrl, false, 'xml');
            $restCountriesResponse = fetchApiCall($restCountriesUrl, false);

            http_response_code(200);
            echo json_encode(["data" => [["propertiesAndPolygons" => $countryResponse[0]], ["rest countries" => $restCountriesResponse], ["geonames" => $geonamesResponse]]]);
            exit;
        }       


        
        http_response_code(200);
        echo json_encode(["data" => $countriesArray]);
    }

