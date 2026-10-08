import {CHAIN_MARKS,MILESTONES,PRODUCERS,itemDef} from './core/catalog.mjs';
import {createInitialState,restore,serialize} from './core/state.mjs';
import {chapterProgress,completeMilestone as finishMilestone,completeOrder as finishOrder,countItems,currentMilestone,fillOrdersInPlace,initializePlayableState,merge,milestoneReady,move,orderReady,producerPreview,requirementProgress,retrieveItem,storeItem,tapProducer} from './core/engine.mjs';

const KEY='wispwood-v4';
const $=s=>document.querySelector(s),board=$('#board'),ordersEl=$('#orders'),sourcesEl=$('#sources'),storageEl=$('#storage'),energy=$('#energy'),coins=$('#coins'),light=$('#light'),discovered=$('#discovered'),milestoneTitle=$('#milestoneTitle'),milestoneReq=$('#milestoneReq'),milestoneStep=$('#milestoneStep'),progressBar=$('#progressBar i'),completeOrderBtn=$('#completeOrder'),completeMilestoneBtn=$('#completeMilestone'),storeBtn=$('#store'),hint=$('#hint'),toast=$('#toast');
let state=restore(localStorage.getItem(KEY))??initializePlayableState(createInitialState()),selected=null,selectedOrder=null,drag=null,timer=null;

