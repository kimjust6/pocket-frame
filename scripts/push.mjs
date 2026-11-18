import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function toWslPath(winPath) {
    const normalized = winPath.replace(/\\/g, "/");
    const match = normalized.match(/^([A-Za-z]):\/(.*)$/);
    if (!match) {
        return null;
    }
    const drive = match[1].toLowerCase();
    const rest = match[2];
    return `/mnt/${drive}/${rest}`;
}

function hasWsl() {
    try {
        const result = spawnSync("wsl", ["true"], { stdio: "ignore" });
        return result.status === 0;
    } catch {
        return false;
    }
}

function shellQuoteSingle(value) {
    return `'${value.replace(/'/g, `"'"'`)}'`;
}

const workspaceRoot = process.cwd();
const isWindows = process.platform === "win32";
const wslCwd = isWindows ? toWslPath(workspaceRoot) : null;
const useWsl =
    isWindows &&
    process.env.USE_WSL !== "false" &&
    process.env.NO_WSL !== "1" &&
    wslCwd !== null &&
    hasWsl();

const userArgs = process.argv.slice(2);
const deployArgs =
    userArgs.length === 0
        ? ["frame"]
        : userArgs.some((arg) => !arg.startsWith("-"))
          ? userArgs
          : ["frame", ...userArgs];

// 1. Export schema snapshot before pushing
function generateSchemaSnapshot() {
    try {
        console.log("Generating schema migration snapshot...");
        const migrationsDir = path.join(workspaceRoot, "pb_migrations");
        const existingSnapshots = fs.existsSync(migrationsDir)
            ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith("_collections_snapshot.js")).sort()
            : [];
        const latestBefore = existingSnapshots.length ? existingSnapshots[existingSnapshots.length - 1] : null;
        const latestBeforeContent = latestBefore ? fs.readFileSync(path.join(migrationsDir, latestBefore), "utf8") : null;

        if (useWsl) {
            const cmd = `cd ${shellQuoteSingle(wslCwd)} && echo "y" | pocketbase --dir=pb_data migrate collections`;
            spawnSync("wsl", ["bash", "-lc", cmd], { stdio: "pipe" });
        } else {
            spawnSync("pocketbase", ["--dir=pb_data", "migrate", "collections"], {
                input: "y\n",
                stdio: ["pipe", "pipe", "pipe"],
                shell: isWindows,
            });
        }

        const updatedSnapshots = fs.existsSync(migrationsDir)
            ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith("_collections_snapshot.js")).sort()
            : [];
        const newSnapshot = updatedSnapshots.length ? updatedSnapshots[updatedSnapshots.length - 1] : null;

        if (newSnapshot && newSnapshot !== latestBefore) {
            const newContent = fs.readFileSync(path.join(migrationsDir, newSnapshot), "utf8");
            if (latestBeforeContent && newContent === latestBeforeContent) {
                // If identical to the previous snapshot, clean up the duplicate to keep migrations tidy
                fs.unlinkSync(path.join(migrationsDir, newSnapshot));
                console.log(`Schema is up to date (matches ${latestBefore}).`);
            } else {
                console.log(`Created new schema snapshot: ${newSnapshot}`);
            }
        } else {
            console.log("Schema migration snapshot complete.");
        }
    } catch (err) {
        console.warn("Warning: Could not generate schema snapshot:", err.message);
    }
}

// 2. Build frontend assets so pb_public/ is fresh
function buildFrontend() {
    try {
        console.log("Building frontend assets...");
        const res = spawnSync("npm", ["run", "build"], {
            cwd: workspaceRoot,
            stdio: "inherit",
            shell: true,
        });
        if (res.status !== 0) {
            console.warn("Warning: Frontend build exited with a non-zero status.");
        }
    } catch (err) {
        console.warn("Warning: Failed to run frontend build:", err.message);
    }
}

// Execute pre-deploy steps
generateSchemaSnapshot();
buildFrontend();

// 3. Deploy via Phio
let command;
let args;
let options;

if (isWindows) {
    if (useWsl) {
        const targetArgs = deployArgs.map(shellQuoteSingle).join(" ");
        const deployCmd = `cd ${shellQuoteSingle(wslCwd)} && npx -y -p node@24 -p phio phio deploy ${targetArgs} 2>&1`;
        command = "wsl";
        args = ["bash", "-lc", deployCmd];
        options = {
            stdio: ["inherit", "pipe", "pipe"],
        };
    } else {
        const targetArgs = deployArgs.join(" ");
        command = `npx -y -p node@24 -p phio phio deploy ${targetArgs}`;
        args = [];
        options = {
            cwd: workspaceRoot,
            shell: true,
            stdio: ["inherit", "pipe", "pipe"],
        };
    }
} else {
    command = "npx";
    args = ["-y", "-p", "node@24", "-p", "phio", "phio", "deploy", ...deployArgs];
    options = {
        cwd: workspaceRoot,
        stdio: ["inherit", "pipe", "pipe"],
    };
}

const child = spawn(command, args, options);

let stdout = "";
let stderr = "";

child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    stdout += chunk.toString();
});

child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    stderr += chunk.toString();
});

child.on("close", (code) => {
    const combined = `${stdout}\n${stderr}`;
    const deployDone = combined.includes("Deploy done!");
    const hasErrorBanner = combined.includes("an error occurred");

    if (code !== 0 && deployDone && !hasErrorBanner) {
        process.exit(0);
    }

    process.exit(code ?? 1);
});

child.on("error", (err) => {
    console.error(err);
    process.exit(1);
});

process.on("SIGINT", () => {
    child.kill("SIGINT");
});
process.on("SIGTERM", () => {
    child.kill("SIGTERM");
});
