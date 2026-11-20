// TEST ONLY: full upstream SGP4 is an independent oracle, never a runtime service.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {spawnSync} from 'node:child_process';
const provenance=JSON.parse(readFileSync('vendor/sgp4-reference/provenance.json','utf8'));
for(const [file,meta] of Object.entries(provenance.files))assert.equal(
  createHash('sha256').update(readFileSync(`vendor/sgp4-reference/${file}`)).digest('hex'),meta.sha256);
const {TLE,SGP4,ElsetRec}=runInNewContext(readFileSync('vendor/sgp4-reference/sgp4.js','utf8')+'\n({TLE,SGP4,ElsetRec})');
const ids=[5,6251,22312,28057,28350,28872,29141,29238,88888],published=new Map();let id;
for(const line of readFileSync('vendor/sgp4-reference/tcppver.out','utf8').split(/\r?\n/)){
  if(/^\d+ xx/.test(line)){id=Number(line.split(' ')[0]);if(ids.includes(id))published.set(id,[]);}
  else if(published.has(id)){const values=line.trim().split(/\s+/).slice(0,7).map(Number);
    if(values.length===7&&values.every(Number.isFinite))published.get(id).push(values);}
}
const lines=readFileSync('vendor/sgp4-reference/SGP4-VER.TLE','utf8').split(/\r?\n/);
const elements=[],oracleChecks=[];
for(let i=0;i<lines.length;i++)if(lines[i].startsWith('1 ')){
  const l1=lines[i],l2=lines[++i],sat=Number(l2.slice(2,7));if(!ids.includes(sat))continue;
  const tle=new TLE(l1,l2.slice(0,69));
  for(const [time,...state] of published.get(sat)){
    const rv=tle.getRV(time);assert.equal(tle.sgp4Error,0,`published ${sat} @ ${time}`);
    const expected=state.map((x,j)=>x*(j<3?1000:1e6));
    const actual=[...rv[0].map(x=>x*1000),...rv[1].map(x=>x*1e6)];
    const errors=actual.map((x,j)=>Math.abs(x-expected[j]));
    errors.forEach((e,j)=>assert.ok(e<0.02,`Published oracle ${sat} @ ${time}, field ${j}, error ${e}`));
    oracleChecks.push({satellite:sat,time_minutes:time,errors});
  }
  elements.push({satellite:sat,input:[Math.round(Number(l2.slice(52,63))*1e8),Number(l2.slice(26,33)),
    ...[[8,16],[17,25],[34,42],[43,51]].map(([a,b])=>Math.round(Number(l2.slice(a,b))*1e4))]});
}
assert.deepEqual(elements.map(e=>e.satellite).sort((a,b)=>a-b),ids);
assert.equal(oracleChecks.filter(c=>c.time_minutes!==0).length,149,'All 149 published nonzero-time oracle rows required');
assert.equal(oracleChecks.filter(c=>c.time_minutes===0).length,9,'All nine published epoch oracle rows required');
function reference(input){
  const rec=new ElsetRec(),engine=new SGP4();
  Object.assign(rec,{jdsatepoch:2451545,jdsatepochF:0,bstar:0,ecco:input[1]/1e7,inclo:input[2]*Math.PI/1800000,
    nodeo:input[3]*Math.PI/1800000,argpo:input[4]*Math.PI/1800000,mo:input[5]*Math.PI/1800000,no_kozai:input[0]/1e8*2*Math.PI/1440});
  engine.sgp4init('a',rec);const r=[0,0,0],v=[0,0,0];engine.sgp4(rec,input[6]/60,r,v);
  assert.equal(rec.method,'n');return {error:rec.error,values:[...r.map(x=>x*1000),...v.map(x=>x*1e6)]};
}
const candidates=[];
for(const e of elements)for(const time of [-86400,-3600,0,3600,86400])candidates.push({name:`satellite ${e.satellite}, B*=0, t=${time}`,input:[...e.input,time,0]});
const boundaries=[
  [650000000,2500000,1700000,3600000,3600000,1800000],
  [1700000000,0,0,0,0,0], [1400000000,1,900000,0,900000,2700000],
  [1400000000,0,1700000,3600000,0,3600000],
  [1000000000,2500000,0,0,0,0], [1000000000,2500000,900000,1800000,1800000,1800000],
];
for(let i=0;i<boundaries.length;i++)for(const time of [-86400,-1,0,1,86400])candidates.push({name:`boundary ${i}, t=${time}`,input:[...boundaries[i],time,0]});
let seed=41891;function random(){seed=(1664525*seed+1013904223)>>>0;return seed/2**32;}
for(let i=0;i<24;i++)candidates.push({name:`seeded ${i}`,input:[Math.floor(650000000+random()*1050000001),Math.floor(random()*2500001),
  Math.floor(random()*1700001),...Array.from({length:3},()=>Math.floor(random()*3600001)),Math.floor(random()*172801)-86400,0]});
