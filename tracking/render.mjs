// Compact standard-Piet renderer. The input guards are actual pointer branches
// to error-printing/halting paths; the main program snakes through dense rows.
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
export const deltas={push:[0,1],pop:[0,2],add:[1,0],subtract:[1,1],multiply:[1,2],divide:[2,0],mod:[2,1],not:[2,2],greater:[3,0],pointer:[3,1],duplicate:[4,0],roll:[4,1],in_number:[4,2],out_number:[5,1],out_char:[5,2],guard_input:[3,1]};
const colors=[['ffc0c0','ff0000','c00000'],['ffffc0','ffff00','c0c000'],['c0ffc0','00ff00','00c000'],['c0ffff','00ffff','00c0c0'],['c0c0ff','0000ff','0000c0'],['ffc0ff','ff00ff','c000c0']];
const size=o=>o.op==='push'?o.value:1;
export function render(ops,errorOps){
  const split=ops.findLastIndex(o=>o.op==='guard_input')+1;
  const prefix=ops.slice(0,split),body=ops.slice(split);
  const prefixSize=prefix.reduce((n,o)=>n+(o.op==='guard_input'?14:size(o)),0);
  const width=prefixSize+40,capacity=width-50,rows=[];
  let row=[],used=0;
  for(const op of body){if(used+size(op)>capacity){rows.push(row);row=[];used=0;}row.push(op);used+=size(op);}
  if(row.length)rows.push(row);
  const bodyY=errorOps.length+50,height=bodyY+rows.length*8+40;
  const pixels=Buffer.alloc(width*height*3),occupied=new Set();
  function put(x,y,color,gate=false){assert.ok(x>=0&&x<width&&y>=0&&y<height,`${x},${y} out`);
    const key=y*width+x;if(occupied.has(key)){const old=pixels.subarray(key*3,key*3+3).toString('hex');assert.ok(old===color||gate&&old==='ffffff',`Overlap ${x},${y}`);}
    Buffer.from(color,'hex').copy(pixels,key*3);occupied.add(key);
  }
  const dirs=[[1,0],[0,1],[-1,0],[0,-1]],dir=(a,b)=>a[0]<b[0]?0:a[1]<b[1]?1:a[0]>b[0]?2:3;
  function route(points){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=dirs[dir(a,b)];assert.ok(a[0]===b[0]||a[1]===b[1]);
    for(let x=a[0]+d[0],y=a[1]+d[1];x!==b[0]||y!==b[1];x+=d[0],y+=d[1])put(x,y,'ffffff');if(i<points.length-1)put(...b,'ffffff');}
    for(let i=1;i<points.length-1;i++){const p=points[i],from=dir(points[i-1],p),to=dir(p,points[i+1]),t=(to-from+4)%4,d=dirs[from];assert.ok(t===1||t===3);
      assert.ok(Math.abs(p[0]-points[i-1][0])+Math.abs(p[1]-points[i-1][1])>=t+3);
      for(let k=2;k<=t+1;k++)put(p[0]-k*d[0],p[1]-k*d[1],'0000c0',true);
      put(p[0]-d[0],p[1]-d[1],'c0c0ff',true);put(...p,'ffff00',true);
    }
  }
  function trap(x,y){for(let j=0;j<3;j++)for(let k=-1;k<=1;k++)put(x+k,y+j,'c0ffff');}
  function error(x){for(let y=1;y<20;y++)put(x,y,'ffffff');let h=0,l=0,y=20;
    for(const o of errorOps){for(let k=0;k<size(o);k++)put(x-k,y,colors[h][l]);const [dh,dl]=deltas[o.op];h=(h+dh)%6;l=(l+dl)%3;y++;}
    put(x,y,colors[h][l]);put(x,y+1,'ffffff');trap(x,y+2);
  }
  let x=0,h=0,l=0;const map=[];
  for(let i=0;i<prefix.length;i++){const o=prefix[i];map.push({index:i,x,y:0,op:o.op,label:o.label});
    for(let k=0;k<size(o);k++)put(x+k,0,colors[h][l]);const [dh,dl]=deltas[o.op];h=(h+dh)%6;l=(l+dl)%3;
    if(o.op==='guard_input'){put(x+1,0,colors[h][l]);error(x+1);for(let k=2;k<14;k++)put(x+k,0,'ffffff');x+=14;h=0;l=0;}else x+=size(o);
  }
  put(x,0,colors[h][l]);
  const bands=[];let index=split;
  rows.forEach((r,ri)=>{const left=ri%2===0,d=left?-1:1,y=bodyY+ri*8;let px=left?width-25:25,h=0,l=0;const start=[px,y];
    for(const o of r){map.push({index:index++,x:px,y,op:o.op,label:o.label});for(let k=0;k<size(o);k++)put(px+k*d,y,colors[h][l]);px+=size(o)*d;const [dh,dl]=deltas[o.op];h=(h+dh)%6;l=(l+dl)%3;}
    put(px,y,colors[h][l]);bands.push({start,end:[px,y],left});
  });
  route([[x,0],[width-8,0],[width-8,bodyY],bands[0].start]);
  for(let i=1;i<bands.length;i++){const a=bands[i-1],b=bands[i],rx=a.left?8:width-8;route([a.end,[rx,a.end[1]],[rx,b.start[1]],b.start]);}
  const last=bands.at(-1),rx=last.left?8:width-8,ty=last.end[1]+20;
  route([last.end,[rx,last.end[1]],[rx,ty]]);trap(rx,ty);
  return {width,height,pixels,map,branches:prefix.filter(o=>o.op==='guard_input').length,rows:rows.length};
}
function crc32(b){let c=0xffffffff;for(const x of b){c^=x;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(t,d){const body=Buffer.concat([Buffer.from(t),d]),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(d.length);c.writeUInt32BE(crc32(body));return Buffer.concat([n,body,c]);}
export function png({width:w,height:h,pixels}){const ih=Buffer.alloc(13);ih.writeUInt32BE(w);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;
  const data=Buffer.alloc(h*(w*3+1));for(let y=0;y<h;y++)pixels.copy(data,y*(w*3+1)+1,y*w*3,(y+1)*w*3);
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ih),chunk('IDAT',deflateSync(data)),chunk('IEND',Buffer.alloc(0))]);}
