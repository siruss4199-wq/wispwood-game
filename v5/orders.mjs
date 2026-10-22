// Optional crew orders: an outlet for spare parts that pays energy (the fuel
// for producer taps) and, now and then, a supply case. Deterministic, never
// rerolled once shown, never asks for a locked producer or the task's items.
import {TASKS} from './chapter.mjs';
export const LANES=['quick','crew'];
const WHO=['Ivo','Neri','Tamsin','Bram'];
const WHY={rig:'needs tools for the camp',chart:'needs charts for the scouts',flux:'needs charged parts for the lamps'};
const ENERGY=[2,3,5];

export const unlockedFamilies=s=>['rig','chart','flux'].filter(f=>s.producers?.[f]?.unlocked);
export const ordersOpen=s=>s.task>=2;
const matches=(x,r)=>x?.type==='item'&&x.family===r.family&&x.tier===r.tier;

// Everything the current task could take (both crossing options while undecided).
export const heldNeeds=s=>{const t=TASKS[s.task];return t?.choices?Object.values(t.choices).flatMap(c=>c.needs):t?.needs??[];};
// The current task keeps the first matching copies it needs; spares stay free.
export function reservedItems(s){
 const kept=new Set();
 for(const r of heldNeeds(s))for(let n=0;n<r.count;n++){
  const i=s.board.findIndex((x,i)=>!kept.has(i)&&matches(x,r));if(i>=0)kept.add(i);
 }
 return kept;
}

export function orderProgress(s,o){
 const kept=reservedItems(s),used=new Set(),indices=[];
 const progress=o.needs.map(r=>{
  const usable=s.board.flatMap((x,i)=>matches(x,r)&&!kept.has(i)&&!used.has(i)?[i]:[]).slice(0,r.count);
  usable.forEach(i=>{used.add(i);indices.push(i);});
  return {...r,current:usable.length,held:s.board.some((x,i)=>matches(x,r)&&kept.has(i))};
 });
 return {progress,indices,ready:progress.every(r=>r.current>=r.count)};
}

function maxTier(s){return s.task<4?1:2;}

export function syncOrders(s){
 if(!ordersOpen(s))return s.orders.lanes.filter(Boolean);
 const fams=unlockedFamilies(s);
 const taskKeys=new Set(heldNeeds(s).map(r=>r.family+':'+r.tier));
 for(let lane=0;lane<LANES.length;lane++){
  if(s.orders.lanes[lane])continue;
  const n=s.orders.seq[lane];
  const other=s.orders.lanes.find(Boolean)?.needs[0];
  const tiers=lane===0?[n%2,1-n%2]:[1+n%2,1,2,0];
  const options=[];
  for(const [fi,family] of fams.map((f,i)=>[i,f]))for(const [ti,tier] of tiers.entries()){
   if(tier>maxTier(s))continue;
   const key=family+':'+tier;
   const rotated=(fi-(n+lane)%fams.length+fams.length)%fams.length;
   options.push({family,tier,score:rotated*10+ti*3+(taskKeys.has(key)?50:0)+(other&&other.family===family&&other.tier===tier?100:0)});
  }
  options.sort((a,b)=>a.score-b.score);
  const {family,tier}=options[0];
  const count=lane===0&&tier===0?2:1;
  const supplyCase=lane===1&&n%3===2?{rig:'salvage',chart:'survey',flux:'relic'}[family]:null;
  s.orders.lanes[lane]={id:lane+':'+n,lane:LANES[lane],who:WHO[(n*2+lane)%WHO.length],why:WHY[family],needs:[{family,tier,count}],energy:ENERGY[tier]+(count>1?1:0),...(supplyCase?{case:supplyCase}:{})};
 }
 return s.orders.lanes.filter(Boolean);
}

export function freshOrders(){return {lanes:[null,null],seq:[0,0],completed:0};}
export function validOrders(old){
 const o=old&&typeof old==='object'?old:{};
 const seq=Array.isArray(o.seq)&&o.seq.length===2&&o.seq.every(n=>Number.isSafeInteger(n)&&n>=0)?o.seq:[0,0];
 const lanes=Array.isArray(o.lanes)&&o.lanes.length===2?o.lanes.map((x,i)=>x&&x.id===i+':'+seq[i]&&Array.isArray(x.needs)&&x.needs.length===1&&['rig','chart','flux'].includes(x.needs[0].family)&&Number.isInteger(x.needs[0].tier)&&x.needs[0].tier>=0&&x.needs[0].tier<=2&&[1,2].includes(x.needs[0].count)&&Number.isInteger(x.energy)&&x.energy>0&&x.energy<=20?x:null):[null,null];
 return {lanes,seq,completed:Number.isSafeInteger(o.completed)&&o.completed>=0?o.completed:0};
}
