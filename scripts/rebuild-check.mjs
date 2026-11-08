import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
function pixels(file){const p=readFileSync(file),data=[];for(let i=8;i<p.length;){const n=p.readUInt32BE(i);if(p.toString('ascii',i+4,i+8)==='IDAT')data.push(p.subarray(i+8,i+8+n));i+=n+12;}return Buffer.concat([p.subarray(16,24),inflateSync(Buffer.concat(data))]);}
const files=['skyforge-orbit.png','skyforge-orbit-zoom.png','tracking/tracking.png','sgp4/epoch.png','sgp4/secular.png'];
const before=files.map(pixels);
for(const script of ['assemble.mjs','tracking/build.mjs','sgp4/build.mjs','sgp4/secular-build.mjs']){const p=spawnSync(process.execPath,[script],{stdio:'inherit'});assert.equal(p.status,0);}
files.forEach((f,i)=>assert.deepEqual(pixels(f),before[i],`Pixel drift in ${f}`));
console.log('PASS: all executable source pixels rebuild identically.');
