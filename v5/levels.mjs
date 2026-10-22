// Expedition level: XP from merges, crew orders, restorations and milestones.
// Each level opens a chest: energy now plus a small generator box on the board.
// Deterministic; older saves start at level 1 with nothing granted retroactively.
export const XP={merge:1,restoration:10,milestone:15};
export const CAMP_ACTIONS=['restoreWorkshop','buildPier','buildLoft','upgradeLoft','upgradeWorkshop'];
export const CHEST_ENERGY=10,CHEST_FAMILIES=['rig','chart','flux'];
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
 if(result.event==='producerUp')return XP.restoration;
 if(result.event==='kitMerge')return XP.merge;
 if(CAMP_ACTIONS.includes(a.type))return XP.restoration;
 if(a.type==='request'&&order)return 2+(order.supplies??1);
 if(result.event==='merge')return XP.merge;
 return 0;
}

// The box cycles Rover → Kite → Crucible; with no free space the chest pays
// extra energy instead.
export function gainXp(s,amount,{kit,put,openGates=()=>[]}){
 s.level=validLevel(s.level);
 const ups=[];
 s.level.xp+=amount;
 while(s.level.xp>=xpToNext(s.level.level)){
  s.level.xp-=xpToNext(s.level.level);s.level.level++;
  const opened=openGates(s);
  const family=CHEST_FAMILIES[(s.level.level-2)%CHEST_FAMILIES.length];
  const index=put(s,kit(family,1));
  const energy=CHEST_ENERGY+(index<0?5:0);
  s.energy=Math.min(120,s.energy+energy);
  ups.push({level:s.level.level,energy,family:index<0?null:family,index,opened});
 }
 return ups;
}
