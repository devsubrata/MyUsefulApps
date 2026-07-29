//TODO:----------------Different Cursor------------------
function highlighterCursor(height, color = "rgba(255,255,0,0.7)") {
    const width = 16;
    const padding = 2;
    const strokeWidth = 4;

    const svgHeight = height + padding * 2;
    const rectX = width / 2 - strokeWidth / 2;
    const rectY = padding;

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${svgHeight}">
            <rect x="${rectX}"
                    y="${rectY}"
                    width="${strokeWidth}"
                    height="${height}"
                    rx="2" ry="2"
                    fill="${color}" />
        </svg>
    `.trim();

    const encoded = encodeURIComponent(svg);
    return `url("data:image/svg+xml;utf8,${encoded}") ${width / 2} ${rectY}, text`;
}
function lineCursor(strokeWidth = 2, color = "#000") {
    const size = 32;

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size * 3}" height="${size}" viewBox="0 0 ${size * 3} ${size}">
            <path d="
                M ${strokeWidth / 2} ${strokeWidth / 2} 
                V ${size * (1 / 2) - strokeWidth / 2} 
                M ${strokeWidth / 2} ${strokeWidth / 2} 
                H ${size * 1.5 - strokeWidth / 2}
            " 
                fill="none" 
                stroke="${color}" 
                stroke-width="${strokeWidth}" 
                stroke-linecap="square" 
                stroke-linejoin="miter"/>
        </svg>`.trim();

    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '") 0 0, crosshair';
}
function rectCursor(fillColor, strokeColor, strokeWidth) {
    const size = 24; // fixed fill size
    const total = size + strokeWidth;

    const offset = strokeWidth / 2;

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}">
            <rect
                x="${offset}"
                y="${offset}"
                width="${(size * 2) / 3}"
                height="${(size * 1) / 2}"
                fill="${fillColor}"
                stroke="${strokeColor}"
                stroke-width="${strokeWidth * 0.6}"
                shape-rendering="crispEdges"
            />
        </svg>`.trim();
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 0 0, crosshair`;
}
function solidRectCursor(color = "#ffd54f") {
    const width = 24;
    const height = 16;

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg"
            width="${width}"
            height="${height}"
            viewBox="0 0 ${width} ${height}">
        <rect x="0" y="0"
                width="${width}"
                height="${height}"
                fill="${color}" />
        </svg>
        `.trim();
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 0 0, crosshair`;
}
function infiniteCrossCursor(canvas, color = "red", stroke = 1) {
    // prevent duplicates
    if (document.getElementById("crosshair")) return;

    const crosshair = document.createElement("div");
    crosshair.id = "crosshair";
    crosshair.innerHTML = `
        <div class="vline"></div>
        <div class="hline"></div>
    `;
    document.body.appendChild(crosshair);

    const vline = crosshair.querySelector(".vline");
    const hline = crosshair.querySelector(".hline");

    vline.style.background = hline.style.background = color;
    vline.style.width = stroke + "px";
    hline.style.height = stroke + "px";

    canvas.addEventListener("mouseenter", () => {
        crosshair.style.display = "block";
        canvas.classList.add("crosshair-active");
    });

    canvas.addEventListener("mouseleave", () => {
        crosshair.style.display = "none";
        canvas.classList.remove("crosshair-active");
    });

    canvas.addEventListener("mousemove", (e) => {
        // viewport coordinates (IMPORTANT)
        vline.style.left = e.clientX + "px";
        hline.style.top = e.clientY + "px";
    });
}

//TODO:----------------resize & move window------------------
function resizeLeftHalf(win) {
    win.style.top = "0px";
    win.style.left = "0px";
    win.style.width = window.innerWidth / 2 + "px";
    win.style.height = window.innerHeight - 10 + "px";
}
function resizeTopLeft(win) {
    win.style.top = "0px";
    win.style.left = "0px";
    win.style.width = window.innerWidth / 2 + "px";
    win.style.height = window.innerHeight / 2 + "px";
}
function resizeBottomLeft(win) {
    win.style.top = window.innerHeight / 2 - 10 + "px";
    win.style.left = "0px";
    win.style.width = window.innerWidth / 2 + "px";
    win.style.height = window.innerHeight / 2 + "px";
}
function resizeRightHalf(win) {
    win.style.top = "0px";
    win.style.left = window.innerWidth / 2 - 17 + "px";
    win.style.width = window.innerWidth / 2 + "px";
    win.style.height = window.innerHeight - 10 + "px";
}
function resizeTopRight(win) {
    win.style.top = "0px";
    win.style.left = window.innerWidth / 2 - 17 + "px";
    win.style.width = window.innerWidth / 2 + "px";
    win.style.height = window.innerHeight / 2 + "px";
}
function resizeBottomRight(win) {
    win.style.top = window.innerHeight / 2 - 10 + "px";
    win.style.left = window.innerWidth / 2 - 17 + "px";
    win.style.width = window.innerWidth / 2 + "px";
    win.style.height = window.innerHeight / 2 + "px";
}

//TODO:----------------add drag feature------------------
function makeDraggable(el, calcNew = true) {
    let isDragging = false;
    let offsetX, offsetY;

    let titleBar = el.querySelector(".title") || el;
    titleBar.style.cursor = "grab";

    titleBar.addEventListener("mousedown", (e) => {
        if (e.target !== titleBar) return;
        if (e.target.classList.contains("resizer")) return;

        isDragging = true;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
        document.body.style.userSelect = "none";
        titleBar.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        // Calculate new position with bounds
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;

        if (calcNew) [newLeft, newTop] = preventOffscreen(newLeft, newTop);

        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        document.body.style.userSelect = "";
        titleBar.style.cursor = "grab";
    });

    function preventOffscreen(newLeft, newTop) {
        newLeft = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, newLeft));
        newTop = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, newTop));
        return [newLeft, newTop];
    }
}

