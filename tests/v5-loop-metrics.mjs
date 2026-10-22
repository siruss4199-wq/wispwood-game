// Pacing metrics for the version-6 loop (JSON on stdout). A design aid, not a
// substitute for human playtests: the scripted players merge eagerly.
import {fresh,act,currentTask} from '../v5/core.mjs';
import {TASKS} from '../v5/chapter.mjs';
import {reservedItems} from '../v5/orders.mjs';
import {suggest} from '../v5/guide.mjs';
import {nextAction} from './v5-core-policy.mjs';

function guided(s){
 const g=suggest(s);
 return g.kind==='task'?{type:'task',choice:g.choice}:g.kind==='merge'?{type:'merge',from:g.cells[0],to:g.cells[1]}:g.kind==='order'?{type:'order',id:g.id}:
  g.kind==='open'?{type:'open',index:g.cells[0]}:g.kind==='produce'?{type:'produce',id:s.board[g.cells[0]].id}:g.kind==='meal'?{type:'meal'}:
  g.kind==='recycle'?{type:'recycle',index:s.board.findIndex((x,i)=>x?.type==='item'&&!reservedItems(s).has(i))}:null;
}
function run(label,choose){
 const s=fresh(0),tasks=[],count={};let minEnergy=s.energy,maxItems=0,step=0;
 for(;step<1000&&currentTask(s);step++){
  const a=choose(s);if(!a)break;
  const r=act(s,a,step);if(!r.ok)return {label,error:r.message,step};
  count[a.type]=(count[a.type]??0)+1;
  minEnergy=Math.min(minEnergy,s.energy);maxItems=Math.max(maxItems,s.board.filter(x=>x?.type==='item').length);
  if(r.event==='task')tasks.push({task:r.task.id,action:step+1,energy:s.energy});
 }
 const vault=tasks.find(t=>t.task==='vault')?.action;
 return {label,finished:s.task===TASKS.length,actions:step,actionsToVault:vault,actionCounts:count,minEnergy,maxItemsOnBoard:maxItems,tasks};
}
console.log(JSON.stringify([
 run('policy-ridge',s=>nextAction(s,{route:'ridge'})),
 run('policy-conduit',s=>nextAction(s,{route:'conduit'})),
 run('follows-suggestion',guided)
],null,1));
