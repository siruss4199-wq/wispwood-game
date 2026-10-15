// Fastest observed deterministic policy, not an exhaustive shortest-path proof
// and never a human playtime estimate. Run: node tests/v5-seal-metrics.mjs
import assert from 'node:assert/strict';
import {fresh,act,count,ready,normalContract} from '../v5/core.mjs';
import {canRestore,equipment,anchors} from '../v5/expedition.mjs';
import {linkPhase,optics,allSeals} from '../v5/seals.mjs';
import {choose} from './v5-policy.mjs';
export function measure(){
 const runs=[];
 for(const route of ['ridge','conduit'])for(const style of ['expedition','exploration'])for(const findStrategy of [null,'recover','restore','mixed'])for(const openCaches of [false,true])for(const decode of [false,true])for(const mergeSight of [false,true]){
  const s=fresh(0),options={route,style,findStrategy,openCaches,decode,mergeSight,sideFirst:false},decisions=new Set(),actions=[],pressure=[];
  while(s.stage<4&&s.moves<300){
   if(s.stage===1&&['rig','chart'].every(family=>count(s,{family,tier:2})>0))decisions.add('route: workspace versus relic supplies');
   for(const [i,x]of s.board.entries())if(canRestore(s,x)&&count(s,{family:'rig',tier:2})>0&&count(s,{family:'flux',tier:2})>0)decisions.add('find '+i+': movable equipment versus immediate repair');
   if(s.seals.stabilization&&anchors(s).filter(x=>x.kind!=='winch'&&x.phase==='idle'&&ready(s,[equipment(x.kind)])).length===2)decisions.add('receiver: relic supplies versus source charges');
   if(linkPhase(s)&&!optics(s).primed&&count(s,{family:'flux',tier:1})>=1){
    decisions.add('cell: light the lift versus merge into repair coil');
    if(normalContract(s).vaultTrade&&ready(s,normalContract(s).needs))decisions.add('cells: connection versus receiver exchange');
   }
   const a=choose(s,options),result=act(s,a,s.moves*1000);assert.ok(result.ok,result.message);actions.push(a);pressure.push(s.board.filter(Boolean).length);
  }
  assert.equal(s.stage,4);assert.ok(allSeals(s));
  runs.push({options,actions:actions.length,merges:s.merges,taps:Object.values(s.taps).reduce((a,b)=>a+b,0),energy:s.energy,rations:s.rations,minOccupied:Math.min(...pressure),maxOccupied:Math.max(...pressure),decisions:[...decisions],sequence:actions});
 }
 const shortest=runs.reduce((a,b)=>a.actions<=b.actions?a:b);
 return {testedPolicies:runs.length,shortestObserved:shortest,byRoute:['ridge','conduit'].map(route=>({route,minimumActions:Math.min(...runs.filter(x=>x.options.route===route).map(x=>x.actions))})),actionRange:[Math.min(...runs.map(x=>x.actions)),Math.max(...runs.map(x=>x.actions))]};
}
console.log(JSON.stringify(measure(),null,2));
