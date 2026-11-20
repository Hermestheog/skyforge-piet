// These functions emit Piet arithmetic. They never evaluate runtime inputs.
import {add,sub,mul,div,neg} from '../tracking/compiler.mjs';
import {Q,PI,TAU,fx,wrap} from '../tracking/math.mjs';
const H=10000000000,P=1000000000000;
const fq=(a,b)=>div(mul(a,Q),b),rad=a=>div(mul(a,PI),1800000);
function axis(c,out,motion){c.scope(out,(s,v)=>{
  // WGS-72 xke * 1e10 = 743669161. Only small rates use scale 1e12.
  s('ratio',fq(743669161,motion));s('square',fx(v('ratio'),v('ratio')));s('a',2*Q);
  for(let k=0;k<12;k++)s('a',div(add(mul(2,v('a')),fq(v('square'),fx(v('a'),v('a')))),3));
  c.set(out,v('a'));
});}
export function initializeSecular(c){
  const set=(n,e)=>c.set(n,e);
  set('nkH',div(mul('motion',TAU),1440000000));
  axis(c,'ak','nkH');
  set('d1H',fq(div(mul(3,fx(10826160,'con41')),4),fx('rteosq','omeosq')));
  set('deltaH',fq('d1H',fx('ak','ak')));
  const deltaSquared=div(mul('deltaH','deltaH'),H);
  set('adel',div(mul('ak',sub(sub(H,deltaSquared),div(mul('deltaH',add(div(H,3),div(mul(134,deltaSquared),81))),H))),H));
  set('deltaH',fq('d1H',fx('adel','adel')));
  // The domain caps nkH below 7.42e8, so nkH * H stays below signed 64-bit.
  set('nmH',div(mul('nkH',H),add(H,'deltaH')));
  axis(c,'am','nmH');set('nm',div('nmH',100));
}
export function advanceSecular(c){
  const set=(n,e)=>c.set(n,e);
  set('p0',fx('am','omeosq'));set('pinvsq',fq(Q,fx('p0','p0')));set('ci4',fx('ci2','ci2'));
  // Preserve small J2^2 and J4 terms with 1e12-scaled rates. Products are
  // transient 64-bit stack values; every stored coefficient still fits int32.
  set('s1P',div(mul(3,fx(div(mul(1082616000,'nmH'),H),'pinvsq')),2));
  set('s2P',div(fx(div(mul('s1P',1082616000),P),'pinvsq'),2));
  set('s3P',div(mul(15,fx(fx(div(mul(1655970,'nmH'),H),'pinvsq'),'pinvsq')),32));
  set('meanRateP',add(div(fx(fx('s1P','rteosq'),'con41'),2),
    div(fx(fx('s2P','rteosq'),add(sub(13*Q,mul(78,'ci2')),mul(137,'ci4'))),16)));
  set('argRateP',add(neg(div(fx('s1P',sub(Q,mul(5,'ci2'))),2)),
    div(fx('s2P',add(sub(7*Q,mul(114,'ci2')),mul(395,'ci4'))),16),
    fx('s3P',add(sub(3*Q,mul(36,'ci2')),mul(49,'ci4')))));
  set('nodeRateP',add(neg(fx('s1P','ic')),fx(add(div(fx('s2P',sub(4*Q,mul(19,'ci2'))),2),
    mul(2,fx('s3P',sub(3*Q,mul(7,'ci2'))))),'ic')));
  // Divide by 60 to convert seconds to minutes, and by the scale ratio.
  // Wrap before storing: an unwrapped day of mean anomaly exceeds int32.
  set('meanAngle',wrap(add(rad('mean'),div(mul('nmH','seconds'),6000),div(mul('meanRateP','seconds'),600000))));
  set('argAngle',wrap(add(rad('argp'),div(mul('argRateP','seconds'),600000))));
  set('nodeAngle',wrap(add(rad('node'),div(mul('nodeRateP','seconds'),600000))));
}
