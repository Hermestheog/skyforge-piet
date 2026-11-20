// Test diagnostics only. Does not implement runtime orbital arithmetic.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
const pairs=[['zcosil','zsinil'],['zcoshl','zsinhl'],['zcosgl','zsingl']];
export function checkLunarUnitCircles(context,actual,file='.work/lunar-failure.json'){
 let maximum=0;
 for(let pair=0;pair<pairs.length;pair++){
  const i=1+2*pair,residual=Math.abs((actual[i]/1e8)**2+(actual[i+1]/1e8)**2-1),tolerance=2e-6;
  if(!(residual<=tolerance)){
   mkdirSync(dirname(file),{recursive:true});
   writeFileSync(file,JSON.stringify({...context,actual,failure:'unit-circle',pair_index:pair,fields:pairs[pair],residual,tolerance},null,2)+'\n');
  }
  assert.ok(residual<=tolerance,context.name+' input '+context.input+' pair '+pair+' ('+pairs[pair].join(',')+') residual '+residual+' exceeds '+tolerance);
  maximum=Math.max(maximum,residual);
 }
 return maximum;
}
