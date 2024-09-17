#!/bin/bash

# Check if ImageMagick's 'identify' command is available
if ! command -v identify &> /dev/null
then
    echo "ImageMagick's 'identify' command could not be found. Please install it first."
    exit 1
fi

# Initialize an empty JSON object
output="{"

# Set the image directory to process
image_directory="../public/images"

# Iterate over all image files in the target directory
for file in "$image_directory"/*.{jpg,jpeg,png,gif,bmp,tiff}; do
    # Check if the file exists (handles case where no images are found)
    if [ ! -e "$file" ]; then
        continue
    fi

    # Get image dimensions using ImageMagick's identify command
    dimensions=$(identify -format "%w %h" "$file")
    width=$(echo $dimensions | cut -d' ' -f1)
    height=$(echo $dimensions | cut -d' ' -f2)

    # Get just the filename (without the directory path)
    filename=$(basename "$file")

    # Append to JSON object
    output+="\"$filename\": { \"width\": $width, \"height\": $height },"
done

# Remove the trailing comma and close the JSON object
output="${output%,}}"

# Print the result
echo $output
