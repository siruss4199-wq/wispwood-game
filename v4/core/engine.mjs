import {CELL_COUNT,CHAINS,MAX_TIER,MILESTONES,PRODUCERS,SIZE,STORAGE_UPGRADES,itemDef,producerForChain} from './catalog.mjs';
import {cloneState} from './state.mjs';

const result=(state,events=[],ok=true,reason=null)=>({state,events,ok,reason});
export const isOpen=(s,i)=>Number.isInteger(i)&&i>=0&&i<CELL_COUNT&&s.cells[i].terrain==='open';
export const openEmptyIndices=s=>s.cells.flatMap((c,i)=>c.terrain==='open'&&!c.content?[i]:[]);
export const producerIndices=s=>s.cells.flatMap((c,i)=>c.terrain==='open'&&c.content?.type==='producer'?[i]:[]);
export const currentMilestone=s=>MILESTONES[s.milestoneIndex]??null;
export const chapterProgress=s=>Math.round((s.completedMilestones.length/MILESTONES.length)*100);

export function mergeablePair(s){
 const seen=new Map();
 for(let i=0;i<s.cells.length;i++){
  const c=s.cells[i],x=c.content;
  if(c.terrain!=='open'||x?.type!=='item'||x.tier>=MAX_TIER)continue;
  const k=x.chain+':'+x.tier;
  if(seen.has(k))return [seen.get(k),i];
  seen.set(k,i);
 }
 return null;
}
export function unlockedChains(s){
 const chains=[];
 for(const p of Object.values(PRODUCERS))if((s.producerLevels[p.id]??0)>0)chains.push(...p.chains);
 return chains;
}
function discoverInPlace(s,item,events){
 const key=item.chain+':'+item.tier;
 if(!s.discovered[key]){
  s.discovered[key]=true;
  s.coins+=4+item.tier*2;
  events.push({type:'discovered',key});
 }
}
function orderTier(s,slot){
 const stage=Math.floor(s.ordersCompleted/6);
 const caps=[2,3,4,5];
 return Math.min(caps[slot],1+Math.floor(stage/2)+(slot>=2?1:0));
}
function req(chain,tier,count=1){return {chain,tier:Math.max(0,Math.min(MAX_TIER,tier)),count};}
function makeOrder(s,slot){
 const serial=s.nextOrderSerial++;
 const chains=unlockedChains(s),tier=orderTier(s,slot);
 const a=chains[(serial+slot)%chains.length],b=chains[(serial+slot+1)%chains.length],c=chains[(serial+slot+2)%chains.length];
 let requirements;
 if(slot===0)requirements=[req(a,tier,1)];
 else if(slot===1)requirements=[req(a,Math.max(1,tier-1),2)];
 else if(slot===2)requirements=[req(a,tier,1),req(b,Math.max(1,tier-1),1)];
 else requirements=[req(a,tier,1),req(b,Math.max(1,tier-1),1),req(c,Math.max(1,tier-2),1)];
 const power=requirements.reduce((n,r)=>n+r.count*Math.pow(2,r.tier),0);
 const mult=[1,1.2,1.45,1.8][slot];
 return {
  id:'order-'+serial,slot,
  label:['Quick','Supply','Trade','Story'][slot],
  title:['Quick Request','Supply Run','Forest Trade','Story Task'][slot],
  requirements,
  rewardCoins:Math.round((14+power*7)*mult),
  rewardLight:Math.max(1,Math.round((2+power/2)*mult)),
  rewardEnergy:[4,6,8,12][slot]
 };
}
export function fillOrdersInPlace(s){
 while(s.activeOrders.length<4){
  const used=new Set(s.activeOrders.map(o=>o.slot));
  const slot=[0,1,2,3].find(v=>!used.has(v))??0;
  s.activeOrders.push(makeOrder(s,slot));
 }
 return s;
}
export function initializePlayableState(s){const n=cloneState(s);fillOrdersInPlace(n);return n;}

