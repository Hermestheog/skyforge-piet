// Runs sequentially and preserves stdout/stderr even on a failed test.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir=`logs/runs/${new Date().toISOString().replace(/[:.]/g,'-')}`;
mkdirSync(dir,{recursive:true});const results=[];
for(const script of ['test.mjs','equivalence.mjs','verify-layout.mjs','tracking/test.mjs','sgp4/test.mjs','sgp4/secular-test.mjs','sgp4/atmosphere-test.mjs']){
  const start=Date.now(),p=spawnSync(process.execPath,[script],{encoding:'utf8',maxBuffer:10e6});
  const log=`${script.replaceAll('/','-')}.log`;
  const output=(p.stdout||'')+(p.stderr||'')+(p.error?String(p.error):'');
  writeFileSync(`${dir}/${log}`,output);process.stdout.write(output);
  results.push({script,exit_code:p.status,elapsed_ms:Date.now()-start,log});
  writeFileSync(`${dir}/manifest.json`,JSON.stringify({results},null,2)+'\n');
  if(p.status!==0||p.error){console.error(`Preserved failed run: ${dir}`);process.exit(1);}
}
console.log(`All suites passed. Logs preserved: ${dir}`);
