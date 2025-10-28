// Global variables for multi-image processing
let loadedImages = [];
let processedImages = [];
let currentOperation = null;
let currentView = 'grid';
let selectedImageIndices = [];
let BACKEND_URL = 'http://localhost:8000';
let processingQueue = [];
let isProcessing = false;
let operationQueue = []; // Queue for multiple sequential operations
let excludedFromQueue = ['dimensions', 'compare-dimensions', 'rgb-channels', 'hsv-convert']; // Operations that can't be queued

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkBackendConnection();
    updateStatus('Multi-image processing ready');
    markExcludedOperations();
});

function setupEventListeners() {
    // Multi-image input handler
    document.getElementById('imageInput').addEventListener('change', handleMultipleImageLoad);
    
    // Operation buttons
    document.querySelectorAll('.operation-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const operation = this.dataset.operation;
            selectOperation(operation, this);
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function markExcludedOperations() {
    // Add visual indicator to operations that can't be queued
    document.querySelectorAll('.operation-btn').forEach(btn => {
        const operation = btn.dataset.operation;
        if (excludedFromQueue.includes(operation)) {
            btn.style.opacity = '0.7';
            btn.title = `${btn.textContent.trim()} (Single operation only - cannot be combined)`;
        }
    });
}

async function checkBackendConnection() {
    try {
        const response = await fetch(`${BACKEND_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('backendStatus').textContent = `Connected (OpenCV ${data.opencv_version})`;
            document.getElementById('backendStatus').style.color = '#27ae60';
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        document.getElementById('backendStatus').textContent = 'Disconnected';
        document.getElementById('backendStatus').style.color = '#e74c3c';
        console.warn('Backend connection failed:', error);
        
        // Enable offline mode with mock processing
        enableOfflineMode();
    }
}

function enableOfflineMode() {
    updateStatus('Running in offline mode (demo)');
    showMessage('Backend not available - running in demo mode', 'warning');
}

function handleMultipleImageLoad(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Clear previous images
    loadedImages = [];
    processedImages = [];
    selectedImageIndices = [];

    updateStatus(`Loading ${files.length} images...`);
    showProgress(10);

    // Load all selected images
    const loadPromises = files.map((file, index) => loadSingleImage(file, index));
    
    Promise.all(loadPromises).then((imageDataArray) => {
        // Add all loaded image data to the array
        loadedImages = imageDataArray;
        
        console.log(`Successfully loaded ${loadedImages.length} images:`, loadedImages.map(img => img.name));
        updateImageGallery();
        updateImageCount(loadedImages.length);
        updateStatus(`Loaded ${loadedImages.length} images`);
        showProgress(100);
        
        // Enable process all button
        document.getElementById('processAllBtn').disabled = false;
        
        // Reset active operations
        document.querySelectorAll('.operation-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('controlsPanel').classList.remove('active');
        
        showMessage(`Successfully loaded ${loadedImages.length} images!`, 'success');
        
        setTimeout(() => {
            showProgress(0);
        }, 1000);
    }).catch(error => {
        console.error('Error loading images:', error);
        showMessage('Error loading some images', 'error');
        updateStatus('Error loading images');
        showProgress(0);
    });
}

function loadSingleImage(file, index) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = {
                id: `img_${index}_${Date.now()}`,
                name: file.name,
                size: file.size,
                type: file.type,
                src: e.target.result,
                processedSrc: null,
                selected: false,
                processing: false,
                processed: false,
                metadata: {
                    width: 0,
                    height: 0,
                    lastOperation: null,
                    processingTime: 0
                }
            };
            
            // Get image dimensions
            const img = new Image();
            img.onload = function() {
                imageData.metadata.width = img.width;
                imageData.metadata.height = img.height;
                console.log(`Loaded image ${index + 1}: ${file.name} (${img.width}x${img.height})`);
                resolve(imageData); // Return the image data instead of pushing here
            };
            img.onerror = function() {
                console.error(`Failed to load image: ${file.name}`);
                reject(new Error(`Failed to load ${file.name}`));
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            console.error(`FileReader error for: ${file.name}`);
            reject(new Error(`FileReader error for ${file.name}`));
        };
        reader.readAsDataURL(file);
    });
}

function updateImageGallery() {
    const gallery = document.getElementById('imageGallery');
    
    console.log(`Updating gallery with ${loadedImages.length} images`);
    
    if (loadedImages.length === 0) {
        gallery.innerHTML = `
            <div class="gallery-placeholder">
                <div class="placeholder-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                    </svg>
                </div>
                <h3>Load multiple images to get started</h3>
                <p>Select multiple images to process them simultaneously</p>
                <p class="format-info">Supports JPG, PNG, BMP, TIFF formats</p>
                <button class="btn btn-primary" onclick="document.getElementById('imageInput').click()">
                    <span class="btn-icon">📁</span>
                    Choose Multiple Images
                </button>
            </div>
        `;
        return;
    }

    // Automatically choose view based on number of images
    if (loadedImages.length === 1) {
        updateSingleView();
    } else {
        updateGridView();
    }
}

function updateGridView() {
    const gallery = document.getElementById('imageGallery');
    const gridHtml = loadedImages.map((image, index) => `
        <div class="image-card ${image.selected ? 'selected' : ''} ${image.processing ? 'processing' : ''}" 
             data-index="${index}" onclick="toggleImageSelection(${index})">
            <div class="image-card-header">
                <div class="image-card-title">
                    <div class="selection-checkbox ${image.selected ? 'checked' : ''}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20,6 9,17 4,12"/>
                        </svg>
                    </div>
                    <span class="image-name">${truncateFilename(image.name, 20)}</span>
                </div>
                <div class="image-actions">
                    <button class="icon-btn" onclick="event.stopPropagation(); downloadSingle(${index})" title="Download">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </button>
                    <button class="icon-btn" onclick="event.stopPropagation(); removeSingle(${index})" title="Remove">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="image-comparison">
                <div class="image-side original">
                    <div class="image-label">Original</div>
                    <div class="image-display">
                        <img src="${image.src}" alt="${image.name}">
                        ${image.processing ? '<div class="processing-overlay"><div class="spinner"></div></div>' : ''}
                    </div>
                    <div class="image-info">
                        <span class="info-item">${image.metadata.width} × ${image.metadata.height}</span>
                        <span class="info-item">${formatFileSize(image.size)}</span>
                    </div>
                </div>
                
                <div class="image-side processed">
                    <div class="image-label">Processed</div>
                    <div class="image-display">
                        ${image.processedSrc ? 
                            `<img src="${image.processedSrc}" alt="Processed ${image.name}">` :
                            `<div class="placeholder-processed">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                                </svg>
                                <span>Select operation</span>
                            </div>`
                        }
                        ${image.processing ? '<div class="processing-overlay"><div class="spinner"></div></div>' : ''}
                    </div>
                    <div class="image-info">
                        <span class="info-item">${image.metadata.lastOperation || 'No operation'}</span>
                        ${image.metadata.processingTime > 0 ? 
                            `<span class="info-item">${image.metadata.processingTime}ms</span>` : ''
                        }
                    </div>
                </div>
            </div>
            
            ${image.processed && image.metadata.lastOperation ? 
                `<div class="processing-status success">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    <span>Processed with ${image.metadata.lastOperation}</span>
                </div>` : ''
            }
        </div>
    `).join('');
    
    gallery.innerHTML = `<div class="image-grid">${gridHtml}</div>`;
    
    // Check if gallery is scrollable and update visual indicator
    setTimeout(() => checkGalleryScrollable(), 100);
}

function updateSingleView() {
    const gallery = document.getElementById('imageGallery');
    const image = loadedImages[0]; // Get the single image
    
    const singleViewHtml = `
        <div class="single-image-container">
            <div class="single-image-card ${image.selected ? 'selected' : ''} ${image.processing ? 'processing' : ''}" 
                 data-index="0" onclick="toggleImageSelection(0)">
                <div class="single-image-header">
                    <div class="single-image-title">
                        <div class="selection-checkbox ${image.selected ? 'checked' : ''}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20,6 9,17 4,12"/>
                            </svg>
                        </div>
                        <h2 class="image-name">${image.name}</h2>
                    </div>
                    <div class="single-image-actions">
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); downloadSingle(0)" title="Download">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Download
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); removeSingle(0)" title="Remove">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            Remove
                        </button>
                    </div>
                </div>
                
                <div class="single-image-comparison">
                    <div class="single-image-side original">
                        <div class="single-image-label">Original</div>
                        <div class="single-image-display">
                            <img src="${image.src}" alt="${image.name}">
                            ${image.processing ? '<div class="processing-overlay"><div class="spinner"></div></div>' : ''}
                        </div>
                        <div class="single-image-info">
                            <span class="info-item">📐 ${image.metadata.width} × ${image.metadata.height}</span>
                            <span class="info-item">💾 ${formatFileSize(image.size)}</span>
                        </div>
                    </div>
                    
                    <div class="single-image-side processed">
                        <div class="single-image-label">Processed</div>
                        <div class="single-image-display">
                            ${image.processedSrc ? 
                                `<img src="${image.processedSrc}" alt="Processed ${image.name}">` :
                                `<div class="placeholder-processed">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                                    </svg>
                                    <span>Select operation to process</span>
                                </div>`
                            }
                            ${image.processing ? '<div class="processing-overlay"><div class="spinner"></div></div>' : ''}
                        </div>
                        <div class="single-image-info">
                            <span class="info-item">🔧 ${image.metadata.lastOperation || 'No operation'}</span>
                            ${image.metadata.processingTime > 0 ? 
                                `<span class="info-item">⏱️ ${image.metadata.processingTime}ms</span>` : ''
                            }
                        </div>
                    </div>
                </div>
                
                ${image.processed && image.metadata.lastOperation ? 
                    `<div class="processing-status success">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        <span>Successfully processed with ${image.metadata.lastOperation}</span>
                    </div>` : ''
                }
            </div>
        </div>
    `;
    
    gallery.innerHTML = singleViewHtml;
    
    // Check if gallery is scrollable and update visual indicator
    setTimeout(() => checkGalleryScrollable(), 100);
}

function updateComparisonView() {
    const gallery = document.getElementById('imageGallery');
    
    // If no images are loaded, show placeholder
    if (loadedImages.length === 0) {
        gallery.innerHTML = `
            <div class="comparison-placeholder-main">
                <h3>No images to compare</h3>
                <p>Load images first, then they will appear here for comparison</p>
                <button class="btn btn-outline" onclick="toggleView('grid')">Back to Grid View</button>
            </div>
        `;
        return;
    }
    
    // Get images to compare (either selected or first two)
    let imagesToCompare = [];
    if (selectedImageIndices.length === 0) {
        imagesToCompare = loadedImages.slice(0, Math.min(2, loadedImages.length));
    } else {
        imagesToCompare = selectedImageIndices.map(index => loadedImages[index]);
    }
    
    const comparisonHtml = imagesToCompare.map((image, index) => `
        <div class="comparison-item">
            <div class="comparison-header">
                <h4>${image.name}</h4>
                <div class="comparison-controls">
                    <button class="btn btn-sm btn-primary" onclick="processSelectedImages([${index}])">
                        Process This Image
                    </button>
                </div>
            </div>
            <div class="comparison-content">
                <div class="comparison-side">
                    <div class="side-label">Original</div>
                    <img src="${image.src}" alt="${image.name}" class="comparison-image">
                    <div class="side-info">
                        ${image.metadata.width} × ${image.metadata.height}
                    </div>
                </div>
                
                <div class="comparison-divider"></div>
                
                <div class="comparison-side">
                    <div class="side-label">Dimension Analysis</div>
                    ${image.processedSrc ? 
                        `<img src="${image.processedSrc}" alt="Dimension analysis for ${image.name}" class="comparison-image">` :
                        `<div class="comparison-placeholder">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                            <span>Click Process to analyze dimensions</span>
                        </div>`
                    }
                    ${image.metadata.details ? 
                        `<div class="side-info">
                            Memory Reduction: ${image.metadata.details.size_reduction_percent.toFixed(1)}%
                        </div>` : ''
                    }
                </div>
            </div>
        </div>
    `).join('');
    
    gallery.innerHTML = `
        <div class="comparison-container">
            ${comparisonHtml}
        </div>
    `;
}

function toggleImageSelection(index) {
    const image = loadedImages[index];
    image.selected = !image.selected;
    
    if (image.selected) {
        selectedImageIndices.push(index);
    } else {
        selectedImageIndices = selectedImageIndices.filter(i => i !== index);
    }
    
    updateImageGallery();
    updateSelectedCount();
}

function updateSelectedCount() {
    const count = selectedImageIndices.length;
    document.getElementById('selectedCount').textContent = 
        `${count} image${count !== 1 ? 's' : ''} selected`;
}

function selectOperation(operation, buttonElement) {
    if (loadedImages.length === 0) {
        showMessage('Please load images first!', 'error');
        return;
    }

    // Check if operation is excluded from queue
    if (excludedFromQueue.includes(operation)) {
        // These operations run alone and clear the queue
        operationQueue = [];
        currentOperation = operation;
        document.querySelectorAll('.operation-btn').forEach(btn => btn.classList.remove('active'));
        buttonElement.classList.add('active');
        showControls(operation);
        updateSelectedCount();
        showMessage(`${operation.replace(/-/g, ' ')} selected (single operation only)`, 'info');
        return;
    }

    // For normal operations, add to queue
    if (operationQueue.includes(operation)) {
        // Remove from queue if already exists
        operationQueue = operationQueue.filter(op => op !== operation);
        buttonElement.classList.remove('active');
        showMessage(`Removed ${operation.replace(/-/g, ' ')} from operation queue`, 'info');
    } else {
        // Add to queue
        operationQueue.push(operation);
        buttonElement.classList.add('active');
        showMessage(`Added ${operation.replace(/-/g, ' ')} to operation queue (${operationQueue.length} operations)`, 'success');
    }

    // Set current operation to the last one in queue
    currentOperation = operationQueue.length > 0 ? operationQueue[operationQueue.length - 1] : null;
    
    if (operationQueue.length > 0) {
        showControls(operationQueue[operationQueue.length - 1]);
        updateOperationQueueDisplay();
    }
    
    updateSelectedCount();
}

function updateOperationQueueDisplay() {
    // Re-render controls to update queue display
    if (operationQueue.length > 0) {
        showControls(operationQueue[operationQueue.length - 1]);
    }
}

function removeFromQueue(operation) {
    operationQueue = operationQueue.filter(op => op !== operation);
    
    // Update button state
    const buttons = document.querySelectorAll('.operation-btn');
    buttons.forEach(btn => {
        if (btn.dataset.operation === operation) {
            btn.classList.remove('active');
        }
    });
    
    if (operationQueue.length === 0) {
        currentOperation = null;
        closeControls();
        showMessage('Operation queue cleared', 'info');
    } else {
        currentOperation = operationQueue[operationQueue.length - 1];
        updateOperationQueueDisplay();
        showMessage(`Removed ${operation.replace(/-/g, ' ')} from queue (${operationQueue.length} remaining)`, 'info');
    }
}

function clearOperationQueue() {
    operationQueue = [];
    currentOperation = null;
    
    // Remove all active states
    document.querySelectorAll('.operation-btn').forEach(btn => btn.classList.remove('active'));
    
    closeControls();
    showMessage('All operations cleared from queue', 'info');
}

function showControls(operation) {
    const controlsPanel = document.getElementById('controlsPanel');
    const controlsContent = document.getElementById('controlsContent');
    
    // Generate controls based on operation
    let controlsHTML = `<h3>Operation: ${operation.replace(/-/g, ' ').toUpperCase()}</h3>`;
    
    switch(operation) {
        case 'rotate':
            controlsHTML += `
                <div class="control-group">
                    <label>Rotation Angle: <span id="rotateValue">45</span>°</label>
                    <input type="range" id="rotateSlider" min="0" max="360" value="45" 
                           oninput="updateRotation(this.value)">
                </div>
                <div class="control-group">
                    <label>Scale Factor: <span id="scaleValue">1.0</span></label>
                    <input type="range" id="scaleSlider" min="0.1" max="2.0" value="1.0" step="0.1"
                           oninput="updateRotation()">
                </div>
            `;
            break;
        case 'blur':
            controlsHTML += `
                <div class="control-group">
                    <label>Blur Type</label>
                    <select id="blurType" onchange="updateBlur()">
                        <option value="gaussian">Gaussian Blur</option>
                        <option value="motion">Motion Blur</option>
                        <option value="median">Median Filter</option>
                        <option value="bilateral">Bilateral Filter</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Kernel Size: <span id="blurValue">15</span></label>
                    <input type="range" id="blurSlider" min="3" max="31" value="15" step="2"
                           oninput="updateBlur()">
                </div>
            `;
            break;
        case 'threshold':
            controlsHTML += `
                <div class="control-group">
                    <label>Threshold Value: <span id="threshValue">127</span></label>
                    <input type="range" id="threshSlider" min="0" max="255" value="127"
                           oninput="updateThreshold(this.value)">
                </div>
                <div class="control-group">
                    <label>Threshold Type</label>
                    <select id="threshType" onchange="updateThreshold()">
                        <option value="binary">Binary</option>
                        <option value="binary_inv">Binary Inverted</option>
                        <option value="trunc">Truncate</option>
                        <option value="tozero">To Zero</option>
                        <option value="tozero_inv">To Zero Inverted</option>
                    </select>
                </div>
            `;
            break;
        case 'resize':
            controlsHTML += `
                <div class="control-group">
                    <label>Scale Factor: <span id="scaleResizeValue">0.5</span>x</label>
                    <input type="range" id="scaleResizeSlider" min="0.1" max="2.0" value="0.5" step="0.1"
                           oninput="updateResize(this.value)">
                </div>
                <div class="control-group">
                    <label>Interpolation Method</label>
                    <select id="interpMethod" onchange="updateResize()">
                        <option value="linear">Linear</option>
                        <option value="cubic">Cubic</option>
                        <option value="nearest">Nearest Neighbor</option>
                        <option value="lanczos">Lanczos</option>
                    </select>
                </div>
            `;
            break;
        case 'edge-detection':
            controlsHTML += `
                <div class="control-group">
                    <label>Lower Threshold: <span id="edgeLowValue">50</span></label>
                    <input type="range" id="edgeLowSlider" min="0" max="255" value="50"
                           oninput="updateEdgeDetection()">
                </div>
                <div class="control-group">
                    <label>Upper Threshold: <span id="edgeHighValue">150</span></label>
                    <input type="range" id="edgeHighSlider" min="0" max="255" value="150"
                           oninput="updateEdgeDetection()">
                </div>
            `;
            break;
        case 'dimensions':
            controlsHTML += `
                <p>Display comprehensive information about the image dimensions and properties.</p>
                <p>This will show width, height, channels, total pixels, data type, aspect ratio, and estimated memory size.</p>
                <p class="info-note">📊 No parameters needed - click Process to view dimensions.</p>
            `;
            break;
        case 'rgb-channels':
            controlsHTML += `
                <p>This operation will extract individual Red, Green, and Blue channels from the image.</p>
                <p>Each channel will be displayed separately to show the color distribution.</p>
            `;
            break;
        case 'hsv-convert':
            controlsHTML += `
                <p>Convert the image to HSV (Hue, Saturation, Value) color space.</p>
                <p>This will show the hue, saturation, and value channels separately.</p>
            `;
            break;
        case 'color-manipulation':
            controlsHTML += `
                <div class="control-group">
                    <label>Hue Shift: <span id="hueValue">0</span></label>
                    <input type="range" id="hueSlider" min="-180" max="180" value="0"
                           oninput="updateColorManipulation()">
                </div>
                <div class="control-group">
                    <label>Saturation: <span id="satValue">1.0</span></label>
                    <input type="range" id="satSlider" min="0" max="3" value="1.0" step="0.1"
                           oninput="updateColorManipulation()">
                </div>
                <div class="control-group">
                    <label>Value/Brightness: <span id="valValue">1.0</span></label>
                    <input type="range" id="valSlider" min="0" max="3" value="1.0" step="0.1"
                           oninput="updateColorManipulation()">
                </div>
            `;
            break;
        case 'crop':
            controlsHTML += `
                <div class="control-group">
                    <label>X Position: <span id="cropXValue">100</span></label>
                    <input type="range" id="cropXSlider" min="0" max="500" value="100"
                           oninput="updateCrop()">
                </div>
                <div class="control-group">
                    <label>Y Position: <span id="cropYValue">100</span></label>
                    <input type="range" id="cropYSlider" min="0" max="500" value="100"
                           oninput="updateCrop()">
                </div>
                <div class="control-group">
                    <label>Width: <span id="cropWValue">200</span></label>
                    <input type="range" id="cropWSlider" min="50" max="400" value="200"
                           oninput="updateCrop()">
                </div>
                <div class="control-group">
                    <label>Height: <span id="cropHValue">200</span></label>
                    <input type="range" id="cropHSlider" min="50" max="400" value="200"
                           oninput="updateCrop()">
                </div>
            `;
            break;
        case 'add-text':
            controlsHTML += `
                <div class="control-group">
                    <label>Text Content</label>
                    <input type="text" id="textContent" value="OpenCV Text" 
                           placeholder="Enter text to add"
                           oninput="updateTextPreview()">
                </div>
                <div class="control-group">
                    <label>X Position: <span id="textXValue">50</span></label>
                    <input type="range" id="textXSlider" min="0" max="800" value="50"
                           oninput="updateTextPosition()">
                </div>
                <div class="control-group">
                    <label>Y Position: <span id="textYValue">50</span></label>
                    <input type="range" id="textYSlider" min="0" max="800" value="50"
                           oninput="updateTextPosition()">
                </div>
                <div class="control-group">
                    <label>Font Scale: <span id="fontScaleValue">1.0</span></label>
                    <input type="range" id="fontScaleSlider" min="0.5" max="5.0" value="1.0" step="0.1"
                           oninput="updateTextFont()">
                </div>
                <div class="control-group">
                    <label>Text Color</label>
                    <select id="textColorSelect" onchange="updateTextColor()">
                        <option value="#FFFFFF">White</option>
                        <option value="#000000">Black</option>
                        <option value="#FF0000">Red</option>
                        <option value="#00FF00">Green</option>
                        <option value="#0000FF">Blue</option>
                        <option value="#FFFF00">Yellow</option>
                        <option value="#FF00FF">Magenta</option>
                        <option value="#00FFFF" selected>Cyan</option>
                        <option value="#FFA500">Orange</option>
                        <option value="#800080">Purple</option>
                    </select>
                </div>
            `;
            break;
        case 'translate':
            controlsHTML += `
                <div class="control-group">
                    <label>Horizontal Translation (X): <span id="translateXValue">50</span>px</label>
                    <input type="range" id="translateXSlider" min="-500" max="500" value="50"
                           oninput="updateTranslate()">
                </div>
                <div class="control-group">
                    <label>Vertical Translation (Y): <span id="translateYValue">50</span>px</label>
                    <input type="range" id="translateYSlider" min="-500" max="500" value="50"
                           oninput="updateTranslate()">
                </div>
                <div class="info-note" style="margin-top: 10px; padding: 10px; background: rgba(0, 255, 255, 0.1); border-radius: 4px; font-size: 12px;">
                    <strong>ℹ️ Translation Info:</strong><br>
                    • Positive X: Move right | Negative X: Move left<br>
                    • Positive Y: Move down | Negative Y: Move up
                </div>
            `;
            break;
        case 'flip':
            controlsHTML += `
                <div class="control-group">
                    <label>Flip Direction</label>
                    <select id="flipDirection" onchange="updateFlip()">
                        <option value="1">Horizontal (Left ↔ Right)</option>
                        <option value="0">Vertical (Up ↔ Down)</option>
                        <option value="-1">Both (Horizontal + Vertical)</option>
                    </select>
                </div>
                <div class="info-note" style="margin-top: 10px; padding: 10px; background: rgba(0, 255, 255, 0.1); border-radius: 4px; font-size: 12px;">
                    <strong>ℹ️ Flip Options:</strong><br>
                    • <strong>Horizontal:</strong> Mirror image left to right<br>
                    • <strong>Vertical:</strong> Mirror image top to bottom<br>
                    • <strong>Both:</strong> Rotate image 180°
                </div>
            `;
            break;
        default:
            controlsHTML += '<p>No additional controls needed for this operation.</p>';
    }

    // Add operation queue display if there are multiple operations
    if (operationQueue.length > 1) {
        controlsHTML += `
            <div class="operation-queue" style="margin-top: 20px; padding: 15px; background: rgba(0, 255, 255, 0.1); border-radius: 8px; border: 1px solid rgba(0, 255, 255, 0.3);">
                <h4 style="color: #00ffff; margin-bottom: 10px; font-size: 14px;">Operation Queue (${operationQueue.length} operations):</h4>
                <div class="queue-items" style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${operationQueue.map((op, index) => `
                        <div class="queue-item" style="background: rgba(0, 255, 255, 0.2); padding: 6px 12px; border-radius: 4px; font-size: 12px; color: #fff; display: flex; align-items: center; gap: 6px;">
                            <span>${index + 1}. ${op.replace(/-/g, ' ')}</span>
                            <button onclick="removeFromQueue('${op}')" style="background: none; border: none; color: #ff4444; cursor: pointer; font-size: 16px; padding: 0; line-height: 1;">×</button>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-outline" onclick="clearOperationQueue()" style="margin-top: 10px; font-size: 12px; padding: 6px 12px;">
                    Clear Queue
                </button>
            </div>
        `;
    }

    // Add processing buttons
    controlsHTML += `
        <div class="control-actions">
            <button class="btn btn-primary" onclick="processSelectedImages()">
                <span class="btn-icon">⚡</span>
                ${operationQueue.length > 1 ? `Process with ${operationQueue.length} Operations` : 'Process Selected Images'}
            </button>
            <button class="btn btn-secondary" onclick="processAllImages()">
                <span class="btn-icon">🔄</span>
                ${operationQueue.length > 1 ? `Process All with ${operationQueue.length} Operations` : 'Process All Images'}
            </button>
        </div>
    `;

    controlsContent.innerHTML = controlsHTML;
    controlsPanel.classList.add('active');
}

async function processAllImages() {
    if (!currentOperation) {
        showMessage('Please select an operation first!', 'error');
        return;
    }
    
    if (loadedImages.length === 0) {
        showMessage('No images to process!', 'error');
        return;
    }

    const imagesToProcess = loadedImages.map((_, index) => index);
    await processSelectedImages(imagesToProcess);
}

async function processSelectedImages(imageIndices = null) {
    if (!currentOperation && operationQueue.length === 0) {
        showMessage('Please select an operation first!', 'error');
        return;
    }

    const indices = imageIndices || selectedImageIndices;
    
    if (indices.length === 0) {
        showMessage('Please select images to process!', 'error');
        return;
    }

    isProcessing = true;
    const operationText = operationQueue.length > 1 
        ? `${operationQueue.length} operations (${operationQueue.join(' → ')})` 
        : currentOperation;
    updateStatus(`Processing ${indices.length} images with ${operationText}...`);

    try {
        let processed = 0;
        const total = indices.length;

        for (const index of indices) {
            const image = loadedImages[index];
            image.processing = true;
            updateImageGallery();

            const startTime = Date.now();
            
            try {
                // Process with operation queue if multiple operations
                if (operationQueue.length > 1) {
                    let currentSrc = image.processedSrc || image.src;
                    const operationsApplied = [];
                    
                    for (const operation of operationQueue) {
                        // Create temporary image object for processing
                        const tempImage = {
                            src: currentSrc,
                            name: image.name
                        };
                        
                        const result = await processSingleImage(tempImage, operation);
                        
                        if (result.success) {
                            currentSrc = result.processedImage;
                            operationsApplied.push(operation);
                        } else {
                            throw new Error(`Failed at operation: ${operation}`);
                        }
                    }
                    
                    // Update image with final result
                    image.processedSrc = currentSrc;
                    image.processed = true;
                    image.metadata.lastOperation = operationsApplied.join(' → ');
                    image.metadata.processingTime = Date.now() - startTime;
                    image.metadata.operationChain = operationsApplied;
                } else {
                    // Single operation processing
                    const result = await processSingleImage(image, currentOperation);
                    
                    if (result.success) {
                        image.processedSrc = result.processedImage;
                        image.processed = true;
                        image.metadata.lastOperation = currentOperation;
                        image.metadata.processingTime = Date.now() - startTime;
                    } else {
                        throw new Error(result.error || 'Processing failed');
                    }
                }
            } catch (error) {
                console.error(`Error processing ${image.name}:`, error);
                showMessage(`Error processing ${image.name}: ${error.message}`, 'error');
            }

            image.processing = false;
            processed++;
            
            const progress = Math.round((processed / total) * 100);
            showProgress(progress);
            updateImageGallery();
        }

        updateStatus(`Successfully processed ${processed}/${total} images`);
        showMessage(`Processing complete! ${processed}/${total} images processed successfully.`, 'success');
        
        setTimeout(() => {
            showProgress(0);
            updateStatus('Ready for multi-image processing');
        }, 2000);

    } catch (error) {
        console.error('Batch processing error:', error);
        showMessage(`Batch processing failed: ${error.message}`, 'error');
        updateStatus('Processing failed');
    } finally {
        isProcessing = false;
        showProgress(0);
    }
}

async function processSingleImage(image, operation) {
    try {
        const formData = new FormData();
        formData.append('image_data', image.src.split(',')[1]);

        // Add operation-specific parameters
        addOperationParameters(formData, operation);

        // For compare-dimensions, check if grayscale version exists
        if (operation === 'compare-dimensions' && !image.grayscaleData) {
            throw new Error('Please convert to grayscale first before comparing dimensions');
        }

        const response = await fetch(`${BACKEND_URL}/api/${operation}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (operation === 'dimensions') {
            // Create visualization of image dimensions and properties
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 800;
            canvas.height = 500;
            
            // Set background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add title
            ctx.fillStyle = '#00ffff';
            ctx.font = 'bold 24px "JetBrains Mono"';
            ctx.fillText('Image Dimensions & Properties', 40, 50);
            
            // Create a nice bordered box
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(40, 80, 720, 380);
            
            // Display dimension information
            ctx.font = '18px "JetBrains Mono"';
            let yPos = 130;
            const lineHeight = 45;
            
            // Width
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Width:', 80, yPos);
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 18px "JetBrains Mono"';
            ctx.fillText(`${result.width} pixels`, 300, yPos);
            
            // Height
            yPos += lineHeight;
            ctx.font = '18px "JetBrains Mono"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Height:', 80, yPos);
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 18px "JetBrains Mono"';
            ctx.fillText(`${result.height} pixels`, 300, yPos);
            
            // Channels
            yPos += lineHeight;
            ctx.font = '18px "JetBrains Mono"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Channels:', 80, yPos);
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 18px "JetBrains Mono"';
            const channelText = result.channels === 3 ? '3 (RGB)' : result.channels === 1 ? '1 (Grayscale)' : result.channels;
            ctx.fillText(channelText, 300, yPos);
            
            // Total Pixels
            yPos += lineHeight;
            ctx.font = '18px "JetBrains Mono"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Total Pixels:', 80, yPos);
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 18px "JetBrains Mono"';
            ctx.fillText(result.total_pixels.toLocaleString(), 300, yPos);
            
            // Data Type
            yPos += lineHeight;
            ctx.font = '18px "JetBrains Mono"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Data Type:', 80, yPos);
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 18px "JetBrains Mono"';
            ctx.fillText(result.data_type, 300, yPos);
            
            // Aspect Ratio
            yPos += lineHeight;
            ctx.font = '18px "JetBrains Mono"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Aspect Ratio:', 80, yPos);
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 18px "JetBrains Mono"';
            const aspectRatio = (result.width / result.height).toFixed(2);
            ctx.fillText(`${aspectRatio}:1`, 300, yPos);
            
            // Memory Size (approximate)
            yPos += lineHeight;
            ctx.font = '18px "JetBrains Mono"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Memory Size:', 80, yPos);
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 18px "JetBrains Mono"';
            const memoryBytes = result.total_pixels * result.channels;
            const memorySizeMB = (memoryBytes / (1024 * 1024)).toFixed(2);
            ctx.fillText(`~${memorySizeMB} MB`, 300, yPos);
            
            // Add a decorative line at the bottom
            yPos += 50;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(80, yPos);
            ctx.lineTo(720, yPos);
            ctx.stroke();
            
            return {
                success: true,
                processedImage: canvas.toDataURL('image/png'),
                metadata: {
                    operation: 'dimensions',
                    dimensions: result
                }
            };
        }

        if (operation === 'grayscale') {
            // Store grayscale data for later comparison
            image.grayscaleData = result.processed_image;
            return {
                success: true,
                processedImage: `data:image/png;base64,${result.processed_image}`,
                metadata: {
                    operation: 'grayscale'
                }
            };
        }

        if (operation === 'compare-dimensions') {
            // Create visualization of pixel values
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 800;
            canvas.height = 400;
            
            // Set background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add title
            ctx.fillStyle = '#00ffff';
            ctx.font = '16px "JetBrains Mono"';
            ctx.fillText('Grayscale Image Dimensions', 20, 30);
            ctx.fillText('Remember RGB color images have 3 dimensions, one for each primary color.', 20, 60);
            ctx.fillText('Grayscale just has 1, which is the intensity of gray.', 20, 90);

            // Display pixel matrix
            const pixelData = result.pixel_values;
            const cellSize = 30;
            const startX = 20;
            const startY = 120;

            ctx.font = '12px "JetBrains Mono"';
            
            for (let i = 0; i < Math.min(pixelData.length, 15); i++) {
                for (let j = 0; j < Math.min(pixelData[i].length, 20); j++) {
                    const value = pixelData[i][j];
                    ctx.fillStyle = `rgb(${value},${value},${value})`;
                    ctx.fillRect(startX + j * cellSize, startY + i * cellSize, cellSize - 1, cellSize - 1);
                    
                    ctx.fillStyle = '#00ffff';
                    ctx.fillText(value.toString(), startX + j * cellSize + 5, startY + i * cellSize + 20);
                }
            }

            return {
                success: true,
                processedImage: canvas.toDataURL('image/png'),
                metadata: {
                    operation: 'dimension_comparison'
                }
            };
        }

        if (operation === 'rgb-channels') {
            // Create a composite image showing all RGB channels
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 1200;
            canvas.height = 400;
            
            // Set background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add title
            ctx.fillStyle = '#00ffff';
            ctx.font = '20px "JetBrains Mono"';
            ctx.fillText('RGB Channel Extraction', 20, 30);
            
            // Display channel information
            ctx.font = '14px "JetBrains Mono"';
            ctx.fillStyle = '#ff4444';
            ctx.fillText(`Red Channel (Mean: ${result.channel_intensities.red_mean})`, 20, 80);
            
            ctx.fillStyle = '#44ff44';
            ctx.fillText(`Green Channel (Mean: ${result.channel_intensities.green_mean})`, 420, 80);
            
            ctx.fillStyle = '#4444ff';
            ctx.fillText(`Blue Channel (Mean: ${result.channel_intensities.blue_mean})`, 820, 80);
            
            // Load and display the three channel images side by side
            const promises = [];
            const channels = ['red', 'green', 'blue'];
            const positions = [20, 420, 820];
            
            channels.forEach((channel, index) => {
                const img = new Image();
                const promise = new Promise((resolve) => {
                    img.onload = () => {
                        ctx.drawImage(img, positions[index], 100, 350, 250);
                        resolve();
                    };
                    img.src = `data:image/png;base64,${result.channels[channel]}`;
                });
                promises.push(promise);
            });
            
            await Promise.all(promises);
            
            return {
                success: true,
                processedImage: canvas.toDataURL('image/png'),
                metadata: {
                    operation: 'rgb_channel_extraction',
                    channel_intensities: result.channel_intensities
                }
            };
        }

        if (operation === 'hsv-convert') {
            // Create a composite image showing HSV conversion
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 1600;
            canvas.height = 400;
            
            // Set background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add title
            ctx.fillStyle = '#00ffff';
            ctx.font = '20px "JetBrains Mono"';
            ctx.fillText('HSV Color Space Conversion', 20, 30);
            
            // Channel labels
            ctx.font = '14px "JetBrains Mono"';
            ctx.fillStyle = '#ffff00';
            ctx.fillText('HSV Image', 20, 80);
            ctx.fillText('Hue Channel', 320, 80);
            ctx.fillText('Saturation Channel', 620, 80);
            ctx.fillText('Value Channel', 920, 80);
            
            // Load and display the images
            const images = [
                { src: result.hsv_image, x: 20 },
                { src: result.hue_channel, x: 320 },
                { src: result.saturation_channel, x: 620 },
                { src: result.value_channel, x: 920 }
            ];
            
            const promises = images.map(imgData => {
                const img = new Image();
                return new Promise((resolve) => {
                    img.onload = () => {
                        ctx.drawImage(img, imgData.x, 100, 280, 250);
                        resolve();
                    };
                    img.src = `data:image/png;base64,${imgData.src}`;
                });
            });
            
            await Promise.all(promises);
            
            return {
                success: true,
                processedImage: canvas.toDataURL('image/png'),
                metadata: {
                    operation: 'hsv_conversion'
                }
            };
        }

        // For other operations
        return {
            success: true,
            processedImage: `data:image/png;base64,${result.processed_image || result.processedImage}`,
            metadata: result
        };

    } catch (error) {
        console.error('Processing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Mock processing for demo when backend is not available
async function mockProcessImage(image, operation) {
    return new Promise(resolve => {
        setTimeout(() => {
            // Create a simple mock processed image (just return original for demo)
            resolve({
                success: true,
                processedImage: image.src,
                metadata: { operation: operation }
            });
        }, Math.random() * 1000 + 500); // Random delay between 500-1500ms
    });
}

function addOperationParameters(formData, operation) {
    switch(operation) {
        case 'rotate':
            const angle = document.getElementById('rotateSlider')?.value || 45;
            const scale = document.getElementById('scaleSlider')?.value || 1.0;
            formData.append('angle', angle);
            formData.append('scale', scale);
            break;
        case 'blur':
            const blurType = document.getElementById('blurType')?.value || 'gaussian';
            const kernelSize = document.getElementById('blurSlider')?.value || 15;
            formData.append('blur_type', blurType);
            formData.append('kernel_size', kernelSize);
            break;
        case 'threshold':
            const threshValue = document.getElementById('threshSlider')?.value || 127;
            const threshType = document.getElementById('threshType')?.value || 'binary';
            formData.append('threshold_value', threshValue);
            formData.append('threshold_type', threshType);
            formData.append('max_value', 255);
            break;
        case 'resize':
            const scaleFactor = document.getElementById('scaleResizeSlider')?.value || 0.5;
            const interpMethod = document.getElementById('interpMethod')?.value || 'linear';
            formData.append('scale_factor', scaleFactor);
            formData.append('interpolation', interpMethod);
            break;
        case 'edge-detection':
            const lowThresh = document.getElementById('edgeLowSlider')?.value || 50;
            const highThresh = document.getElementById('edgeHighSlider')?.value || 150;
            formData.append('low_threshold', lowThresh);
            formData.append('high_threshold', highThresh);
            break;
        case 'color-manipulation':
            const hueShift = document.getElementById('hueSlider')?.value || 0;
            const satFactor = document.getElementById('satSlider')?.value || 1.0;
            const valFactor = document.getElementById('valSlider')?.value || 1.0;
            formData.append('hue_shift', hueShift);
            formData.append('saturation_factor', satFactor);
            formData.append('value_factor', valFactor);
            break;
        case 'crop':
            const x = document.getElementById('cropXSlider')?.value || 100;
            const y = document.getElementById('cropYSlider')?.value || 100;
            const width = document.getElementById('cropWSlider')?.value || 200;
            const height = document.getElementById('cropHSlider')?.value || 200;
            formData.append('x', x);
            formData.append('y', y);
            formData.append('width', width);
            formData.append('height', height);
            break;
        case 'add-text':
            const text = document.getElementById('textContent')?.value || 'OpenCV Text';
            const textX = document.getElementById('textXSlider')?.value || 50;
            const textY = document.getElementById('textYSlider')?.value || 50;
            const fontScale = document.getElementById('fontScaleSlider')?.value || 1.0;
            const textColor = document.getElementById('textColorSelect')?.value || '#00FFFF';
            
            // Convert hex color to RGB
            const r = parseInt(textColor.slice(1, 3), 16);
            const g = parseInt(textColor.slice(3, 5), 16);
            const b = parseInt(textColor.slice(5, 7), 16);
            
            formData.append('text', text);
            formData.append('x', textX);
            formData.append('y', textY);
            formData.append('font_scale', fontScale);
            formData.append('color_r', r);
            formData.append('color_g', g);
            formData.append('color_b', b);
            break;
        // Add more cases for other operations
        case 'dimensions':
            // No additional parameters needed
            break;
        case 'rgb-channels':
            // No additional parameters needed
            break;
        case 'hsv-convert':
            // No additional parameters needed
            break;
        case 'translate':
            const translateX = document.getElementById('translateXSlider')?.value || 50;
            const translateY = document.getElementById('translateYSlider')?.value || 50;
            formData.append('tx', parseInt(translateX));
            formData.append('ty', parseInt(translateY));
            break;
        case 'flip':
            const flipCode = document.getElementById('flipDirection')?.value || 1;
            formData.append('flip_code', parseInt(flipCode));
            break;
    }
}

// Control update functions
function updateRotation(value) {
    if (value) document.getElementById('rotateValue').textContent = value;
    const scaleValue = document.getElementById('scaleSlider')?.value;
    if (scaleValue) document.getElementById('scaleValue').textContent = scaleValue;
}

function updateBlur() {
    const value = document.getElementById('blurSlider').value;
    document.getElementById('blurValue').textContent = value;
}

function updateThreshold(value) {
    if (value) document.getElementById('threshValue').textContent = value;
}

function updateResize(value) {
    if (value) document.getElementById('scaleResizeValue').textContent = value;
}

function updateEdgeDetection() {
    const lowValue = document.getElementById('edgeLowSlider').value;
    const highValue = document.getElementById('edgeHighSlider').value;
    document.getElementById('edgeLowValue').textContent = lowValue;
    document.getElementById('edgeHighValue').textContent = highValue;
}

function updateColorManipulation() {
    const hueValue = document.getElementById('hueSlider').value;
    const satValue = document.getElementById('satSlider').value;
    const valValue = document.getElementById('valSlider').value;
    document.getElementById('hueValue').textContent = hueValue;
    document.getElementById('satValue').textContent = satValue;
    document.getElementById('valValue').textContent = valValue;
}

function updateCrop() {
    const x = document.getElementById('cropXSlider').value;
    const y = document.getElementById('cropYSlider').value;
    const w = document.getElementById('cropWSlider').value;
    const h = document.getElementById('cropHSlider').value;
    document.getElementById('cropXValue').textContent = x;
    document.getElementById('cropYValue').textContent = y;
    document.getElementById('cropWValue').textContent = w;
    document.getElementById('cropHValue').textContent = h;
}

function updateTextPreview() {
    // Just update the preview, actual text is read when processing
}

function updateTextPosition() {
    const x = document.getElementById('textXSlider').value;
    const y = document.getElementById('textYSlider').value;
    document.getElementById('textXValue').textContent = x;
    document.getElementById('textYValue').textContent = y;
}

function updateTextFont() {
    const scale = document.getElementById('fontScaleSlider').value;
    document.getElementById('fontScaleValue').textContent = scale;
}

function updateTextColor() {
    // Color is now selected from dropdown, no additional display needed
}

function updateTranslate() {
    const x = document.getElementById('translateXSlider').value;
    const y = document.getElementById('translateYSlider').value;
    document.getElementById('translateXValue').textContent = x;
    document.getElementById('translateYValue').textContent = y;
}

function updateFlip() {
    // Flip direction is selected from dropdown, no additional display needed
}

// View toggle functions
function toggleView(view) {
    console.log(`Switching to ${view} view`);
    currentView = view;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Force update of gallery
    setTimeout(() => {
        updateImageGallery();
        updateSelectedCount();
    }, 50);
}

// Utility functions
function clearAllImages() {
    loadedImages = [];
    processedImages = [];
    selectedImageIndices = [];
    currentOperation = null;
    operationQueue = []; // Clear operation queue
    
    updateImageGallery();
    updateImageCount(0);
    updateSelectedCount();
    
    document.getElementById('processAllBtn').disabled = true;
    document.querySelectorAll('.operation-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('controlsPanel').classList.remove('active');
    
    updateStatus('All images cleared');
    showMessage('All images cleared', 'success');
}

function removeSingle(index) {
    const removedImage = loadedImages[index];
    loadedImages.splice(index, 1);
    
    // Update selected indices
    selectedImageIndices = selectedImageIndices
        .filter(i => i !== index)
        .map(i => i > index ? i - 1 : i);
    
    updateImageGallery();
    updateImageCount(loadedImages.length);
    updateSelectedCount();
    
    if (loadedImages.length === 0) {
        document.getElementById('processAllBtn').disabled = true;
    }
    
    showMessage(`Removed ${removedImage.name}`, 'success');
}

function downloadSingle(index) {
    const image = loadedImages[index];
    const imageToDownload = image.processedSrc || image.src;
    const filename = image.processed ? 
        `processed_${image.metadata.lastOperation}_${image.name}` : 
        image.name;
    
    downloadImage(imageToDownload, filename);
    showMessage(`Downloaded ${filename}`, 'success');
}

function downloadImage(imageSrc, filename) {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = filename;
    link.click();
}

function truncateFilename(filename, maxLength) {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
    const truncated = nameWithoutExt.slice(0, maxLength - extension.length - 4) + '...';
    return `${truncated}.${extension}`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function closeControls() {
    document.getElementById('controlsPanel').classList.remove('active');
    document.querySelectorAll('.operation-btn').forEach(btn => btn.classList.remove('active'));
    currentOperation = null;
}

function toggleControlsPanel() {
    const controlsPanel = document.getElementById('controlsPanel');
    const minimizeBtn = document.getElementById('minimizeControlsBtn');
    const chevronIcon = minimizeBtn.querySelector('svg polyline');
    
    controlsPanel.classList.toggle('minimized');
    
    // Rotate chevron icon and update label
    if (controlsPanel.classList.contains('minimized')) {
        chevronIcon.setAttribute('points', '6 9 12 15 18 9'); // Chevron down
        minimizeBtn.setAttribute('aria-label', 'Expand controls panel');
    } else {
        chevronIcon.setAttribute('points', '18 15 12 9 6 15'); // Chevron up
        minimizeBtn.setAttribute('aria-label', 'Minimize controls panel');
    }
}

// Export functions
function toggleExportDropdown() {
    const dropdown = document.getElementById('exportDropdown');
    dropdown.classList.toggle('active');
    
    document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('.export-dropdown')) {
            dropdown.classList.remove('active');
            document.removeEventListener('click', closeDropdown);
        }
    });
}

function exportAs(format) {
    if (loadedImages.length === 0) {
        showMessage('No images to export', 'error');
        return;
    }

    const processedImages = loadedImages.filter(img => img.processed);
    
    if (processedImages.length === 0) {
        showMessage('No processed images to export', 'error');
        return;
    }

    processedImages.forEach((image, index) => {
        setTimeout(() => {
            if (format === 'png') {
                downloadImage(image.processedSrc, `processed_${image.metadata.lastOperation}_${image.name}`);
            } else if (format === 'jpg') {
                convertAndDownload(image.processedSrc, `processed_${image.metadata.lastOperation}_${image.name.replace(/\.[^/.]+$/, "")}`, 'image/jpeg', '.jpg');
            }
        }, index * 200); // Stagger downloads
    });
    
    document.getElementById('exportDropdown').classList.remove('active');
    showMessage(`Exporting ${processedImages.length} images as ${format.toUpperCase()}`, 'success');
}

function convertAndDownload(imageSrc, filename, mimeType, extension) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (mimeType === 'image/jpeg') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(function(blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename + extension;
            link.click();
            URL.revokeObjectURL(link.href);
        }, mimeType, 0.9);
    };
    
    img.src = imageSrc;
}

function exportAsPDF() {
    if (loadedImages.length === 0) {
        showMessage('No images to export', 'error');
        return;
    }
    
    document.getElementById('pdfModal').classList.add('active');
    document.getElementById('exportDropdown').classList.remove('active');
}

function closePDFModal() {
    document.getElementById('pdfModal').classList.remove('active');
}

function generateMultiImagePDFReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const title = document.getElementById('pdfTitle').value || 'Multi-Image Processing Report';
    const includeOriginal = document.getElementById('includeOriginal').checked;
    const includeProcessed = document.getElementById('includeProcessed').checked;
    const includeDetails = document.getElementById('includeDetails').checked;
    const includeMetadata = document.getElementById('includeMetadata').checked;
    const imagesPerPage = parseInt(document.getElementById('imagesPerPage').value);
    const notes = document.getElementById('pdfNotes').value;
    
    let yPosition = 20;
    let currentPage = 1;
    let imagesOnCurrentPage = 0;
    
    // Title page
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text(title, 20, yPosition);
    yPosition += 20;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
    doc.text(`Total Images: ${loadedImages.length}`, 20, yPosition + 10);
    doc.text(`Processed Images: ${loadedImages.filter(img => img.processed).length}`, 20, yPosition + 20);
    yPosition += 40;
    
    // Process each image
    const processImagePages = async () => {
        for (let i = 0; i < loadedImages.length; i++) {
            const image = loadedImages[i];
            
            if (imagesOnCurrentPage >= imagesPerPage) {
                doc.addPage();
                currentPage++;
                yPosition = 20;
                imagesOnCurrentPage = 0;
            }
            
            // Add image info
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(`Image ${i + 1}: ${image.name}`, 20, yPosition);
            yPosition += 10;
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Size: ${formatFileSize(image.size)} | Dimensions: ${image.metadata.width} × ${image.metadata.height}`, 20, yPosition);
            yPosition += 8;
            
            if (image.processed && includeDetails) {
                doc.text(`Operation: ${image.metadata.lastOperation} | Processing Time: ${image.metadata.processingTime}ms`, 20, yPosition);
                yPosition += 8;
            }
            
            yPosition += 5;
            
            // Add images vertically (processed below original)
            try {
                let imageHeight = 0;
                
                // If only one type of image is included, center it and make it larger
                if (includeOriginal && !includeProcessed) {
                    await addImageToPDF(doc, image.src, 'Original', 30, yPosition, 150, 100);
                    imageHeight = 105;
                } else if (!includeOriginal && includeProcessed && image.processedSrc) {
                    await addImageToPDF(doc, image.processedSrc, 'Processed', 30, yPosition, 150, 100);
                    imageHeight = 105;
                } else {
                    // Both images vertically stacked
                    if (includeOriginal) {
                        await addImageToPDF(doc, image.src, 'Original', 30, yPosition, 150, 80);
                        yPosition += 85; // Move down for next image
                    }
                    
                    if (includeProcessed && image.processedSrc) {
                        await addImageToPDF(doc, image.processedSrc, 'Processed', 30, yPosition, 150, 80);
                        imageHeight = includeOriginal ? 170 : 85; // Total height based on what's included
                    } else {
                        imageHeight = 85; // Only original was added
                    }
                }
                
                // Check if we need a new page for the next image
                if (yPosition + imageHeight > 250) {
                    doc.addPage();
                    currentPage++;
                    yPosition = 20;
                    imagesOnCurrentPage = 0;
                } else {
                    yPosition += imageHeight + 15; // Add spacing between image sets
                }
            } catch (error) {
                console.error('Error adding image to PDF:', error);
            }
            
            imagesOnCurrentPage++;
        }
        
        // Add metadata and notes
        if (includeMetadata || notes.trim()) {
            doc.addPage();
            yPosition = 20;
            
            if (includeMetadata) {
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('Processing Summary', 20, yPosition);
                yPosition += 15;
                
                doc.setFontSize(12);
                doc.setFont(undefined, 'normal');
                
                const operationCounts = {};
                loadedImages.forEach(img => {
                    if (img.metadata.lastOperation) {
                        operationCounts[img.metadata.lastOperation] = (operationCounts[img.metadata.lastOperation] || 0) + 1;
                    }
                });
                
                Object.entries(operationCounts).forEach(([operation, count]) => {
                    doc.text(`${operation}: ${count} images`, 20, yPosition);
                    yPosition += 8;
                });
                
                yPosition += 10;
                
                const avgProcessingTime = loadedImages
                    .filter(img => img.metadata.processingTime > 0)
                    .reduce((sum, img, _, arr) => sum + img.metadata.processingTime / arr.length, 0);
                
                if (avgProcessingTime > 0) {
                    doc.text(`Average Processing Time: ${Math.round(avgProcessingTime)}ms`, 20, yPosition);
                    yPosition += 10;
                }
            }
            
            if (notes.trim()) {
                yPosition += 10;
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('Notes', 20, yPosition);
                yPosition += 10;
                
                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                const splitNotes = doc.splitTextToSize(notes, 170);
                doc.text(splitNotes, 20, yPosition);
            }
        }
        
        // Save PDF
        const filename = `multi_image_report_${Date.now()}.pdf`;
        doc.save(filename);
        
        closePDFModal();
        showMessage('Multi-image PDF report generated successfully', 'success');
    };
    
    processImagePages().catch(error => {
        console.error('PDF generation error:', error);
        showMessage('Error generating PDF report', 'error');
    });
}

function addImageToPDF(doc, imageSrc, title, x, y, maxWidth, maxHeight) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            // Calculate dimensions to fit in specified area
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
            
            // Add image to PDF
            doc.addImage(img, 'JPEG', x, y, width * 0.75, height * 0.75);
            
            // Add title
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.text(title, x, y - 2);
            
            resolve();
        };
        img.onerror = function() {
            console.error('Failed to load image for PDF');
            resolve();
        };
        img.src = imageSrc;
    });
}

