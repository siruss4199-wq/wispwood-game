import {CHAINS,MILESTONES,PRODUCERS,PRODUCER_MAX_LEVEL,itemDef} from './core/catalog.mjs';
import {createInitialState,restore,serialize} from './core/state.mjs';
import {platform} from './platform.mjs';
import {audio} from './audio.mjs';
import {chapterProgress,completeMilestone as finishMilestone,completeOrder as finishOrder,currentMilestone,fillOrdersInPlace,frontierName as getFrontierName,initializePlayableState,merge,milestoneReady,move,nextFrontierIndices,orderReady,producerPreview,producerUpgradeCost,requirementProgress,retrieveItem,reviveSparseBoard,storeItem,tapProducer,upgradeProducer} from './core/engine.mjs';

const KEY='wispwood-v4';
const $=s=>document.querySelector(s);
const board=$('#board'),ordersEl=$('#orders'),sourcesEl=$('#sources'),storageEl=$('#storage'),collectionEl=$('#collectionGrid'),restorationMap=$('#restorationMap');
const energy=$('#energy'),coins=$('#coins'),light=$('#light'),discovered=$('#discovered'),playerLevel=$('#playerLevel');
const milestoneTitle=$('#milestoneTitle'),milestoneReq=$('#milestoneReq'),milestoneStep=$('#milestoneStep'),progressBar=$('#progressBar i');
const boardStatus=$('#boardStatus'),frontierNameEl=$('#frontierName'),rushFill=$('#rushFill'),rushCount=$('#rushCount'),questRibbon=$('#questRibbon'),questIcon=$('#questIcon'),requestPortrait=$('#requestPortrait'),questTitle=$('#questTitle'),questText=$('#questText'),goalReq=$('#goalReq'),goalPosition=$('#goalPosition'),goalPrev=$('#goalPrev'),goalNext=$('#goalNext'),deliveryCoach=$('#deliveryCoach'),soundToggle=$('#soundToggle'),inspect=$('#inspect'),inspectIcon=$('#inspectIcon'),inspectName=$('#inspectName'),inspectMeta=$('#inspectMeta'),inspectUse=$('#inspectUse');
const completeOrderBtn=$('#completeOrder'),completeMilestoneBtn=$('#completeMilestone'),storeBtn=$('#store'),hint=$('#hint'),toast=$('#toast');
const panelButtons=[...document.querySelectorAll('[data-open-panel]')],gamePanels=[...document.querySelectorAll('.gamePanel')],ordersBadge=$('#ordersBadge'),storageBadge=$('#storageBadge'),collectionBadge=$('#collectionBadge'),collectionCount=$('#collectionCount'),collectionProgress=$('#collectionProgress'),parcelFill=$('#parcelFill'),parcelCount=$('#parcelCount'),mapSummary=$('#mapSummary');

const restored=restore(localStorage.getItem(KEY));
let state=restored?reviveSparseBoard(restored):initializePlayableState(createInitialState());
let selected=null,selectedOrder=null,drag=null,timer=null,suppressClickUntil=0,effectIndex=null,effectKind=null;

