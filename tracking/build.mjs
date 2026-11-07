import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {program} from './program.mjs';
import {Compiler} from './compiler.mjs';
import {render,png} from './render.mjs';
const ops=program(),error=new Compiler();for(let i=0;i<13;i++)error.output(i===0?1:0,i===12);
const picture=render(ops,error.ops),bytes=png(picture);
writeFileSync('tracking/tracking.png',bytes);
writeFileSync('tracking/program.pietasm',ops.map((o,i)=>`${i}\t${o.op}${o.op==='push'?' '+o.value:''}\t# ${o.label}`).join('\n')+'\n');
writeFileSync('tracking/instruction-map.json',JSON.stringify(picture.map)+'\n');
writeFileSync('tracking/registers.json',JSON.stringify(ops.registers)+'\n');
const metadata={width:picture.width,height:picture.height,core_instructions:ops.length,input_error_branches:picture.branches,
  rows:picture.rows,png_sha256:createHash('sha256').update(bytes).digest('hex'),pixel_sha256:createHash('sha256').update(picture.pixels).digest('hex')};
writeFileSync('tracking/build.json',JSON.stringify(metadata,null,2)+'\n');console.log(metadata);
