<?php
    header('Content-Type: application/json');
    require_once __DIR__ . "/database.php";
    require_once __DIR__ . "/../functions.php";

    global $map_db;


    function incrementRequestCount ($api_name) {
        global $map_db;

        $query = "UPDATE request_counts SET requests = requests + 1 WHERE api_name = :api_name";

        $stmt = $map_db->prepare($query);

        stmtErrorCheck($stmt, $map_db);

        $stmt->bindParam(':api_name', $api_name, PDO::PARAM_STR);

        stmtErrorCheck($stmt->execute(), $map_db);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(["error" => "", "details" => "API request count was not updated"]);
            exit;
        }

        return true;
    }

    function requestLimitsAndShield ($request_object) {
        ["api_name" => $api_name, "requests" => $requests] = $request_object;

        $limit = null;
        
        switch ($api_name) {
            case "mapboxgljs":
                $limit = 46000;
                $rejectRequest = $requests >= $limit - 1;  


                if ($rejectRequest) {
                    http_response_code(429);
                    echo json_encode(['error' => 'Request limit for mapbox gl reached', 'details' => 'Request limit reached map will not render']);
                    exit;
                }


                break;
            case "search":
                $limit = 46000;
                $rejectRequest = $requests >= $limit - 1;  


                if ($rejectRequest) {
                    http_response_code(429);
                    echo json_encode(['error' => 'Request limit for searching reached', 'details' => 'Search request limit reached: wait until end of month']);
                    exit;
                }


                break;
            default: 
                http_response_code(429);
                echo json_encode(['error' => 'Api name could not be found', 'details' => 'Api name not found']);
                exit;            
        }
    }

    function checkRequestCount ($api_name) {
        global $map_db;

        $query = "SELECT * FROM request_counts WHERE api_name = :api_name";

        $stmt = $map_db->prepare($query);

        $stmt->bindParam(':api_name', $api_name, PDO::PARAM_STR);

        stmtErrorCheck($stmt->execute(), $map_db);

        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $try = 0;

        if ($results === false) {
            while ($try <= 5) {
                $error = stmtErrorCheck($stmt->execute(), $map_db, false);

                if ($error === false) {
                    $try++;
                    continue;
                }                    
                
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if ($results !== false) break;

                $try++;

                if ($try === 5) {
                    http_response_code(500);
                    echo json_encode(["error" => "SQL has failed request", "details" => "Error fetching map request details"]);
                    exit;
                }

                
                usleep(1000000);
            }
        }

        if (empty($results)) {
            http_response_code(404);
            echo json_encode(["error" => "", "Empty array from DB", "details" => "Cannot show  map until request count is known"]);
            exit;
        }

        requestLimitsAndShield($results[0]);
    }
            