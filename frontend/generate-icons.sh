#!/bin/bash
# generate-icons.sh - Generate PWA icons from a base image
# Usage: ./generate-icons.sh <source-image>
# Requires: ImageMagick (convert command)

if [ -z "$1" ]; then
  echo "Usage: $0 <source-image>"
  echo "Example: $0 logo.png"
  exit 1
fi

SOURCE="$1"
ICON_DIR="public/icons"

mkdir -p "$ICON_DIR"

echo "Generating PWA icons from $SOURCE..."

# Generate 192x192 icon
convert "$SOURCE" -resize 192x192 -background none -gravity center -extent 192x192 "$ICON_DIR/icon-192.png"
echo "✓ Created icon-192.png"

# Generate 512x512 icon
convert "$SOURCE" -resize 512x512 -background none -gravity center -extent 512x512 "$ICON_DIR/icon-512.png"
echo "✓ Created icon-512.png"

# Generate maskable icons (with transparency)
convert "$SOURCE" -resize 192x192 -background transparent -gravity center -extent 192x192 "$ICON_DIR/icon-192-maskable.png"
echo "✓ Created icon-192-maskable.png"

convert "$SOURCE" -resize 512x512 -background transparent -gravity center -extent 512x512 "$ICON_DIR/icon-512-maskable.png"
echo "✓ Created icon-512-maskable.png"

echo "✓ All icons generated successfully!"
echo ""
echo "For now, using placeholder icons. Replace with actual game artwork:"
echo "  - logo/icon source image (at least 512x512)"
echo "  - Run: chmod +x generate-icons.sh && ./generate-icons.sh <your-logo.png>"
