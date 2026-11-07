// Audit executable pixels against the saved, real npiet trace. No interpreter.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const png=readFileSync('skyforge-orbit.png');
let w,h; const idat=[];
for(let p=8;p<png.length;) {
  const n=png.readUInt32BE(p),type=png.toString('ascii',p+4,p+8),data=png.subarray(p+8,p+8+n);
  if(type==='IHDR') { w=data.readUInt32BE(0);h=data.readUInt32BE(4);assert.equal(data[8],8);assert.equal(data[9],2); }
  if(type==='IDAT') idat.push(data);
  p+=n+12;
}
const raw=inflateSync(Buffer.concat(idat)), pixels=new Uint32Array(w*h);
for(let y=0;y<h;y++) {
  assert.equal(raw[y*(w*3+1)],0);
  for(let x=0;x<w;x++) {
    const p=y*(w*3+1)+1+x*3;
    pixels[y*w+x]=(raw[p]<<16)|(raw[p+1]<<8)|raw[p+2];
  }
}
const meta=JSON.parse(readFileSync('instruction-map.json','utf8'));
const trace=readFileSync('geo-trace.txt','utf8');
const seen=new Set(),destinations=[];
for(const m of trace.matchAll(/trace: step \d+\s+\((\d+),(\d+)\/[rdlu],[lr] \w+ -> (\d+),(\d+)\/[rdlu],[lr] \w+\):/g)) {
  seen.add(Number(m[2])*w+Number(m[1]));
  const dest=Number(m[4])*w+Number(m[3]); seen.add(dest);destinations.push(dest);
}
assert.ok(seen.size>1000,'A real complete trace is required');
const blockOf=new Int32Array(w*h).fill(-1),blocks=[];
for(let p=0;p<pixels.length;p++) {
  const color=pixels[p];
  if(color===0||color===0xffffff||blockOf[p]!==-1) continue;
  const id=blocks.length,queue=[p];blockOf[p]=id;let visited=false;
  for(let i=0;i<queue.length;i++) {
    const q=queue[i],x=q%w,y=Math.floor(q/w);
    visited ||= seen.has(q);
    for(const k of [x>0?q-1:-1,x<w-1?q+1:-1,y>0?q-w:-1,y<h-1?q+w:-1])
      if(k>=0&&blockOf[k]===-1&&pixels[k]===color) {blockOf[k]=id;queue.push(k);}
  }
  blocks.push({area:queue.length,visited});
}
assert.ok(blocks.every(b=>b.visited),'Every colored component must be executed; no detached artwork');
for(const op of meta.instructions.filter(o=>o.op==='push'))
  assert.equal(blocks[blockOf[op.y*w+op.x]].area,op.value,`push area at ${op.x},${op.y}`);
const core=meta.instructions.filter(o=>o.role==='core');
const coreTargets=new Map(core.map(o=>[o.ty*w+o.tx,o.core_index]));
const actual=destinations.filter(p=>coreTargets.has(p)).map(p=>coreTargets.get(p));
assert.deepEqual(actual,Array.from({length:597},(_,i)=>i),'All original computational instructions execute once, in order');
const baseline=JSON.parse(readFileSync('baseline/instruction-map.json','utf8')).instructions.slice(0,-2);
for(const o of core) {
  const old=baseline[o.core_index];
  assert.equal(o.op,old.op);
  if(o.op==='push') assert.equal(o.value,old.value);
}
const colored=blocks.reduce((n,b)=>n+b.area,0);
const report={result:'PASS',png_sha256:createHash('sha256').update(png).digest('hex'),
  width:w,height:h,executed_colored_blocks:blocks.length,total_colored_blocks:blocks.length,
  executed_colored_pixels:colored,total_colored_pixels:colored,colored_coverage_percent:100,
  original_computational_instructions_in_order:actual.length,
  core_by_region:meta.stats.core_by_region,push_block_areas:'all exact',
  note:'Coverage is obtained from the real npiet GEO trace; each touched colored block is flood-filled.'};
writeFileSync('layout-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(report);
