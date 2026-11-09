import assert from 'node:assert/strict';
import {existsSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
assert.ok(existsSync('sgp4/atmosphere.png'),'Executable atmosphere PNG required');
const heights=[0,97999,98000,98001,127200,155999,156000,156001,219999,220000,220001,377260,2000000];
for(let h=0;h<=2000000;h+=10000)heights.push(h);
function run(input){const p=spawnSync('npiet',['-q','-w','-uu','-cs','1','sgp4/atmosphere.png'],{input,encoding:'utf8',timeout:10000});
  assert.ifError(p.error);assert.equal(p.status,0);assert.equal(p.stderr,'');assert.match(p.stdout.trim(),/^\d+(?:\s+\d+){3}$/);return p.stdout.trim().split(/\s+/).map(Number);}
const results=[];
for(const h of heights){
  // Independent floating equations from pinned Vallado sgp4init atmosphere block.
  const s=h<98000?20000:h<156000?h-78000:78000;
  const expected=[0,h<220000?1:0,(1+s/6378135)*1e8,((120000-s)/6378135)**4*1e15];
  const actual=run(h+'\n'),errors=actual.map((x,i)=>Math.abs(x-expected[i]));
  assert.equal(actual[0],0);assert.equal(actual[1],expected[1]);
  assert.ok(errors[2]<1,`s4 ${h}: ${errors[2]}`);assert.ok(errors[3]<100,`qoms24 ${h}: ${errors[3]}`);
  results.push({perigee_m:h,actual,expected,errors});
}
for(const input of ['-1\n','2000001\n','','bad\n'])assert.deepEqual(run(input),[1,0,0,0]);
writeFileSync('sgp4/atmosphere-test-results.json',JSON.stringify({result:'PASS',valid:heights.length,invalid:4,results},null,2)+'\n');
console.log(`PASS atmosphere: ${heights.length} valid, 4 invalid`);
