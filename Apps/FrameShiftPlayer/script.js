let windowState = {
    width: "640px",
    height: "420px",
    left: "120px",
    top: "80px",
};

let isFullscreen = false;
let isMinimized = false;
let currentFileBaseName = "";
let currentMediaFile = null;
let currentMediaUrl = null;

/* Create Player Window */
const framePlayer = document.getElementById("frameShiftPlayer");

/* Enable drag + resize (Already provided by user) */
// makeDraggable(framePlayer);
makeTouchDraggable(framePlayer);
makeResizable(framePlayer);

framePlayer.querySelector("#placeFpLeftBtn").onclick = () => resizeLeftHalf(framePlayer);
framePlayer.querySelector("#placeFpRightBtn").onclick = () => resizeRightHalf(framePlayer);

const previewWindow = document.getElementById("previewWindow");
// makeDraggable(previewWindow);
makeTouchDraggable(previewWindow);
makeResizable(previewWindow, {
    minWidth: 300,
    minHeight: 200,
});

document.getElementById("closePreview").onclick = () => {
    previewWindow.classList.add("hidden");
    const player = document.getElementById("split-player");
    player.pause();
};

/* -----------------------------
    Player Logic
    ----------------------------- */

const video = framePlayer.querySelector("#fsVideo");
const dropArea = framePlayer.querySelector("#dropArea");

const playBtn = framePlayer.querySelector("#playBtn");
const forwardBtn = framePlayer.querySelector("#fastForward");
const backwardBtn = framePlayer.querySelector("#fastBackward");
const skipTime = framePlayer.querySelector("#setForBackTime");
const captureBtn = framePlayer.querySelector("#captureBtn");

const progress = framePlayer.querySelector("#progress");
const hoverTime = document.getElementById("hoverTime");
const elapsedTime = framePlayer.querySelector("#elapsedTime");
const timeDisplay = framePlayer.querySelector("#timeDisplay");

function setClipInformtion(info) {
    const clipInfo = document.querySelector(".clip-info-div");
    const linkStyle = `
            text-decoration: none;
            font-style: inherit;
            color: inherit;
        `;
    clipInfo.innerHTML = `
            <span>
                <a style="${linkStyle}" href="https://www.youtube.com/results?search_query=${info}" target="_blank">
                    ${info}
                </a>
            </span>
        `;
    document.title = info;
}

document.getElementById("loadVideoBtn").onclick = () => {
    document.getElementById("videoFileInput").click();
};

document.getElementById("videoFileInput").onchange = (e) => {
    const file = e.target.files[0];
    if (!file || !(file.type.startsWith("video/") || file.type.startsWith("audio/"))) return;
    currentMediaFile = file;
    currentMediaUrl = null;
    currentFileBaseName = file.name.replace(/\.[^/.]+$/, "");
    setClipInformtion(currentFileBaseName);
    video.src = URL.createObjectURL(file);
};

/* Drag & Drop Video */
dropArea.addEventListener("dragover", (e) => e.preventDefault());

dropArea.addEventListener("drop", (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    if (!file) return;
    /* =========================
                VIDEO / AUDIO FILE
        ========================= */
    if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
        currentMediaFile = file;
        currentMediaUrl = null;
        currentFileBaseName = file.name.replace(/\.[^/.]+$/, "");
        video.src = URL.createObjectURL(file);
        setClipInformtion(currentFileBaseName);
        return;
    }
    /* =========================
                srt / vtt / json FILE
        ========================= */
    if (file.name.endsWith(".srt") || file.name.endsWith(".vtt") || file.name.endsWith(".json")) {
        getTranscript(file);
        return;
    }
    /* =========================
            CSV BOOKMARK FILE
        ========================= */
    if (file.name.toLowerCase().endsWith(".csv")) {
        importCSV(file);
        return;
    }
});

function togglePlay() {
    if (!video.duration) return;
    if (video.paused) {
        video.play();
        playBtn.textContent = "⏸";
    } else {
        video.pause();
        playBtn.textContent = "▶";
    }
}
/* Play Pause */
playBtn.onclick = togglePlay;

document.getElementById("stopBtn").onclick = () => {
    video.pause();
    video.currentTime = 0;
};

/* Skip Controls */
function forwardVideo() {
    if (!video.duration) return;
    const seconds = parseInt(skipTime.value) || 5;
    video.currentTime = Math.min(video.currentTime + seconds, video.duration);
    showHUD(`⏩ +${seconds}s`);
}
function backwardVideo() {
    if (!video.duration) return;
    const seconds = parseInt(skipTime.value) || 5;
    video.currentTime = Math.max(video.currentTime - seconds, 0);
    showHUD(`⏪ -${seconds}s`);
}
forwardBtn.onclick = forwardVideo;
backwardBtn.onclick = backwardVideo;

const format = (seconds, showMs = false) => {
    if (!seconds || isNaN(seconds)) return showMs ? "00:00.000" : "00:00";

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const hh = h > 0 ? h.toString().padStart(2, "0") + ":" : "";
    const mm = m.toString().padStart(2, "0") + ":";
    const ss = s.toString().padStart(2, "0");

    if (showMs) {
        const ms = Math.floor((seconds % 1) * 1000);
        const mss = ms.toString().padStart(3, "0");

        return hh + mm + ss + "." + mss;
    }

    return hh + mm + ss;
};

/* Progress */
video.addEventListener("timeupdate", () => {
    progress.value = (video.currentTime / video.duration) * 100 || 0;
    elapsedTime.textContent = `${format(video.currentTime)}`;
    timeDisplay.textContent = `${format(video.duration - video.currentTime)} / ${format(video.duration || 0)}`;
});

