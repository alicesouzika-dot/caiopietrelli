// Script para gerar PNGs válidos e puros sem dependências externas
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data with filter byte (0) per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.28;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Simple paw silhouette approximation in the center
      const inCircle = dist < radius;
      const inToe1 = Math.hypot(x - (cx - radius * 0.6), y - (cy - radius * 0.7)) < radius * 0.28;
      const inToe2 = Math.hypot(x - (cx + radius * 0.6), y - (cy - radius * 0.7)) < radius * 0.28;
      const inToe3 = Math.hypot(x - (cx - radius * 0.22), y - (cy - radius * 0.95)) < radius * 0.28;
      const inToe4 = Math.hypot(x - (cx + radius * 0.22), y - (cy - radius * 0.95)) < radius * 0.28;

      if (inCircle || inToe1 || inToe2 || inToe3 || inToe4) {
        // White paw
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
        rawData[pixelOffset + 3] = 255;
      } else {
        // Brand blue background #06154E
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
        rawData[pixelOffset + 3] = a;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 table
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

// Generate all required PWA icons
fs.mkdirSync('./public/icons', { recursive: true });
fs.mkdirSync('./public/splash', { recursive: true });

// #06154E -> R: 6, G: 21, B: 78
fs.writeFileSync('./public/icons/icon-192.png', createPNG(192, 192, 6, 21, 78));
fs.writeFileSync('./public/icons/icon-512.png', createPNG(512, 512, 6, 21, 78));
fs.writeFileSync('./public/icons/maskable-512.png', createPNG(512, 512, 6, 21, 78));
fs.writeFileSync('./public/icons/apple-touch-icon-180.png', createPNG(180, 180, 6, 21, 78));
fs.writeFileSync('./public/icons/shortcut-disparo.png', createPNG(96, 96, 6, 21, 78));
fs.writeFileSync('./public/icons/shortcut-busca.png', createPNG(96, 96, 6, 21, 78));
fs.writeFileSync('./public/icons/shortcut-cadastro.png', createPNG(96, 96, 6, 21, 78));
fs.writeFileSync('./public/splash/splash-1170x2532.png', createPNG(390, 844, 255, 255, 255));

console.log('Todos os ícones e splash screens PWA gerados com sucesso!');
