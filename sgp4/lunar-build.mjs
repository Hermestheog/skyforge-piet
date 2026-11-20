import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Compiler,mul,gt,not,sel} from '../tracking/compiler.mjs';
import {render,png} from '../tracking/render.mjs';
import {lunarOrientation} from './lunar.mjs';
const c=new Compiler();c.set('valid',1);
for(const [name,lo,hi] of [['days',-36525,36525],['millis',0,86399999]]){
  c.input(name);c.set('ok',mul(not(gt(lo,name)),not(gt(name,hi))));
  c.set('valid',mul('valid','ok'));c.set(name,sel('ok',name,0));
}
const names=lunarOrientation(c,'days','millis');
c.output(not('valid'));names.forEach((name,i)=>c.output(mul('valid',name),i===names.length-1));
const error=new Compiler();[1,0,0,0,0,0,0].forEach((v,i)=>error.output(v,i===6));
const picture=render(c.ops,error.ops),bytes=png(picture);
writeFileSync('sgp4/lunar.png',bytes);
writeFileSync('sgp4/lunar.pietasm',c.ops.map((o,i)=>`${i}\t${o.op}${o.op==='push'?' '+o.value:''}\t# ${o.label}`).join('\n')+'\n');
writeFileSync('sgp4/lunar-instruction-map.json',JSON.stringify(picture.map)+'\n');
const metadata={width:picture.width,height:picture.height,core_instructions:c.ops.length,input_error_branches:picture.branches,
  png_sha256:createHash('sha256').update(bytes).digest('hex'),pixel_sha256:createHash('sha256').update(picture.pixels).digest('hex')};
writeFileSync('sgp4/lunar-build.json',JSON.stringify(metadata,null,2)+'\n');console.log(metadata);
