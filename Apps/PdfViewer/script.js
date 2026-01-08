// Import the necessary PDF.js modules
import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs";

// Set the worker source for PDF.js (required)
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";

// --- Configuration and State ---
let pdfDoc = null;
const scale = 1.5;
const MIN_WIDTH = 300; // Match CSS min-width
const MIN_HEIGHT = 200; // Match CSS min-height

// Variables for DRAGGING
let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
let isDragging = false;

// Variables for RESIZING
let isResizing = false;
let currentDirection = "";
let startX, startY, startWidth, startHeight, startLeft, startTop;

// --- DOM Elements ---
const fileInput = document.getElementById("pdf-file-input");
const pageInput = document.getElementById("page-input");
const canvas = document.getElementById("pdf-render");
const ctx = canvas.getContext("2d");
const pageCountSpan = document.getElementById("page-count");
const statusMessage = document.getElementById("status-message");
const navigationControls = document.getElementById("navigation-controls");
const pdfContainer = document.getElementById("pdf-container");
const resizers = document.querySelectorAll(".resizer"); // NEW

// --- PDF LOGIC (renderPage, handleFileSelect, handlePageInputChange remain functionally the same) ---

async function renderPage(num) {
    if (!pdfDoc) return;
    // ... (rest of renderPage function) ...
    if (num < 1 || num > pdfDoc.numPages) {
        alert(`Page number must be between 1 and ${pdfDoc.numPages}.`);
        const currentPage = parseInt(pageInput.getAttribute("data-current-page") || 1);
        pageInput.value = currentPage;
        return;
    }

    try {
        pageInput.setAttribute("data-current-page", num);
        pageInput.value = num;

        const page = await pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
        };

        await page.render(renderContext).promise;
    } catch (error) {
        console.error(`Error rendering page ${num}:`, error);
        alert(`Could not render page ${num}.`);
    }
}

async function handleFileSelect(event) {
    // ... (rest of handleFileSelect function) ...
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pdfDoc = null;

    const file = event.target.files[0];
    if (!file) {
        statusMessage.textContent = "Please select a PDF file to view.";
        statusMessage.style.display = "block";
        navigationControls.style.display = "none";
        return;
    }

    statusMessage.textContent = "Loading PDF...";
    statusMessage.style.display = "block";
    navigationControls.style.display = "none";

    const fileReader = new FileReader();

    fileReader.onload = async function () {
        const arrayBuffer = fileReader.result;

        try {
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            pdfDoc = await loadingTask.promise;

            pageCountSpan.textContent = pdfDoc.numPages;
            pageInput.max = pdfDoc.numPages;
            pageInput.value = 1;
            pageInput.setAttribute("data-current-page", 1);

            navigationControls.style.display = "flex";
            statusMessage.style.display = "none";

            renderPage(1);
        } catch (error) {
            console.error("Error loading PDF:", error);
            statusMessage.textContent = "Failed to load PDF file. Is it a valid PDF?";
            statusMessage.style.display = "block";
            navigationControls.style.display = "none";
        }
    };

    fileReader.readAsArrayBuffer(file);
}

function handlePageInputChange(event) {
    if (!pdfDoc) return;

    let desiredPage = parseInt(event.target.value);

    if (isNaN(desiredPage)) {
        pageInput.value = pageInput.getAttribute("data-current-page");
        return;
    }

    if (event.type === "change" || (event.type === "keydown" && event.key === "Enter")) {
        renderPage(desiredPage);
    }
}

// --- DRAGGING FUNCTIONS (Slightly modified to check for resizing) ---

function dragMouseDown(e) {
    e = e || window.event;

    // 🛑 IMPORTANT: Stop dragging if we clicked on an input or a resizer
    if (e.target.tagName === "INPUT" || e.target.classList.contains("resizer")) return;

    e.preventDefault();
    isDragging = true;

    pos3 = e.clientX;
    pos4 = e.clientY;

    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
}

function elementDrag(e) {
    if (!isDragging) return;

    e = e || window.event;
    e.preventDefault();

    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    pdfContainer.style.right = "auto";
    pdfContainer.style.bottom = "auto";
    pdfContainer.style.transform = "none";

    pdfContainer.style.top = pdfContainer.offsetTop - pos2 + "px";
    pdfContainer.style.left = pdfContainer.offsetLeft - pos1 + "px";
}

function closeDragElement() {
    isDragging = false;
    document.onmouseup = null;
    document.onmousemove = null;
}

// --- NEW RESIZING FUNCTIONS ---

function resizeMouseDown(e) {
    e = e || window.event;
    e.preventDefault();

    isResizing = true;
    currentDirection = e.target.getAttribute("data-direction");

    // Get initial properties
    startX = e.clientX;
    startY = e.clientY;
    startWidth = pdfContainer.offsetWidth;
    startHeight = pdfContainer.offsetHeight;
    startLeft = pdfContainer.offsetLeft;
    startTop = pdfContainer.offsetTop;

    // Attach listeners to document
    document.onmousemove = elementResize;
    document.onmouseup = closeResizeElement;
}

function elementResize(e) {
    if (!isResizing) return;

    let dx = e.clientX - startX;
    let dy = e.clientY - startY;
    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    const direction = currentDirection;

    // Check directions and calculate new size/position
    if (direction.includes("r")) {
        // Right
        newWidth = Math.max(MIN_WIDTH, startWidth + dx);
    }
    if (direction.includes("b")) {
        // Bottom
        newHeight = Math.max(MIN_HEIGHT, startHeight + dy);
    }
    if (direction.includes("l")) {
        // Left
        newWidth = Math.max(MIN_WIDTH, startWidth - dx);
        if (newWidth === MIN_WIDTH) {
            newLeft = startLeft + startWidth - MIN_WIDTH;
        } else {
            newLeft = startLeft + dx;
        }
    }
    if (direction.includes("t")) {
        // Top
        newHeight = Math.max(MIN_HEIGHT, startHeight - dy);
        if (newHeight === MIN_HEIGHT) {
            newTop = startTop + startHeight - MIN_HEIGHT;
        } else {
            newTop = startTop + dy;
        }
    }

    // Apply new position and size (must remove transform before setting left/top)
    pdfContainer.style.transform = "none";
    pdfContainer.style.width = newWidth + "px";
    pdfContainer.style.height = newHeight + "px";
    pdfContainer.style.left = newLeft + "px";
    pdfContainer.style.top = newTop + "px";
}

function closeResizeElement() {
    isResizing = false;
    /* Stop resizing when mouse button is released */
    document.onmouseup = null;
    document.onmousemove = null;
}

// --- Event Listeners ---
fileInput.addEventListener("change", handleFileSelect);
pageInput.addEventListener("change", handlePageInputChange);
pageInput.addEventListener("keydown", handlePageInputChange);

// 1. Draggable listener
pdfContainer.addEventListener("mousedown", dragMouseDown);

// 2. Resizable listeners
resizers.forEach((resizer) => {
    resizer.addEventListener("mousedown", resizeMouseDown);
});
