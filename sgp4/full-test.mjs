// TEST ONLY: pinned independent SGP4; no production module imports.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {spawnSync} from 'node:child_process';
const tolerances={position_m:100,velocity_mm_s:100}; // Declared before executable exists.
assert.ok(!(process.env.FULL_CASE_FILTER||process.env.FULL_INVALID_ONLY==='1')||process.argv.includes('--diagnostic'),
  'Partial filters require explicit --diagnostic; npm test/CI must run the complete suite');
const provenance=JSON.parse(readFileSync('vendor/sgp4-reference/provenance.json','utf8'));
for(const [file,meta] of Object.entries(provenance.files))assert.equal(createHash('sha256').update(readFileSync(`vendor/sgp4-reference/${file}`)).digest('hex'),meta.sha256,file);
const {TLE,SGP4,ElsetRec}=runInNewContext(readFileSync('vendor/sgp4-reference/sgp4.js','utf8')+'\n({TLE,SGP4,ElsetRec})');
const ids=[5,6251,22312,28057,28350,28872,29141,29238,88888],published=new Map();let id;
for(const line of readFileSync('vendor/sgp4-reference/tcppver.out','utf8').split(/\r?\n/)){
  if(/^\d+ xx/.test(line)){id=Number(line.split(' ')[0]);if(ids.includes(id))published.set(id,[]);}
  else if(published.has(id)){const values=line.trim().split(/\s+/).slice(0,7).map(Number);if(values.length===7&&values.every(Number.isFinite))published.get(id).push(values);}
}
function reference(input){
  const rec=new ElsetRec(),engine=new SGP4();
  Object.assign(rec,{jdsatepoch:2451545,jdsatepochF:0,bstar:input[7]/1e9,ecco:input[1]/1e7,inclo:input[2]*Math.PI/1800000,nodeo:input[3]*Math.PI/1800000,argpo:input[4]*Math.PI/1800000,mo:input[5]*Math.PI/1800000,no_kozai:input[0]/1e8*2*Math.PI/1440});
  engine.sgp4init('a',rec);const branch=rec.isimp?'simple':'normal',perigee_km=rec.altp*rec.radiusearthkm;
  const r=[0,0,0],v=[0,0,0];engine.sgp4(rec,input[6]/60,r,v);assert.equal(rec.method,'n');
  return {error:rec.error,branch,perigee_km,values:[...r.map(x=>x*1000),...v.map(x=>x*1e6)]};
}
const cases=[],invalid=[],elements=[],oracleChecks=[],publishedExcluded=[],quantization=[];
function candidate(name,input,metadata={}){const ref=reference(input);if(ref.error)invalid.push({name,input,oracle_error:ref.error,...metadata});else cases.push({name,input,expected:ref.values,branch:ref.branch,perigee_km:ref.perigee_km,...metadata});}
const lines=readFileSync('vendor/sgp4-reference/SGP4-VER.TLE','utf8').split(/\r?\n/);
for(let i=0;i<lines.length;i++)if(lines[i].startsWith('1 ')){
  const l1=lines[i],l2=lines[++i],sat=Number(l2.slice(2,7));if(!ids.includes(sat))continue;
  const tle=new TLE(l1,l2.slice(0,69)),bstar=tle.bstar,encodedBstar=Math.round(bstar*1e9);
  const input=[Math.round(Number(l2.slice(52,63))*1e8),Number(l2.slice(26,33)),...[[8,16],[17,25],[34,42],[43,51]].map(([a,b])=>Math.round(Number(l2.slice(a,b))*1e4))];
  elements.push({satellite:sat,input,bstar,encodedBstar});
  for(const [minutes,...state] of published.get(sat)){
    const rv=tle.getRV(minutes);assert.equal(tle.sgp4Error,0,`published ${sat} @ ${minutes}`);
    const expected=state.map((x,j)=>x*(j<3?1000:1e6));
    const errors=[...rv[0].map(x=>x*1000),...rv[1].map(x=>x*1e6)].map((x,j)=>Math.abs(x-expected[j]));
    errors.forEach((e,j)=>assert.ok(e<0.02,`Published oracle ${sat} @ ${minutes}, field ${j}, error ${e}`));oracleChecks.push({satellite:sat,time_minutes:minutes,errors});
    const seconds=minutes*60;
    if(Math.abs(seconds)>86400){publishedExcluded.push({satellite:sat,time_minutes:minutes,reason:'outside +/-86400 second domain'});continue;}
    if(Math.abs(seconds-Math.round(seconds))>1e-7){publishedExcluded.push({satellite:sat,time_minutes:minutes,reason:'fractional seconds not representable; separate quantized-time oracle case'});candidate(`quantized published time ${sat} @ ${minutes}`,[...input,Math.round(seconds),encodedBstar],{source:'quantized-time oracle',satellite:sat,original_time_minutes:minutes});continue;}
    const encoded=[...input,Math.round(seconds),encodedBstar],ref=reference(encoded);assert.equal(ref.error,0);
    quantization.push({satellite:sat,time_minutes:minutes,original_bstar:bstar,encoded_bstar:encodedBstar/1e9,bstar_delta:encodedBstar/1e9-bstar,component_deltas:ref.values.map((x,j)=>x-expected[j])});
    cases.push({name:`published original B* ${sat} @ ${minutes}min`,input:encoded,expected,source:'published original B*',satellite:sat,original_bstar:bstar,branch:ref.branch,perigee_km:ref.perigee_km});
  }
}
assert.deepEqual(elements.map(e=>e.satellite).sort((a,b)=>a-b),ids);assert.equal(oracleChecks.length,158);assert.equal(oracleChecks.filter(c=>c.time_minutes!==0).length,149);
for(const e of elements)for(const time of [-86400,-3600,-1,0,1,3600,86400])for(const bstar of [0,e.encodedBstar,-e.encodedBstar])candidate(`satellite ${e.satellite}, B*=${bstar}, t=${time}`,[...e.input,time,bstar],{source:'oracle grid',satellite:e.satellite});
const boundaries=[
  [650000000,2500000,1700000,3600000,3600000,1800000],[1700000000,0,0,0,0,0],
  [1400000000,1,900000,0,900000,2700000],[1400000000,0,1700000,3600000,0,3600000],
  [1000000000,2500000,0,0,0,0],[1000000000,2500000,900000,1800000,1800000,1800000],
  ...[999,1000,1001].map(e=>[1550000000,e,450000,300000,650000,1200000]),
];
for(let i=0;i<boundaries.length;i++)for(const time of [-86400,0,86400])for(const bstar of [-100000,100000])candidate(`boundary ${i}, B*=${bstar}, t=${time}`,[...boundaries[i],time,bstar],{source:'boundary'});
for(const bstar of [-1000000000,-1,1,1000000000])for(const time of [-86400,0,86400])candidate(`B* endpoint ${bstar}, t=${time}`,[...elements[0].input,time,bstar],{source:'B* endpoint'});
let seed=41891;function random(){seed=(1664525*seed+1013904223)>>>0;return seed/2**32;}
for(let i=0;i<36;i++)candidate(`seeded ${i}`,[Math.floor(650000000+random()*1050000001),Math.floor(random()*2500001),Math.floor(random()*1700001),...Array.from({length:3},()=>Math.floor(random()*3600001)),Math.floor(random()*172801)-86400,Math.floor(random()*2000001)-1000000],{source:'seeded oracle'});
const base=[...elements[1].input,86400,elements[1].encodedBstar];
for(const [field,value] of [[0,649999999],[0,1700000001],[0,100000000],[0,0],[1,-1],[1,2500001],[2,-1],[2,1700001],[3,-1],[3,3600001],[4,-1],[4,3600001],[5,-1],[5,3600001],[6,-86401],[6,86401],[7,-1000000001],[7,1000000001]]){const input=[...base];input[field]=value;invalid.push({name:`invalid field ${field}=${value}`,input});}
for(let i=0;i<8;i++){invalid.push({name:`EOF at ${i}`,input:base.slice(0,i)});const input=[...base];input[i]='unreadable';invalid.push({name:`unreadable at ${i}`,input});}
// Preserve the initial independently specified campaign, then extend coverage.
assert.equal(cases.length,401,'Original valid cases must remain intact');
assert.equal(invalid.length,50,'Original invalid cases must remain intact');
for(const motion of [650000000,1700000000])for(const ecc of [0,2500000])
  for(const inclination of [0,1700000])for(const mean of [0,1800000])
    for(const bstar of [0,-1000000000,1000000000])for(const seconds of [0,-86400,86400]){
      const input=[motion,ecc,inclination,0,0,mean,seconds,bstar];
      candidate(`full domain corner ${input.join(',')}`,input,{source:'full domain corner'});
    }
