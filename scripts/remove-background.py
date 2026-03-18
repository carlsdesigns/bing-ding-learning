#!/usr/bin/env python3
"""
Background removal script using rembg.
Removes background from an image and replaces it with transparency.
"""

import sys
from rembg import remove
from pathlib import Path


def remove_background(input_path: str) -> None:
    """Remove background from image and overwrite with transparent version."""
    path = Path(input_path)
    
    if not path.exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    with open(path, 'rb') as f:
        input_image = f.read()
    
    output_image = remove(input_image)
    
    with open(path, 'wb') as f:
        f.write(output_image)
    
    print(f"Background removed: {input_path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python remove-background.py <image_path>", file=sys.stderr)
        sys.exit(1)
    
    remove_background(sys.argv[1])
