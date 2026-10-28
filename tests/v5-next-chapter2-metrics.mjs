// Coast Camp pacing through Chapter 2 (Build 47e; docs/V5_CHAPTER2_INTEGRATION_2026-10-28.md): the
// scripted player (tests/v5-next-policy.mjs) from a new camp to the Observatory's sea gate, at several
// speeds and seeds. Read-only: nothing in the game is changed. Per segment (Chapter 1 to the open
// Vault; the Tide Archive; the Observatory) it reports active play (actions × their time) and waiting
// (nothing to do, energy out) apart, what the player makes over and over, how far apart new things
// come, and how full the board is. One JSON line per speed, then the means.
// With "noshop" the player never buys energy with coins, so it waits for the refill instead.
//   node tests/v5-next-chapter2-metrics.mjs [speeds=5,8] [seeds=1,2,3,4,5] [shop|noshop]
import * as g from '../v5/next/game.mjs';
import {nextAction} from './v5-next-policy.mjs';
import {simulate,quantile} from './v5-next-economy-sim.mjs';
const SPEEDS=(process.argv[2]??'5,8').split(',').map(Number),SEEDS=(process.argv[3]??'1,2,3,4,5').split(',').map(Number),SHOP=(process.argv[4]??'shop')==='shop';
const MIN=60000,r1=x=>Math.round(x*10)/10;
const SEG=['ch1','archive','observatory'];
const segOf=s=>s.area<3?'ch1':g.stageOf(s,'vault-archive')<3?'archive':'observatory';
function run(speed,seed){
 const M=Object.fromEntries(SEG.map(k=>[k,{start:null,end:null,actions:0,activeMs:0,idleMs:0,made:{},orders:[],repeats:0,news:[],occ:[],full:0,pendingSteps:0,steps:0}]));
 let seg='ch1',last=0,lastNow=0,sawGen=new Set(['rig']),found=0,lensBench=null;
 const recent=[];
 // time between two ticks with no action in between was spent waiting (the harness's idle step)
 let tickAt=0,acted=true;
 const proxy={...g,tick:(s,now)=>{if(!acted)M[seg].idleMs+=now-tickAt;tickAt=now;acted=false;return g.tick(s,now);},act:(s,a,now)=>{
  const before=segOf(s),r=g.act(s,a,now),m=M[before];if(r.ok)acted=true;// a refused ration is still waiting
  if(r.ok&&a.type==='merge'&&s.board[a.to]?.type==='item'){const x=s.board[a.to],k=x.family+x.tier;m.made[k]=(m.made[k]??0)+1;}
   return r;}};
 const seen=new Set();
 // each step counts in the segment it started in (the stage that ends a segment is that segment's)
 M.ch1.start=0;
 const onStep=(s,now)=>{
  const m=M[seg];lastNow=now;
  m.steps++;if(s.pending.length)m.pendingSteps++;
  const used=s.board.filter(x=>x&&x.type!=='cargo'&&x.type!=='glass').length;m.occ.push(used);if(!s.board.includes(null))m.full++;
  // new orders (repetition: an everyday order whose parts match one of the last four)
  for(const o of s.orders)if(o&&!seen.has(o.id)){seen.add(o.id);if(o.story)continue;const key=o.needs.map(r=>r.family+r.tier).sort().join('+');if(recent.slice(-4).includes(key))m.repeats++;recent.push(key);m.orders.push(key);}
  // new things: a generator kind first on the board, a part first found, a stage bought
  for(const x of s.board)if(x?.type==='source'&&!sawGen.has(x.id)){sawGen.add(x.id);m.news.push([now,'gen:'+x.id]);if(x.id==='optic')lensBench=now;}
  if(s.found.length>found){m.news.push([now,'part']);found=s.found.length;}
  const built=g.totalBuilt(s);if(built>last){m.news.push([now,'stage']);last=built;}
  const k=segOf(s);if(k!==seg){m.end=now;seg=k;M[k].start=now;}
 };
 const res=simulate(proxy,nextAction,speed,seed,{until:14*3600e3,shop:SHOP,onStep,finish:s=>g.allDone(s)});
 M[seg].end=res.total;
 const out={speed,seed,shop:SHOP,bought:res.bought,rations:res.rations,finished:res.finished,totalMin:r1(res.total/MIN),activeMin:r1(res.active/MIN),idleMin:r1(res.idle/MIN),lensBenchMin:lensBench&&r1(lensBench/MIN)};
 for(const k of SEG){const m=M[k];if(m.start===null)continue;
  const span=(m.end-m.start)/MIN,top=Object.entries(m.made).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const times=m.news.map(([t])=>t),gap=times.map((t,i)=>(i?t-times[i-1]:t-m.start)/MIN);
  out[k]={min:r1(span),activeMin:r1(span-m.idleMs/MIN),waitMin:r1(m.idleMs/MIN),orders:m.orders.length,repeatPct:m.orders.length?Math.round(100*m.repeats/m.orders.length):0,topMade:top.map(([k,n])=>k+'×'+n).join(' '),
   news:m.news.length,newGapMedianMin:r1(quantile(gap,.5)),newGapMaxMin:r1(Math.max(0,...gap)),stages:m.news.filter(x=>x[1]==='stage').length,
   boardMedian:quantile(m.occ,.5),boardP90:quantile(m.occ,.9),fullPct:Math.round(100*m.full/Math.max(1,m.steps)),pendingPct:Math.round(100*m.pendingSteps/Math.max(1,m.steps))};}
 return out;
}
for(const speed of SPEEDS){
 const runs=SEEDS.map(seed=>run(speed,seed));
 for(const r of runs)console.log(JSON.stringify(r));
 const mean=f=>r1(runs.reduce((a,r)=>a+f(r),0)/runs.length);
 console.log(JSON.stringify({speed,mean:true,finished:runs.every(r=>r.finished),totalMin:mean(r=>r.totalMin),activeMin:mean(r=>r.activeMin),idleMin:mean(r=>r.idleMin),lensBenchMin:mean(r=>r.lensBenchMin??NaN),
  ...Object.fromEntries(SEG.flatMap(k=>[[k+'Min',mean(r=>r[k]?.min??0)],[k+'ActiveMin',mean(r=>r[k]?.activeMin??0)],[k+'WaitMin',mean(r=>r[k]?.waitMin??0)]])),
  boughtMean:mean(r=>r.bought),rationsMean:mean(r=>r.rations)}));
}
