// The oracle is analytical floating-point arithmetic, used ONLY in tests.
// The system under test is the PNG executed by unmodified third-party npiet.
import assert from 'node:assert/strict';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const png = 'skyforge-orbit.png';
assert.ok(existsSync(png), 'The executable Piet PNG must exist');
const interpreter = process.env.NPIET || 'npiet';
function run(radius, image = png, codelSize = 1, trace = false) {
  const args = ['-q', '-w', '-cs', String(codelSize), ...(trace ? ['-t'] : []), image];
  const p = spawnSync(interpreter, args, {
    input: `${radius}\n`, encoding: 'utf8', timeout: 5000, maxBuffer: 4e6,
  });
  assert.ifError(p.error);
  assert.equal(p.status, 0, p.stderr);
  assert.equal(p.stderr, '', 'Interpreter warnings/errors are failures');
  return p.stdout;
}

const cases = [
  ['Lower bound', 6378, 7905],
  ['LEO (400 km above 6378 km)', 6778, 7668],
  ['LEO', 7000, 7546],
  ['MEO', 26560, 3873],
  ['GEO', 42164, 3074],
  ['Upper bound', 100000, 1996],
];
const rows = [];
for (const [label, radius, expected] of cases) {
  const actual = run(radius);
  assert.equal(actual, `${expected}\n`, `${label}: stdout must be computed speed and newline`);
  const reference = Math.sqrt(398600 / radius) * 1000;
  const jplReference = Math.sqrt(398600.435507 / radius) * 1000;
  assert.ok(reference - expected >= 0 && reference - expected < 1);
  assert.ok(Math.abs(jplReference - expected) < 1.005);
  rows.push({ label, radius_km: radius, piet_m_s: expected,
    model_reference_m_s: reference, jpl_reference_m_s: jplReference,
    absolute_error_m_s: jplReference - expected });
}
// Breaks caught: ignored input, bad units, arithmetic/roll errors, wrong rounding,
// missing remainder term, overflow, and hardcoded demonstration outputs.
let sweepCount = 0;
let maxError = 0;
for (let r = 6378; r <= 100000; r += 173) {
  const reference = Math.sqrt(398600 / r) * 1000;
  const actual = Number(run(r).trim());
  assert.equal(actual, Math.floor(reference), `sweep radius ${r}`);
  maxError = Math.max(maxError, reference - actual);
  sweepCount++;
}
// Radii either side of exact integer-speed transitions.
let boundaryCount = 0;
for (const v of [2000, 2500, 3075, 4000, 6000, 7500, 7900]) {
  const boundary = Math.floor(398600000000 / (v * v));
  for (const r of [boundary, boundary + 1]) {
    assert.equal(run(r), `${Math.floor(Math.sqrt(398600 / r) * 1000)}\n`);
    boundaryCount++;
  }
}
const invalid = [-2147483648, -1, 0, 6377, 100001, 2147483647];
for (const r of invalid) assert.equal(run(r), '-1\n', `invalid radius ${r}`);
for (const [, r, expected] of cases)
  assert.equal(run(r, 'skyforge-orbit-zoom.png', 6), `${expected}\n`);
const trace = run(42164, png, 1, true);
assert.match(trace, /action:.*divide/);
assert.match(trace, /action:.*multiply/);
assert.match(trace, /action:.*greater/);
writeFileSync('geo-trace.txt', trace);
const report = {
  interpreter: 'unmodified npiet v1.3h, compiled with libpng in Docker',
  png_sha256: createHash('sha256').update(readFileSync(png)).digest('hex'),
  cases: rows, sweep_count: sweepCount, sweep_max_model_error_m_s: maxError,
  square_boundary_count: boundaryCount, invalid_input_count: invalid.length,
  zoom_cases: cases.length,
  total_numeric_checks: cases.length + sweepCount + boundaryCount + invalid.length + cases.length,
  result: 'PASS',
};
writeFileSync('test-results.json', JSON.stringify(report, null, 2) + '\n');
console.table(rows);
console.log(JSON.stringify(report, null, 2));
