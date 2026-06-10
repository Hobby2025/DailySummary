module",
  "main": "electron/main.cjs",
  "dependencies": {
    "lucide-react": "^1.17.0",
    "next": "^16.2.9",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "overrides": {
    "postcss": "8.5.10"
  }
}const { spawn } = require("node:child_process");
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
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const size = 256;
const outDir = path.join(process.cwd(), "build");

fs.mkdirSync(outDir, { recursive: true });

const png = createPng(size, size);
fs.writeFileSync(path.join(outDir, "icon.png"), png);
fs.writeFileSync(path.join(outDir, "icon.ico"), createIco(png, size, size));

function createPng(width, height) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const index = 1 + x * 4;
      const distance = Math.hypot(x - width / 2, y - height / 2);
      const inCircle = distance < 108;
      const inPage = x > 72 && x < 184 && y > 54 && y < 202;
      const inFold = x > 148 && y > 54 && x + y < 238;
      const inLine1 = x > 95 && x < 161 && y > 104 && y < 114;
      const inLine2 = x > 95 && x < 161 && y > 132 && y < 142;
      const inCheck =
        (x > 93 && x < 113 && y > 155 && y < 175 && Math.abs(y - x - 58) < 7) ||
        (x > 108 && x < 154 && y > 137 && y < 178 && Math.abs(y + x - 272) < 7);

      if (!inCircle) {
        row