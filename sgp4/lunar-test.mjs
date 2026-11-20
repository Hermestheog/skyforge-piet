// Independent, test-only instrumented pinned dscom oracle; never executes runtime math for PNG.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
const DAY=86400000,Q=1e8,tolerance=5e-7;
const provenance=JSON.parse(readFileSync('vendor/sgp4-reference/provenance.json'));
for(const [file,meta] of Object.entries(provenance.files))
  assert.equal(createHash('sha256').update(readFileSync('vendor/sgp4-reference/'+file)).digest('hex'),meta.sha256);
const raw=readFileSync('vendor/sgp4-reference/sgp4.js','utf8');
const hook='zsingl = Math.sin(zx);';assert.equal(raw.split(hook).length,2,'unique instrumentation point');
const instrumented=raw.replace(hook,hook+' rec.lunarOrientation = [zcosil,zsinil,zcoshl,zsinhl,zcosgl,zsingl];');
const {SGP4,ElsetRec,TLE}=runInNewContext(instrumented+'\n({SGP4,ElsetRec,TLE})');
const engine=new SGP4();
function oracle(days,ms){const r=new ElsetRec();engine.dscom((2451544.5-2433281.5)+days+ms/DAY,.1,.2,0,.3,.4,.01,r);return Array.from(r.lunarOrientation);}
assert.ok(oracle(0,43200000).every(Number.isFinite));
const cases=[];const add=(name,day,ms)=>cases.push({name,input:[day,ms],expected:oracle(day,ms)});
for(const day of [-36525,-36524,-20000,-1,0,1,20000,36524,36525])
  for(const ms of [0,1,43199999,43200000,43200001,86399998,86399999])add('boundary',day,ms);
let seed=837261;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<128;i++)add('seeded '+i,Math.floor(random()*73051)-36525,Math.floor(random()*DAY));
for(let k=-50;k<=5;k++){
  const total=Math.round(((4.523602-k*Math.PI/2)/.00092422029-36524.5)*DAY);
  for(const shift of [-1,0,1]){const t=total+shift,day=Math.floor(t/DAY),ms=t-day*DAY;if(day>=-36525&&day<=36525)add('node quadrant',day,ms);}
}
const lines=readFileSync('vendor/sgp4-reference/SGP4-VER.TLE','utf8').split(/\r?\n/);let tleEpochs=0;
for(let i=0;i<lines.length;i++)if(lines[i].startsWith('1 ')){
 const tle=new TLE(lines[i],lines[++i].slice(0,69)),r=tle.rec;
 const total=Math.round((r.jdsatepoch-2451544.5)*DAY+r.jdsatepochF*DAY),day=Math.floor(total/DAY);
 if(String(tle.objectID)==='28129')assert.equal(total-day*DAY,49309462);
 add('TLE '+tle.objectID,day,total-day*DAY);tleEpochs++;
}
assert.ok(tleEpochs>=30);
const invalid=[[-36526,0],[36526,0],[0,-1],[0,DAY],[],['bad'],[0],[0,'bad']];
assert.ok(existsSync('sgp4/lunar.png'),'Executable lunar orientation PNG required');
const hash=()=>createHash('sha256').update(readFileSync('sgp4/lunar.png')).digest('hex'),sha=hash();
const run=input=>{const p=spawnSync(process.env.NPIET||'npiet',['-q','-w','-uu','-cs','1','sgp4/lunar.png'],{input:input.join('\n')+'\n',encoding:'utf8',timeout:30000,maxBuffer:1e6});
 if(p.error||p.status!==0||p.stderr||!/^\d+(?:\s+-?\d+){6}$/.test(p.stdout.trim())){mkdirSync('.work',{recursive:true});writeFileSync('.work/lunar-protocol-failure.json',JSON.stringify({input,...p,png_sha256:sha},null,2));}
 assert.ifError(p.error);assert.equal(p.status,0);assert.equal(p.stderr,'');assert.match(p.stdout.trim(),/^\d+(?:\s+-?\d+){6}$/);return p.stdout.trim().split(/\s+/).map(Number);};
const results=[],maxima=Array(6).fill(0);let maxResidual=0;
for(const c of cases){const actual=run(c.input),errors=actual.slice(1).map((v,i)=>Math.abs(v/Q-c.expected[i]));
 if(actual[0]!==0||errors.some(e=>e>tolerance)){mkdirSync('.work',{recursive:true});writeFileSync('.work/lunar-failure.json',JSON.stringify({...c,actual,errors,png_sha256:sha},null,2));}
 assert.equal(actual[0],0,c.name);errors.forEach((e,i)=>{assert.ok(e<=tolerance,c.name+' '+c.input+' field '+i+': '+e);maxima[i]=Math.max(maxima[i],e);});
 for(let i=1;i<7;i+=2){const residual=Math.abs((actual[i]/Q)**2+(actual[i+1]/Q)**2-1);assert.ok(residual<=2e-6);maxResidual=Math.max(maxResidual,residual);}
 results.push({...c,actual,errors});
}
for(const input of invalid)assert.deepEqual(run(input),[1,0,0,0,0,0,0]);
assert.equal(hash(),sha);
writeFileSync('sgp4/lunar-test-results.json',JSON.stringify({result:'PASS',valid:cases.length,invalid:invalid.length,total:cases.length+invalid.length,tle_epochs:tleEpochs,tolerance,max_errors:maxima,max_unit_circle_residual:maxResidual,png_sha256:sha,oracle:'Hash-verified pinned dscom with six local variables exposed in a test-only VM copy.',results,invalid_inputs:invalid},null,2)+'\n');
console.log('PASS lunar orientation:',cases.length,'valid,',invalid.length,'invalid; max errors',maxima,'max unit residual',maxResidual);
