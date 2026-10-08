import {itemDef,PRODUCERS} from './core/catalog.mjs';
import {createInitialState,restore,serialize} from './core/state.mjs';
import {boardStatus,currentRequest,deliver,frontierCrates,merge,move,recycle,requestProgress,tapProducer} from './core/engine.mjs';

const KEY='wispwood-v2-continuous';
const board=document.querySelector('#board'),energy=document.querySelector('#energy'),questMode=document.querySelector('#questMode'),questTitle=document.querySelector('#questTitle'),questText=document.querySelector('#questText'),questState=document.querySelector('#questState'),hint=document.querySelector('#hint'),deliverBtn=document.querySelector('#deliverBtn'),recycleBtn=document.querySelector('#recycleBtn'),toast=document.querySelector('#toast');
let state=restore(localStorage.getItem(KEY))??createInitialState(),selected=null,drag=null,timer=null;

function msg(t){toast.textContent=t;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),1100);}
function save(){localStorage.setItem(KEY,serialize(state));}
function findRequestedItem(){
 const q=currentRequest(state);
 return q?state.cells.findIndex(c=>c.content?.type==='item'&&c.content.chain===q.chain&&c.content.tier===q.tier):-1;
}
function guidance(){
 if(state.phase==='first_merge')return 'Drag the two matching Seeds together.';
 if(findRequestedItem()>=0)return 'Tap the requested item, then Deliver.';
 if(boardStatus(state).pair)return 'Drag matching items together.';
 return 'Tap the Ancient Tree to create Seeds.';
}
function apply(r){
 if(!r.ok){msg(r.reason);return;}
 state=r.state;selected=null;
 if(r.events.some(e=>e.type==='mivra_rescued'))msg('💜 Mivra rescued — Forest Orders unlocked!');
 else if(r.events.some(e=>e.type==='request_completed'))msg('🌿 Request complete!');
 else if(r.events.some(e=>e.type==='merged'))msg('✨ Merge!');
 else if(r.events.some(e=>e.type==='produced'))msg('🌳 Seed created');
 else msg('Done');
 render();
}
function render(){
 board.innerHTML='';const frontier=new Set(frontierCrates(state));
 state.cells.forEach((cell,i)=>{
  const b=document.createElement('button');b.className='tile '+cell.terrain;b.dataset.index=i;b.type='button';
  if(frontier.has(i))b.classList.add('frontier');
  if(cell.terrain==='open'&&cell.content?.type==='item'){b.classList.add('item');const d=itemDef(cell.content);b.innerHTML=`<span class="emoji">${d.emoji}</span><span class="tier">T${cell.content.tier+1}</span>`;}
  if(cell.terrain==='open'&&cell.content?.type==='producer'){b.classList.add('producer');const d=PRODUCERS[cell.content.producerId];b.innerHTML=`<span class="emoji">${d.emoji}</span><span class="tier">SOURCE</span>`;}
  b.addEventListener('pointerdown',e=>{if(cell.terrain!=='open'||!cell.content)return;drag={id:e.pointerId,from:i,x:e.clientX,y:e.clientY,moved:false,producer:cell.content.type==='producer'};b.setPointerCapture?.(e.pointerId);});
  b.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;if(!drag.moved)return;document.querySelectorAll('.drag-source,.drag-target').forEach(x=>x.classList.remove('drag-source','drag-target'));board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('drag-source');document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.tile')?.classList.add('drag-target');});
  b.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;document.querySelectorAll('.drag-source,.drag-target').forEach(x=>x.classList.remove('drag-source','drag-target'));if(d.producer&&!d.moved){apply(tapProducer(state,d.from));return;}const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.tile'),to=hit?Number(hit.dataset.index):d.from;if(!d.moved||to===d.from){selected=d.from;render();return;}apply(state.cells[to]?.terrain==='open'&&state.cells[to].content===null?move(state,d.from,to):merge(state,d.from,to));});
  board.appendChild(b);
 });

 const q=currentRequest(state),p=requestProgress(state);
 energy.textContent=state.energy+'/'+state.maxEnergy;
 questMode.textContent=state.rescued?'FOREST ORDERS':'CHAPTER ONE';
 questTitle.textContent=q?.title??'Forest Restored';
 questState.textContent=state.rescued?`#${state.ordersCompleted+1}`:`${p.current}/${p.total}`;
 questText.textContent=q?.description??'Keep merging and restoring the forest.';
 hint.textContent=guidance();

 const item=Number.isInteger(selected)?state.cells[selected]?.content:null;
 deliverBtn.disabled=!(q&&item?.type==='item'&&item.chain===q.chain&&item.tier===q.tier);
 recycleBtn.disabled=item?.type!=='item';save();
}
deliverBtn.onclick=()=>Number.isInteger(selected)&&apply(deliver(state,selected));
recycleBtn.onclick=()=>Number.isInteger(selected)&&apply(recycle(state,selected));
render();
