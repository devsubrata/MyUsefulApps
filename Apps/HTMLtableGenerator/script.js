"use strict";

const SAMPLE = [
    "Data type | Safe options | Clause form | Avoid",
    "Counts (number of households) | the number of, the figure for, the total of, the quantity of | how many | proportion, share",
    "Percentages | the percentage of, the proportion of, the share of, the ratio of | what proportion / what percentage of | how many",
    "Amounts (energy, money) | the amount of, the volume of, the quantity of | how much | how many",
    "Spread across categories | the distribution of, a breakdown of, the make-up of, the composition of | how X was divided / split |",
    "Level or degree | the extent of, the level of | how prevalent / common",
    "Change | the trend in, changes in, fluctuations in, developments in | how X changed |",
].join("\n");

const STORE_KEY = "pipe-table-builder:src";
const MIN_COL = 40; // px, narrowest a column can be dragged
const MIN_ROW = 24; // px, shortest a row can be dragged
const FIT_MAX = 520; // px, cap for auto-fit so one long cell can't make a huge column
const DEFAULT_MAX = 340; // px, cap for the first automatic fit
const GUTTER = 44; // px, width of the row-number column

const $ = (id) => document.getElementById(id);
const qsa = (selctor) => document.querySelectorAll(selctor);
const qs = (selctor) => document.querySelector(selctor);

const el = {
    src: $("src"),
    mount: $("mount"),
    stats: $("stats"),
    status: $("status"),
    header: $("o-header"),
    wrap: $("o-wrap"),
    rulers: $("o-rulers"),
    zebra: $("o-zebra"),
    first: $("o-first"),
    dash: $("o-dash"),
    density: $("o-density"),
    copy: $("btn-copy"),
    copyHtml: $("btn-html"),
    htmlOut: $("htmlout"),
};

// Sizes live outside the DOM so they survive re-renders while you keep typing.
const state = {
    rows: [],
    cols: 0,
    widths: [], // px per column, undefined until measured
    heights: [], // px per row, undefined = automatic
};

const borderState = {};

// ---------- Parsing ----------

function parse(text) {
    let lines = text
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .filter((l) => l.trim() !== "");
    const hasPipe = lines.some((l) => l.includes("|"));
    const hasTab = !hasPipe && lines.some((l) => l.includes("\t"));
    const delim = hasPipe ? "|" : hasTab ? "\t" : null;

    let rows = lines.map((l) => (delim ? l.split(delim).map((c) => c.trim()) : [l.trim()]));

    // Drop markdown divider rows such as |---|---|
    rows = rows.filter((r) => !(r.length > 1 && r.some(Boolean) && r.every((c) => c === "" || /^:?-{2,}:?$/.test(c))));

    const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
    let padded = 0;
    rows = rows.map((r) => {
        if (r.length < cols) {
            padded++;
            return r.concat(Array(cols - r.length).fill(""));
        }
        return r;
    });
    return { rows, cols, padded };
}

// ---------- Options ----------

const opts = () => ({
    header: el.header.checked,
    wrap: el.wrap.checked,
    rulers: el.rulers.checked,
    zebra: el.zebra.checked,
    first: el.first.checked,
    dash: el.dash.checked,
    density: el.density.value,
});

const PAD = { compact: ["px-2", "py-1", "text-[13px]", 16], cozy: ["px-3", "py-2", "text-sm", 24], roomy: ["px-4", "py-3.5", "text-[15px]", 32] };

function colLetter(i) {
    let s = "";
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
    return s;
}

// ---------- Measuring ----------

// Width a column needs so that none of its cells wrap, measured with a throwaway span.
const probe = document.createElement("span");
probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0";
document.body.appendChild(probe);

function fitWidth(col, o) {
    const [, , , padX] = PAD[o.density];
    const table = el.mount.querySelector("table");
    const cs = getComputedStyle(table);
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontSize = cs.fontSize;
    let max = 0;
    state.rows.forEach((r, ri) => {
        const isHead = o.header && ri === 0;
        const bold = isHead || (o.first && col === 0);
        probe.style.fontWeight = bold ? "600" : "400";
        probe.textContent = r[col] || (o.dash ? "—" : "");
        max = Math.max(max, probe.offsetWidth);
    });
    return Math.min(FIT_MAX, Math.max(MIN_COL, Math.ceil(max + padX + 2)));
}

