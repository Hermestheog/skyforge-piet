// Executable pixel-art layout. Every colored component is on the execution
// path. White resets let each instruction's destination be a geographic color.
import assert from 'node:assert/strict';

export function earthLayout(original, colors, deltas) {
  assert.deepEqual(original.slice(-2).map(o=>o.op), ['push','pointer']);
  // Only the old strip's final direction change is replaced. Its stack effect
  // was zero; the 597 arithmetic/I/O instructions remain in exactly this order.
  const core = original.slice(0,-2).map((o,i)=>({...o,core_index:i}));
  const continents = [
    [[-.88,-.40],[-.76,-.66],[-.48,-.84],[-.15,-.70],[-.22,-.48],[-.39,-.36],[-.40,-.14],[-.53,-.08],[-.62,-.28]],
    [[-.46,.01],[-.21,.10],[-.08,.28],[-.16,.48],[-.29,.76],[-.39,.85],[-.43,.53],[-.39,.29],[-.52,.15]],
    [[.23,-.29],[.48,-.37],[.61,-.19],[.75,-.05],[.62,.23],[.44,.57],[.30,.47],[.16,.12],[.14,-.08]],
    [[.21,-.46],[.26,-.68],[.52,-.82],[.80,-.61],[.95,-.24],[.74,-.13],[.57,-.38],[.41,-.32]],
    [[-.11,-.80],[.05,-.94],[.19,-.82],[.11,-.62],[-.02,-.55]],
    [[.68,.43],[.77,.49],[.72,.67],[.65,.58]],
  ];
  function inside(x,y,poly) {
    let yes=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
      const [xi,yi]=poly[i], [xj,yj]=poly[j];
      if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) yes=!yes;
    }
    return yes;
  }
  const rows=[];
  for(let gy=0;gy<41;gy++) {
    const cells=[];
    for(let gx=0;gx<56;gx++) {
      let region, color;
      const ex=(gx-28)/13.3, ey=(gy-22)/10.64;
      const globe=ex*ex+ey*ey;
      const orbit=Math.sqrt(((gx-28)/24)**2+((gy-22)/16)**2);
      if(Math.abs(orbit-1)<.035) { region='orbit'; color='c0ffff'; }
      if(globe<=1) {
        region='earth';
        const land=continents.some(p=>inside(ex,ey,p));
        color=land ? (ex>.55?'00c000':'00ff00') : (ex>.55?'0000c0':'0000ff');
        if(ey<-.89 || ey>.93) color='c0ffff';
      }
      const panels=((gx>=5&&gx<=8)||(gx>=12&&gx<=15))&&gy>=8&&gy<=11;
      const body=gx>=9&&gx<=11&&gy>=7&&gy<=12;
      const antenna=gx===10&&gy>=5&&gy<=6;
      if(panels||body||antenna) {
        region='satellite';
        color=panels?(gy%2?'0000c0':'c0c0ff'):body?(gx===10?'ffff00':'c0c000'):'c0ffff';
      }
      if(region) cells.push({gx,gy,region,color});
    }
    if(cells.length) rows.push(cells);
  }
  const count=rows.reduce((n,r)=>n+r.length,0);
  let extra=count-core.length;
  assert.ok(extra>=0 && extra!==1,`Need enough artwork cells: ${count}`);
  const pads=[];
  if(extra%2) { pads.push([{op:'push',value:1},{op:'not',value:1},{op:'pop',value:1}]); extra-=3; }
  while(extra>0) { pads.push([{op:'push',value:1},{op:'pop',value:1}]); extra-=2; }
  const scheduled = new Map();
  pads.forEach((p,i)=>scheduled.set(Math.floor((i+.5)*core.length/pads.length),p));
  const sequence=[];
  core.forEach((o,i)=>{ if(scheduled.has(i)) sequence.push(...scheduled.get(i)); sequence.push(o); });
  assert.equal(sequence.length,count);

  const pitchX=16,pitchY=20,bodyW=13,bodyH=14,margin=24;
  const width=56*pitchX+2*margin, height=rows.length*pitchY+50;
  const pixels=Buffer.alloc(width*height*3);
  const occupied=new Set();
  const put=(x,y,color,gate=false)=>{
    assert.ok(x>=0&&x<width&&y>=0&&y<height,`Outside: ${x},${y}`);
    const key=y*width+x;
    if(occupied.has(key)) {
      const old=pixels.subarray(key*3,key*3+3).toString('hex');
      assert.ok(old===color || (gate&&old==='ffffff'),`Collision ${x},${y}: ${old}/${color}`);
    }
    Buffer.from(color,'hex').copy(pixels,key*3); occupied.add(key);
  };
  const colorIndex=new Map(colors.flatMap((ls,h)=>ls.map((c,l)=>[c,[h,l]])));
  const map=[], tiles=[];
  const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
  function direction(a,b) {
    assert.ok(a[0]===b[0]||a[1]===b[1]);
    return a[0]<b[0]?0:a[1]<b[1]?1:a[0]>b[0]?2:3;
  }
  function route(points) {
    // First paint white connectors, then replace their corners with standard
    // push(quarterTurns); pointer gates. CC stays left throughout.
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],d=dirs[direction(a,b)];
      for(let x=a[0]+d[0],y=a[1]+d[1];x!==b[0]||y!==b[1];x+=d[0],y+=d[1]) put(x,y,'ffffff');
      if(i<points.length-1) put(...b,'ffffff');
    }
    for(let i=1;i<points.length-1;i++) {
      const p=points[i],from=direction(points[i-1],p),to=direction(p,points[i+1]);
      const turn=(to-from+4)%4,d=dirs[from];
      assert.ok(turn===1||turn===3);
      const incoming=Math.abs(p[0]-points[i-1][0])+Math.abs(p[1]-points[i-1][1]);
      assert.ok(incoming>=turn+3,'Turn gates need a separating white codel');
      for(let k=2;k<=turn+1;k++) put(p[0]-k*d[0],p[1]-k*d[1],'0000c0',true);
      put(p[0]-d[0],p[1]-d[1],'c0c0ff',true); // dark blue -> light blue: push
      put(...p,'ffff00',true); // light blue -> yellow: pointer
      map.push({op:'push',value:turn,role:'route',x:p[0]-2*d[0],y:p[1]-2*d[1],tx:p[0]-d[0],ty:p[1]-d[1]});
      map.push({op:'pointer',role:'route',x:p[0]-d[0],y:p[1]-d[1],tx:p[0],ty:p[1]});
    }
  }
  let index=0;
  const bands=rows.map((row,ri)=>{
    const right=ri%2===0;
    const ordered=right?row:[...row].reverse();
    const top=8+ri*pitchY, scan=top+(right?0:bodyH-1);
    const list=[];
    for(const c of ordered) {
      const o=sequence[index++],base=margin+c.gx*pitchX;
      const sx=base+(right?0:bodyW+1),sy=scan;
      const [th,tl]=colorIndex.get(c.color),[dh,dl]=deltas[o.op];
      const from=colors[(th-dh+6)%6][(tl-dl+3)%3];
      const area=o.op==='push'?o.value:1;
      for(let k=0;k<area;k++) put(sx,sy+(right?k:-k),from);
      for(let y=top;y<top+bodyH;y++) for(let x=base+1;x<=base+bodyW;x++) put(x,y,c.color);
      const tx=sx+(right?1:-1),ty=sy;
      const exit=[base+(right?bodyW:1),scan];
      const tile={...c,core_index:o.core_index,source:[sx,sy],destination:[tx,ty],exit,
        bounds:{x:base+1,y:top,width:bodyW,height:bodyH}};
      tiles.push(tile); list.push(tile);
      map.push({...o,role:o.core_index===undefined?'padding':'core',region:c.region,x:sx,y:sy,tx,ty,from,to:c.color});
    }
    for(let j=1;j<list.length;j++) route([list[j-1].exit,list[j].source]);
    return {right,top,scan,list,min:margin+row[0].gx*pitchX,max:margin+row.at(-1).gx*pitchX+bodyW+1};
  });
  put(0,0,'c0c0ff');
  route([[0,0],[8,0],[8,bands[0].scan],bands[0].list[0].source]);
  for(let i=1;i<bands.length;i++) {
    const a=bands[i-1],b=bands[i];
    const x=a.right?Math.max(a.max,b.max)+10:Math.min(a.min,b.min)-10;
    route([a.list.at(-1).exit,[x,a.scan],[x,b.scan],b.list[0].source]);
  }
  const last=bands.at(-1), x=last.right?last.max+10:last.min-10, y=last.scan+22;
  route([last.list.at(-1).exit,[x,last.scan],[x,y]]);
  for(let ty=y;ty<y+3;ty++) for(let tx=x-1;tx<=x+1;tx++) put(tx,ty,'c0ffff');
  return {width,height,pixels,map,tiles,halt:{x:x-1,y,width:3,height:3},
    stats:{original_computational_instructions:core.length,artwork_tiles:count,
      padding_instructions:count-core.length,routing_instructions:map.filter(m=>m.role==='route').length,
      core_by_region:Object.fromEntries(['earth','orbit','satellite'].map(r=>[r,map.filter(m=>m.role==='core'&&m.region===r).length]))}};
}
