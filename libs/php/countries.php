<?php


    ini_set("display_errors", true);
    header('Content-Type: application/json');
    error_reporting(E_ALL);

    require 'vendor/autoload.php';
    require_once 'errorHandle.php';
    require_once 'functions.php';

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    $path = explode("/", trim($parsedUrl["path"], "/"))[1];
    $queryStringArray = explode("&", $parsedUrl["query"]);
    $queriesFormatted = [];

    if (!isset($path) || empty($path)) {
        http_response_code(400);
        echo json_encode(["details" => "Invalid path added to url"]);
        exit;
    }

    if (count($queryStringArray)) {
        foreach ($queryStringArray as $queryString) {
            $newQueryString = explode("=", $queryString);

            $emptyKeyOrValue = empty($newQueryString[0]) || empty($newQueryString[1]);

            if ($emptyKeyOrValue || count($newQueryString) !== 2) {
                http_response_code(400);
                echo json_encode(["details" => "Query string param was empty or formatted incorrectly"]);
                exit;
            }

            $queriesFormatted[trim($newQueryString[0])] = trim($newQueryString[1]);
        }
    }

    if ($path) {
        $countryISO = $queriesFormatted["country"];

        $countriesArray = json_decode(file_get_contents("./countryBorders.geo.json"), true)["features"];

        if ($countriesArray === null || json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(500);
            echo json_encode(['details' => "Error retrieving data from server"]);
            exit;
        }

        $countryResponse;
    
        if ($countryISO !== "all") {
           $countryResponse = array_filter($countriesArray, function ($countryItem) {
            global $countryISO;

            return $countryItem["properties"]["iso_a2"] === $countryISO;
            });

            if (isset($countryResponse[0])) {
                http_response_code(400);
                echo json_encode(["details" => "Country was not found with this ISO code"]);
                exit;
            }

            $ch = curl_init();
            $geonamesUrl = "https://secure.geonames.org/countryInfo?country=$countryISO&username={$_ENV['USERNAME']}";
            $restCountriesUrl = "https://restcountries.com/v3.1/alpha?codes=$countryISO";

            $geonamesResponse = fetchApiCall($geonamesUrl, 'Geonames', true);
            $restCountriesResponse = fetchApiCall($restCountriesUrl, 'Rest Countries');

            http_response_code(200);
            echo json_encode(["data" => ["propertiesAndPolygons" => $countryResponse], ["rest countries" => $restCountriesResponse], ["geonames" => $geonamesResponse]]);
            exit;
        }       

        $countryNamesAndISOs = array_map(function ($country) {
            return $country["properties"];
        }, $countriesArray);
        
        http_response_code(200);
        echo json_encode(["data" => $countryNamesAndISOs]);
    }

