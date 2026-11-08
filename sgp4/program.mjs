// ASSEMBLY ONLY: all input-dependent arithmetic emits standard Piet commands.
// WGS-72, near-Earth SGP4 at t=0. See README.md for the bounded domain.
import {Compiler,add,sub,mul,div,gt,not,neg,sel} from '../tracking/compiler.mjs';
import {Q,PI,TAU,fx,wrap,sincos,atan2} from '../tracking/math.mjs';
const fq=(a,b)=>div(mul(a,Q),b),rad=a=>div(mul(a,PI),1800000);
// The original tracker's sqrt deliberately has a smaller result domain.
// This local root supports fixed-point semimajor axes > 1 Earth radius.
function root(c,out,n){c.scope(out,(s,v)=>{
  s('r',0);
  for(let b=2**30;b>=1;b/=2){s('trial',add(v('r'),b));s('r',add(v('r'),mul(b,not(gt(mul(v('trial'),v('trial')),n)))));}
  c.set(out,v('r'));
});}
function axisFromMotion(c,out,motion){c.scope(out,(s,v)=>{
  s('ratio',fq(7436692,motion));s('square',fx(v('ratio'),v('ratio')));s('a',2*Q);
  for(let k=0;k<12;k++)s('a',div(add(mul(2,v('a')),fq(v('square'),fx(v('a'),v('a')))),3));
  c.set(out,v('a'));
});}
export function program(){
  const c=new Compiler(),set=(n,e)=>c.set(n,e);
  const fields=[['motion',650000000,1700000000,1082419157],['ecc',0,2500000,1859667],
    ['incl',0,1700000,342682],['node',0,3600000,3487242],['argp',0,3600000,3317664],['mean',0,3600000,193264]];
  set('valid',1);
  for(const [n,lo,hi,fallback] of fields){c.input(n);set('ok',mul(not(gt(lo,n)),not(gt(n,hi))));
    set('valid',mul('valid','ok'));set(n,sel('ok',n,fallback));}
  for(const [n,,,fallback] of fields)set(n,sel('valid',n,fallback));
  set('e',mul('ecc',10));set('inc',rad('incl'));sincos(c,'i','inc');
  set('ci2',fx('ic','ic'));set('con41',sub(mul(3,'ci2'),Q));
  set('x1mth2',sub(Q,'ci2'));set('x7thm1',sub(mul(7,'ci2'),Q));
  set('omeosq',sub(Q,fx('e','e')));root(c,'rteosq',mul('omeosq',Q));
  set('nk',div(mul('motion',TAU),144000000000n));
  axisFromMotion(c,'ak','nk');
  set('d1',fq(div(fx(108262,'con41'),4),fx('rteosq','omeosq')));set('d1',mul(3,'d1'));
  set('delta',fq('d1',fx('ak','ak')));
  set('adel',fx('ak',sub(sub(Q,fx('delta','delta')),fx('delta',add(div(Q,3),div(mul(134,fx('delta','delta')),81))))));
  set('delta',fq('d1',fx('adel','adel')));set('nm',fq('nk',add(Q,'delta')));
  axisFromMotion(c,'am','nm');
  set('valid',mul('valid',gt(mul('nm',225),TAU)));
  // At t=0, secular, drag and higher powers of elapsed time vanish.
  // This does NOT implement propagation at nonzero time.
  set('aycof',div(fx(234507,'is'),2));
  set('xlcof',fq(div(fx(fx(234507,'is'),add(3*Q,mul(5,'ic'))),4),add(Q,'ic')));
  set('e',sel(gt(100,'e'),100,'e')); // SGP4 eccentricity floor 1e-6.
  sincos(c,'w',rad('argp'));
  set('axnl',fx('e','wc'));set('temp',fq(Q,fx('am',sub(Q,fx('e','e')))));
  set('aynl',add(fx('e','ws'),fx('temp','aycof')));
  set('u',wrap(add(rad('mean'),rad('argp'),fx(fx('temp','xlcof'),'axnl'))));set('eo','u');
  for(let k=0;k<10;k++){
    sincos(c,'E','eo');
    set('step',fq(sub(add(sub('u',fx('aynl','Ec')),fx('axnl','Es')),'eo'),sub(sub(Q,fx('Ec','axnl')),fx('Es','aynl'))));
    set('step',sel(gt('step',95000000),95000000,sel(gt(-95000000,'step'),-95000000,'step')));
    set('eo',add('eo','step'));
  }
  sincos(c,'E','eo');
  set('ecose',add(fx('axnl','Ec'),fx('aynl','Es')));set('esine',sub(fx('axnl','Es'),fx('aynl','Ec')));
  set('el2',add(fx('axnl','axnl'),fx('aynl','aynl')));set('pl',fx('am',sub(Q,'el2')));
  set('rl',fx('am',sub(Q,'ecose')));
  root(c,'sqrtam',mul('am',Q));root(c,'sqrtpl',mul('pl',Q));root(c,'betal',mul(sub(Q,'el2'),Q));
  set('rdotl',fq(fx('sqrtam','esine'),'rl'));set('rvdotl',fq('sqrtpl','rl'));
  set('temp',fq('esine',add(Q,'betal')));
  set('sinu',fx(fq('am','rl'),sub(sub('Es','aynl'),fx('axnl','temp'))));
  set('cosu',fx(fq('am','rl'),add(sub('Ec','axnl'),fx('aynl','temp'))));
  atan2(c,'su','sinu','cosu');
  set('sin2u',fx(mul(2,'cosu'),'sinu'));set('cos2u',sub(Q,mul(2,fx('sinu','sinu'))));
  set('temp1',div(fq(108262,'pl'),2));set('temp2',fq('temp1','pl'));
  set('mrt',add(fx('rl',sub(Q,div(mul(3,fx(fx('temp2','betal'),'con41')),2))),div(fx(fx('temp1','x1mth2'),'cos2u'),2)));
  set('su',sub('su',div(fx(fx('temp2','x7thm1'),'sin2u'),4)));
  set('xnode',add(rad('node'),div(mul(3,fx(fx('temp2','ic'),'sin2u')),2)));
  set('xinc',add('inc',div(mul(3,fx(fx(fx('temp2','ic'),'is'),'cos2u')),2)));
  set('mvt',sub('rdotl',fq(fx(fx(fx('nm','temp1'),'x1mth2'),'sin2u'),7436692)));
  set('rvdot',add('rvdotl',fq(fx(fx('nm','temp1'),add(fx('x1mth2','cos2u'),div(mul(3,'con41'),2))),7436692)));
  sincos(c,'su','su');sincos(c,'node','xnode');sincos(c,'inc','xinc');
  set('xmx',neg(fx('nodes','incc')));set('xmy',fx('nodec','incc'));
  set('ux',add(fx('xmx','sus'),fx('nodec','suc')));set('uy',add(fx('xmy','sus'),fx('nodes','suc')));set('uz',fx('incs','sus'));
  set('vx',sub(fx('xmx','suc'),fx('nodec','sus')));set('vy',sub(fx('xmy','suc'),fx('nodes','sus')));set('vz',fx('incs','suc'));
  set('valid',mul('valid',not(gt(Q,'mrt'))));
  c.output(not('valid'));
  for(const axis of ['x','y','z'])c.output(mul('valid',fx(fx('mrt','u'+axis),6378135)));
  // radius * xke / 60 = 7.9053705105 km/s, stored here as mm/s.
  for(const axis of ['x','y','z'])c.output(mul('valid',fx(add(fx('mvt','u'+axis),fx('rvdot','v'+axis)),7905371)),axis==='z');
  c.ops.registers=c.regs;return c.ops;
}
