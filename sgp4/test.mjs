// Independent oracles are TEST ONLY. Neither assembler nor PNG loads this file.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {spawnSync} from 'node:child_process';
const provenance=JSON.parse(readFileSync('vendor/sgp4-reference/provenance.json','utf8'));
for(const [file,meta] of Object.entries(provenance.files))assert.equal(
  createHash('sha256').update(readFileSync(`vendor/sgp4-reference/${file}`)).digest('hex'),meta.sha256,`upstream bytes changed: ${file}`);
const upstream=readFileSync('vendor/sgp4-reference/sgp4.js','utf8');
const {TLE,SGP4,ElsetRec}=runInNewContext(upstream+'\n({TLE,SGP4,ElsetRec})');
const vectors=new Map();let id;
for(const line of readFileSync('vendor/sgp4-reference/tcppver.out','utf8').split(/\r?\n/)){
  if(/^\d+ xx/.test(line))id=Number(line.split(' ')[0]);
  else {const values=line.trim().split(/\s+/).map(Number);if(values.length>=7&&values[0]===0&&!vectors.has(id))vectors.set(id,values.slice(1,7));}
}
const cases=[],tleLines=readFileSync('vendor/sgp4-reference/SGP4-VER.TLE','utf8').split(/\r?\n/);
function supported(v){return v[0]>=650000000&&v[0]<=1700000000&&v[1]>=0&&v[1]<=2500000&&v[2]>=0&&v[2]<=1700000&&v.slice(3).every(x=>x>=0&&x<=3600000);}
function upstreamResult(input){
  const rec=new ElsetRec(),engine=new SGP4();
  Object.assign(rec,{jdsatepoch:2451545,jdsatepochF:0,ecco:input[1]/1e7,inclo:input[2]*Math.PI/1800000,
    nodeo:input[3]*Math.PI/1800000,argpo:input[4]*Math.PI/1800000,mo:input[5]*Math.PI/1800000,no_kozai:input[0]/1e8*2*Math.PI/1440});
  engine.sgp4init('a',rec);const r=[0,0,0],v=[0,0,0];engine.sgp4(rec,0,r,v);
  return {error:rec.error,method:rec.method,values:[...r.map(x=>x*1000),...v.map(x=>x*1e6)]};
}
for(let i=0;i<tleLines.length;i++)if(tleLines[i].startsWith('1 ')){
  const l1=tleLines[i],l2=tleLines[++i],sat=Number(l2.slice(2,7));
  const input=[Math.round(Number(l2.slice(52,63))*1e8),Number(l2.slice(26,33)),
    ...[[8,16],[17,25],[34,42],[43,51]].map(([a,b])=>Math.round(Number(l2.slice(a,b))*1e4))];
  if(!supported(input)||!vectors.has(sat))continue;
  const expected=vectors.get(sat).map((x,j)=>x*(j<3?1000:1e6));
  const tle=new TLE(l1,l2.slice(0,69)),rv=tle.getRV(0);
  assert.equal(tle.sgp4Error,0,`upstream fixture ${sat}`);
  const independent=[...rv[0].map(x=>x*1000),...rv[1].map(x=>x*1e6)];
  independent.forEach((x,j)=>assert.ok(Math.abs(x-expected[j])<0.002,`pinned oracle disagrees with published satellite ${sat}`));
  cases.push({name:`Vallado ${sat}`,input,expected,source:'published tcppver.out epoch'});
}
assert.deepEqual(cases.map(c=>Number(c.name.slice('Vallado '.length))).sort((a,b)=>a-b),
  [5,6251,22312,28057,28350,28872,29141,29238,88888],'All nine published near-Earth fixtures required');
const boundaryInputs=[
  [650000000,2500000,1700000,3600000,3600000,1800000],
  [1700000000,0,0,0,0,0], [1400000000,1,900000,0,900000,2700000],
  [1400000000,0,1700000,3600000,0,3600000],
  [1000000000,2500000,0,0,0,0], [1000000000,2500000,900000,1800000,1800000,1800000],
];
let seed=737,random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<40;i++)boundaryInputs.push([Math.floor(650000000+random()*1050000001),Math.floor(random()*2500001),
  Math.floor(random()*1700001),...Array.from({length:3},()=>Math.floor(random()*3600001))]);
const invalid=[];
boundaryInputs.forEach((input,i)=>{const ref=upstreamResult(input);assert.equal(ref.method,'n');
  if(ref.error===6)invalid.push({name:`epoch inside Earth ${i}`,input});
  else {assert.equal(ref.error,0);cases.push({name:`boundary/sweep ${i}`,input,expected:ref.values,source:'pinned upstream SGP4'});}
});
const base=cases[0].input;
for(const [field,value] of [[0,649999999],[0,1700000001],[0,100000000],[0,0],[0,-1],[1,-1],[1,2500001],[2,-1],[2,1700001],
  [3,-1],[3,3600001],[4,-1],[4,3600001],[5,-1],[5,3600001]]){
  const input=[...base];input[field]=value;invalid.push({name:`invalid field ${field}=${value}`,input});
}
for(let i=0;i<6;i++){
  invalid.push({name:`EOF at ${i}`,input:base.slice(0,i)});
  const input=[...base];input[i]='unreadable';invalid.push({name:`unreadable at ${i}`,input});
}
// This assertion is the initial red test: no host-language runtime substitute.
assert.ok(existsSync('sgp4/epoch.png'),'SGP4 epoch executable PNG must exist');
function execute(input,trace=false){
  const p=spawnSync(process.env.NPIET||'npiet',['-q','-w','-uu','-cs','1',...(trace?['-t']:[]),'sgp4/epoch.png'],
    {input:input.join('\n')+'\n',encoding:'utf8',timeout:30000,maxBuffer:120e6});
  assert.ifError(p.error);assert.equal(p.status,0,p.stderr);assert.equal(p.stderr,'');
  if(trace)return p.stdout;
  assert.match(p.stdout.trim(),/^-?\d+(?:\s+-?\d+){6}$/);return p.stdout.trim().split(/\s+/).map(Number);
}
const results=[],maxima=Array(6).fill(0);
for(const c of cases){
  const actual=execute(c.input);assert.equal(actual[0],0,c.name);
  const errors=actual.slice(1).map((v,j)=>Math.abs(v-c.expected[j]));
  errors.forEach((e,j)=>{assert.ok(e<=20,`${c.name} field ${j}: got ${actual[j+1]}, expected ${c.expected[j]}, error ${e}`);maxima[j]=Math.max(maxima[j],e);});
  results.push({...c,actual,errors});
}
for(const c of invalid)assert.deepEqual(execute(c.input),[1,0,0,0,0,0,0],c.name);
writeFileSync('sgp4/trace.txt',execute(base,true));
const report={result:'PASS',published_cases:cases.filter(c=>c.source.startsWith('published')).length,
  valid_cases:cases.length,invalid_cases:invalid.length,total:cases.length+invalid.length,
  max_component_errors:maxima,tolerances:{position_m:20,velocity_mm_s:20},
  png_sha256:createHash('sha256').update(readFileSync('sgp4/epoch.png')).digest('hex'),results,invalid};
writeFileSync('sgp4/test-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`PASS SGP4 epoch: ${report.published_cases} published, ${cases.length} total valid, ${invalid.length} invalid; max errors ${maxima.join(', ')}`);
