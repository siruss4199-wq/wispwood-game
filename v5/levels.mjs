// Expedition level: XP from merges, crew orders, restorations and milestones.
// Each level opens a chest: energy now plus a raw-parts case on the board.
// Deterministic; older saves start at level 1 with nothing granted retroactively.
export const XP={merge:1,restoration:10,milestone:15};
export const CAMP_ACTIONS=['restoreWorkshop','buildPier','buildLoft','upgradeLoft','upgradeWorkshop'];
export const CHEST_ENERGY=10,CHEST_CASES=['salvage','survey','relic'];
// XP needed to go from level n to n+1: 20, 30, 40 … capped at 80.
export const xpToNext=level=>Math.min(80,10+10*level);

export function freshLevel(){return {version:1,level:1,xp:0};}
export function validLevel(old){
 const ok=old&&old.version===1&&Number.isInteger(old.level)&&old.level>=1&&old.level<=999&&Number.isInteger(old.xp)&&old.xp>=0&&old.xp<xpToNext(old.level);
 return ok?{version:1,level:old.level,xp:old.xp}:freshLevel();
}

// XP a successful action earns. Orders pay by size: quick 3, standard 5, kit 8.
export function xpFor(a,result,order){
 if(result.event==='milestone')return XP.milestone;
 if(CAMP_ACTIONS.includes(a.type))return XP.restoration;
 if(a.type==='request'&&order)return 2+(order.supplies??1);
 if(result.event==='merge')return XP.merge;
 return 0;
}

// The case cycles Rover → Kite → Crucible parts; with two cases waiting or a full
// board the chest pays extra energy instead.
export function gainXp(s,amount,{container,put}){
 s.level=validLevel(s.level);
 const ups=[];
 s.level.xp+=amount;
 while(s.level.xp>=xpToNext(s.level.level)){
  s.level.xp-=xpToNext(s.level.level);s.level.level++;
  const kind=CHEST_CASES[(s.level.level-2)%CHEST_CASES.length];
  // At most two waiting cases, so a chest never blocks the Supply Pier (three-case limit).
  const index=s.board.filter(x=>x?.type==='crate').length<2?put(s,container(kind)):-1;
  const energy=CHEST_ENERGY+(index<0?5:0);
  s.energy=Math.min(120,s.energy+energy);
  ups.push({level:s.level.level,energy,kind:index<0?null:kind,index});
 }
 return ups;
}
