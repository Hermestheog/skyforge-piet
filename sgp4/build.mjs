import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Compiler} from '../tracking/compiler.mjs';
import {render,png} from '../tracking/render.mjs';
import {program} from './program.mjs';
const ops=program(),error=new Compiler();for(let i=0;i<7;i++)error.output(i===0?1:0,i===6);
const picture=render(ops,error.ops),bytes=png(picture);
writeFileSync('sgp4/epoch.png',bytes);
writeFileSync('sgp4/program.pietasm',ops.map((o,i)=>`${i}\t${o.op}${o.op==='push'?' '+o.value:''}\t# ${o.label}`).join('\n')+'\n');
writeFileSync('sgp4/instruction-map.json',JSON.stringify(picture.map)+'\n');
writeFileSync('sgp4/registers.json',JSON.stringify(ops.registers)+'\n');
const metadata={width:picture.width,height:picture.height,core_instructions:ops.length,input_error_branches:picture.branches,
  rows:picture.rows,png_sha256:createHash('sha256').update(bytes).digest('hex'),pixel_sha256:createHash('sha256').update(picture.pixels).digest('hex')};
writeFileSync('sgp4/build.json',JSON.stringify(metadata,null,2)+'\n');console.log(metadata);
