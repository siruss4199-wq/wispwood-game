import {CELL_COUNT,CHAINS,CHAPTER_QUESTS,FOREST_ORDERS,MAX_TIER,PRODUCERS,SIZE} from './catalog.mjs';
import {FIRST_REVEALS,cloneState} from './state.mjs';

const out=(state,events=[],ok=true,reason=null)=>({ok,reason,state,events});

export function neighbors(index){
 const r=Math.floor(index/SIZE),c=index%SIZE,a=[];
 if(r>0)a.push(index-SIZE);if(r<SIZE-1)a.push(index+SIZE);
 if(c>0)a.push(index-1);if(c<SIZE-1)a.push(index+1);
 return a;
}
export function isOpen(state,index){return Number.isInteger(index)&&index>=0&&index<CELL_COUNT&&state.cells[index].terrain==='open';}
export function openEmptyIndices(state){return state.cells.flatMap((c,i)=>c.terrain==='open'&&c.content===null?[i]:[]);}
export function producerIndices(state){return state.cells.flatMap((c,i)=>c.content?.type==='producer'?[i]:[]);}
export function mergeablePair(state){
 const seen=new Map();
 for(let i=0;i<state.cells.length;i++){
  const c=state.cells[i],x=c.content;
  if(c.terrain!=='open'||x?.type!=='item'||x.tier>=MAX_TIER)continue;
  const k=x.chain+':'+x.tier;
  if(seen.has(k))return [seen.get(k),i];
  seen.set(k,i);
 }
 return null;
}
export function frontierCrates(state){
 return state.cells.flatMap((c,i)=>c.terrain==='crate'&&neighbors(i).some(n=>state.cells[n].terrain==='open')?[i]:[]);
}
const manhattan=(a,b)=>Math.abs(Math.floor(a/SIZE)-Math.floor(b/SIZE))+Math.abs(a%SIZE-b%SIZE);

function revealCellInPlace(state,index){
 const c=state.cells[index];
 if(!c||c.terrain!=='crate')return null;
 const reveal=c.reveal??{type:'empty'};
 c.terrain='open';c.reveal=null;c.content=null;
 if(reveal.type==='producer')c.content={type:'producer',producerId:reveal.producerId};
 state.cratesOpened++;
 return {type:'crate_opened',index,reveal};
}
function openOneFrontierEmptyInPlace(state,near){
 const list=frontierCrates(state)
  .filter(i=>state.cells[i].reveal?.type!=='producer')
  .sort((a,b)=>manhattan(a,near)-manhattan(b,near)||a-b);
 return list.length?revealCellInPlace(state,list[0]):null;
}
function ensureCapacityInPlace(state,near){
 const events=[];
 if(!producerIndices(state).length||mergeablePair(state))return events;
 while(openEmptyIndices(state).length<2){
  const e=openOneFrontierEmptyInPlace(state,near);
  if(!e)break;
  events.push({...e,safety:true});
 }
 return events;
}

export function currentRequest(state){
 if(!state.rescued){
  return CHAPTER_QUESTS[Math.min(state.chapterQuestIndex,CHAPTER_QUESTS.length-1)]??null;
 }
 return FOREST_ORDERS[state.orderIndex%FOREST_ORDERS.length]??null;
}

export function requestProgress(state){
 return state.rescued
  ? {mode:'orders',current:(state.orderIndex%FOREST_ORDERS.length)+1,total:FOREST_ORDERS.length,completed:state.ordersCompleted}
  : {mode:'chapter',current:Math.min(state.chapterQuestIndex+1,CHAPTER_QUESTS.length),total:CHAPTER_QUESTS.length,completed:state.completedQuestIds.length};
}

export function move(state,from,to){
 if(!isOpen(state,from)||!isOpen(state,to)||from===to)return out(state,[],false,'Move between different open cells.');
 if(!state.cells[from].content||state.cells[to].content)return out(state,[],false,'Move an item into an empty open cell.');
 const next=cloneState(state);
 next.cells[to].content=next.cells[from].content;next.cells[from].content=null;
 return out(next,[{type:'moved',from,to}]);
}

