// This file emits instructions. Every input-dependent operation below is a
// Piet expression; no input is read or orbit numerically evaluated in JavaScript.
import {Compiler,add,sub,mul,div,gt,not,neg,sel,mod} from './compiler.mjs';
import {Q,PI,TAU,fx,radians,wrap,sincos,sqrt,atan2} from './math.mjs';
export function program(){
  const c=new Compiler();const set=(n,e)=>c.set(n,e);
  const fields=[['a',6478,50000,7000],['ecc',0,500000,0],['inc',0,180000,0],
    ['raan',0,360000,0],['argp',0,360000,0],['m0',0,360000,0],['time',-86400,86400,0],
    ['theta0',0,360000,0],['lat',-90000,90000,0],['lon',-180000,180000,0],['alt',0,10000,0],['carrier',0,10000000,0]];
  set('valid',1);
  for(const [n,lo,hi,def] of fields){c.input(n);set('ok',mul(not(gt(lo,n)),not(gt(n,hi))));
    set('valid',mul('valid','ok'));set(n,sel('ok',n,def));}
  set('valid',mul('valid',not(gt(6478000000, mul('a',sub(1000000,'ecc'))))));
  for(const [n,,,def] of fields)set(n,sel('valid',n,def));
  set('e',mul('ecc',100));set('A',mul('a',1000));
  sqrt(c,'speed4',div(6377600000000000000n,'a'));
  set('n',div(mul('speed4',250000),'a')); // mean motion, radians/s * 1e12
  set('M',wrap(add(radians('m0'),div(mul('n','time'),10000))));set('E','M');
  for(let j=0;j<8;j++) {
    sincos(c,'kepler','E');
    set('E',sub('E',div(mul(sub(sub('E',fx('e','keplers')),'M'),Q),sub(Q,fx('e','keplerc')))));
  }
  sincos(c,'eccentric','E');sqrt(c,'root',sub(10000000000000000n,mul('e','e')));
  set('xp',fx('A',sub('eccentricc','e')));set('yp',fx(fx('A','root'),'eccentrics'));
  set('baseV',div(mul('A','n'),1000000000));set('den',sub(Q,fx('e','eccentricc')));
  set('vxp',neg(div(mul('baseV','eccentrics'),'den')));
  set('vyp',div(mul(fx('baseV','root'),'eccentricc'),'den'));
  sincos(c,'O',radians('raan'));sincos(c,'w',radians('argp'));sincos(c,'i',radians('inc'));
  set('px',sub(fx('Oc','wc'),fx(fx('Os','ws'),'ic')));
  set('py',add(fx('Os','wc'),fx(fx('Oc','ws'),'ic')));set('pz',fx('ws','is'));
  set('qx',neg(add(fx('Oc','ws'),fx(fx('Os','wc'),'ic'))));
  set('qy',sub(fx(fx('Oc','wc'),'ic'),fx('Os','ws')));set('qz',fx('wc','is'));
  for(const axis of ['x','y','z']) {
    set(axis,add(fx('p'+axis,'xp'),fx('q'+axis,'yp')));
    set('v'+axis,add(fx('p'+axis,'vxp'),fx('q'+axis,'vyp')));
  }
  sincos(c,'theta',add(radians('theta0'),div(mul(72921150,'time'),10000)));
  set('xf',add(fx('thetac','x'),fx('thetas','y')));
  set('yf',sub(fx('thetac','y'),fx('thetas','x')));set('zf','z');
  set('vxf',add(fx('thetac','vx'),fx('thetas','vy'),div(mul(72921150,'yf'),1000000000)));
  set('vyf',sub(sub(fx('thetac','vy'),fx('thetas','vx')),div(mul(72921150,'xf'),1000000000)));
  set('vzf','vz');
  sincos(c,'lat',radians('lat'));sincos(c,'lon',radians('lon'));set('R',add(6378137,'alt'));
  set('dx',sub('xf',fx(fx('R','latc'),'lonc')));
  set('dy',sub('yf',fx(fx('R','latc'),'lons')));set('dz',sub('zf',fx('R','lats')));
  set('east',sub(fx('dy','lonc'),fx('dx','lons')));
  set('north',sub(sub(fx('dz','latc'),fx(fx('dx','lonc'),'lats')),fx(fx('dy','lons'),'lats')));
  set('up',add(fx(fx('dx','lonc'),'latc'),fx(fx('dy','lons'),'latc'),fx('dz','lats')));
  sqrt(c,'range',add(mul('dx','dx'),mul('dy','dy'),mul('dz','dz')));
  sqrt(c,'horizontal',add(mul('east','east'),mul('north','north')));
  atan2(c,'az','east','north');atan2(c,'el','up','horizontal');
  set('azimuth',sel(gt('horizontal',1),div(mul(mod(add('az',TAU),TAU),180000),PI),-1));
  set('elevation',div(mul('el',180000),PI));
  set('rate',div(add(mul('dx','vxf'),mul('dy','vyf'),mul('dz','vzf')),'range'));
  set('doppler',neg(div(mul('rate','carrier'),299792458))); // mm/s * kHz / c(m/s) -> Hz
  set('visible',not(gt(0,'up')));
  c.output(not('valid'));
  const out=['x','y','z','vx','vy','vz','azimuth','elevation','range','rate','doppler','visible'];
  out.forEach((n,i)=>c.output(mul('valid',n),i===out.length-1));
  c.ops.registers=[...c.regs];return c.ops;
}