progress.addEventListener("input", () => {
    video.currentTime = (progress.value / 100) * video.duration;
});

progress.addEventListener("mousemove", (e) => {
    if (!video.duration) return;

    const rect = progress.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;

    const hoverSeconds = percent * video.duration;

    hoverTime.textContent = format(hoverSeconds);

    hoverTime.style.left = e.clientX - rect.left + 150 + "px";
    hoverTime.style.display = "block";
});

progress.addEventListener("mouseleave", () => {
    hoverTime.style.display = "none";
});

/* Volume Control (Mouse Wheel) */
framePlayer.addEventListener("wheel", (e) => {
    video.volume = Math.min(1, Math.max(0, video.volume - e.deltaY * 0.001));
});

/* Capture Frame */
captureBtn.onclick = async () => {
    if (video.readyState < 2) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    /* Convert canvas → blob (IMPORTANT ⭐) */
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");

    const filename =
        now.getFullYear().toString() +
        pad(now.getMonth() + 1) +
        pad(now.getDate()) +
        "-" +
        pad(now.getHours()) +
        pad(now.getMinutes()) +
        pad(now.getSeconds()) +
        ".png";

    chrome.runtime.sendMessage({
        action: "saveFrame",
        filename: `${currentFileBaseName}/${filename}`,
        url: URL.createObjectURL(blob),
    });
    showHUD("📸");
};

/* Keyboard Shortcuts */
framePlayer.tabIndex = 0;
framePlayer.focus();

framePlayer.addEventListener("keydown", (e) => {
    if (document.activeElement !== framePlayer) return;

    switch (e.key) {
        case "ArrowRight":
            forwardVideo();
            break;

        case "ArrowLeft":
            backwardVideo();
            break;

        case " ":
            e.preventDefault();
            playBtn.click();
            break;

        case "c":
        case "C":
            captureBtn.click();
            break;
    }
});

const closeBtn = framePlayer.querySelector(".closeFramePlayer");
const fullscreenBtn = framePlayer.querySelector(".fullscreenFramePlayer");
const minmaxBtn = framePlayer.querySelector(".maxminFramePlayer");

closeBtn.onclick = () => {
    ["frameShiftPlayer", "bookmarkWindow"].forEach((id) => {
        document.getElementById(id)?.remove();
    });
};

const resizeObserver = new ResizeObserver(() => {
    if (!isFullscreen && !isMinimized) {
        windowState.width = framePlayer.style.width;
        windowState.height = framePlayer.style.height;
        windowState.left = framePlayer.style.left;
        windowState.top = framePlayer.style.top;
    }
});

resizeObserver.observe(framePlayer);

fullscreenBtn.onclick = fullScreenControl;

document.querySelector(".maxFramePlayer").onclick = () => {
    if (!isFullscreen) {
        // store current size before fullscreen
        isFullscreen = true;

        framePlayer.style.left = "0px";
        framePlayer.style.top = "0px";
        framePlayer.style.width = "100vw";
        framePlayer.style.height = "100vh";
    } else {
        framePlayer.style.width = windowState.width;
        framePlayer.style.height = windowState.height;
        framePlayer.style.left = windowState.left;
        framePlayer.style.top = windowState.top;

        isFullscreen = false;
    }
};

minmaxBtn.onclick = () => {
    const content = framePlayer.querySelector(".player-content");
    const controls = framePlayer.querySelector(".controls");

    if (!isMinimized) {
        content.style.display = "none";
        controls.style.display = "none";

        // shrink window to title bar only
        framePlayer.style.height = "40px";

        isMinimized = true;
    } else {
        content.style.display = "block";
        controls.style.display = "flex";

        // restore last height from windowState
        framePlayer.style.height = windowState.height;

        isMinimized = false;
    }
};

function fullScreenControl() {
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
    }
}

video.addEventListener("dblclick", fullScreenControl);
video.addEventListener("click", togglePlay);

//TODO:----------------------Bookmark Time stamp-------------------------
let bookmarks = [];
// [
//     { id: 1, time: 15.32, name: "bookmark1" },
//     { id: 2, time: 45.11, name: "Important scene" },
//     { id: 3, time: 120.52, name: "bookmark3" },
// ];
let selectedBookmarks = new Set();
let lastSelectedIndex = null;

const displayBookmarkWindomBtn = document.getElementById("displayBookmarkWindomBtn");
const addBookmarkBtn = document.getElementById("addBookmarkBtn");

addBookmarkBtn.onclick = addBookmark;
displayBookmarkWindomBtn.onclick = createBookmarkDisplay;

document.addEventListener("keydown", (e) => {
    /* =========================
        Prevent multiline bookmark name
        ========================= */
    if (e.target.closest("#bookmarkTable") && e.key === "Enter") {
        e.preventDefault();
        e.target.blur();
        framePlayer.focus();
        return;
    }
    /* =========================
            Player shortcuts
        ========================= */
    if (document.activeElement !== framePlayer) return;
    if (e.key.toLowerCase() === "b") {
        addBookmark();
    }
});

function addBookmark() {
    if (!video.duration) return;

    const time = video.currentTime;

    const bookmark = {
        id: bookmarks.length + 1,
        time: time,
        name: `bookmark${bookmarks.length + 1}`,
    };
    bookmarks.push(bookmark);
    showHUD("🔖");
    createBookmarkDisplay();
    renderBookmarkTable();
    requestAnimationFrame(() => {
        const table = document.querySelector(".bookmark-content");
        table.scrollTo({ top: table.scrollHeight, behavior: "smooth" });
    });
}

