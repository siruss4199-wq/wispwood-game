import {CHAINS,CELL_COUNT,MAX_TIER,PRODUCERS,RESTORATION_NODES,SIZE,STORAGE_UPGRADES,itemDef} from './catalog.mjs';
import {FIRST_EMPTY,FIRST_TREE,cloneState} from './state.mjs';

const out=(state,events=[],ok=true,reason=null)=>({ok,reason,state,events});
export const isOpen=(s,i)=>Number.isInteger(i)&&i>=0&&i<CELL_COUNT&&s.cells[i].terrain==='open';
export const openEmptyIndices=s=>s.cells.flatMap((c,i)=>c.terrain==='open'&&!c.content?[i]:[]);
export const producerIndices=s=>s.cells.flatMap((c,i)=>c.content?.type==='producer'?[i]:[]);

export function neighbors(i){
 const r=Math.floor(i/SIZE),c=i%SIZE,a=[];
 if(r>0)a.push(i-SIZE);if(r<SIZE-1)a.push(i+SIZE);
 if(c>0)a.push(i-1);if(c<SIZE-1)a.push(i+1);
 return a;
}
export function frontierCrates(s){
 return s.cells.flatMap((c,i)=>c.terrain==='crate'&&neighbors(i).some(n=>s.cells[n].terrain==='open')?[i]:[]);
}
export function mergeablePair(s){
 const seen=new Map();
 for(let i=0;i<s.cells.length;i++){
  const x=s.cells[i].content;
  if(s.cells[i].terrain!=='open'||x?.type!=='item'||x.tier>=MAX_TIER)continue;
  const k=x.chain+':'+x.tier;
  if(seen.has(k))return [seen.get(k),i];
  seen.set(k,i);
 }
 return null;
}
export function unlockedProducerIds(s){
 return Object.values(PRODUCERS).filter(p=>s.restorationIndex>=p.unlockNode).map(p=>p.id);
}
function unlockProducersInPlace(s,events){
 for(const id of unlockedProducerIds(s)){
  if((s.producerLevels[id]??0)>0)continue;
  s.producerLevels[id]=1;
  const slot=openEmptyIndices(s)[0];
  if(Number.isInteger(slot)){
   s.cells[slot].content={type:'producer',producerId:id};
   events.push({type:'producer_unlocked',producerId:id,index:slot});
  }
 }
}
function revealInPlace(s,index){
 const c=s.cells[index];
 if(!c||c.terrain!=='crate')return null;
 const reveal=c.reveal??{type:'item',chain:'leaf',tier:0};
 c.terrain='open';c.reveal=null;c.content=null;
 if(reveal.type==='producer')c.content={type:'producer',producerId:reveal.producerId};
 if(reveal.type==='item')c.content={type:'item',chain:reveal.chain,tier:reveal.tier};
 return {type:'crate_opened',index,reveal};
}
function nearestFrontier(s,near){
 const ar=Math.floor(near/SIZE),ac=near%SIZE;
 return frontierCrates(s).sort((a,b)=>{
  const da=Math.abs(Math.floor(a/SIZE)-ar)+Math.abs(a%SIZE-ac);
  const db=Math.abs(Math.floor(b/SIZE)-ar)+Math.abs(b%SIZE-ac);
  return da-db||a-b;
 })[0];
}
function ensureCapacityInPlace(s,near,events){
 if(mergeablePair(s))return;
 while(openEmptyIndices(s).length<2&&frontierCrates(s).length){
  const index=nearestFrontier(s,near);
  s.cells[index].reveal={type:'empty'};
  const e=revealInPlace(s,index);if(e)events.push({...e,safety:true});
 }
}
function discoverInPlace(s,item,events){
 const k=item.chain+':'+item.tier;
 if(!s.discovered[k]){
  s.discovered[k]=true;
  s.coins+=5;
  events.push({type:'discovered',key:k,rewardCoins:5});
 }
}
function orderTierFor(s,slot){
 const base=Math.min(4,1+Math.floor(s.ordersCompleted/4));
 return Math.max(1,base+(slot===2?1:0));
}
function orderChainsFor(s){
 const ids=unlockedProducerIds(s);
 return ids.map(id=>PRODUCERS[id].chain);
}
function buildOrder(s,slot){
 const chains=orderChainsFor(s);
 const chain=chains[(s.nextOrderSerial+slot)%chains.length];
 const tier=Math.min(MAX_TIER-1,orderTierFor(s,slot));
 const serial=s.nextOrderSerial++;
 const item=itemDef(chain,tier);
 const multiplier=slot===0?1:slot===1?1.4:2;
 return {
  id:'order-'+serial,slot,
  label:slot===0?'Quick':slot===1?'Standard':'Story',
  requirements:[{chain,tier,count:1}],
  rewardCoins:Math.round((12+Math.pow(2,tier)*4)*multiplier),
  rewardLight:Math.max(1,Math.round((tier+1)*multiplier)),
  title:item.name+' Request'
 };
}
export function fillOrdersInPlace(s){
 while(s.activeOrders.length<3){
  const used=new Set(s.activeOrders.map(o=>o.slot));
  const slot=[0,1,2].find(x=>!used.has(x))??0;
  s.activeOrders.push(buildOrder(s,slot));
 }
 return s;
}
export function initializePlayableState(s){
 const next=cloneState(s);
 fillOrdersInPlace(next);
 return next;
}
export function currentRestoration(s){return RESTORATION_NODES[s.restorationIndex]??null;}
export function restorationProgress(s){return Math.round((s.completedRestorations.length/RESTORATION_NODES.length)*100);}

