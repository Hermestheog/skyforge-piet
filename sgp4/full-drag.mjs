// ASSEMBLY ONLY. Every expression below becomes runtime Piet stack arithmetic.
// Time is folded into the drag coefficients before fixed-point rounding.
import {add,sub,mul,div,mod,gt,not,neg,sel} from '../tracking/compiler.mjs';
import {Q,PI,fx,wrap,sincos} from '../tracking/math.mjs';
import {wideRegisters} from './wide-registers.mjs';
const fq=(a,b)=>div(mul(a,Q),b),rad=a=>div(mul(a,PI),1800000);
const abs=a=>sel(gt(0,a),neg(a),a);
// WGS-72 j2/(D*S), at 1e10. Preserve the full j2 constant and the 1e10
// atmospheric geometry instead of rounding either to 1e8 first.
const j2TsiH=div(108261600000000000n,'scaledDH');
// Quotient/remainder multiplication avoids forming the unscaled product.
const md=(a,b,d)=>add(mul(mul(div(a,d),div(b,d)),d),
  mul(div(a,d),mod(b,d)),mul(mod(a,d),div(b,d)),div(mul(mod(a,d),mod(b,d)),d));
const fxH=(a,b)=>add(mul(div(a,100000),div(b,100000)),
  div(add(mul(div(a,100000),mod(b,100000)),mul(mod(a,100000),div(b,100000))),100000),
  div(mul(mod(a,100000),mod(b,100000)),10000000000));