function createBookmarkDisplay() {
    if (document.getElementById("bookmarkWindow")) return;

    const bookmarkWindow = document.createElement("div");
    bookmarkWindow.id = "bookmarkWindow";
    bookmarkWindow.innerHTML = `
            <div class="title-bar">
                <span class="title">📑 Bookmarks</span>
                <div>
                    <button id="closeBookmarkWindow">❌</button>
                </div>
            </div>
            <div class="bookmark-content">
                <table id="bookmarkTable">
                    <thead>
                        <tr>
                            <th>SL</th>
                            <th>Timestamp</th>
                            <th>Name</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
            <div class="bookmark-controls">
                <div>
                    <button id="exportBookmarks" title="Export bookmarks">EXP</button>
                    <button id="importBookmarks" title="Import bookmarks">IMP</button>
                </div>
                <div>
                    <button id="moveUpBookmark" title="Move up selected bookmarks">🔼</button>
                    <button id="moveDownBookmark" title="Move down selected bookmarks">🔽</button>
                </div>
            </div>
        `;
    document.body.appendChild(bookmarkWindow);

    // makeDraggable(bookmarkWindow);
    makeTouchDraggable(bookmarkWindow);
    makeResizable(bookmarkWindow);

    document.getElementById("exportBookmarks").onclick = exportCSV;
    document.getElementById("importBookmarks").onclick = () => importCSV(null);
    document.getElementById("closeBookmarkWindow").onclick = () => bookmarkWindow.remove();

    renderBookmarkTable();

    document.getElementById("moveUpBookmark").onclick = () => {
        const sorted = [...selectedBookmarks].sort((a, b) => a - b);
        sorted.forEach((i) => {
            if (i === 0) return;
            [bookmarks[i - 1], bookmarks[i]] = [bookmarks[i], bookmarks[i - 1]];
            selectedBookmarks.delete(i);
            selectedBookmarks.add(i - 1);
        });
        renderBookmarkTable();
    };

    document.getElementById("moveDownBookmark").onclick = () => {
        const sorted = [...selectedBookmarks].sort((a, b) => b - a);
        sorted.forEach((i) => {
            if (i >= bookmarks.length - 1) return;
            [bookmarks[i], bookmarks[i + 1]] = [bookmarks[i + 1], bookmarks[i]];
            selectedBookmarks.delete(i);
            selectedBookmarks.add(i + 1);
        });
        renderBookmarkTable();
    };
}

function renderBookmarkTable() {
    const tbody = document.querySelector("#bookmarkTable tbody");
    tbody.innerHTML = "";

    bookmarks.forEach((b, i) => {
        const tr = document.createElement("tr");
        tr.dataset.index = i;

        if (selectedBookmarks.has(i)) tr.classList.add("selected");

        tr.innerHTML = `
                <td>${i + 1}</td>
                <td class="timestamp-cell">
                    <span class="timestamp" data-time="${b.time}">
                        ${format(b.time, true)}
                    </span>
                    <button class="modifyTimestamp" data-index="${i}">
                        ♻
                    </button>
                </td>
                <td contenteditable="true">${b.name}</td>
                <td class="deleteBookmark" data-index="${i}">⛔</td>
            `;
        tbody.appendChild(tr);
    });

    // Row Selection Logic (Ctrl / Shift)
    tbody.onclick = (e) => {
        /* Ignore clicks inside editable name cell */
        if (e.target.hasAttribute("contenteditable") || e.target.classList.contains("modifyTimestamp")) {
            return;
        }

        const row = e.target.closest("tr");
        if (!row) return;

        const index = Number(row.dataset.index);

        /* SHIFT selection (range) */
        if (e.shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(index, lastSelectedIndex);
            const end = Math.max(index, lastSelectedIndex);
            for (let i = start; i <= end; i++) selectedBookmarks.add(i);
            /* CTRL toggle */
        } else if (e.ctrlKey) {
            if (selectedBookmarks.has(index)) selectedBookmarks.delete(index);
            else selectedBookmarks.add(index);
            lastSelectedIndex = index;
            /* NORMAL CLICK (toggle) */
        } else {
            if (selectedBookmarks.size === 1 && selectedBookmarks.has(index)) {
                selectedBookmarks.clear(); // unselect
                lastSelectedIndex = null;
            } else {
                selectedBookmarks.clear();
                selectedBookmarks.add(index);
                lastSelectedIndex = index;
            }
        }
        renderBookmarkTable();
    };

    tbody.querySelectorAll(".modifyTimestamp").forEach((btn) => {
        btn.onclick = (e) => {
            e.stopPropagation();

            if (!video.duration) return;
            const index = Number(btn.dataset.index);
            bookmarks[index].time = video.currentTime;

            framePlayer.focus();
            renderBookmarkTable();
        };
    });
}

document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("deleteBookmark")) return;
    const index = Number(e.target.dataset.index);
    bookmarks.splice(index, 1);
    renderBookmarkTable();
});

document.addEventListener("click", (e) => {
    if (e.target.classList.contains("timestamp")) {
        const time = parseFloat(e.target.dataset.time);
        video.currentTime = time;
        video.play();
        framePlayer.focus();
    }
});

document.addEventListener("input", (e) => {
    const cell = e.target;
    if (!cell.closest("#bookmarkTable")) return;
    if (!cell.hasAttribute("contenteditable")) return;

    const row = cell.parentElement;
    const index = row.rowIndex - 1;
    bookmarks[index].name = cell.textContent.trim();
});

