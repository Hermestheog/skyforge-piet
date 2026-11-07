// Assembler/image encoder only. No orbital calculation or input evaluation.
// Each instruction becomes an exact Piet color transition. All constants are
// constructed by Piet operations; source block sizes are only 1..10 codels.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { earthLayout } from './earth-layout.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const deltas = {
  push: [0, 1], pop: [0, 2], add: [1, 0], subtract: [1, 1],
  multiply: [1, 2], divide: [2, 0], mod: [2, 1], not: [2, 2],
  greater: [3, 0], pointer: [3, 1], switch: [3, 2],
  duplicate: [4, 0], roll: [4, 1], in_number: [4, 2],
  in_char: [5, 0], out_number: [5, 1], out_char: [5, 2],
};
const colors = [
  ['ffc0c0', 'ff0000', 'c00000'], ['ffffc0', 'ffff00', 'c0c000'],
  ['c0ffc0', '00ff00', '00c000'], ['c0ffff', '00ffff', '00c0c0'],
  ['c0c0ff', '0000ff', '0000c0'], ['ffc0ff', 'ff00ff', 'c000c0'],
];
const ops = [];
let sourceLine = 0;
function emit(op, value = 1) {
  assert.ok(deltas[op], `Unknown Piet command ${op}`);
  ops.push({ op, value, sourceLine });
}
function constant(n) {
  assert.ok(Number.isSafeInteger(n));
  if (n < 0) { constant(0); constant(-n); emit('subtract'); return; }
  if (n === 0) { emit('push', 1); emit('not'); return; }
  if (n <= 10) { emit('push', n); return; }
  const digits = String(n).split('').map(Number);
  constant(digits[0]);
  for (const digit of digits.slice(1)) {
    emit('push', 10); emit('multiply');
    if (digit) { emit('push', digit); emit('add'); }
  }
}
function pick(depth) {
  // Copy the depth-th item without changing the existing stack order.
  if (depth === 1) { emit('duplicate'); return; }
  constant(depth); constant(-1); emit('roll'); emit('duplicate');
  constant(depth + 1); constant(1); emit('roll');
}
function trybit(bit) {
  // N,a -> N,a+b*NOT((a+b)^2>N)
  emit('duplicate'); constant(bit); emit('add');
  emit('duplicate'); emit('multiply'); pick(3); emit('greater');
  emit('not'); constant(bit); emit('multiply'); emit('add');
}
const source = readFileSync(join(dir, 'orbit.pasm'), 'utf8');
for (const [index, line] of source.split(/\r?\n/).entries()) {
  sourceLine = index + 1;
  const code = line.split('#')[0].trim();
  if (!code) continue;
  const [op, arg] = code.split(/\s+/);
  if (op === 'const') constant(Number(arg));
  else if (op === 'pick') pick(Number(arg));
  else if (op === 'trybit') trybit(Number(arg));
  else emit(op);
}

const {width,height,pixels,map,tiles,halt,stats}=earthLayout(ops,colors,deltas);

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let b = 0; b < 8; b++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(scale) {
  const w = width * scale, h = height * scale;
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (Math.floor(y / scale) * width + Math.floor(x / scale)) * 3;
      pixels.copy(raw, y * (w * 3 + 1) + 1 + x * 3, p, p + 3);
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0); header.writeUInt32BE(h, 4);
  header[8] = 8; header[9] = 2; // 8-bit RGB, no alpha, no interlacing
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
writeFileSync(join(dir, 'skyforge-orbit.png'), png(1));
writeFileSync(join(dir, 'skyforge-orbit-zoom.png'), png(6));
writeFileSync(join(dir, 'instruction-map.json'), JSON.stringify({
  width, height, codel_size: 1, instruction_count: map.length, stats,
  halt_block: halt, instructions: map, tiles,
}, null, 2) + '\n');
console.log(`Assembled executable Earth into ${width}x${height} PNG.`,stats);
