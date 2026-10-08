import {itemDef,PRODUCERS,QUESTS} from './core/catalog.mjs';
import {createInitialState,restore,serialize} from './core/state.mjs';
import {boardStatus,deliver,frontierCrates,merge,move,recycle,tapProducer} from './core/engine.mjs';

const KEY='wispwood-v2-foundation';
const board=document.querySelector('#board'),energy=document.querySelector('#energy'),questText=document.querySelector('#questText'),questState=document.querySelector('#questState'),hint=document.querySelector('#hint'),deliverBtn=document.querySelector('#deliverBtn'),recycleBtn=document.querySelector('#recycleBtn'),toast=document.querySelector('#toast');
let state=restore(localStorage.getItem(KEY))??createInitialState(),selected=null,drag=null,timer=null;

function msg(t){toast.textContent=t;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),1000);}
function save(){localStorage.setItem(KEY,serialize(state));}
function guidance(){
 if(state.quest.completed)return 'Quest complete — foundation loop works.';
 if(state.phase==='first_merge')return 'Drag the two matching Seeds together.';
 const herb=state.cells.findIndex(c=>c.content?.type==='item'&&c.content.tier===2);
 if(herb>=0)return 'Tap the Herb, then Deliver.';
 if(boardStatus(state).pair)return 'Drag matching items together.';
 return 'Tap the Ancient Tree twice to create a pair.';
}
function apply(r){if(!r.ok){msg(r.reason);return;}state=r.state;selected=null;msg(r.events.some(e=>e.type==='merged')?'✨ Merge!':r.events.some(e=>e.type==='produced')?'🌳 Seed created':'Done');render();}
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
 energy.textContent=state.energy+'/'+state.maxEnergy;questState.textContent=state.quest.completed?'✓':'0/1';questText.textContent=guidance();hint.textContent=guidance();
 const item=Number.isInteger(selected)?state.cells[selected]?.content:null,q=QUESTS[state.quest.id];
 deliverBtn.disabled=!(item?.type==='item'&&item.chain===q.chain&&item.tier===q.tier&&!state.quest.completed);
 recycleBtn.disabled=item?.type!=='item';save();
}
deliverBtn.onclick=()=>Number.isInteger(selected)&&apply(deliver(state,selected));
recycleBtn.onclick=()=>Number.isInteger(selected)&&apply(recycle(state,selected));
render();
