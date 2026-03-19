#!/usr/bin/env python3
"""
Background removal script.
Removes green background (various shades) from an image and replaces it with transparency.
Handles anti-aliased edges to remove green fringing.
"""

import sys
from pathlib import Path
from PIL import Image
import numpy as np


def remove_green_background(input_path: str, tolerance: int = 60) -> None:
    """Remove green background from image and replace with transparency.
    
    Targets any green where green channel strongly dominates red and blue,
    not just pure #00FF00. This handles various shades of chroma key green.
    """
    path = Path(input_path)
    
    if not path.exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    img = Image.open(path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    
    # Calculate "greenness" - how much green dominates over red and blue
    greenness = g - np.maximum(r, b)
    
    # Calculate green ratio - green relative to other channels
    green_ratio = g / (np.maximum(r, b) + 1)  # +1 to avoid division by zero
    
    # Green background detection - flexible criteria:
    # 1. Green must be high (> 150)
    # 2. Green must dominate red and blue significantly
    # 3. Red and blue must be relatively low
    green_bg_mask = (
        (g > 150) &                      # Green channel is bright
        (greenness > 80) &               # Green dominates by at least 80
        (r < g - 50) &                   # Red is significantly lower than green
        (b < g - 50) &                   # Blue is significantly lower than green
        (green_ratio > 1.5)              # Green is at least 1.5x the max of R/B
    )
    
    # Also catch pure/near-pure greens with traditional tolerance
    pure_green_mask = (
        (r <= tolerance) &
        (g >= 200) &
        (b <= tolerance)
    )
    
    # Combine masks
    full_green_mask = green_bg_mask | pure_green_mask
    
    # For green background pixels: make fully transparent
    data[full_green_mask, 3] = 0
    data[full_green_mask, 0:3] = 0
    
    # Anti-aliased edge pixels: any pixel where green is higher than it should be
    # This catches the white border pixels that have green blended in
    # For white/light pixels: R, G, B should be roughly equal
    # Green fringing means G > R and G > B
    
    # Detect pixels where green exceeds both red and blue
    green_excess = g - np.minimum(r, b)
    
    # Edge pixels: green is noticeably higher than the lower of R/B
    edge_green_mask = (
        (green_excess > 15) &         # Green exceeds by at least 15 (lowered threshold)
        (g > 80) &                    # Has meaningful green (lowered threshold)
        ~full_green_mask              # Not already marked as green background
    )
    
    # For edge pixels: neutralize the green by bringing it down to match
    # the higher of red or blue (preserving brightness)
    if np.any(edge_green_mask):
        # Calculate target: green should match the max of red and blue
        target_g = np.maximum(r[edge_green_mask], b[edge_green_mask])
        # But also handle case where pixel is mostly green-contaminated
        # by looking at how extreme the green excess is
        excess = g[edge_green_mask] - target_g
        
        # Strongly reduce green to match the other channels
        data[edge_green_mask, 1] = target_g
        
        # For pixels with extreme green (likely semi-transparent over green bg)
        # reduce alpha proportionally
        extreme_green = excess > 50
        if np.any(extreme_green):
            extreme_indices = np.where(edge_green_mask)
            extreme_mask_indices = (extreme_indices[0][extreme_green], extreme_indices[1][extreme_green])
            alpha_reduction = np.clip(excess[extreme_green] / 150, 0, 0.9)
            data[extreme_mask_indices[0], extreme_mask_indices[1], 3] *= (1 - alpha_reduction)
    
    # Third pass: catch very subtle green tint on light-colored pixels
    # Recalculate after first correction
    r2, g2, b2 = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    subtle_green = (
        (g2 > r2 + 8) &              # Green still higher than red
        (g2 > b2 + 8) &              # Green still higher than blue
        (g2 > 60) &                  # Meaningful green value
        (r2 > 40) &                  # Not a dark pixel (light/white area)
        ~full_green_mask
    )
    
    if np.any(subtle_green):
        # Bring green down to average of red and blue
        avg_rb = (r2[subtle_green] + b2[subtle_green]) / 2
        data[subtle_green, 1] = np.clip(avg_rb + 5, 0, 255)  # Slight allowance
    
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
        print("  tolerance: 0-255, for pure green detection (default: 60)", file=sys.stderr)
        sys.exit(1)
    
    tolerance = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    remove_green_background(sys.argv[1], tolerance)