async function exportCSV() {
    if (bookmarks.length === 0) return alert("No bookmarks to export!");

    // Generate CSV content
    let csv = "sl,timestamp,bookmark_name\n";
    bookmarks.forEach((b, i) => {
        csv += `${i + 1},${b.time},${b.name}\n`;
    });

    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: `${currentFileBaseName}__bookmarks.csv`,
            types: [
                {
                    description: "CSV File",
                    accept: { "text/csv": [".csv"] },
                },
            ],
        });

        const writable = await handle.createWritable();
        await writable.write(csv);
        await writable.close();
        alert("✅ Bookmarks exported successfully!");
    } catch (err) {
        if (err.name !== "AbortError") console.error(err);
        // User canceled, do nothing
    }
}

async function importCSV(dropFile) {
    try {
        let file;
        if (!dropFile) {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [
                    {
                        description: "CSV file",
                        accept: { "text/csv": [".csv", ".CSV"] },
                    },
                ],
                multiple: false,
            });
            file = await fileHandle.getFile();
        } else {
            file = dropFile;
        }

        const reader = new FileReader();

        reader.onload = function () {
            const lines = reader.result.split("\n").slice(1);

            bookmarks = [];

            lines.forEach((line) => {
                if (!line.trim()) return;

                const [sl, time, ...nameParts] = line.split(",");
                const name = nameParts.join(", ").trim();

                bookmarks.push({
                    id: Number(sl),
                    time: Number(time),
                    name,
                });
            });
            if (dropFile) createBookmarkDisplay();
            else renderBookmarkTable();
        };

        reader.readAsText(file);
    } catch (err) {
        console.log("Import cancelled or failed:", err);
    }
}

// TODO:----------notification timer---------------
let hudTimer = null;
function showHUD(text, duration = 800) {
    const hud = document.getElementById("playerHUD");
    if (!hud) return;

    hud.textContent = text;
    hud.classList.add("show");

    clearTimeout(hudTimer);

    hudTimer = setTimeout(() => {
        hud.classList.remove("show");
    }, duration);
}

// TODO:----------subtitle/transcript feature---------------
let currentSplitUrl = null;
let currentSplitFormat = "mp4";

const subtitleInput = document.getElementById("subtitleInput");

document.getElementById("uploadSubtitleBtn").onclick = () => {
    subtitleInput.click();
};

subtitleInput.addEventListener("change", handleSubtitleFile);

let transcript = null;
async function handleSubtitleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    getTranscript(file);
}

async function getTranscript(file) {
    const text = await file.text();
    if (file.name.endsWith(".srt")) {
        transcript = parseSRT(text);
        console.log(transcript);
    } else if (file.name.endsWith(".vtt")) {
        const input = prompt("Subtitle offset in seconds (+/- allowed):", "0");
        const SUB_OFFSET = Number(input) || 0;
        transcript = parseVTT(text, SUB_OFFSET);
    } else if (file.name.endsWith(".json")) {
        transcript = JSON.parse(text);
    }
    renderTranscript();
}

function parseSRT(srt) {
    const lines = srt
        .replace(/\r/g, "")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== "");

    const filtered = lines.filter((line) => !/^\d+$/.test(line));

    const result = [];

    for (let i = 0; i < filtered.length; i += 2) {
        const timeLine = filtered[i];
        const textLine = filtered[i + 1];

        if (!timeLine || !textLine) continue;

        const [start, end] = timeLine.split("-->").map((s) => s.trim());

        result.push({
            start: toSec(start),
            end: toSec(end),
            text: textLine,
        });
    }
    return result;
}

function parseVTT(vtt, offset = 0) {
    const lines = vtt.replace(/\r/g, "").split("\n");

    const result = [];

    let i = 0;

    while (i < lines.length) {
        let line = lines[i].trim();

        if (line === "" || line === "WEBVTT" || line.startsWith("NOTE")) {
            i++;
            continue;
        }

        if (!line.includes("-->")) {
            i++;
            continue;
        }

        const [start, endPart] = line.split("-->").map((s) => s.trim());

        const end = endPart.split(/\s+/)[0];

        i++;

        const textLines = [];

        while (i < lines.length && lines[i].trim() !== "") {
            const current = lines[i].trim();

            // duplicate timestamp inside same cue
            if (current.includes("-->")) {
                break;
            }

            textLines.push(current);

            i++;
        }

        // skip duplicated cue
        while (i < lines.length && lines[i].trim() !== "") {
            if (lines[i].includes("-->")) {
                i++;

                while (i < lines.length && lines[i].trim() !== "") {
                    i++;
                }
            } else {
                break;
            }
        }

        while (i < lines.length && lines[i].trim() === "") {
            i++;
        }

        if (!textLines.length) continue;

        let text = textLines.join(" ");

        text = text.replace(/<[^>]+>/g, "");

        const cue = {
            start: toSec(start) + offset,
            end: toSec(end) + offset,
            text: text.trim(),
        };

        const duplicate = result.some((item) => item.start === cue.start && item.end === cue.end && item.text === cue.text);

        if (!duplicate) {
            result.push(cue);
        }
    }
    console.log(result);
    return result;
}

function toSec(time) {
    time = time.replace(",", ".");

    const parts = time.split(":");

    let h = 0;
    let m = 0;
    let s = 0;

    if (parts.length === 3) {
        h = Number(parts[0]);
        m = Number(parts[1]);
        s = Number(parts[2]);
    } else {
        m = Number(parts[0]);
        s = Number(parts[1]);
    }

    return h * 3600 + m * 60 + s;
}

const transcriptWindow = document.getElementById("transcriptWindow");
const transcriptContent = transcriptWindow.querySelector(".transcript-content");

