// ASSEMBLY ONLY. Every epoch-dependent operation is emitted as standard Piet.
import {add,sub,mul,div,mod} from '../tracking/compiler.mjs';
import {wideRegisters} from './wide-registers.mjs';
const Q=100000000,DAY_MS=86400000,DAY_US=86400000000n;
const positiveMod=(x,m)=>mod(add(mod(x,m),m),m);
export function epochAngles(c,days,millis){
  wideRegisters(c,['clock_seconds','clock_phase']);
  const set=(n,e)=>c.set(n,e);
  set('clock_millis',sub(millis,43200000)); // J2000 is noon; inputs start at midnight.
  set('clock_century',add(div(mul(days,Q),36525),
    div(mul('clock_millis',Q),3155760000000n)));
  set('clock_t2',div(mul('clock_century','clock_century'),Q));
  set('clock_t3',div(mul('clock_t2','clock_century'),Q));
  // Omit exact whole-day rotations before forming GST. Units are microseconds.
  // The 8640184.812866-second century drift is kept as an exact integer ratio.
  set('clock_seconds',add(67310548410n,mul('clock_millis',1000),
    div(mul(days,8640184812866n),36525),
    div(mul('clock_millis',236555367),DAY_MS),
    div(mul(93104,'clock_t2'),Q),sub(0,div(mul(62,'clock_t3'),10*Q))));
  set('clock_seconds',positiveMod('clock_seconds',DAY_US));
  // Split whole seconds and microseconds to avoid an overflowing product.
  set('gsto',add(div(mul(div('clock_seconds',1000000),628318530),86400),
    div(mul(mod('clock_seconds',1000000),628318530),DAY_US)));
  // dscom's day = JD - 2415020 = days + 36525 + centered fractional day.
  // Reduce at 1e11 precision before converting to 1e8-radian outputs, avoiding
  // accumulation of a coarse 2*pi approximation across thousands of turns.
  for(const [name,base,rate] of [
    ['xnodce',452360200000n,-92422029n],
    ['gam',583515140000n,194436800n],
    ['zmos',625658370000n,1720197700n],
    ['zmol',-111518420000n,22802713200n],
  ]){
    set('clock_phase',add(base,mul(rate,add(days,36525)),div(mul(rate,'clock_millis'),DAY_MS)));
    set(name,div(positiveMod('clock_phase',628318530718n),1000));
  }
  return ['gsto','xnodce','gam','zmos','zmol'];
}