function save(){localStorage.setItem(KEY,serialize(state));platform.save?.(serialize(state));}
function haptic(pattern=12){try{navigator.vibrate?.(pattern);}catch{}}
function msg(t){
 toast.textContent=t;
 toast.classList.add('show');
 clearTimeout(timer);
 timer=setTimeout(()=>toast.classList.remove('show'),1450);
}
function rewardFly(icon,amount,target,origin=questRibbon,delay=0){
 if(!target||!origin||!amount)return;
 const a=origin.getBoundingClientRect(),b=target.getBoundingClientRect(),el=document.createElement('span');
 el.className='rewardFly';el.textContent=`${icon} +${amount}`;
 const x=a.left+a.width/2,y=a.top+a.height/2,tx=b.left+b.width/2,ty=b.top+b.height/2;
 el.style.left=x+'px';el.style.top=y+'px';el.style.setProperty('--reward-x',(tx-x)+'px');el.style.setProperty('--reward-y',(ty-y)+'px');
 el.style.animationDelay=delay+'ms';document.body.appendChild(el);setTimeout(()=>el.remove(),1050+delay);
}
function discoveryPop(event){
 const item=event?.item;if(!item)return;
 const d=itemDef(item.chain,item.tier),el=document.createElement('div');
 el.className='discoveryPop';
 el.innerHTML=`<small>NEW DISCOVERY</small><span>${d.emoji}</span><b>${d.name}</b><em>+${event.coins??0} 🪙</em>`;
 document.body.appendChild(el);setTimeout(()=>el.classList.add('show'),20);setTimeout(()=>el.remove(),1500);
}
function rewardEffects(events){
 const order=events.find(e=>e.type==='order_completed');
 if(order){
  rewardFly('🪙',order.coins,coins,questRibbon,0);
  rewardFly('✨',order.light,light,questRibbon,90);
  rewardFly('⚡',order.energy,energy,questRibbon,180);
 }
 const rush=events.find(e=>e.type==='wisp_burst');
 if(rush)rewardFly('✨',rush.light,light,board,60);
 const parcel=events.find(e=>e.type==='forest_parcel');
 if(parcel){
  rewardFly('🪙',parcel.coins,coins,questRibbon,20);
  rewardFly('✨',parcel.light,light,questRibbon,110);
  rewardFly('⚡',parcel.energy,energy,questRibbon,200);
  const el=document.createElement('div');el.className='parcelPop';el.innerHTML='<small>3 DELIVERIES!</small><span>🎁</span><b>Forest Parcel</b><em>Bonus gifts dropped on the board</em>';
  document.body.appendChild(el);setTimeout(()=>el.classList.add('show'),20);setTimeout(()=>el.remove(),1650);
 }
 const upgraded=events.find(e=>e.type==='producer_upgraded');
 if(upgraded){
  const p=PRODUCERS[upgraded.producerId],el=document.createElement('div');el.className='parcelPop producerPop';
  el.innerHTML=`<small>SOURCE UPGRADED</small><span>${p.emoji}</span><b>${p.name} · Lv${upgraded.level}</b><em>Higher-level drops are now possible</em>`;
  document.body.appendChild(el);setTimeout(()=>el.classList.add('show'),20);setTimeout(()=>el.remove(),1550);
 }
 const fresh=events.find(e=>e.type==='discovered');
 if(fresh){
  discoveryPop(fresh);
  const origin=Number.isInteger(effectIndex)?board.querySelector(`[data-index="${effectIndex}"]`):board;
  rewardFly('🪙',fresh.coins,coins,origin,120);
  const book=document.querySelector('[data-open-panel="collection"]');
  book?.classList.add('attention');setTimeout(()=>book?.classList.remove('attention'),1400);
 }
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
 if(events.some(x=>x.type==='order_completed'))selectedOrder=(state.activeOrders.find(o=>orderReady(state,o))??state.activeOrders[0])?.id??null;
 else if(previousOrder&&state.activeOrders.some(o=>o.id===previousOrder))selectedOrder=previousOrder;
 const big=events.some(x=>x.type==='milestone_completed'||x.type==='order_completed'||x.type==='producer_unlocked');
 audio.playEvents(events);
 const fx=events.find(x=>x.type==='wisp_burst')??events.find(x=>x.type==='merged'||x.type==='produced'||x.type==='cobweb_cleared'||x.type==='producer_unlocked');
 effectIndex=fx?.to??fx?.index??null;effectKind=fx?.type??null;
 platform.event?.(events);
 haptic(big?[18,30,18]:10);
 const expanded=events.some(x=>x.type==='cell_unlocked');
 msg(
  events.some(x=>x.type==='milestone_completed')?'🌿 Restoration complete — gifts are growing on the board!':
  events.some(x=>x.type==='forest_parcel')?'🎁 Forest Parcel! Bonus rewards and gifts dropped!':
  events.some(x=>x.type==='producer_upgraded')?'🌳 Source upgraded — stronger drops unlocked!':
  events.some(x=>x.type==='wisp_burst')?'✦ WISP RUSH! +2 Light and a bonus drop!':
  events.some(x=>x.type==='order_completed')&&expanded?'📜 Order delivered — the forest pushed outward!':
  events.some(x=>x.type==='order_completed')?'📜 Order delivered — rewards added!':
  events.some(x=>x.type==='producer_unlocked')?'✨ A new source awakened!':
  events.some(x=>x.type==='cobweb_cleared')?'🕸️ Vines cleared — item recovered!':
  events.some(x=>x.type==='merged')?'✨ Merge complete!':
  events.some(x=>x.type==='produced')?'🌱 New item produced':
  events.some(x=>x.type==='stored')?'🎒 Item stored':
  'Done'
 );
 render();
 requestAnimationFrame(()=>rewardEffects(events));
 if(Number.isInteger(effectIndex)){
  const index=effectIndex,kind=effectKind;
  requestAnimationFrame(()=>board.querySelector(`[data-index="${index}"]`)?.classList.add(kind==='cobweb_cleared'?'burst-clear':'burst'));
  setTimeout(()=>board.querySelector(`[data-index="${index}"]`)?.classList.remove('burst','burst-clear'),650);
 }
 events.filter(x=>x.type==='cell_unlocked').forEach((x,n)=>{
  setTimeout(()=>{
   const el=board.querySelector(`[data-index="${x.index}"]`);
   el?.classList.add('unlock-wave');
   setTimeout(()=>el?.classList.remove('unlock-wave'),850);
  },n*90);
 });
 events.filter(x=>x.type==='bonus_spawned').forEach((x,n)=>{
  setTimeout(()=>{
   const el=board.querySelector(`[data-index="${x.index}"]`);
   el?.classList.add('bonus-pop');
   setTimeout(()=>el?.classList.remove('bonus-pop'),700);
  },160+n*100);
 });
}
function clickTile(i){
 if(performance.now()<suppressClickUntil)return;
 audio.unlock();
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
function suggestedIndices(){
 if(state.moves>=4)return new Set();
 const groups=new Map();
 state.cells.forEach((c,i)=>{
  const x=c.content;
  if(c.terrain!=='open'||x?.type!=='item'||x.tier>=7)return;
  const k=x.chain+':'+x.tier;
  if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push(i);
 });
 const out=new Set();
 for(const indices of groups.values()){
  if(indices.length<2)continue;
  out.add(indices[0]);out.add(indices[1]);
  if(out.size>=4)break;
 }
 return out;
}
function closePanels(){
 gamePanels.forEach(p=>p.classList.remove('open'));
 panelButtons.forEach(b=>b.classList.remove('active'));
}
function togglePanel(name){
 const panel=gamePanels.find(p=>p.dataset.panel===name),button=panelButtons.find(b=>b.dataset.openPanel===name);
 const opening=!panel?.classList.contains('open');
 closePanels();
 if(opening){panel?.classList.add('open');button?.classList.add('active');audio.play('select');}
}
function selectOrderByOffset(delta){
 const orders=state.activeOrders;if(!orders.length)return;
 const current=Math.max(0,orders.findIndex(o=>o.id===selectedOrder));
 const next=(current+delta+orders.length)%orders.length;
 selectedOrder=orders[next].id;selected=null;audio.play('select');render();
}
const REQUEST_NPCS=[
 {face:'🧚',name:'Luma',role:'Garden Wisp'},
 {face:'🐿️',name:'Pip',role:'Trail Runner'},
 {face:'🦉',name:'Orin',role:'Old Archivist'},
 {face:'🦌',name:'Elowen',role:'Grove Keeper'}
];
function requestNPC(order){
 const slot=Number.isInteger(order?.slot)?order.slot:Math.max(0,state.activeOrders.findIndex(o=>o.id===order?.id));
 return REQUEST_NPCS[slot%REQUEST_NPCS.length];
}
function requestFace(order){return requestNPC(order).face;}
function tutorialState(){
 if(state.moves===0)return {icon:'✨',title:'Make your first merge',text:'Combine one glowing pair to open space and reveal your first request.',step:'1/3'};
 const o=state.activeOrders.find(x=>x.id===selectedOrder)??state.activeOrders[0];
 if(o){
  const ready=orderReady(state,o);
  const need=o.requirements.map(r=>itemText(r.chain,r.tier,r.count)).join(' + ');
  const npc=requestNPC(o);
  if(ready&&state.ordersCompleted===0)return {icon:'🎁',title:`${npc.name}'s request is ready!`,text:'Tap Deliver to send the items and collect the reward.',step:'3/3'};
  return {icon:'📜',title:`${npc.name} · ${o.title}`,text:`Build ${need} for ${npc.name}. Matching pieces are highlighted.`,step:'2/3'};
 }
 return {icon:'🌙',title:`Push into ${getFrontierName(state)}`,text:'Keep merging and restoring to reveal the next part of Wispwood.',step:'EXPLORE'};
}
function renderRestorationMap(){
 restorationMap.innerHTML='';
 mapSummary.textContent=`${state.milestoneIndex}/${MILESTONES.length} restored`;
 const zones=[
  {name:'Mossy Verge',icon:'🌱',from:0,to:2},
  {name:'Moonlit Thicket',icon:'⛲',from:3,to:5},
  {name:'Whisper Grove',icon:'🌙',from:6,to:8},
  {name:'Ancient Hollow',icon:'⛩️',from:9,to:11},
  {name:'Heartwood Edge',icon:'🏛️',from:12,to:14},
  {name:'Forest Heart',icon:'💜',from:15,to:17}
 ];
 for(const z of zones){
  const done=Math.max(0,Math.min(z.to-z.from+1,state.milestoneIndex-z.from));
  const current=state.milestoneIndex>=z.from&&state.milestoneIndex<=z.to;
  const unlocked=state.milestoneIndex>=z.from;
  const el=document.createElement('button');el.type='button';
  el.className='mapZone'+(done===z.to-z.from+1?' complete':current?' current':unlocked?' unlocked':' locked');
  const next=MILESTONES[Math.max(z.from,state.milestoneIndex)]??MILESTONES[z.to];
  el.innerHTML=`<span class="mapZoneIcon">${z.icon}</span><div><small>${done}/${z.to-z.from+1} RESTORED</small><b>${z.name}</b><em>${done===z.to-z.from+1?'Restored':current?(next?.title??'Explore'):'Locked'}</em></div><i></i>`;
  el.disabled=!unlocked&&!current;
  if(current)el.addEventListener('click',()=>{closePanels();document.querySelector('.worldStrip')?.scrollIntoView({behavior:'smooth',block:'center'});});
  restorationMap.appendChild(el);
 }
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
 if(state.moves>0&&(!selectedOrder||!state.activeOrders.some(o=>o.id===selectedOrder))){
  selectedOrder=(state.activeOrders.find(o=>orderReady(state,o))??state.activeOrders[0])?.id??null;
 }
 if(state.ordersCompleted===0){
  const ready=state.activeOrders.find(o=>orderReady(state,o));
  if(ready)selectedOrder=ready.id;
 }
 board.innerHTML='';

 const focusOrder=state.activeOrders.find(o=>o.id===selectedOrder);
 const wanted=new Set((focusOrder?.requirements??currentMilestone(state)?.requirements??[]).map(r=>{
  const a=Array.isArray(r)?r:[r.chain,r.tier];
  return a[0]+':'+a[1];
 }));
 const chosen=selectedContent();
 const suggested=suggestedIndices();
 const frontierNext=new Set(nextFrontierIndices(state,3));

 state.cells.forEach((cell,i)=>{
  const b=document.createElement('button');
  b.type='button';
  b.className='tile '+cell.terrain;
  b.dataset.index=i;
  b.setAttribute('role','gridcell');
  b.setAttribute('aria-label',tileAria(cell,i));

  if(i===selected)b.classList.add('selected');
  if(suggested.has(i)&&!Number.isInteger(selected))b.classList.add('suggested');
  if(cell.terrain==='locked'){b.dataset.decor=['🌲','🍄','🌿','✦'][i%4];if(frontierNext.has(i)){b.classList.add('frontier-next');b.dataset.frontier='?';}}
  if(chosen?.type==='item'&&i!==selected&&cell.content?.type==='item'&&cell.content.chain===chosen.chain&&cell.content.tier===chosen.tier&&(cell.terrain==='open'||cell.terrain==='cobweb'))b.classList.add('merge-match');

  if(cell.content?.type==='item'&&(cell.terrain==='open'||cell.terrain==='cobweb')){
    const d=itemDef(cell.content.chain,cell.content.tier);
    b.classList.add('item','chain-'+cell.content.chain,'tier-'+cell.content.tier);
    if(wanted.has(cell.content.chain+':'+cell.content.tier))b.classList.add('wanted');
    b.innerHTML=`<span class="emoji">${d.emoji}</span><span class="tag">T${cell.content.tier+1}</span>${cell.terrain==='cobweb'?'<span class="web">🕸️</span>':''}`;
  }
  if(cell.terrain==='open'&&cell.content?.type==='producer'){
    const d=PRODUCERS[cell.content.producerId];
    b.classList.add('producer','source-awake');
    b.innerHTML=`<span class="tapCue">TAP</span><span class="emoji">${d.emoji}</span><span class="tag">LV${state.producerLevels[d.id]}</span>`;
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

 const tutorial=tutorialState();
 questIcon.textContent=tutorial.icon;requestPortrait.textContent=focusOrder?requestFace(focusOrder):'🧚';questTitle.textContent=tutorial.title;questText.textContent=tutorial.text;
 questRibbon.classList.toggle('complete',state.milestoneIndex>0);
 if(focusOrder){
  const prog=requirementProgress(state,focusOrder.requirements);
  goalReq.innerHTML=prog.map(progressChip).join('')+`<span class="goalReward">+${focusOrder.rewardCoins} 🪙 · +${focusOrder.rewardLight} ✨</span>`;
  const pos=state.activeOrders.findIndex(o=>o.id===focusOrder.id)+1;goalPosition.textContent=`${pos}/${state.activeOrders.length}`;
 }else{
  goalReq.innerHTML='<span class="reqChip">✨ Merge a matching pair</span>';
  goalPosition.textContent='—';
 }
 const openItems=state.cells.filter(c=>c.terrain==='open'&&c.content?.type==='item').length;
 const empties=state.cells.filter(c=>c.terrain==='open'&&!c.content).length;
 const webs=state.cells.filter(c=>c.terrain==='cobweb').length;
 const explored=state.cells.filter(c=>c.terrain!=='locked').length;
 const frontier=getFrontierName(state);frontierNameEl.textContent=frontier;
 boardStatus.textContent=`${explored}/64 explored · ${openItems} items · ${empties} free`;
 const rush=(state.mergeCount??0)%5;rushCount.textContent=`${rush}/5`;rushFill.style.width=(rush/5*100)+'%';
 const parcel=(state.ordersCompleted??0)%3;parcelCount.textContent=`${parcel}/3`;parcelFill.style.width=(parcel/3*100)+'%';
 renderRestorationMap();

 ordersBadge.textContent=String(state.activeOrders.length);
 storageBadge.textContent=String(state.storage.filter(Boolean).length);
 const discoveryTotal=Object.keys(state.discovered).length;
 collectionBadge.textContent=String(discoveryTotal);
 collectionCount.textContent=`${discoveryTotal}/48`;
 collectionProgress.style.width=(discoveryTotal/48*100)+'%';
 collectionEl.innerHTML='';
 for(const [chainId,chain] of Object.entries(CHAINS)){
  const section=document.createElement('section');section.className='collectionChain chain-'+chainId;
  const found=chain.items.filter(item=>state.discovered[chainId+':'+item.tier]).length;
  section.innerHTML=`<div class="collectionChainHead"><b>${chain.name}</b><span>${found}/8</span></div><div class="collectionItems"></div>`;
  const grid=section.querySelector('.collectionItems');
  for(const d of chain.items){
   const unlocked=!!state.discovered[chainId+':'+d.tier],cell=document.createElement('button');
   cell.type='button';cell.className='collectionItem'+(unlocked?' found':' locked');
   cell.innerHTML=unlocked?`<span>${d.emoji}</span><b>${d.name}</b><small>T${d.tier+1}</small>`:`<span>?</span><b>Unknown</b><small>T${d.tier+1}</small>`;
   if(unlocked)cell.addEventListener('click',()=>msg(`${d.emoji} ${d.name} · ${chain.name} · Tier ${d.tier+1}`));
   else cell.disabled=true;
   grid.appendChild(cell);
  }
  collectionEl.appendChild(section);
 }

 ordersEl.innerHTML='';
 for(const o of state.activeOrders){
  const ready=orderReady(state,o),prog=requirementProgress(state,o.requirements),npc=requestNPC(o);
  const el=document.createElement('button');
  el.type='button';
  el.className='order npcOrder'+(selectedOrder===o.id?' active':'')+(ready?' ready':'');
  el.setAttribute('aria-pressed',selectedOrder===o.id?'true':'false');
  el.innerHTML=`<span class="orderPortrait">${npc.face}</span><div class="orderCopy"><small>${npc.role.toUpperCase()} · ${ready?'READY':o.label.toUpperCase()}</small><strong>${npc.name}</strong><em>${o.title}</em><div class="req">${prog.map(r=>`<span class="${r.current>=r.count?'done':''}">${itemText(r.chain,r.tier,r.count)} · ${Math.min(r.current,r.count)}/${r.count}</span>`).join('')}</div><div class="reward">+${o.rewardCoins} 🪙 · +${o.rewardLight} ✨ · +${o.rewardEnergy} ⚡</div></div>`;
  el.addEventListener('click',()=>{selectedOrder=o.id;selected=null;closePanels();render();questRibbon.scrollIntoView({behavior:'smooth',block:'center'});});
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

 playerLevel.textContent=String(Math.max(1,state.milestoneIndex+1));
 energy.textContent=state.energy+'/'+state.maxEnergy;
 coins.textContent=state.coins;
 light.textContent=state.forestLight;
 discovered.textContent=Object.keys(state.discovered).length;

 sourcesEl.innerHTML='';
 for(const [id,p] of Object.entries(PRODUCERS)){
  const level=state.producerLevels[id]??0;if(level<=0)continue;
  const preview=producerPreview(state,id,3),cost=producerUpgradeCost(state,id),maxed=level>=PRODUCER_MAX_LEVEL;
  const card=document.createElement('div');card.className='source sourceUpgrade';
  const pips=Array.from({length:PRODUCER_MAX_LEVEL},(_,i)=>`<i class="${i<level?'on':''}"></i>`).join('');
  card.innerHTML=`<span class="sourceIcon">${p.emoji}</span><div class="sourceInfo"><b>${p.name} · Lv${level}</b><div class="sourcePips">${pips}</div><small>Next drops</small><div class="dropPreview">${preview.map(x=>{const d=itemDef(x.chain,x.tier);return `<span title="${d.name}">${d.emoji}</span>`;}).join('')}</div></div><button class="sourceUpgradeBtn" type="button" ${maxed?'disabled':''}>${maxed?'MAX':`Upgrade<br><small>${cost.coins} 🪙 · ${cost.light} ✨</small>`}</button>`;
  card.querySelector('.sourceUpgradeBtn')?.addEventListener('click',e=>{e.stopPropagation();audio.unlock();apply(upgradeProducer(state,id));});
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

 const focusedOrder=state.activeOrders.find(o=>o.id===selectedOrder);
 const focusedReady=!!focusedOrder&&orderReady(state,focusedOrder);
 const firstDelivery=focusedReady&&state.ordersCompleted===0;
 completeOrderBtn.disabled=!focusedReady;
 completeOrderBtn.textContent=focusedReady?'Deliver →':'Need items';
 questRibbon.classList.toggle('ready-to-deliver',focusedReady);
 deliveryCoach.hidden=!firstDelivery;
 document.body.classList.toggle('deliveryTutorial',firstDelivery);
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
 else if(state.ordersCompleted===0)hint.textContent='Your first order is pinned above — merge the outlined pieces and keep the Wisp Rush meter moving.';
 else if(state.milestoneIndex===0)hint.textContent='Orders fund restoration. Keep one eye on the Current Restoration requirements above.';
 else if(empties<=1)hint.textContent='Space is tight — merge a pair or move a valuable singleton into the Backpack.';
 else hint.textContent='Choose your next goal: order rewards, vine targets, or the current restoration milestone.';

 save();
}

completeOrderBtn.addEventListener('click',()=>{audio.unlock();if(selectedOrder)apply(finishOrder(state,selectedOrder));});
completeMilestoneBtn.addEventListener('click',()=>{audio.unlock();apply(finishMilestone(state));});
storeBtn.addEventListener('click',()=>{audio.unlock();Number.isInteger(selected)&&apply(storeItem(state,selected));});
panelButtons.forEach(b=>b.addEventListener('click',()=>togglePanel(b.dataset.openPanel)));
gamePanels.forEach(p=>p.querySelector('.panelHandle')?.addEventListener('click',closePanels));
goalPrev.addEventListener('click',()=>selectOrderByOffset(-1));
goalNext.addEventListener('click',()=>selectOrderByOffset(1));
soundToggle.addEventListener('click',()=>{
 audio.unlock();
 audio.setEnabled(!audio.enabled());
 soundToggle.textContent=audio.enabled()?'🔊':'🔇';
 soundToggle.setAttribute('aria-pressed',audio.enabled()?'true':'false');
 if(audio.enabled())audio.play('select');
});
soundToggle.textContent=audio.enabled()?'🔊':'🔇';
soundToggle.setAttribute('aria-pressed',audio.enabled()?'true':'false');
audio.bindPlatformMute(platform);
render();
platform.startGameplay?.();