function closeWindow(elm, ui, interval, options = {}) {
    const { hideInstead = false } = options;

    elm.addEventListener("click", () => {
        if (hideInstead) {
            ui.style.display = "none"; // Just hide it
        } else {
            ui.remove(); // Remove it from DOM
        }
        if (interval) clearInterval(interval);
    });
}

function minimizeWindow(elm, ui) {
    elm.addEventListener("click", () => {
        ui.classList.toggle("minimized");
    });
}

//TODO:-------------------Scroll Navigation-------------------------------
function handleNavigation(ui) {
    if (!ui) return consoleLog("No scrollable UI passed to handleNavigation");

    let vh = ui === window ? window.innerHeight * 1.5 : ui.clientHeight * 2;

    const scrollToBottomBtn = document.getElementById("scrollToBottom");
    const scrollToTopBtn = document.getElementById("scrollToTop");
    const scrollDownBtn = document.getElementById("scrollDown");
    const scrollUpBtn = document.getElementById("scrollUp");

    if (scrollToBottomBtn) {
        scrollToBottomBtn.onclick = () => {
            const top = ui === window ? document.body.scrollHeight : ui.scrollHeight;
            ui.scrollTo({ top, behavior: "smooth" });
        };
    }
    if (scrollToTopBtn) {
        scrollToTopBtn.onclick = () => ui.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (scrollDownBtn) {
        scrollDownBtn.onclick = () => ui.scrollBy({ top: vh, behavior: "smooth" });
    }
    if (scrollUpBtn) {
        scrollUpBtn.onclick = () => ui.scrollBy({ top: -vh, behavior: "smooth" });
    }
}

function attachScrollNavigation(ui, options = {}) {
    if (!ui) return;

    const { multiplier = 1.5, contentSelector = ".content", navSelector = ".nav" } = options;
    // Detect scrollable content
    const scrollable = ui.querySelector(contentSelector) || ui;
    // Detect navigation container
    const nav = ui.querySelector(navSelector);
    if (!nav) return;

    const getVH = () => scrollable.clientHeight * multiplier;

    nav.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-nav]");
        if (!btn) return;

        const action = btn.dataset.nav;

        if (action === "top") scrollable.scrollTo({ top: 0, behavior: "smooth" });
        if (action === "bottom") scrollable.scrollTo({ top: scrollable.scrollHeight, behavior: "smooth" });
        if (action === "down") scrollable.scrollBy({ top: getVH(), behavior: "smooth" });
        if (action === "up") scrollable.scrollBy({ top: -getVH(), behavior: "smooth" });
    });

    // <div class="nav">
    //     <button data-nav="top">⏫</button>
    //     <button data-nav="up">🔼</button>
    //     <button data-nav="down">🔽</button>
    //     <button data-nav="bottom">⏬</button>
    // </div>;
}

function lookUpLinks() {
    return {
        "Google search": "https://www.google.com/search?q={search_term}",
        AI_Review: "https://www.google.com/search?q={search_term}&udm=50",
        "Cambridge dictionary": "https://dictionary.cambridge.org/dictionary/english/{search_term}",
        "Longman dictionary": "https://www.ldoceonline.com/dictionary/{search_term}",
        "Oxford dictionary": "https://www.oxfordlearnersdictionaries.com/definition/english/{search_term}",
        "Webster dictionary": "https://www.merriam-webster.com/dictionary/{search_term}",
        "Collins dictionary": "https://www.collinsdictionary.com/dictionary/english/{search_term}",
        "vocabulary.com": "https://www.vocabulary.com/dictionary/{search_term}",
        "just-the-word.com": "https://www.just-the-word.com/main.pl?word={search_term}&mode=combinations",
        "thesaurus.com": "https://www.thesaurus.com/browse/{search_term}",
        "powerthesaurus.org": "https://www.powerthesaurus.org/{search_term}/synonyms",
        "dictionary.com": "https://www.dictionary.com/browse/{search_term}",
        "Youglish.com": "https://youglish.com/pronounce/{search_term}/english",
        "Image search": "https://www.google.com/search?tbm=isch&q={search_term}",
        "Video search": "https://www.google.com/search?tbm=vid&q={search_term}",
        "Google Map": "https://www.google.com/maps/place/{search_term}",
        Wikipedia: "https://en.wikipedia.org/wiki/{search_term}",
        "Youtube search": "https://www.youtube.com/results?search_query={search_term}",
        "Facebook search": "https://www.facebook.com/search/top/?q={search_term}",
        "News search": "https://www.google.com/search?tbm=nws&q={search_term}",
        "Pdf search": "https://www.google.com/search?q={search_term}&as_filetype=pdf",
        Downloadly: "https://downloadlynet.ir/?s={search_term}",
        GetIntoPC: "https://getintopc.com/?s={search_term}",
        TorrentEngine: "https://1337x.to/sort-search/{search_term}/time/desc/1/",
        "Book library": "https://www.libgen.is/search.php?req={search_term}",
        Github: "https://github.com/search?q={search_term}",
    };
}

function hexToRgb(hex) {
    hex = hex.replace("#", "").trim();

    // Handle shorthand (#abc)
    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((c) => c + c)
            .join("");
    }

    if (hex.length !== 6) {
        throw new Error("Invalid hex color");
    }

    const num = parseInt(hex, 16);

    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
    };
}