// ---------- Rendering ----------

function render() {
    const o = opts();
    const p = parse(el.src.value);
    state.rows = p.rows;
    state.cols = p.cols;
    state.widths.length = p.cols;
    state.heights.length = p.rows.length;
    el.mount.replaceChildren();
    el.htmlOut.hidden = true;

    if (!p.rows.length) {
        el.mount.innerHTML = '<div class="p-10 text-center text-sm text-slate-500">Paste rows into the box, with | between cells.</div>';
        el.stats.textContent = "";
        el.copy.disabled = el.copyHtml.disabled = true;
        return;
    }

    const [px, py, fs] = PAD[o.density];
    const table = document.createElement("table");
    table.className = `border-separate border-spacing-0 table-fixed ${fs}`;

    // <colgroup> carries the widths, so a drag only touches one <col>.
    const cg = document.createElement("colgroup");
    if (o.rulers) cg.append(Object.assign(document.createElement("col"), { style: `width:${GUTTER}px` }));
    for (let c = 0; c < p.cols; c++) cg.append(document.createElement("col"));
    table.append(cg);
    table.dataset.rulers = o.rulers ? "1" : "";

    const cellBorder = "border-b border-r border-slate-200 dark:border-slate-800";
    const grip = (kind) => {
        const g = document.createElement("div");
        g.className =
            kind === "col"
                ? "grip-col absolute top-0 -right-1 z-20 h-full w-2 cursor-col-resize hover:bg-teal-500/50"
                : "grip-row absolute -bottom-1 left-0 z-20 h-2 w-full cursor-row-resize hover:bg-teal-500/50";
        g.dataset.kind = kind;
        return g;
    };

    // Column letter strip
    if (o.rulers) {
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        const corner = document.createElement("th");
        corner.className = `sticky top-0 left-0 z-30 bg-slate-100 dark:bg-slate-800 ${cellBorder}`;
        tr.append(corner);
        for (let c = 0; c < p.cols; c++) {
            const th = document.createElement("th");
            th.className = `sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 py-1 select-none ${cellBorder}`;
            th.textContent = colLetter(c);
            const g = grip("col");
            g.dataset.index = c;
            th.append(g);
            tr.append(th);
        }
        thead.append(tr);
        table.append(thead);
    }

    const tbody = document.createElement("tbody");
    p.rows.forEach((row, ri) => {
        const isHead = o.header && ri === 0;
        const tr = document.createElement("tr");
        if (isHead) {
            tr.className = "bg-teal-700 text-white";
        } else {
            tr.className =
                "bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-800" +
                (o.zebra && (ri - (o.header ? 1 : 0)) % 2 === 1 ? " bg-slate-50 dark:bg-slate-900/60" : "");
        }

        if (o.rulers) {
            const num = document.createElement("th");
            num.className = `relative sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 select-none ${cellBorder}`;
            num.textContent = ri + 1;
            const g = grip("row");
            g.dataset.index = ri;
            num.append(g);
            tr.append(num);
        }

        row.forEach((text, ci) => {
            const td = document.createElement(isHead ? "th" : "td");
            td.className =
                `relative p-0 align-top text-left ${cellBorder}` + (isHead ? " font-semibold" : o.first && ci === 0 ? " font-semibold" : "");
            const box = document.createElement("div");
            box.className = `${px} ${py} overflow-hidden ` + (o.wrap ? "whitespace-normal break-words" : "whitespace-nowrap text-ellipsis");
            if (text === "") {
                box.textContent = o.dash ? "—" : " ";
                if (o.dash) box.classList.add("opacity-40");
            } else {
                box.innerHTML = highlightCellText(text);
            }
            td.title = text;
            td.append(box);
            // Header cells also get a grip when the letter strip is hidden.
            if (!o.rulers && ri === 0) {
                td.classList.add("relative");
                const g = grip("col");
                g.dataset.index = ci;
                td.append(g);
            }
            tr.append(td);
        });
        tbody.append(tr);
    });
    table.append(tbody);
    el.mount.append(table);

    // First automatic fit for any column that has no width yet.
    for (let c = 0; c < p.cols; c++) {
        if (state.widths[c] == null) state.widths[c] = Math.min(DEFAULT_MAX, fitWidth(c, o));
    }
    applySizes();

    const bodyRows = p.rows.length - (o.header ? 1 : 0);
    const bits = [`${p.cols} ${p.cols === 1 ? "column" : "columns"}`, `${bodyRows} ${bodyRows === 1 ? "row" : "rows"}`];
    if (p.padded) bits.push(`${p.padded} short ${p.padded === 1 ? "row" : "rows"} padded`);
    el.stats.textContent = bits.join(" · ");
    el.copy.disabled = el.copyHtml.disabled = false;

    borderState.table = {
        borderCollapse: qs("table").style.borderCollapse,
        border: qs("table").style.border,
    };
    borderState.th = Array.from(qsa("th")).map((th) => ({ element: th, border: th.style.border }));
    borderState.td = Array.from(qsa("td")).map((td) => ({ element: td, border: td.style.border }));
}

