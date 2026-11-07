// Execute both actual PNGs with the same unmodified interpreter.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
assert.equal(hash('baseline/skyforge-orbit.png'), '6cc02d3ffde1d64147ac90b01d4b4e249ecfc9ff5ae7e7fdf73ea1ca9c29ad3e');
assert.notEqual(hash('skyforge-orbit.png'), hash('baseline/skyforge-orbit.png'), 'The executable image must be redesigned');
const cases = [];
const named = [6378, 6778, 7000, 26560, 42164, 100000];
for (const r of named) cases.push({group:'reference', r, zoom:false});
for (let r=6378;r<=100000;r+=173) cases.push({group:'sweep', r, zoom:false});
for (const v of [2000,2500,3075,4000,6000,7500,7900]) {
  const r = Math.floor(398600000000/(v*v));
  cases.push({group:'boundary',r,zoom:false},{group:'boundary',r:r+1,zoom:false});
}
for (const r of [-2147483648,-1,0,6377,100001,2147483647]) cases.push({group:'invalid',r,zoom:false});
for (const r of named) cases.push({group:'zoom',r,zoom:true});
assert.equal(cases.length,574);
function run(file,r,cs) {
  const p=spawnSync(process.env.NPIET||'npiet',['-q','-w','-uu','-cs',String(cs),file],{
    input:`${r}\n`,encoding:'utf8',timeout:10000,maxBuffer:4e6});
  assert.ifError(p.error); assert.equal(p.status,0,p.stderr); assert.equal(p.stderr,'');
  return p.stdout;
}
for (const c of cases) {
  const file=c.zoom?'skyforge-orbit-zoom.png':'skyforge-orbit.png';
  c.original=run(`baseline/${file}`,c.r,c.zoom?6:1);
  c.redesigned=run(file,c.r,c.zoom?6:1);
  assert.equal(c.redesigned,c.original,`${c.group} radius ${c.r}`);
}
writeFileSync('equivalence-results.json',JSON.stringify({
  interpreter:'unmodified npiet v1.3h', baseline_sha256:hash('baseline/skyforge-orbit.png'),
  redesigned_sha256:hash('skyforge-orbit.png'), identical_checks:cases.length,
  result:'PASS', cases,
},null,2)+'\n');
console.log('PASS: all 574 original/redesigned executions have byte-identical stdout, successful termination, and no warnings.');
