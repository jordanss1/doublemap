<?php

    $dsn = "mysql:host={$_ENV['DB_HOST']};port={$_ENV['DB_PORT']};dbname=map";
    $username = $_ENV['DB_USERNAME'];
    $password = $_ENV['DB_PASS'];

    try {
        $db = new PDO($dsn, $username, $password);
    } catch (PDOException $err) {
        http_response_code(500);
        $error = "DB Error: $err";
        echo json_encode(["error" => $error, "details" => "Error initializing DB connection"]);
        exit;
    }