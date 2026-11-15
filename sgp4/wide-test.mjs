// Interpreter regression: transport signed-64-bit values through actual Piet
// registers, with intervening stack movement and replacement.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Compiler,add} from '../tracking/compiler.mjs';
import {render,png} from '../tracking/render.mjs';
import {wideRegisters} from './wide-registers.mjs';
const values=[0n,1n,-1n,999999999n,-999999999n,1000000000n,-1000000000n,
  2147483647n,2147483648n,-2147483649n,1000000000000000000n,
  -1000000000000000000n,9223372036854775807n,-9223372036854775808n];
const c=new Compiler();c.input('seed');wideRegisters(c,['value']);
for(const value of values){
  c.set('value',value);c.set('intervening',17);
  c.output('value');c.set('value',add('value',0));c.output('value',true);
}
mkdirSync('.work',{recursive:true});
writeFileSync('.work/wide-register-test.png',png(render(c.ops,[])));
const p=spawnSync(process.env.NPIET||'npiet',['-q','-w','-uu','-cs','1','.work/wide-register-test.png'],
  {input:'0\n',encoding:'utf8',timeout:60000,maxBuffer:1e6});
assert.ifError(p.error);assert.equal(p.status,0);assert.equal(p.stderr,'');
assert.deepEqual(p.stdout.trim().split(/\s+/),values.flatMap(v=>[String(v),String(v)]));
console.log(`PASS: ${values.length} signed-64-bit values survive Piet register transport and replacement.`);
