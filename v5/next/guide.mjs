// The one primary action on the board screen (Build 41 M3, after PR #77's contextual objective,
// rewritten for Build 40): a ready order to deliver, else an affordable upgrade, else a pair to
// merge toward what an order wants, else the generator that makes it, else any pair, else why
// nothing can happen yet. Pure: the app draws it and the economy test checks it is never empty.
import {cargoKeys,matches,orderItems,count,nextTask,currentArea,sourceOpen,SOURCES,nameOf,GENERATOR_ORDER,nextKind,UNLOCK_LEVEL} from './game.mjs';
import {CHAINS,maxTier} from './chains.mjs';

const has=(s,id)=>s.board.some(x=>x?.type==='source'&&x.id===id);
// Two identical parts, below a wanted tier of a wanted chain when needs are given.
function pairFor(s,needs=null){
 const b=s.board,items=b.flatMap((x,i)=>x?.type==='item'&&x.tier<maxTier(x.family)?[i]:[]);
 for(const i of items){if(needs&&!needs.some(n=>n.family===b[i].family&&b[i].tier<n.tier))continue;const j=items.find(j=>j!==i&&b[j].family===b[i].family&&b[j].tier===b[i].tier);if(j!==undefined)return [i,j];}
 return null;
}
export function primaryAction(s,focus=null){
 // The gold order (the next stage's materials) comes first when it is ready.
 const ready=s.orders.find(o=>o.story&&orderItems(s,o))??s.orders.find(o=>orderItems(s,o));
 if(ready)return {kind:'deliver',id:ready.id,label:`✓ Deliver · +${ready.coins} coins`};
 const task=nextTask(s);
 if(task&&s.coins>=task.cost)return {kind:'upgrade',id:task.id,label:`Upgrade ${currentArea(s).name}: ${task.name}`};
 // Needs still missing, the tapped order's first.
 const first=focus??s.orders.find(o=>o.story)?.id;
 const orders=first?[s.orders.find(o=>o.id===first),...s.orders.filter(o=>o.id!==first)].filter(Boolean):s.orders;
 const needs=orders.flatMap(o=>o.needs.filter(r=>count(s,r)<r.count));
 const merge=pair=>({kind:'merge',cells:pair,label:`Drag a ${nameOf(s.board[pair[0]])} onto its twin`});
 // Order by order, so the tapped (or first) order's pair comes first.
 for(const o of orders){const p=pairFor(s,o.needs.filter(r=>count(s,r)<r.count));if(p)return merge(p);}
 const free=s.board.includes(null);
 const gen=needs.map(r=>CHAINS[r.family].gen).find(g=>sourceOpen(s,g))??GENERATOR_ORDER.find(g=>sourceOpen(s,g));
 if(gen&&free&&s.energy>=1){const index=s.board.findIndex(x=>x?.type==='source'&&x.id===gen);
  return {kind:'tap',index,id:gen,label:`Tap ${SOURCES[gen].name} for a ${CHAINS[gen].names[0]}`};}
 // A crate whose key is in hand.
 const key=cargoKeys(s).map(k=>[s.board.findIndex(x=>matches(x,k)),k.index]).find(([i])=>i>=0);
 if(key)return {kind:'unseal',cells:key,label:`Lay the ${nameOf(s.board[key[0]])} on its crate`};
 const any=pairFor(s);if(any)return merge(any);
 if(!free)return {kind:'space',label:'Board full · deliver, merge or store a part'};
 if(s.energy<1)return {kind:'energy',label:'Out of energy'};
 // Nothing to make: the next generator is the goal.
 const g=GENERATOR_ORDER.find(g=>has(s,g)&&nextKind(g)&&!has(s,nextKind(g)));
 if(g)return {kind:'level',id:g,label:`${SOURCES[g].name} Lv${UNLOCK_LEVEL} → ${SOURCES[nextKind(g)].name}`};
 return {kind:'orders',label:'Make the parts the crew orders want'};
}
