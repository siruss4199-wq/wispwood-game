import {AREA,CELL_COUNT,CHAINS,FOREST_ORDERS,MAX_TIER,PRODUCERS,RESTORATION_PROJECTS,SIZE} from './catalog.mjs';
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
 if(reveal.type==='item')c.content={type:'item',chain:reveal.item.chain,tier:reveal.item.tier};
 state.cratesOpened++;
 return {type:'crate_opened',index,reveal};
}
function openOneFrontierCrateInPlace(state,near){
 const list=frontierCrates(state)
  .filter(i=>state.cells[i].reveal?.type!=='producer')
  .sort((a,b)=>manhattan(a,near)-manhattan(b,near)||a-b);
 return list.length?revealCellInPlace(state,list[0]):null;
}
function ensureCapacityInPlace(state,near){
 const events=[];
 if(!producerIndices(state).length||mergeablePair(state))return events;
 while(openEmptyIndices(state).length<2){
  const candidates=frontierCrates(state)
   .filter(i=>state.cells[i].reveal?.type!=='producer')
   .sort((a,b)=>manhattan(a,near)-manhattan(b,near)||a-b);
  if(!candidates.length)break;
  const index=candidates[0];
  state.cells[index].reveal={type:'empty'};
  const e=revealCellInPlace(state,index);
  if(!e)break;
  events.push({...e,safety:true});
 }
 return events;
}

export function currentRequest(state){
 return FOREST_ORDERS[state.orderIndex%FOREST_ORDERS.length]??null;
}
export function currentProject(state){
 return RESTORATION_PROJECTS[state.projectIndex]??null;
}
export function areaProgress(state){
 return Math.min(100,state.completedProjectIds.length*25);
}
export function restorationStatus(state){
 const p=currentProject(state);
 if(!p)return {complete:true,progress:100,project:null,coinsReady:true,lightReady:true};
 return {
  complete:false,
  progress:areaProgress(state),
  project:p,
  coinsReady:state.coins>=p.coinCost,
  lightReady:state.forestLight>=p.lightRequired
 };
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
  const e=openOneFrontierCrateInPlace(next,to);if(e)events.push(e);
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
  return out(state,[],false,'That item does not complete the current order.');
 }
 const next=cloneState(state);
 next.cells[index].content=null;
 next.ordersCompleted++;
 next.orderIndex=(next.orderIndex+1)%FOREST_ORDERS.length;
 next.coins+=q.rewardCoins;
 next.forestLight+=q.rewardLight;
 next.energy=Math.min(next.maxEnergy,next.energy+q.rewardEnergy);
 const events=[
  {type:'order_completed',orderId:q.id},
  {type:'coins_earned',amount:q.rewardCoins},
  {type:'light_earned',amount:q.rewardLight},
  {type:'energy_reward',amount:q.rewardEnergy}
 ];
 events.push(...ensureCapacityInPlace(next,index));
 return out(next,events);
}

export function restoreProject(state,index){
 const project=currentProject(state);
 if(!project)return out(state,[],false,AREA.title+' is already fully restored.');
 if(!isOpen(state,index))return out(state,[],false,'Select the required crafted item.');
 const item=state.cells[index].content;
 if(!item||item.type!=='item'||item.chain!==project.chain||item.tier!==project.tier){
  return out(state,[],false,'This restoration needs the required crafted item.');
 }
 if(state.coins<project.coinCost)return out(state,[],false,'Earn '+(project.coinCost-state.coins)+' more Coins.');
 if(state.forestLight<project.lightRequired)return out(state,[],false,'Earn '+(project.lightRequired-state.forestLight)+' more Forest Light.');

 const next=cloneState(state);
 next.cells[index].content=null;
 next.coins-=project.coinCost;
 next.completedProjectIds=[...next.completedProjectIds,project.id];
 next.projectIndex++;
 const progress=areaProgress(next);
 const events=[
  {type:'project_restored',projectId:project.id,title:project.title,icon:project.icon,progress},
  {type:'coins_spent',amount:project.coinCost}
 ];
 if(next.projectIndex>=RESTORATION_PROJECTS.length){
  next.rescued=true;
  next.nextAreaUnlocked=true;
  next.phase='area_complete';
  events.push({type:'area_restored',areaId:AREA.id,nextArea:AREA.nextArea});
  events.push({type:'mivra_rescued'});
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
 if(state.coins<0)errors.push('coins-range');
 if(state.forestLight<0)errors.push('light-range');
 if(!Number.isInteger(state.projectIndex)||state.projectIndex<0||state.projectIndex>RESTORATION_PROJECTS.length)errors.push('project-index');
 if(!Array.isArray(state.completedProjectIds))errors.push('project-history');
 state.cells.forEach((c,i)=>{
  if(!['crate','open'].includes(c.terrain))errors.push('terrain:'+i);
  if(c.content?.type==='item'&&!CHAINS[c.content.chain]?.[c.content.tier])errors.push('item:'+i);
  if(c.content?.type==='producer'&&!PRODUCERS[c.content.producerId])errors.push('producer:'+i);
 });
 return errors;
}
