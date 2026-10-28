// Coast Camp economy audit (Build 44): read-only measurements of the scripted player through
// Landing Beach, then the whole chapter (beach + worksite), at several speeds and seeds; one JSON
// line per area and speed. Nothing in the game is changed. The game root is an argument so a
// proposed variant (a copy of v5/ and tests/v5-next-policy.mjs) can be measured the same way:
//   node tests/v5-next-economy-audit.mjs [root=.] [speeds=3,5,8,12] [seeds=1,2,3,4,5]
// See docs/V5_ECONOMY_AUDIT_PROPOSAL_2026-10-24.md for what each field means.
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const repo=pathToFileURL(resolve(process.argv[2]??'.')).href;
const g=await import(repo+'/v5/next/game.mjs');const {nextAction}=await import(repo+'/tests/v5-next-policy.mjs');
const {CHAINS}=await import(repo+'/v5/next/chains.mjs');
const SPEEDS=(process.argv[3]??'3,5,8,12').split(',').map(Number),SEEDS=(process.argv[4]??'1,2,3,4,5').split(',').map(Number);
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const MIN=60000,q=(a,p)=>{if(!a.length)return NaN;const b=[...a].sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.floor(b.length*p))];};
const units=needs=>needs.reduce((n,r)=>n+r.count*2**r.tier,0);
function run(speed,seed,area){
 const rnd=mulberry(seed),s=g.fresh(0);let now=0,actions=0;
 const born=new Map(),orders=[],restores=[],income={regen:0,level:0,stage:0,jar:0,ration:0,shop:0,daily:0},free=[],full={blocked:0};
 let taps=0,lastRestoreOrders=0,lastRestoreTaps=0,lastRestoreT=0;const perRestore=[];
 const recent=[];let repeats=0,sameChainBoards=0,boards=0;
 const note=o=>{if(born.has(o.id))return;const have=o.needs.reduce((n,r)=>n+Math.min(r.count,g.count(s,r)),0),want=o.needs.reduce((n,r)=>n+r.count,0);
  born.set(o.id,{t:now,taps,actions,ownedFrac:have/want,readyAtBirth:!!g.orderItems(s,o)});
  const key=o.needs.map(r=>r.family+r.tier).sort().join('+');if(!o.story&&recent.slice(-4).includes(key))repeats++;if(!o.story)recent.push(key);
  const live=s.orders.filter(Boolean).filter(x=>!x.story);boards++;if(live.length>=3&&new Set(live.map(x=>x.needs[0].family)).size===1)sameChainBoards++;};
 const done=()=>area===0?s.area>=1:(s.area>=2||s.area===1&&g.areaDone(s));// worksite done (Build 47b: then the Vault door)
 while(now<10*3600e3&&!done()){
  const e0=s.energy;g.tick(s,now);income.regen+=s.energy-e0;
  for(const o of s.orders)if(o)note(o);
  let a=nextAction(s);
  if(!a&&s.energy<=3){const e1=s.energy;if(g.act(s,{type:'ration'},now).ok){income.ration+=s.energy-e1;continue;}}
  if(!a){now+=10000;continue;}
  const e1=s.energy,before=new Map(s.orders.map(o=>[o.id,o]));const r=g.act(s,a,now);if(!r.ok)throw new Error(r.message);
  actions++;now+=speed*1000*(.6+.8*rnd());
  const gained=s.energy-e1+(a.type==='produce'?1:0);
  if(gained>0){if(r.levelUp)income.level+=gained;else if(r.event==='restore')income.stage+=gained;else if(r.event==='unseal')income.jar+=gained;else if(r.event==='daily')income.daily+=gained;else if(r.event==='shop')income.shop+=gained;else income.level+=gained;}
  if(a.type==='produce')taps++;
  free.push(s.board.filter(x=>x===null).length);
  if(r.event==='deliver'){const o=before.get(a.id),b=born.get(o.id);orders.push({story:!!o.story,needs:o.needs,coins:o.coins,units:units(o.needs),mins:(now-b.t)/MIN,actions:actions-b.actions,tapsWhileLive:taps-b.taps,ownedFrac:b.ownedFrac,readyAtBirth:b.readyAtBirth,maxTier:Math.max(...o.needs.map(r=>r.tier)),parts:o.needs.length});}
  if(r.event==='restore'){const n=orders.length;perRestore.push({orders:n-lastRestoreOrders,taps:taps-lastRestoreTaps,mins:(now-lastRestoreT)/MIN});lastRestoreOrders=n;lastRestoreTaps=taps;lastRestoreT=now;restores.push(now);}
 }
 return {speed,seed,total:now/MIN,actions,taps,orders,perRestore,income,free,repeats,boards,sameChainBoards,finished:done(),coins:orders.reduce((n,o)=>n+o.coins,0)};
}
const out={};
for(const area of [0,1])for(const sp of SPEEDS){const R=SEEDS.map(sd=>run(sp,sd,area));
 const O=R.flatMap(r=>r.orders),E=O.filter(o=>!o.story),G=O.filter(o=>o.story),P=R.flatMap(r=>r.perRestore),mean=f=>R.reduce((a,r)=>a+f(r),0)/R.length;
 const row={area:area?'chapter (beach+worksite)':'beach',speed:sp,finished:R.every(r=>r.finished),realMin:+mean(r=>r.total).toFixed(0),actions:+mean(r=>r.actions).toFixed(0),taps:+mean(r=>r.taps).toFixed(0),orders:+mean(r=>r.orders.length).toFixed(1),
  everyday:{n:E.length,readyAtBirthPct:+(100*E.filter(o=>o.readyAtBirth).length/E.length).toFixed(1),ownedAtBirthMedian:+q(E.map(o=>o.ownedFrac),.5).toFixed(2),minsMedian:+q(E.map(o=>o.mins),.5).toFixed(1),minsP90:+q(E.map(o=>o.mins),.9).toFixed(1),actionsMedian:q(E.map(o=>o.actions),.5),unitsMedian:q(E.map(o=>o.units),.5),coinsMedian:q(E.map(o=>o.coins),.5),coinsPerUnit:+(E.reduce((a,o)=>a+o.coins,0)/E.reduce((a,o)=>a+o.units,0)).toFixed(2),twoPartPct:+(100*E.filter(o=>o.parts>1).length/E.length).toFixed(0),maxTierDist:Object.fromEntries([0,1,2,3,4,5].map(t=>[t,E.filter(o=>o.maxTier===t).length]).filter(([,n])=>n))},
  gold:{n:G.length,minsMedian:+q(G.map(o=>o.mins),.5).toFixed(1),unitsMedian:q(G.map(o=>o.units),.5),coinsMedian:q(G.map(o=>o.coins),.5),coinsPerUnit:+(G.reduce((a,o)=>a+o.coins,0)/Math.max(1,G.reduce((a,o)=>a+o.units,0))).toFixed(2)},
  perRestore:{ordersMedian:q(P.map(p=>p.orders),.5),tapsMedian:q(P.map(p=>p.taps),.5),minsMedian:+q(P.map(p=>p.mins),.5).toFixed(1),minsMax:+Math.max(...P.map(p=>p.mins)).toFixed(1)},
  energyIncomeMean:Object.fromEntries(Object.keys(R[0].income).map(k=>[k,+mean(r=>r.income[k]).toFixed(0)])),
  repeatOfLast4Pct:+(100*mean(r=>r.repeats/Math.max(1,r.orders.length))).toFixed(0),sameChainBoardPct:+(100*mean(r=>r.sameChainBoards/Math.max(1,r.boards))).toFixed(1),
  freeCellsMedian:q(R.flatMap(r=>r.free),.5),freeCellsP10:q(R.flatMap(r=>r.free),.1)};
 console.log(JSON.stringify(row));}