function applyGridBorders(thickness, color) {
    const table = qs("table");
    if (!table) return;
    // 2. Apply the clean, un-thickened grid lines
    const newBorder = `${thickness} solid ${color}`;
    table.style.borderCollapse = "collapse";
    table.style.border = newBorder;

    qsa("th").forEach((th) => (th.style.border = newBorder));
    qsa("td").forEach((td) => (td.style.border = newBorder));
}

function resetGridBorders() {
    const table = qs("table");
    if (!table) return;
    table.style.borderCollapse = borderState.table.borderCollapse;
    table.style.border = borderState.table.border;
    qsa("th").forEach((th, i) => (th.style.border = borderState.th[i].border));
    qsa("td").forEach((td, i) => (td.style.border = borderState.td[i].border));
}

let gridEnabled = false;
document.getElementById("o-grid").onclick = () => {
    if (!gridEnabled) {
        applyGridBorders("1px", qs("#grid-color").value);
        gridEnabled = true;
    } else {
        resetGridBorders();
        gridEnabled = false;
    }
};

qs("#grid-color").addEventListener("input", (e) => {
    applyGridBorders("1px", qs("#grid-color").value);
    styleTableHeader();
    gridEnabled = true;
});

function styleTableHeader() {
    document.querySelectorAll("table tr:first-child :is(td, th)").forEach((cell) => {
        cell.style.fontWeight = "bold";
        cell.style.textAlign = "center";
        cell.style.backgroundColor = qs("#grid-color").value + "33"; // Set background color to the selected grid color
    });
}

document.getElementById("o-first-row").addEventListener("change", (e) => {
    if (e.target.checked) {
        styleTableHeader();
    } else {
        document.querySelectorAll("table tr:first-child :is(td, th)").forEach((cell) => {
            cell.style.fontWeight = "normal";
            cell.style.textAlign = "left";
            cell.style.backgroundColor = "white"; // Reset background color to white
        });
    }
});

qs("#o-first-row-grid").onclick = () => {
    // Flip the status
    const checkbox = qs("#o-first-row");
    checkbox.checked = !checkbox.checked;
    // Force the change event to fire manually
    checkbox.dispatchEvent(new Event("change"));
};

// Push widths and heights from state into the DOM.
function applySizes() {
    const table = el.mount.querySelector("table");
    if (!table) return;
    const rulers = !!table.dataset.rulers;
    const cols = table.querySelectorAll("col");
    const offset = rulers ? 1 : 0;
    let total = rulers ? GUTTER : 0;
    for (let c = 0; c < state.cols; c++) {
        cols[c + offset].style.width = state.widths[c] + "px";
        total += state.widths[c];
    }
    table.style.width = total + "px";

    const trs = table.tBodies[0].rows;
    for (let r = 0; r < trs.length; r++) {
        const h = state.heights[r];
        trs[r].querySelectorAll("td > div, th > div:not(.grip-col):not(.grip-row)").forEach((box) => {
            box.style.height = h ? h + "px" : "";
        });
    }
}

// ---------- Resizing ----------