// Exact inputs from the independent 200-case, full signed-B* stress campaign.
// Expected states/errors are always recomputed from the pinned oracle, never
// copied from production diagnostics. These include sub-Earth perigees whose
// state at the requested instant is valid and must not be rejected wholesale.
const stressRegressions=[
  [26,[1483546962,1200443,1602959,2254167,3315603,3373384,54194,-671279969]],
  [31,[1088102791,2252405,777354,2441415,1395666,1961104,74005,173861103]],
  [51,[1338642203,1216025,153579,2770419,769722,1051346,-84683,794018181]],
  [67,[1515134467,2370067,1656782,1815717,2643631,2570646,73809,-391682177]],
  [71,[1507155372,2483269,226780,164675,2905155,9590,44418,909767376]],
  [75,[1082175745,2451763,262627,137690,490948,3513844,-42744,-138207434]],
  [78,[1609656185,1569840,831341,3164642,1924556,1583532,81568,-23514377]],
  [98,[1524924656,2406089,1695880,2990894,2560927,334107,48280,-401269230]],
  [109,[1678962152,1841801,1321246,823919,1149123,254151,6289,480107555]],
  [124,[1134102099,2127566,1444131,1044361,1579239,2685467,-72299,-333978469]],
  [125,[1679521818,2381852,157617,657246,523264,3402649,-74271,-605384520]],
  [126,[1597275113,964029,507514,1449711,525183,1082589,-79650,291975571]],
  [147,[1208190723,1813633,61724,1848014,2854256,254348,65828,-490624635]],
  [184,[1272841905,1950544,976545,2735266,2304608,656426,63179,-314823935]],
  [96,[1657260766,889380,340614,2611786,1471459,2520494,-79886,-842737834]],
];
for(const [index,input] of stressRegressions)candidate(`full B* stress regression ${index}`,input,{source:'full B* stress regression'});
assert.equal(cases.length+invalid.length,610,'451 original + 144 corners + 15 stress regressions');
// Reviewer regression: polar inclination with maximum motion/eccentricity,
// observed at apogee. Interior inclination complements the endpoint grid.
for(const seconds of [0,-86400,86400])for(const bstar of [0,-1,1,-1000000000,1000000000]){
  const input=[1700000000,2500000,900000,0,0,1800000,seconds,bstar];
  candidate(`polar apogee regression t=${seconds}, B*=${bstar}`,input,{source:'polar apogee regression'});
}
assert.equal(cases.length+invalid.length,625,'610 retained + 15 polar apogee regressions');
// Independently located low-altitude range regressions: the normalized
// atmosphere coefficient exceeds int64 at scale 1e11 in the first family;
// the second has nonzero ae but |a-s| below the obsolete 1e-6 guard.
for(const [label,elements] of [
  ['coefficient range',[1698885868,0,0,0,0,1800000]],
  ['near-zero atmosphere distance',[1699125370,10000,0,0,0,1800000]],
])for(const seconds of [-1,1])for(const bstar of [-1,1])
  candidate(`${label} regression t=${seconds}, B*=${bstar}`,[...elements,seconds,bstar],{source:'low-altitude range regression'});
