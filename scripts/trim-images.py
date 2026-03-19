#!/usr/bin/env python3
"""
Trim transparent pixels from PNG images to create tight bounding boxes.
This makes touch/click targets more accurate by removing excess transparent space.
"""

import sys
from pathlib import Path
from PIL import Image


def trim_image(input_path: str, padding: int = 2) -> None:
    """Trim transparent pixels from a PNG image."""
    path = Path(input_path)
    
    if not path.exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        return
    
    if path.suffix.lower() != '.png':
        print(f"Skipping non-PNG: {input_path}")
        return
    
    img = Image.open(path).convert('RGBA')
    original_size = (img.width, img.height)
    
    # Get the alpha channel and find non-transparent pixels
    alpha = img.split()[3]
    bbox = alpha.getbbox()
    
    if not bbox:
        print(f"Skipping fully transparent: {input_path}")
        return
    
    # Check if already trimmed (bbox equals image bounds minus padding)
    if (bbox[0] <= padding and bbox[1] <= padding and 
        bbox[2] >= img.width - padding and bbox[3] >= img.height - padding):
        print(f"Already tight: {input_path}")
        return
    
    # Add small padding to avoid cutting off anti-aliased edges
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(img.width, bbox[2] + padding)
    bottom = min(img.height, bbox[3] + padding)
    
    trimmed = img.crop((left, top, right, bottom))
    trimmed.save(path, 'PNG')
    
    print(f"Trimmed: {input_path} ({original_size[0]}x{original_size[1]} -> {trimmed.width}x{trimmed.height})")


def trim_directory(directory: str, padding: int = 2) -> None:
    """Trim all PNG images in a directory recursively."""
    path = Path(directory)
    
    if not path.exists():
        print(f"Error: Directory not found: {directory}", file=sys.stderr)
        sys.exit(1)
    
    png_files = list(path.rglob("*.png"))
    print(f"Found {len(png_files)} PNG files in {directory}")
    
    for png_file in png_files:
        # Skip raw directory
        if 'raw' in png_file.parts:
            continue
        trim_image(str(png_file), padding)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python trim-images.py <path> [padding]", file=sys.stderr)
        print("  path: file or directory to process", file=sys.stderr)
        print("  padding: pixels to keep around content (default: 2)", file=sys.stderr)
        sys.exit(1)
    
    padding = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    target = sys.argv[1]
    
    if Path(target).is_dir():
        trim_directory(target, padding)
    else:
        trim_image(target, padding)
