#!/usr/bin/env python3
"""
Background removal script.
Removes magenta/pink background from an image using flood fill from edges.
Only removes the outer background, preserving pink colors inside the subject.
"""

import sys
from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage


def is_pink_pixel(r, g, b, tolerance=60):
    """Check if a pixel is pink/magenta (background color)."""
    # Hot pink / bright magenta
    if r > 180 and g < 150 and b > 80 and (r - g) > 50:
        return True
    # Light/pastel pink
    if r > 190 and g > 140 and g < 230 and b > 160 and r > g and (r + b) > (g * 2):
        return True
    # Pure magenta
    if r > 180 and g < tolerance + 50 and b > 150:
        return True
    # Standard pink range
    if r > 170 and b > 100 and g < 180 and (r > g + 20):
        return True
    return False


def remove_magenta_background(input_path: str, tolerance: int = 60) -> None:
    """Remove magenta/pink background using flood fill from edges.
    
    Only removes connected pink regions that touch the image border,
    preserving any pink colors inside the subject.
    """
    path = Path(input_path)
    
    if not path.exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    img = Image.open(path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    height, width = data.shape[:2]
    
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    
    # Create a mask of ALL pink pixels (potential background)
    pink_mask = np.zeros((height, width), dtype=bool)
    
    for y in range(height):
        for x in range(width):
            pink_mask[y, x] = is_pink_pixel(r[y, x], g[y, x], b[y, x], tolerance)
    
    # Create edge mask - pixels on the border of the image
    edge_mask = np.zeros((height, width), dtype=bool)
    edge_mask[0, :] = True      # Top edge
    edge_mask[-1, :] = True     # Bottom edge
    edge_mask[:, 0] = True      # Left edge
    edge_mask[:, -1] = True     # Right edge
    
    # Find pink pixels that are connected to the edge (the actual background)
    # Use flood fill: label connected components of pink pixels
    labeled_array, num_features = ndimage.label(pink_mask)
    
    # Find which labels touch the edge
    edge_labels = set(labeled_array[edge_mask]) - {0}  # 0 is non-pink
    
    # Create mask of only the background pink (connected to edges)
    background_mask = np.isin(labeled_array, list(edge_labels))
    
    # For background pixels: make fully transparent
    data[background_mask, 3] = 0
    data[background_mask, 0:3] = 0
    
    # Handle anti-aliased edges: pixels adjacent to background that have pink tint
    # Dilate the background mask to find edge pixels (larger zone for better cleanup)
    dilated = ndimage.binary_dilation(background_mask, iterations=3)
    edge_zone = dilated & ~background_mask
    
    # Recalculate colors after background removal
    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    
    # In the edge zone, detect and fix pink contamination
    magenta_excess = ((r + b) / 2) - g
    
    # Pixels with any pink tint in the edge zone
    edge_pink_mask = edge_zone & (magenta_excess > 10) & (r > 80) & (b > 60)
    
    if np.any(edge_pink_mask):
        # Calculate how "pink" each pixel is
        excess = magenta_excess[edge_pink_mask]
        
        # For heavily pink pixels (likely background bleed), reduce alpha significantly
        heavy_pink = excess > 40
        if np.any(heavy_pink):
            edge_indices = np.where(edge_pink_mask)
            heavy_indices = (edge_indices[0][heavy_pink], edge_indices[1][heavy_pink])
            alpha_reduction = np.clip(excess[heavy_pink] / 80, 0, 0.9)
            data[heavy_indices[0], heavy_indices[1], 3] *= (1 - alpha_reduction)
        
        # For all pink-tinted edge pixels, neutralize the pink color
        # by boosting green to match the average of red and blue
        r_vals = r[edge_pink_mask]
        b_vals = b[edge_pink_mask]
        g_vals = g[edge_pink_mask]
        
        # Calculate neutral green (average of R and B)
        neutral_g = (r_vals + b_vals) / 2
        
        # Blend towards neutral based on how much pink excess there is
        blend_factor = np.clip(excess / 100, 0, 0.8)
        new_g = g_vals + (neutral_g - g_vals) * blend_factor
        data[edge_pink_mask, 1] = np.clip(new_g, 0, 255)
    
    # Second pass: specifically fix white/light border areas
    # These often have subtle pink that needs to be neutralized
    light_pixels = (r > 180) & (g > 150) & (b > 180) & edge_zone
    if np.any(light_pixels):
        # For light pixels, ensure R, G, B are balanced (no pink tint)
        r_light = r[light_pixels]
        g_light = g[light_pixels]
        b_light = b[light_pixels]
        
        # If red and blue are both higher than green, it's pink-tinted
        pink_tinted = (r_light > g_light + 5) & (b_light > g_light + 5)
        if np.any(pink_tinted):
            light_indices = np.where(light_pixels)
            tinted_indices = (light_indices[0][pink_tinted], light_indices[1][pink_tinted])
            
            # Set green to average of red and blue to neutralize
            avg_rb = (r_light[pink_tinted] + b_light[pink_tinted]) / 2
            data[tinted_indices[0], tinted_indices[1], 1] = np.clip(avg_rb, 0, 255)
    
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
