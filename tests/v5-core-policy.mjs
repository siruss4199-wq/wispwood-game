// Scripted player for the version-6 core loop: deliver what is ready, merge
// toward the current task, open cases, tap the producer the task needs, use
// crew orders for spares, recycle clutter, take a meal only at zero energy.
import {act,currentTask,taskNeeds,count,MAX_TIER} from '../v5/core.mjs';
import {heldNeeds,orderProgress} from '../v5/orders.mjs';

const items=s=>s.board.flatMap((x,i)=>x?.type==='item'?[{...x,i}]:[]);
const free=s=>s.board.filter(x=>x===null).length;

// Raw-part equivalents still missing for one need, counting what is on the board.
function missing(s,r){
 let want=r.count*2**r.tier;
 for(const x of items(s))if(x.family===r.family&&x.tier<=r.tier)want-=2**x.tier;
 return Math.max(0,want);
}

export function nextAction(s,{route='ridge'}={}){
 const t=currentTask(s);
 if(t){
  const choice=t.choices?route:undefined;
  const needs=t.choices?t.choices[route].needs:t.needs;
  if(needs.every(r=>count(s,r)>=r.count))return {type:'task',choice};
 }
 const needs=t?(t.choices?t.choices[route].needs:t.needs):[];
 const orderNeeds=s.orders.lanes.filter(Boolean).flatMap(o=>o.needs);
 // Merge pairs below a tier something asks for; task families first.
 const wanted=[...needs,...orderNeeds];
 const pairs=[];
 for(const x of items(s)){
  if(x.tier>=MAX_TIER)continue;
  const y=items(s).find(y=>y.i>x.i&&y.family===x.family&&y.tier===x.tier);
  if(!y)continue;
  const goal=wanted.find(r=>r.family===x.family&&r.tier>x.tier);
  const surplus=needs.find(r=>r.family===x.family&&r.tier===x.tier)?count(s,x)>needs.filter(r=>r.family===x.family&&r.tier===x.tier).reduce((n,r)=>n+r.count,0)+1:true;
  if(goal&&surplus)pairs.push({x,y,score:(needs.includes(goal)?0:10)+x.tier});
  else if(free(s)<6)pairs.push({x,y,score:50+x.tier});
 }
 pairs.sort((a,b)=>a.score-b.score);
 if(pairs[0]?.score<10)return {type:'merge',from:pairs[0].x.i,to:pairs[0].y.i};
 for(const o of s.orders.lanes)if(o&&orderProgress(s,o).ready)return {type:'order',id:o.id};
 if(pairs.length)return {type:'merge',from:pairs[0].x.i,to:pairs[0].y.i};
 const crate=s.board.findIndex(x=>x?.type==='crate');
 if(crate>=0&&free(s)>=2)return {type:'open',index:crate};
 if(s.energy<1)return {type:'meal'};
 // Tap for the first unmet task need, else for an order, else any producer.
 const lack=needs.find(r=>count(s,r)<r.count&&missing(s,r)>0&&s.producers[r.family].unlocked);
 const ord=orderNeeds.find(r=>s.producers[r.family].unlocked&&missing(s,r)>0);
 const family=lack?.family??(needs.some(r=>count(s,r)<r.count)?null:ord?.family)??null;
 if(family&&free(s)>0)return {type:'produce',id:family};
 // Board full: recycle a part nothing is asking for.
 const keep=new Set([...needs,...orderNeeds,...heldNeeds(s)].map(r=>r.family+':'+r.tier));
 const junk=items(s).filter(x=>!keep.has(x.family+':'+x.tier)).sort((a,b)=>b.tier-a.tier)[0]??items(s)[0];
 if(junk)return {type:'recycle',index:junk.i};
 return null;
}

// Play until `until(s)` or the step budget runs out; returns a trace summary.
export function play(s,{route='ridge',until=s=>!currentTask(s),max=3000,now=0}={}){
 const log=[],taskAt=[];let fails=0;
 for(let step=0;step<max&&!until(s);step++){
  const a=nextAction(s,{route});
  if(!a)return {stuck:true,step,log,taskAt,fails};
  const r=act(s,a,now+step*1000);
  if(!r.ok){fails++;if(fails>50)return {stuck:true,step,reason:r.message,action:a,log,taskAt,fails};continue;}
  log.push(a.type);
  if(a.type==='task')taskAt.push({task:r.task.id,step:log.length});
 }
 return {stuck:!until(s),log,taskAt,fails};
}
