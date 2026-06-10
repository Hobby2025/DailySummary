const { spawn } = require("node:child_process");
const path = require("node:path");
const net = require("node:net");

const port = Number(process.env.DESKTOP_APP_PORT ?? 3000);
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const electronBin = require("electron");

const next = spawn(process.execPath, [nextBin, "dev", "-p", String(port), "-H", "127.0.0.1"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
  windowsHide: false,
});

waitForPort(port)
  .then(() => {
    const electron = spawn(electronBin, ["electron/main.cjs"], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_DEV_SERVER_URL: `http://127.0.0.1:${port}`,
      },
      windowsHide: false,
    });

    electron.on("exit", () => {
      stopChild(next);
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error(error.message);
    stopChild(next);
    process.exit(1);
  });

process.on("SIGINT", () => {
  stopChild(next);
  process.exit(0);
});

function waitForPort(targetPort) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const socket = net.createConnection({ host: "127.0.0.1", port: targetPort }, () => {
        socket.end();
        clearInterval(timer);
        resolve();
      });

      socket.on("error", () => {
        if (Date.now() - startedAt > 30_000) {
          clearInterval(timer);
          reject(new Error("Next 개발 서버를 시작하지 못했습니다."));
        }
      });
    }, 500);
  });
}

function stopChild(child) {
  if (!child.killed) {
    child.kill();
  }
}
