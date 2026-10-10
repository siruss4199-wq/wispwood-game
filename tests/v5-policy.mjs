// A fresh-player policy shared by simulation and real UI tests. No fixture injection.
import {goal,ready,count,normalContract,SOURCES} from '../v5/core.mjs';
export function choose(s,{sideFirst=true}={}){
 const target=sideFirst&&s.contracts===0?normalContract(s):goal(s);
 if(!target)return null;
 const deliver=sideFirst&&s.contracts===0?'contract':'goal';
 if(ready(s,target.needs))return {type:deliver};
 if(s.discovery&&!s.discoveryDone&&s.board.some(x=>x?.type==='glyph')&&ready(s,[{family:'chart',tier:2,count:1}]))return {type:'discovery'};
 const req=target.needs.find(r=>count(s,r)<r.count);
 // Retain exact ingredients for the active goal; combine only lower tiers.
 for(let t=req.tier-1;t>=0;t--){const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===req.family&&x.tier===t?[i]:[]);if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};}
 const free=s.board.indexOf(null);
 if(free<0){
  for(const x of s.board)if(x?.type==='glyph')return {type:'recycle',index:s.board.indexOf(x)};
  const excess=s.board.flatMap((x,i)=>x?.type==='item'&&!target.needs.some(r=>r.family===x.family&&r.tier===x.tier)?[{x,i}]:[]).sort((a,b)=>(a.x.family===req.family)-(b.x.family===req.family)||a.x.tier-b.x.tier);
  if(excess.length)return {type:'recycle',index:excess[0].i};
 }
 if(s.energy<=3)return {type:'ration'};
 const id=req.family;if(s.stage<SOURCES[id].unlock)throw Error('Policy targets locked source '+id);
 if(!s.charges[id])return {type:'service',id};
 return {type:'produce',id};
}
