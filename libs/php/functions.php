<?php

    function fetchApiCall ($url, $name, $xml = false) {
        $ch = null;

        try {
            $ch = curl_init();

            if (!$ch) throw new Exception("Error initializing curl session");

            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, $url);

            $response = curl_exec($ch);
            
            if (!$response) throw new Error("Problem retrieving data: " . curl_error($ch));

            $decodedResponse = null;

            if ($xml && $xmlObject = simplexml_load_string($response)) {
                $decodedResponse = json_decode(json_encode($xmlObject), true);
            } else {
                if ($xml && !$xmlObject) throw new Exception("Error parsing XML");

                $decodedResponse = json_decode($response, true);

                if (!isset($decodedResponse) || json_last_error() !== JSON_ERROR_NONE) {
                    throw new Exception("Problem decoding JSON " . json_last_error_msg());
                }
            }

            return $decodedResponse;
        } catch (Exception $e) {
            return ["error" => $e->getMessage(), "details" => "Error making request to $name API"];
        } finally {
            if ($ch !== null) curl_close($ch);
        }
    }
