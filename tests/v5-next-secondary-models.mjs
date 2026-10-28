// What secondary drops would cost (proposal measurement, docs/V5_SECONDARY_CHAINS_PLAN_2026-10-28.md).
// Read-only: the game is not changed. The scripted player runs Chapters 1-2 while a share of the
// Rivet Rover's and Survey Kite's taps make a secondary part INSTEAD of their own (replacement). The
// secondary is taken off the board at once, as if an order wanted it straight away; it pays nothing
// here (the uncompensated case), so the run shows the extra taps, energy and time replacement adds.
// The bonus model (an extra secondary beside the normal part) costs no energy; its cost is board space,
// estimated in the plan from tests/v5-next-economy-baseline.mjs. Drops are random with a pity limit
// (a secondary at the latest after `pity` taps of that generator without one), or every n-th tap.
//   node tests/v5-next-secondary-models.mjs [speeds=5,8] [seeds=1,2,3] [shop|noshop]
import * as g from '../v5/next/game.mjs';
import {nextAction} from './v5-next-policy.mjs';
import {simulate} from './v5-next-economy-sim.mjs';
const SPEEDS=(process.argv[2]??'5,8').split(',').map(Number),SEEDS=(process.argv[3]??'1,2,3').split(',').map(Number),SHOP=(process.argv[4]??'shop')==='shop';
const MIN=60000,r1=x=>Math.round(x*10)/10;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const MODELS=[{name:'baseline',p:0},{name:'replace 5%',p:.05,pity:30},{name:'replace 10%',p:.10,pity:20},{name:'replace 15%',p:.15,pity:14},{name:'every 10th',every:10}];
const GENS=['rig','chart'];
function run(model,speed,seed){
 const rnd=mulberry(seed*7919+1),since={rig:0,chart:0},count={rig:0,chart:0};let drops=0,longest=0;
 const proxy={...g,act:(s,a,now)=>{
  const r=g.act(s,a,now);
  if(r.ok&&r.event==='produce'&&GENS.includes(a.id)&&(model.p||model.every)){
   count[a.id]++;since[a.id]++;
   const hit=model.every?count[a.id]%model.every===0:(rnd()<model.p||since[a.id]>=model.pity);
   if(hit){s.board[r.index]=null;drops++;longest=Math.max(longest,since[a.id]);since[a.id]=0;}}
  return r;}};
 const res=simulate(proxy,nextAction,speed,seed,{until:16*3600e3,shop:SHOP,finish:s=>g.allDone(s)});
 return {finished:res.finished,totalMin:res.total/MIN,activeMin:res.active/MIN,waitMin:res.idle/MIN,taps:res.taps,drops,longest,bought:res.bought};
}
for(const speed of SPEEDS){
 let base=null;
 for(const model of MODELS){
  const R=SEEDS.map(seed=>run(model,speed,seed)),mean=f=>R.reduce((a,r)=>a+f(r),0)/R.length;
  const row={speed,shop:SHOP,model:model.name,finished:R.every(r=>r.finished),totalMin:r1(mean(r=>r.totalMin)),activeMin:r1(mean(r=>r.activeMin)),waitMin:r1(mean(r=>r.waitMin)),taps:Math.round(mean(r=>r.taps)),drops:Math.round(mean(r=>r.drops)),longestDrought:Math.max(...R.map(r=>r.longest)),bought:r1(mean(r=>r.bought))};
  if(!base)base=row;else{row.extraTaps=row.taps-base.taps;row.extraTotalMin=r1(row.totalMin-base.totalMin);row.extraWaitMin=r1(row.waitMin-base.waitMin);}
  console.log(JSON.stringify(row));
 }
}
