// Assembly helper: preserve selected signed-64-bit register values across
// npiet's int-sized roll temporary by storing three base-1e9 limbs.
// Every split/reconstruction below executes in Piet, not in the assembler.
export function wideRegisters(c,names){
  const selected=new Set(names),locations=new Map();
  const read=c.read.bind(c),set=c.set.bind(c),base=1000000000n;
  let serial=0;
  c.read=function(name){
    if(!locations.has(name))return read(name);
    const [low,middle,high]=locations.get(name);
    read(low);read(middle);read(high);c.constant(base);c.emit('multiply');
    c.emit('add');c.constant(base);c.emit('multiply');c.emit('add');
  };
  c.set=function(name,expression){
    if(!selected.has(name))return set(name,expression);
    c.label=name;c.expr(expression);
    // value, remainder -> remainder, value. Only the remainder crosses roll's
    // truncating boundary; the wide original is shifted without truncation.
    c.emit('duplicate');c.constant(base);c.emit('mod');c.roll(2,1);
    c.constant(base);c.emit('divide');
    c.emit('duplicate');c.constant(base);c.emit('mod');c.roll(2,1);
    c.constant(base);c.emit('divide');
    const low=`wide_${serial}_lo`,middle=`wide_${serial}_mid`,high=`wide_${serial++}_hi`;
    c.regs.push(low,middle,high);locations.set(name,[low,middle,high]);
    return name;
  };
}