export function advanceFullDrag(c,root){
  wideRegisters(c,['qratio','qSquare','coef','coef1','coefBT','baseBT',
    'dragFirst','dragSecond','X','termA','termB','tempe','coef0BT','delomg',
    'coef0B','delm0','delmt','delm','dragAngle','coef1B','cc5B','nodeDrag',
    'X2','D2','dtemp','D3','D4','tempa','template',
    'perigeeH','geometryD','geometryAE','scaledDH','geometryAmH','qWork',
    'axisRatioH','axisTargetH','axisTrialH','axisSquareH','axisCubeH',
    'dragJ2H','geometryNkP','geometryNmP','foldMagnitude','foldLimit','foldInput']);
  const set=(n,e)=>c.set(n,e);
  const guardedFold=(out,a,b,d)=>{
    set('foldMagnitude',sel(not(not(b)),abs(b),1));
    // Conservative bound avoids overflowing the bound calculation itself
    // when the other factor is also a wide intermediate.
    set('foldLimit',sel(gt('foldMagnitude',d),
      mul(div(9223372036854775807n,'foldMagnitude'),
        sel(gt('foldMagnitude',d),d,'foldMagnitude')),9223372036854775807n));
    set('valid',mul('valid',not(gt(abs(a),'foldLimit'))));
    set('foldInput',sel('valid',a,0));set(out,md('foldInput',b,d));
  };
  // The 1e8 axis used by the original periodic reconstruction is sufficient
  // for metre output, but its rounding is amplified by atmospheric powers.
  // Derive a separate 1e10 axis from the un-Kozai motion for drag geometry.
  // Recover the input mean motion at 1e12 without first truncating it at
  // 1e10. Split 2*pi*1e12 so no unscaled product exceeds int64.
  const turnProduct=mul('motion',62831853);
  set('geometryNkP',add(div(turnProduct,1440000),
    div(add(mul(mod(turnProduct,1440000),100000),mul('motion',7179)),144000000000)));
  const correction=mul('geometryNkP','deltaH'),denominator=add(10000000000,'deltaH');
  set('geometryNmP',sub('geometryNkP',add(div(correction,denominator),gt(mod(correction,denominator),0))));
  set('axisRatioH',md(7436691613317341n,100000,'geometryNmP'));
  set('axisTargetH',fxH('axisRatioH','axisRatioH'));set('geometryAmH',0);
  for(let b=2**34;b>=1;b/=2){
    set('axisTrialH',add('geometryAmH',b));
    set('axisSquareH',fxH('axisTrialH','axisTrialH'));
    set('axisCubeH',fxH('axisSquareH','axisTrialH'));
    set('geometryAmH',add('geometryAmH',mul(b,not(gt('axisCubeH','axisTargetH')))));
  }
  set('perigee',fx(sub(fx('am',sub(Q,'e')),Q),6378135));
  set('normal',not(gt(220000,'perigee')));
  set('atmosphere',sel(gt(98000,'perigee'),20000,sel(gt(156000,'perigee'),sub('perigee',78000),78000)));
  // Keep variable atmosphere in Earth-radius units at 1e10. Rounding the
  // perigee to whole metres before deriving s biases strong-drag trajectories.
  set('perigeeH',sub(md('geometryAmH',sub(Q,'e'),Q),10000000000));
  set('atmosphereH',sel(gt(98000,'perigee'),31357129,sel(gt(156000,'perigee'),sub('perigeeH',122292802),122292802)));
  set('s4',add(Q,div(mul('atmosphere',Q),6378135)));
  set('dragD',sub('am','s4'));
  set('dragActive',mul(not(not('bstar')),not(not('seconds'))));
  // Every drag correction is identically zero in these cases. Use harmless
  // coefficient geometry, preserving the actual e/am used by reconstruction.
  set('dragD',sel('dragActive','dragD',Q));
  set('geometryD',sel('dragActive',sub('geometryAmH',add(10000000000,'atmosphereH')),10000000000));
  // Singular initialization is rejected; harmless substitutes keep the straight
  // line error path away from zero divisors.
  set('dragD',sel(gt(abs('dragD'),100),'dragD',Q));
  set('geometryAE',mul('dragActive',md('geometryAmH','e',Q)));
  set('largeEta',gt('geometryAE',abs('geometryD')));
  // Normalization removes the original D singularity when ae is nonzero.
  // Only the truly singular circular geometry needs a substitute divisor.
  set('valid',mul('valid',sel('largeEta',1,not(not('geometryD')))));
  set('geometryD',sel(not(not('geometryD')),'geometryD',1));
  set('inverseEtaScale',sel('largeEta',fq(abs('geometryD'),sel(gt('geometryAE',0),'geometryAE',Q)),Q));
  set('inverseEtaScale2',fx('inverseEtaScale','inverseEtaScale'));
  set('inverseEtaScale3',fx('inverseEtaScale2','inverseEtaScale'));
  set('scaledDH',sel('largeEta',mul(sub(1,mul(2,gt(0,'geometryD'))),'geometryAE'),'geometryD'));
  set('scaledD',div('scaledDH',100));
  // eta below is eta/S, S=max(1,abs(eta)). All stored geometry remains bounded
  // even when the original a-s is nearly zero for an Earth-crossing ellipse.
  set('eta',fq('geometryAE','scaledDH'));set('eta2',fx('eta','eta'));set('eeta',fx('e','eta'));
  set('psi',abs(sub('inverseEtaScale2','eta2')));set('valid',mul('valid',gt('psi',100)));
  set('psi',sel(gt('psi',100),'psi',Q));root(c,'psiRoot',mul('psi',Q));
  // Normalized (q0-s)/((a-s)*S), scaled 1e9. Retain the fourth power at
  // 1e15 for ordinary ratios; large ratios use 1e11 plus a separate factor.
  set('qratio',div(mul(sub(188142772,'atmosphereH'),1000000000),'scaledDH'));
  // Even scale 1 cannot represent an arbitrarily large fourth power in
  // int64. Reject that numerical range before forming the power; substitute
  // harmless geometry so the error packet itself needs no overflowing math.
  set('valid',mul('valid',not(gt(abs('qratio'),50000000000000n))));
  set('qratio',sel('valid','qratio',0));
  set('scaledDH',sel('valid','scaledDH',10000000000));
  set('psi',sel('valid','psi',Q));set('psiRoot',sel('valid','psiRoot',Q));
  // Coefficient precision adapts to the magnitude of the normalized ratio.
  // C=1e15,1e11,1e3,1 respectively; this includes weak-B* near-surface orbits
  // whose enormous unscaled coef cannot be stored at the ordinary scale.
  set('coefRange',sel(gt(abs('qratio'),1000000000000n),3,sel(gt(abs('qratio'),90000000000n),2,sel(gt(abs('qratio'),1000000000),1,0))));
  set('coefScale',sel(gt(abs('qratio'),1000000000),10000,1));
  set('qWork',div('qratio',sel(gt('coefRange',2),1000000,sel(gt('coefRange',1),1000,1))));
  set('qSquare',md('qWork','qWork',sel(gt('coefRange',2),1000,sel(gt('coefRange',1),1000000,sel('coefRange',1000000000,1000000)))));
  set('coef',md('qSquare','qSquare',sel(gt('coefRange',2),1000000,sel(gt('coefRange',1),1000000000,sel('coefRange',10000000,1000000000)))));
  // Divide in stages so a small psi^3.5 is never rounded to a coarse Q unit.
  set('coef1','coef');
  for(const denominator of ['psi','psi','psi','psiRoot']){
    set('valid',mul('valid',not(gt('coef1',md(9223372036854775807n,denominator,Q)))));
    set('coef1',sel('valid','coef1',0));
    set('coef1',md('coef1',Q,denominator));
  }
  // coef1 below represents coef1*S³. Corrections retain scale 1e10 until
  // their final sum, avoiding early loss of a small cc1 before time folding.
  guardedFold('coefBT','coef1','bstar',sel(gt('coefRange',2),6,sel(gt('coefRange',1),6000,1000000000)));
  guardedFold('coefBT','coefBT','seconds',sel(gt('coefRange',1),1,sel('coefRange',600,6000000)));
  set('scaledDH',sel('valid','scaledDH',10000000000));
  set('psi',sel('valid','psi',Q));
  set('baseBT',md('coefBT','nmH',10000000000));
  set('dragFirst',fx('am',add('inverseEtaScale3',div(mul(3,fx('eta2','inverseEtaScale')),2),fx('eeta',add(mul(4,'inverseEtaScale2'),'eta2')))));
  set('dragSecond',md(div(mul(3,j2TsiH),8),fq('con41','psi'),Q));
  set('dragSecond',div(md('dragSecond',add(mul(8,fx('inverseEtaScale2','inverseEtaScale2')),mul(3,fx('eta2',add(mul(8,'inverseEtaScale2'),'eta2')))),Q),100));
  guardedFold('X','baseBT',add('dragFirst','dragSecond'),Q);
  set('X',div('X',100));
  set('baseBT',sel('valid','baseBT',0));
  set('scaledDH',sel('valid','scaledDH',10000000000));set('psi',sel('valid','psi',Q));
  sincos(c,'w0',rad('argp'));sincos(c,'w2',mul(2,rad('argp')));
  set('termA',add(fx('eta',add(mul(2,'inverseEtaScale2'),div('eta2',2))),fx('e',add(div('inverseEtaScale3',2),mul(2,fx('eta2','inverseEtaScale'))))));
  set('termB',add(mul(-3,fx('con41',add(sub('inverseEtaScale3',mul(2,fx('eeta','inverseEtaScale2'))),fx('eta2',sub(div(mul(3,'inverseEtaScale'),2),div('eeta',2)))))),div(mul(3,fx(fx('x1mth2',sub(mul(2,fx('eta2','inverseEtaScale')),fx('eeta',add('inverseEtaScale2','eta2')))),'w2c')),4)));
  guardedFold('tempe','baseBT','am',Q);
  guardedFold('tempe','tempe','omeosq',Q);
  set('dragJ2H',md(j2TsiH,'inverseEtaScale',Q));
  set('dragJ2H',md('dragJ2H',Q,fx('am','psi')));
  set('dragJ2H',md('dragJ2H','termB',Q));
  guardedFold('tempe','tempe',sub('termA',div('dragJ2H',100)),Q);
  set('tempe',div('tempe',50));
  // For the simplified branch this is the final eccentricity correction.
  // Reject it before squaring enormous drag terms on the error path.
  set('valid',mul('valid',sel('normal',1,mul(not(gt(-100000,sub('e','tempe'))),gt(Q,sub('e','tempe'))))));
  set('X',mul('valid','X'));set('tempe',mul('valid','tempe'));
  // cc3/omgcof and xmcof use the unmodified coef, not coef1.
  set('eccActive',mul(mul('normal','dragActive'),gt('e',10000)));set('safeE',sel('eccActive','e',Q));set('safeEEta',sel('eccActive','eeta',Q));
  set('coef0BT',md(mul('normal','coef'),'bstar',1000000000));
  set('coef0BT',mul(md('coef0BT','seconds',600000000),'coefScale'));
  set('delomg',mul('eccActive',fx(fq(fx(div(mul('coef0BT','nmH'),10000000000),469014),'dragD'),fq(fx('is','w0c'),'safeE'))));
  set('coef0B',mul(div(md(mul('normal','coef'),'bstar',1000000000),10000000),'coefScale'));
  sincos(c,'m0',rad('mean'));sincos(c,'mdf','meanAngle');
  set('delm0',add(Q,fx('eta','m0c')));set('delmt',add(Q,fx('eta','mdfc')));
  set('delm',neg(div(mul(2,mul('eccActive',fx(fq('coef0B','safeEEta'),sub(fx(fx('delmt','delmt'),'delmt'),fx(fx('delm0','delm0'),'delm0'))))),3)));
  set('dragAngle',mul('normal',add('delomg','delm')));
  set('meanAngle',wrap(add('meanAngle','dragAngle')));set('argAngle',wrap(sub('argAngle','dragAngle')));
  sincos(c,'mm','meanAngle');
  set('coef1B',mul(div(md(mul('normal','coef1'),'bstar',1000000000),10000000),'coefScale'));
  set('cc5B',mul(2,fx(fx(fx('coef1B','am'),'omeosq'),add(Q,div(mul(11,add('eta2','eeta')),4),fx('eeta','eta2')))));
  set('tempe',add('tempe',mul('normal',fx('cc5B',sub('mms','m0s')))));
  // nodecf*t² = 3.5*omeosq*xhdot1*t*X.
  set('nodeDrag',div(mul(7,fx(fx('omeosq',neg(div(mul(fx('s1P','ic'),'seconds'),600000))),'X')),2));
  set('nodeAngle',wrap(add('nodeAngle','nodeDrag')));
  // Higher time terms retain scale 1e10: rounding X² at Q can discard a
  // meaningful d2*t² correction before the a/(a-s) amplification.
  set('X2',div(mul('X','X'),1000000));
  set('D2',mul('normal',mul(4,fx(fq('am','dragD'),'X2'))));
  set('dtemp',div(fq(fx('D2','X'),'dragD'),3));
  set('D3',fx(add(mul(17,'am'),'s4'),'dtemp'));
  set('D4',div(fx(fx(fx('dtemp','X'),fq('am','dragD')),add(mul(221,'am'),mul(31,'s4'))),2));
  set('tempa',sub(Q,add('X',div(add('D2','D3','D4'),100))));
  set('template',add(mul(150,'X'),mul('normal',add('D2',mul(2,'X2'),
    div(add(mul(3,'D3'),fx('X',add(mul(12,'D2'),mul(10,'X2')))),4),
    div(add(mul(3,'D4'),mul(12,fx('X','D3')),mul(6,div(mul('D2','D2'),10000000000)),mul(15,div(mul('X2',add(mul(2,'D2'),'X2')),10000000000))),5)))));
  // Both phase factors can exceed sqrt(INT64_MAX); split the minute-angle
  // factor at 1e5 before multiplication (at most one Q-unit rounding loss).
  const phase=div(mul('nmH','seconds'),6000);
  set('meanAngle',wrap(add('meanAngle',div(mul(div(phase,100000),'template'),100000),div(mul(mod(phase,100000),'template'),10000000000))));
  set('am',fx('am',fx('tempa','tempa')));set('e',sub('e','tempe'));
  set('valid',mul('valid',mul(not(gt(-100000,'e')),not(gt('e',Q-1)))));
  set('valid',mul('valid',gt('am',Q/2)));
  set('e',sel('valid','e',100));set('am',sel('valid','am',Q));
  root(c,'dragSqrtAm',mul('am',Q));set('nm',fq(7436692,fx('am','dragSqrtAm')));
}
