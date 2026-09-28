import { spawn, spawnSync } from "node:child_process";

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

const userArgs = process.argv.slice(2);
const deployArgs =
    userArgs.length === 0
        ? ["frame"]
        : userArgs.some((arg) => !arg.startsWith("-"))
          ? userArgs
          : ["frame", ...userArgs];

let command;
let args;
let options;

if (isWindows) {
    const wslCwd = toWslPath(workspaceRoot);
    const useWsl =
        process.env.USE_WSL !== "false" &&
        process.env.NO_WSL !== "1" &&
        wslCwd !== null &&
        hasWsl();

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
