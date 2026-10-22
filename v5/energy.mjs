// Energy refills over real time: +1 every two minutes up to 50. Rewards can still
// raise energy above 50 (to the usual 120 cap); refilling only works below 50.
// Pure accounting from timestamps, settled by the UI clock and after loading.
export const REFILL_EVERY=2*60*1000,REFILL_CAP=50;
// Field ration: a small rescue at 3 energy or less, once per hour.
export const RATION_ENERGY=8,RATION_EVERY=60*60*1000;
export const rationWait=(s,now)=>Number.isFinite(s.rationAt)?Math.max(0,s.rationAt+RATION_EVERY-now):0;

const valid=t=>Number.isFinite(t)&&t>=0;
// Adds the energy earned since s.energyAt; returns how much was added.
export function settleEnergy(s,now){
 if(!valid(s.energyAt)||s.energyAt>now)s.energyAt=now;
 // Full: the clock rests (the save stays unchanged); act() restarts it on spending.
 if(s.energy>=REFILL_CAP)return 0;
 const steps=Math.floor((now-s.energyAt)/REFILL_EVERY);
 if(steps<=0)return 0;
 const gained=Math.min(steps,REFILL_CAP-s.energy);
 s.energy+=gained;
 s.energyAt=s.energy>=REFILL_CAP?now:s.energyAt+steps*REFILL_EVERY;
 return gained;
}
// Milliseconds until the next point and until full; null when already full.
export function refillTimes(s,now){
 if(s.energy>=REFILL_CAP)return null;
 const since=Math.max(0,now-(valid(s.energyAt)?s.energyAt:now));
 const next=REFILL_EVERY-(since%REFILL_EVERY);
 return {next,full:next+(REFILL_CAP-s.energy-1)*REFILL_EVERY};
}
// 1:45 under ten minutes, 47m under an hour, 1h 12m above.
export function clock(ms){
 const sec=Math.max(0,Math.ceil(ms/1000));
 if(sec<600)return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
 const m=Math.ceil(sec/60);
 return m<60?m+'m':Math.floor(m/60)+'h'+(m%60?' '+String(m%60).padStart(2,'0')+'m':'');
}