function renderTranscript() {
    transcriptContent.innerHTML = "";
    transcript.forEach((item, i) => {
        const span = document.createElement("span");
        span.textContent = item.text + " ";
        span.dataset.index = i;

        span.onclick = () => {
            video.currentTime = item.start;
            video.play();
        };
        transcriptContent.appendChild(span);
    });
}

const overlay = document.getElementById("subtitleOverlay");

let currentIndex = -1;
video.addEventListener("timeupdate", () => {
    if (!transcript) return;

    const t = video.currentTime;

    const index = transcript.findIndex((item) => t >= item.start && t < item.end);

    if (index !== currentIndex) {
        currentIndex = index;
        overlay.textContent = index !== -1 ? transcript[index].text : "";
        // Highlight transcript
        document.querySelectorAll("#transcriptWindow span").forEach((span) => span.classList.remove("active"));
        const el = document.querySelector(`.transcript-content span[data-index="${index}"]`);
        if (el) {
            el.classList.add("active");
            el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
    }
});

// subtitle on/off
document.getElementById("toggleSubtitle").onclick = () => {
    overlay.style.display = overlay.style.display === "none" ? "block" : "none";
    document.getElementById("toggleSubtitle").style.background = "blue";
};

// transcript on/off
document.getElementById("toggleTranscript").onclick = () => {
    transcriptWindow.style.display = transcriptWindow.style.display === "none" ? "block" : "none";
};

document.getElementById("increase-transcript-font").onclick = () => {
    const currentSize = getFontSize(transcriptContent);
    transcriptContent.style.fontSize = currentSize + 2 + "px";
};
document.getElementById("decrease-transcript-font").onclick = () => {
    const currentSize = getFontSize(transcriptContent);
    transcriptContent.style.fontSize = currentSize - 2 + "px";
};

// makeDraggable(transcriptWindow);
makeTouchDraggable(transcriptWindow);
makeResizable(transcriptWindow);

// TODO:----------Media Splitter feature---------------

const mediaSplitterBtn = document.getElementById("mediaSplitter");
const splitterModal = document.getElementById("splitterModal");

const toggleAllHeader = document.getElementById("toggleAllHeader");

// summary table
const selectedClipCount = document.getElementById("selectedClipCount");
const selectedDuration = document.getElementById("selectedDuration");
const selectedPercent = document.getElementById("selectedPercent");

const unselectedClipCount = document.getElementById("unselectedClipCount");
const unselectedDuration = document.getElementById("unselectedDuration");
const unselectedPercent = document.getElementById("unselectedPercent");

const totalClipCount = document.getElementById("totalClipCount");
const totalDuration = document.getElementById("totalDuration");

mediaSplitterBtn.addEventListener("click", () => {
    splitterModal.classList.toggle("hidden");
    // makeDraggable(splitterModal);
    makeTouchDraggable(splitterModal);
});

document.querySelector(".close-splitter-modal").onclick = () => {
    splitterModal.classList.add("hidden");
};

function secondsToTimestamp(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return [String(hrs).padStart(2, "0"), String(mins).padStart(2, "0"), String(secs).padStart(2, "0"), String(ms).padStart(3, "0")].join(":");
}

function timestampToSeconds(timestamp) {
    const [hh, mm, ss, ms] = timestamp.split(":").map(Number);
    return hh * 3600 + mm * 60 + ss + ms / 1000;
}

const setStartBtn = document.getElementById("setStartBtn");
const setEndBtn = document.getElementById("setEndBtn");

const splitBtn = document.getElementById("splitBtn");
const outputFormat = document.getElementById("selectOutputFormat");
const splitMode = document.getElementById("splitMode");

const clipTableBody = document.getElementById("clipTableBody");
const addClipBtn = document.getElementById("addClipBtn");
const setStartHeader = document.getElementById("setStartHeader");
const setEndHeader = document.getElementById("setEndHeader");

// Selected Row Helper
function getSelectedRow() {
    return document.querySelector("#clipTableBody .selected-row");
}
// Duration Helper
function updateDuration(row) {
    const start = timestampToSeconds(row.cells[2].textContent.trim());
    const end = timestampToSeconds(row.cells[3].textContent.trim());
    const duration = Math.max(0, end - start);
    row.cells[4].textContent = secondsToTimestamp(duration);
}

// For summary table
function updateClipStatistics() {
    let selectedCount = 0;
    let unselectedCount = 0;

    let selectedSeconds = 0;
    let unselectedSeconds = 0;

    [...clipTableBody.rows].forEach((row) => {
        const checked = row.querySelector(".clip-check").checked;
        const duration = timestampToSeconds(row.cells[4].textContent.trim());

        if (checked) {
            selectedCount++;
            selectedSeconds += duration;
        } else {
            unselectedCount++;
            unselectedSeconds += duration;
        }
    });

    const totalCount = selectedCount + unselectedCount;
    const totalSeconds = selectedSeconds + unselectedSeconds;

    selectedClipCount.textContent = selectedCount;
    selectedDuration.textContent = secondsToTimestamp(selectedSeconds);
    unselectedClipCount.textContent = unselectedCount;
    unselectedDuration.textContent = secondsToTimestamp(unselectedSeconds);
    totalClipCount.textContent = totalCount;
    totalDuration.textContent = secondsToTimestamp(totalSeconds);
    selectedPercent.textContent = totalSeconds ? `${Math.round((selectedSeconds * 100) / totalSeconds)}%` : "0%";
    unselectedPercent.textContent = totalSeconds ? `${Math.round((unselectedSeconds * 100) / totalSeconds)}%` : "0%";

    updateToggleAllHeader();
}

document.querySelectorAll(".stats-play-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const type = btn.dataset.play;
        let clips = getClipsForPreview(type);
        if (!clips.length) {
            alert("No clips available");
            return;
        }
        playClipSequence(clips);
    });
});

