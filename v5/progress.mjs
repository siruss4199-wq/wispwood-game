// How far the visible goal is, 0–100, counting partial work: a Grip tool is half of
// a Split spanner, saved supplies are part of a build. Pure; display only.
const raw=tier=>2**tier;
const same=(x,r)=>x?.type==='item'&&x.family===r.family&&(x.line??null)===(r.line??null);

export function needProgress(s,needs){
 if(!needs?.length)return null;
 const used=new Set();let have=0,want=0;
 // Count exact matches first, then lower tiers as partial credit, highest first.
 for(const r of needs){
  const goal=r.count*raw(r.tier);want+=goal;let got=0;
  const pool=s.board.flatMap((x,i)=>same(x,r)&&x.tier<=r.tier&&!used.has(i)?[[i,x.tier]]:[]).sort((a,b)=>b[1]-a[1]);
  for(const [i,tier] of pool){if(got>=goal)break;used.add(i);got=Math.min(goal,got+raw(tier));}
  have+=got;
 }
 return Math.floor(100*have/want);
}

export function goalProgress(s,g){
 if(!g)return null;
 // The landing pier takes two deliveries: finished ones count, plus the part in hand.
 if(g.name==='Repair the storm-damaged pier'){
  const done=Math.max(0,Math.min(2,s.camp?.earlyFragments??0));
  return Math.floor((done*100+(needProgress(s,g.needs)??0))/2);
 }
 if(g.kind==='camp'&&Number.isFinite(g.cost)&&g.cost>0)return Math.min(100,Math.floor(100*(s.requests?.supplies??0)/g.cost));
 return needProgress(s,g.needs);
}
