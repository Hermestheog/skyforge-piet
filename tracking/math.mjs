import {add,sub,mul,div,mod,gt,not,neg,sel} from './compiler.mjs';
export const Q=100000000,PI=314159265,TAU=628318530;
export const fx=(a,b)=>div(mul(a,b),Q);
export const radians=a=>div(mul(a,PI),180000);
export const wrap=a=>sub(mod(add(mod(add(a,PI),TAU),TAU),TAU),PI);
export function sine(c,out,angle){return c.scope(out,(s,v)=>{
  s('x',wrap(angle));
  s('x',sel(gt(v('x'),157079632),sub(PI,v('x')),v('x')));
  s('x',sel(gt(-157079632,v('x')),sub(-PI,v('x')),v('x')));
  s('xx',fx(v('x'),v('x')));s('term',v('x'));s('sum',v('x'));
  for(let k=1;k<12;k++){s('term',neg(div(fx(v('term'),v('xx')),(2*k)*(2*k+1))));s('sum',add(v('sum'),v('term')));}
  s('sum',sel(gt(v('sum'),Q),Q,v('sum')));
  c.set(out,sel(gt(-Q,v('sum')),-Q,v('sum')));
});}
export function sincos(c,name,angle){sine(c,name+'s',angle);sine(c,name+'c',add(angle,157079632));return [name+'s',name+'c'];}
export function sqrt(c,out,n){return c.scope(out,(s,v)=>{
  // npiet's roll has an int temporary even on 64-bit hosts. Keep stored
  // registers 32-bit; evaluate the wide radicand directly on top of the stack.
  s('a',0);
  for(let b=2**26;b>=1;b/=2){s('trial',add(v('a'),b));s('a',add(v('a'),mul(b,not(gt(mul(v('trial'),v('trial')),n)))));}
  c.set(out,v('a'));
});}
// atan(2^-i) in radians * 1e8: fixed algorithm constants, not orbital answers.
const ATAN=[78539816,46364761,24497866,12435499,6241881,3123983,1562373,781234,390623,195312,
  97656,48828,24414,12207,6104,3052,1526,763,381,191,95,48,24,12,6,3,1,1];
export function atan2(c,out,y,x){return c.scope(out,(s,v)=>{
  s('negativeX',gt(0,x));s('sign',sub(1,mul(2,v('negativeX'))));
  s('x',mul(mul(x,8),v('sign')));s('y',mul(mul(y,8),v('sign')));
  s('a',mul(mul(v('negativeX'),sub(1,mul(2,gt(0,y)))),PI));
  for(let i=0;i<ATAN.length;i++){
    s('d',sub(1,mul(2,gt(0,v('y')))));
    s('nx',add(v('x'),mul(v('d'),div(v('y'),2**i))));
    s('y',sub(v('y'),mul(v('d'),div(v('x'),2**i))));s('x',v('nx'));
    s('a',add(v('a'),mul(v('d'),ATAN[i])));
  }
  c.set(out,v('a'));
});}
