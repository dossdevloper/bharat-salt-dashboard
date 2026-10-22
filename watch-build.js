import chokidar from "chokidar";
import { spawn } from "child_process";
import path from "path";

const DEBOUNCE_MS = 300;

let building = false;
let debounceTimer = null;
let buildCount = 0;

// Only watch actual source — never the output folder (Report/app)
const watcher = chokidar.watch(
    ["src", "index.html", "vite.config.js"],
    {
        ignored: ["**/node_modules/**", "**/.git/**"],
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 200,
            pollInterval: 50,
        },
    }
);

function runBuild(changedPath) {
    if (building) {
        console.log(`⏭️  Skipped — build already running (triggered by ${changedPath})`);
        return;
    }

    building = true;
    buildCount++;
    console.log(`\n🔨 [Build #${buildCount}] Change in ${changedPath}. Running npm run build...\n`);

    const child = spawn("npm", ["run", "build"], {
        stdio: "inherit",
        shell: process.platform === "win32",
    });

    child.on("close", (code) => {
        building = false;
        console.log(
            code === 0
                ? `\n✅ [Build #${buildCount}] Completed successfully.\n`
                : `\n❌ [Build #${buildCount}] Failed with code ${code}.\n`
        );
    });
}

watcher.on("all", (event, changedPath) => {
    if (!["add", "change", "unlink"].includes(event)) return;

    console.log(`📁 ${event}: ${changedPath}`);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runBuild(changedPath), DEBOUNCE_MS);
});