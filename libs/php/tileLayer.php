<?php
    header("Content-Type: image/png");

    require_once "functions.php";

    if (isset($_GET['style'])) {
        $style = $_GET['style'];


        $url = "https://tile.jawg.io/$style/{z}/{x}/{y}.png?access-token={$_ENV['JAWG_TOKEN']}";

        $ch = curl_init();
        
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);

        $layerImg = curl_exec(($ch));

        if (curl_errno($ch) || !$layerImg) {
            http_response_code(500);
            echo "cURL Error: " . curl_error($ch);
        } else {
            http_response_code(200);
            echo $layerImg;
        }
    } else {
        http_response_code(400);
        echo "Missing style param";
    }
