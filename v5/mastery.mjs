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