//**TODO:-------- Undo and Redo feature in canvas ----------- */
// Function to restore canvas from a state
function restoreCanvas(state, canvas, ctx) {
    const img = new Image();
    img.src = state;
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
        ctx.drawImage(img, 0, 0); // Draw the saved state
    };
}
//**TODO:-------- Set Image Background on canvas ----------- */
async function setImageAsBackground({ canvasId, imageFile }) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    // Load image
    const img = await loadImage(imageFile);

    // Save current drawing
    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext("2d").drawImage(canvas, 0, 0);

    //* Resize existing canvas
    canvas.width = img.width;
    canvas.height = img.height;

    // Restore background image
    ctx.drawImage(img, 0, 0);

    // Restore drawings
    ctx.drawImage(snapshot, 0, 0);
}

function loadImage(source) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;

        if (source instanceof Blob) {
            img.src = URL.createObjectURL(source);
        } else {
            img.src = source;
        }
    });
}

//**TODO-----------Add pdf-style text box------------ */
function addTextToCanvas(
    ctx,
    clickPosition,
    canvasWrapper,
    fontSize = 16,
    fontFamily = "Open Sans",
    color = "#000",
    useColorPalette = false,
    padding = { x: 6, y: 4 },
    commitKey = "shift+enter",
    cancelKey = "escape",
) {
    const { x, y } = clickPosition;

    const textarea = document.createElement("textarea");
    const lineHeight = fontSize * 1.3;
    // ===============================
    // Styling
    // ===============================
    textarea.style.position = "absolute";
    textarea.style.left = `${x}px`;
    textarea.style.top = `${y}px`;
    textarea.style.padding = `${padding.y}px ${padding.x}px`;
    textarea.style.boxSizing = "border-box";
    textarea.style.font = `${fontSize}px ${fontFamily}`;
    textarea.style.lineHeight = `${lineHeight}px`;
    textarea.style.color = color;
    textarea.style.border = "1px solid #555";
    textarea.style.background = "rgba(255,255,255,0.95)";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.overflow = "hidden";
    textarea.style.whiteSpace = "pre";
    textarea.style.wrap = "off";
    textarea.style.zIndex = 20000;
    textarea.style.borderRadius = "5px";

    const baseSize = fontSize + padding.y * 2;
    textarea.style.width = baseSize + "px";
    textarea.style.height = baseSize + "px";

    if (canvasWrapper) canvasWrapper.appendChild(textarea);
    else document.body.appendChild(textarea);

    textarea.focus();
    // ===============================
    // Helpers
    // ===============================
    function getPadding(el) {
        const cs = getComputedStyle(el);
        return {
            x: parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight),
            y: parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom),
        };
    }
    let resizing = false;
    function syncSize() {
        if (resizing) return;
        resizing = true;

        const lines = textarea.value.split("\n");
        const pad = getPadding(textarea);
        let maxWidth = baseSize;

        const span = document.createElement("span");
        span.style.position = "absolute";
        span.style.visibility = "hidden";
        span.style.whiteSpace = "pre";
        span.style.font = textarea.style.font;
        document.body.appendChild(span);

        for (const line of lines) {
            span.textContent = line || " ";
            maxWidth = Math.max(maxWidth, span.offsetWidth);
        }
        textarea.style.width = Math.ceil(maxWidth + pad.x + 6) + "px";
        textarea.style.height = Math.ceil(lines.length * lineHeight + pad.y) + "px";

        span.remove();
        requestAnimationFrame(() => (resizing = false));
    }

    textarea.addEventListener("input", syncSize);

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(textarea);

    // ===============================
    // Key handling
    // ===============================
    textarea.addEventListener("keydown", (e) => {
        const keyCombo = (e.shiftKey ? "shift+" : "") + (e.ctrlKey ? "ctrl+" : "") + e.key.toLowerCase();
        if (keyCombo === commitKey) {
            e.preventDefault();
            drawText();
            cleanup();
        }
        if (e.key.toLowerCase() === cancelKey) {
            cleanup();
        }
    });
    function cleanup() {
        resizeObserver.disconnect();
        textarea.remove();
    }
    // ===============================
    // Draw on canvas
    // ===============================
    const colorPallete = ["#6105a7", "#4d8d29", "#0000ff", "#20343D", "#7a0305", "#c406aa"];
    function drawText() {
        navigator.clipboard.writeText(textarea.value.trim());
        ctx.save();
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textBaseline = "top";
        textarea.value.split("\n").forEach((line, i) => {
            if (useColorPalette) ctx.fillStyle = colorPallete[i % colorPallete.length];
            ctx.fillText(line, x, y + i * lineHeight);
        });
        ctx.restore();
    }
    syncSize();
}

//**TODO:----- Save canvas with white background -------*/
async function saveCanvasImage(canvasId, defaultName = "canvas", background = "#ffffff", defaultFormat = "png", quality = 1) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) throw new Error("Canvas not found");

    // 1️⃣ Create offscreen canvas
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    const ctx = exportCanvas.getContext("2d");

    // 2️⃣ Fill solid background
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // 3️⃣ Draw original canvas
    ctx.drawImage(canvas, 0, 0);

    // 4️⃣ File picker
    const handle = await window.showSaveFilePicker({
        suggestedName: `${defaultName}.${defaultFormat}`,
        types: [
            {
                description: "PNG Image",
                accept: { "image/png": [".png"] },
            },
            {
                description: "JPEG Image",
                accept: { "image/jpeg": [".jpg", ".jpeg"] },
            },
            {
                description: "WEBP Image",
                accept: { "image/webp": [".webp"] },
            },
        ],
    });

    // 5️⃣ Detect chosen extension
    const ext = handle.name.split(".").pop().toLowerCase();
    const mimeMap = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
    };

    const mime = mimeMap[ext] || "image/png";

    // 6️⃣ Encode image in selected format
    const blob = await new Promise((res) => exportCanvas.toBlob(res, mime, quality));

    // 7️⃣ Write file
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    alert("✅ Canvas Image exported successfully!");
}

