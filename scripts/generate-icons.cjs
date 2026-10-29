const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG generator in pure Node without external dependencies
function createPNG(width, height, r, g, b, innerR, innerG, innerB) {
  // RGBA buffer with border / center badge
  const rowSize = width * 4 + 1; // 1 filter byte per scanline
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.42;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      let pixelR = r;
      let pixelG = g;
      let pixelB = b;
      let pixelA = 255;

      // Inner shield / circle emblem
      if (dist < radius) {
        // gradient or contrasting color
        pixelR = innerR;
        pixelG = innerG;
        pixelB = innerB;
      }

      rawData[offset++] = pixelR;
      rawData[offset++] = pixelG;
      rawData[offset++] = pixelB;
      rawData[offset++] = pixelA;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT Chunk
  const idatChunk = createChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const header = Buffer.alloc(8);
  header.writeUInt32BE(length, 0);
  header.write(type, 4, 4, 'ascii');

  const payload = Buffer.concat([header.subarray(4), data]);
  const crc = crc32(payload);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([header.subarray(0, 4), payload, crcBuf]);
}

// Table-based CRC32
function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = crcTable[(c ^ buf[n]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

// Generate PNG assets in public/
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Slate 900: #0f172a (15, 23, 42), Emerald 500: #10b981 (16, 185, 129)
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, 15, 23, 42, 16, 185, 129));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, 15, 23, 42, 16, 185, 129));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, 15, 23, 42, 16, 185, 129));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, 15, 23, 42, 16, 185, 129));

// Also generate public/icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#0f172a"/>
  <path fill="#10b981" d="M256 64L96 128v128c0 120 80 220 160 256 80-36 160-136 160-256V128L256 64z"/>
  <path fill="#ffffff" d="M256 160v192c45-22 90-80 90-144v-78l-90-40z" opacity="0.3"/>
  <text x="256" y="310" font-family="Arial, sans-serif" font-weight="900" font-size="80" fill="#ffffff" text-anchor="middle">INF</text>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

console.log('PWA icons created successfully in public/');
