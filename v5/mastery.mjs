// Genuine Tier-4 ordinary-family merges are required in newly started runs.
// Reward crates and legacy saves cannot retroactively be marked as crafted.
export const MASTERY_FAMILIES=['rig','chart','flux'];
export const MASTERY_NAMES={rig:'Crawler jack',chart:'Bearing dial',flux:'Phase lantern'};
export const freshMastery=()=>({rig:false,chart:false,flux:false});
export const masteryPending=s=>!s.craftMastery?[]:MASTERY_FAMILIES.filter(f=>s.craftMastery[f]!==true);
export function recordCraftMastery(s,x){
 if(!s.craftMastery||x?.type!=='item'||x.line||x.tier<4||!MASTERY_FAMILIES.includes(x.family)||s.craftMastery[x.family])return false;
 s.craftMastery[x.family]=true;return true;
}

// Deterministic, read-only next action for the real Tier-4 crew objective.
// No extra UI surface and never consumes a reserved or existing item.
export function masteryDirection(s){
 const family=masteryPending(s)[0];if(!family)return null;
 const need={family,tier:4,count:1};
 for(const tier of [3,2,1,0]){
  const pair=s.board.flatMap((x,i)=>x?.type==='item'&&!x.line&&x.family===family&&x.tier===tier?[i]:[]);
  if(pair.length>=2)return {kind:'merge',family,need,indices:pair.slice(0,2),tier};
 }
 const full=!s.board.includes(null);
 if(full){
  for(const f of MASTERY_FAMILIES)for(let tier=0;tier<=5;tier++){
   const pair=s.board.flatMap((x,i)=>x?.type==='item'&&!x.line&&x.family===f&&x.tier===tier?[i]:[]);
   if(pair.length>=2)return {kind:'make-space',family,need,indices:pair.slice(0,2)};
  }
  return {kind:'full',family,need,indices:[]};
 }
 const charge=s.charges?.[family]??0,cost=charge===0?3:family==='flux'?2:1;
 if(s.energy<cost)return {kind:'energy',family,need,indices:[]};
 const index=s.board.findIndex(x=>x?.type==='source'&&x.id===family);
 if(index<0)return {kind:'unavailable',family,need,indices:[]};
 return {kind:charge?'produce':'refill',family,need,indices:[index]};
}
