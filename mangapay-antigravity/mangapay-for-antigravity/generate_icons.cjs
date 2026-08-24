const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPngBuffer(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT - scanlines
  const rawRow = Buffer.alloc(1 + width * 3);
  rawRow[0] = 0; // filter type none
  for (let i = 0; i < width; i++) {
    rawRow[1 + i * 3] = r;
    rawRow[1 + i * 3 + 1] = g;
    rawRow[1 + i * 3 + 2] = b;
  }

  const rawAll = Buffer.concat(Array(height).fill(rawRow));
  const compressed = zlib.deflateSync(rawAll);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);

  const crcBuf = buf.subarray(4, 8 + len);
  const crc = crc32(crcBuf);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Generate PNG icons (Teal #0D7377 -> RGB 13, 115, 119)
const publicDir = path.join(__dirname, 'public');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPngBuffer(192, 192, 13, 115, 119));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPngBuffer(512, 512, 13, 115, 119));
fs.writeFileSync(path.join(publicDir, 'screenshot1.png'), createPngBuffer(540, 960, 13, 115, 119));
console.log('✅ Generated 192x192 and 512x512 PNG icons successfully!');
