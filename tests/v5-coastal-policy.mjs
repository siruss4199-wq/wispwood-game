import {coastalObjective} from '../v5/coastal-journey.mjs';
import {expeditionGoal} from '../v5/core.mjs';
import {sameKind,maxTier} from '../v5/treasures.mjs';
import {reservedItems} from '../v5/requests.mjs';
import {choose} from './v5-policy.mjs';
import {requestAction} from './v5-workshop-policy.mjs';
import {masteryPending,instrumentReady} from '../v5/mastery.mjs';

// Follow the visible main objective. No gifts, clock jumps, or save injection.
export function coastalAction(s,{specialty='rig',route='ridge',receiver='scope'}={}){
 const g=coastalObjective(s,expeditionGoal(s));
 if(s.energy<=3)return {type:'ration'};
 const free=s.board.includes(null);
 if(!free){
  for(let i=0;i<36;i++)for(let j=i+1;j<36;j++)if(sameKind(s.board[i],s.board[j])&&s.board[i].tier<maxTier(s.board[i],s))return {type:'merge',from:i,to:j};
  const kept=reservedItems(s),index=s.board.findIndex((x,i)=>x?.type==='item'&&!x.line&&x.tier<2&&!kept.has(i));
  if(index>=0)return {type:'recycle',index};
  throw Error('No space recovery for '+g.name);
 }
 if(s.stage===3&&masteryPending(s).length){
  if(instrumentReady(s,specialty))return {type:'prepareInstrument',family:specialty};
  for(let tier=3;tier>=0;tier--){const pair=s.board.flatMap((x,i)=>x?.type==='item'&&!x.line&&x.family===specialty&&x.tier===tier?[i]:[]);if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};}
  return {type:s.charges[specialty]?'produce':'service',id:specialty};
 }
 if(g.kind!=='camp')return choose(s,{sideFirst:false,decode:false,route,receiver,openCaches:true});
 if(g.action==='orders')return requestAction(s,s.requests.orders.findIndex(o=>o?.id===g.orderId));
 if(g.action==='treasure'){
  const tier=g.needs[0].tier+(s.stage===0?1:0);
  for(let t=tier-1;t>=0;t--){const pair=s.board.flatMap((x,i)=>x?.line==='tide'&&x.tier===t?[i]:[]);if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};}
  return {type:s.charges.chart?'recoverTide':'service',id:'chart'};
 }
 if(g.action==='buildPier'&&s.board.filter(x=>x?.type==='crate').length>=3)return {type:'crate',index:s.board.findIndex(x=>x?.type==='crate')};
 return {type:g.action};
}
