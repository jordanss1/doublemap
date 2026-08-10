<?php
    header('Content-Type: application/json');

    require_once './functions.php';


    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);

    if ($path[1] === "countries") { 
        $countryISO = $queriesFormatted["country"];
    
        if ($countryISO !== "all") {     
            $restISO = strtolower($countryISO);
            
            $geonamesUrl = "https://secure.geonames.org/countryInfo?country=$countryISO&username={$_ENV['GEO_USERNAME']}";
            $restCountriesUrl = "https://api.restcountries.com/countries/v5/codes.alpha_2/$restISO?pretty=1";

            $geonamesResponse = fetchApiCall($geonamesUrl, false);
            $restCountriesResponse = fetchApiCall($restCountriesUrl, false, false, 
            ["Authorization: Bearer {$_ENV['REST_COUNTRY_KEY']}"]);


            $decodedGeonamesResponse = decodeResponse($geonamesResponse, 'xml');
            $decodedRestResponse = decodeResponse($restCountriesResponse);

            if (!isset($decodedGeonamesResponse['error'])) {
                $decodedGeonamesResponse['country']['apiName'] = 'geonames';
            }
            if (!isset($decodedRestResponse['error'])) {
                $decodedRestResponse['data']['objects'][0]['apiName'] = 'rest-countries';
            }

            http_response_code(200);
            echo json_encode(["data" => [$decodedRestResponse['data']['objects'][0], $decodedGeonamesResponse['country']]]);
            exit;
        }  
        
        $countriesArray = json_decode(file_get_contents("./country_borders.geo.json"), true)["features"];

        if ($countriesArray === null || json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(500);
            echo json_encode(['error' => "Error retrieving countries from server", 'details' => 'Issue retrieving all countries']);
            exit;
        }
        
        http_response_code(200);
        echo json_encode(["data" => $countriesArray]);
    }

