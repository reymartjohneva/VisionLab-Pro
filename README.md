<div align="center">

# 🔬 VisionLab Pro

### Professional OpenCV Image Processing Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-Latest-47848F?logo=electron)](https://www.electronjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.8+-5C3EE8?logo=opencv)](https://opencv.org/)

**A comprehensive desktop application for image processing with an intuitive, modern interface**

[Features](#-key-features) • [Installation](#-installation--setup) • [Documentation](#-documentation) • [Architecture](#-architecture)

---

</div>

## 📋 Overview

Welcome to **VisionLab Pro** – your complete OpenCV Image Processing Studio! This powerful desktop application covers all 10 OpenCV laboratory topics, providing an intuitive platform for performing advanced image processing operations. Built with Electron.js for a seamless cross-platform experience and FastAPI + OpenCV for robust backend processing.

Perfect for students, researchers, and professionals looking to experiment with cutting-edge image processing techniques.

---

## ✨ Key Features

### 🎨 Frontend (Electron.js)

- **Modern Glassmorphism UI** – Beautiful, smooth animations and contemporary design
- **Side-by-Side Comparison** – Instantly compare original vs processed images
- **Real-Time Controls** – Adjustable sliders and dropdowns for dynamic parameter changes
- **Batch Processing** – Drag-and-drop support for processing multiple images simultaneously
- **Keyboard Shortcuts** – Quick access commands for enhanced productivity
- **Cross-Platform** – Seamless operation on Windows, macOS, and Linux

### ⚡ Backend (FastAPI + OpenCV)

Comprehensive API coverage for all 10 OpenCV topics:

| Topic | Operations |
|-------|-----------|
| **Getting Started** | Load, display, and adjust image dimensions |
| **Grayscaling** | Color to grayscale conversion and dimension comparison |
| **Color Spaces** | RGB channel separation, HSV conversion & manipulation |
| **Drawing & Shapes** | Shape rendering and text annotations |
| **Transformations** | Translation, rotation, and flipping operations |
| **Scaling & Resizing** | Multiple interpolation methods, pyramids, and cropping |
| **Arithmetic & Bitwise** | Mathematical pixel operations and logic |
| **Filtering & Enhancement** | Blur, sharpen, and denoise algorithms |
| **Thresholding** | Binary and adaptive thresholding techniques |
| **Morphology & Edges** | Dilation, erosion, and Canny edge detection |

---

## 🚀 Features Implemented

<table>
<tr>
<td width="50%">

✅ **All 10 OpenCV Topics** with full implementation  
✅ **Batch Processing** for multiple images  
✅ **Side-by-Side Comparison** view  
✅ **Multiple Export Formats** (PNG, JPG, PDF)  
✅ **Real-Time Parameter Adjustment**  

</td>
<td width="50%">

✅ **Professional Desktop App** with native menus  
✅ **Error Handling & Fallbacks**  
✅ **Memory Management** & optimization  
✅ **Keyboard Shortcuts** integration  
✅ **Context Menus** for quick actions  

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VisionLab Pro                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (Electron.js)                                 │
│  ├─ HTML5 + CSS3 + JavaScript                          │
│  ├─ Glassmorphism UI Design                            │
│  └─ Native OS Integration                              │
│                                                          │
│                        ↕ HTTP/REST                      │
│                                                          │
│  Backend (FastAPI)                                      │
│  ├─ OpenCV Image Processing                            │
│  ├─ Base64 Image Encoding                              │
│  └─ REST API Endpoints                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Technology Stack:**
- **Frontend:** Electron.js with modern web technologies
- **Backend:** FastAPI serving OpenCV operations via REST API
- **Communication:** HTTP requests with base64 image encoding
- **File Handling:** Native file system integration via Electron APIs
- **Packaging:** Electron Builder for cross-platform distribution

---

## 📦 Installation & Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v16 or higher) – [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) – [Download](https://www.python.org/)
- **npm** or **yarn** package manager

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/visionlab-pro.git
   cd visionlab-pro
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Run the Application**
   ```bash
   npm start
   ```
   This command will start both frontend and backend servers automatically.

5. **Build for Distribution** *(Optional)*
   ```bash
   npm run build
   ```
   Creates installers for Windows, macOS, and Linux.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open image |
| `Ctrl+S` | Save processed image |
| `Ctrl+B` | Start batch processing |
| `Ctrl+Z` | Undo last operation |
| `Ctrl+Q` | Quit application |

---

## 🎯 Professional Features

<table>
<tr>
<td width="50%">

### 🖥️ Native Integration
- File associations
- System notifications
- OS-specific optimizations

### 🎨 User Experience
- Context menus
- Auto-save functionality
- Welcome tutorial

</td>
<td width="50%">

### ⚡ Performance
- Memory optimization
- Processing time monitoring
- Efficient image handling

### 🛡️ Reliability
- Error handling
- Graceful degradation
- Automatic backups

</td>
</tr>
</table>

---

## 📚 Documentation

The backend API is fully documented with clear endpoints for each image processing operation.

- **API Documentation:** `backend/docs/`
- **User Guide:** `docs/user-guide.md`
- **Developer Guide:** `docs/developer-guide.md`

For detailed API reference, visit the built-in documentation at `http://localhost:8000/docs` when the backend is running.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Acknowledgments

- OpenCV community for the powerful image processing library
- Electron.js team for the cross-platform framework
- FastAPI for the modern, high-performance backend framework

---

<div align="center">

**Made with ❤️ by the VisionLab Team**

[Report Bug](https://github.com/yourusername/visionlab-pro/issues) • [Request Feature](https://github.com/yourusername/visionlab-pro/issues)

⭐ Star us on GitHub if you find this project helpful!

</div>
