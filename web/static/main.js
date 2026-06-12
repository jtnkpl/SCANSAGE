// State Variables
let ocrResults = [];
let selectedLangs = ['en'];
let originalImageWidth = 0;
let originalImageHeight = 0;
let activeHoverIndex = -1;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const langBtn = document.getElementById('langBtn');
const langDropdown = document.getElementById('langDropdown');
const selectedLangsTags = document.getElementById('selectedLangsTags');
const idleState = document.getElementById('idleState');
const loadingState = document.getElementById('loadingState');
const workspace = document.getElementById('workspace');
const sourceImage = document.getElementById('sourceImage');
const overlayCanvas = document.getElementById('overlayCanvas');
const ctx = overlayCanvas.getContext('2d');
const resultsList = document.getElementById('resultsList');
const searchText = document.getElementById('searchText');
const copyAllBtn = document.getElementById('copyAllBtn');
const downloadTxtBtn = document.getElementById('downloadTxtBtn');

// 1. Language Selector Dropdown Logic
langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('show');
    langBtn.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!langDropdown.contains(e.target) && e.target !== langBtn) {
        langDropdown.classList.remove('show');
        langBtn.classList.remove('active');
    }
});

// Update language tags and state when checkboxes change
langDropdown.addEventListener('change', () => {
    const checkedBoxes = langDropdown.querySelectorAll('input[type="checkbox"]:checked');
    selectedLangs = Array.from(checkedBoxes).map(cb => cb.value);
    
    // Fallback to English if none selected
    if (selectedLangs.length === 0) {
        selectedLangs = ['en'];
        const enCheckbox = langDropdown.querySelector('input[value="en"]');
        if (enCheckbox) enCheckbox.checked = true;
    }
    
    // Render selected language tags
    selectedLangsTags.innerHTML = selectedLangs.map(lang => `
        <span class="lang-tag">${lang}</span>
    `).join('');
});

// 2. Drag and Drop Image File Upload
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

['dragleave', 'dragend'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragover');
    });
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Process image file
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file (PNG, JPG, WEBP).');
        return;
    }
    
    // Reset view state
    idleState.classList.add('hidden');
    workspace.classList.add('hidden');
    loadingState.classList.remove('hidden');
    
    // Load image preview and get dimensions
    const reader = new FileReader();
    reader.onload = (e) => {
        sourceImage.src = e.target.result;
        sourceImage.onload = () => {
            originalImageWidth = sourceImage.naturalWidth;
            originalImageHeight = sourceImage.naturalHeight;
            setupCanvas();
            uploadImage(file);
        };
    };
    reader.readAsDataURL(file);
}

// 3. API Upload Request
function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('langs', selectedLangs.join(','));
    
    fetch('/api/ocr', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Neural network failed to process image or server error.');
        }
        return response.json();
    })
    .then(data => {
        ocrResults = data.results;
        loadingState.classList.add('hidden');
        workspace.classList.remove('hidden');
        
        setupCanvas();
        renderTextList(ocrResults);
        drawBoundingBoxes();
    })
    .catch(error => {
        loadingState.classList.add('hidden');
        idleState.classList.remove('hidden');
        alert('OCR Failed: ' + error.message);
    });
}

// 4. Canvas Setup and Bounding Box Overlay
function setupCanvas() {
    if (!sourceImage.src || workspace.classList.contains('hidden')) return;
    
    // Canvas dimensions must match the rendered size of the image on the screen
    overlayCanvas.width = sourceImage.clientWidth;
    overlayCanvas.height = sourceImage.clientHeight;
    
    overlayCanvas.style.width = sourceImage.clientWidth + 'px';
    overlayCanvas.style.height = sourceImage.clientHeight + 'px';
    
    drawBoundingBoxes();
}

// Draw all bounding boxes on the canvas overlay
function drawBoundingBoxes() {
    if (!overlayCanvas.width || ocrResults.length === 0) return;
    
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    const scaleX = overlayCanvas.width / originalImageWidth;
    const scaleY = overlayCanvas.height / originalImageHeight;
    
    ocrResults.forEach((item, index) => {
        const isHovered = index === activeHoverIndex;
        
        ctx.beginPath();
        // Convert original bounding coordinates to canvas-scaled coordinates
        const firstPoint = item.bbox[0];
        ctx.moveTo(firstPoint[0] * scaleX, firstPoint[1] * scaleY);
        
        for (let i = 1; i < item.bbox.length; i++) {
            ctx.lineTo(item.bbox[i][0] * scaleX, item.bbox[i][1] * scaleY);
        }
        ctx.closePath();
        
        if (isHovered) {
            // Draw glowing hovered box
            ctx.strokeStyle = '#8b5cf6'; // Violet
            ctx.lineWidth = 3;
            ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
            ctx.fill();
        } else {
            // Draw subtle default boxes
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)'; // Indigo
            ctx.lineWidth = 1.5;
            ctx.fillStyle = 'rgba(99, 102, 241, 0.03)';
            ctx.fill();
        }
        ctx.stroke();
    });
}