function getClipsForPreview(type) {
    const rows = [...clipTableBody.rows];
    return rows
        .filter((row) => {
            const checked = row.querySelector(".clip-check").checked;
            if (type === "selected") return checked;
            if (type === "unselected") return !checked;
            return true;
        })
        .map((row) => {
            return {
                startTime: timestampToSeconds(row.cells[2].textContent.trim()),
                endTime: timestampToSeconds(row.cells[3].textContent.trim()),
            };
        });
}

async function playClipSequence(clips) {
    const video = document.getElementById("split-player");
    previewWindow.classList.remove("hidden");
    video.src = URL.createObjectURL(currentMediaFile);

    for (const clip of clips) {
        video.currentTime = clip.startTime;
        await video.play();
        await new Promise((resolve) => {
            const timer = setInterval(() => {
                if (video.currentTime >= clip.endTime) {
                    clearInterval(timer);
                    video.pause();
                    resolve();
                }
            }, 100);
        });
    }
}

// Row Selection
clipTableBody.addEventListener("click", (e) => {
    if (e.target.closest("button") || e.target.closest(".clip-check")) {
        return;
    }
    const row = e.target.closest("tr");
    if (!row) return;
    document.querySelectorAll("#clipTableBody tr").forEach((r) => {
        r.classList.remove("selected-row");
    });
    row.classList.add("selected-row");
});

// Update summary toggling checkbox
clipTableBody.addEventListener("change", (e) => {
    if (e.target.classList.contains("clip-check")) {
        updateClipStatistics();
    }
});

// Toggle all clips checked/unchecked
toggleAllHeader.addEventListener("click", () => {
    const checkboxes = clipTableBody.querySelectorAll(".clip-check");
    if (!checkboxes.length) return;

    const allChecked = [...checkboxes].every((cb) => cb.checked);

    checkboxes.forEach((cb) => {
        cb.checked = !allChecked;
    });

    updateClipStatistics();
});

function updateToggleAllHeader() {
    const checkboxes = clipTableBody.querySelectorAll(".clip-check");
    if (!checkboxes.length) {
        toggleAllHeader.textContent = "☐";
        return;
    }
    const checkedCount = [...checkboxes].filter((cb) => cb.checked).length;
    if (checkedCount === 0) {
        toggleAllHeader.textContent = "☐";
    } else if (checkedCount === checkboxes.length) {
        toggleAllHeader.textContent = "☑";
    } else {
        toggleAllHeader.textContent = "◩";
    }
}

// Set Start Header
setStartHeader.addEventListener("click", () => {
    const row = getSelectedRow();
    if (!row) return;
    row.cells[2].textContent = secondsToTimestamp(video.currentTime);
    updateDuration(row);
    updateClipStatistics();
    framePlayer.focus();
});
// Set End Header
setEndHeader.addEventListener("click", () => {
    const row = getSelectedRow();
    if (!row) return;
    row.cells[3].textContent = secondsToTimestamp(video.currentTime);
    updateDuration(row);
    updateClipStatistics();
    framePlayer.focus();
});

// Double Click Jump
clipTableBody.addEventListener("dblclick", (e) => {
    const cell = e.target;
    if (cell.cellIndex !== 2 && cell.cellIndex !== 3) return;
    video.currentTime = timestampToSeconds(cell.textContent.trim());
    framePlayer.focus();
});

// Add Clip Button
addClipBtn.addEventListener("click", () => {
    document.querySelectorAll("#clipTableBody tr").forEach((r) => r.classList.remove("selected-row"));

    const row = document.createElement("tr");
    row.classList.add("selected-row");
    row.innerHTML = `
            <td><input type="checkbox" class="clip-check" checked></td>
            <td>${clipTableBody.children.length + 1}</td>
            <td contenteditable="true">00:00:00:000</td>
            <td contenteditable="true">00:00:00:000</td>
            <td>00:00:00:000</td>
            <td class="clip-actions">
                <button class="preview-btn">▶</button>
                <button class="move-up-btn">⇧</button>
                <button class="move-down-btn">⇩</button>
                <button class="delete-btn">✖</button>
            </td>
        `;
    clipTableBody.appendChild(row);
    framePlayer.focus();
});

// Preview Helper
function previewClip(row) {
    const startTime = timestampToSeconds(row.cells[2].textContent.trim());
    const endTime = timestampToSeconds(row.cells[3].textContent.trim());
    video.currentTime = startTime;
    video.play();
    const stopPreview = () => {
        if (video.currentTime >= endTime) {
            video.pause();
            video.removeEventListener("timeupdate", stopPreview);
        }
    };
    video.addEventListener("timeupdate", stopPreview);
    framePlayer.focus();
}
// Add Row Renumber Function
function renumberRows() {
    [...clipTableBody.rows].forEach((row, index) => {
        row.cells[1].textContent = index + 1;
    });
}
// Add Action Button Handler
clipTableBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const row = btn.closest("tr");
    if (!row) return;
    // PREVIEW
    if (btn.classList.contains("preview-btn")) {
        previewClip(row);
        return;
    }
    // UP
    if (btn.classList.contains("move-up-btn")) {
        const prev = row.previousElementSibling;
        if (prev) {
            clipTableBody.insertBefore(row, prev);
            renumberRows();
        }
        return;
    }
    // DOWN
    if (btn.classList.contains("move-down-btn")) {
        const next = row.nextElementSibling;
        if (next) {
            clipTableBody.insertBefore(next, row);
            renumberRows();
        }
        return;
    }
    // DELETE
    if (btn.classList.contains("delete-btn")) {
        if (!confirm("Delete this clip?")) return;
        const next = row.nextElementSibling || row.previousElementSibling;
        row.remove();
        if (next) next.classList.add("selected-row");
        renumberRows();
        updateClipStatistics();
        return;
    }
});

