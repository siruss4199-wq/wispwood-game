import {requestProgress,reservedItems} from './requests.mjs';
import {sameKind,maxTier,recoveryCost} from './treasures.mjs';
import {SOURCES} from './core.mjs';

// Advice only. No mutations, artificial inventory or automatic moves.
// Highlight a *legal* pair (including its distinct treasure line), or the
// actual source used to progress the player's selected order.
export function orderDirection(s,order){
 if(!order)return null;
 const progress=requestProgress(s,order);
 if(progress.ready)return {kind:'collect',orderId:order.id,indices:[],family:null,need:null};
 const need=progress.progress.find(r=>r.current<r.count);
 if(!need)return null;
 const kept=reservedItems(s);
 const line=need.line??'';
 for(let tier=need.tier-1;tier>=0;tier--){
  const choices=s.board.flatMap((x,i)=>
   x?.type==='item'&&x.family===need.family&&x.tier===tier&&(x.line??'')===line&&!kept.has(i)?[i]:[]);
  for(let i=0;i<choices.length;i++)for(let j=i+1;j<choices.length;j++){
   const a=choices[i],b=choices[j];
   if(sameKind(s.board[a],s.board[b]))
    return {kind:'merge',orderId:order.id,need,indices:[a,b],family:need.family,tier};
  }
 }
 // A full board can block production. Prefer real legal twin merges before
 // falsely suggesting a producer tap that will fail.
 if(!s.board.includes(null)){
  const pool=s.board.flatMap((x,i)=>x?.type==='item'&&!kept.has(i)?[i]:[]);
  for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){
   const a=pool[i],b=pool[j];
   if(sameKind(s.board[a],s.board[b])&&s.board[a].tier<maxTier(s.board[a],s))
    return {kind:'make-space',orderId:order.id,need,family:need.family,indices:[a,b]};
  }
  return {kind:'full',orderId:order.id,need,family:need.family,indices:[]};
 }
 const index=s.board.findIndex(x=>x?.type==='source'&&x.id===need.family);
 if(index<0)return {kind:'unavailable',orderId:order.id,need,indices:[]};
 const energyCost=line==='tide'?recoveryCost(s):SOURCES[need.family]?.cost??1;
 if(s.energy<energyCost)return {kind:'energy',orderId:order.id,need,family:need.family,indices:[],index};
 return {kind:line==='tide'?'recover':'produce',
  orderId:order.id,need,family:need.family,indices:[index],index};
}