function save(){localStorage.setItem(KEY,serialize(state));}
function msg(t){toast.textContent=t;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),1200);}
function itemText(chain,tier,count=1){const d=itemDef(chain,tier);return `${count>1?count+'× ':''}${d.emoji} ${d.name}`;}
function progressText(r){const d=itemDef(r.chain,r.tier);return `${d.emoji} ${d.name} ${Math.min(r.current,r.count)}/${r.count}`;}
function tileAt(x,y){for(const el of board.querySelectorAll('.tile')){const r=el.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return Number(el.dataset.index);}return null;}
function clearDrag(){board.querySelectorAll('.drag-source,.target').forEach(e=>e.classList.remove('drag-source','target'));}
function apply(r){if(!r.ok){msg(r.reason);return;}state=r.state;selected=null;selectedOrder=null;const e=r.events;msg(e.some(x=>x.type==='milestone_completed')?'🌿 Expedition milestone restored!':e.some(x=>x.type==='order_completed')?'📜 Order delivered!':e.some(x=>x.type==='producer_unlocked')?'✨ New producer unlocked!':e.some(x=>x.type==='cobweb_cleared')?'🕸️ Vines cleared!':e.some(x=>x.type==='merged')?'✨ Merge!':e.some(x=>x.type==='produced')?'🌱 Produced':'Done');render();}
function clickTile(i){
 const cell=state.cells[i];
 if(cell.terrain==='open'&&cell.content?.type==='producer'){apply(tapProducer(state,i));return;}
 if(!Number.isInteger(selected)){
  if(cell.terrain==='open'&&cell.content?.type==='item'){selected=i;render();}
  return;
 }
 if(i===selected){selected=null;render();return;}
 if(cell.terrain==='open'&&!cell.content){apply(move(state,selected,i));return;}
 if(cell.content?.type==='item'){apply(merge(state,selected,i));return;}
 selected=null;render();
}
function render(){
 fillOrdersInPlace(state);board.innerHTML='';
 const focusOrder=state.activeOrders.find(o=>o.id===selectedOrder);
 const wanted=new Set((focusOrder?.requirements??currentMilestone(state)?.requirements??[]).map(r=>{const a=Array.isArray(r)?r:[r.chain,r.tier];return a[0]+':'+a[1];}));
 state.cells.forEach((cell,i)=>{
  const b=document.createElement('button');b.type='button';b.className='tile '+cell.terrain;b.dataset.index=i;
  if(i===selected)b.classList.add('selected');
  if(cell.content?.type==='item'&&(cell.terrain==='open'||cell.terrain==='cobweb')){const d=itemDef(cell.content.chain,cell.content.tier);b.classList.add('item');if(wanted.has(cell.content.chain+':'+cell.content.tier))b.classList.add('wanted');b.innerHTML=`<span class="chainTag">${CHAIN_MARKS[cell.content.chain]}</span><span class="emoji">${d.emoji}</span><span class="tag">T${cell.content.tier+1}</span>${cell.terrain==='cobweb'?'<span class="web">🕸️</span>':''}`;}
  if(cell.terrain==='open'&&cell.content?.type==='producer'){const d=PRODUCERS[cell.content.producerId];b.classList.add('producer');b.innerHTML=`<span class="emoji">${d.emoji}</span><span class="tag">LV${state.producerLevels[d.id]}</span>`;}
  b.addEventListener('click',()=>clickTile(i));
  b.addEventListener('pointerdown',e=>{if(cell.terrain!=='open'||cell.content?.type!=='item')return;drag={id:e.pointerId,from:i,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};b.setPointerCapture?.(e.pointerId);});
  b.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;drag.lastX=e.clientX;drag.lastY=e.clientY;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>9)drag.moved=true;if(!drag.moved)return;clearDrag();board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('drag-source');const to=tileAt(e.clientX,e.clientY);if(Number.isInteger(to)&&to!==drag.from)board.querySelector(`[data-index="${to}"]`)?.classList.add('target');});
  b.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;clearDrag();if(!d.moved)return;const to=tileAt(e.clientX,e.clientY)??tileAt(d.lastX,d.lastY);if(!Number.isInteger(to)||to===d.from)return;const target=state.cells[to];apply(target.terrain==='open'&&!target.content?move(state,d.from,to):merge(state,d.from,to));});
  board.appendChild(b);
 });
 ordersEl.innerHTML='';for(const o of state.activeOrders){const ready=orderReady(state,o),prog=requirementProgress(state,o.requirements);const el=document.createElement('button');el.type='button';el.className='order'+(selectedOrder===o.id?' active':'')+(ready?' ready':'');el.innerHTML=`<small>${o.label.toUpperCase()} ${ready?'· READY':''}</small><strong>${o.title}</strong><div class="req">${prog.map(progressText).join('<br>')}</div><div class="reward">+${o.rewardCoins} 🪙 · +${o.rewardLight} ✨ · +${o.rewardEnergy} ⚡</div>`;el.addEventListener('click',()=>{selectedOrder=o.id;selected=null;render();});ordersEl.appendChild(el);}
 const m=currentMilestone(state);milestoneTitle.textContent=m?.title??'Lost Clearing restored';milestoneReq.innerHTML=m?requirementProgress(state,m.requirements).map(progressText).join(' · ')+`<br>🪙 ${state.coins}/${m.coinCost} · ✨ ${state.forestLight}/${m.lightRequired}`:'Moonlit Grove expedition ready';milestoneStep.textContent=`${state.milestoneIndex}/${MILESTONES.length}`;progressBar.style.width=chapterProgress(state)+'%';
 energy.textContent=state.energy+'/'+state.maxEnergy;coins.textContent=state.coins;light.textContent=state.forestLight;discovered.textContent=Object.keys(state.discovered).length;
 sourcesEl.innerHTML='';for(const [id,p] of Object.entries(PRODUCERS)){if((state.producerLevels[id]??0)<=0)continue;const card=document.createElement('div');card.className='source';const drops=producerPreview(state,id,3).map(x=>itemDef(x.chain,x.tier).emoji).join(' ');card.innerHTML=`<span class="sourceIcon">${p.emoji}</span><div><b>${p.name}</b><small>Next: ${drops}</small></div>`;sourcesEl.appendChild(card);}
 completeOrderBtn.disabled=!selectedOrder||!orderReady(state,state.activeOrders.find(o=>o.id===selectedOrder));completeMilestoneBtn.disabled=!milestoneReady(state,m);storeBtn.disabled=!(Number.isInteger(selected)&&state.cells[selected]?.content?.type==='item');
 storageEl.innerHTML='';state.storage.forEach((x,i)=>{const b=document.createElement('button');b.type='button';b.className='slot'+(x?'':' empty');if(x){const d=itemDef(x.chain,x.tier);b.textContent=d.emoji;b.title=d.name;b.addEventListener('click',()=>apply(retrieveItem(state,i)));}else b.textContent='＋';storageEl.appendChild(b);});
 const empties=state.cells.filter(c=>c.terrain==='open'&&!c.content).length;hint.textContent=state.energy===0?'Energy is empty. Complete an order for Energy, or return later.':empties===0?'Board full — merge a highlighted pair or move something into the Backpack.':selectedOrder?'Highlighted board items contribute to your selected order.':'Pick an order to highlight useful items, or follow the expedition milestone.';
 save();
}
completeOrderBtn.addEventListener('click',()=>selectedOrder&&apply(finishOrder(state,selectedOrder)));
completeMilestoneBtn.addEventListener('click',()=>apply(finishMilestone(state)));
storeBtn.addEventListener('click',()=>Number.isInteger(selected)&&apply(storeItem(state,selected)));
render();