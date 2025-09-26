VisionLab Pro
Overview

Welcome to the OpenCV Image Processing Studio! This is a comprehensive desktop application designed to cover all 10 OpenCV laboratory topics. It provides a powerful platform for performing image processing operations with an intuitive, modern UI, built using Electron.js for the frontend and FastAPI with OpenCV for the backend.

This tool is perfect for learning and experimenting with various image processing techniques and is designed for both beginners and advanced users alike.

Key Features
Frontend (Electron.js)

Modern UI: Glassmorphism design with smooth animations.

Side-by-Side Comparison: View original vs processed images.

Real-Time Parameter Controls: Adjustable sliders and dropdowns for dynamic changes.

Batch Processing: Drag-and-drop support for processing multiple images at once.

Keyboard Shortcuts & Context Menus: Enhance the user experience with quick access options.

Cross-Platform: Works seamlessly on Windows, macOS, and Linux.

Backend (FastAPI + OpenCV)

Comprehensive API Coverage: All 10 OpenCV topics available as backend operations.

Complete Image Processing Operations:

Getting Started: Load, display, and adjust image dimensions.

Grayscaling: Convert color to grayscale and compare dimensions.

Color Spaces: RGB channels, HSV conversion, and manipulation.

Drawing & Shapes: Add shapes and text annotations.

Transformations: Translation, rotation, flipping operations.

Scaling & Resizing: Multiple interpolations, pyramids, and cropping.

Arithmetic & Bitwise: Perform mathematical pixel operations.

Filtering & Enhancement: Blur, sharpen, and denoise images.

Thresholding: Binary and adaptive thresholding.

Morphology & Edge Detection: Dilation, erosion, and Canny edge detection.

Key Features Implemented

✅ All 10 OpenCV Topics with full implementation for image processing.

✅ Batch Processing: Process multiple images simultaneously.

✅ Side-by-Side Comparison: View original and processed images side-by-side.

✅ Multiple Export Formats: Export in PNG, JPG, and PDF report formats.

✅ Real-Time Parameter Adjustment: Use sliders for live editing of image processing parameters.

✅ Professional Desktop Application: Native menus, file dialogs, and keyboard shortcuts.

✅ Error Handling & Fallbacks: Graceful degradation if the backend is unavailable.

✅ Memory Management: Efficient image handling and cleanup.

Architecture

Frontend: Built with Electron.js using HTML5, CSS3, and JavaScript for a responsive, cross-platform UI.

Backend: FastAPI serving OpenCV image processing operations through REST API.

Communication: HTTP requests with base64 image encoding for seamless image transfer.

File Handling: Native file system integration via Electron APIs.

Packaging: Electron Builder used for packaging and distribution across platforms.

Installation & Setup
Prerequisites

Node.js (for the frontend)

Python (for the backend)

Installation Steps

Install Frontend Dependencies:

npm install


Install Backend Dependencies:

pip install -r backend/requirements.txt


Run the Application:

Start the app with:

npm start


This will start both the frontend and backend servers.

Build Distribution:

To build the application for all platforms:

npm run build

Professional Features

Native OS Integration: File associations and system notifications.

Keyboard Shortcuts:

Ctrl+O: Open image

Ctrl+S: Save image

Ctrl+B: Batch process

Context Menus: Right-click on images for additional options.

Auto-Save: Backup processed images automatically.

Performance Monitoring: Measure and display processing times.

Welcome Tutorial: Guided introduction for new users to get started.

Documentation & API

The backend API is fully documented, with clear endpoints for each image processing operation. For more information, please refer to the API documentation inside the backend/docs folder.

Conclusion

The OpenCV Image Processing Studio is a fully-featured desktop application that simplifies working with OpenCV. With an intuitive UI, robust backend, and powerful image processing capabilities, it’s an excellent tool for both learning and real-world applications. Whether you’re experimenting with image processing algorithms or using the tool for professional work, this application is designed to meet your needs.

License

This project is licensed under the MIT License - see the LICENSE
 file for details.
