// Vaultwake V5 UI: coast scene with the current task, two crew orders, the 6×6
// board and one suggestion. All rules live in core.mjs; this file only renders
// state, turns taps and drags into actions and plays feedback.
import {fresh,act,count,nameOf,FAMILIES,MAX_TIER,MAX_ENERGY,MEAL,currentTask} from './core.mjs';
import {TASKS,PRODUCERS,SITES,sceneFor} from './chapter.mjs';
import {orderProgress,ordersOpen,reservedItems,heldNeeds} from './orders.mjs';
import {containerInfo} from './containers.mjs';
import {suggest,focusNeeds} from './guide.mjs';
import {loadSlot,beginReplay,returnOriginal,slotKey} from './replay.mjs';
import {art,portrait} from './art.mjs';
import {sound,burst,moment,rewardFlight,reduced} from './feedback.mjs';
import {enablePremium,prototypeScene} from './premium.mjs';
import {platform} from '../v4/platform.mjs';

enablePremium(new URLSearchParams(location.search).get('art'));
const $=q=>document.querySelector(q);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const face=who=>portrait(who==='Neri'?'neri':'ivo');
const itemOf=(family,tier)=>({type:'item',family,tier});
const SITE_ORDER=Object.keys(SITES);

let state,replayActive=false;
try{const slot=loadSlot(localStorage);state=slot.state;replayActive=slot.active;}catch{state=fresh();}
let selected=null,shownScene=null,storyTimer=null,hintCells=[],beat=null,warning=null,warnTimer=null;

function persist(){
 try{const raw=JSON.stringify(state);localStorage.setItem(slotKey(replayActive),raw);if(!replayActive)platform.save(raw);}
 catch{say('Storage unavailable: this session plays, but progress will not be saved.');}
}
function say(text){$('#message').textContent=text;}
// A refused action explains itself in the hint bar for a moment.
function warn(text){warning=text;say(text);renderBar();clearTimeout(warnTimer);warnTimer=setTimeout(()=>{warning=null;renderBar();},2600);}

// ---------- Rendering ----------
function renderHeader(){
 const e=$('#energy');
 e.classList.toggle('empty',state.energy<1);
 $('#energyValue').textContent=state.energy;
 e.setAttribute('aria-label',state.energy<1?'Out of energy: take a free field meal':'Energy '+state.energy+' of '+MAX_ENERGY);
 $('#mealButton').hidden=state.energy>=1;
 const done=new Set(TASKS.slice(0,state.task).map(t=>t.site));
 const current=currentTask(state)?.site;
 $('#track').innerHTML=SITE_ORDER.map(id=>`<i class="${done.has(id)&&id!==current?'done':id===current?'now':''}" title="${esc(SITES[id].name)}"></i>`).join('');
 $('#chapterStep').textContent=state.task<TASKS.length?`Task ${state.task+1} of ${TASKS.length}`:'Chapter complete';
 $('#replayNotice').hidden=!replayActive;
}

function renderScene(){
 const stage=sceneFor(state.task);
 if(shownScene!==stage){
  const wrap=$('#scene');wrap.innerHTML=prototypeScene(stage);
  if(shownScene!==null&&!reduced())wrap.firstElementChild?.classList.add('arrive');
  shownScene=stage;
 }
 const t=currentTask(state);
 $('#siteTag').textContent=t?SITES[t.site].name:'Signal mast · raised';
}

function needSlot(r){
 const have=count(state,r),done=have>=r.count;
 return `<span class="need ${done?'done':''}" title="${esc(nameOf(itemOf(r.family,r.tier)))}">${art(itemOf(r.family,r.tier))}<b>${done?'✓':Math.min(have,r.count)+'/'+r.count}</b><em>${esc(nameOf(itemOf(r.family,r.tier)))}</em></span>`;
}