export function merge(state,from,to){
 if(!isOpen(state,from)||!isOpen(state,to)||from===to)return out(state,[],false,'Merge two different open cells.');
 const a=state.cells[from].content,b=state.cells[to].content;
 if(!a||!b||a.type!=='item'||b.type!=='item'||a.chain!==b.chain||a.tier!==b.tier||a.tier>=MAX_TIER){
  return out(state,[],false,'Drag two identical items together.');
 }
 const next=cloneState(state);
 next.cells[from].content=null;
 next.cells[to].content={type:'item',chain:b.chain,tier:b.tier+1};
 next.moves++;
 next.energy=Math.min(next.maxEnergy,next.energy+1);
 const events=[
  {type:'merged',from,to,item:structuredClone(next.cells[to].content)},
  {type:'energy_recovered',amount:1}
 ];

 if(next.phase==='first_merge'){
  const p=revealCellInPlace(next,FIRST_REVEALS.producer);
  const e=revealCellInPlace(next,FIRST_REVEALS.empty);
  if(p)events.push(p);if(e)events.push(e);
  next.phase='core';
 }else{
  const e=openOneFrontierEmptyInPlace(next,to);if(e)events.push(e);
 }
 events.push(...ensureCapacityInPlace(next,to));
 return out(next,events);
}

export function tapProducer(state,index){
 if(!isOpen(state,index))return out(state,[],false,'Producer is not available.');
 const x=state.cells[index].content;
 if(x?.type!=='producer')return out(state,[],false,'Tap a producer.');
 const def=PRODUCERS[x.producerId];
 if(state.energy<def.energyCost)return out(state,[],false,'Not enough Energy.');
 const empty=openEmptyIndices(state);
 if(!empty.length)return out(state,[],false,'Merge something to make space.');
 const next=cloneState(state),target=empty[0];
 next.cells[target].content={type:'item',chain:def.chain,tier:def.outputTier};
 next.energy-=def.energyCost;
 return out(next,[{type:'produced',producer:index,index:target,item:structuredClone(next.cells[target].content)}]);
}

export function deliver(state,index){
 if(!isOpen(state,index))return out(state,[],false,'Select an open item.');
 const item=state.cells[index].content,q=currentRequest(state);
 if(!q||!item||item.type!=='item'||item.chain!==q.chain||item.tier!==q.tier){
  return out(state,[],false,'That item does not complete the current request.');
 }
 const next=cloneState(state);
 next.cells[index].content=null;
 const events=[{type:'request_completed',requestId:q.id}];

 if(!next.rescued){
  next.completedQuestIds=[...next.completedQuestIds,q.id];
  next.chapterQuestIndex++;
  next.energy=Math.min(next.maxEnergy,next.energy+q.rewardEnergy);
  events.push({type:'energy_reward',amount:q.rewardEnergy});
  if(next.chapterQuestIndex>=CHAPTER_QUESTS.length){
   next.rescued=true;
   next.phase='orders';
   next.chapterQuestIndex=CHAPTER_QUESTS.length;
   events.push({type:'mivra_rescued'});
  }
 }else{
  next.ordersCompleted++;
  next.orderIndex=(next.orderIndex+1)%FOREST_ORDERS.length;
  next.energy=Math.min(next.maxEnergy,next.energy+q.rewardEnergy);
  events.push({type:'energy_reward',amount:q.rewardEnergy});
 }

 events.push(...ensureCapacityInPlace(next,index));
 return out(next,events);
}

export function recycle(state,index){
 if(!isOpen(state,index)||state.cells[index].content?.type!=='item')return out(state,[],false,'Only merge items can be recycled.');
 const next=cloneState(state);next.cells[index].content=null;
 return out(next,[{type:'recycled',index}]);
}

export function boardStatus(state){
 return {
  open:state.cells.filter(c=>c.terrain==='open').length,
  crates:state.cells.filter(c=>c.terrain==='crate').length,
  empty:openEmptyIndices(state).length,
  producers:producerIndices(state).length,
  pair:mergeablePair(state)
 };
}
export function validateState(state){
 const errors=[];
 if(!Array.isArray(state.cells)||state.cells.length!==CELL_COUNT)errors.push('board-size');
 if(state.energy<0||state.energy>state.maxEnergy)errors.push('energy-range');
 if(!Number.isInteger(state.chapterQuestIndex)||state.chapterQuestIndex<0||state.chapterQuestIndex>CHAPTER_QUESTS.length)errors.push('quest-index');
 if(!Array.isArray(state.completedQuestIds))errors.push('quest-history');
 state.cells.forEach((c,i)=>{
  if(!['crate','open'].includes(c.terrain))errors.push('terrain:'+i);
  if(c.content?.type==='item'&&!CHAINS[c.content.chain]?.[c.content.tier])errors.push('item:'+i);
  if(c.content?.type==='producer'&&!PRODUCERS[c.content.producerId])errors.push('producer:'+i);
 });
 return errors;
}
