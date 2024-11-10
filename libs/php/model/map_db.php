<?php
        header('Content-Type: application/json');
        require "./database.php";
        require "../functions.php";
        $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

        [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);

        global $db;
        $service = $queriesFormatted["service"];
        $api = $queriesFormatted["api"];

        if ($service === "mapbox") {
                $query = "SELECT * FROM request_counts";

                $stmt = $db->prepare($query);
        
                if (!$stmt) {
                    http_response_code(500);
                    echo json_encode(["error" => "Invalid SQL statement", "details" => "Could not prepare SQL statement"]);
                    exit;
                }
        
                $stmt->execute();
        
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (!$results) {
                    http_response_code(500);
                    echo json_encode(["error" => "", "SQL has failed request" => "Error fetching map request details"]);
                    exit;
                }
        
                echo json_encode($results);
            }
        
        
      
    