// One pointerdown listener handles every grip (event delegation).
el.mount.addEventListener("pointerdown", (e) => {
    const g = e.target.closest(".grip-col, .grip-row");
    if (!g || e.button !== 0) return;
    e.preventDefault();
    g.setPointerCapture(e.pointerId);

    const idx = Number(g.dataset.index);
    if (g.dataset.kind === "col") {
        const startX = e.clientX,
            startW = state.widths[idx];
        document.body.classList.add("is-resizing-col");
        const move = (ev) => {
            state.widths[idx] = Math.max(MIN_COL, Math.round(startW + ev.clientX - startX));
            applySizes();
        };
        const up = () => {
            document.body.classList.remove("is-resizing-col");
            g.removeEventListener("pointermove", move);
            g.removeEventListener("pointerup", up);
            g.removeEventListener("pointercancel", up);
        };
        g.addEventListener("pointermove", move);
        g.addEventListener("pointerup", up);
        g.addEventListener("pointercancel", up);
    } else {
        const tr = el.mount.querySelector("table").tBodies[0].rows[idx];
        const startY = e.clientY,
            startH = tr.offsetHeight;
        document.body.classList.add("is-resizing-row");
        const move = (ev) => {
            state.heights[idx] = Math.max(MIN_ROW, Math.round(startH + ev.clientY - startY));
            applySizes();
        };
        const up = () => {
            document.body.classList.remove("is-resizing-row");
            g.removeEventListener("pointermove", move);
            g.removeEventListener("pointerup", up);
            g.removeEventListener("pointercancel", up);
        };
        g.addEventListener("pointermove", move);
        g.addEventListener("pointerup", up);
        g.addEventListener("pointercancel", up);
    }
});

// Double-click a border: columns fit their content (no wrapping), rows go back to automatic height.
el.mount.addEventListener("dblclick", (e) => {
    const g = e.target.closest(".grip-col, .grip-row");
    if (!g) return;
    const idx = Number(g.dataset.index);
    if (g.dataset.kind === "col") state.widths[idx] = fitWidth(idx, opts());
    else state.heights[idx] = undefined;
    applySizes();
});

$("btn-fit").addEventListener("click", () => {
    const o = opts();
    for (let c = 0; c < state.cols; c++) state.widths[c] = fitWidth(c, o);
    applySizes();
});
$("btn-reset").addEventListener("click", () => {
    state.widths = [];
    state.heights = [];
    render();
});

// ---------- Copy ----------

const say = (msg) => {
    el.status.textContent = msg;
    clearTimeout(say.t);
    say.t = setTimeout(() => (el.status.textContent = ""), 5000);
};

// Plain HTML table with inline styles so it pastes cleanly into Word, Gmail or Sheets.
function buildHtml() {
    const o = opts();
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const bd = "border:1px solid #d9e1df;";
    const wrapCss = o.wrap ? "" : "white-space:nowrap;";
    let h = '<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;table-layout:fixed;">';
    h += "<colgroup>" + state.widths.map((w) => `<col style="width:${w}px">`).join("") + "</colgroup>";
    state.rows.forEach((r, ri) => {
        const head = o.header && ri === 0;
        const tag = head ? "th" : "td";
        const bg = head ? "background:#0f766e;color:#fff;" : o.zebra && (ri - (o.header ? 1 : 0)) % 2 === 1 ? "background:#f6f8f8;" : "";
        const hStyle = state.heights[ri] ? `height:${state.heights[ri]}px;` : "";
        h +=
            "<tr>" +
            r
                .map((c, ci) => {
                    const bold = head || (o.first && ci === 0) ? "font-weight:bold;" : "";
                    return `<${tag} style="${bd}${bg}${bold}${wrapCss}${hStyle}padding:8px 12px;text-align:left;vertical-align:top;">${esc(c)}</${tag}>`;
                })
                .join("") +
            "</tr>";
    });
    return h + "</table>";
}
const buildTsv = () => state.rows.map((r) => r.join("\t")).join("\n");

el.copy.addEventListener("click", async () => {
    try {
        await navigator.clipboard.write([
            new ClipboardItem({
                "text/html": new Blob([buildHtml()], { type: "text/html" }),
                "text/plain": new Blob([buildTsv()], { type: "text/plain" }),
            }),
        ]);
        say("Table copied. Paste it into a document, email or sheet.");
    } catch {
        el.htmlOut.value = buildTsv();
        el.htmlOut.hidden = false;
        el.htmlOut.select();
        say("Clipboard is blocked. The text is selected below: press Ctrl+C.");
    }
});

