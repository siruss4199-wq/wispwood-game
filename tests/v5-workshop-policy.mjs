import {isTide,sameKind,maxTier} from '../v5/treasures.mjs';
import {requestProgress,reservedItems} from '../v5/requests.mjs';
import {benchInputs} from '../v5/workshop.mjs';
export function requestAction(s,lane){
 const o=s.requests.orders[lane],p=requestProgress(s,o);
 if(p.ready)return {type:'request',id:o.id};
 const need=p.progress.find(r=>r.current<r.count),kept=reservedItems(s);
 if(need.line==='tide'){for(let tier=need.tier-1;tier>=0;tier--){const pair=s.board.flatMap((x,i)=>isTide(x)&&x.tier===tier?[i]:[]);if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};}return s.charges.chart?{type:'recoverTide',id:'chart'}:{type:'service',id:'chart'};}
 // This walkthrough intentionally tries the newly unlocked alternative for a
 // spanner order, even when an ordinary pair merge would also be plausible.
 if(s.workshop.precision&&need.family==='rig'&&need.tier===2){
  const [tool,chart]=benchInputs(s);
  if(tool>=0&&chart>=0)return s.charges.rig?{type:'fitSpanner',id:'rig'}:{type:'service',id:'rig'};
  const family=tool<0?'rig':'chart';
  return {type:s.charges[family]?(tool<0?'press':'produce'):'service',id:family};
 }
 for(let tier=need.tier-1;tier>=0;tier--){
  const pair=s.board.flatMap((x,i)=>x?.type==='item'&&!x.line&&x.family===need.family&&x.tier===tier&&!kept.has(i)?[i]:[]);
  if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};
 }
 let family=need.family;
 if(s.workshop.precision&&family==='rig'&&need.tier>=2){
  const [tool,chart]=benchInputs(s);
  if(tool>=0&&chart>=0)return s.charges.rig?{type:'fitSpanner',id:'rig'}:{type:'service',id:'rig'};
  family=tool<0?'rig':'chart';
  if(tool<0&&s.charges.rig)return {type:'press',id:'rig'};
 }
 return {type:s.charges[family]?'produce':'service',id:family};
}
