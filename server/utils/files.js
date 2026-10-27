const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

// Verify the real content of the file matches the claimed type (magic bytes), not just the extension.
const SIGS = {
  pdf: [[0x25, 0x50, 0x44, 0x46]],
  png: [[0x89, 0x50, 0x4e, 0x47]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
  docx: [[0x50, 0x4b, 0x03, 0x04]],
  pptx: [[0x50, 0x4b, 0x03, 0x04]],
  xlsx: [[0x50, 0x4b, 0x03, 0x04]],
  doc: [[0xd0, 0xcf, 0x11, 0xe0]],
  ppt: [[0xd0, 0xcf, 0x11, 0xe0]],
};

async function contentMatches(filePath, ext) {
  const fh = await fsp.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(4096);
    const { bytesRead } = await fh.read(buf, 0, 4096, 0);
    const head = buf.subarray(0, bytesRead);
    if (ext === 'txt') return !head.includes(0); // plain text must not contain NUL bytes
    const sigs = SIGS[ext];
    if (!sigs) return false;
    const okSig = sigs.some((s) => s.every((b, i) => head[i] === b));
    if (ext === 'webp') return okSig && head.subarray(8, 12).toString() === 'WEBP';
    return okSig;
  } finally {
    await fh.close();
  }
}

const removeFile = (filename, dir) => {
  if (!filename) return;
  fs.promises.unlink(path.join(dir, path.basename(filename))).catch(() => {});
};

module.exports = { contentMatches, removeFile };