//**TODO:-------- Paste Image on canvas ----------- */

async function setImageScale(clickPosition) {
    return new Promise((resolve) => {
        const existing = document.getElementById("scale-modal");
        if (existing) existing.remove();

        const modal = document.createElement("div");
        modal.id = "scale-modal";

        Object.assign(modal.style, {
            position: "absolute",
            top: "0",
            left: "0",
            width: "235px",
            background: "#fffee1",
            backdropFilter: "blur(10px)",
            border: "2px solid #faf56c",
            borderRadius: "14px",
            padding: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            zIndex: 30000,
            fontFamily: "system-ui, -apple-system, sans-serif",
            transform: "scale(0.95)",
            opacity: "0",
            transition: "all 0.15s ease-out",
        });

        //Position safely inside viewport
        modal.style.left = `${clickPosition.x}px`;
        modal.style.top = `${clickPosition.y}px`;

        // Title
        const title = document.createElement("div");
        title.textContent = "Select Scale";
        Object.assign(title.style, {
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "10px",
            color: "#333",
        });

        modal.appendChild(title);

        // Scale buttons (chips style)
        const scales = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.5];

        const buttonContainer = document.createElement("div");
        Object.assign(buttonContainer.style, {
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "10px",
        });

        scales.forEach((scale) => {
            const btn = document.createElement("button");
            btn.textContent = `${scale}`;

            Object.assign(btn.style, {
                padding: "6px 10px",
                borderRadius: "20px",
                border: "1px solid #ddd",
                background: "#f5f5f5",
                cursor: "pointer",
                fontSize: "12px",
                transition: "all 0.15s ease",
            });

            btn.onmouseenter = () => {
                btn.style.background = "#e8e8e8";
                btn.style.transform = "translateY(-1px)";
            };
            btn.onmouseleave = () => {
                btn.style.background = "#f5f5f5";
                btn.style.transform = "translateY(0)";
            };
            btn.onclick = () => {
                cleanup();
                resolve(scale);
            };
            buttonContainer.appendChild(btn);
        });

        modal.appendChild(buttonContainer);

        // Input section
        const input = document.createElement("input");
        input.type = "number";
        input.placeholder = "Custom scale (e.g. 0.75)";

        Object.assign(input.style, {
            width: "100%",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            outline: "none",
            fontSize: "13px",
            boxSizing: "border-box",
        });

        input.addEventListener("focus", () => {
            input.style.borderColor = "#4a90e2";
        });

        input.addEventListener("blur", () => {
            input.style.borderColor = "#ccc";
        });

        const applyBtn = document.createElement("button");
        applyBtn.textContent = "Apply";

        Object.assign(applyBtn.style, {
            marginTop: "8px",
            width: "100%",
            padding: "8px",
            borderRadius: "8px",
            border: "none",
            background: "#4a90e2",
            color: "#fff",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.15s ease",
        });

        applyBtn.onmouseenter = () => {
            applyBtn.style.background = "#3b7dd8";
        };

        applyBtn.onmouseleave = () => {
            applyBtn.style.background = "#4a90e2";
        };

        applyBtn.onclick = (e) => {
            e.stopPropagation(); // extra safety
            const val = parseFloat(input.value);
            if (!isNaN(val) && val > 0) {
                cleanup();
                resolve(val);
            } else {
                input.style.borderColor = "red";
            }
        };

        input.addEventListener("keydown", (e) => {
            e.stopPropagation(); // ✅ STOP reaching window
            if (e.key === "Enter") applyBtn.click();
        });

        modal.appendChild(input);
        modal.appendChild(applyBtn);

        document.body.appendChild(modal);

        // Animate in
        requestAnimationFrame(() => {
            modal.style.opacity = "1";
            modal.style.transform = "scale(1)";
        });

        function cleanup() {
            modal.style.opacity = "0";
            modal.style.transform = "scale(0.95)";
            setTimeout(() => modal.remove(), 150);
            document.removeEventListener("click", outsideClick);
        }

        function outsideClick(e) {
            if (!modal.contains(e.target)) {
                cleanup();
                resolve(null);
            }
        }

        setTimeout(() => {
            document.addEventListener("click", outsideClick);
        }, 0);
    });
}

function enableCanvasImagePaste({ canvas, ctx, isEnabled, clickPosition }) {
    async function onPaste(e) {
        if (!isEnabled) return;

        const items = e.clipboardData?.items || [];

        // ✅ Step 1: Read image immediately
        let imageItem = null;
        for (const item of items) {
            if (item.type.startsWith("image")) {
                imageItem = item;
                break;
            }
        }

        if (!imageItem) return;

        const blob = imageItem.getAsFile();
        if (!blob) return;

        // ✅ Convert image FIRST (before async)
        const img = new Image();
        const imageUrl = URL.createObjectURL(blob);

        img.src = imageUrl;

        img.onload = async () => {
            // ✅ NOW ask for scale (after image is safe)
            const scale = await setImageScale(clickPosition);

            if (scale === null) return;

            const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

            startDraggablePreview({
                canvas,
                ctx,
                image: img,
                scale,
                startPos: { ...clickPosition },
                snapshot,
            });
        };
    }

    document.addEventListener("paste", onPaste);

    return {
        destroy() {
            document.removeEventListener("paste", onPaste);
        },
    };
}