// Watch window resize to rescale canvas bounding boxes
window.addEventListener('resize', () => {
    setTimeout(setupCanvas, 150);
});

// 5. Render Extracted Text Cards
function renderTextList(items) {
    if (items.length === 0) {
        resultsList.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                No text detected in this image.
            </div>`;
        return;
    }
    
    resultsList.innerHTML = items.map((item, index) => {
        const confidencePercent = Math.round(item.confidence * 100);
        let confClass = 'high';
        if (item.confidence < 0.6) confClass = 'low';
        else if (item.confidence < 0.85) confClass = 'medium';
        
        return `
            <div class="text-item" data-index="${index}" id="textItem-${index}">
                <div class="text-item-header">
                    <span class="confidence-badge ${confClass}">
                        <i class="fa-solid fa-gauge-high"></i> ${confidencePercent}% Conf
                    </span>
                </div>
                <div class="text-content">${escapeHTML(item.text)}</div>
                <div class="text-item-actions">
                    <button onclick="copySingleText(${index}, event)">
                        <i class="fa-regular fa-copy"></i> Copy Line
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners for list item hovering
    document.querySelectorAll('.text-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            const index = parseInt(item.getAttribute('data-index'));
            activeHoverIndex = index;
            highlightTextItem(index);
            drawBoundingBoxes();
        });
        
        item.addEventListener('mouseleave', () => {
            activeHoverIndex = -1;
            removeHighlights();
            drawBoundingBoxes();
        });
    });
}

// Helper to escape HTML tags to prevent XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// 6. Interactive Canvas Click/Hover Detection
overlayCanvas.addEventListener('mousemove', (e) => {
    const rect = overlayCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleX = overlayCanvas.width / originalImageWidth;
    const scaleY = overlayCanvas.height / originalImageHeight;
    
    let hoveredIndex = -1;
    
    // Check if mouse is inside any bounding box (Ray Casting Algorithm)
    for (let index = 0; index < ocrResults.length; index++) {
        const bbox = ocrResults[index].bbox.map(pt => [pt[0] * scaleX, pt[1] * scaleY]);
        if (isPointInPolygon([mouseX, mouseY], bbox)) {
            hoveredIndex = index;
            break;
        }
    }
    
    if (hoveredIndex !== activeHoverIndex) {
        activeHoverIndex = hoveredIndex;
        drawBoundingBoxes();
        
        if (hoveredIndex !== -1) {
            highlightTextItem(hoveredIndex);
            // Scroll matching sidebar card into view smoothly
            const element = document.getElementById(`textItem-${hoveredIndex}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            removeHighlights();
        }
    }
});

// Simple point in polygon helper
function isPointInPolygon(point, polygon) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Highlight text card in sidebar list
function highlightTextItem(index) {
    removeHighlights();
    const activeCard = document.getElementById(`textItem-${index}`);
    if (activeCard) {
        activeCard.classList.add('highlighted');
    }
}

// Remove highlighted active classes from all sidebar cards
function removeHighlights() {
    document.querySelectorAll('.text-item').forEach(card => {
        card.classList.remove('highlighted');
    });
}

// 7. Text Actions (Copy & Download)
function copySingleText(index, event) {
    event.stopPropagation();
    const text = ocrResults[index].text;
    navigator.clipboard.writeText(text)
        .then(() => showToast('Copied line to clipboard!'))
        .catch(() => alert('Failed to copy text.'));
}

copyAllBtn.addEventListener('click', () => {
    if (ocrResults.length === 0) return;
    const fullText = ocrResults.map(item => item.text).join('\n');
    navigator.clipboard.writeText(fullText)
        .then(() => showToast('Copied all text to clipboard!'))
        .catch(() => alert('Failed to copy text.'));
});

downloadTxtBtn.addEventListener('click', () => {
    if (ocrResults.length === 0) return;
    const fullText = ocrResults.map(item => item.text).join('\n');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ScanSage_OCR_Result.txt';
    link.click();
});

// Search filter text list input
searchText.addEventListener('input', (e) => {
    const filter = e.target.value.toLowerCase();
    document.querySelectorAll('.text-item').forEach(card => {
        const text = card.querySelector('.text-content').textContent.toLowerCase();
        if (text.includes(filter)) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
});

// Reset zoom button
document.getElementById('resetZoom').addEventListener('click', () => {
    setupCanvas();
});

// Helper for UI Toast notifications
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.background = 'rgba(16, 185, 129, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '0.75rem 1.5rem';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    toast.style.zIndex = '9999';
    toast.style.fontSize = '0.9rem';
    toast.style.fontWeight = '500';
    toast.style.backdropFilter = 'blur(10px)';
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 2000);
}
