<?php

    $map_dsn = "mysql:host={$_ENV['DB_HOST']};port={$_ENV['DB_PORT']};dbname=map";
    $username = $_ENV['DB_USERNAME'];
    $password = $_ENV['DB_PASS'];

    try {
        $map_db = new PDO($map_dsn, $username, $password);
    } catch (PDOException $err) {
        http_response_code(500);
        echo json_encode(["error" => "PDO Connection error to map db", "details" => "Error initializing map DB connection"]);
        exit;
    }

    $wikipedia_dsn = "mysql:host={$_ENV['DB_HOST']};port={$_ENV['DB_PORT']};dbname=wikipedia";

    try {
        $wikipedia_db = new PDO($wikipedia_dsn, $username, $password);
    } catch (PDOException $err) {
        http_response_code(500);
        echo json_encode(["error" => "PDO Connection error to wiki db", "details" => "Error initializing wikipedia DB connection"]);
        exit;
    }