function startDraggablePreview({ canvas, ctx, image, scale, startPos, snapshot }) {
    let x = startPos.x;
    let y = startPos.y;
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const w = image.width * scale;
    const h = image.height * scale;

    function draw() {
        ctx.putImageData(snapshot, 0, 0);
        ctx.drawImage(image, x, y, w, h);

        ctx.save();
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }

    function inside(px, py) {
        return px >= x && px <= x + w && py >= y && py <= y + h;
    }

    function getMouse(ev) {
        const r = canvas.getBoundingClientRect();
        return {
            x: ev.clientX - r.left,
            y: ev.clientY - r.top,
        };
    }

    function onDown(ev) {
        const { x: mx, y: my } = getMouse(ev);
        if (!inside(mx, my)) return;

        dragging = true;
        offsetX = mx - x;
        offsetY = my - y;
        canvas.style.cursor = "grabbing";
    }

    function onMove(ev) {
        const { x: mx, y: my } = getMouse(ev);

        if (!dragging) {
            canvas.style.cursor = inside(mx, my) ? "grab" : "default";
            return;
        }

        x = mx - offsetX;
        y = my - offsetY;
        draw();
    }

    function onUp() {
        dragging = false;
        canvas.style.cursor = "grab";
    }

    function onKey(ev) {
        const step = ev.shiftKey ? 10 : 1;

        switch (ev.key) {
            case "ArrowLeft":
                ev.preventDefault();
                x -= step;
                draw();
                break;

            case "ArrowRight":
                ev.preventDefault();
                x += step;
                draw();
                break;

            case "ArrowUp":
                ev.preventDefault();
                y -= step;
                draw();
                break;

            case "ArrowDown":
                ev.preventDefault();
                y += step;
                draw();
                break;

            case "Enter":
                ctx.putImageData(snapshot, 0, 0);
                ctx.drawImage(image, x, y, w, h);
                cleanup();
                break;

            case "Escape":
                ctx.putImageData(snapshot, 0, 0);
                cleanup();
                break;
        }
    }

    function cleanup() {
        canvas.removeEventListener("mousedown", onDown);
        canvas.removeEventListener("mousemove", onMove);
        canvas.removeEventListener("mouseup", onUp);
        window.removeEventListener("keydown", onKey);
        canvas.style.cursor = "default";
    }

    draw();
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKey);
}

async function pasteImageByButtonClick({ canvas, ctx, isEnabled, clickPosition }) {
    if (!isEnabled) return;
    try {
        const clipboardItems = await navigator.clipboard.read();

        for (const item of clipboardItems) {
            const imageType = item.types.find((type) => type.startsWith("image/"));

            if (!imageType) continue;

            const blob = await item.getType(imageType);

            const img = new Image();
            const url = URL.createObjectURL(blob);
            img.src = url;

            img.onload = async () => {
                URL.revokeObjectURL(url);

                const scale = await setImageScale(clickPosition);
                if (scale === null) return;

                const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

                startDraggablePreview({
                    canvas,
                    ctx,
                    image: img,
                    scale,
                    startPos: { ...clickPosition },
                    snapshot,
                });
            };

            return;
        }
        alert("Clipboard doesn't contain an image.");
    } catch (err) {
        console.error(err);
        alert("Unable to read clipboard.");
    }
}

//**TODO:-------- For color band ----------- */
function getColorBand(a = 0.2) {
    const hexColors = ["#BE5103", "#ff00ff", "#00ffff", "#ff0000", "#0000ff", "#00ff00"];

    const hexToRgb = (hex) => {
        // Remove the hash if it exists
        const cleanHex = hex.replace("#", "");

        // Parse chunks of 2 characters into base-10 integers
        const r = parseInt(cleanHex.slice(0, 2), 16);
        const g = parseInt(cleanHex.slice(2, 4), 16);
        const b = parseInt(cleanHex.slice(4, 6), 16);

        return { r, g, b };
    };

    const rgbaColors = hexColors.map((hex) => {
        const { r, g, b } = hexToRgb(hex);
        return `rgba(${r},${g},${b},${a})`;
    });

    return rgbaColors;
}

const additionalColors = [
    "#FDE68A", // Pastel Cream
    "#BAE6FD", // Soft Sky Blue
    "#DDD6FE", // Soft Lavender
    "#FBCFE8", // Soft Pink
    "#C6F6D5", // Pastel Mint
    "#78716C", // Neutral Slate Gray
];

function colorList() {
    const colors = [
        "#9A3412", // Terracotta
        "#964B00",
        "#BE5103",
        "#D97706", // Amber
        "#ffa500",
        "#dcb909",
        "#cbd902",
        "#b7fa00",
        "#84cc16",
        "#00ff00",
        "#00faaf",
        "#009c1a",
        "#365314",
        "#0D9488", // Teal
        "#134e4a",
        "#0284C7", // Cerulean
        "#12c1ed",
        "#00ffff",
        "#ffffff",
        "#000000",
        "#ff0000",
        "#fe3b00",
        "#f43f5e",
        "#ff0066",
        "#9f1239",
        "#4B0001",
        "#B163FF",
        "#ffff00",
        "#050372",
        "#0000ff",
        "#0047ab",
        "#2B0057",
        "#51158C",
        "#7F00FF",
        "#6601ff",
        "#cb00cc",
        "#ff00ff",
        "#cc00ff",
        ...additionalColors,
    ];
    let colorGrid = "";
    colors.forEach((color) => {
        colorGrid += `<div class="color-swatch" data-color="${color}" style="background-color: ${color}"></div>`;
    });
    return (
        colorGrid +
        `
        <div style="display:flex; justify-content:center; align-items:center;">
            <input type="color" class="html-color-input" value="#ff0000">
        </div>
        `
    );
}

function consoleLog(log) {
    chrome.runtime.sendMessage({ action: "logMessage", msg: log });
}

