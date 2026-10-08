import {CHAIN_MARKS,CHAINS,MILESTONES,PRODUCERS,itemDef} from './core/catalog.mjs';
import {createInitialState,restore,serialize} from './core/state.mjs';
import {chapterProgress,completeMilestone as finishMilestone,completeOrder as finishOrder,currentMilestone,fillOrdersInPlace,initializePlayableState,merge,milestoneReady,move,orderReady,producerPreview,requirementProgress,retrieveItem,storeItem,tapProducer} from './core/engine.mjs';

const KEY='wispwood-v4';
const $=s=>document.querySelector(s);
const board=$('#board'),ordersEl=$('#orders'),sourcesEl=$('#sources'),storageEl=$('#storage');
const energy=$('#energy'),coins=$('#coins'),light=$('#light'),discovered=$('#discovered');
const milestoneTitle=$('#milestoneTitle'),milestoneReq=$('#milestoneReq'),milestoneStep=$('#milestoneStep'),progressBar=$('#progressBar i');
const boardStatus=$('#boardStatus'),inspect=$('#inspect'),inspectIcon=$('#inspectIcon'),inspectName=$('#inspectName'),inspectMeta=$('#inspectMeta'),inspectUse=$('#inspectUse');
const completeOrderBtn=$('#completeOrder'),completeMilestoneBtn=$('#completeMilestone'),storeBtn=$('#store'),hint=$('#hint'),toast=$('#toast');

let state=restore(localStorage.getItem(KEY))??initializePlayableState(createInitialState());
let selected=null,selectedOrder=null,drag=null,timer=null,suppressClickUntil=0;

