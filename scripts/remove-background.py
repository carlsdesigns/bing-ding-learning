#!/usr/bin/env python3
"""
Background removal script.
Removes magenta/pink background from an image and replaces it with transparency.
Handles anti-aliased edges to remove color fringing.
"""

import sys
from pathlib import Path
from PIL import Image
import numpy as np


def remove_magenta_background(input_path: str, tolerance: int = 60) -> None:
    """Remove magenta/pink background from image and replace with transparency.
    
    Targets magenta where red and blue are high, green is low.
    This avoids conflicts with common subject colors like yellow, orange, brown.
    """
    path = Path(input_path)
    
    if not path.exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    img = Image.open(path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    
    # Calculate "magenta-ness" - red and blue high, green low
    # Pure magenta is RGB(255, 0, 255)
    magenta_score = (r + b) / 2 - g  # High when R+B high and G low
    
    # Magenta background detection - flexible criteria:
    # 1. Red and blue must both be high
    # 2. Green must be significantly lower than red and blue
    # 3. Red and blue should be roughly similar (both present)
    magenta_bg_mask = (
        (r > 150) &                      # Red channel is bright
        (b > 150) &                      # Blue channel is bright
        (g < r - 60) &                   # Green is much lower than red
        (g < b - 60) &                   # Green is much lower than blue
        (np.abs(r - b) < 80) &           # Red and blue are similar (both present)
        (magenta_score > 80)             # Strong magenta signal
    )
    
    # Also catch pure/near-pure magentas
    pure_magenta_mask = (
        (r >= 200) &
        (g <= tolerance) &
        (b >= 200)
    )
    
    # Catch pinkish magentas (lighter shades)
    pink_mask = (
        (r > 180) &
        (b > 140) &
        (g < 120) &
        (r > g + 80) &
        (b > g + 40)
    )
    
    # Combine masks
    full_magenta_mask = magenta_bg_mask | pure_magenta_mask | pink_mask
    
    # For magenta background pixels: make fully transparent
    data[full_magenta_mask, 3] = 0
    data[full_magenta_mask, 0:3] = 0
    
    # Anti-aliased edge pixels: detect magenta fringing on edges
    # Look for pixels where red+blue are high relative to green (magenta tint)
    
    # Detect pixels with magenta contamination
    magenta_excess = ((r + b) / 2) - g
    
    # Edge pixels: have magenta tint but not full magenta
    edge_magenta_mask = (
        (magenta_excess > 30) &       # Some magenta signal
        (r > 100) &                   # Has red
        (b > 100) &                   # Has blue
        (g < 150) &                   # Green is suppressed
        ~full_magenta_mask            # Not already marked as magenta background
    )
    
    # For edge pixels: reduce the magenta contamination
    if np.any(edge_magenta_mask):
        # For magenta-contaminated pixels, we need to reduce R and B
        # to match what they would be without magenta bleed
        excess = magenta_excess[edge_magenta_mask]
        
        # Reduce alpha for heavily contaminated pixels
        heavy_magenta = excess > 60
        if np.any(heavy_magenta):
            edge_indices = np.where(edge_magenta_mask)
            heavy_mask_indices = (edge_indices[0][heavy_magenta], edge_indices[1][heavy_magenta])
            alpha_reduction = np.clip(excess[heavy_magenta] / 150, 0, 0.8)
            data[heavy_mask_indices[0], heavy_mask_indices[1], 3] *= (1 - alpha_reduction)
    
    # Third pass: catch subtle magenta tint on light-colored pixels (like white borders)
    r2, g2, b2 = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    subtle_magenta = (
        (r2 > g2 + 15) &             # Red higher than green
        (b2 > g2 + 15) &             # Blue higher than green  
        (r2 > 150) &                 # Bright red
        (b2 > 150) &                 # Bright blue
        (g2 < 200) &                 # Green not too high
        ~full_magenta_mask
    )
    
    if np.any(subtle_magenta):
        # Neutralize by boosting green to match avg of red and blue
        avg_rb = (r2[subtle_magenta] + b2[subtle_magenta]) / 2
        data[subtle_magenta, 1] = np.clip(avg_rb - 10, 0, 255)
    
    # Convert back to uint8
    data = np.clip(data, 0, 255).astype(np.uint8)
    
    # Save as PNG to preserve transparency
    result = Image.fromarray(data, 'RGBA')
    
    # Change extension to .png if needed
    output_path = path.with_suffix('.png')
    result.save(output_path, 'PNG')
    
    # Remove original if it was a different format
    if path.suffix.lower() != '.png' and path != output_path:
        path.unlink()
        print(f"Background removed: {input_path} -> {output_path}")
    else:
        print(f"Background removed: {input_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove-background.py <image_path> [tolerance]", file=sys.stderr)
        print("  tolerance: 0-255, for pure magenta detection (default: 60)", file=sys.stderr)
        sys.exit(1)
    
    tolerance = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    remove_magenta_background(sys.argv[1], tolerance)
