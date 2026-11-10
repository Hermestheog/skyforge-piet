// Standalone bounded cc2/cc1 kernel. Runtime arithmetic is emitted Piet only.
import {writeFileSync} from 'node:fs';
import {Compiler,add,sub,mul,div,gt,not,sel} from '../tracking/compiler.mjs';
import {Q,fx,sincos,radians,sqrt} from '../tracking/math.mjs';
import {render,png} from '../tracking/render.mjs';
const c=new Compiler(),set=(n,e)=>c.set(n,e),fq=(a,b)=>div(mul(a,Q),b);
const fields=[['metres',6600000,8000000,7000000],['ecc',0,20000,0],['inc',0,170000,0],['nH',400000000,750000000,650000000],['bstar',-1000000,1000000,0]];
set('valid',1);
for(const [n,lo,hi,d] of fields){c.input(n);set('ok',mul(not(gt(lo,n)),not(gt(n,hi))));set('valid',mul('valid','ok'));set(n,sel('ok',n,d));}
set('valid',mul('valid',not(gt(6578135000000n,mul('metres',sub(1000000,'ecc'))))));
for(const [n,,,d] of fields)set(n,sel('valid',n,d));
set('a',div(mul('metres',Q),6378135));set('e',mul('ecc',100));
set('d',sub('a',add(Q,div(mul(78000,Q),6378135))));
set('eta',fq(fx('a','e'),'d'));set('eta2',fx('eta','eta'));set('eeta',fx('e','eta'));set('psi',sub(Q,'eta2'));
sqrt(c,'root',mul('psi',Q));
set('psi35',fx(fx(fx('psi','psi'),'psi'),'root'));
// Cancel Earth-radius factors before the fourth power to avoid tiny qoms24.
set('ratio',div(42000000000000n,sub('metres',6456135)));
set('square',div(mul('ratio','ratio'),1000000000));
set('coef',fq(div(mul('square','square'),10000000),'psi35')); // scale 1e11
set('base',div(mul('coef','nH'),10000000000)); // scale 1e11
sincos(c,'i',radians('inc'));set('con41',sub(mul(3,fx('ic','ic')),Q));
set('first',fx('a',add(Q,div(mul(3,'eta2'),2),fx('eeta',add(4*Q,'eta2')))));
set('second',fx(fx(div(mul(3,fq(108262,'d')),8),fq('con41','psi')),add(8*Q,mul(3,fx('eta2',add(8*Q,'eta2'))))));
set('cc2',fx('base',add('first','second')));
c.output(not('valid'));c.output(mul('valid','cc2'));c.output(mul('valid',div(mul('cc2','bstar'),1000000)),true);
const error=new Compiler();[1,0,0].forEach((v,i)=>error.output(v,i===2));
const picture=render(c.ops,error.ops);writeFileSync('sgp4/drag.png',png(picture));
writeFileSync('sgp4/drag.pietasm',c.ops.map(o=>`${o.op} ${o.value} # ${o.label}`).join('\n')+'\n');
console.log(`Drag PNG: ${picture.width}x${picture.height}, ${c.ops.length} instructions`);
