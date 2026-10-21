import assert from 'node:assert/strict';import {fresh,act,load} from '../v5/core.mjs';import {choose} from './v5-policy.mjs';
const runs=[];
for(const route of ['ridge','conduit'])for(const receiver of ['scope','relay'])for(const findStrategy of ['recover','restore','mixed']){
 const s=fresh(0),options={route,receiver,findStrategy,sideFirst:false,decode:false},actions=[];
 for(let n=0;n<220&&s.stage<4;n++){
  const a=choose(s,options),r=act(s,a,n*1000);assert.ok(r.ok,r.message);actions.push({...a,stage:s.stage,occupied:s.board.filter(Boolean).length});
  if(n%5===0)Object.assign(s,load(JSON.stringify(s)));
 }
 assert.equal(s.stage,4);assert.ok(actions.some(x=>x.type==='prime'));assert.equal(actions.filter(x=>x.type==='power').length,1);assert.equal(s.board.some(x=>x?.type==='prism'),false);
 assert.equal(s.expedition.log.find(x=>x.type==='seal'&&x.seal==='resonance').receiver,receiver);
 runs.push({options,actions,merges:s.merges,pulls:s.taps,energy:s.energy});
}
console.log(JSON.stringify({note:'Actual deterministic actions; not measured human enjoyment or playtime.',runs},null,2));
