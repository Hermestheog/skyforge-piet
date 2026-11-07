// Independent FLOATING-POINT TEST ORACLE. Never used by the PNG or assembler.
export function reference(v) {
  const [a,e0,i0,o0,w0,m0,t,theta0,lat0,lon0,h,carrier]=v,f=carrier*1000;
  const rad=d=>d*Math.PI/180000,e=e0/1e6,i=rad(i0),o=rad(o0),w=rad(w0);
  const n=Math.sqrt(398600/a**3),M=rad(m0)+n*t;
  let E=M;for(let j=0;j<30;j++) E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
  const root=Math.sqrt(1-e*e),den=1-e*Math.cos(E),A=a*1000;
  const p=[Math.cos(o)*Math.cos(w)-Math.sin(o)*Math.sin(w)*Math.cos(i),
    Math.sin(o)*Math.cos(w)+Math.cos(o)*Math.sin(w)*Math.cos(i),Math.sin(w)*Math.sin(i)];
  const q=[-Math.cos(o)*Math.sin(w)-Math.sin(o)*Math.cos(w)*Math.cos(i),
    -Math.sin(o)*Math.sin(w)+Math.cos(o)*Math.cos(w)*Math.cos(i),Math.cos(w)*Math.sin(i)];
  const xp=A*(Math.cos(E)-e),yp=A*root*Math.sin(E),
    vx=-A*n*Math.sin(E)/den,vy=A*n*root*Math.cos(E)/den;
  const pos=p.map((x,j)=>x*xp+q[j]*yp),vel=p.map((x,j)=>x*vx+q[j]*vy);
  const omega=.00007292115,th=rad(theta0)+omega*t,c=Math.cos(th),s=Math.sin(th);
  const xyz=[c*pos[0]+s*pos[1],-s*pos[0]+c*pos[1],pos[2]];
  const vf=[c*vel[0]+s*vel[1]+omega*xyz[1],-s*vel[0]+c*vel[1]-omega*xyz[0],vel[2]];
  const lat=rad(lat0),lon=rad(lon0),R=6378137+h;
  const station=[R*Math.cos(lat)*Math.cos(lon),R*Math.cos(lat)*Math.sin(lon),R*Math.sin(lat)];
  const d=xyz.map((x,j)=>x-station[j]);
  const east=-Math.sin(lon)*d[0]+Math.cos(lon)*d[1];
  const north=-Math.sin(lat)*Math.cos(lon)*d[0]-Math.sin(lat)*Math.sin(lon)*d[1]+Math.cos(lat)*d[2];
  const up=Math.cos(lat)*Math.cos(lon)*d[0]+Math.cos(lat)*Math.sin(lon)*d[1]+Math.sin(lat)*d[2];
  const range=Math.hypot(...d),horizontal=Math.hypot(east,north),rate=d.reduce((s,x,j)=>s+x*vf[j],0)/range;
  const az=horizontal<=1?-1:((Math.atan2(east,north)*180000/Math.PI)%360000+360000)%360000;
  const el=Math.atan2(up,horizontal)*180000/Math.PI;
  return [0,...pos,...vel.map(x=>x*1000),az,el,range,rate*1000,-rate*f/299792458,up>=0?1:0];
}
