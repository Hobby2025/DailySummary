const fs = require("node:fs/promises");
const path = require("node:path");

const projectRoot = process.cwd();
const nextOutputPath = path.join(projectRoot, ".next");
const standalonePath = path.join(nextOutputPath, "standalone");

async function copyIfExists(sourcePath, targetPath) {
  try {
    await fs.access(sourcePath);
  } catch {
    return;
  }

  await fs.rm(targetPath, { recursive: true, force: true });
  await fs.cp(sourcePath, targetPath, { recursive: true });
}

async function prepareStandalone() {
  await fs.access(standalonePath);
  await copyIfExists(
    path.join(nextOutputPath, "static"),
    path.join(standalonePath, ".next", "static"),
  );
  await copyIfExists(
    path.join(projectRoot, "node_modules", "next", "dist", "compiled"),
    path.join(standalonePath, "node_modules", "next", "dist", "compiled"),
  );
  await copyIfExists(path.join(projectRoot, "public"), path.join(standalonePath, "public"));
}

prepareStandalone().catch((error) => {
  console.error(error);
  process.exit(1);
});
