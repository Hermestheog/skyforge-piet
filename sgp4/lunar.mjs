// ASSEMBLY ONLY: all epoch-dependent arithmetic is emitted into the Piet PNG.
import {add,sub,mul,div} from '../tracking/compiler.mjs';
import {Q,fx,sincos,sqrt,atan2} from '../tracking/math.mjs';
import {epochAngles} from './deep-time.mjs';
export function lunarOrientation(c,days,millis){
  epochAngles(c,days,millis);
  const [stem,ctem]=sincos(c,'lunar_node_','xnodce');
  c.set('zcosil',sub(91375164,fx(3568096,ctem)));
  sqrt(c,'zsinil',sub(mul(Q,Q),mul('zcosil','zcosil')));
  // Keep the ninth decimal of this coefficient until after division.
  c.set('zsinhl',div(mul(89683511,stem),mul(10,'zsinil')));
  sqrt(c,'zcoshl',sub(mul(Q,Q),mul('zsinhl','zsinhl')));
  c.set('lunar_zx',div(mul(39785416,stem),'zsinil'));
  c.set('lunar_zy',add(fx('zcoshl',ctem),fx(fx(91744867,'zsinhl'),stem)));
  atan2(c,'lunar_angle','lunar_zx','lunar_zy');
  c.set('lunar_angle',add('gam','lunar_angle',sub(0,'xnodce')));
  const [s,g]=sincos(c,'lunar_final_','lunar_angle');
  c.set('zcosgl',g);c.set('zsingl',s);
  return ['zcosil','zsinil','zcoshl','zsinhl','zcosgl','zsingl'];
}
