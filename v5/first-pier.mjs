// Actual first-repair progress is derived from existing earned rewards.
// No new save fields, currencies, deadlines or retroactive unlock rules.
export function firstPier(s){
 if(s.stage!==0||s.landingStep!==1||s.camp?.pier)return null;
 const level=Math.max(0,Math.min(2,s.camp?.earlyFragments??0));
 return {level,visibleLanes:level===0?[0]:level===1?[0,1]:[0,1,2],
  label:['Storm-damaged pier','First support repaired','Landing walkway restored'][level],
  progress:level+'/2',
  next:level===0?'Ivo needs a delivery to secure the first pier beam.':
   level===1?'One more delivery completes the landing walkway.':
   'Merge Neri’s two Tide fragments to discover the missing route.'};
}
