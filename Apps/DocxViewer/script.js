/* =========================================================
   DOCX Viewer logic
   Handles: file selection, drag & drop, rendering,
            zoom controls and resizable viewer
   ========================================================= */

// Shortcut for document.getElementById
const $ = (id) => document.getElementById(id);

// ----- Grab all the elements we need -----
const dz = $("dropzone"); // drag & drop area
const input = $("fileInput"); // hidden <input type="file">
const container = $("container"); // where the document is rendered (zoom target)
const viewer = $("viewer"); // scrollable grey canvas (height is resizable)
const viewerWrap = $("viewerWrap"); // toolbar + viewer + handles (width is resizable)
const filebar = $("filebar");
const spinner = $("spinner");
const toast = $("toast");
const dot = $("dot");
const fileSub = $("fileSub");
const fileName = $("fileName");

// Zoom controls
const zoomInBtn = $("zoomIn");
const zoomOutBtn = $("zoomOut");
const zoomFitBtn = $("zoomFit");
const zoomResetBtn = $("zoomReset");
const zoomLabel = $("zoomLabel");

/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */

// Convert bytes into a readable size (B, KB, MB)
const fmt = (b) => (b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB");

// Set the status dot color: 'load', 'ok' or 'err'
const setDot = (cls) => (dot.className = "dot " + cls);

// Show an error message under the drop zone
function showError(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
}

// Clear everything and return to the initial empty state
function reset() {
    container.innerHTML = "";
    viewerWrap.classList.remove("show");
    filebar.classList.remove("show");
    spinner.classList.remove("show");
    toast.classList.remove("show");
    dz.classList.remove("compact");
    input.value = ""; // lets the user re-select the same file
    setZoom(1);
}

/* ---------------------------------------------------------
   ZOOM
   The CSS `zoom` property scales the rendered pages AND
   updates the layout size, so scrollbars stay correct.
   --------------------------------------------------------- */
const ZOOM_MIN = 0.25; // 25%
const ZOOM_MAX = 3; // 300%
const ZOOM_STEP = 0.1; // 10% per click / wheel notch

let zoom = 1; // current zoom factor (1 = 100%)
let basePageWidth = 0; // page width in px at 100% (measured after render)

function setZoom(value) {
    // Keep the value inside the allowed range and avoid float noise (0.30000004)
    zoom = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value)) * 100) / 100;

    // Remember where the user is in the document, so the view doesn't jump
    const ratio = viewer.scrollHeight ? viewer.scrollTop / viewer.scrollHeight : 0;

    container.style.zoom = zoom;
    viewer.scrollTop = ratio * viewer.scrollHeight;

    // Update the label and disable buttons at the limits
    zoomLabel.textContent = Math.round(zoom * 100) + "%";
    zoomOutBtn.disabled = zoom <= ZOOM_MIN;
    zoomInBtn.disabled = zoom >= ZOOM_MAX;
}

// Scale the page so its width exactly fits the viewer
function fitToWidth() {
    if (!basePageWidth) return;
    const available = viewer.clientWidth - 24; // minus the viewer's left/right padding
    setZoom(available / basePageWidth);
}

zoomInBtn.addEventListener("click", () => setZoom(zoom + ZOOM_STEP));
zoomOutBtn.addEventListener("click", () => setZoom(zoom - ZOOM_STEP));
zoomFitBtn.addEventListener("click", fitToWidth);
zoomResetBtn.addEventListener("click", () => setZoom(1));

// Ctrl + mouse wheel (also trackpad pinch) zooms the document.
// passive:false is needed so we can stop the browser zooming the whole page.
viewer.addEventListener(
    "wheel",
    (e) => {
        if (!e.ctrlKey) return; // normal scrolling stays untouched
        e.preventDefault();
        setZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    },
    { passive: false },
);

/* ---------------------------------------------------------
   RESIZABLE VIEWER
   Three handles: right edge (width), bottom edge (height)
   and the corner (both). Uses pointer events, so mouse,
   touch and pen all work.
   --------------------------------------------------------- */