function countItems(s,chain,tier){
 let n=0;
 for(const c of s.cells)if(c.terrain==='open'&&c.content?.type==='item'&&c.content.chain===chain&&c.content.tier===tier)n++;
 for(const x of s.storage)if(x?.type==='item'&&x.chain===chain&&x.tier===tier)n++;
 return n;
}
export function orderReady(s,order){
 return order.requirements.every(r=>countItems(s,r.chain,r.tier)>=r.count);
}
export function milestoneReady(s,m=currentMilestone(s)){
 return !!m&&s.coins>=m.coinCost&&s.forestLight>=m.lightRequired&&m.requirements.every(([chain,tier,count])=>countItems(s,chain,tier)>=count);
}
function consumeOneInPlace(s,chain,tier){
 const board=s.cells.findIndex(c=>c.terrain==='open'&&c.content?.type==='item'&&c.content.chain===chain&&c.content.tier===tier);
 if(board>=0){s.cells[board].content=null;return true;}
 const slot=s.storage.findIndex(x=>x?.type==='item'&&x.chain===chain&&x.tier===tier);
 if(slot>=0){s.storage[slot]=null;return true;}
 return false;
}
function consumeRequirementsInPlace(s,requirements){
 for(const r of requirements){
  const [chain,tier,count]=Array.isArray(r)?r:[r.chain,r.tier,r.count];
  for(let i=0;i<count;i++)if(!consumeOneInPlace(s,chain,tier))return false;
 }
 return true;
}
export function move(s,from,to){
 if(!isOpen(s,from)||!isOpen(s,to)||from===to)return result(s,[],false,'Choose two different open cells.');
 if(!s.cells[from].content||s.cells[to].content)return result(s,[],false,'Move an item into an empty cell.');
 const n=cloneState(s);n.cells[to].content=n.cells[from].content;n.cells[from].content=null;
 return result(n,[{type:'moved',from,to}]);
}
export function merge(s,from,to){
 if(!isOpen(s,from)||!Number.isInteger(to)||to<0||to>=CELL_COUNT||from===to)return result(s,[],false,'Drag onto a matching item.');
 const a=s.cells[from].content,b=s.cells[to].content;
 if(s.cells[to].terrain==='cobweb'){
  if(a?.type!=='item'||b?.type!=='item'||a.chain!==b.chain||a.tier!==b.tier)return result(s,[],false,'Craft the matching item to clear these vines.');
  const n=cloneState(s);n.cells[from].content=null;n.cells[to].terrain='open';n.moves++;n.coins+=8+b.tier*4;
  return result(n,[{type:'cobweb_cleared',from,to}]);
 }
 if(!isOpen(s,to))return result(s,[],false,'That forest cell is still locked.');
 if(a?.type!=='item'||b?.type!=='item'||a.chain!==b.chain||a.tier!==b.tier||a.tier>=MAX_TIER)return result(s,[],false,'Only identical items merge.');
 const n=cloneState(s);n.cells[from].content=null;n.cells[to].content={type:'item',chain:b.chain,tier:b.tier+1};n.moves++;n.energy=Math.min(n.maxEnergy,n.energy+1);
 const events=[{type:'merged',from,to,item:structuredClone(n.cells[to].content)}];discoverInPlace(n,n.cells[to].content,events);
 return result(n,events);
}
export function tapProducer(s,index){
 if(!isOpen(s,index)||s.cells[index].content?.type!=='producer')return result(s,[],false,'Tap an unlocked producer.');
 const id=s.cells[index].content.producerId,p=PRODUCERS[id],level=s.producerLevels[id]??0;
 if(level<=0)return result(s,[],false,'Producer is locked.');
 if(s.energy<=0)return result(s,[],false,'Energy is empty.');
 const empty=openEmptyIndices(s);if(!empty.length)return result(s,[],false,'Board is full — merge or store items.');
 const n=cloneState(s),tap=n.producerTapCounts[id]??0,base=p.cycle[tap%p.cycle.length];
 n.producerTapCounts[id]=tap+1;
 let [chain,tier]=base;
 tier=Math.min(MAX_TIER,tier+Math.floor((level-1)/2));
 const target=empty[0];n.cells[target].content={type:'item',chain,tier};n.energy--;
 const events=[{type:'produced',producerId:id,index:target,item:structuredClone(n.cells[target].content)}];discoverInPlace(n,n.cells[target].content,events);
 return result(n,events);
}
export function completeOrder(s,orderId){
 const order=s.activeOrders.find(o=>o.id===orderId);if(!order)return result(s,[],false,'Order not found.');
 if(!orderReady(s,order))return result(s,[],false,'Order items are not ready.');
 const n=cloneState(s);consumeRequirementsInPlace(n,order.requirements);
 n.coins+=order.rewardCoins;n.forestLight+=order.rewardLight;n.energy=Math.min(n.maxEnergy,n.energy+order.rewardEnergy);n.ordersCompleted++;
 n.activeOrders=n.activeOrders.filter(o=>o.id!==orderId);fillOrdersInPlace(n);
 return result(n,[{type:'order_completed',orderId,coins:order.rewardCoins,light:order.rewardLight}]);
}
function lockedByDistance(s){
 return s.cells.flatMap((c,i)=>c.terrain==='locked'?[i]:[]).sort((a,b)=>{
  const ar=Math.floor(a/SIZE),ac=a%SIZE,br=Math.floor(b/SIZE),bc=b%SIZE;
  return (Math.abs(ar-3.5)+Math.abs(ac-3.5))-(Math.abs(br-3.5)+Math.abs(bc-3.5))||a-b;
 });
}
function unlockBoardCellsInPlace(s,count,events){
 for(const i of lockedByDistance(s).slice(0,count)){s.cells[i].terrain='open';s.unlockedCells++;events.push({type:'cell_unlocked',index:i});}
}
function unlockProducerInPlace(s,id,events){
 if(!id||s.producerLevels[id]>0)return;
 s.producerLevels[id]=1;
 const slot=openEmptyIndices(s)[0];
 if(Number.isInteger(slot)){s.cells[slot].content={type:'producer',producerId:id};events.push({type:'producer_unlocked',producerId:id,index:slot});}
}
export function completeMilestone(s){
 const m=currentMilestone(s);if(!m)return result(s,[],false,'Lost Clearing chapter is complete.');
 if(!milestoneReady(s,m))return result(s,[],false,'Milestone requirements are not ready.');
 const n=cloneState(s),events=[];consumeRequirementsInPlace(n,m.requirements);n.coins-=m.coinCost;n.completedMilestones.push(m.id);n.milestoneIndex++;
 unlockBoardCellsInPlace(n,2+(n.milestoneIndex%3===0?1:0),events);unlockProducerInPlace(n,m.unlock,events);
 events.unshift({type:'milestone_completed',milestoneId:m.id,progress:chapterProgress(n)});
 fillOrdersInPlace(n);return result(n,events);
}
export function storeItem(s,index){
 const item=s.cells[index]?.content;if(!isOpen(s,index)||item?.type!=='item')return result(s,[],false,'Select a merge item.');
 const slot=s.storage.findIndex(x=>x===null);if(slot<0)return result(s,[],false,'Storage is full.');
 const n=cloneState(s);n.storage[slot]=structuredClone(item);n.cells[index].content=null;return result(n,[{type:'stored',slot,index}]);
}
export function retrieveItem(s,slot){
 const item=s.storage[slot];if(!item)return result(s,[],false,'Storage slot is empty.');
 const index=openEmptyIndices(s)[0];if(!Number.isInteger(index))return result(s,[],false,'No empty board cell.');
 const n=cloneState(s);n.cells[index].content=n.storage[slot];n.storage[slot]=null;return result(n,[{type:'retrieved',slot,index}]);
}
export function upgradeStorage(s){
 const nextSlots=STORAGE_UPGRADES[s.storageLevel+1];if(!nextSlots)return result(s,[],false,'Storage is maxed.');
 const cost=160*Math.pow(2,s.storageLevel);if(s.coins<cost)return result(s,[],false,'Not enough Coins.');
 const n=cloneState(s);n.coins-=cost;n.storageLevel++;while(n.storage.length<nextSlots)n.storage.push(null);return result(n,[{type:'storage_upgraded',slots:nextSlots}]);
}
export function upgradeProducer(s,id){
 const p=PRODUCERS[id],level=s.producerLevels[id]??0;if(!p||level<=0)return result(s,[],false,'Producer is locked.');
 const cost=220*level,light=12*level;if(s.coins<cost||s.forestLight<light)return result(s,[],false,'Not enough upgrade resources.');
 const n=cloneState(s);n.coins-=cost;n.forestLight-=light;n.producerLevels[id]=level+1;return result(n,[{type:'producer_upgraded',producerId:id,level:level+1}]);
}
export function bestProducerIndexForChain(s,chain){
 const p=producerForChain(chain);if(!p)return -1;
 return s.cells.findIndex(c=>c.terrain==='open'&&c.content?.type==='producer'&&c.content.producerId===p.id);
}
export function validateState(s){
 const errors=[];
 if(!Array.isArray(s.cells)||s.cells.length!==CELL_COUNT)errors.push('board');
 if(s.energy<0||s.energy>s.maxEnergy)errors.push('energy');
 if(s.coins<0||s.forestLight<0)errors.push('currency');
 if(s.activeOrders.length!==4)errors.push('orders');
 if(s.milestoneIndex<0||s.milestoneIndex>MILESTONES.length)errors.push('milestone');
 for(let i=0;i<s.cells.length;i++){
  const c=s.cells[i];if(!['open','locked','cobweb'].includes(c.terrain))errors.push('terrain:'+i);
  if(c.content?.type==='item'&&!CHAINS[c.content.chain]?.items[c.content.tier])errors.push('item:'+i);
  if(c.content?.type==='producer'&&!PRODUCERS[c.content.producerId])errors.push('producer:'+i);
 }
 for(const o of s.activeOrders)for(const r of o.requirements)if(!unlockedChains(s).includes(r.chain))errors.push('locked-order-chain');
 return errors;
}
