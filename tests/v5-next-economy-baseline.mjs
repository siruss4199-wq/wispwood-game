// Coast Camp economy baseline (Build 47f): what the scripted player (tests/v5-next-policy.mjs) does
// and gets from a new camp to the end of Chapter 2, so later changes (secondary chains, energy) can
// be measured against it. Read-only: the game is not changed. Per segment (the first 15 minutes,
// the rest of Chapter 1, the Tide Archive, the Observatory) it records taps, merges, deliveries,
// energy spent and where energy came from, coins earned and spent, rewards, active and waiting time,
// how varied and how easy the everyday orders were, and what each generator's taps made.
//   node tests/v5-next-economy-baseline.mjs [speeds=5,8] [seeds=1,2,3,4,5] [shop|noshop]
import * as g from '../v5/next/game.mjs';
import {nextAction} from './v5-next-policy.mjs';
import {simulate} from './v5-next-economy-sim.mjs';
const SPEEDS=(process.argv[2]??'5,8').split(',').map(Number),SEEDS=(process.argv[3]??'1,2,3,4,5').split(',').map(Number),SHOP=(process.argv[4]??'shop')==='shop';
const MIN=60000,r1=x=>Math.round(x*10)/10;
const SEG=['first15','ch1','archive','observatory'];
const segOf=(s,now)=>now<15*MIN?'first15':s.area<3?'ch1':g.stageOf(s,'vault-archive')<3?'archive':'observatory';
const blank=()=>({start:null,end:null,idleMs:0,acts:{},taps:{},tapTier:{},energyOut:0,energyIn:{},coinsIn:0,coinsOut:0,rewards:{},orders:0,repeats:0,keys:new Set(),readyAtBirth:0,ownedAtBirth:0,stages:0});
const add=(o,k,n=1)=>{o[k]=(o[k]??0)+n;};
function run(speed,seed){
 const M=Object.fromEntries(SEG.map(k=>[k,blank()]));
 let seg='first15',tickAt=0,acted=true,clock=0;const recent=[],seen=new Set();M.first15.start=0;
 const proxy={...g,
  tick:(s,now)=>{if(!acted)M[seg].idleMs+=now-tickAt;tickAt=now;acted=false;clock=now;const e=s.energy,r=g.tick(s,now);if(s.energy>e)add(M[seg].energyIn,'refill',s.energy-e);return r;},
  act:(s,a,now)=>{
   const m=M[seg],e0=s.energy,c0=s.coins,r=g.act(s,a,now);if(!r.ok)return r;acted=true;
   add(m.acts,r.event);
   if(r.event==='produce'){const x=s.board[r.index];add(m.taps,a.id);add(m.tapTier,x.family+x.tier);}
   // energy in: a stage's reward, an order's own energy, a ration, the shop, cargo jars; any other rise
   // is a level-up (levels pay energy, whatever action brought the XP)
   const de=s.energy-e0;if(de<0)m.energyOut-=de;else if(de>0){const own={restore:de,ration:de,shop:de,daily:de,unseal:de}[r.event],order=r.event==='deliver'?Math.min(de,r.energy??0):0;
    if(own)add(m.energyIn,r.event==='restore'?'stage':r.event==='unseal'?'cargo':r.event,own);else{if(order)add(m.energyIn,'order',order);if(de-order>0)add(m.energyIn,'levelUp',de-order);}}
   const dc=s.coins-c0;if(dc>0)m.coinsIn+=dc;else if(dc<0){m.coinsOut-=dc;add(m.rewards,'spent:'+r.event,-dc);}
   if(r.event==='restore'){m.stages++;for(const k of ['copy','kit','token','cog'])if(r.effects?.[k]!==undefined)add(m.rewards,k);}
   if(r.event==='unseal'&&r.opened)add(m.rewards,'cargo:'+(r.opened.type==='item'?'part':r.opened.type));
   return r;}};
 const onStep=(s,now)=>{
  const m=M[seg];
  for(const o of s.orders)if(o&&!seen.has(o.id)){seen.add(o.id);if(o.story)continue;
   const key=o.needs.map(r=>r.family+r.tier+'x'+r.count).sort().join('+'),loose=o.needs.map(r=>r.family+r.tier).sort().join('+');
   m.orders++;m.keys.add(loose);if(recent.slice(-4).includes(loose))m.repeats++;recent.push(loose);
   if(g.orderItems(s,o))m.readyAtBirth++;
   const have=o.needs.reduce((n,r)=>n+Math.min(r.count,g.count(s,r)),0),want=o.needs.reduce((n,r)=>n+r.count,0);m.ownedAtBirth+=have/want;}
  const k=segOf(s,now);if(k!==seg){m.end=now;seg=k;M[k].start=now;}
 };
 const res=simulate(proxy,nextAction,speed,seed,{until:14*3600e3,shop:SHOP,onStep,finish:s=>g.allDone(s)});
 M[seg].end=res.total;
 const out={speed,seed,shop:SHOP,finished:res.finished,totalMin:r1(res.total/MIN),activeMin:r1(res.active/MIN),waitMin:r1(res.idle/MIN),bought:res.bought,rations:res.rations};
 for(const k of SEG){const m=M[k];if(m.start===null)continue;const span=(m.end-m.start)/MIN,taps=Object.values(m.taps).reduce((a,b)=>a+b,0);
  const tier0=Object.entries(m.tapTier).filter(([k])=>k.endsWith('0')).reduce((a,[,n])=>a+n,0);
  out[k]={min:r1(span),activeMin:r1(span-m.idleMs/MIN),waitMin:r1(m.idleMs/MIN),taps,merges:m.acts.merge??0,deliveries:m.acts.deliver??0,stages:m.stages,unseals:m.acts.unseal??0,
   energyOut:m.energyOut,energyIn:m.energyIn,tapsPerStage:m.stages?r1(taps/m.stages):null,coinsIn:m.coinsIn,coinsOut:m.coinsOut,rewards:m.rewards,
   orders:m.orders,repeatPct:m.orders?Math.round(100*m.repeats/m.orders):0,distinctOrders:m.keys.size,readyAtBirthPct:m.orders?Math.round(100*m.readyAtBirth/m.orders):0,ownedAtBirthPct:m.orders?Math.round(100*m.ownedAtBirth/m.orders):0,
   tapsBy:m.taps,tier0Pct:taps?Math.round(100*tier0/taps):0};}
 return out;
}
for(const speed of SPEEDS)for(const seed of SEEDS)console.log(JSON.stringify(run(speed,seed)));