function renderTask(){
 const t=currentTask(state),el=$('#task');
 // A finished task stays on the card with its story line until Continue.
 if(beat){
  el.innerHTML=`<div class="taskHead beat"><span class="face">${face(beat.who)}</span><div><small>✓ ${esc(beat.site.toUpperCase())} RESTORED</small><h2>${esc(beat.title)}</h2><p class="line">${esc(beat.line)}</p></div></div><div class="taskActions"><span class="upNext">${t?'Next: '+esc(t.title):'Chapter 1 complete'}</span><button class="primary" data-continue>Continue</button></div>`;
  return;
 }
 if(!t){
  el.innerHTML=`<div class="taskHead"><span class="face">${face('Neri')}</span><div><small>CHAPTER 1 COMPLETE</small><h2>The fleet answered.</h2><p>Chapter 2 starts here soon. Thank you for playing this test build.</p></div></div><div class="taskActions"><button class="primary" data-replay>Play again</button></div>`;
  return;
 }
 const head=`<div class="taskHead"><span class="face">${face(t.who)}</span><div><small>${esc(t.who.toUpperCase())} · ${esc(SITES[t.site].name.toUpperCase())}</small><h2>${esc(t.title)}</h2><p>${esc(t.why)}</p></div></div>`;
 if(t.choices){
  el.innerHTML=head+`<div class="choices">${Object.entries(t.choices).map(([id,c])=>{const ok=c.needs.every(r=>count(state,r)>=r.count);return `<div class="choice"><div class="needs">${c.needs.map(needSlot).join('')}</div><button class="${ok?'primary':'ghost'}" data-choice="${id}" ${ok?'':'aria-disabled="true"'}>${esc(c.label)}</button><small class="perk">Upgrades ${esc(PRODUCERS[c.reward.upgrade].name)}</small></div>`;}).join('')}</div>`;
  return;
 }
 const ok=t.needs.every(r=>count(state,r)>=r.count);
 el.innerHTML=head+`<div class="taskActions"><div class="needs">${t.needs.map(needSlot).join('')}</div><button class="${ok?'primary':'ghost'}" data-task ${ok?'':'aria-disabled="true"'}>${t.needs.length?'Deliver':'Listen'}</button></div>`;
}

function renderOrders(){
 const el=$('#orders');
 if(!ordersOpen(state)){el.hidden=true;el.innerHTML='';return;}
 el.hidden=false;
 el.innerHTML=state.orders.lanes.map(o=>{
  if(!o)return '';
  const p=orderProgress(state,o),r=o.needs[0];
  const status=p.ready?'Ready':p.progress[0].held?'Make a spare':p.progress[0].current+'/'+r.count;
  return `<button class="order ${p.ready?'ready':''}" data-order="${o.id}" aria-label="${esc(o.who)} wants ${r.count} ${esc(nameOf(itemOf(r.family,r.tier)))}: ${status}">
   <span class="orderArt">${art(itemOf(r.family,r.tier))}${r.count>1?`<b>×${r.count}</b>`:''}</span>
   <span class="orderText"><small>${esc(o.who)}</small><strong>${status}</strong></span>
   <span class="orderPay">+${o.energy}<i>ϟ</i>${o.case?'<em title="Supply case">▣</em>':''}</span></button>`;
 }).join('');
}

function cellHTML(x,i,marks){
 if(!x)return `<button class="cell empty" data-i="${i}" aria-label="Empty space"></button>`;
 const cls=['cell',x.type];
 if(i===selected)cls.push('selected');
 if(marks.partner.has(i))cls.push('partner');
 if(marks.need.has(i))cls.push('need');
 if(hintCells.includes(i))cls.push('hint');
 let badge='',label=nameOf(x);
 if(x.type==='source'){const p=state.producers[x.id];badge=`<span class="badge">${p.rich?'★'+p.rich:'ϟ1'}</span>`;label+=': tap for parts';}
 if(x.type==='crate'){badge=`<span class="badge open">OPEN</span>`;label+=': tap to open';}
 if(x.type==='item'&&x.tier>0)badge=`<span class="tier">${x.tier+1}</span>`;
 return `<button class="${cls.join(' ')}" data-i="${i}" aria-label="${esc(label)}">${art(x)}${badge}</button>`;
}

