// Assemble SGP4 atmosphere initialization; all input-dependent math is Piet.
import {writeFileSync} from 'node:fs';
import {Compiler,add,sub,mul,div,gt,not,sel} from '../tracking/compiler.mjs';
import {render,png} from '../tracking/render.mjs';
const c=new Compiler();c.input('perigee');
c.set('valid',mul(not(gt(0,'perigee')),not(gt('perigee',2000000))));
c.set('h',sel('valid','perigee',200000));
c.set('simple',gt(220000,'h'));
c.set('s',sel(gt(98000,'h'),20000,sel(gt(156000,'h'),sub('h',78000),78000)));
c.set('s4',add(100000000,div(mul('s',100000000),6378135)));
c.set('ratio',div(mul(sub(120000,'s'),10000000000),6378135));
c.set('square',div(mul('ratio','ratio'),10000000000));
c.set('q',div(mul('square','square'),100000));
c.output(not('valid'));c.output(mul('valid','simple'));c.output(mul('valid','s4'));c.output(mul('valid','q'),true);
const error=new Compiler();[1,0,0,0].forEach((v,i)=>error.output(v,i===3));
const picture=render(c.ops,error.ops);
writeFileSync('sgp4/atmosphere.png',png(picture));
writeFileSync('sgp4/atmosphere.pietasm',c.ops.map(o=>`${o.op} ${o.value} # ${o.label}`).join('\n')+'\n');
console.log(`Atmosphere PNG: ${picture.width}x${picture.height}, ${c.ops.length} instructions`);
