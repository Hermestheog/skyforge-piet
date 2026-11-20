// Independent test oracle only. Runtime epoch arithmetic belongs to the PNG.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
const tolerance=5e-8,DAY=86400000,TAU=2*Math.PI;
const provenance=JSON.parse(readFileSync('vendor/sgp4-reference/provenance.json'));
for(const [file,meta] of Object.entries(provenance.files))
  assert.equal(createHash('sha256').update(readFileSync(`vendor/sgp4-reference/${file}`)).digest('hex'),meta.sha256);
const {SGP4,ElsetRec,TLE}=runInNewContext(readFileSync('vendor/sgp4-reference/sgp4.js','utf8')+'\n({SGP4,ElsetRec,TLE})');
const engine=new SGP4(),wrap=x=>((x%TAU)+TAU)%TAU;
function oracle(days,ms){
  const jd=2451544.5+days+ms/DAY,rec=new ElsetRec();
  engine.dscom(jd-2433281.5,0.1,0.2,0,0.3,0.4,0.01,rec);
  return [engine.gstime(jd),wrap(4.5236020-9.2422029e-4*rec.day),wrap(rec.gam),wrap(rec.zmos),wrap(rec.zmol)];
}
assert.ok(Math.abs(oracle(0,43200000)[0]-4.894961212823059)<1e-12,'J2000 noon GMST = 280.460618375 degrees');
const cases=[];function add(name,days,ms,extra={}){cases.push({name,input:[days,ms],expected:oracle(days,ms),...extra});}
for(const day of [-36525,-36524,-20000,-1,0,1,20000,36524,36525])
  for(const ms of [0,1,43199999,43200000,43200001,86399998,86399999])add('boundary',day,ms);
let seed=918273;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<96;i++)add(`seeded ${i}`,Math.floor(random()*73051)-36525,Math.floor(random()*DAY));
// Bracket GST's wrap within a day, then test the adjoining milliseconds.
for(const day of [-36525,-1,0,1,36525]){
  for(let h=1;h<=24;h++){
    let lo=(h-1)*3600000,hi=Math.min(h*3600000,DAY-1);
    if(oracle(day,hi)[0]>=oracle(day,lo)[0])continue;
    while(hi-lo>1){const m=Math.floor((lo+hi)/2);if(oracle(day,m)[0]>Math.PI)lo=m;else hi=m;}
    for(const ms of [lo-1,lo,hi,hi+1])if(ms>=0&&ms<DAY)add('GST wrap',day,ms);
  }
}
// Phase crossings selected from the reference's linear epoch arguments.
for(const [base,rate] of [[4.523602,-.00092422029],[5.8351514,.001944368],[6.2565837,.017201977],[-1.1151842,.228027132]])
  for(const k of [-1,0,1,10,100,1000]){
    const millis=Math.round(((k*TAU-base)/rate-36524.5)*DAY);
    for(const shift of [-1,0,1]){const total=millis+shift,day=Math.floor(total/DAY),ms=total-day*DAY;
      if(day>=-36525&&day<=36525)add('lunar/solar wrap',day,ms);}
  }
const lines=readFileSync('vendor/sgp4-reference/SGP4-VER.TLE','utf8').split(/\r?\n/);
let tleEpochs=0;
for(let i=0;i<lines.length;i++)if(lines[i].startsWith('1 ')){
  const tle=new TLE(lines[i],lines[++i].slice(0,69)),r=tle.rec;
  const original=r.jdsatepoch+r.jdsatepochF;
  const originalMillis=(r.jdsatepoch-2451544.5)*DAY+r.jdsatepochF*DAY,total=Math.round(originalMillis);
  const day=Math.floor(total/DAY),ms=total-day*DAY;
  if(String(tle.objectID)==='28129')assert.equal(ms,49309462,'TLE 28129 nearest millisecond');
  add(`TLE ${tle.objectID}`,day,ms,{original_jd:original,quantization_ms:total-originalMillis});tleEpochs++;
}
assert.ok(tleEpochs>=30);
const invalid=[[-36526,0],[36526,0],[0,-1],[0,DAY],[],['bad'],[0],[0,'bad']];
assert.ok(existsSync('sgp4/deep-time.png'),'Executable deep-space epoch PNG required');
const hash=()=>createHash('sha256').update(readFileSync('sgp4/deep-time.png')).digest('hex'),sha=hash();
function run(input){const p=spawnSync(process.env.NPIET||'npiet',['-q','-w','-uu','-cs','1','sgp4/deep-time.png'],
  {input:input.join('\n')+'\n',encoding:'utf8',timeout:30000,maxBuffer:1e6});
  if(p.error||p.status!==0||p.stderr||!/^\d+(?:\s+\d+){5}$/.test(p.stdout.trim())){
    mkdirSync('.work',{recursive:true});writeFileSync('.work/deep-time-protocol-failure.json',JSON.stringify({input,...p,png_sha256:sha},null,2));
  }
  assert.ifError(p.error);assert.equal(p.status,0);assert.equal(p.stderr,'');
  assert.match(p.stdout.trim(),/^\d+(?:\s+\d+){5}$/);return p.stdout.trim().split(/\s+/).map(Number);
}
const results=[],maxima=Array(5).fill(0);
for(const c of cases){const actual=run(c.input),errors=actual.slice(1).map((v,i)=>Math.abs(Math.atan2(Math.sin(v/1e8-c.expected[i]),Math.cos(v/1e8-c.expected[i]))));
  if(actual[0]!==0||errors.some(e=>e>tolerance)){
    mkdirSync('.work',{recursive:true});writeFileSync('.work/deep-time-failure.json',JSON.stringify({...c,actual,errors,png_sha256:sha},null,2));
  }
  assert.equal(actual[0],0,c.name);actual.slice(1).forEach(v=>assert.ok(v>=0&&v<TAU*1e8));
  errors.forEach((e,i)=>{assert.ok(e<=tolerance,`${c.name} ${c.input} field ${i}: ${e}`);maxima[i]=Math.max(maxima[i],e);});
  results.push({...c,actual,errors});
}
for(const input of invalid)assert.deepEqual(run(input),[1,0,0,0,0,0]);
// Compatibility probes document npiet input semantics, outside canonical input.
const parserProbes=[];
for(const [token,parsed] of [['4294967296',0],['-4294967296',0],['0bad',0],['1.5',1]]){
  const input=[0,token],actual=run(input);assert.deepEqual(actual,run([0,parsed]));
  parserProbes.push({input,parsed_millis:parsed,actual});
}
assert.equal(hash(),sha,'PNG must remain unchanged during validation');
writeFileSync('sgp4/deep-time-test-results.json',JSON.stringify({result:'PASS',valid:cases.length,invalid:invalid.length,total:cases.length+invalid.length,
  parser_compatibility:parserProbes,tle_epochs:tleEpochs,tolerance_rad:tolerance,max_errors_rad:maxima,png_sha256:sha,
  quantization_note:'TLE epochs are rounded to milliseconds first; reference values use the same encoded Julian day. This is phase-kernel validation, not deep-space state propagation.',results,invalid_inputs:invalid},null,2)+'\n');
console.log(`PASS deep-space epoch: ${cases.length} valid, ${invalid.length} invalid; ${tleEpochs} TLE epochs; max angular errors ${maxima.join(', ')}`);
