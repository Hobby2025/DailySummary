const fs = require("node:fs/promises");
const path = require("node:path");

const outputPath = path.join(process.cwd(), "release-portable");

async function cleanupPackageOutput() {
  const entries = await fs.readdir(outputPath, { withFileTypes: true });
  const exeFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".exe"));

  if (exeFiles.length === 0) {
    throw new Error("패키징 결과 실행 파일을 찾을 수 없습니다.");
  }

  await Promise.all(
    entries
      .filter((entry) => !(entry.isFile() && entry.name.endsWith(".exe")))
      .map((entry) => fs.rm(path.join(outputPath, entry.name), { recursive: true, force: true })),
  );
}

cleanupPackageOutput().catch((error) => {
  console.error(error);
  process.exit(1);
});
