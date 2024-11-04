#!/bin/sh

# Rebuild CSS in a loop every 5 seconds
while true; do
    /usr/share/nginx/html/tailwindcss.l -i /usr/share/nginx/html/libs/css/input.css -o /usr/share/nginx/html/libs/css/output.css --minify
    sleep 10
done &

# Start nginx in the foreground
nginx -g 'daemon off;'

