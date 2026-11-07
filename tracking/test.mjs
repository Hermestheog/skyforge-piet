import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {reference} from './reference.mjs';
assert.ok(existsSync('tracking/tracking.png'),'Executable tracking PNG must exist');
const base=[7000,0,0,0,0,0,0,0,0,0,0,1000000];
// Analytic equatorial zenith: r=(7000km,0,0), range=7000000-6378137.
const analytic=reference(base);
assert.deepEqual(analytic.slice(1,4),[7000000,0,0]);assert.equal(analytic[9],621863);
const cases=[{name:'equatorial zenith',input:base},
  {name:'circular quarter phase',input:[7000,0,0,0,0,90000,0,0,0,0,0,1e6]},
  {name:'equatorial nadir',input:[7000,0,0,0,0,180000,0,0,0,0,0,1e6]},
  {name:'polar north pole',input:[7000,0,90000,0,0,90000,0,0,90000,0,0,1e6]},
  {name:'GEO-like full day',input:[42164,0,0,80000,0,40000,86400,20000,18500,-72000,100,12e5]},
  {name:'eccentric perigee',input:[14000,500000,63000,120000,40000,0,0,70000,-34000,151000,0,10e6]},
  {name:'eccentric apogee',input:[14000,500000,63000,120000,40000,180000,0,70000,-34000,151000,0,10e6]},
  {name:'retrograde yesterday',input:[15000,400000,160000,359999,359999,359999,-86400,359999,-89999,-179999,10000,10e6]},
  {name:'minimum altitude',input:[6478,0,0,0,0,0,0,0,0,0,10000,0]},
  {name:'maximum semimajor axis',input:[50000,500000,180000,360000,360000,360000,86400,360000,-90000,180000,10000,10e6]},
];
let seed=348921;function random(){seed=(1664525*seed+1013904223)>>>0;return seed/2**32;}
for(let j=0;j<30;j++) {
  const e=Math.floor(random()*500001),a=Math.max(Math.ceil(6478/(1-e/1e6)),Math.floor(7000+random()*43000));
  cases.push({name:`sweep-${j}`,input:[a,e,Math.floor(random()*180001),Math.floor(random()*360000),
    Math.floor(random()*360000),Math.floor(random()*360000),Math.floor(random()*172801)-86400,
    Math.floor(random()*360000),Math.floor(random()*180001)-90000,Math.floor(random()*360001)-180000,
    Math.floor(random()*10001),Math.floor(random()*10000001)]});
}
function run(input, trace=false) {
  const p=spawnSync(process.env.NPIET||'npiet',['-q','-w','-uu','-cs','1',...(trace?['-t']:[]),'tracking/tracking.png'],
    {input:input.join('\n')+'\n',encoding:'utf8',timeout:30000,maxBuffer:100e6});
  assert.ifError(p.error);assert.equal(p.status,0,p.stderr);assert.equal(p.stderr,'');
  if(trace)return p.stdout;
  const words=p.stdout.trim().split(/\s+/);assert.equal(words.length,13,p.stdout);
  assert.ok(words.every(x=>/^-?\d+$/.test(x)),p.stdout);return words.map(Number);
}
const limits=[0,100,100,100,100,100,100,50,50,100,100,4,0];
const maxima=Array(13).fill(0),results=[];
for(const c of cases) {
  const actual=run(c.input),expected=reference(c.input);
  assert.equal(actual[0],0,c.name);
  const errors=actual.map((a,j)=>Math.abs(a-expected[j]));
  if(expected[7]===-1) assert.equal(actual[7],-1,c.name+' undefined azimuth');
  else errors[7]=Math.min(errors[7],Math.abs(errors[7]-360000));
  for(let j=1;j<12;j++) {assert.ok(errors[j]<=limits[j],`${c.name}: field ${j}, actual ${actual[j]}, reference ${expected[j]}, error ${errors[j]}`);maxima[j]=Math.max(maxima[j],errors[j]);}
  if(Math.abs(expected[8])>5) assert.equal(actual[12],expected[12],c.name+' horizon');
  results.push({...c,actual,reference:expected,errors});
}
const invalid=[];
for(const [index,value] of [[0,6477],[0,50001],[1,-1],[1,500001],[2,-1],[2,180001],[3,-1],[3,360001],
 [4,-1],[4,360001],[5,-1],[5,360001],[6,-86401],[6,86401],[7,-1],[7,360001],
 [8,-90001],[8,90001],[9,-180001],[9,180001],[10,-1],[10,10001],[11,-1],[11,10000001]]) {
  const v=[...base];v[index]=value;invalid.push(v);
}
invalid.push([7000,500000,...base.slice(2)]);
for(let n=0;n<12;n++)invalid.push(base.slice(0,n)); // Exercise every physical EOF branch.
for(const index of [0,5,11]){const v=[...base];v[index]='invalid';invalid.push(v);}
for(const v of invalid) assert.deepEqual(run(v),[1,...Array(12).fill(0)],`invalid ${v}`);
assert.ok(results.some(c=>c.reference[10]>0)&&results.some(c=>c.reference[10]<0),'Both approaching and receding cases are required');
const trace=run(cases[5].input,true);writeFileSync('tracking/trace.txt',trace);
let maxStack=0;
for(const m of trace.matchAll(/trace: stack \(\d+ values\): ([^\n]*)/g))for(const s of m[1].trim().split(/\s+/))if(s){const v=BigInt(s);assert.ok(v>=-(1n<<63n)&&v<(1n<<63n));maxStack=Math.max(maxStack,Number(v<0n?-v:v));}
const report={result:'PASS',valid_cases:cases.length,invalid_cases:invalid.length,total:cases.length+invalid.length,
  png_sha256:createHash('sha256').update(readFileSync('tracking/tracking.png')).digest('hex'),
  field_tolerances:limits,max_observed_errors:maxima,max_abs_stack_value_in_eccentric_trace:maxStack,cases:results};
writeFileSync('tracking/test-results.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,cases:undefined},null,2));
