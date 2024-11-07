<?php

set_error_handler(function ($errno, $errstr, $errfile, $errline) {
        http_response_code(500);  
        echo json_encode([
            "error" => "Server Error",
            "details" => "Error: $errstr in $errfile on line $errline"
        ]);
        exit(); 
    });
    
    set_exception_handler(function ($exception) {
        http_response_code(500);  
        echo json_encode([
            "error" => "Server Error",
            "details" => $exception->getMessage()
        ]);
        exit(); 
    });