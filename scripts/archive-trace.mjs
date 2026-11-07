import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const [source,label]=process.argv.slice(2);
if(!source||!label||!/^[a-z0-9-]+$/.test(label))throw new Error('Usage: node scripts/archive-trace.mjs <source> <lowercase-label>');
const date=new Date().toISOString().slice(0,10),dir=`logs/${date}`;mkdirSync(dir,{recursive:true});
const data=readFileSync(source),target=`${dir}/${label}.trace.txt.gz`;
writeFileSync(target,gzipSync(data),{flag:'wx'});
writeFileSync(target+'.json',JSON.stringify({source,label,recorded_at:new Date().toISOString(),
  uncompressed_bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')},null,2)+'\n',{flag:'wx'});
console.log(target);