function renderBoard(){
 const sel=state.board[selected];
 const partner=new Set(sel?.type==='item'?state.board.flatMap((y,j)=>j!==selected&&y?.type==='item'&&y.family===sel.family&&y.tier===sel.tier?[j]:[]):[]);
 const need=new Set();
 for(const r of heldNeeds(state))state.board.forEach((y,j)=>{if(y?.type==='item'&&y.family===r.family&&y.tier===r.tier)need.add(j);});
 $('#board').innerHTML=state.board.map((x,i)=>cellHTML(x,i,{partner,need})).join('');
}

function renderBar(){
 const x=state.board[selected],el=$('#selection');
 if(warning){el.innerHTML=`<p class="hintText warn">${esc(warning)}</p>`;return;}
 if(x?.type!=='item'){
  const g=beat?{cells:[],text:'Tap Continue for the next task.'}:suggest(state);hintCells=g.cells;
  el.innerHTML=`<p class="hintText">${esc(g.text)}</p>`;
  return;
 }
 hintCells=[];
 const next=x.tier<MAX_TIER?FAMILIES[x.family].names[x.tier+1]:null;
 const held=reservedItems(state).has(selected)&&count(state,x)<=heldNeeds(state).filter(r=>r.family===x.family&&r.tier===x.tier).reduce((n,r)=>n+r.count,0);
 el.innerHTML=`<span class="selArt">${art(x)}</span><span class="selText"><b>${esc(nameOf(x))}</b><small>${next?'Merge two → '+esc(next):'Fully merged'}${held?' · the task needs it':''}</small></span>${held?'':`<button class="ghost small" data-recycle>Recycle +${Math.max(1,x.tier)}ϟ</button>`}`;
}

function render(){
 if(selected!==null&&!['item','crate'].includes(state.board[selected]?.type))selected=null;
 renderHeader();renderScene();renderTask();renderOrders();renderBar();renderBoard();fitBoard();
}
// The board takes the height left under the task; on short screens it keeps
// thumb-sized cells and the page scrolls instead.
function fitBoard(){
 const b=$('#board'),w=b.parentElement.clientWidth,top=b.getBoundingClientRect().top+scrollY;
 const room=innerHeight-top-Math.max(10,parseFloat(getComputedStyle($('.game')).paddingBottom));
 b.style.width=Math.floor(Math.max(Math.min(w,room),Math.min(w,300)))+'px';
}
addEventListener('resize',fitBoard);

// ---------- Story ----------
function tell(who,line,ms=7000){
 const el=$('#story');
 el.innerHTML=`<span class="face">${face(who)}</span><p><b>${esc(who)}</b>${esc(line)}</p>`;
 el.hidden=false;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
 clearTimeout(storyTimer);storyTimer=setTimeout(()=>{el.hidden=true;},ms);
}

