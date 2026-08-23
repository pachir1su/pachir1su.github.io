#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const videoExts = new Set(['.mp4', '.mov', '.m4v', '.3gp', '.webm', '.mkv', '.avi']);
const ignoredDirs = new Set(['.git', 'node_modules']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else {
      const ext = path.extname(entry.name).toLowerCase();
      if (imageExts.has(ext) || videoExts.has(ext)) out.push(full);
    }
  }
  return out;
}

function u32be(buf, offset) {
  return buf.readUInt32BE(offset);
}

function detectJpeg(buf) {
  const hits = new Set();
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return ['invalid-jpeg'];
  let p = 2;
  while (p + 4 <= buf.length) {
    if (buf[p] !== 0xff) { p += 1; continue; }
    let marker = buf[p + 1];
    p += 2;
    while (marker === 0xff && p < buf.length) marker = buf[p++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (p + 2 > buf.length) break;
    const len = buf.readUInt16BE(p);
    if (len < 2 || p + len > buf.length) break;
    const payload = buf.subarray(p + 2, p + len);
    if (marker === 0xe1) {
      const head = payload.subarray(0, Math.min(payload.length, 96)).toString('latin1');
      if (head.startsWith('Exif\u0000\u0000')) hits.add('EXIF');
      if (/xmp|adobe/i.test(head)) hits.add('XMP');
    }
    if (marker === 0xed) hits.add('APP13/IPTC');
    if (marker === 0xfe) hits.add('COMMENT');
    p += len;
  }
  return [...hits];
}

function detectPng(buf) {
  const hits = new Set();
  const sig = '89504e470d0a1a0a';
  if (buf.length < 8 || buf.subarray(0, 8).toString('hex') !== sig) return ['invalid-png'];
  let p = 8;
  while (p + 12 <= buf.length) {
    const len = u32be(buf, p);
    const type = buf.subarray(p + 4, p + 8).toString('ascii');
    if (['eXIf', 'tEXt', 'zTXt', 'iTXt'].includes(type)) hits.add(type);
    p += 12 + len;
    if (type === 'IEND') break;
  }
  return [...hits];
}

function detectWebp(buf) {
  const hits = new Set();
  if (buf.length < 12 || buf.subarray(0, 4).toString('ascii') !== 'RIFF' || buf.subarray(8, 12).toString('ascii') !== 'WEBP') return ['invalid-webp'];
  let p = 12;
  while (p + 8 <= buf.length) {
    const type = buf.subarray(p, p + 4).toString('ascii');
    const len = buf.readUInt32LE(p + 4);
    if (type === 'EXIF') hits.add('EXIF');
    if (type === 'XMP ') hits.add('XMP');
    p += 8 + len + (len & 1);
  }
  return [...hits];
}

function detectGif(buf) {
  const hits = new Set();
  const head = buf.subarray(0, 6).toString('ascii');
  if (head !== 'GIF87a' && head !== 'GIF89a') return ['invalid-gif'];
  for (let i = 0; i + 1 < buf.length; i += 1) {
    if (buf[i] === 0x21 && buf[i + 1] === 0xfe) { hits.add('COMMENT'); break; }
  }
  return [...hits];
}

function detectVideo(buf, ext) {
  const hits = new Set();
  const latin = buf.toString('latin1').toLowerCase();
  const patterns = [
    ['location', ['com.apple.quicktime.location', 'location.iso6709', '©xyz']],
    ['creation-time', ['creation_time', 'creationdate', 'date_utc']],
    ['device', ['hostcomputer', 'device_model', 'device_make', 'camera_model', 'camera_make']],
    ['software', ['encoder', 'encoded_by', 'software']],
    ['descriptive', ['comment', 'description', 'artist', 'author', 'copyright']]
  ];
  for (const [label, needles] of patterns) if (needles.some((n) => latin.includes(n))) hits.add(label);

  if (['.mp4', '.mov', '.m4v', '.3gp'].includes(ext)) {
    // QuickTime user-data atoms that can carry location/title/author metadata.
    for (const atom of ['©xyz', '©nam', '©art', '©cmt', '©cpy']) if (latin.includes(atom)) hits.add(`atom:${atom}`);
  }
  return [...hits];
}

function detect(file) {
  const ext = path.extname(file).toLowerCase();
  const buf = fs.readFileSync(file);
  if (ext === '.jpg' || ext === '.jpeg') return detectJpeg(buf);
  if (ext === '.png') return detectPng(buf);
  if (ext === '.webp') return detectWebp(buf);
  if (ext === '.gif') return detectGif(buf);
  return detectVideo(buf, ext);
}

const files = walk(root).sort();
const issues = [];
for (const file of files) {
  const hits = detect(file);
  if (hits.length) issues.push({ file: path.relative(root, file).split(path.sep).join('/'), metadata: hits });
}

const result = {
  scanned: files.length,
  offenders: issues.length,
  issues
};

console.log(JSON.stringify(result, null, 2));
if (issues.length) process.exitCode = 1;
