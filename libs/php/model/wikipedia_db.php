<?php
    header('Content-Type: application/json');
    require_once __DIR__ . "/database.php";
    require_once __DIR__ . "/../functions.php";

    global $wikipedia_db;

    function retryFailedDBExecution ($stmt, $params = null) {
        $maxRetries = 3;
        $attempts = 0;
        $success = false;
    
        while ($attempts < $maxRetries && !$success) {
            try {
                if ($params !== null) {
                    $stmt->execute($params); 
                } else {
                    $stmt->execute(); 
                }

                $success = true; 
            } catch (PDOException $e) {
                $attempts++;

                if ($attempts < $maxRetries) {
                    sleep(1); 
                } 
            }
        }
    }

    function selectEventsFromDB($day, $month) {
        global $wikipedia_db;

        $query = "SELECT 
                *, CAST(latitude AS DOUBLE) AS latitude, CAST(longitude AS DOUBLE) AS longitude 
                FROM events 
                WHERE event_day = :event_day AND event_month = :event_month";

        $stmt = $wikipedia_db->prepare($query);

        stmtErrorCheck($stmt, $wikipedia_db, true);

        $stmt->bindParam(':event_day', $day, PDO::PARAM_INT);
        $stmt->bindParam(':event_month', $month, PDO::PARAM_INT);

        try {
            $stmt->execute();
        } catch (PDOException $e) {
            retryFailedDBExecution($stmt);
        }

        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($results === false){
            $error = $stmt->errorInfo();

            http_response_code(500);
            echo json_encode(["error" => "SQL has failed fetching wikipedia events: $error[2]", "details" => "Problem retrieving events try again"]);
            exit;
        }

        return $results;
    }

    function fetchAndUpdateEventsFromDB($day, $month, $action) {
        global $wikipedia_db;

        $results = selectEventsFromDB($day, $month);

        if ($action === 'fetch') {
            return $results;
        }

        $eventsWithoutCoords = array_filter($results, function ($event) {
            return (!isset($event['gpt_retries']) || (is_numeric($event['gpt_retries']) && $event['gpt_retries'] < 10)) 
           && $event['latitude'] === null 
           && $event['longitude'] === null;
        });

        if (!count($eventsWithoutCoords)) {
            return ['complete' => true, 'data' => $results];
        } 

        [$completedEvents, $failedEvents] = requestCoordsWithEvents($eventsWithoutCoords);

        if (count($failedEvents)) {
            $query = "UPDATE events 
                        SET gpt_retries = CASE 
                            WHEN gpt_retries IS NULL THEN 1
                            ELSE gpt_retries + 1
                        END
                        WHERE title = :title AND event_year = :event_year";
            
            $stmt = $wikipedia_db->prepare($query);

            stmtErrorCheck($stmt, $wikipedia_db, true);

            foreach ($failedEvents as $event) {
                $params = [
                    ':title' => $event['title'],
                    ':event_year' => $event['event_year'],
                ];

                try {
                    $stmt->execute($params);
                } catch (PDOException $e) {
                    retryFailedDBExecution($stmt, $params);
                }
            }
        }

        if (count($completedEvents)) {
            $query = "UPDATE events SET latitude = :latitude, longitude = :longitude WHERE title = :title AND event_date = :event_date";

            $stmt = $wikipedia_db->prepare($query);

            stmtErrorCheck($stmt, $wikipedia_db, true);

            foreach ($completedEvents as $event) {
                if (isset($event['latitude']) && isset($event['longitude'])) {
                    $params = [
                        ':latitude' => $event['latitude'],
                        ':longitude' => $event['longitude'],
                        ':title' => $event['title'],
                        ':event_date' => $event['event_date'],
                    ];
                    try {
                        $stmt->execute($params);
                    } catch (PDOException $e) {
                        retryFailedDBExecution($stmt, $params);
                    }
                }
            }
        }

        $results = selectEventsFromDB($day, $month);

        $complete = true;

        foreach ($results as $event) {
            if ((!isset($event['gpt_retries']) || (is_numeric($event['gpt_retries']) && $event['gpt_retries'] < 10))
            && $event['latitude'] === null 
            && $event['longitude'] === null) {
                $complete = false;
                break;
            }
        };

        return ['complete' => $complete, 'data' => $results];
    }

        

     

    function addEventsToDB ($events) {
        global $wikipedia_db;

        $query = "INSERT INTO events (title, event_date, event_day, event_month, event_year, latitude, longitude, thumbnail, thumbnail_width, thumbnail_height) 
        VALUES ";

        $values = [];
        $placeholders = [];

        foreach ($events as $index => $event) {
            $placeholders[] = "(:title{$index}, :event_date{$index}, :event_day{$index}, :event_month{$index}, :event_year{$index}, :latitude{$index}, :longitude{$index}, :thumbnail{$index}, :thumbnail_width{$index}, :thumbnail_height{$index})";
            
            $values[":title{$index}"] = $event['title'];
            $values[":event_date{$index}"] = $event['event_date'];
            $values[":event_day{$index}"] = $event['event_day'];
            $values[":event_month{$index}"] = $event['event_month'];
            $values[":event_year{$index}"] = $event['event_year'];
            $values[":latitude{$index}"] = $event['latitude'];
            $values[":longitude{$index}"] = $event['longitude'];
            $values[":thumbnail{$index}"] = $event['thumbnail'];
            $values[":thumbnail_width{$index}"] = $event['thumbnail_width'];
            $values[":thumbnail_height{$index}"] = $event['thumbnail_height'];
        }

        $query .= implode(', ', $placeholders);

        $stmt = $wikipedia_db->prepare($query);

        stmtErrorCheck($stmt, $wikipedia_db, true);

        $result = $stmt->execute($values);

        if (!$result) {
            $error = $stmt->errorInfo();

            http_response_code(500);
            echo json_encode(["error" => "SQL has failed inserting wikipedia events: $error[2]", "details" => "Problem retrieving events try again"]);
            exit;
        }
    }