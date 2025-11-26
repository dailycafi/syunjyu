from PIL import Image, ImageDraw
import os

def make_macos_style_icon(input_path, output_path):
    try:
        # Open the source image
        source_img = Image.open(input_path).convert("RGBA")
        
        # Target canvas size
        canvas_size = 1024
        # Actual icon content size (standard macOS icons occupy about 80-85% of the canvas)
        # 824px is roughly the standard size for the squircle background
        icon_size = 824
        
        # Resize source image to icon size (High quality)
        source_img = source_img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        
        # Create a mask (black background, white rounded rectangle)
        mask = Image.new('L', (icon_size, icon_size), 0)
        draw = ImageDraw.Draw(mask)
        
        # Calculate radius for the rounded corner
        # For macOS Big Sur+, the continuous curvature is complex, but a rounded rect 
        # with ~22.5% radius of the size is a good approximation.
        # 824 * 0.225 ≈ 185
        radius = int(icon_size * 0.225)
        
        # Draw rounded rectangle on mask
        draw.rounded_rectangle([(0, 0), (icon_size, icon_size)], radius=radius, fill=255)
        
        # Apply mask to the resized source image
        source_img.putalpha(mask)
        
        # Create the final 1024x1024 transparent canvas
        final_img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
        
        # Calculate position to center the icon
        x = (canvas_size - icon_size) // 2
        y = (canvas_size - icon_size) // 2
        
        # Paste the icon onto the canvas
        final_img.paste(source_img, (x, y), source_img)
        
        # Save result
        final_img.save(output_path, "PNG")
        print(f"Successfully created macOS style icon at: {output_path}")
        
    except Exception as e:
        print(f"Error processing image: {e}")
        exit(1)

if __name__ == "__main__":
    input_file = "AppIcons/Assets.xcassets/AppIcon.appiconset/1024.png"
    output_file = "AppIcons/processed_icon.png"
    
    if not os.path.exists(input_file):
        print(f"Source file not found: {input_file}")
        exit(1)
        
    make_macos_style_icon(input_file, output_file)
