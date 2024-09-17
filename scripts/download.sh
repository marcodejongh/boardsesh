#!/bin/bash

# Base URL
base_url="https://api.kilterboardapp.com/img/"

# Array of image paths
images=(
"product_sizes_layouts_sets/47.png"
"product_sizes_layouts_sets/48.png"
"product_sizes_layouts_sets/49.png"
"product_sizes_layouts_sets/15_5_24.png"
"product_sizes_layouts_sets/53.png"
"product_sizes_layouts_sets/54.png"
"product_sizes_layouts_sets/55-v2.png"
"product_sizes_layouts_sets/56-v3.png"
"product_sizes_layouts_sets/55-v2.png"
"product_sizes_layouts_sets/56-v3.png"
"product_sizes_layouts_sets/59.png"
"product_sizes_layouts_sets/65-v2.png"
"product_sizes_layouts_sets/66-v2.png"
"product_sizes_layouts_sets/65-v2.png"
"product_sizes_layouts_sets/66-v2.png"
"product_sizes_layouts_sets/72.png"
"product_sizes_layouts_sets/73.png"
"product_sizes_layouts_sets/72.png"
"product_sizes_layouts_sets/73.png"
"product_sizes_layouts_sets/36-1.png"
"product_sizes_layouts_sets/38-1.png"
"product_sizes_layouts_sets/39-1.png"
"product_sizes_layouts_sets/41-1.png"
"product_sizes_layouts_sets/45-1.png"
"product_sizes_layouts_sets/46-1.png"
"product_sizes_layouts_sets/50-1.png"
"product_sizes_layouts_sets/51-1.png"
"product_sizes_layouts_sets/77-1.png"
"product_sizes_layouts_sets/78-1.png"
"product_sizes_layouts_sets/60-v3.png"
"product_sizes_layouts_sets/60-v3.png"
"product_sizes_layouts_sets/63-v3.png"
"product_sizes_layouts_sets/63-v3.png"
"product_sizes_layouts_sets/70-v2.png"
"product_sizes_layouts_sets/70-v2.png"
"product_sizes_layouts_sets/61-v3.png"
"product_sizes_layouts_sets/64-v3.png"
"product_sizes_layouts_sets/71-v3.png"
"product_sizes_layouts_sets/original-16x12-bolt-ons-v2.png"
"product_sizes_layouts_sets/original-16x12-screw-ons-v2.png"
"product_sizes_layouts_sets/61-v3.png"
)

# Loop through the array and download each image
for image in "${images[@]}"
do
  wget "${base_url}${image}" -P ../public/images
done