const cases=[],invalid=[];
for(const c of candidates){const ref=reference(c.input);if(ref.error===6)invalid.push({...c,reason:'inside Earth'});
  else {assert.equal(ref.error,0,c.name);cases.push({...c,expected:ref.values});}}
const base=[...elements[0].input,86400,0];
for(const [field,value] of [[0,649999999],[0,1700000001],[0,100000000],[0,0],[1,-1],[1,2500001],[2,-1],[2,1700001],
  [3,-1],[3,3600001],[4,-1],[4,3600001],[5,-1],[5,3600001],[6,-86401],[6,86401],[7,-1],[7,1],[7,2147483647]]){
  const input=[...base];input[field]=value;invalid.push({name:`invalid field ${field}=${value}`,input});
}
for(let i=0;i<8;i++){
  invalid.push({name:`EOF at ${i}`,input:base.slice(0,i)});
  const input=[...base];input[i]='unreadable';invalid.push({name:`unreadable at ${i}`,input});
}
assert.ok(existsSync('sgp4/secular.png'),'SGP4 zero-drag executable PNG must exist');
function execute(input,trace=false){
  const p=spawnSync(process.env.NPIET||'npiet',['-q','-w','-uu','-cs','1',...(trace?['-t']:[]),'sgp4/secular.png'],
    {input:input.join('\n')+'\n',encoding:'utf8',timeout:30000,maxBuffer:140e6});
  assert.ifError(p.error);assert.equal(p.status,0,p.stderr);assert.equal(p.stderr,'');
  if(trace)return p.stdout;
  assert.match(p.stdout.trim(),/^-?\d+(?:\s+-?\d+){6}$/);return p.stdout.trim().split(/\s+/).map(Number);
}
const results=[],maxima=Array(6).fill(0),sha=createHash('sha256').update(readFileSync('sgp4/secular.png')).digest('hex');
for(const c of cases){
  const actual=execute(c.input),errors=actual.slice(1).map((v,j)=>Math.abs(v-c.expected[j]));
  if(actual[0]!==0||errors.some(e=>e>20)){
    writeFileSync('sgp4/secular-failure.json',JSON.stringify({...c,actual,errors,png_sha256:sha},null,2)+'\n');
    writeFileSync('sgp4/secular-failure.trace.txt',execute(c.input,true));
  }
  assert.equal(actual[0],0,c.name);
  errors.forEach((e,j)=>{assert.ok(e<=20,`${c.name} field ${j}: got ${actual[j+1]}, expected ${c.expected[j]}, error ${e}`);maxima[j]=Math.max(maxima[j],e);});
  results.push({...c,actual,errors});
}
for(const c of invalid)assert.deepEqual(execute(c.input),[1,0,0,0,0,0,0],c.name);
writeFileSync('sgp4/secular-trace.txt',execute(base,true));
const report={result:'PASS',model:'near-Earth SGP4 with B*=0 only',valid_cases:cases.length,invalid_cases:invalid.length,total:cases.length+invalid.length,
  published_oracle_rows:oracleChecks.length,published_nonzero_oracle_rows:oracleChecks.filter(c=>c.time_minutes!==0).length,
  max_component_errors:maxima,tolerances:{position_m:20,velocity_mm_s:20},png_sha256:sha,results,invalid,oracleChecks};
writeFileSync('sgp4/secular-test-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`PASS SGP4 zero-drag: ${cases.length} valid, ${invalid.length} invalid; ${report.published_nonzero_oracle_rows} published nonzero rows independently verify oracle; max errors ${maxima.join(', ')}`);
