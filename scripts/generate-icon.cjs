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
        row[index + 3] = 0;
      } else if (inPage && !inFold) {
        row[index] = 248;
        row[index + 1] = 250;
        row[index + 2] = 252;
        row[index + 3] = 255;
      } else if (inLine1 || inLine2 || inCheck) {
        row[index] = 37;
        row[index + 1] = 99;
        row[index + 2] = 235;
        row[index + 3] = 255;
      } else {
        row[index] = 14;
        row[index + 1] = 116;
        row[index + 2] = 144;
        row[index + 3] = 255;
      }
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", Buffer.concat([uint32(width), uint32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function createIco(png, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directory = Buffer.alloc(16);
  directory[0] = width >= 256 ? 0 : width;
  directory[1] = height >= 256 ? 0 : height;
  directory[2] = 0;
  directory[3] = 0;
  directory.writeUInt16LE(1, 4);
  directory.writeUInt16LE(32, 6);
  directory.writeUInt32LE(png.length, 8);
  directory.writeUInt32LE(22, 12);

  return Buffer.concat([header, directory, png]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const crcInput = Buffer.concat([typeBuffer, data]);
  return Buffer.concat([uint32(data.length), typeBuffer, data, uint32(crc32(crcInput))]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
