const { spawn } = require("child_process");

const ffmpeg = spawn("ffmpeg", ["-version"]);

ffmpeg.stdout.on("data", (data) => {
    console.log(data.toString());
});

ffmpeg.stderr.on("data", (data) => {
    console.log(data.toString());
});

ffmpeg.on("close", (code) => {
    console.log("Exit code:", code);
});
