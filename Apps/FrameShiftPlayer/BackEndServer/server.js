const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const yazl = require("yazl");

const app = express();

app.use(cors());

const upload = multer({
    dest: "uploads/",
});

app.post("/split", upload.single("file"), async (req, res) => {
    const filesToCleanup = [];

    async function cleanup() {
        for (const file of filesToCleanup) {
            try {
                if (fs.existsSync(file)) {
                    await fs.promises.unlink(file);
                    console.log("Deleted:", file);
                }
            } catch (err) {
                console.error("Cleanup failed:", file, err);
            }
        }
    }

    try {
        console.log(req.body);

        let inputSource;

        if (req.file) {
            console.log("Received uploaded file:");
            console.log(req.file.originalname);

            inputSource = req.file.path;
            filesToCleanup.push(req.file.path);
            //
        } else if (req.body.mediaUrl) {
            console.log("Received media URL:");
            console.log(req.body.mediaUrl);

            inputSource = req.body.mediaUrl;
        } else {
            return res.status(400).send("No media source provided.");
        }

        const { clips, format, baseName, mode } = req.body;
        const clipList = JSON.parse(clips);

        const safeName = baseName.replace(/[<>:"/\\|?*]/g, "_");

        const outputDir = path.join(__dirname, "output");
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

        const tempDir = path.join(__dirname, "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        // Extract all clips
        function runFFmpeg(args) {
            return new Promise((resolve, reject) => {
                const ffmpeg = spawn("ffmpeg", args);

                ffmpeg.stderr.on("data", (data) => {
                    console.log(data.toString());
                });

                ffmpeg.on("close", (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`FFmpeg failed (${code})`));
                    }
                });
            });
        }

        const tempFiles = [];
        for (let i = 0; i < clipList.length; i++) {
            const clip = clipList[i];

            const tempClip = path.join(tempDir, `clip_${i + 1}.${format}`);
            tempFiles.push(tempClip);
            filesToCleanup.push(tempClip);

            let args;

            if (format === "mp3") {
                args = [
                    "-y",

                    "-i",
                    inputSource,

                    "-ss",
                    clip.startTime,

                    "-to",
                    clip.endTime,

                    "-vn",

                    "-acodec",
                    "libmp3lame",

                    "-b:a",
                    "192k",

                    tempClip,
                ];
            } else {
                args = [
                    "-y",

                    "-i",
                    inputSource,

                    "-ss",
                    clip.startTime,

                    "-to",
                    clip.endTime,

                    "-c:v",
                    "libx264",

                    "-c:a",
                    "aac",

                    "-preset",
                    "ultrafast",

                    tempClip,
                ];
            }
            console.log(`Creating clip ${i + 1}`);
            await runFFmpeg(args);
        }

        const concatFile = path.join(tempDir, "concat.txt");
        filesToCleanup.push(concatFile);
        fs.writeFileSync(concatFile, tempFiles.map((f) => `file '${path.resolve(f)}'`).join("\n"));

        const outputFile = path.join(outputDir, `${safeName}_merged.${format}`);
        const zipFile = path.join(outputDir, `${safeName}_clips.zip`);

        filesToCleanup.push(outputFile);
        filesToCleanup.push(zipFile);

        const archiver = require("archiver");

        function createZip(files, zipPath) {
            return new Promise((resolve, reject) => {
                const zipfile = new yazl.ZipFile();

                for (const file of files) {
                    zipfile.addFile(file, path.basename(file));
                }

                const output = fs.createWriteStream(zipPath);

                output.on("close", resolve);
                output.on("error", reject);

                zipfile.outputStream.pipe(output);
                zipfile.end();
            });
        }

        async function runJoinMode() {
            fs.writeFileSync(concatFile, tempFiles.map((f) => `file '${path.resolve(f)}'`).join("\n"));

            if (format === "mp3") {
                await runFFmpeg(["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-acodec", "libmp3lame", "-b:a", "192k", outputFile]);
            } else {
                await runFFmpeg(["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c:v", "copy", "-c:a", "copy", outputFile]);
            }
        }

        async function runSeparateMode() {
            await createZip(tempFiles, zipFile);
        }

        async function runBothMode() {
            await runJoinMode();
            await runSeparateMode();
        }

        if (mode === "separate") {
            await runSeparateMode();
            return sendFile(res, zipFile, `${safeName}_clips.zip`, "application/zip");
        }

        if (mode === "join") {
            await runJoinMode();
            return sendFile(res, outputFile, `${safeName}_merged.${format}`, format === "mp3" ? "audio/mpeg" : "video/mp4");
        }

        if (mode === "both") {
            await runBothMode();
            return sendFile(res, zipFile, `${safeName}_clips_and_merged.zip`, "application/zip");
        }

        function sendFile(res, filePath, downloadName, mimeType) {
            const safeName = sanitizeFilename(downloadName);

            res.setHeader("Content-Type", mimeType);
            res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);

            const stream = fs.createReadStream(filePath);

            stream.pipe(res);

            let cleaned = false;

            async function cleanupOnce() {
                if (cleaned) return;
                cleaned = true;

                await cleanup();
            }

            res.on("finish", cleanupOnce);
            res.on("close", cleanupOnce);

            stream.on("error", async (err) => {
                console.error(err);

                await cleanupOnce();

                if (!res.headersSent) {
                    res.status(500).end();
                }
            });
        }

        function sanitizeFilename(name) {
            return name
                .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_") // remove invalid + control chars
                .replace(/[^\x00-\x7F]/g, "_") // remove non-ASCII (important fix)
                .trim();
        }
    } catch (err) {
        console.error(err);
        await cleanup();
        if (!res.headersSent) {
            res.status(500).send(err.message);
        }
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
