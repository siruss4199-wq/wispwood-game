import {AREA,itemDef,PRODUCERS,RESTORATION_PROJECTS} from './core/catalog.mjs';
import {createInitialState,restore,serialize} from './core/state.mjs';
import {areaProgress,boardStatus,currentProject,currentRequest,deliver,frontierCrates,merge,move,recycle,restorationStatus,restoreProject,tapProducer} from './core/engine.mjs';

const KEY='wispwood-v2-restoration';
const $=s=>document.querySelector(s);
const board=$('#board'),energy=$('#energy'),coins=$('#coins'),light=$('#light'),questTitle=$('#questTitle'),questText=$('#questText'),questReward=$('#questReward'),areaLabel=$('#areaLabel'),projectTitle=$('#projectTitle'),projectStep=$('#projectStep'),projectText=$('#projectText'),coinCost=$('#coinCost'),lightCost=$('#lightCost'),itemCost=$('#itemCost'),areaProgressEl=$('#areaProgress'),restorationVisual=$('#restorationVisual'),hint=$('#hint'),deliverBtn=$('#deliverBtn'),restoreBtn=$('#restoreBtn'),recycleBtn=$('#recycleBtn'),toast=$('#toast');

let state=restore(localStorage.getItem(KEY))??createInitialState(),selected=null,drag=null,timer=null;

