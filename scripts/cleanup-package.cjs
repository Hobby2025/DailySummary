const fs = require("node:fs/promises");
const path = require("node:path");

const outputPath = path.join(process.cwd(), "release-portable");

async function cleanupPackageOutput() {
  const entries = await fs.readdir(outputPath, { withFileTypes: true });
  const exeFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".exe"));

  if (exeFiles.length === 0) {
    throw new Error("패키징 결과 실행 파일을 찾을 수 없습니다.");
  }

  const cleanupTargets = entries.filter((entry) => !(entry.isFile() && entry.name.endsWith(".exe")));

  for (const entry of cleanupTargets) {
    const targetPath = path.join(outputPath, entry.name);

    try {
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch (error) {
      if (isBusyError(error)) {
        console.warn(`패키지 결과 파일은 생성됐지만 잠긴 임시 폴더를 정리하지 못했습니다: ${targetPath}`);
        continue;
      }

      throw error;
    }
  }
}

function isBusyError(error) {
  return error && typeof error === "object" && ["EBUSY", "EPERM"].includes(error.code);
}

cleanupPackageOutput().catch((error) => {
  console.error(error);
  process.exit(1);
});