//* Customize Group
// =====================================
// Clip Groups Storage
// =====================================

// Each group stores clip table row indexes
let clipGroups = [];

// Example structure:
//
// [
//   {
//      name: "Introduction",
//      clips: [0,2,5]
//   },
//   {
//      name: "Body",
//      clips: [1,3]
//   }
// ]
const addGroupBtn = document.getElementById("addGroupBtn");

addGroupBtn.addEventListener("click", () => {
    // collect currently checked clips
    const checkedIndexes = [];

    document.querySelectorAll("#clipTableBody tr").forEach((row, index) => {
        const checkbox = row.querySelector(".clip-check");
        if (checkbox && checkbox.checked) checkedIndexes.push(index);
    });

    // no selection
    if (checkedIndexes.length === 0) {
        alert("Select clips first.");
        return;
    }

    // automatic group name
    const name = `Group ${clipGroups.length ? clipGroups.length + 1 : 1}`;
    console.log(name);

    // create group object
    const group = {
        name: name,
        clips: checkedIndexes,
    };

    clipGroups.push(group);
    console.log("Groups:", clipGroups);
    renderGroupTable();
});

function renderGroupTable() {
    const tbody = document.getElementById("groupTableBody");
    tbody.innerHTML = "";

    clipGroups.forEach((group, index) => {
        const tr = document.createElement("tr");
        const duration = getGroupDuration(group);
        tr.innerHTML = `
                <td class="group-name" contenteditable="true" data-index="${index}">${group.name}</td>
                <td>${group.clips.length}</td>
                <td>${duration}</td>
                <td class="group-actions">
                    <button class="group-preview" data-index="${index}">▶</button>
                    <button class="group-split" data-index="${index}">✂</button>
                    <button class="group-delete" data-index="${index}">❌</button>
                </td>
            `;
        tbody.appendChild(tr);
    });
}

document.getElementById("groupTableBody").oninput = (e) => {
    if (e.target.classList.contains("group-name")) {
        const index = Number(e.target.dataset.index);
        clipGroups[index].name = e.target.textContent.trim();
        console.log("Updated groups:", clipGroups);
    }
};

document.getElementById("groupTableBody").onclick = async (e) => {
    const btn = e.target;
    const index = Number(btn.dataset.index);
    const group = clipGroups[index];

    if (btn.classList.contains("group-preview")) previewGroup(group);

    if (btn.classList.contains("group-delete")) {
        clipGroups.splice(index, 1);
        renderGroupTable();
    }

    if (btn.classList.contains("group-split")) {
        // prevent double click
        btn.disabled = true;
        // save original icon
        const oldText = btn.textContent;
        // show spinner
        btn.innerHTML = `<span class="spinner"></span>`;

        try {
            await splitGroup(group);
        } catch (err) {
            console.error(err);
            alert("Split failed");
        } finally {
            // restore button
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    }
};

function getGroupDuration(group) {
    let total = 0;

    group.clips.forEach((index) => {
        const row = document.querySelectorAll("#clipTableBody tr")[index];
        // deleted row protection
        if (!row) return;
        const durationCell = row.children[4];
        if (durationCell) total += timestampToSeconds(durationCell.textContent.trim());
    });

    return secondsToTimestamp(total);
}

function buildClipsFromGroup(group) {
    const rows = document.querySelectorAll("#clipTableBody tr");

    return group.clips
        .map((index) => {
            const row = rows[index];
            if (!row) return null;

            const start = row.children[2]?.textContent.trim();
            const end = row.children[3]?.textContent.trim();
            if (!start || !end) return null;

            return {
                startTime: timestampToSeconds(start),
                endTime: timestampToSeconds(end),
            };
        })
        .filter(Boolean);
}

async function previewGroup(group) {
    const clips = buildClipsFromGroup(group);
    if (!clips.length) return;

    const video = document.getElementById("split-player");
    previewWindow.classList.remove("hidden");
    video.src = URL.createObjectURL(currentMediaFile);

    let i = 0;

    function playNext() {
        if (i >= clips.length) return;
        const clip = clips[i];

        video.currentTime = clip.startTime;
        video.play();

        const checkEnd = () => {
            if (video.currentTime >= clip.endTime) {
                video.pause();
                video.removeEventListener("timeupdate", checkEnd);
                i++;
                playNext();
            }
        };
        video.addEventListener("timeupdate", checkEnd);
    }
    playNext();
}

let groupDownloadName = null;
async function splitGroup(group) {
    const clips = buildClipsFromGroup(group);
    groupDownloadName = group.name;

    if (!clips.length) {
        alert("No valid clips in group");
        return;
    }

    const format = document.getElementById("selectOutputFormat").value;

    const formData = new FormData();

    if (currentMediaFile) formData.append("file", currentMediaFile);
    if (currentMediaUrl) formData.append("mediaUrl", currentMediaUrl);

    formData.append("clips", JSON.stringify(clips));
    formData.append("format", format);
    formData.append("baseName", group.name);
    formData.append("mode", document.getElementById("splitMode").value);

    try {
        const response = await fetch("http://localhost:3000/split", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // preview merged result if not zip
        if (blob.type !== "application/zip") {
            const player = document.getElementById("split-player");
            previewWindow.classList.remove("hidden");

            player.src = url;
            player.load();
            player.play();
        }
        // enable download
        currentSplitUrl = url;
        currentSplitFormat = blob.type === "application/zip" ? "zip" : format;

        document.getElementById("downloadBtn").disabled = false;
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

//* Export & Import clip timestamps
const exportClipsBtn = document.getElementById("exportClipsBtn");
exportClipsBtn.addEventListener("click", async () => {
    const rows = [...clipTableBody.rows];
    const lines = ["SL, Start Time, End Time"];

    rows.forEach((row, index) => {
        lines.push(`${index + 1}, ${row.cells[2].textContent.trim()}, ${row.cells[3].textContent.trim()}`);
    });

    const csv = lines.join("\n");
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: `${currentFileBaseName || "clips"}__clips.csv`,
            types: [
                {
                    description: "CSV File",
                    accept: { "text/csv": [".csv"] },
                },
            ],
        });

        const writable = await handle.createWritable();
        await writable.write(csv);
        await writable.close();
        alert("✅ Clip timestamps exported successfully!");
    } catch (err) {
        if (err.name !== "AbortError") console.error(err);
        // User canceled, do nothing
    }
});

const importClipsBtn = document.getElementById("importClipsBtn");
const clipCsvInput = document.getElementById("clipCsvInput");

importClipsBtn.addEventListener("click", () => {
    clipCsvInput.click();
});

clipCsvInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    importClipCSV(text);

    clipCsvInput.value = "";
});

function importClipCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(Boolean);

    if (lines.length < 2) {
        alert("Invalid CSV.");
        return;
    }

    clipTableBody.innerHTML = "";

    lines.slice(1).forEach((line) => {
        const [sl, startTime, endTime] = line.split(",").map((s) => s.trim());

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><input type="checkbox" class="clip-check" checked /></td>
            <td></td>
            <td contenteditable="true">${startTime}</td>
            <td contenteditable="true">${endTime}</td>
            <td></td>
            <td class="clip-actions">
                <button class="preview-btn" title="Preview Clip">▶</button>
                <button class="move-up-btn" title="Move Earlier">⇧</button>
                <button class="move-down-btn" title="Move Later">⇩</button>
                <button class="delete-btn" title="Delete Clip">✖</button>
            </td>
        `;
        clipTableBody.appendChild(row);
        updateDuration(row);
        updateClipStatistics();
    });

    renumberRows();

    const firstRow = clipTableBody.querySelector("tr");
    if (firstRow) firstRow.classList.add("selected-row");
}

//* Communicating with Server to split and combine
//* Read clips from table
function getSelectedClips() {
    return [...clipTableBody.rows]
        .filter((row) => {
            return row.querySelector(".clip-check").checked;
        })
        .map((row) => ({
            startTime: timestampToSeconds(row.cells[2].textContent.trim()),
            endTime: timestampToSeconds(row.cells[3].textContent.trim()),
        }));
}
function validateSelectedClips(clips) {
    if (!clips.length) {
        alert("Please select at least one clip.");
        return false;
    }
    for (const clip of clips) {
        if (clip.startTime >= clip.endTime) {
            alert("Invalid clip duration.");
            return false;
        }
    }
    return true;
}

splitBtn.addEventListener("click", async () => {
    framePlayer.focus();

    const clips = getSelectedClips();
    if (!validateSelectedClips(clips)) return;

    const format = outputFormat.value;
    const mode = splitMode.value;

    console.log({
        mode,
        format,
        clips,
    });

    // TODO:
    if (!currentMediaFile && !currentMediaUrl) {
        alert("No media loaded!");
        return;
    }

    splitBtn.disabled = true;
    splitBtn.textContent = "Processing...";

    // Create FormData:
    const formData = new FormData();
    if (currentMediaFile) formData.append("file", currentMediaFile);
    if (currentMediaUrl) formData.append("mediaUrl", currentMediaUrl);
    formData.append("clips", JSON.stringify(clips));
    formData.append("format", format);
    formData.append("mode", mode);
    formData.append("baseName", currentFileBaseName);

    // Send to backend:
    try {
        const response = await fetch("http://localhost:3000/split", {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            throw new Error(await response.text());
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const isZip = blob.type === "application/zip";
        console.log(isZip);

        // store globally for download
        currentSplitUrl = url;
        currentSplitFormat = isZip ? "zip" : format;

        // enable download button
        const downloadBtn = document.getElementById("downloadBtn");
        downloadBtn.disabled = false;

        if (!isZip) {
            const splitPlayer = document.getElementById("split-player");
            previewWindow.classList.remove("hidden");

            splitPlayer.src = url;
            splitPlayer.load();
            splitPlayer.play();
        }
    } catch (err) {
        console.error(err);
        alert(`Split failed:\n${err.message}`);
    } finally {
        splitBtn.disabled = false;
        splitBtn.textContent = "Split";
    }
});

const downloadBtn = document.getElementById("downloadBtn");
downloadBtn.onclick = () => {
    if (!currentSplitUrl) {
        alert("No file to download.");
        return;
    }

    const a = document.createElement("a");
    a.href = currentSplitUrl;
    a.download = `${groupDownloadName || currentFileBaseName || "clip"}.${currentSplitFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    framePlayer.focus();
    groupDownloadName = null;
};

document.getElementById("clrBtn").onclick = () => {
    const splitPlayer = document.getElementById("split-player");
    splitPlayer.pause();
    splitPlayer.removeAttribute("src");
    splitPlayer.load();

    if (currentSplitUrl) {
        URL.revokeObjectURL(currentSplitUrl);
        currentSplitUrl = null;
    }
    document.getElementById("downloadBtn").disabled = true;

    framePlayer.focus();
};