// ---------- Actions ----------
const cellRect=i=>$(`#board [data-i="${i}"]`)?.getBoundingClientRect();
function run(a,origin=null){
 const before={energy:state.energy,unlocked:Object.fromEntries(Object.entries(state.producers).map(([k,p])=>[k,p.unlocked]))};
 const r=act(state,a);
 if(!r.ok){warn(r.message);sound.play('tap');return r;}
 platform.startGameplay();
 say(r.message);warning=null;
 if(r.event==='task')beat={who:r.task.who,site:SITES[r.task.site].name,title:r.choice?r.task.choices[r.choice].label+' crossing taken':r.task.title,line:r.message};
 // Selection ends with every action so the next suggestion is always visible.
 selected=null;
 render();persist();
 // Feedback after render so effects land on the new cells.
 if(r.event==='merge'){
  const rect=cellRect(r.index);burst(rect,r.made.family,r.made.tier>=3);sound.play('merge',r.made.tier);
  $(`#board [data-i="${r.index}"]`)?.classList.add('pop');
  if(r.first&&r.made.tier>=2)moment('New: '+nameOf(r.made),'First one on this coast · +2 energy',r.made);
 }
 if(r.event==='produce'||r.event==='container'){
  for(const i of r.reveal??[])$(`#board [data-i="${i}"]`)?.classList.add('drop');
  sound.play(r.event==='container'?'rare':'tap');
  if(r.event==='container')burst(cellRect(r.index),'gold',true);
 }
 if(r.event==='order'){
  sound.play('contract');rewardFlight(origin,$('#energy').getBoundingClientRect(),'+'+r.order.energy+'ϟ');
  for(const i of r.reveal)$(`#board [data-i="${i}"]`)?.classList.add('drop');
 }
 if(r.event==='recycle'||r.event==='meal')rewardFlight(origin??cellRect(a.index),$('#energy').getBoundingClientRect(),'+'+(state.energy-before.energy)+'ϟ');
 if(r.event==='task'){
  sound.play('milestone');
  platform.event([{type:'milestone_completed'}]);
  burst($('#scene').getBoundingClientRect(),'gold',true);
  $('#story').hidden=true;
  $('#scene').classList.remove('flash');void $('#scene').offsetWidth;$('#scene').classList.add('flash');
  for(const i of r.reveal)$(`#board [data-i="${i}"]`)?.classList.add('drop');
  const opened=Object.keys(before.unlocked).find(k=>!before.unlocked[k]&&state.producers[k].unlocked);
  if(opened){
   $(`#board [data-i="${r.unlocked}"]`)?.classList.add('drop');
   setTimeout(()=>moment(PRODUCERS[opened].name+' repaired',PRODUCERS[opened].job,{type:'source',id:opened}),900);
  }else if(r.task.reward.upgrade||r.choice)setTimeout(()=>moment('Producer upgraded','Every third tap now makes a better part.'),900);
  else if(r.task.reward.orders)setTimeout(()=>moment('Crew orders open','Spare parts now buy energy.'),900);
 }
 return r;
}

function tapCell(i){
 const x=state.board[i];
 if(x?.type==='source'){selected=null;run({type:'produce',id:x.id});return;}
 if(x?.type==='crate'){run({type:'open',index:i});return;}
 const sel=state.board[selected];
 if(x?.type==='item'){
  if(sel?.type==='item'&&selected!==i&&sel.family===x.family&&sel.tier===x.tier){run({type:'merge',from:selected,to:i});return;}
  selected=selected===i?null:i;render();return;
 }
 if(!x&&sel&&selected!==null){run({type:'move',from:selected,to:i});selected=null;render();return;}
 selected=null;render();
}

