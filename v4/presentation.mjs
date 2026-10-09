import {producerStage} from './core/catalog.mjs';
import {orderReady,requirementProgress} from './core/engine.mjs';
import {requestBonus} from './core/requests.mjs';

// Selection affects presentation only: no rerolls, expiry or inventory mutations.
export function shelfOrders(state,focusedId=null,now=Date.now()){
 const score=o=>{
  const progress=requirementProgress(state,o.requirements);
  const fraction=progress.reduce((n,r)=>n+Math.min(r.current,r.count)/r.count,0)/progress.length;
  return (o.id===focusedId?1000:0)+(orderReady(state,o)?500:0)+(requestBonus(o,now)>0?200:0)+fraction*100;
 };
 return [...state.activeOrders].sort((a,b)=>score(b)-score(a)||a.slot-b.slot).slice(0,3).sort((a,b)=>a.slot-b.slot);
}
export function shelfAction(state,order){
 return orderReady(state,order)?state.ordersCompleted>0?'deliver':'confirm':'focus';
}
export function itemHierarchy(tier){return tier<3?'raw':tier<6?'crafted':tier<8?'treasure':'heirloom';}
export function producerVisual(state,id){
 const level=Math.max(1,Math.min(5,state.producerLevels[id]??1));
 return {level,stage:producerStage(state,id),asset:`${id}-upgrade-${level}`};
}
export function frontierVariant(index){return (Math.floor(index/8)*3+index%8)%6;}