const MIN_W = 320; // smallest allowed width in px
const MIN_H = 200; // smallest allowed height in px

// mode: 'w' = width only, 'h' = height only, 'both' = corner
function makeResizable(handle, mode) {
    handle.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        handle.setPointerCapture(e.pointerId); // keep receiving events outside the handle

        // Starting pointer position and starting size
        const startX = e.clientX,
            startY = e.clientY;
        const startW = viewerWrap.offsetWidth;
        const startH = viewer.offsetHeight;

        const onMove = (ev) => {
            if (mode === "w" || mode === "both") {
                const w = Math.max(MIN_W, startW + (ev.clientX - startX));
                viewerWrap.style.width = w + "px";
            }
            if (mode === "h" || mode === "both") {
                const h = Math.max(MIN_H, startH + (ev.clientY - startY));
                viewer.style.height = h + "px";
            }
        };

        const onUp = () => {
            handle.removeEventListener("pointermove", onMove);
            handle.removeEventListener("pointerup", onUp);
            handle.removeEventListener("pointercancel", onUp);
        };

        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
        handle.addEventListener("pointercancel", onUp);
    });

    // Double-click a handle to restore the default size
    handle.addEventListener("dblclick", () => {
        viewerWrap.style.width = "";
        viewer.style.height = "";
    });
}

makeResizable($("rhRight"), "w");
makeResizable($("rhBottom"), "h");
makeResizable($("rhCorner"), "both");

/* ---------------------------------------------------------
   Main function: validate and render a .docx file
   --------------------------------------------------------- */
async function handleFile(file) {
    toast.classList.remove("show");
    if (!file) return;

    // Only accept .docx files
    if (!file.name.toLowerCase().endsWith(".docx")) {
        showError("Only .docx files are supported. Please choose a Word document.");
        return;
    }

    // Prepare the UI for loading
    container.innerHTML = "";
    viewerWrap.classList.remove("show");
    setZoom(1); // every new file starts at 100%
    fileName.textContent = file.name;
    fileSub.textContent = fmt(file.size) + " · Rendering…";
    setDot("load");
    filebar.classList.add("show");
    dz.classList.add("compact");
    spinner.classList.add("show");

    try {
        // docx-preview reads the File and renders pages into #container
        await docx.renderAsync(file, container, null, {
            inWrapper: true,
            breakPages: true,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
        });

        // Success: show the viewer, then measure one page at 100% zoom
        viewerWrap.classList.add("show");
        const page = container.querySelector("section.docx");
        basePageWidth = page ? page.offsetWidth : 0; // used by "Fit width"

        fileSub.textContent = fmt(file.size) + " · Ready";
        setDot("ok");
    } catch (err) {
        // Failure (corrupted or password-protected file, etc.)
        console.error(err);
        fileSub.textContent = "Failed to render";
        setDot("err");
        showError("Could not render this file. It may be corrupted or password protected.");
    } finally {
        spinner.classList.remove("show");
    }
}

/* ---------------------------------------------------------
   Upload / drag & drop events
   --------------------------------------------------------- */

// File chosen through the file picker
input.addEventListener("change", (e) => handleFile(e.target.files[0]));

// Remove button
$("clearBtn").addEventListener("click", reset);

// Keyboard accessibility: Enter or Space opens the file picker
dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
    }
});

// Highlight the drop zone while a file is dragged over it
["dragenter", "dragover"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
        e.preventDefault();
        dz.classList.add("dragover");
    }),
);

// Remove the highlight when the file leaves or is dropped
["dragleave", "drop"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
        e.preventDefault();
        dz.classList.remove("dragover");
    }),
);

// File dropped onto the zone
dz.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

// Stop the browser from opening a file that is dropped outside the zone
["dragover", "drop"].forEach((ev) => window.addEventListener(ev, (e) => e.preventDefault()));
