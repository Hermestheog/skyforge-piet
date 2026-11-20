// Failure-path tests only; synthetic packets never serve as orbital acceptance.
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {checkLunarUnitCircles} from './lunar-diagnostics.mjs';
const dir=mkdtempSync(join(tmpdir(),'piet-lunar-diagnostics-'));
try {
 const file=join(dir,'nested','failure.json');
 const context={name:'synthetic unit-circle failure',input:[-36525,43200000],expected:[1,0,1,0,1,0],errors:[0,0,0,0,0,0],png_sha256:'synthetic-test-hash'};
 assert.equal(checkLunarUnitCircles(context,[0,100000000,0,100000000,0,100000000,0],file),0);
 assert.equal(existsSync(file),false,'successful checks do not create failure packets');
 for(let pair=0;pair<3;pair++){
  const actual=[0,100000000,0,100000000,0,100000000,0];actual[2+2*pair]=100000000;
  assert.throws(()=>checkLunarUnitCircles(context,actual,file),e=>e.code==='ERR_ASSERTION'&&e.message.includes('-36525,43200000')&&e.message.includes('pair '+pair)&&e.message.includes('residual 1'));
  const packet=JSON.parse(readFileSync(file));
  assert.deepEqual(packet,{...context,actual,failure:'unit-circle',pair_index:pair,fields:[['zcosil','zsinil'],['zcoshl','zsinhl'],['zcosgl','zsingl']][pair],residual:1,tolerance:2e-6});
 }
 console.log('PASS lunar diagnostics: valid packet and all three failing pairs preserve complete context.');
} finally {assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(dir.includes('piet-lunar-diagnostics-'));rmSync(dir,{recursive:true,force:true});}
