<?php
    header('Content-Type: application/json');
    require_once __DIR__ . "/database.php";
    require_once __DIR__ . "/../functions.php";

    global $wikipedia_db;

    function retrieveDateEventsFromDB($day, $month) {
        global $wikipedia_db;

        $query = "SELECT * FROM events WHERE event_day = :event_day AND event_month = :event_month";

        $stmt = $wikipedia_db->prepare($query);

        stmtErrorCheck($stmt, $wikipedia_db, true);

        $stmt->bindParam(':event_day', $day, PDO::PARAM_INT);
        $stmt->bindParam(':event_month', $month, PDO::PARAM_INT);

        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($results === false){
            $error = $stmt->errorInfo();

            http_response_code(500);
            echo json_encode(["error" => "SQL has failed fetching wikipedia events: $error[2]", "details" => "Problem retrieving events try again"]);
            exit;
        }

        return $results;
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
            $values[":event_date{$index}"] = $event['eventDate'];
            $values[":event_day{$index}"] = $event['eventDay'];
            $values[":event_month{$index}"] = $event['eventMonth'];
            $values[":event_year{$index}"] = $event['eventYear'];
            $values[":latitude{$index}"] = $event['latitude'];
            $values[":longitude{$index}"] = $event['longitude'];
            $values[":thumbnail{$index}"] = $event['thumbnail'];
            $values[":thumbnail_width{$index}"] = $event['thumbnailWidth'];
            $values[":thumbnail_height{$index}"] = $event['thumbnailHeight'];
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