export function move(s,from,to){
 if(!isOpen(s,from)||!isOpen(s,to)||from===to)return out(s,[],false,'Move between different open cells.');
 if(!s.cells[from].content||s.cells[to].content)return out(s,[],false,'Move into an empty open cell.');
 const n=cloneState(s);n.cells[to].content=n.cells[from].content;n.cells[from].content=null;
 return out(n,[{type:'moved',from,to}]);
}
export function merge(s,from,to){
 if(!isOpen(s,from)||!isOpen(s,to)||from===to)return out(s,[],false,'Drag one matching item onto the other.');
 const a=s.cells[from].content,b=s.cells[to].content;
 if(!a||!b||a.type!=='item'||b.type!=='item'||a.chain!==b.chain||a.tier!==b.tier||a.tier>=MAX_TIER){
  return out(s,[],false,'Only identical merge items can combine.');
 }
 const n=cloneState(s),events=[];
 n.cells[from].content=null;n.cells[to].content={type:'item',chain:b.chain,tier:b.tier+1};
 n.moves++;n.energy=Math.min(n.maxEnergy,n.energy+1);
 discoverInPlace(n,n.cells[to].content,events);
 events.unshift({type:'merged',from,to,item:structuredClone(n.cells[to].content)});
 if(n.phase==='first_merge'){
  const p=revealInPlace(n,FIRST_TREE),e=revealInPlace(n,FIRST_EMPTY);
  if(p)events.push(p);if(e)events.push(e);n.phase='core';
 }else if(frontierCrates(n).length){
  const e=revealInPlace(n,nearestFrontier(n,to));if(e)events.push(e);
 }
 ensureCapacityInPlace(n,to,events);fillOrdersInPlace(n);
 return out(n,events);
}
export function tapProducer(s,index){
 if(!isOpen(s,index))return out(s,[],false,'Producer is not available.');
 const c=s.cells[index].content;
 if(c?.type!=='producer')return out(s,[],false,'Tap a producer.');
 const p=PRODUCERS[c.producerId],level=s.producerLevels[p.id]??0;
 if(level<=0)return out(s,[],false,'Producer is locked.');
 if(s.energy<p.energyCost)return out(s,[],false,'Not enough Energy.');
 const empty=openEmptyIndices(s);
 if(!empty.length)return out(s,[],false,'Merge or store something to make space.');
 const n=cloneState(s);
 const tier=Math.min(2,Math.floor((level-1)/2));
 const target=empty[0];
 n.cells[target].content={type:'item',chain:p.chain,tier};
 n.energy-=p.energyCost;
 discoverInPlace(n,n.cells[target].content,[]);
 return out(n,[{type:'produced',producerId:p.id,index:target,item:structuredClone(n.cells[target].content)}]);
}
function findBoardItem(s,req){
 return s.cells.findIndex(c=>c.content?.type==='item'&&c.content.chain===req.chain&&c.content.tier===req.tier);
}
export function completeOrder(s,orderId){
 const order=s.activeOrders.find(o=>o.id===orderId);
 if(!order)return out(s,[],false,'Order not found.');
 const indices=[];
 for(const req of order.requirements){
  for(let c=0;c<req.count;c++){
   const i=s.cells.findIndex((cell,index)=>!indices.includes(index)&&cell.content?.type==='item'&&cell.content.chain===req.chain&&cell.content.tier===req.tier);
   if(i<0)return out(s,[],false,'Required item is not ready.');
   indices.push(i);
  }
 }
 const n=cloneState(s);
 for(const i of indices)n.cells[i].content=null;
 n.coins+=order.rewardCoins;n.forestLight+=order.rewardLight;n.ordersCompleted++;
 n.activeOrders=n.activeOrders.filter(o=>o.id!==orderId);
 fillOrdersInPlace(n);
 const events=[{type:'order_completed',orderId,coins:order.rewardCoins,light:order.rewardLight}];
 ensureCapacityInPlace(n,indices[0]??0,events);
 return out(n,events);
}
export function restoreNode(s,itemIndex){
 const node=currentRestoration(s);
 if(!node)return out(s,[],false,'Area already restored.');
 const item=s.cells[itemIndex]?.content;
 if(!item||item.type!=='item'||item.chain!==node.chain||item.tier!==node.tier)return out(s,[],false,'Required restoration item is not selected.');
 if(s.coins<node.coinCost)return out(s,[],false,'Not enough Coins.');
 if(s.forestLight<node.lightRequired)return out(s,[],false,'Not enough Forest Light.');
 const n=cloneState(s),events=[];
 n.cells[itemIndex].content=null;n.coins-=node.coinCost;
 n.completedRestorations.push(node.id);n.restorationIndex++;
 events.push({type:'restored',nodeId:node.id,progress:restorationProgress(n)});
 unlockProducersInPlace(n,events);
 ensureCapacityInPlace(n,itemIndex,events);
 return out(n,events);
}
export function upgradeProducer(s,producerId){
 const p=PRODUCERS[producerId],level=s.producerLevels[producerId]??0;
 if(!p||level<=0)return out(s,[],false,'Producer is locked.');
 const coinCost=80*level,lightCost=5*level;
 if(s.coins<coinCost||s.forestLight<lightCost)return out(s,[],false,'Not enough resources.');
 const n=cloneState(s);n.coins-=coinCost;n.forestLight-=lightCost;n.producerLevels[producerId]=level+1;
 return out(n,[{type:'producer_upgraded',producerId,level:level+1}]);
}
export function storeItem(s,index){
 const item=s.cells[index]?.content;
 if(!item||item.type!=='item')return out(s,[],false,'Only merge items can be stored.');
 const slot=s.storage.findIndex(x=>x===null);
 if(slot<0)return out(s,[],false,'Storage is full.');
 const n=cloneState(s);n.storage[slot]=structuredClone(item);n.cells[index].content=null;
 return out(n,[{type:'stored',index,slot}]);
}
export function retrieveItem(s,slot){
 const item=s.storage[slot];if(!item)return out(s,[],false,'Storage slot is empty.');
 const target=openEmptyIndices(s)[0];if(!Number.isInteger(target))return out(s,[],false,'No open board space.');
 const n=cloneState(s);n.cells[target].content=n.storage[slot];n.storage[slot]=null;
 return out(n,[{type:'retrieved',slot,index:target}]);
}
export function upgradeStorage(s){
 const next=STORAGE_UPGRADES[s.storageLevel+1];
 if(!next)return out(s,[],false,'Storage is maxed.');
 if(s.coins<next.cost)return out(s,[],false,'Not enough Coins.');
 const n=cloneState(s);n.coins-=next.cost;n.storageLevel++;
 while(n.storage.length<next.slots)n.storage.push(null);
 return out(n,[{type:'storage_upgraded',slots:next.slots}]);
}
export function validateState(s){
 const errors=[];
 if(!Array.isArray(s.cells)||s.cells.length!==CELL_COUNT)errors.push('board-size');
 if(s.energy<0||s.energy>s.maxEnergy)errors.push('energy');
 if(s.coins<0||s.forestLight<0)errors.push('currency');
 if(s.activeOrders.length>3)errors.push('orders');
 if(s.restorationIndex<0||s.restorationIndex>RESTORATION_NODES.length)errors.push('restoration');
 return errors;
}