// Taps and drags share one pointer path; a drag that ends on a cell merges or moves.
let drag=null;
const board=$('#board');
board.addEventListener('pointerdown',e=>{
 const b=e.target.closest('.cell');if(!b)return;
 const i=+b.dataset.i,x=state.board[i];
 drag={i,x0:e.clientX,y0:e.clientY,moved:false,ghost:null,movable:x?.type==='item'||x?.type==='crate'};
});
board.addEventListener('pointermove',e=>{
 if(!drag?.movable)return;
 const dx=e.clientX-drag.x0,dy=e.clientY-drag.y0;
 if(!drag.moved&&Math.hypot(dx,dy)<10)return;
 if(!drag.moved){
  drag.moved=true;board.setPointerCapture?.(e.pointerId);
  const src=board.querySelector(`[data-i="${drag.i}"]`),r=src.getBoundingClientRect();
  drag.ghost=document.createElement('div');drag.ghost.className='dragGhost';drag.ghost.innerHTML=art(state.board[drag.i]);
  drag.ghost.style.cssText=`width:${r.width}px;height:${r.height}px;left:${r.left}px;top:${r.top}px`;
  document.body.append(drag.ghost);src.classList.add('lifted');
  drag.ox=r.left;drag.oy=r.top;
 }
 drag.ghost.style.transform=`translate(${dx}px,${dy}px) scale(1.12)`;
});
function endDrag(e){
 if(!drag)return;
 const d=drag;drag=null;
 if(!d.moved){tapCell(d.i);return;}
 d.ghost.remove();
 const over=document.elementFromPoint(e.clientX,e.clientY)?.closest('#board .cell');
 const to=over?+over.dataset.i:null;
 if(to===null||to===d.i){render();return;}
 const x=state.board[d.i],y=state.board[to];
 const r=run({type:x?.type==='item'&&y?.type==='item'?'merge':'move',from:d.i,to});
 if(!r.ok)render();
}
board.addEventListener('pointerup',endDrag);
board.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null;render();});
board.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const b=e.target.closest('.cell');if(b){e.preventDefault();tapCell(+b.dataset.i);}}});
board.addEventListener('click',e=>{if(e.detail===0){const b=e.target.closest('.cell');if(b)tapCell(+b.dataset.i);}});

$('#task').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-replay')){$('#replayConfirm').showModal();return;}
 if(b.hasAttribute('data-continue')){beat=null;render();const t=currentTask(state);if(t&&!reduced())$('#task').classList.add('enter');setTimeout(()=>$('#task').classList.remove('enter'),500);return;}
 const t=currentTask(state);
 if(b.getAttribute('aria-disabled')==='true'){
  const g=suggest(state);warn(t?.choices?'Make the part for one side first.':'Make the parts first: '+g.text.charAt(0).toLowerCase()+g.text.slice(1));hintCells=g.cells;renderBoard();
  for(const i of hintCells)$(`#board [data-i="${i}"]`)?.classList.add('nudge');
  return;
 }
 run(b.dataset.choice?{type:'task',choice:b.dataset.choice}:{type:'task'});
});
$('#orders').addEventListener('click',e=>{const b=e.target.closest('[data-order]');if(b)run({type:'order',id:b.dataset.order},b.getBoundingClientRect());});
$('#selection').addEventListener('click',e=>{if(e.target.closest('[data-recycle]'))run({type:'recycle',index:selected},cellRect(selected));});
$('#mealButton').onclick=e=>run({type:'meal'},e.currentTarget.getBoundingClientRect());
$('#story').onclick=()=>{$('#story').hidden=true;};

// ---------- Menu, sound, replay ----------
const soundLabel=()=>{$('#soundButton').textContent=sound.enabled()?'Sound: on':'Sound: off';};
$('#soundButton').onclick=()=>{sound.toggle();soundLabel();};
$('#menuButton').onclick=()=>$('#menu').showModal();
for(const b of document.querySelectorAll('dialog .close,[data-close]'))b.onclick=()=>b.closest('dialog').close();
$('#replayButton').onclick=()=>{$('#menu').close();$('#replayConfirm').showModal();};
$('#replayBegin').onclick=()=>{
 try{state=beginReplay(localStorage);replayActive=true;}catch{state=fresh();replayActive=true;}
 selected=null;shownScene=null;beat=null;$('#replayConfirm').close();render();intro();
};
$('#returnSave').onclick=()=>{
 try{state=returnOriginal(localStorage);}catch{state=fresh();}
 replayActive=false;selected=null;shownScene=null;beat=null;render();persist();say('Back to your saved expedition.');
};

function intro(){
 if(state.task===0&&state.moves===0)tell('Ivo','The storm wrecked our landing. Tap two matching parts to merge them into a better tool.',12000);
}

soundLabel();render();persist();intro();platform.init();