el.copyHtml.addEventListener("click", async () => {
    const html = buildHtml();
    try {
        await navigator.clipboard.writeText(html);
        el.htmlOut.hidden = true;
        say("HTML copied.");
    } catch {
        el.htmlOut.value = html;
        el.htmlOut.hidden = false;
        el.htmlOut.select();
        say("Clipboard is blocked. The HTML is selected below: press Ctrl+C.");
    }
});

// ---------- Wiring ----------
const save = () => {
    try {
        localStorage.setItem(STORE_KEY, el.src.value);
    } catch {}
};

function checkAndApplyStyle() {
    if (gridEnabled) applyGridBorders("1px", qs("#grid-color").value);
    if (qs("#o-first-row").checked) styleTableHeader();
    qs("table").style.fontSize = localStorage.getItem("TABLE_FONT_SIZE") || "14px";
}

el.src.addEventListener("input", () => {
    save();
    render();
    checkAndApplyStyle();
});

[el.header, el.wrap, el.rulers, el.zebra, el.first, el.dash, el.density].forEach((c) =>
    c.addEventListener("change", () => {
        // Header, bold and spacing change text metrics, so widths measured earlier are stale.
        // if (c === el.header || c === el.first || c === el.density || c === el.dash) state.widths = [];
        render();
        checkAndApplyStyle();
    }),
);

$("btn-example").addEventListener("click", () => {
    el.src.value = SAMPLE;
    save();
    state.widths = [];
    state.heights = [];
    render();
});
$("btn-clear").addEventListener("click", () => {
    el.src.value = "";
    save();
    state.widths = [];
    state.heights = [];
    render();
    el.src.focus();
});

let stored = "";
try {
    stored = localStorage.getItem(STORE_KEY) || "";
} catch {}
el.src.value = stored.trim() ? stored : SAMPLE;
render();

qs("#increaseFontSize").addEventListener("click", () => {
    const table = qs("table");
    if (!table) return;
    const currentSize = parseFloat(getComputedStyle(table).fontSize);
    const newSize = currentSize + 1;
    table.style.fontSize = newSize + "px";
    localStorage.setItem("TABLE_FONT_SIZE", newSize + "px");
});

qs("#decreaseFontSize").addEventListener("click", () => {
    const table = qs("table");
    if (!table) return;
    const currentSize = parseFloat(getComputedStyle(table).fontSize);
    const newSize = currentSize - 1;
    table.style.fontSize = newSize + "px";
    localStorage.setItem("TABLE_FONT_SIZE", newSize + "px");
});

qs("#main-elm-move-toggle-btn").addEventListener("click", () => {
    const main = qs("main");
    main.style.marginLeft = main.style.marginLeft === "10px" ? "auto" : "10px";
});

qs("#increase-table-height-btn").addEventListener("click", () => {
    const tableArea = qs("#mount");
    tableArea.style.height = parseFloat(getComputedStyle(tableArea).height) + 10 + "px";
});

document.getElementById("o-grid").click();
if (document.getElementById("o-first-row").checked) styleTableHeader();

function highlightCellText(text, colorIndex = 14) {
    const colors = [
        "text-[#FF0000]", // 0
        "text-[#990033]", // 1
        "text-[#ff0066]", // 2
        "text-[#e63804]", // 3
        "text-[#B37400]", // 4
        "text-[#5fb503]", // 5
        "text-[#009c1a]", // 6
        "text-[#0000FF]", // 7
        "text-[#0404bb]", // 8
        "text-[#d303d3]", // 9
        "text-[#FF69B4]", // 10
        "text-[#E97451]", // 11
        "text-[#9400D3]", // 12
        "text-[#4B0082]", // 13
        "text-[#6600ff]", // 14
        "text-[#e48f05]", // 15
        "text-[#04cab6]", // 16
        "text-[#f53928]", // 17
        "text-[#151201]", // 18
        "text-[#512d01]", // 19
        "text-[#e8474a]", // 20
    ];

    const highlightedText = text.replace(/(\d+)?\*(.*?)\*/g, (match, index, content) => {
        const i = index ? Number(index) : colorIndex;
        const colorClass = colors[i];
        return `<span class="font-semibold ${colorClass}">${content.trim()}</span>`;
    });

    return highlightedText;
}
