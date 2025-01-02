<?php
    header('Content-Type: application/json');

    require_once './error_handle.php';
    require_once './functions.php';


    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);

    if ($path[1] === "countries") { 
        $countryISO = $queriesFormatted["country"];

        $countriesArray = json_decode(file_get_contents("./country_borders.geo.json"), true)["features"];

        if ($countriesArray === null || json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(500);
            echo json_encode(['details' => "Error retrieving data from server"]);
            exit;
        }
    
        if ($countryISO !== "all") {            
            $geonamesUrl = "https://secure.geonames.org/countryInfo?country=$countryISO&username={$_ENV['GEO_USERNAME']}";
            $restCountriesUrl = "https://restcountries.com/v3.1/alpha?codes=$countryISO";

            $geonamesResponse = fetchApiCall($geonamesUrl, false);
            $restCountriesResponse = fetchApiCall($restCountriesUrl, false);

            $decodedGeonamesResponse = decodeResponse($geonamesResponse, 'xml');
            $decodedRestResponse = decodeResponse($restCountriesResponse);

            http_response_code(200);
            echo json_encode(["data" => [["restCountries" => $decodedRestResponse], ["geonames" => $decodedGeonamesResponse]]]);
            exit;
        }       
        
        http_response_code(200);
        echo json_encode(["data" => $countriesArray]);
    }

