import {itemDef,PRODUCERS,RESTORATION_NODES} from './core/catalog.mjs';
import {createInitialState,restore,serialize} from './core/state.mjs';
import {completeOrder,currentRestoration,fillOrdersInPlace,frontierCrates,initializePlayableState,merge,move,openEmptyIndices,restoreNode,storeItem,tapProducer} from './core/engine.mjs';

const KEY='wispwood-v3';
const $=s=>document.querySelector(s),board=$('#board'),orders=$('#orders'),energy=$('#energy'),coins=$('#coins'),light=$('#light'),goalTitle=$('#goalTitle'),goalText=$('#goalText'),goalProgress=$('#goalProgress'),hint=$('#hint'),orderBtn=$('#orderBtn'),restoreBtn=$('#restoreBtn'),storeBtn=$('#storeBtn'),toast=$('#toast');
let state=restore(localStorage.getItem(KEY))??initializePlayableState(createInitialState()),selected=null,selectedOrder=null,drag=null,timer=null;

function save(){localStorage.setItem(KEY,serialize(state));}
function msg(t){toast.textContent=t;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),1100);}
function tileIndexAt(x,y){for(const tile of board.querySelectorAll('.tile')){const r=tile.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return Number(tile.dataset.index);}return null;}
function clearDrag(){document.querySelectorAll('.drag-source,.drag-target').forEach(x=>x.classList.remove('drag-source','drag-target'));}
function apply(r){if(!r.ok){msg(r.reason);return;}state=r.state;selected=null;selectedOrder=null;msg(r.events.some(e=>e.type==='restored')?'🌿 Restoration complete!':r.events.some(e=>e.type==='order_completed')?'📜 Order complete!':r.events.some(e=>e.type==='merged')?'✨ Merge!':'Done');render();}
function selectedItem(){return Number.isInteger(selected)?state.cells[selected]?.content:null;}
function render(){
 fillOrdersInPlace(state);
 board.innerHTML='';const frontier=new Set(frontierCrates(state));
 state.cells.forEach((cell,i)=>{
  const b=document.createElement('button');b.className='tile '+cell.terrain;b.dataset.index=i;b.type='button';if(frontier.has(i))b.classList.add('frontier');if(i===selected)b.classList.add('selected');
  if(cell.terrain==='open'&&cell.content?.type==='item'){b.classList.add('item');const d=itemDef(cell.content.chain,cell.content.tier);b.innerHTML=`<span class="emoji">${d.emoji}</span><span class="tier">T${cell.content.tier+1}</span>`;}
  if(cell.terrain==='open'&&cell.content?.type==='producer'){b.classList.add('producer');const d=PRODUCERS[cell.content.producerId];b.innerHTML=`<span class="emoji">${d.emoji}</span><span class="tier">LV${state.producerLevels[d.id]}</span>`;}
  b.addEventListener('pointerdown',e=>{if(cell.terrain!=='open'||!cell.content)return;drag={id:e.pointerId,from:i,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,producer:cell.content.type==='producer'};b.setPointerCapture?.(e.pointerId);});
  b.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;drag.lastX=e.clientX;drag.lastY=e.clientY;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;if(!drag.moved)return;clearDrag();board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('drag-source');const to=tileIndexAt(e.clientX,e.clientY);if(Number.isInteger(to)&&to!==drag.from)board.querySelector(`[data-index="${to}"]`)?.classList.add('drag-target');});
  b.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;clearDrag();if(d.producer&&!d.moved){apply(tapProducer(state,d.from));return;}const to=tileIndexAt(e.clientX,e.clientY)??tileIndexAt(d.lastX,d.lastY);if(!d.moved||!Number.isInteger(to)||to===d.from){selected=d.from;render();return;}apply(state.cells[to]?.terrain==='open'&&!state.cells[to].content?move(state,d.from,to):merge(state,d.from,to));});
  board.appendChild(b);
 });
 orders.innerHTML='';for(const o of state.activeOrders){const req=o.requirements[0],d=itemDef(req.chain,req.tier),el=document.createElement('button');el.className='order'+(selectedOrder===o.id?' active':'');el.innerHTML=`<small>${o.label.toUpperCase()}</small><strong>${d.emoji} ${o.title}</strong><span>+${o.rewardCoins} 🪙 · +${o.rewardLight} ✨</span>`;el.onclick=()=>{selectedOrder=o.id;selected=null;render();};orders.appendChild(el);}
 const node=currentRestoration(state);goalTitle.textContent=node?.title??'Lost Clearing restored';goalText.textContent=node?`${node.icon} ${itemDef(node.chain,node.tier).name} · ${node.coinCost} Coins · ${node.lightRequired} Light`:'Moonlit Grove unlocked';goalProgress.textContent=`${Math.min(state.restorationIndex,RESTORATION_NODES.length)}/${RESTORATION_NODES.length}`;
 energy.textContent=state.energy+'/'+state.maxEnergy;coins.textContent=state.coins;light.textContent=state.forestLight;
 orderBtn.disabled=!selectedOrder;const item=selectedItem();restoreBtn.disabled=!(node&&item?.type==='item'&&item.chain===node.chain&&item.tier===node.tier);storeBtn.disabled=item?.type!=='item';
 hint.textContent=state.phase==='first_merge'?'Drag the two Seeds together.':openEmptyIndices(state).length?'Choose an order, then produce and merge toward it.':'Merge to make space.';
 save();
}
orderBtn.onclick=()=>selectedOrder&&apply(completeOrder(state,selectedOrder));
restoreBtn.onclick=()=>Number.isInteger(selected)&&apply(restoreNode(state,selected));
storeBtn.onclick=()=>Number.isInteger(selected)&&apply(storeItem(state,selected));
render();