function save(){localStorage.setItem(KEY,serialize(state));}
function haptic(pattern=12){try{navigator.vibrate?.(pattern);}catch{}}
function msg(t){
 toast.textContent=t;
 toast.classList.add('show');
 clearTimeout(timer);
 timer=setTimeout(()=>toast.classList.remove('show'),1450);
}
function itemText(chain,tier,count=1){
 const d=itemDef(chain,tier);
 return `${count>1?count+'× ':''}${d.emoji} ${d.name}`;
}
function progressChip(r){
 const d=itemDef(r.chain,r.tier),done=r.current>=r.count;
 return `<span class="reqChip ${done?'done':''}">${d.emoji} ${d.name} <b>${Math.min(r.current,r.count)}/${r.count}</b></span>`;
}
function tileAt(x,y){
 for(const el of board.querySelectorAll('.tile')){
  const r=el.getBoundingClientRect();
  if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return Number(el.dataset.index);
 }
 return null;
}
function canDrop(from,to){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from===to)return false;
 const source=state.cells[from],target=state.cells[to];
 const a=source?.content,b=target?.content;
 if(source?.terrain!=='open'||a?.type!=='item')return false;
 if(target?.terrain==='open'&&!b)return true;
 if((target?.terrain==='open'||target?.terrain==='cobweb')&&b?.type==='item'){
  return a.chain===b.chain&&a.tier===b.tier;
 }
 return false;
}
function nearestCompatibleTarget(from,x,y){
 let best=null,bestDistance=Infinity,tileSize=0;
 for(const el of board.querySelectorAll('.tile')){
  const to=Number(el.dataset.index);
  if(!canDrop(from,to))continue;
  const r=el.getBoundingClientRect();
  tileSize=Math.max(tileSize,r.width,r.height);
  const distance=Math.hypot(x-(r.left+r.width/2),y-(r.top+r.height/2));
  if(distance<bestDistance){best=to;bestDistance=distance;}
 }
 return bestDistance<=Math.max(50,tileSize*1.15)?best:null;
}
function resolveDropTarget(from,x,y,lastX,lastY){
 const direct=tileAt(x,y);
 if(canDrop(from,direct))return direct;
 const last=tileAt(lastX,lastY);
 if(canDrop(from,last))return last;
 return nearestCompatibleTarget(from,Number.isFinite(lastX)?lastX:x,Number.isFinite(lastY)?lastY:y);
}
function clearDrag(){
 board.querySelectorAll('.drag-source,.target').forEach(e=>e.classList.remove('drag-source','target'));
}
function apply(r){
 if(!r.ok){msg(r.reason);haptic(5);return;}
 const previousOrder=selectedOrder;
 state=r.state;
 selected=null;
 const events=r.events;
 if(events.some(x=>x.type==='order_completed'))selectedOrder=null;
 else if(previousOrder&&state.activeOrders.some(o=>o.id===previousOrder))selectedOrder=previousOrder;
 const big=events.some(x=>x.type==='milestone_completed'||x.type==='order_completed'||x.type==='producer_unlocked');
 haptic(big?[18,30,18]:10);
 msg(
  events.some(x=>x.type==='milestone_completed')?'🌿 Restoration complete — the clearing opens further!':
  events.some(x=>x.type==='order_completed')?'📜 Order delivered — rewards added!':
  events.some(x=>x.type==='producer_unlocked')?'✨ A new source awakened!':
  events.some(x=>x.type==='cobweb_cleared')?'🕸️ Vines cleared — item recovered!':
  events.some(x=>x.type==='merged')?'✨ Merge complete!':
  events.some(x=>x.type==='produced')?'🌱 New item produced':
  events.some(x=>x.type==='stored')?'🎒 Item stored':
  'Done'
 );
 render();
}
function clickTile(i){
 if(performance.now()<suppressClickUntil)return;
 const cell=state.cells[i];
 if(cell.terrain==='open'&&cell.content?.type==='producer'){
  if(Number.isInteger(selected)){selected=null;render();return;}
  apply(tapProducer(state,i));return;
 }
 if(!Number.isInteger(selected)){
  if(cell.terrain==='open'&&cell.content?.type==='item'){selected=i;render();}
  return;
 }
 if(i===selected){selected=null;render();return;}
 if(canDrop(selected,i)){
  apply(cell.terrain==='open'&&!cell.content?move(state,selected,i):merge(state,selected,i));
  return;
 }
 selected=null;render();
}
function selectedContent(){return Number.isInteger(selected)?state.cells[selected]?.content:null;}
function selectionUseLabel(item){
 if(!item||item.type!=='item')return '';
 const focus=state.activeOrders.find(o=>o.id===selectedOrder);
 if(focus?.requirements.some(r=>r.chain===item.chain&&r.tier===item.tier))return 'ORDER ITEM';
 const m=currentMilestone(state);
 if(m?.requirements.some(r=>r[0]===item.chain&&r[1]===item.tier))return 'RESTORE ITEM';
 const hasMatch=state.cells.some((c,i)=>i!==selected&&c.content?.type==='item'&&c.content.chain===item.chain&&c.content.tier===item.tier&&(c.terrain==='open'||c.terrain==='cobweb'));
 return hasMatch?'MATCH READY':'KEEP OR STORE';
}
function tileAria(cell,i){
 if(cell.terrain==='locked')return `Locked forest cell ${i+1}`;
 if(cell.content?.type==='producer'){
  const p=PRODUCERS[cell.content.producerId];
  return `${p.name}, level ${state.producerLevels[p.id]}. Tap to produce.`;
 }
 if(cell.content?.type==='item'){
  const d=itemDef(cell.content.chain,cell.content.tier),chain=CHAINS[cell.content.chain];
  return `${d.name}, ${chain.name}, tier ${cell.content.tier+1}${cell.terrain==='cobweb'?', trapped in vines':''}`;
 }
 return `Empty merge cell ${i+1}`;
}
function render(){
 fillOrdersInPlace(state);
 board.innerHTML='';

 const focusOrder=state.activeOrders.find(o=>o.id===selectedOrder);
 const wanted=new Set((focusOrder?.requirements??currentMilestone(state)?.requirements??[]).map(r=>{
  const a=Array.isArray(r)?r:[r.chain,r.tier];
  return a[0]+':'+a[1];
 }));
 const chosen=selectedContent();

 state.cells.forEach((cell,i)=>{
  const b=document.createElement('button');
  b.type='button';
  b.className='tile '+cell.terrain;
  b.dataset.index=i;
  b.setAttribute('role','gridcell');
  b.setAttribute('aria-label',tileAria(cell,i));

  if(i===selected)b.classList.add('selected');
  if(chosen?.type==='item'&&i!==selected&&cell.content?.type==='item'&&cell.content.chain===chosen.chain&&cell.content.tier===chosen.tier&&(cell.terrain==='open'||cell.terrain==='cobweb'))b.classList.add('merge-match');

  if(cell.content?.type==='item'&&(cell.terrain==='open'||cell.terrain==='cobweb')){
    const d=itemDef(cell.content.chain,cell.content.tier);
    b.classList.add('item','chain-'+cell.content.chain);
    if(wanted.has(cell.content.chain+':'+cell.content.tier))b.classList.add('wanted');
    b.innerHTML=`<span class="chainTag">${CHAIN_MARKS[cell.content.chain]}</span><span class="emoji">${d.emoji}</span><span class="tag">T${cell.content.tier+1}</span>${cell.terrain==='cobweb'?'<span class="web">🕸️</span>':''}`;
  }
  if(cell.terrain==='open'&&cell.content?.type==='producer'){
    const d=PRODUCERS[cell.content.producerId];
    b.classList.add('producer');
    b.innerHTML=`<span class="emoji">${d.emoji}</span><span class="tag">LV${state.producerLevels[d.id]}</span>`;
  }

  b.addEventListener('click',()=>clickTile(i));
  b.addEventListener('pointerdown',e=>{
    if(cell.terrain!=='open'||cell.content?.type!=='item')return;
    drag={id:e.pointerId,from:i,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};
    b.setPointerCapture?.(e.pointerId);
  });
  b.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    drag.lastX=e.clientX;drag.lastY=e.clientY;
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;
    if(!drag.moved)return;
    clearDrag();
    board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('drag-source');
    const to=resolveDropTarget(drag.from,e.clientX,e.clientY,drag.lastX,drag.lastY);
    if(Number.isInteger(to))board.querySelector(`[data-index="${to}"]`)?.classList.add('target');
  });
  b.addEventListener('pointerup',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const d=drag;drag=null;clearDrag();
    if(!d.moved)return;
    suppressClickUntil=performance.now()+300;
    const to=resolveDropTarget(d.from,e.clientX,e.clientY,d.lastX,d.lastY);
    if(!Number.isInteger(to)){selected=d.from;render();return;}
    const target=state.cells[to];
    apply(target.terrain==='open'&&!target.content?move(state,d.from,to):merge(state,d.from,to));
  });
  b.addEventListener('pointercancel',()=>{drag=null;clearDrag();});
  board.appendChild(b);
 });

 const openItems=state.cells.filter(c=>c.terrain==='open'&&c.content?.type==='item').length;
 const empties=state.cells.filter(c=>c.terrain==='open'&&!c.content).length;
 const webs=state.cells.filter(c=>c.terrain==='cobweb').length;
 boardStatus.textContent=`${openItems} items · ${empties} free · ${webs} vine targets`;

 ordersEl.innerHTML='';
 for(const o of state.activeOrders){
  const ready=orderReady(state,o),prog=requirementProgress(state,o.requirements);
  const el=document.createElement('button');
  el.type='button';
  el.className='order'+(selectedOrder===o.id?' active':'')+(ready?' ready':'');
  el.setAttribute('aria-pressed',selectedOrder===o.id?'true':'false');
  el.innerHTML=`<small>${o.label.toUpperCase()} ${ready?'· READY':''}</small><strong>${o.title}</strong><div class="req">${prog.map(r=>`<span class="${r.current>=r.count?'done':''}">${itemText(r.chain,r.tier,r.count)} · ${Math.min(r.current,r.count)}/${r.count}</span>`).join('')}</div><div class="reward">+${o.rewardCoins} 🪙 · +${o.rewardLight} ✨ · +${o.rewardEnergy} ⚡</div>`;
  el.addEventListener('click',()=>{selectedOrder=selectedOrder===o.id?null:o.id;selected=null;render();});
  ordersEl.appendChild(el);
 }

 const m=currentMilestone(state);
 milestoneTitle.textContent=m?.title??'Lost Clearing restored';
 if(m){
  const reqs=requirementProgress(state,m.requirements);
  milestoneReq.innerHTML=reqs.map(progressChip).join('')+`<span class="reqChip ${state.coins>=m.coinCost?'done':''}">🪙 <b>${state.coins}/${m.coinCost}</b></span><span class="reqChip ${state.forestLight>=m.lightRequired?'done':''}">✨ <b>${state.forestLight}/${m.lightRequired}</b></span>`;
 }else milestoneReq.innerHTML='<span class="reqChip done">🌙 Moonlit Grove is ready</span>';
 milestoneStep.textContent=`${state.milestoneIndex}/${MILESTONES.length}`;
 progressBar.style.width=chapterProgress(state)+'%';

 energy.textContent=state.energy+'/'+state.maxEnergy;
 coins.textContent=state.coins;
 light.textContent=state.forestLight;
 discovered.textContent=Object.keys(state.discovered).length;

 sourcesEl.innerHTML='';
 for(const [id,p] of Object.entries(PRODUCERS)){
  if((state.producerLevels[id]??0)<=0)continue;
  const preview=producerPreview(state,id,3);
  const card=document.createElement('div');
  card.className='source';
  card.innerHTML=`<span class="sourceIcon">${p.emoji}</span><div><b>${p.name} · Lv${state.producerLevels[id]}</b><small>Next drops</small><div class="dropPreview">${preview.map(x=>{const d=itemDef(x.chain,x.tier);return `<span title="${d.name}">${d.emoji}</span>`;}).join('')}</div></div>`;
  sourcesEl.appendChild(card);
 }

 const item=selectedContent();
 if(item?.type==='item'){
  const d=itemDef(item.chain,item.tier);
  inspect.hidden=false;
  inspectIcon.textContent=d.emoji;
  inspectName.textContent=d.name;
  inspectMeta.textContent=`${CHAINS[item.chain].name} · Tier ${item.tier+1}`;
  inspectUse.textContent=selectionUseLabel(item);
 }else inspect.hidden=true;

 completeOrderBtn.disabled=!selectedOrder||!orderReady(state,state.activeOrders.find(o=>o.id===selectedOrder));
 completeOrderBtn.textContent=selectedOrder?'Deliver selected order':'Deliver order';
 completeMilestoneBtn.disabled=!milestoneReady(state,m);
 storeBtn.disabled=!(Number.isInteger(selected)&&state.cells[selected]?.content?.type==='item');

 storageEl.innerHTML='';
 state.storage.forEach((x,i)=>{
  const b=document.createElement('button');
  b.type='button';
  b.className='slot'+(x?'':' empty');
  if(x){
    const d=itemDef(x.chain,x.tier);
    b.textContent=d.emoji;
    b.title=`${d.name} · Tier ${x.tier+1}`;
    b.setAttribute('aria-label',`Return ${d.name} from Backpack`);
    b.addEventListener('click',()=>apply(retrieveItem(state,i)));
  }else{
    b.textContent='＋';
    b.setAttribute('aria-label','Empty Backpack slot');
    b.disabled=true;
  }
  storageEl.appendChild(b);
 });

 if(state.moves===0&&empties===0)hint.textContent='Start here: merge any glowing matching pair to create your first free space.';
 else if(selectedOrder)hint.textContent='Order selected — useful items are outlined. Build the missing tiers and deliver when READY appears.';
 else if(state.ordersCompleted===0)hint.textContent='Pick a Forest Order below. The board will highlight items that help that goal.';
 else if(state.milestoneIndex===0)hint.textContent='Orders fund restoration. Keep one eye on the Current Restoration requirements above.';
 else if(empties<=1)hint.textContent='Space is tight — merge a pair or move a valuable singleton into the Backpack.';
 else hint.textContent='Choose your next goal: order rewards, vine targets, or the current restoration milestone.';

 save();
}

completeOrderBtn.addEventListener('click',()=>selectedOrder&&apply(finishOrder(state,selectedOrder)));
completeMilestoneBtn.addEventListener('click',()=>apply(finishMilestone(state)));
storeBtn.addEventListener('click',()=>Number.isInteger(selected)&&apply(storeItem(state,selected)));
render();