function exportAll() {
    if (loadedImages.length === 0) {
        showMessage('No images to export', 'error');
        return;
    }
    
    const processedImages = loadedImages.filter(img => img.processed);
    
    if (processedImages.length === 0) {
        showMessage('No processed images to export', 'error');
        return;
    }
    
    // Export PNG
    setTimeout(() => exportAs('png'), 100);
    
    // Export JPG
    setTimeout(() => exportAs('jpg'), 500);
    
    // Export PDF
    setTimeout(() => exportAsPDF(), 1000);
    
    document.getElementById('exportDropdown').classList.remove('active');
    showMessage('Exporting all formats...', 'success');
}

// Status and UI update functions
function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
}

function showProgress(percentage) {
    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressText').textContent = percentage + '%';
}

function updateImageCount(count) {
    const countElement = document.getElementById('imageCount');
    if (count === 0) {
        countElement.textContent = 'No images loaded';
    } else if (count === 1) {
        countElement.textContent = '1 image loaded';
    } else {
        countElement.textContent = `${count} images loaded`;
    }
}

function showMessage(message, type) {
    // Remove existing messages
    document.querySelectorAll('.toast-message').forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `toast-message toast-${type}`;
    messageDiv.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ⓘ'}</span>
            <span class="toast-text">${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(messageDiv)) {
            messageDiv.remove();
        }
    }, 5000);
    
    // Animate in
    setTimeout(() => messageDiv.classList.add('show'), 10);
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'o':
                e.preventDefault();
                document.getElementById('imageInput').click();
                break;
            case 's':
                e.preventDefault();
                toggleExportDropdown();
                break;
            case 'a':
                if (e.shiftKey) {
                    e.preventDefault();
                    // Select all images
                    selectedImageIndices = loadedImages.map((_, index) => index);
                    loadedImages.forEach(img => img.selected = true);
                    updateImageGallery();
                    updateSelectedCount();
                }
                break;
            case 'd':
                if (e.shiftKey) {
                    e.preventDefault();
                    // Deselect all images
                    selectedImageIndices = [];
                    loadedImages.forEach(img => img.selected = false);
                    updateImageGallery();
                    updateSelectedCount();
                }
                break;
            case 'p':
                e.preventDefault();
                if (currentOperation) {
                    processSelectedImages();
                }
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                if (selectedImageIndices.length > 0) {
                    // Remove selected images
                    const indicesToRemove = [...selectedImageIndices].sort((a, b) => b - a);
                    indicesToRemove.forEach(index => removeSingle(index));
                }
                break;
        }
    }
    
    // ESC key to close panels/modals
    if (e.key === 'Escape') {
        if (document.getElementById('pdfModal').classList.contains('active')) {
            closePDFModal();
        } else if (document.getElementById('controlsPanel').classList.contains('active')) {
            closeControls();
        } else if (document.getElementById('exportDropdown').classList.contains('active')) {
            document.getElementById('exportDropdown').classList.remove('active');
        }
    }
    
    // Space to toggle view
    if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        toggleView(currentView === 'grid' ? 'comparison' : 'grid');
    }
}

