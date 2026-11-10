import assert from 'node:assert/strict';
import {existsSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
assert.ok(existsSync('sgp4/drag-ecc.png'),'Executable drag-coefficient PNG required');
function run(v){const p=spawnSync('npiet',['-q','-w','-uu','-cs','1','sgp4/drag-ecc.png'],{input:v.join('\n')+'\n',encoding:'utf8',timeout:10000});assert.ifError(p.error);assert.equal(p.status,0);assert.equal(p.stderr,'');assert.match(p.stdout.trim(),/^-?\d+(?:\s+-?\d+){4}$/);return p.stdout.trim().split(/\s+/).map(Number);}
const results=[];
for(const metres of [6600000,6800000,7000000,8000000])for(const ecc of [0,1000,20000])for(const inc of [0,63000,170000])for(const b of [-1000000,0,1000000])for(const arg of [0,45000,90000,180000,360000]){
  if(metres*(1-ecc/1e6)<6578135)continue;
  const n=Math.round(60*Math.sqrt(398600.8/(metres/1000)**3)*1e10),input=[metres,ecc,inc,n,b,arg];
  const a=metres/6378135,e=ecc/1e6,cos=Math.cos(inc*Math.PI/180000),tsi=1/(a-1-78000/6378135),eta=a*e*tsi;
  const psi=1-eta*eta,coef=(42000/6378135)**4*tsi**4/psi**3.5;
  const cc2=coef*n/1e10*(a*(1+1.5*eta*eta+e*eta*(4+eta*eta))+.375*.001082616*tsi/psi*(3*cos*cos-1)*(8+3*eta*eta*(8+eta*eta)));
  const cc4=2*n/1e10*coef*a*(1-e*e)*(eta*(2+.5*eta*eta)+e*(.5+2*eta*eta)-.001082616*tsi/(a*psi)*(-3*(3*cos*cos-1)*(1-2*e*eta+eta*eta*(1.5-.5*e*eta))+.75*(1-cos*cos)*(2*eta*eta-e*eta*(1+eta*eta))*Math.cos(2*arg*Math.PI/180000)));
  const cc5=2*coef*a*(1-e*e)*(1+2.75*(eta*eta+e*eta)+e*eta**3);
  const expected=[0,cc2*1e11,cc2*b/1e9*1e14,cc4*1e11,cc5*1e10],actual=run(input);
  assert.equal(actual[0],0);
  for(let j=1;j<5;j++)assert.ok(Math.abs(actual[j]-expected[j])<=5+Math.abs(expected[j])*1e-4,`${input}: field ${j}, got ${actual[j]}, expected ${expected[j]}`);
  results.push({input,actual,expected});
}
const base=[7000000,0,63000,650000000,1000,45000],invalid=[];
for(const [i,x] of [[0,6599999],[0,8000001],[1,-1],[1,20001],[2,-1],[2,170001],[3,399999999],[3,750000001],[4,-1000001],[4,1000001],[5,-1],[5,360001]]){const v=[...base];v[i]=x;invalid.push(v);}
invalid.push([6600000,20000,0,700000000,0,0]);
for(let i=0;i<6;i++){invalid.push(base.slice(0,i));const v=[...base];v[i]='bad';invalid.push(v);}
for(const v of invalid)assert.deepEqual(run(v),[1,0,0,0,0]);
writeFileSync('sgp4/drag-ecc-test-results.json',JSON.stringify({result:'PASS',valid:results.length,invalid:invalid.length,png_sha256:createHash('sha256').update(readFileSync('sgp4/drag-ecc.png')).digest('hex'),results},null,2)+'\n');
console.log(`PASS eccentricity drag coefficients: ${results.length} valid, ${invalid.length} invalid`);
