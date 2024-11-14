<?php
    header("Content-Type: image/png");

    require_once "functions.php";
    require_once './error_handle.php';
    require_once './origin_check.php';

    if (isset($_GET['style'])) {
        $style = $_GET['style'];
        $x = $_GET['x'];
        $z = $_GET['z'];
        $y = $_GET['y'];

        $url = "https://tile.jawg.io/$style/$z/$x/$y.png?access-token={$_ENV['JAWG_TOKEN']}";

        $ch = curl_init();
        
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);

        $layerImg = curl_exec(($ch));

        if (curl_errno($ch)) {
            curl_close($ch);  
            http_response_code(500);
            echo "cURL Error: " . curl_error($ch);
        } elseif ($layerImg === false || strlen($layerImg) === 0) {
            curl_close($ch);  
            http_response_code(500);
            echo "Error: Empty response from Jawg API";
        } else {
            curl_close($ch);  
            http_response_code(200);
            echo $layerImg;
        }
    } else {
        curl_close($ch);
        http_response_code(400);
        echo "Missing style param";
    }
