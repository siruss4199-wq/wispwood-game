// Coast Camp economy harness (Build 41 M2): the scripted player at a given speed, with each
// action's time jittered ±40 % by a seeded generator, through Landing Beach and the Survey
// Worksite. When it has nothing to do and energy is out it takes the free field ration (the
// game's own rescue path); otherwise it waits. With shop:true (Build 41g, when energy was made to
// run out) it first buys the shop's Energy pack with coins, as a player would, a few a day. Returns the measurements the economy test
// checks. The game and policy modules are passed in so older builds can be measured the same way.
export const SPEEDS=[4,4.5,5,6,7,8,9,10],SEEDS=[1,2,3,4,5];
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const MIN=60000;
// Something useful that costs no energy: a ready order, a legal merge, a crate part with room,
// a cargo key in hand, a generator pair.
export function freeAction(g,s){
 const b=s.board;
 if(s.orders.some(o=>g.orderItems(s,o)))return true;
 const items=b.flatMap((x,i)=>x?.type==='item'?[i]:[]);
 for(const i of items)for(const j of items)if(i<j&&b[i].family===b[j].family&&b[i].tier===b[j].tier)return true;
 if(b.includes(null)&&b.some(x=>x?.type==='kit'))return true;
 if(g.cargoKeys(s).some(k=>b.some(x=>g.matches(x,k))))return true;
 const gens=b.filter(x=>x?.type==='source');
 return gens.some((x,i)=>gens.some((y,j)=>i!==j&&g.generatorsMerge(x,y)));
}
// toArea (Chapter 2): the area index to finish, 1 = the Survey Worksite (the guard's original end),
// 2 = the Vault door, 3 = the Silent Observatory.
export function simulate(g,policy,speed,seed,{until=4*3600e3,firstOnly=false,onStep=null,shop=false,toArea=1}={}){
 const rnd=mulberry(seed),s=g.fresh(0);let now=0;
 const m={speed,seed,minEnergy:Infinity,bought:0,idle:0,longestIdle:0,starve:[],lowStates:0,lowFree:0,taps:0,rations:0,orderAges:[],restores:[],gens:{},first:{},first15:{orders:0,restores:0}};
 let idleRun=0,starveStart=null;const born={};
 const done=()=>s.area>toArea||s.area===toArea&&g.areaDone(s);
 while(now<until&&!done()&&!(firstOnly&&now>=15*MIN)){
  g.tick(s,now);for(const o of s.orders)born[o.id]??=now;
  if(s.energy<1&&starveStart===null)starveStart=now;
  if(s.energy>=1&&starveStart!==null){m.starve.push(now-starveStart);starveStart=null;}
  if(s.energy<3){m.lowStates++;if(freeAction(g,s))m.lowFree++;}
  m.minEnergy=Math.min(m.minEnergy,s.energy);
  let a=policy(s);
  if(!a&&shop&&s.energy<1&&s.coins>=g.SHOP.energy.cost&&g.act(s,{type:'buy',id:'energy',day:Math.floor(now/864e5)},now).ok){m.bought++;continue;}
  if(!a&&s.energy<=3&&g.act(s,{type:'ration'},now).ok){m.rations++;continue;}
  if(!a){now+=10000;m.idle+=10000;idleRun+=10000;m.longestIdle=Math.max(m.longestIdle,idleRun);continue;}
  idleRun=0;const r=g.act(s,a,now);if(!r.ok)throw new Error(`policy chose a refused action ${JSON.stringify(a)}: ${r.message}`);
  now+=speed*1000*(.6+.8*rnd());
  if(a.type==='produce')m.taps++;
  if(r.event==='merge')m.first.merge??=now;
  if(r.event==='unseal'||r.event==='producerUp')m.first.discovery??=now;
  if(r.event==='deliver'){m.first.order??=now;m.orderAges.push(now-born[a.id]);if(now<15*MIN)m.first15.orders++;}
  if(r.event==='restore'){m.first.restore??=now;m.restores.push(now);if(now<15*MIN)m.first15.restores++;}
  for(const n of r.released??[])m.gens[n.id]??=now;
  onStep?.(s,now);
 }
 if(starveStart!==null)m.starve.push(now-starveStart);
 m.total=now;m.finished=done();return m;
}
export const quantile=(a,p)=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.floor(b.length*p))];};
export const gaps=r=>r.map((t,i)=>i?t-r[i-1]:t);
// One row per speed: the worst (or mean, where noted) over the seeds, in minutes.
export function summary(runs){
 return SPEEDS.filter(sp=>runs.some(r=>r.speed===sp)).map(sp=>{const R=runs.filter(r=>r.speed===sp),max=f=>Math.max(...R.map(f)),mean=f=>R.reduce((a,r)=>a+f(r),0)/R.length;
  return {speed:sp,totalMean:mean(r=>r.total)/MIN,idleMax:max(r=>r.idle)/MIN,longestIdleMax:max(r=>r.longestIdle)/MIN,starveEpisodesMean:mean(r=>r.starve.length),starveLongestMax:max(r=>Math.max(0,...r.starve))/MIN,
   lowFreeMin:Math.min(...R.map(r=>r.lowStates?r.lowFree/r.lowStates:1)),orderMedianMax:max(r=>quantile(r.orderAges,.5))/MIN,orderP90Max:max(r=>quantile(r.orderAges,.9))/MIN,
   restoreGapMedianMax:max(r=>quantile(gaps(r.restores),.5))/MIN,restoreGapMax:max(r=>Math.max(...gaps(r.restores)))/MIN,tapsMean:mean(r=>r.taps),rationsMean:mean(r=>r.rations),boughtMean:mean(r=>r.bought),minEnergy:Math.min(...R.map(r=>r.minEnergy)),
   kiteMax:max(r=>r.gens.chart??Infinity)/MIN,kilnBeforeEnd:R.every(r=>r.finished&&r.gens.lamp<r.total),finished:R.every(r=>r.finished)};});
}
