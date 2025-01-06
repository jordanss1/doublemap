<?php
    header('Content-Type: application/json');
    require_once __DIR__ . "/database.php";
    require_once __DIR__ . "/../functions.php";

    global $wikipedia_db;

    function retrieveEventsForDate($day, $month) {
        global $wikipedia_db;

        $query = "SELECT * FROM events WHERE event_day = :event_day AND event_month = :event_month";

        $stmt = $wikipedia_db->prepare($query);

        stmtErrorCheck($stmt, $wikipedia_db, true);

        $stmt->bindParam(':event_day', $day, PDO::PARAM_INT);
        $stmt->bindParam(':event_month', $month, PDO::PARAM_INT);

        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($results === false){
            http_response_code(500);
            echo json_encode(["error" => "SQL has failed fetching wikipedia events", "details" => "Problem retrieving events try again"]);
            exit;
        }

        return $results;
    }   