// Drag and drop functionality
function setupDragAndDrop() {
    const gallery = document.getElementById('imageGallery');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        gallery.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        gallery.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        gallery.addEventListener(eventName, unhighlight, false);
    });
    
    gallery.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        gallery.classList.add('drag-over');
    }
    
    function unhighlight(e) {
        gallery.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        handleMultipleImageLoad({ target: { files } });
    }
}

// Auto-save functionality for parameters
function saveParameters() {
    if (!currentOperation) return;
    
    const params = {};
    
    switch(currentOperation) {
        case 'rotate':
            params.angle = document.getElementById('rotateSlider')?.value;
            params.scale = document.getElementById('scaleSlider')?.value;
            break;
        case 'blur':
            params.blurType = document.getElementById('blurType')?.value;
            params.kernelSize = document.getElementById('blurSlider')?.value;
            break;
        case 'threshold':
            params.threshValue = document.getElementById('threshSlider')?.value;
            params.threshType = document.getElementById('threshType')?.value;
            break;
        // Add more cases as needed
    }
    
    // Store in session (in-memory storage)
    window.lastParameters = window.lastParameters || {};
    window.lastParameters[currentOperation] = params;
}

function loadParameters(operation) {
    if (!window.lastParameters || !window.lastParameters[operation]) return;
    
    const params = window.lastParameters[operation];
    
    setTimeout(() => {
        switch(operation) {
            case 'rotate':
                if (params.angle && document.getElementById('rotateSlider')) {
                    document.getElementById('rotateSlider').value = params.angle;
                    document.getElementById('rotateValue').textContent = params.angle;
                }
                if (params.scale && document.getElementById('scaleSlider')) {
                    document.getElementById('scaleSlider').value = params.scale;
                    document.getElementById('scaleValue').textContent = params.scale;
                }
                break;
            case 'blur':
                if (params.blurType && document.getElementById('blurType')) {
                    document.getElementById('blurType').value = params.blurType;
                }
                if (params.kernelSize && document.getElementById('blurSlider')) {
                    document.getElementById('blurSlider').value = params.kernelSize;
                    document.getElementById('blurValue').textContent = params.kernelSize;
                }
                break;
            case 'threshold':
                if (params.threshValue && document.getElementById('threshSlider')) {
                    document.getElementById('threshSlider').value = params.threshValue;
                    document.getElementById('threshValue').textContent = params.threshValue;
                }
                if (params.threshType && document.getElementById('threshType')) {
                    document.getElementById('threshType').value = params.threshType;
                }
                break;
        }
    }, 100); // Small delay to ensure elements are created
}

