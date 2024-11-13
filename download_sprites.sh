#!/bin/bash

# Check if the MAPBOX_BUILD_SPRITES environment variable is set
if [ -z "$MAPBOX_BUILD_SPRITES" ]; then
  echo "Error: MAPBOX_BUILD_SPRITES environment variable is not set."
  exit 1
fi

# Define your styles as an associative array
declare -A styles=(
  ["Standard"]="standard"
  ["Streets"]="streets-v12"
  ["Outdoors"]="outdoors-v12"
  ["Satellite"]="standard-satellite"
  ["Dark"]="navigation-night-v1"
)

# Define the base path for assets relative to the Dockerfile location
ASSETS_PATH="./assets/mapboxgljs"

# Create assets directory if it doesn't exist
mkdir -p "$ASSETS_PATH"

# Loop through each style and download the required files
for style_name in "${!styles[@]}"; do
  style_id="${styles[$style_name]}"
  style_path="$ASSETS_PATH/$style_id"  # Use style_id for the folder name

  # Create directory for the style if it doesn't exist
  mkdir -p "$style_path"

  # Download the sprite files
  curl -o "$style_path/sprite.json" "https://api.mapbox.com/styles/v1/mapbox/$style_id/sprite.json?access_token=$MAPBOX_BUILD_SPRITES"
  curl -o "$style_path/sprite.png" "https://api.mapbox.com/styles/v1/mapbox/$style_id/sprite.png?access_token=$MAPBOX_BUILD_SPRITES"
  curl -o "$style_path/sprite@2x.json" "https://api.mapbox.com/styles/v1/mapbox/$style_id/sprite@2x.json?access_token=$MAPBOX_BUILD_SPRITES"
  curl -o "$style_path/sprite@2x.png" "https://api.mapbox.com/styles/v1/mapbox/$style_id/sprite@2x.png?access_token=$MAPBOX_BUILD_SPRITES"

  echo "Downloaded sprites for $style_id style into $style_path"
done

echo "All styles downloaded successfully."