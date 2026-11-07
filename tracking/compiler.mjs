// Stack-expression ASSEMBLER. Expressions emit Piet commands, never values
// computed from runtime input. Registers are ordinary Piet stack entries.
import assert from 'node:assert/strict';
export const add=(...x)=>x.reduce((a,b)=>['add',a,b]);
export const sub=(a,b)=>['subtract',a,b],mul=(a,b)=>['multiply',a,b],div=(a,b)=>['divide',a,b];
export const mod=(a,b)=>['mod',a,b],gt=(a,b)=>['greater',a,b],not=a=>['not',a];
export const neg=a=>sub(0,a),sel=(flag,a,b)=>add(mul(flag,a),mul(not(flag),b));
export class Compiler {
  constructor(){this.ops=[];this.regs=[];this.depth=0;this.label='startup';this.counter=0;}
  emit(op,value=1){
    this.ops.push({op,value,label:this.label});
    this.depth+=({push:1,pop:-1,duplicate:1,roll:-2,in_number:1,out_number:-1,out_char:-1,
      add:-1,subtract:-1,multiply:-1,divide:-1,mod:-1,greater:-1,not:0,guard_input:-1})[op];
    assert.ok(this.depth>=0);
  }
  constant(value){
    const n=BigInt(value);
    if(n<0){this.constant(0);this.constant(-n);this.emit('subtract');return;}
    if(n===0n){this.emit('push');this.emit('not');return;}
    if(n<=10n){this.emit('push',Number(n));return;}
    const ds=String(n).split('').map(Number);this.constant(ds[0]);
    for(const d of ds.slice(1)){this.constant(10);this.emit('multiply');if(d){this.constant(d);this.emit('add');}}
  }
  roll(depth,times){this.constant(depth);this.constant(times);this.emit('roll');}
  read(name){
    const index=this.regs.indexOf(name);assert.ok(index>=0,`Unknown register ${name}`);
    const depth=this.depth-index;
    if(depth===1){this.emit('duplicate');return;}
    this.roll(depth,-1);this.emit('duplicate');this.roll(depth+1,1);
  }
  expr(x){
    if(typeof x==='number'||typeof x==='bigint')this.constant(x);
    else if(typeof x==='string')this.read(x);
    else {for(const arg of x.slice(1))this.expr(arg);this.emit(x[0]);}
  }
  set(name,expr){
    assert.equal(this.depth,this.regs.length);this.label=name;this.expr(expr);
    const index=this.regs.indexOf(name);
    if(index<0)this.regs.push(name);
    else {const n=this.regs.length-index;this.roll(n+1,1);this.roll(n,-1);this.emit('pop');}
    assert.equal(this.depth,this.regs.length);return name;
  }
  input(name){this.set(name,9000000000000000000n);this.label=`read ${name}`;this.emit('in_number');
    // The marker remains on top if input fails. A real Piet pointer branches
    // to an error-output/halting path, so only successful reads reach replace.
    this.emit('duplicate');this.constant(9000000000000000000n);this.emit('subtract');this.emit('not');
    this.emit('guard_input');this.roll(2,1);this.emit('pop');
  }
  scope(out,fn){this.set(out,0);const size=this.regs.length;const prefix=`t${this.counter++}_`;
    fn((n,e)=>this.set(prefix+n,e),n=>prefix+n);
    while(this.regs.length>size){this.regs.pop();this.emit('pop');}
    return out;
  }
  output(expr,last=false){this.expr(expr);this.emit('out_number');this.constant(last?10:32);this.emit('out_char');}
}