/**API functions */
// Global reusable function to check for YouTube API errors
async function handleYouTubeApiError(res) {
    if (res.ok) return false; // No error, caller can continue

    let errorMsg = "❌ An error occurred.";
    try {
        const data = await res.json();
        const err = data?.error;

        if (err?.errors?.some((e) => e.reason === "quotaExceeded")) {
            errorMsg = "🚫 YouTube API quota exceeded. Please try again later.";
        } else if (err?.message) {
            errorMsg = `❌ ${err.message}`;
        }
    } catch (e) {
        errorMsg = `❌ Error parsing response: ${e.message}`;
    }

    displayError(errorMsg);
    return true; // Error was handled
}

// Optional: Utility function to display the error visibly
function displayError(msg) {
    const box = document.createElement("div");
    box.textContent = msg;
    box.style = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #ffdddd;
        color: #900;
        padding: 10px 20px;
        border: 1px solid #f00;
        border-radius: 8px;
        z-index: 9999;
        font-family: sans-serif;
        font-weight: bold;
    `;
    document.body.appendChild(box);

    setTimeout(() => box.remove(), 5000); // Auto-remove after 5 sec
}

//* Copy text of anything
function copyId(id, btn) {
    navigator.clipboard.writeText(id).then(() => {
        const original = btn.innerText;
        btn.innerText = "Copied";
        btn.disabled = true;
        setTimeout(() => {
            btn.innerText = original;
            btn.disabled = false;
        }, 1200);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.toLocaleString("en-GB", { day: "2-digit" });
    const month = date.toLocaleString("en-GB", { month: "long" });
    const year = date.toLocaleString("en-GB", { year: "numeric" });
    return `📅${day}-${month}-${year}`;
}

function formatDateTime(isoString) {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // convert to 12-hour format
    hours = String(hours).padStart(2, "0");

    return `${day}-${month}-${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
}

function getUniqueFileName() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = String(now.getFullYear());
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function parseNumber(v) {
    return parseInt(v, 10) || 0;
}

function formatViews(v) {
    const n = parseNumber(v);
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return v;
}

function loadSymbols() {
    return [
        "✔️",
        "✅",
        "☑️",
        "➡️",
        "⬅️",
        "⬆️",
        "⬇️",
        "🟩",
        "🟥",
        "🟦",
        "✿",
        "❀",
        "✷",
        "𖤐",
        "𖤓",
        "✩",
        "✦",
        "—",
        "➜",
        "➔",
        "➨",
        "➜",
        "▶",
        "⇒",
        "⟹",
        "★",
        "🔹",
        "🔶",
        "⭐",
        "❌",
        "🪰",
        "🪳",
        "🕷️",
        "🦋",
        "🦉",
        "🐧",
        "🏵️",
        "🪲",
        "1️⃣",
        "2️⃣",
        "3️⃣",
        "4️⃣",
        "5️⃣",
        "6️⃣",
        "7️⃣",
        "8️⃣",
        "9️⃣",
        "🔟",
        "❤️",
        "🧡",
        "💛",
        "💚",
        "💙",
        "💜",
    ];
}

function loadStickyNoteShortcuts() {
    const colorPalletes = () => {
        let colorString = "## ";
        const colorNames = [
            "black",
            "dimgray",
            "slategray",
            "darkslategray",
            "darkgray",
            "navy",
            "royalblue",
            "steelblue",
            "teal",
            "darkcyan",
            "maroon",
            "firebrick",
            "brown",
            "saddlebrown",
            "indianred",
            "darkolivegreen",
            "seagreen",
            "forestgreen",
            "darkgreen",
            "indigo",
            "rebeccapurple",
            "darkmagenta",
            "purple",
        ];

        // Build markdown with color spans separated by |
        colorString += colorNames.map((name) => `<span style="color:${name}">${name}</span>`).join(" | ");

        return colorString;
    };

    return [
        {
            header: `——————————————————————————————\n      title\n——————————————————————————————`,
        },
        {
            EqualsHeader: `======================\n      title\n======================`,
        },
        { "h-line": "——————————————————————————" },
        { "tab⟹": "\t⟹ " },
        { "tab➜": "\t➜ " },
        { "tab★": "\t★ " },
        {
            "v-line": `|\n|\n|\n|\n|`,
        },
        {
            "double-v-line": `||\n||\n||\n||\n||`,
        },
        { stars1: "★★★★★★★★★★★★★★★★★" },
        { stars2: "✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦" },
        { "@@@@@": "@@@@@@@@@@@@@@@@@@@@@@@@@@@" },
        { hash: "###########################" },
        { dashes: "-------------------------------------" },
        { equals: "=====================================" },
        { dots: "......................................." },
        { "arrow-line": "➜➜➜➜➜➜➜➜➜➜➜➜➜➜➜➜➜➜➜➜➜" },
        { "boxed-line": "+---------------------------------+" },
        {
            "HTML-list": `<ul style="list-style-type: '➜ '; padding-left: 50px; color: darkblue; font-size: 25px; font-weight: bold">
    <li>list one</li>
    <li>list two</li>
    <li>list three</li>
    <li>list four</li>
    <li>list five</li>
</ul>`,
        },
        {
            WordDefinition: `<span style='display:block;'><span style='font-weight:bold; color:maroon;'>🪰 word ➜ </span>definition</span>`,
        },
        {
            colors: colorPalletes(),
        },
    ];
}

function htmlPreset() {
    return {
        BlockSpan: ["<span style='display: block;'>", "</span>"],
        ListHead: ["<span style='color: darkmagenta; font-weight: bold; font-size: 23px; display: block;'>", "</span>"],
        list: ["<span style='display: block;'>&ensp;&ensp;➜ ", "</span>"],
        BlueBold: ["<span style='color: blue; font-weight: bold;'>", "</span>"],
        GreenBold: ["<span style='color: green; font-weight: bold;'>", "</span>"],
        TextBlue: ["<span style='color: blue; '>", "</span>"],
        TextGreen: ["<span style='color: green; '>", "</span>"],
        Bold: ["<span style='font-weight: bold;'>", "</span>"],
        Link: [`<a style="text-decoration:none; color:teal;" href="#" target="_blank">`, `</a>`],
        heading: [
            "<h2 style='text-align: center; padding: 5px; border-top: 3px solid tomato; border-bottom: 3px solid tomato; color: blue; margin: 50px;'>",
            "</h2>",
        ],
        ParaHead: ["<p style='color: darkmagenta; font-weight: bold; font-size: 25px;'>", "</p>"],
    };
}

//TODO:------------resize by four sides-----------------
function makeResizable(el, options = {}) {
    const MIN_WIDTH = options.minWidth || 200;
    const MIN_HEIGHT = options.minHeight || 150;

    // 1️⃣ Create resizers dynamically
    const resizerDefs = [
        // Corners
        { class: "corner top-left", dir: "tl", cursor: "nwse-resize" },
        { class: "corner top-right", dir: "tr", cursor: "nesw-resize" },
        { class: "corner bottom-left", dir: "bl", cursor: "nesw-resize" },
        { class: "corner bottom-right", dir: "br", cursor: "nwse-resize" },
        // Edges
        { class: "edge top", dir: "t", cursor: "ns-resize" },
        { class: "edge bottom", dir: "b", cursor: "ns-resize" },
        { class: "edge left", dir: "l", cursor: "ew-resize" },
        { class: "edge right", dir: "r", cursor: "ew-resize" },
    ];

    resizerDefs.forEach((def) => {
        const div = document.createElement("div");
        div.className = "resizer " + def.class;
        div.dataset.direction = def.dir;
        div.style.position = "absolute";
        div.style.background = "transparent";
        div.style.zIndex = 10;
        div.style.cursor = def.cursor;

        // Size and positioning for corners
        if (def.class.startsWith("corner")) {
            div.style.width = "20px";
            div.style.height = "20px";
            if (def.dir.includes("t")) div.style.top = "-10px";
            if (def.dir.includes("b")) div.style.bottom = "-10px";
            if (def.dir.includes("l")) div.style.left = "-10px";
            if (def.dir.includes("r")) div.style.right = "-10px";
        } else {
            // Edges
            if (def.dir === "t" || def.dir === "b") {
                div.style.height = "10px";
                div.style.left = "10px";
                div.style.right = "10px";
                if (def.dir === "t") div.style.top = "-5px";
                else div.style.bottom = "-5px";
            } else {
                div.style.width = "10px";
                div.style.top = "10px";
                div.style.bottom = "10px";
                if (def.dir === "l") div.style.left = "-5px";
                else div.style.right = "-5px";
            }
        }

        el.appendChild(div);
    });

    // 2️⃣ Resizing logic
    let startX, startY, startWidth, startHeight, startLeft, startTop;
    let currentDirection = "";

    const resizers = el.querySelectorAll(".resizer");
    resizers.forEach((resizer) => resizer.addEventListener("mousedown", resizeMouseDown));

    function resizeMouseDown(e) {
        e.preventDefault();
        currentDirection = e.target.dataset.direction;

        const rect = el.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startWidth = rect.width;
        startHeight = rect.height;
        startLeft = rect.left;
        startTop = rect.top;

        document.addEventListener("mousemove", elementResize);
        document.addEventListener("mouseup", closeResizeElement);
    }
    function elementResize(e) {
        let dx = e.clientX - startX;
        let dy = e.clientY - startY;
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        const dir = currentDirection;

        if (dir.includes("r")) newWidth = startWidth + dx;
        if (dir.includes("l")) {
            newWidth = startWidth - dx;
            newLeft = startLeft + dx;
        }
        if (dir.includes("b")) newHeight = startHeight + dy;
        if (dir.includes("t")) {
            newHeight = startHeight - dy;
            newTop = startTop + dy;
        }

        if (newWidth < MIN_WIDTH) {
            newWidth = MIN_WIDTH;
            if (dir.includes("l")) newLeft = startLeft + startWidth - MIN_WIDTH;
        }
        if (newHeight < MIN_HEIGHT) {
            newHeight = MIN_HEIGHT;
            if (dir.includes("t")) newTop = startTop + startHeight - MIN_HEIGHT;
        }
        el.style.width = newWidth + "px";
        el.style.height = newHeight + "px";
        el.style.left = newLeft + "px";
        el.style.top = newTop + "px";
    }
    function closeResizeElement() {
        document.removeEventListener("mousemove", elementResize);
        document.removeEventListener("mouseup", closeResizeElement);
    }
}
function makeTouchResizable(el, options = {}) {
    const MIN_WIDTH = options.minWidth || 200;
    const MIN_HEIGHT = options.minHeight || 150;

    el.style.touchAction = "none";

    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const HANDLE_SIZE = isTouch ? 34 : 20;
    const EDGE_SIZE = isTouch ? 18 : 10;

    // Remove existing resizers (if any)
    el.querySelectorAll(".resizer").forEach((r) => r.remove());

    const resizerDefs = [
        // Corners
        { class: "corner top-left", dir: "tl", cursor: "nwse-resize" },
        { class: "corner top-right", dir: "tr", cursor: "nesw-resize" },
        { class: "corner bottom-left", dir: "bl", cursor: "nesw-resize" },
        { class: "corner bottom-right", dir: "br", cursor: "nwse-resize" },

        // Edges
        { class: "edge top", dir: "t", cursor: "ns-resize" },
        { class: "edge bottom", dir: "b", cursor: "ns-resize" },
        { class: "edge left", dir: "l", cursor: "ew-resize" },
        { class: "edge right", dir: "r", cursor: "ew-resize" },
    ];

    resizerDefs.forEach((def) => {
        const div = document.createElement("div");

        div.className = "resizer " + def.class;
        div.dataset.direction = def.dir;

        div.style.position = "absolute";
        div.style.background = "transparent";
        div.style.zIndex = "100";
        div.style.cursor = def.cursor;
        div.style.touchAction = "none";
        div.style.userSelect = "none";

        if (def.class.startsWith("corner")) {
            div.style.width = HANDLE_SIZE + "px";
            div.style.height = HANDLE_SIZE + "px";

            const offset = HANDLE_SIZE / 2;

            if (def.dir.includes("t")) div.style.top = -offset + "px";
            if (def.dir.includes("b")) div.style.bottom = -offset + "px";
            if (def.dir.includes("l")) div.style.left = -offset + "px";
            if (def.dir.includes("r")) div.style.right = -offset + "px";
        } else {
            if (def.dir === "t" || def.dir === "b") {
                div.style.height = EDGE_SIZE + "px";
                div.style.left = HANDLE_SIZE / 2 + "px";
                div.style.right = HANDLE_SIZE / 2 + "px";

                if (def.dir === "t") div.style.top = -(EDGE_SIZE / 2) + "px";
                else div.style.bottom = -(EDGE_SIZE / 2) + "px";
            } else {
                div.style.width = EDGE_SIZE + "px";
                div.style.top = HANDLE_SIZE / 2 + "px";
                div.style.bottom = HANDLE_SIZE / 2 + "px";

                if (def.dir === "l") div.style.left = -(EDGE_SIZE / 2) + "px";
                else div.style.right = -(EDGE_SIZE / 2) + "px";
            }
        }

        div.addEventListener("pointerdown", resizePointerDown);

        el.appendChild(div);
    });

    let startX, startY, startWidth, startHeight, startLeft, startTop, currentDirection;

    function resizePointerDown(e) {
        e.preventDefault();
        e.stopPropagation();

        currentDirection = e.target.dataset.direction;

        const rect = el.getBoundingClientRect();

        startX = e.clientX;
        startY = e.clientY;

        startWidth = rect.width;
        startHeight = rect.height;

        startLeft = rect.left;
        startTop = rect.top;

        e.target.setPointerCapture(e.pointerId);

        document.addEventListener("pointermove", elementResize);
        document.addEventListener("pointerup", stopResize);
        document.addEventListener("pointercancel", stopResize);
    }

    function elementResize(e) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        const dir = currentDirection;

        if (dir.includes("r")) newWidth = startWidth + dx;

        if (dir.includes("l")) {
            newWidth = startWidth - dx;
            newLeft = startLeft + dx;
        }

        if (dir.includes("b")) newHeight = startHeight + dy;

        if (dir.includes("t")) {
            newHeight = startHeight - dy;
            newTop = startTop + dy;
        }

        if (newWidth < MIN_WIDTH) {
            newWidth = MIN_WIDTH;

            if (dir.includes("l")) newLeft = startLeft + startWidth - MIN_WIDTH;
        }

        if (newHeight < MIN_HEIGHT) {
            newHeight = MIN_HEIGHT;

            if (dir.includes("t")) newTop = startTop + startHeight - MIN_HEIGHT;
        }

        el.style.width = newWidth + "px";
        el.style.height = newHeight + "px";
        el.style.left = newLeft + "px";
        el.style.top = newTop + "px";
    }

    function stopResize() {
        document.removeEventListener("pointermove", elementResize);
        document.removeEventListener("pointerup", stopResize);
        document.removeEventListener("pointercancel", stopResize);
    }
}

