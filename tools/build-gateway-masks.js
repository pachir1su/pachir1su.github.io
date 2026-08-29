#!/usr/bin/env node
/* =====================================================================
   tools/build-gateway-masks.js — 우주 진입점 찢김 마스크 생성

   `docs/v3-constellation-prototypes/assets/gateway/`의 찢긴 종이 원본은
   1024×1536 RGBA PNG 세 장이고 한 장이 1.7~2.2MB다. 그대로 홈에 실으면
   히어로에서 2MB를 받게 되어 성능 감사(#113)가 지적한 자리로 되돌아간다.

   진입점 렌더는 원본의 RGB를 쓰지 않는다. 이미지를 그린 뒤 `source-atop`으로
   밤하늘을 덮어씌우므로 **실제로 쓰는 것은 알파 채널뿐**이다.
   그래서 알파만 뽑아 회색조+알파(color type 4) PNG로 다시 쓴다.
   회색 채널이 상수라 압축률이 높고, 브라우저에서 그대로 마스크로 쓸 수 있다.

   Node 내장 모듈(zlib)만 쓴다. 외부 패키지를 설치하지 않는다(AGENTS.md).

   사용법: node tools/build-gateway-masks.js
   ===================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const SRC_DIR = path.join(root, 'docs', 'v3-constellation-prototypes', 'assets', 'gateway');
const OUT_DIR = path.join(root, 'universe', 'assets', 'gateway');
const MAX_EDGE = 640; /* 표시 최대 폭 ~300 CSS px · DPR 2 기준의 여유값 */

const SOURCES = [
  { src: 'torn-portal-wide-v1.png', out: 'tear-wide.png' },
  { src: 'torn-portal-diagonal-v1.png', out: 'tear-diagonal.png' },
  { src: 'torn-portal-trail-v1.png', out: 'tear-trail.png' },
];

/* ------------------------------------------------------------------
   CRC32 — PNG 청크마다 필요하다. zlib은 청크 CRC를 만들어 주지 않는다.
   ------------------------------------------------------------------ */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* ------------------------------------------------------------------
   디코드 — 8bit RGBA · 비인터레이스만 받는다. 원본 세 장이 모두 그 형식이고,
   범용 디코더를 쓰지 않는 편이 읽기 쉽다. 형식이 다르면 그 자리에서 멈춘다.
   ------------------------------------------------------------------ */
function readAlpha(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`PNG가 아닙니다: ${file}`);

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const depth = buf[24], color = buf[25], interlace = buf[28];
  if (depth !== 8 || color !== 6 || interlace !== 0) {
    throw new Error(`지원하지 않는 PNG 형식(depth=${depth} color=${color} interlace=${interlace}): ${file}`);
  }

  /* IDAT은 여러 청크로 쪼개져 있다. 순서대로 이어 붙여야 한 덩어리가 된다. */
  const parts = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') parts.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
    if (type === 'IEND') break;
  }

  const raw = zlib.inflateSync(Buffer.concat(parts));
  const bpp = 4;
  const stride = width * bpp;
  const alpha = new Uint8Array(width * height);
  const line = Buffer.alloc(stride);
  const prev = Buffer.alloc(stride);

  /* 언필터 — PNG 스캔라인은 앞줄·왼쪽 픽셀을 기준으로 예측 부호화되어 있다. */
  for (let y = 0; y < height; y++) {
    const at = y * (stride + 1);
    const filter = raw[at];
    raw.copy(line, 0, at + 1, at + 1 + stride);

    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let value = line[i];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) {
        throw new Error(`알 수 없는 필터 ${filter} (line ${y}): ${file}`);
      }
      line[i] = value & 0xff;
    }
    line.copy(prev);

    for (let x = 0; x < width; x++) alpha[y * width + x] = line[x * bpp + 3];
  }

  return { width, height, alpha };
}

/* ------------------------------------------------------------------
   축소 — 박스 필터. 찢긴 가장자리는 부드러운 경사라 박스로 충분하고,
   샤프닝을 넣으면 오히려 톱니가 생긴다.
   ------------------------------------------------------------------ */
function downscale(src, sw, sh, dw, dh) {
  const out = new Uint8Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor((y * sh) / dh);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor((x * sw) / dw);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / dw));
      let sum = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) { sum += src[yy * sw + xx]; n++; }
      }
      out[y * dw + x] = Math.round(sum / n);
    }
  }
  return out;
}

/* ------------------------------------------------------------------
   인코드 — color type 4(회색조+알파). 회색 채널은 0으로 고정하고
   알파에 마스크를 넣는다. 브라우저가 그대로 알파 마스크로 쓸 수 있다.
   ------------------------------------------------------------------ */
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodeGrayAlpha(mask, width, height) {
  const bpp = 2;
  const stride = width * bpp;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y++) {
    const at = y * (stride + 1);
    /* 필터 1(Sub)은 가로로 완만한 알파 경사에서 값을 작게 만든다.
       회색 채널이 상수라 Sub를 쓰면 그 절반이 통째로 0이 된다. */
    raw[at] = 1;
    let prevGray = 0, prevAlpha = 0;
    for (let x = 0; x < width; x++) {
      const a = mask[y * width + x];
      raw[at + 1 + x * bpp] = (0 - prevGray) & 0xff;
      raw[at + 1 + x * bpp + 1] = (a - prevAlpha) & 0xff;
      prevGray = 0; prevAlpha = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  /* bit depth */
  ihdr[9] = 4;  /* color type — grayscale + alpha */
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ */
fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = [];

for (const item of SOURCES) {
  const { width, height, alpha } = readAlpha(path.join(SRC_DIR, item.src));
  const scale = MAX_EDGE / Math.max(width, height);
  const dw = Math.max(1, Math.round(width * scale));
  const dh = Math.max(1, Math.round(height * scale));
  const mask = downscale(alpha, width, height, dw, dh);
  const png = encodeGrayAlpha(mask, dw, dh);
  const outPath = path.join(OUT_DIR, item.out);
  fs.writeFileSync(outPath, png);

  const srcSize = fs.statSync(path.join(SRC_DIR, item.src)).size;
  manifest.push({ file: item.out, w: dw, h: dh, ratio: +(dw / dh).toFixed(4), bytes: png.length });
  console.log(
    `${item.src} ${width}x${height} ${(srcSize / 1024 / 1024).toFixed(2)}MB`
    + ` → ${item.out} ${dw}x${dh} ${(png.length / 1024).toFixed(1)}KB`
  );
}

console.log('\ngate.js의 TEARS 항목에 쓸 값:');
manifest.forEach((m) => console.log(`  { src: '${m.file}', ratio: ${m.ratio} },`));