function msg(t){toast.textContent=t;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),1400);}
function save(){localStorage.setItem(KEY,serialize(state));}
function tileIndexAtPoint(x,y){
 const tiles=board.querySelectorAll('.tile');
 for(const tile of tiles){
  const r=tile.getBoundingClientRect();
  if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return Number(tile.dataset.index);
 }
 return null;
}
function clearDragClasses(){document.querySelectorAll('.drag-source,.drag-target').forEach(x=>x.classList.remove('drag-source','drag-target'));}
function selectedItem(){return Number.isInteger(selected)?state.cells[selected]?.content:null;}
function findRequestItem(){const q=currentRequest(state);return state.cells.findIndex(c=>c.content?.type==='item'&&c.content.chain===q.chain&&c.content.tier===q.tier);}
function findProjectItem(){const p=currentProject(state);return p?state.cells.findIndex(c=>c.content?.type==='item'&&c.content.chain===p.chain&&c.content.tier===p.tier):-1;}
function guidance(){
 if(state.phase==='first_merge')return 'Drag the two matching Seeds together.';
 if(findProjectItem()>=0&&restorationStatus(state).coinsReady&&restorationStatus(state).lightReady)return 'Your restoration item is ready — select it and restore the clearing.';
 if(findRequestItem()>=0)return 'Select the Forest Order item and deliver it for Coins + Forest Light.';
 if(boardStatus(state).pair)return 'Drag matching items together.';
 return 'Tap the Ancient Tree to create Seeds.';
}
function apply(r){
 if(!r.ok){msg(r.reason);return;}
 state=r.state;selected=null;
 const restored=r.events.find(e=>e.type==='project_restored');
 if(r.events.some(e=>e.type==='area_restored'))msg('💜 Lost Clearing restored 100% — Moonlit Grove unlocked!');
 else if(restored)msg(`${restored.icon} ${restored.title} restored · ${restored.progress}%`);
 else if(r.events.some(e=>e.type==='order_completed'))msg('📜 Order complete — Coins and Forest Light earned!');
 else if(r.events.some(e=>e.type==='merged')){
  const found=r.events.find(e=>e.type==='crate_opened'&&e.reveal?.type==='item');
  msg(found?'✨ Merge! · 📦 Seed found!':'✨ Merge!');
 }
 else if(r.events.some(e=>e.type==='produced'))msg('🌳 Seed created');
 else msg('Done');
 render();
}
function renderRestoration(){
 const p=currentProject(state),status=restorationStatus(state),progress=areaProgress(state);
 areaLabel.textContent=`${AREA.title.toUpperCase()} · ${progress}% RESTORED`;
 areaProgressEl.style.width=progress+'%';
 restorationVisual.innerHTML=RESTORATION_PROJECTS.map((x,i)=>{
  const cls=i<state.projectIndex?'done':i===state.projectIndex?'current':'locked';
  return `<div class="restoration-step ${cls}"><span>${x.icon}</span><small>${i<state.projectIndex?'DONE':i===state.projectIndex?'NEXT':'LOCKED'}</small></div>`;
 }).join('');

 if(!p){
  projectTitle.textContent='Lost Clearing restored';
  projectStep.textContent='4/4';
  projectText.textContent='Mivra has a home again. Moonlit Grove is now open.';
  coinCost.textContent='✓ Coins spent';
  lightCost.textContent=`✨ ${state.forestLight} Light`;
  itemCost.textContent='💜 Mivra rescued';
  restoreBtn.disabled=true;
  restoreBtn.textContent='Area complete';
  return;
 }
 const def=itemDef({chain:p.chain,tier:p.tier});
 projectTitle.textContent=p.title;
 projectStep.textContent=`${state.projectIndex+1}/${RESTORATION_PROJECTS.length}`;
 projectText.textContent=p.description;
 coinCost.textContent=`🪙 ${Math.min(state.coins,p.coinCost)}/${p.coinCost}`;
 lightCost.textContent=`✨ ${Math.min(state.forestLight,p.lightRequired)}/${p.lightRequired}`;
 itemCost.textContent=`${def.emoji} ${def.name}`;
 const item=selectedItem();
 restoreBtn.disabled=!(item?.type==='item'&&item.chain===p.chain&&item.tier===p.tier&&status.coinsReady&&status.lightReady);
 restoreBtn.textContent=status.coinsReady&&status.lightReady?'Restore project':!status.coinsReady?'Earn more Coins':'Earn more Forest Light';
}
function render(){
 board.innerHTML='';const frontier=new Set(frontierCrates(state));
 state.cells.forEach((cell,i)=>{
  const b=document.createElement('button');b.className='tile '+cell.terrain;b.dataset.index=i;b.type='button';
  if(frontier.has(i))b.classList.add('frontier');
  if(i===selected)b.classList.add('selected');
  if(cell.terrain==='open'&&cell.content?.type==='item'){b.classList.add('item');const d=itemDef(cell.content);b.innerHTML=`<span class="emoji">${d.emoji}</span><span class="tier">T${cell.content.tier+1}</span>`;}
  if(cell.terrain==='open'&&cell.content?.type==='producer'){b.classList.add('producer');const d=PRODUCERS[cell.content.producerId];b.innerHTML=`<span class="emoji">${d.emoji}</span><span class="tier">SOURCE</span>`;}
  b.addEventListener('pointerdown',e=>{if(cell.terrain!=='open'||!cell.content)return;drag={id:e.pointerId,from:i,x:e.clientX,y:e.clientY,moved:false,producer:cell.content.type==='producer'};b.setPointerCapture?.(e.pointerId);});
  b.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;if(!drag.moved)return;clearDragClasses();board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('drag-source');const over=tileIndexAtPoint(e.clientX,e.clientY);if(Number.isInteger(over)&&over!==drag.from)board.querySelector(`[data-index="${over}"]`)?.classList.add('drag-target');});
  b.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;clearDragClasses();if(d.producer&&!d.moved){apply(tapProducer(state,d.from));return;}const to=tileIndexAtPoint(e.clientX,e.clientY);if(!d.moved||!Number.isInteger(to)||to===d.from){selected=d.from;render();return;}apply(state.cells[to]?.terrain==='open'&&state.cells[to].content===null?move(state,d.from,to):merge(state,d.from,to));});
  b.addEventListener('pointercancel',()=>{drag=null;clearDragClasses();});
  board.appendChild(b);
 });

 const q=currentRequest(state),item=selectedItem();
 energy.textContent=state.energy+'/'+state.maxEnergy;
 coins.textContent=state.coins;
 light.textContent=state.forestLight;
 questTitle.textContent=q.title;
 questText.textContent=q.description;
 questReward.textContent=`+${q.rewardCoins} 🪙 · +${q.rewardLight} ✨`;
 deliverBtn.disabled=!(item?.type==='item'&&item.chain===q.chain&&item.tier===q.tier);
 recycleBtn.disabled=item?.type!=='item';
 hint.textContent=guidance();
 renderRestoration();
 save();
}
deliverBtn.onclick=()=>Number.isInteger(selected)&&apply(deliver(state,selected));
restoreBtn.onclick=()=>Number.isInteger(selected)&&apply(restoreProject(state,selected));
recycleBtn.onclick=()=>Number.isInteger(selected)&&apply(recycle(state,selected));
render();