//TODO:-----------Text Editor Utility------------------------
function joinSelectedLines(textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Nothing selected → do nothing
    if (start === end) return;

    const value = textarea.value;

    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    // Normalize line breaks and collapse into single spaces
    const joined = selected
        .replace(/\r?\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    textarea.value = before + joined + after;

    // Restore selection around modified text
    textarea.selectionStart = start;
    textarea.selectionEnd = start + joined.length;

    textarea.focus();
}

function getFontSize(el) {
    return parseFloat(window.getComputedStyle(el).fontSize);
}

async function exportText(content) {
    if (!content) return alert("Note is empty!");
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: getUniqueFileName(),
            types: [
                {
                    description: "Text File",
                    accept: { "text/plain": [".txt"] },
                },
            ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        alert("✅ Note exported successfully!");
    } catch (err) {
        if (err.name !== "AbortError") console.error(err);
    }
}

function makeTouchDraggable(el, calcNew = true) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const titleBar = el.querySelector(".title") || el;

    titleBar.style.cursor = "grab";

    // Required for left/top to work
    el.style.position = "fixed";

    // Initial position if none
    if (!el.style.left) {
        el.style.left = "10px";
        el.style.top = "10px";
    }

    function getPoint(e) {
        if (e.touches)
            return {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            };

        return {
            x: e.clientX,
            y: e.clientY,
        };
    }

    function start(e) {
        if (e.target !== titleBar) return;

        dragging = true;

        const p = getPoint(e);

        offsetX = p.x - el.offsetLeft;
        offsetY = p.y - el.offsetTop;

        titleBar.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
    }

    function move(e) {
        if (!dragging) return;
        titleBar.style.cursor = "grabbing";

        const p = getPoint(e);

        let left = p.x - offsetX;
        let top = p.y - offsetY;

        if (calcNew) [left, top] = preventOffscreen(left, top);

        el.style.left = left + "px";
        el.style.top = top + "px";

        if (e.cancelable) e.preventDefault();
    }

    function end() {
        dragging = false;
        titleBar.style.cursor = "grab";
        document.body.style.userSelect = "";
    }

    titleBar.addEventListener("mousedown", start);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", end);

    titleBar.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);

    function preventOffscreen(left, top) {
        left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, left));
        top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, top));
        return [left, top];
    }
}