assert.equal(cases.length+invalid.length,633,'625 retained + 8 low-altitude range regressions');
candidate('unrepresentable circular atmosphere coefficient',
  [1695012290,0,900000,0,0,0,1,1],{source:'singular coefficient regression'});
assert.equal(cases.length+invalid.length,634,'633 retained + circular atmosphere overflow regression');
candidate('unrepresentable B* coefficient product',
  [1694972595,0,900000,0,0,0,1,1000000000],{source:'coefficient folding overflow regression'});
assert.equal(cases.length+invalid.length,635,'634 retained + coefficient folding overflow regression');
candidate('unrepresentable drag coefficient product',
  [1694972595,0,900000,0,0,0,1,10000000],{source:'drag product overflow regression'});
assert.equal(cases.length+invalid.length,636,'635 retained + drag product overflow regression');
for(const branch of ['normal','simple'])assert.ok(cases.some(c=>c.source==='published original B*'&&c.branch===branch&&c.input[6]!==0));
const preparation={tolerances,valid_cases:cases.length,invalid_cases:invalid.length,published_direct_cases:cases.filter(c=>c.source==='published original B*').length,oracleChecks,publishedExcluded,quantization,cases,invalid};
mkdirSync('.work',{recursive:true});
if(process.argv.includes('--prepare-only')){writeFileSync('.work/full-test-preparation.json',JSON.stringify(preparation,null,2)+'\n');console.log(`Prepared ${cases.length} valid and ${invalid.length} invalid cases; ${preparation.published_direct_cases} direct published states.`);process.exit(0);}
assert.ok(existsSync('sgp4/full.png'),'Full nonzero-B* SGP4 executable PNG must exist');
function execute(input){
  const p=spawnSync(process.env.NPIET||'npiet',['-q','-w','-uu','-cs','1','sgp4/full.png'],{input:input.join('\n')+'\n',encoding:'utf8',timeout:60000,maxBuffer:1e6});
  if(p.error||p.status!==0||p.stderr||! /^-?\d+(?:\s+-?\d+){6}$/.test(p.stdout.trim()))writeFileSync(`.work/full-protocol-failure-${Date.now()}.json`,JSON.stringify({input,stdout:p.stdout,stderr:p.stderr,status:p.status,error:p.error?.message,png_sha256:sha},null,2)+'\n');
  assert.ifError(p.error);assert.equal(p.status,0,p.stderr);assert.equal(p.stderr,'');assert.match(p.stdout.trim(),/^-?\d+(?:\s+-?\d+){6}$/,`input: ${JSON.stringify(input)}`);return p.stdout.trim().split(/\s+/).map(Number);
}
const results=[],invalidResults=[],maxima=Array(6).fill(0),sha=createHash('sha256').update(readFileSync('sgp4/full.png')).digest('hex');
const filter=process.env.FULL_CASE_FILTER,invalidOnly=process.env.FULL_INVALID_ONLY==='1',selected=invalidOnly?[]:filter?cases.filter(c=>c.name.includes(filter)):cases;assert.ok(invalidOnly||selected.length);
const failures=[],collect=process.env.FULL_COLLECT_FAILURES==='1';
function failure(c,actual,errors){const entry={...c,actual,errors,png_sha256:sha};failures.push(entry);writeFileSync('.work/full-failure.json',JSON.stringify(entry,null,2)+'\n');writeFileSync(`.work/full-failure-${Date.now()}-${failures.length}.json`,JSON.stringify(entry,null,2)+'\n');}
function runCase(c){try{return execute(c.input);}catch(error){if(!collect)throw error;failure(c,{execution_error:error.message});return null;}}
for(const c of selected){
  const actual=runCase(c);if(actual===null)continue;const errors=actual.slice(1).map((v,j)=>Math.abs(v-c.expected[j]));
  if(actual[0]!==0||errors.some((e,j)=>e>(j<3?tolerances.position_m:tolerances.velocity_mm_s))){failure(c,actual,errors);if(collect)continue;}
  assert.equal(actual[0],0,c.name);errors.forEach((e,j)=>{assert.ok(e<=(j<3?tolerances.position_m:tolerances.velocity_mm_s),`${c.name} field ${j}: got ${actual[j+1]}, expected ${c.expected[j]}, error ${e}`);maxima[j]=Math.max(maxima[j],e);});results.push({...c,actual,errors});
}
for(const c of filter?[]:invalid){const actual=runCase(c);if(actual===null)continue;if(actual.some((v,i)=>v!==(i===0?1:0))){failure(c,actual);if(collect)continue;}assert.deepEqual(actual,[1,0,0,0,0,0,0],c.name);invalidResults.push({...c,actual});}
if(failures.length){writeFileSync('.work/full-collected-failures.json',JSON.stringify(failures,null,2)+'\n');assert.fail(`${failures.length} full SGP4 cases failed; see .work/full-collected-failures.json`);}
assert.equal(createHash('sha256').update(readFileSync('sgp4/full.png')).digest('hex'),sha,'Executable must remain unchanged for the entire suite');
const report={result:filter||invalidOnly?'PARTIAL PASS':'PASS',model:'full near-Earth SGP4 with signed B*',valid_cases:results.length,invalid_cases:invalidResults.length,total:results.length+invalidResults.length,published_oracle_rows:oracleChecks.length,published_nonzero_oracle_rows:149,published_direct_cases:results.filter(c=>c.source==='published original B*').length,
  quantization_note:'Direct published comparisons use original source states at exactly representable whole seconds. B* is rounded to 1e-9; component deltas measure this input quantization plus published decimal rounding independently, without increasing tolerance. Fractional-second rows validate the oracle at original time and are separately recomputed for executable inputs.',
  max_component_errors:maxima,tolerances,png_sha256:sha,results,invalid:invalidResults,oracleChecks,publishedExcluded,quantization};
writeFileSync(filter||invalidOnly?'.work/full-filtered-results.json':'sgp4/full-test-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.result} full SGP4: ${results.length} valid, ${invalidResults.length} invalid; ${report.published_direct_cases} direct original-B* published states; max errors ${maxima.join(', ')}`);
