"""
FastAPI Backend for OpenCV Image Processing Studio
Handles all 10 topics from the laboratory activities
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image
import json
from typing import List, Optional
import uvicorn

app = FastAPI(title="OpenCV Processing Studio API", version="1.0.0")

# Enable CORS for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper functions
def decode_base64_image(base64_string: str) -> np.ndarray:
    """Convert base64 string to OpenCV image"""
    try:
        # Remove data URL prefix if present
        if base64_string.startswith('data:image'):
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Convert to PIL Image then to OpenCV format
        pil_image = Image.open(BytesIO(image_data))
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        return opencv_image
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

def encode_image_to_base64(image: np.ndarray) -> str:
    """Convert OpenCV image to base64 string"""
    # Convert BGR to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Convert to PIL Image
    pil_image = Image.fromarray(image_rgb)
    
    # Convert to base64
    buffer = BytesIO()
    pil_image.save(buffer, format='PNG')
    
    return base64.b64encode(buffer.getvalue()).decode()

@app.get("/")
async def root():
    return {"message": "OpenCV Image Processing Studio API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "opencv_version": cv2.__version__}

# =============================================================================
# TOPIC 1: GETTING STARTED
# =============================================================================

@app.post("/api/load-image")
async def load_image(file: UploadFile = File(...)):
    """Load and return image information"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        height, width, channels = image.shape
        
        return {
            "width": int(width),
            "height": int(height),
            "channels": int(channels),
            "size": len(contents),
            "format": file.content_type,
            "image": encode_image_to_base64(image)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/dimensions")
async def get_dimensions(image_data: str = Form(...)):
    """Get image dimensions and properties"""
    try:
        image = decode_base64_image(image_data)
        height, width = image.shape[:2]
        channels = image.shape[2] if len(image.shape) == 3 else 1
        
        return {
            "width": int(width),
            "height": int(height),
            "channels": int(channels),
            "total_pixels": int(width * height),
            "data_type": str(image.dtype)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# TOPIC 2: GRAYSCALING
# =============================================================================

@app.post("/api/grayscale")
async def convert_grayscale(image_data: str = Form(...)):
    """Convert image to grayscale"""
    try:
        image = decode_base64_image(image_data)
        
        # Convert to grayscale
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Convert back to 3-channel for consistent display
        gray_3channel = cv2.cvtColor(gray_image, cv2.COLOR_GRAY2BGR)
        
        return {
            "processed_image": encode_image_to_base64(gray_3channel),
            "original_shape": image.shape,
            "processed_shape": gray_image.shape,
            "operation": "grayscale_conversion"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/compare-dimensions")
async def compare_dimensions(image_data: str = Form(...)):
    try:
        # Decode image
        image = decode_base64_image(image_data)
        
        # Get grayscale version
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Get a subset of pixel values for display (15x20 grid)
        height, width = gray_image.shape
        h_step = max(1, height // 15)
        w_step = max(1, width // 20)
        pixel_values = gray_image[::h_step, ::w_step][:15, :20].tolist()
        
        return {
            "pixel_values": pixel_values,
            "dimensions": {
                "height": height,
                "width": width,
                "channels": 1
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# TOPIC 3: COLOR SPACES
# =============================================================================

@app.post("/api/rgb-channels")
async def extract_rgb_channels(image_data: str = Form(...)):
    """Extract individual RGB channels"""
    try:
        # Decode image
        image = decode_base64_image(image_data)
        
        # Split into BGR channels (OpenCV uses BGR)
        b, g, r = cv2.split(image)
        
        # Create visualizations for each channel
        # Zero arrays for merging
        zeros = np.zeros(b.shape, dtype=np.uint8)
        
        # Create BGR images for each channel
        blue_channel = cv2.merge([b, zeros, zeros])  # Blue channel in BGR
        green_channel = cv2.merge([zeros, g, zeros])  # Green channel in BGR
        red_channel = cv2.merge([zeros, zeros, r])    # Red channel in BGR
        
        # Convert to base64
        return {
            "channels": {
                "red": encode_image_to_base64(red_channel),
                "green": encode_image_to_base64(green_channel),
                "blue": encode_image_to_base64(blue_channel)
            },
            "channel_intensities": {
                "red_mean": float(f"{np.mean(r):.2f}"),
                "green_mean": float(f"{np.mean(g):.2f}"),
                "blue_mean": float(f"{np.mean(b):.2f}")
            },
            "operation": "rgb_channel_extraction"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/hsv-convert")
async def convert_hsv(image_data: str = Form(...)):
    """Convert image to HSV color space"""
    try:
        image = decode_base64_image(image_data)
        
        # Convert to HSV
        hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Split HSV channels
        h, s, v = cv2.split(hsv_image)
        
        # Create visualizations
        h_vis = cv2.applyColorMap(h, cv2.COLORMAP_HSV)
        s_vis = cv2.cvtColor(s, cv2.COLOR_GRAY2BGR)
        v_vis = cv2.cvtColor(v, cv2.COLOR_GRAY2BGR)
        
        return {
            "hsv_image": encode_image_to_base64(cv2.cvtColor(hsv_image, cv2.COLOR_HSV2BGR)),
            "hue_channel": encode_image_to_base64(h_vis),
            "saturation_channel": encode_image_to_base64(s_vis),
            "value_channel": encode_image_to_base64(v_vis),
            "operation": "hsv_conversion"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/color-manipulation")
async def manipulate_color(
    image_data: str = Form(...),
    hue_shift: int = Form(0),
    saturation_factor: float = Form(1.0),
    value_factor: float = Form(1.0)
):
    """Manipulate color channels"""
    try:
        image = decode_base64_image(image_data)
        hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
        
        # Manipulate HSV channels
        hsv_image[:, :, 0] = (hsv_image[:, :, 0] + hue_shift) % 180
        hsv_image[:, :, 1] = np.clip(hsv_image[:, :, 1] * saturation_factor, 0, 255)
        hsv_image[:, :, 2] = np.clip(hsv_image[:, :, 2] * value_factor, 0, 255)
        
        # Convert back to BGR
        result_image = cv2.cvtColor(hsv_image.astype(np.uint8), cv2.COLOR_HSV2BGR)
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "hue_shift": hue_shift,
            "saturation_factor": saturation_factor,
            "value_factor": value_factor,
            "operation": "color_manipulation"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# TOPIC 4: DRAWING AND SHAPES
# =============================================================================

@app.post("/api/draw-shapes")
async def draw_shapes(image_data: str = Form(...)):
    """Draw various shapes on image"""
    try:
        image = decode_base64_image(image_data)
        height, width = image.shape[:2]
        
        # Create a copy to draw on
        result_image = image.copy()
        
        # Draw rectangle
        cv2.rectangle(result_image, (50, 50), (200, 150), (255, 0, 0), 3)
        
        # Draw circle
        cv2.circle(result_image, (width//2, height//2), 100, (0, 255, 0), 3)
        
        # Draw line
        cv2.line(result_image, (0, 0), (width, height), (0, 0, 255), 2)
        
        # Draw ellipse
        cv2.ellipse(result_image, (width//2, height//4), (100, 50), 0, 0, 360, (255, 255, 0), 2)
        
        # Draw polygon
        pts = np.array([[width-200, height-200], [width-100, height-200], 
                       [width-50, height-100], [width-150, height-100]], np.int32)
        cv2.polylines(result_image, [pts], True, (255, 0, 255), 2)
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "operation": "draw_shapes"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/add-text")
async def add_text(
    image_data: str = Form(...),
    text: str = Form("OpenCV Text"),
    font_scale: float = Form(1.0),
    color_r: int = Form(255),
    color_g: int = Form(255),
    color_b: int = Form(255)
):
    """Add text to image"""
    try:
        image = decode_base64_image(image_data)
        result_image = image.copy()
        
        # Add text
        font = cv2.FONT_HERSHEY_SIMPLEX
        position = (50, 50)
        color = (color_b, color_g, color_r)  # BGR format
        thickness = 2
        
        cv2.putText(result_image, text, position, font, font_scale, color, thickness)
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "text": text,
            "operation": "add_text"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# TOPIC 5: TRANSFORMATIONS
# =============================================================================

@app.post("/api/translate")
async def translate_image(
    image_data: str = Form(...),
    tx: int = Form(50),
    ty: int = Form(50)
):
    """Translate (move) image"""
    try:
        image = decode_base64_image(image_data)
        height, width = image.shape[:2]
        
        # Create translation matrix
        M = np.float32([[1, 0, tx], [0, 1, ty]])
        
        # Apply translation
        translated_image = cv2.warpAffine(image, M, (width, height))
        
        return {
            "processed_image": encode_image_to_base64(translated_image),
            "translation_x": tx,
            "translation_y": ty,
            "operation": "translation"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rotate")
async def rotate_image(
    image_data: str = Form(...),
    angle: float = Form(45.0),
    scale: float = Form(1.0)
):
    """Rotate image using getRotationMatrix2D"""
    try:
        image = decode_base64_image(image_data)
        height, width = image.shape[:2]
        
        # Get rotation matrix
        center = (width // 2, height // 2)
        M = cv2.getRotationMatrix2D(center, angle, scale)
        
        # Apply rotation
        rotated_image = cv2.warpAffine(image, M, (width, height))
        
        return {
            "processed_image": encode_image_to_base64(rotated_image),
            "angle": angle,
            "scale": scale,
            "operation": "rotation"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/flip")
async def flip_image(
    image_data: str = Form(...),
    flip_code: int = Form(1)  # 0=vertical, 1=horizontal, -1=both
):
    """Flip image"""
    try:
        image = decode_base64_image(image_data)
        
        # Apply flip
        flipped_image = cv2.flip(image, flip_code)
        
        flip_type = {0: "vertical", 1: "horizontal", -1: "both"}
        
        return {
            "processed_image": encode_image_to_base64(flipped_image),
            "flip_type": flip_type.get(flip_code, "unknown"),
            "operation": "flip"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# TOPIC 6: SCALING, RESIZING, CROPPING
# =============================================================================

@app.post("/api/resize")
async def resize_image(
    image_data: str = Form(...),
    scale_factor: float = Form(0.5),
    interpolation: str = Form("linear")
):
    """Resize image with different interpolation methods"""
    try:
        image = decode_base64_image(image_data)
        height, width = image.shape[:2]
        
        # Map interpolation methods
        interp_methods = {
            "nearest": cv2.INTER_NEAREST,
            "linear": cv2.INTER_LINEAR,
            "cubic": cv2.INTER_CUBIC,
            "lanczos": cv2.INTER_LANCZOS4
        }
        
        interp = interp_methods.get(interpolation, cv2.INTER_LINEAR)
        new_width = int(width * scale_factor)
        new_height = int(height * scale_factor)
        
        # Resize image
        resized_image = cv2.resize(image, (new_width, new_height), interpolation=interp)
        
        return {
            "processed_image": encode_image_to_base64(resized_image),
            "original_size": [width, height],
            "new_size": [new_width, new_height],
            "scale_factor": scale_factor,
            "interpolation": interpolation,
            "operation": "resize"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pyramid")
async def create_pyramid(
    image_data: str = Form(...),
    levels: int = Form(3)
):
    """Create image pyramid"""
    try:
        image = decode_base64_image(image_data)
        
        # Create Gaussian pyramid
        pyramid = [image]
        current = image.copy()
        
        for i in range(levels):
            current = cv2.pyrDown(current)
            pyramid.append(current)
        
        # Create a combined visualization
        height, width = image.shape[:2]
        result_image = np.zeros((height * 2, width * 2, 3), dtype=np.uint8)
        
        # Place original image
        result_image[:height, :width] = image
        
        # Place pyramid levels
        y_offset, x_offset = 0, width
        for level in pyramid[1:]:
            h, w = level.shape[:2]
            if y_offset + h <= height * 2 and x_offset + w <= width * 2:
                result_image[y_offset:y_offset+h, x_offset:x_offset+w] = level
                y_offset += h + 10
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "levels": levels,
            "operation": "image_pyramid"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/crop")
async def crop_image(
    image_data: str = Form(...),
    x: int = Form(100),
    y: int = Form(100),
    width: int = Form(200),
    height: int = Form(200)
):
    """Crop image to specified region"""
    try:
        image = decode_base64_image(image_data)
        img_height, img_width = image.shape[:2]
        
        # Ensure crop coordinates are within image bounds
        x = max(0, min(x, img_width))
        y = max(0, min(y, img_height))
        width = min(width, img_width - x)
        height = min(height, img_height - y)
        
        # Crop image
        cropped_image = image[y:y+height, x:x+width]
        
        return {
            "processed_image": encode_image_to_base64(cropped_image),
            "crop_region": {"x": x, "y": y, "width": width, "height": height},
            "operation": "crop"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# TOPIC 7: ARITHMETIC AND BITWISE OPERATIONS
# =============================================================================

@app.post("/api/arithmetic")
async def arithmetic_operations(
    image_data: str = Form(...),
    operation: str = Form("add"),
    value: int = Form(50)
):
    """Perform arithmetic operations on image"""
    try:
        image = decode_base64_image(image_data)
        
        if operation == "add":
            result_image = cv2.add(image, np.ones(image.shape, dtype=np.uint8) * value)
        elif operation == "subtract":
            result_image = cv2.subtract(image, np.ones(image.shape, dtype=np.uint8) * value)
        elif operation == "multiply":
            result_image = cv2.multiply(image, value / 100.0)  # Scale factor
        elif operation == "divide":
            result_image = cv2.divide(image, value / 100.0)
        else:
            raise HTTPException(status_code=400, detail="Invalid operation")
        
        return {
            "processed_image": encode_image_to_base64(result_image.astype(np.uint8)),
            "operation": f"arithmetic_{operation}",
            "value": value
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bitwise")
async def bitwise_operations(
    image_data: str = Form(...),
    operation: str = Form("and"),
    mask_type: str = Form("circular")
):
    """Perform bitwise operations"""
    try:
        image = decode_base64_image(image_data)
        height, width = image.shape[:2]
        
        # Create mask
        if mask_type == "circular":
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.circle(mask, (width//2, height//2), min(width, height)//4, 255, -1)
        elif mask_type == "rectangular":
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.rectangle(mask, (width//4, height//4), (3*width//4, 3*height//4), 255, -1)
        else:
            mask = np.ones((height, width), dtype=np.uint8) * 255
        
        # Apply bitwise operation
        if operation == "and":
            result_image = cv2.bitwise_and(image, image, mask=mask)
        elif operation == "or":
            result_image = cv2.bitwise_or(image, cv2.merge([mask, mask, mask]))
        elif operation == "xor":
            result_image = cv2.bitwise_xor(image, cv2.merge([mask, mask, mask]))
        elif operation == "not":
            result_image = cv2.bitwise_not(image)
        else:
            raise HTTPException(status_code=400, detail="Invalid operation")
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "mask_image": encode_image_to_base64(cv2.merge([mask, mask, mask])),
            "operation": f"bitwise_{operation}",
            "mask_type": mask_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# TOPIC 8: CONVOLUTIONS, BLURRING, SHARPENING
# =============================================================================

@app.post("/api/blur")
async def blur_image(
    image_data: str = Form(...),
    blur_type: str = Form("gaussian"),
    kernel_size: int = Form(15),
    sigma_x: float = Form(0),
    sigma_y: float = Form(0)
):
    """Apply various blur effects"""
    try:
        image = decode_base64_image(image_data)
        
        # Ensure kernel size is odd
        if kernel_size % 2 == 0:
            kernel_size += 1
        
        if blur_type == "gaussian":
            result_image = cv2.GaussianBlur(image, (kernel_size, kernel_size), sigma_x, sigma_y)
        elif blur_type == "motion":
            # Create motion blur kernel
            kernel = np.zeros((kernel_size, kernel_size))
            kernel[int((kernel_size-1)/2), :] = np.ones(kernel_size)
            kernel = kernel / kernel_size
            result_image = cv2.filter2D(image, -1, kernel)
        elif blur_type == "median":
            result_image = cv2.medianBlur(image, kernel_size)
        elif blur_type == "bilateral":
            result_image = cv2.bilateralFilter(image, kernel_size, 80, 80)
        else:
            raise HTTPException(status_code=400, detail="Invalid blur type")
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "blur_type": blur_type,
            "kernel_size": kernel_size,
            "operation": "blur"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sharpen")
async def sharpen_image(
    image_data: str = Form(...),
    strength: float = Form(1.0)
):
    """Sharpen image using convolution"""
    try:
        image = decode_base64_image(image_data)
        
        # Define sharpening kernel
        kernel = np.array([[-1, -1, -1],
                          [-1, 9, -1],
                          [-1, -1, -1]]) * strength
        
        # Apply sharpening filter
        result_image = cv2.filter2D(image, -1, kernel)
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "strength": strength,
            "operation": "sharpen"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/denoise")
async def denoise_image(
    image_data: str = Form(...),
    method: str = Form("nlmeans"),
    h: float = Form(10.0)
):
    """Remove noise from image"""
    try:
        image = decode_base64_image(image_data)
        
        if method == "nlmeans":
            result_image = cv2.fastNlMeansDenoisingColored(image, None, h, h, 7, 21)
        elif method == "bilateral":
            result_image = cv2.bilateralFilter(image, 9, 75, 75)
        elif method == "gaussian":
            result_image = cv2.GaussianBlur(image, (5, 5), 0)
        else:
            raise HTTPException(status_code=400, detail="Invalid denoising method")
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "method": method,
            "operation": "denoise"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# TOPIC 9: THRESHOLDING
# =============================================================================

@app.post("/api/threshold")
async def threshold_image(
    image_data: str = Form(...),
    threshold_value: int = Form(127),
    max_value: int = Form(255),
    threshold_type: str = Form("binary")
):
    """Apply binary thresholding"""
    try:
        image = decode_base64_image(image_data)
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Map threshold types
        thresh_types = {
            "binary": cv2.THRESH_BINARY,
            "binary_inv": cv2.THRESH_BINARY_INV,
            "trunc": cv2.THRESH_TRUNC,
            "tozero": cv2.THRESH_TOZERO,
            "tozero_inv": cv2.THRESH_TOZERO_INV
        }
        
        thresh_type = thresh_types.get(threshold_type, cv2.THRESH_BINARY)
        
        # Apply threshold
        _, thresholded = cv2.threshold(gray_image, threshold_value, max_value, thresh_type)
        
        # Convert back to 3-channel for display
        result_image = cv2.cvtColor(thresholded, cv2.COLOR_GRAY2BGR)
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "threshold_value": threshold_value,
            "max_value": max_value,
            "threshold_type": threshold_type,
            "operation": "threshold"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/adaptive-threshold")
async def adaptive_threshold_image(
    image_data: str = Form(...),
    max_value: int = Form(255),
    adaptive_method: str = Form("mean"),
    threshold_type: str = Form("binary"),
    block_size: int = Form(11),
    c: int = Form(2)
):
    """Apply adaptive thresholding"""
    try:
        image = decode_base64_image(image_data)
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Ensure block size is odd and >= 3
        if block_size % 2 == 0:
            block_size += 1
        block_size = max(3, block_size)
        
        # Map adaptive methods
        adaptive_methods = {
            "mean": cv2.ADAPTIVE_THRESH_MEAN_C,
            "gaussian": cv2.ADAPTIVE_THRESH_GAUSSIAN_C
        }
        
        thresh_types = {
            "binary": cv2.THRESH_BINARY,
            "binary_inv": cv2.THRESH_BINARY_INV
        }
        
        adaptive_method_cv = adaptive_methods.get(adaptive_method, cv2.ADAPTIVE_THRESH_MEAN_C)
        thresh_type = thresh_types.get(threshold_type, cv2.THRESH_BINARY)
        
        # Apply adaptive threshold
        thresholded = cv2.adaptiveThreshold(
            gray_image, max_value, adaptive_method_cv, thresh_type, block_size, c
        )
        
        # Convert back to 3-channel for display
        result_image = cv2.cvtColor(thresholded, cv2.COLOR_GRAY2BGR)
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "adaptive_method": adaptive_method,
            "threshold_type": threshold_type,
            "block_size": block_size,
            "c": c,
            "operation": "adaptive_threshold"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# TOPIC 10: MORPHOLOGICAL OPERATIONS AND EDGE DETECTION
# =============================================================================

@app.post("/api/dilation")
async def dilate_image(
    image_data: str = Form(...),
    kernel_size: int = Form(5),
    iterations: int = Form(1)
):
    """Apply morphological dilation"""
    try:
        image = decode_base64_image(image_data)
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Create structuring element
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
        
        # Apply dilation
        dilated = cv2.dilate(gray_image, kernel, iterations=iterations)
        
        # Convert back to 3-channel
        result_image = cv2.cvtColor(dilated, cv2.COLOR_GRAY2BGR)
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "kernel_size": kernel_size,
            "iterations": iterations,
            "operation": "dilation"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/erosion")
async def erode_image(
    image_data: str = Form(...),
    kernel_size: int = Form(5),
    iterations: int = Form(1)
):
    """Apply morphological erosion"""
    try:
        image = decode_base64_image(image_data)
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Create structuring element
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
        
        # Apply erosion
        eroded = cv2.erode(gray_image, kernel, iterations=iterations)
        
        # Convert back to 3-channel
        result_image = cv2.cvtColor(eroded, cv2.COLOR_GRAY2BGR)
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "kernel_size": kernel_size,
            "iterations": iterations,
            "operation": "erosion"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/opening")
async def opening_image(
    image_data: str = Form(...),
    kernel_size: int = Form(5),
    iterations: int = Form(1)
):
    """Apply morphological opening (erosion followed by dilation)"""
    try:
        image = decode_base64_image(image_data)
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Create structuring element
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
        
        # Apply opening
        opened = cv2.morphologyEx(gray_image, cv2.MORPH_OPEN, kernel, iterations=iterations)
        
        # Convert back to 3-channel
        result_image = cv2.cvtColor(opened, cv2.COLOR_GRAY2BGR)
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "kernel_size": kernel_size,
            "iterations": iterations,
            "operation": "opening"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/closing")
async def closing_image(
    image_data: str = Form(...),
    kernel_size: int = Form(5),
    iterations: int = Form(1)
):
    """Apply morphological closing (dilation followed by erosion)"""
    try:
        image = decode_base64_image(image_data)
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Create structuring element
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
        
        # Apply closing
        closed = cv2.morphologyEx(gray_image, cv2.MORPH_CLOSE, kernel, iterations=iterations)
        
        # Convert back to 3-channel
        result_image = cv2.cvtColor(closed, cv2.COLOR_GRAY2BGR)
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "kernel_size": kernel_size,
            "iterations": iterations,
            "operation": "closing"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/edge-detection")
async def edge_detection(
    image_data: str = Form(...),
    low_threshold: int = Form(50),
    high_threshold: int = Form(150),
    aperture_size: int = Form(3),
    l2_gradient: bool = Form(False)
):
    """Apply Canny edge detection"""
    try:
        image = decode_base64_image(image_data)
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray_image, (5, 5), 0)
        
        # Apply Canny edge detection
        edges = cv2.Canny(blurred, low_threshold, high_threshold, 
                         apertureSize=aperture_size, L2gradient=l2_gradient)
        
        # Convert to 3-channel for display
        result_image = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        
        return {
            "processed_image": encode_image_to_base64(result_image),
            "low_threshold": low_threshold,
            "high_threshold": high_threshold,
            "aperture_size": aperture_size,
            "l2_gradient": l2_gradient,
            "operation": "edge_detection"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# BATCH PROCESSING ENDPOINTS
# =============================================================================

@app.post("/api/batch-process")
async def batch_process(
    files: List[UploadFile] = File(...),
    operation: str = Form(...),
    parameters: str = Form("{}")
):
    """Process multiple images with the same operation"""
    try:
        params = json.loads(parameters)
        results = []
        
        for file in files:
            # Read image
            contents = await file.read()
            nparr = np.frombuffer(contents, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                continue
            
            # Process based on operation
            if operation == "grayscale":
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                processed = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
            elif operation == "blur":
                kernel_size = params.get("kernel_size", 15)
                if kernel_size % 2 == 0:
                    kernel_size += 1
                processed = cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)
            elif operation == "edge_detection":
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray, params.get("low", 50), params.get("high", 150))
                processed = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
            else:
                processed = image
            
            results.append({
                "filename": file.filename,
                "processed_image": encode_image_to_base64(processed),
                "status": "success"
            })
        
        return {
            "total_processed": len(results),
            "operation": operation,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@app.get("/api/operations")
async def get_available_operations():
    """Get list of all available operations"""
    return {
        "getting_started": ["load-image", "dimensions"],
        "grayscaling": ["grayscale", "compare-dimensions"],
        "color_spaces": ["rgb-channels", "hsv-convert", "color-manipulation"],
        "drawing": ["draw-shapes", "add-text"],
        "transformations": ["translate", "rotate", "flip"],
        "scaling_resizing": ["resize", "pyramid", "crop"],
        "arithmetic_bitwise": ["arithmetic", "bitwise"],
        "filtering": ["blur", "sharpen", "denoise"],
        "thresholding": ["threshold", "adaptive-threshold"],
        "morphology_edges": ["dilation", "erosion", "opening", "closing", "edge-detection"],
        "batch": ["batch-process"]
    }

@app.get("/api/parameters/{operation}")
async def get_operation_parameters(operation: str):
    """Get parameters for a specific operation"""
    parameters_map = {
        "rotate": {"angle": "float", "scale": "float"},
        "blur": {"blur_type": "str", "kernel_size": "int", "sigma_x": "float", "sigma_y": "float"},
        "threshold": {"threshold_value": "int", "max_value": "int", "threshold_type": "str"},
        "resize": {"scale_factor": "float", "interpolation": "str"},
        "edge_detection": {"low_threshold": "int", "high_threshold": "int"},
        "arithmetic": {"operation": "str", "value": "int"},
        "bitwise": {"operation": "str", "mask_type": "str"},
        "color_manipulation": {"hue_shift": "int", "saturation_factor": "float", "value_factor": "float"},
        "crop": {"x": "int", "y": "int", "width": "int", "height": "int"},
        "translate": {"tx": "int", "ty": "int"},
        "flip": {"flip_code": "int"},
        "dilation": {"kernel_size": "int", "iterations": "int"},
        "erosion": {"kernel_size": "int", "iterations": "int"},
        "opening": {"kernel_size": "int", "iterations": "int"},
        "closing": {"kernel_size": "int", "iterations": "int"},
        "sharpen": {"strength": "float"},
        "denoise": {"method": "str", "h": "float"},
        "adaptive_threshold": {"max_value": "int", "adaptive_method": "str", "threshold_type": "str", "block_size": "int", "c": "int"}
    }
    
    return parameters_map.get(operation, {})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)