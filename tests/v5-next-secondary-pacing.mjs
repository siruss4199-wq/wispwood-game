// Secondary-chain pilot: where the time goes (round 2, 2026-10-29; docs/V5_SECONDARY_PILOT_2026-10-29.md).
// The pilot metrics (v5-next-secondary-pilot-metrics.mjs) compare totals; this script takes each run
// of the scripted player apart, baseline (secondary chains off) against model B, seed by seed:
// - time: active minutes (the player acting: each action takes the speed, jittered) and energy
//   waiting (nothing to do and no energy left);
// - actions: producer taps, merges (primary parts, secondary parts, generators/cogs/tokens/crates),
//   orders delivered (primary-only, with a secondary part, gold), stage purchases, shed moves,
//   clears, book ticks, cargo opened, shop and ration;
// - energy in: the 2-minute refill, level-ups, the shop, rations, and energy found by other actions
//   (named by the action: jars from cargo, a Sea chest merged, ...);
// - coins in (primary orders, secondary orders, gold orders, book, other) and out (stages, shop);
// - when each stage was bought.
//   node tests/v5-next-secondary-pacing.mjs [speeds=4,5,8,10] [seeds=1..10] [shop|noshop|both] [models=off,bonus] [--runs] [key=value ...]
// Prints one JSON row per configuration (medians, quartiles, min/max over the seeds, and the per-seed
// difference against the first model); --runs prints every run as well. key=value as in the pilot metrics.
import * as g from '../v5/next/game.mjs';
import {nextAction} from './v5-next-policy.mjs';
import {simulate} from './v5-next-economy-sim.mjs';
const args=process.argv.slice(2),flags=new Set(args.filter(a=>a.startsWith('--'))),pos=args.filter(a=>!a.startsWith('--')&&!a.includes('='));
const SPEEDS=(pos[0]??'4,5,8,10').split(',').map(Number),SEEDS=(pos[1]??'1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
const SHOPS={shop:[true],noshop:[false],both:[false,true]}[pos[2]??'both'],MODELS=(pos[3]??'off,bonus').split(',');
const OVER=Object.fromEntries(args.filter(a=>a.includes('=')).map(a=>a.split('=')).map(([k,v])=>[k,+v]));
const RULE_KEYS=['chance','pity','first','orders','taps','hold'],ORDER_KEYS=['every','top','rarity'];
for(const k of ORDER_KEYS)if(k in OVER)g.SECONDARY_ORDERS[k]=OVER[k];
const MIN=60000,DEFAULT=structuredClone(g.SECONDARY_RULES),sec=f=>g.isSecondary(f);
const r1=x=>x===null?null:Math.round(x*10)/10;
function run(model,speed,seed,shop){
 for(const k of Object.keys(DEFAULT))Object.assign(g.SECONDARY_RULES[k],DEFAULT[k],{model,salt:DEFAULT[k].salt+seed*1009},Object.fromEntries(RULE_KEYS.filter(r=>r in OVER).map(r=>[r,OVER[r]])));
 const n={},add=(o,k,v=1)=>{o[k]=(o[k]??0)+v;};
 const energyIn={},coinsIn={},coinsOut={},stages=[];let end=null;
 const kindOf=(s,a)=>{
  if(a.type==='merge'){const x=s.board[a.from],y=s.board[a.to];if(x?.type==='item'&&y?.type==='item')return sec(x.family)?'mergeSecondary':'mergePrimary';return 'mergeOther';}
  if(a.type==='deliver'){const o=s.orders.find(o=>o?.id===a.id);return o?.story?'deliverGold':o?.needs.some(r=>sec(r.family))?'deliverSecondary':'deliverPrimary';}
  if(a.type==='store'||a.type==='unstore')return 'shed';
  if(a.type==='book'||a.type==='bookPage')return 'book';
  if(a.type==='unseal'||a.type==='openKit')return 'cargo';
  return a.type;};
 const proxy={...g,
  tick:(s,now)=>{const e=s.energy,r=g.tick(s,now);if(s.energy>e)add(energyIn,'refill',s.energy-e);return r;},
  act:(s,a,now)=>{
   const kind=kindOf(s,a),e=s.energy,c=s.coins,lv=g.levelOf(s),r=g.act(s,a,now);if(!r.ok)return r;
   add(n,kind);
   const de=s.energy-e+(a.type==='produce'?1:0),dc=s.coins-c;
   if(de>0)add(energyIn,g.levelOf(s)>lv?'levelUp':a.type==='buy'?'shop':kind,de);
   if(dc>0)add(coinsIn,kind==='deliverPrimary'?'primaryOrders':kind==='deliverSecondary'?'secondaryOrders':kind==='deliverGold'?'goldOrders':kind==='book'?'book':'other',dc);
   if(dc<0)add(coinsOut,a.type==='restore'?'stages':a.type==='buy'?'shop':'other',-dc);
   if(r.event==='restore')stages.push(r1(now/MIN));
   return r;}};
 const res=simulate(proxy,nextAction,speed,seed,{until:16*3600e3,shop,onStep:s=>{end=s;},finish:s=>g.allDone(s)});
 const active=(res.total-res.idle)/MIN;
 return {model,speed,shop,seed,finished:res.finished,totalMin:r1(res.total/MIN),activeMin:r1(active),waitMin:r1(res.idle/MIN),waitShare:Math.round(res.idle/res.total*100)/100,
  actions:n,energyIn,coinsIn,coinsOut,stages,level:g.levelOf(end),coinsLeft:end.coins,energyLeft:end.energy};
}
const q=(v,p)=>{const b=[...v].sort((a,b)=>a-b);return b[Math.min(b.length-1,Math.floor((b.length-1)*p+.5))];};
const stat=v=>({med:r1(q(v,.5)),q1:r1(q(v,.25)),q3:r1(q(v,.75)),min:r1(Math.min(...v)),max:r1(Math.max(...v))});
const pick=(R,f)=>R.map(f).map(x=>x??0);
for(const shop of SHOPS)for(const speed of SPEEDS){
 const by={};
 for(const model of MODELS){
  const R=SEEDS.map(seed=>run(model,speed,seed,shop));by[model]=R;
  if(flags.has('--runs'))for(const r of R)console.log(JSON.stringify({run:1,...r}));
  const keys=new Set(R.flatMap(r=>Object.keys(r.actions))),eKeys=new Set(R.flatMap(r=>Object.keys(r.energyIn))),cKeys=new Set(R.flatMap(r=>Object.keys(r.coinsIn)));
  const row={model,speed,shop,seeds:SEEDS.length,finished:R.filter(r=>r.finished).length,
   totalMin:stat(pick(R,r=>r.totalMin)),activeMin:stat(pick(R,r=>r.activeMin)),waitMin:stat(pick(R,r=>r.waitMin)),waitShare:stat(pick(R,r=>r.waitShare)),
   actions:Object.fromEntries([...keys].sort().map(k=>[k,r1(q(pick(R,r=>r.actions[k]),.5))])),
   energyIn:Object.fromEntries([...eKeys].sort().map(k=>[k,r1(q(pick(R,r=>r.energyIn[k]),.5))])),
   coinsIn:Object.fromEntries([...cKeys].sort().map(k=>[k,r1(q(pick(R,r=>r.coinsIn[k]),.5))])),
   stagesAt:Object.fromEntries([3,6,9,12,15,18,21,24,27,30].map(i=>[i,r1(q(R.map(r=>r.stages[i-1]??Infinity),.5))]))};
  const base=by[MODELS[0]];
  if(model!==MODELS[0]){const d=f=>R.map((r,i)=>r1(f(r)-f(base[i])));row.perSeed={totalMin:d(r=>r.totalMin),activeMin:d(r=>r.activeMin),waitMin:d(r=>r.waitMin),taps:d(r=>r.actions.produce??0)};}
  console.log(JSON.stringify(row));
 }
}