// Performance monitoring
function trackPerformance() {
    const performanceData = {
        loadedImages: loadedImages.length,
        processedImages: loadedImages.filter(img => img.processed).length,
        averageProcessingTime: 0,
        totalProcessingTime: 0,
        operations: {}
    };
    
    let totalTime = 0;
    let processedCount = 0;
    
    loadedImages.forEach(img => {
        if (img.metadata.processingTime > 0) {
            totalTime += img.metadata.processingTime;
            processedCount++;
            
            const operation = img.metadata.lastOperation;
            if (operation) {
                performanceData.operations[operation] = (performanceData.operations[operation] || 0) + 1;
            }
        }
    });
    
    if (processedCount > 0) {
        performanceData.averageProcessingTime = Math.round(totalTime / processedCount);
        performanceData.totalProcessingTime = totalTime;
    }
    
    return performanceData;
}

// Initialize drag and drop when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setupDragAndDrop();
    
    // Update controls with saved parameters
    const originalShowControls = showControls;
    showControls = function(operation) {
        originalShowControls(operation);
        loadParameters(operation);
    };
    
    // Auto-save parameters when they change
    document.addEventListener('input', function(e) {
        if (e.target.matches('#rotateSlider, #scaleSlider, #blurSlider, #threshSlider, #blurType, #threshType')) {
            saveParameters();
        }
    });
    
    // Performance tracking every 30 seconds
    setInterval(() => {
        const performance = trackPerformance();
        console.log('Performance Stats:', performance);
    }, 30000);
});

// Export performance data
window.getPerformanceStats = trackPerformance;

// Function to check if the gallery is scrollable and update visual indicator
function checkGalleryScrollable() {
    const gallery = document.getElementById('imageGallery');
    if (!gallery) return;
    
    // Check if content height exceeds container height
    const isScrollable = gallery.scrollHeight > gallery.clientHeight;
    
    if (isScrollable) {
        gallery.classList.add('has-scroll');
    } else {
        gallery.classList.remove('has-scroll');
    }
}