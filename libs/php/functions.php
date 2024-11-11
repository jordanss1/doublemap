<?php

    function decodeResponse ($response, $dataType = 'json') {
        if ($dataType === "xml") {
            $xmlObject = simplexml_load_string($response);
            
            if (!$xmlObject) throw new Exception("Error parsing XML");

            return json_decode(json_encode($xmlObject), true);
        } else {
            $decodedResponse = json_decode($response, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Problem decoding JSON " . json_last_error_msg());
            }

            return $decodedResponse;
        } 
    }

    function fetchApiCall ($url, $endOnError) {
        $ch = null;

        try {
            $ch = curl_init();

            if (!$ch) throw new Exception("Error initializing curl session");

            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            $response = curl_exec($ch);
            
            if (!$response) throw new Error("Problem retrieving data: " . curl_error($ch));

            return $response;
        } catch (Exception $e) {
            $parsedUrl = parse_url($url);
            $errorResponse = ["error" => $e->getMessage(), "details" => "Error making request to {$parsedUrl['host']} API"];

            if ($endOnError) {
                http_response_code(500);
                echo json_encode($errorResponse);
                exit;
            }

            return $errorResponse;
        } finally {
            if ($ch !== null) curl_close($ch);
        }
    }

    function parsePathAndQueryString ($parsedUrl, $queries = true) {
        $path = explode("/", trim($parsedUrl["path"], "/"))[1];
        $queriesFormatted = $queries ? [] : null;
    
        if (!isset($path) || empty($path)) {
            http_response_code(400);
            echo json_encode(["details" => "Invalid path added to url"]);
            exit;
        }
        
        if ($queries) {
         $queryStringArray = explode("&", $parsedUrl["query"]);

            if (count($queryStringArray) ) {
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
        }

        return [$path, $queriesFormatted];
    }
