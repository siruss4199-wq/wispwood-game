// Coast Camp: the new-loop page (v5/play.html). Same look as Classic V5, one loop:
// generators → merge → crew orders → ★ stars → restore the coast on the map.
import {SAVE_KEY,fresh,load,act,tick,nameOf,item,matches,count,orderItems,orderProgress,nextTask,currentArea,areaDone,sourceOpen,SOURCES,chainsOf} from './game.mjs';
import {AREAS} from './areas.mjs';
import {cellPos} from '../core.mjs';
import {CHAINS,draw,maxTier,chainsAt,GENERATOR_CHAINS} from './chains.mjs';
import {art,portrait} from '../art.mjs';
import {enablePremium} from '../premium.mjs';
import {kitsMerge,feeds,kitFull,kitDrop,kitCapacity,producerLevel,KIT_SIZES,KIT_DROPS,MAX_KIT_SIZE,MAX_PRODUCER_LEVEL} from '../kits.mjs';
import {xpToNext} from '../levels.mjs';
import {refillTimes,clock,REFILL_CAP,rationWait} from '../energy.mjs';
import {CREW} from '../crew.mjs';
import {sound,reduced,burst,rewardFlight,moment as sharedMoment} from '../feedback.mjs';
// The shared moment draws its icon with the Classic art; new chains need draw().
function moment(title,detail='',x=null){sharedMoment(title,detail,null);const el=document.querySelector('.moment');if(!x||!el)return;const icon=document.createElement('span');icon.style.cssText='float:left;width:42px;height:42px;margin-right:10px';icon.innerHTML=draw(x);icon.firstElementChild.style.cssText='width:100%;height:100%';el.prepend(icon);}

enablePremium('vibrant');document.body.dataset.art='premium';document.body.dataset.palette='vibrant';
const $=q=>document.querySelector(q),board=$('#board');
const storage={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
let state=load(storage.get(SAVE_KEY)??'',Date.now()),selected=null,focusOrder=null,drag=null,suppressUntil=0;
const persist=()=>storage.set(SAVE_KEY,JSON.stringify(state));
persist();

const ICONS={rock:{type:'rock'},'crate-salvage':{type:'crate',kind:'salvage'},'crate-survey':{type:'crate',kind:'survey'},'source-chart':{type:'source',id:'chart'},'flux-3':item('flux',3),'chart-1':item('chart',1)};
const iconArt=k=>k==='workshop'?'<img class="art" src="assets/premium/workshop-operational.webp" alt="">':art(ICONS[k]);
const wantedKeys=()=>new Set(state.orders.flatMap(o=>o.needs.map(r=>r.family+r.tier)));

// ---------- rendering ----------
function render(){
 const area=currentArea(state),task=nextTask(state),done=area.tasks.filter(t=>state.done.includes(t.id));
 $('#areaBrand').textContent=area.name.toUpperCase();
 $('#energy').innerHTML=`${state.energy}<span class="energyCap">/${REFILL_CAP}</span>`;
 $('#stars').textContent=state.stars;
 const lv=state.level;$('#levelNum').textContent=lv.level;$('#levelPill').style.setProperty('--p',Math.round(100*lv.xp/xpToNext(lv.level))+'%');$('#levelPill').setAttribute('aria-label',`Level ${lv.level}, ${lv.xp} of ${xpToNext(lv.level)} XP`);
 $('#mapReady').hidden=!(task&&state.stars>=task.cost);
 // The coast picture with what has been restored standing on it.
 const pic=`assets/premium/${area.picture}-vibrant.webp`;
 if($('#scenePic').dataset.pic!==pic){$('#scenePic').dataset.pic=pic;$('#scenePic').innerHTML=`<img class="premiumScene" src="${pic}" width="1200" height="400" alt="${area.name}" decoding="async" fetchpriority="high">`;}
 $('#scene').style.setProperty('--restored',area.tasks.length?done.length/area.tasks.length:1);
 $('#restored').innerHTML=done.map(t=>`<span class="restoredIcon" data-task="${t.id}" style="left:${t.at[0]}%;top:${t.at[1]}%">${iconArt(t.icon)}</span>`).join('');
 $('#areaLabel').textContent=area.name.toUpperCase();$('#areaCount').textContent=`${done.length} / ${area.tasks.length} restored`;
 // Next restoration card.
 if(task){
  $('#taskTitle').textContent=task.name;$('#taskCost').textContent=`★ ${Math.min(state.stars,task.cost)}/${task.cost}`;
  $('#taskIcon').innerHTML=`<span class="taskIcon">${iconArt(task.icon)}</span>`;
  const ready=state.stars>=task.cost;$('#taskButton').textContent=ready?`Restore · ★${task.cost}`:`★ ${state.stars}/${task.cost}`;$('#taskButton').classList.toggle('ready',ready);
  $('.nextTask').classList.toggle('ready',ready);
  const pct=Math.min(100,Math.floor(100*state.stars/task.cost));$('#taskProgress').hidden=false;$('#taskProgress s').style.width=pct+'%';$('#taskProgress b').textContent=pct+'%';$('#taskProgress').classList.toggle('complete',pct>=100);
 }else{
  $('#taskTitle').textContent=areaDone(state)?area.name+' restored':'All done';$('#taskCost').textContent='';$('#taskIcon').innerHTML='';
  $('#taskButton').textContent='Map';$('#taskButton').classList.remove('ready');$('.nextTask').classList.remove('ready');$('#taskProgress').hidden=true;
 }
 renderOrders();renderBoard();renderSelection();renderHint();
 $('#rationButton').hidden=state.energy>3;
 const wait=rationWait(state,Date.now());$('#rationButton').textContent=wait>0?`Field ration in ${clock(wait)}`:'Field ration · +8 ϟ';$('#rationButton').disabled=wait>0;
 $('#soundButton').textContent=sound.enabled()?'Sound on':'Sound off';
}
function renderOrders(){
 $('#requests').innerHTML=`<div class="requestHeading"><span>CREW ORDERS <small>Deliver for ★ stars</small></span><b title="Stars">★ ${state.stars}</b></div><div class="requestShelf">${[...state.orders].sort((a,b)=>Number(!!orderItems(state,b))-Number(!!orderItems(state,a))).map(o=>{
  const p=orderProgress(state,o),ready=!!orderItems(state,o),who=CREW[o.who];
  return `<button class="requestCard ${ready?'ready':''} ${focusOrder===o.id?'active':''}" data-order="${o.id}" aria-label="${who.name} asks for ${o.needs.map(r=>r.count+' '+nameOf(item(r.family,r.tier))).join(', ')}. ${ready?'Ready: tap to deliver.':'In progress.'} Reward ${o.stars} stars"><span class="requestCrew">${portrait(o.who)}<b class="requestLane"><em>${who.name}</em>${who.role}</b></span><span class="requestItems">${p.map(r=>`<span>${draw(item(r.family,r.tier))}<b>${r.have}/${r.count}</b></span>`).join('')}</span><span class="requestReward">+${o.stars} ★</span><strong>${ready?'✓ DELIVER':'MAKE'}</strong></button>`;
 }).join('')}</div>`;
}
function renderBoard(){
 const sel=state.board[selected],want=wantedKeys(),focus=state.orders.find(o=>o.id===focusOrder);
 const focusKeys=new Set(focus?.needs.map(r=>r.family+r.tier)??[]);
 board.innerHTML=state.board.map((x,i)=>{
  const [r,c]=cellPos(i),locked=x?.type==='source'&&!sourceOpen(state,x.id);
  const twin=sel&&i!==selected&&(sel.type==='item'&&x?.type==='item'&&matches(x,sel)&&sel.tier<maxTier(sel.family)||sel.type==='kit'&&(kitsMerge(sel,x)||feeds(sel,x)));
  const wanted=x?.type==='item'&&want.has(x.family+x.tier),focused=x?.type==='item'&&focusKeys.has(x.family+x.tier);
  let badge='';
  if(x?.type==='source')badge=locked?`<span class="lockedLabel">${x.id==='chart'?'SIGNAL MAST':'WORKSITE'}</span>`:`<span class="energyCue">ϟ1</span>${producerLevel(x)>1?`<span class="srcLevel">Lv${producerLevel(x)}</span>`:''}`;
  else if(x?.type==='kit')badge=`<span class="pulls">${x.left}</span><span class="kitSize" aria-hidden="true">${'SML'[x.size-1]}</span>`;
  else if(x?.type==='jar')badge=`<span class="sealBadge">+${x.energy}ϟ</span>`;
  else if(x?.type==='gate')badge=`<span class="gateLevel" aria-hidden="true">${x.level}</span>`;
  else if(wanted)badge='<span class="useBadge" aria-hidden="true">★</span>';
  return `<button class="tile ${x?.type??'empty'} ${locked?'locked':''} ${selected===i?'selected':''} ${twin?'match':''} ${wanted?'wanted':''} ${focused?'nextAction':''}" data-index="${i}" style="grid-row:${r+1};grid-column:${c+1}" ${x?.family||x?.id?`data-family="${x.family??x.id}"`:''} aria-label="${nameOf(x)}${locked?' · locked':''}. Space ${i+1}" aria-pressed="${selected===i}">${draw(x)}${badge}</button>`;
 }).join('');
 $('#free').textContent=state.board.filter(x=>x===null).length+' spaces';
}
function renderSelection(){
 const x=state.board[selected];let title='',desc='',buttons='';
 if(!x){$('#selection').innerHTML='';return;}
 title=nameOf(x);
 if(x.type==='item'){
  desc=x.tier<maxTier(x.family)?`Merge with a twin → ${CHAINS[x.family].names[x.tier+1]}.`:'Top of its chain.';
  if(wantedKeys().has(x.family+x.tier))desc='★ A crew order wants this. '+desc;
  buttons='<button data-action="recycle">Recycle · +1 ϟ</button>';
 }else if(x.type==='source'){
  const makes=GENERATOR_CHAINS[x.id].map(([c,l])=>producerLevel(x)>=l?CHAINS[c].names[0]:`${CHAINS[c].names[0]} at Lv${l}`).join(' · ');
  desc=sourceOpen(state,x.id)?`Level ${producerLevel(x)} · 1 energy a tap · makes ${makes}.`+(producerLevel(x)<MAX_PRODUCER_LEVEL?' Feed it a Large box of its kind to level it up.':''):x.id==='chart'?'Restore the signal mast on the map to fly the Survey Kite.':'Wakes at the Survey Worksite (next area).';
  if(sourceOpen(state,x.id))buttons=`<button class="accent" data-action="produce">Make · 1 ϟ</button>`;
 }else if(x.type==='kit'){
  desc=`Tap again for a free part (${chainsOf(state,x.family).map(c=>CHAINS[c].names[0]).join(' or ')} chain) · ${x.left} of ${kitCapacity(x)} left.`+(kitFull(x)&&x.size<MAX_KIT_SIZE?` Or merge with a twin into a ${KIT_SIZES[x.size]} box (${KIT_DROPS[x.size+1].length} better parts).`:kitFull(x)?` Or drag it onto ${SOURCES[x.family].name} to level it up.`:'');
  buttons='<button class="accent" data-action="openKit">Take a part</button>';
 }else if(x.type==='sand')desc=x.find?`Something is buried here. Merge two parts right next to it to dig it out.`:'Sand. Merge two parts right next to it to dig it away.';
 else if(x.type==='gate')desc=`Opens at level ${x.level} (you are level ${state.level.level}).`;
 else if(x.type==='jar')desc='Energy, sealed in a jar.';
 $('#selection').innerHTML=`<span class="preview">${draw(x)}</span><span class="copy"><b>${title}</b><small>${desc}</small></span><span class="actionGroup">${buttons}</span>`;
}
function renderHint(){
 const task=nextTask(state),ready=state.orders.find(o=>orderItems(state,o));let hint;
 if(!state.merges)hint='START · Tap a Copper offcut, then its twin';
 else if(task&&state.stars>=task.cost)hint=`★ ${task.cost} ready · Restore ${task.name} ↑`;
 else if(ready)hint='Order ready · tap it to collect ★';
 else if(state.energy<1){const t=refillTimes(state,Date.now());hint='Out of energy · +1 in '+clock(t?.next??0);}
 else hint='Make the parts the crew orders want';
 $('#hint').textContent=hint;
}
function header(){
 if(tick(state,Date.now())){persist();render();}
 const t=refillTimes(state,Date.now());$('#energyTimer').textContent=t?'+1 '+clock(t.next):'FULL';
 $('#energy').innerHTML=`${state.energy}<span class="energyCap">/${REFILL_CAP}</span>`;
}

// ---------- actions ----------
function run(a){
 const before={stars:state.stars,energy:state.energy},fromRect=a.type==='produce'?board.querySelector(`[data-index="${state.board.findIndex(x=>x?.type==='source'&&x.id===a.id)}"]`)?.getBoundingClientRect():a.type==='openKit'?board.querySelector(`[data-index="${a.index}"]`)?.getBoundingClientRect():null;
 const orderRect=a.type==='deliver'?$(`[data-order="${a.id}"]`)?.getBoundingClientRect():null;
 const r=act(state,a,Date.now());
 if(!r.ok){$('#message').textContent=r.message;sound.play('tap');return r;}
 $('#message').textContent=r.message;
 if(r.event==='merge'||r.event==='move'||r.event==='producerUp')selected=r.event==='producerUp'?null:r.index;
 if(r.event==='deliver'){focusOrder=null;selected=null;}
 persist();render();
 const tile=r.index!=null?board.querySelector(`[data-index="${r.index}"]`):null;
 if(r.event==='merge'){tile?.classList.add('merge-pop');burst(tile?.getBoundingClientRect(),state.board[r.index]?.family);sound.play('merge',state.board[r.index]?.tier??0);for(const d of r.dug??[])board.querySelector(`[data-index="${d.index}"]`)?.classList.add('unlocked');}
 if((r.event==='produce'||r.event==='kit')&&fromRect&&tile&&!reduced()){const to=tile.getBoundingClientRect(),el=document.createElement('div');el.className='flight';el.innerHTML=draw(state.board[r.index]);el.style.cssText=`left:${fromRect.x}px;top:${fromRect.y}px;--dx:${to.x-fromRect.x}px;--dy:${to.y-fromRect.y}px`;document.body.append(el);setTimeout(()=>el.remove(),460);}
 if(r.event==='deliver'){rewardFlight(orderRect,$('#starPill').getBoundingClientRect(),`+${r.stars} ★`);sound.play('contract');$('#starPill').classList.remove('bump');void $('#starPill').offsetWidth;$('#starPill').classList.add('bump');}
 if(r.event==='producerUp'){const src=state.board[r.index];if(r.newChain)newChainMoment(src.id,r.newChain);else moment(SOURCES[src.id].name+' · level '+src.level,'Its parts come out better more often.',src);sound.play('milestone');}
 if(r.event==='restore')showBeat(r.task,r.effects);
 if(r.found?.length&&r.event!=='restore'){const k=r.found.at(-1),x=item(k.replace(/\d+$/,''),+k.match(/\d+$/)[0]);if(x.tier>=2)setTimeout(()=>moment('New: '+nameOf(x),x.tier<maxTier(x.family)?'Next: '+CHAINS[x.family].names[x.tier+1]:'Top of the chain',x),r.levelUp?1600:0);}
 if(r.levelUp){const u=r.levelUp.at(-1);setTimeout(()=>{moment('Level '+u.level+'!',`Chest: +${r.levelUp.reduce((n,v)=>n+v.energy,0)} ϟ`+(u.family?' · '+nameOf({type:'kit',family:u.family,size:1}):'')+(u.opened.length?` · ${u.opened.length} new spaces`:''),u.family?{type:'kit',family:u.family,size:1,left:3}:null);sound.play('milestone');$('#levelPill').classList.add('levelUp');setTimeout(()=>$('#levelPill').classList.remove('levelUp'),1400);for(const v of r.levelUp)for(const i of v.opened)board.querySelector(`[data-index="${i}"]`)?.classList.add('unlocked');},r.event==='restore'?0:400);}
 return r;
}
function clickTile(i){
 const x=state.board[i],prev=state.board[selected];
 if(x?.type==='source'){selected=i;if(sourceOpen(state,x.id)){if(prev?.type==='kit'&&feeds(prev,x)){run({type:'merge',from:selected,to:i});return;}run({type:'produce',id:x.id});}render();return;}
 if(selected!==null&&selected!==i&&prev){
  if(prev.type==='item'&&x?.type==='item'&&matches(x,prev)||prev.type==='kit'&&(kitsMerge(prev,x)||feeds(prev,x))||['item','kit'].includes(prev.type)&&!x){run({type:'merge',from:selected,to:i});return;}
 }
 if(x?.type==='kit'&&selected===i){run({type:'openKit',index:i});return;}
 selected=selected===i&&x?.type==='item'?null:x?i:null;render();
}
board.addEventListener('click',e=>{const t=e.target.closest('[data-index]');if(t&&performance.now()>suppressUntil)clickTile(+t.dataset.index);});
board.addEventListener('pointerdown',e=>{const t=e.target.closest('[data-index]');if(!t||e.button!==0)return;const i=+t.dataset.index;if(!['item','kit'].includes(state.board[i]?.type))return;drag={from:i,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};});
board.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8&&!drag.moved){drag.moved=true;board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('dragging');}});
board.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;board.querySelectorAll('.dragging').forEach(x=>x.classList.remove('dragging'));if(!d.moved)return;suppressUntil=performance.now()+300;const t=document.elementFromPoint(e.clientX,e.clientY)?.closest('#board [data-index]');if(t&&+t.dataset.index!==d.from){selected=d.from;run({type:'merge',from:d.from,to:+t.dataset.index});}});
board.addEventListener('pointercancel',()=>{drag=null;});
$('#selection').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const x=state.board[selected];run({type:b.dataset.action,index:selected,id:x?.id});});
$('#requests').addEventListener('click',e=>{const c=e.target.closest('[data-order]');if(!c)return;const o=state.orders.find(o=>o.id===c.dataset.order);if(!o)return;if(orderItems(state,o)){run({type:'deliver',id:o.id});return;}focusOrder=focusOrder===o.id?null:o.id;render();$('#message').textContent=`${CREW[o.who].name} needs ${o.needs.map(r=>r.count+' × '+nameOf(item(r.family,r.tier))).join(' and ')}. Their parts are marked on the board.`;});
$('#taskButton').onclick=()=>{const t=nextTask(state);if(t&&state.stars>=t.cost)run({type:'restore',id:t.id});else showMap();};
$('#mapButton').onclick=showMap;$('#scene').onclick=showMap;
$('#rationButton').onclick=()=>run({type:'ration'});
$('#soundButton').onclick=()=>{sound.toggle();render();};
$('#helpButton').onclick=()=>$('#help').showModal();
$('#menuButton').onclick=()=>{$('#classicNote').textContent=storage.get('vaultwake-v5')?'Your Classic save is kept and continues where you left it.':'';$('#menu').showModal();};
$('#newGame').onclick=()=>{if(!confirm('Start the Coast Camp from the beginning? Your Classic save is not affected.'))return;state=fresh(Date.now());selected=null;focusOrder=null;persist();$('#menu').close();render();showIntro();};
for(const d of document.querySelectorAll('dialog'))d.querySelector('.close')?.addEventListener('click',()=>d.close());

// ---------- map and story ----------
function showMap(){
 const html=AREAS.map((a,k)=>{
  const here=k===state.area,done=a.tasks.filter(t=>state.done.includes(t.id)).length,next=k===state.area?nextTask(state):null;
  const tasks=here?`<ol class="places">${a.tasks.map(t=>{
   const isDone=state.done.includes(t.id),isNext=next?.id===t.id,afford=isNext&&state.stars>=t.cost;
   const status=isDone?'done':afford?'ready':isNext?'next':'locked';
   return `<li class="place" data-status="${status}"><span class="placeIcon">${iconArt(t.icon)}</span><span><strong>${t.name}</strong><small>${isDone?t.lines[0][1]:isNext?(afford?'Ready to restore':`★ ${state.stars}/${t.cost} · deliver crew orders for stars`):'Restore the places before it first'}</small></span>${isDone?`<button data-replay="${t.id}" aria-label="Replay ${t.name}">✓</button>`:`<button data-restore="${t.id}" ${afford?'':'disabled'}>★ ${t.cost}</button>`}</li>`;}).join('')}</ol>`:'';
  return `<section class="mapArea ${here?'here':''} ${a.coming?'coming':''}"><div class="mapHead"><img src="assets/premium/${a.picture}-vibrant.webp" alt=""><div><h2>${a.name}</h2><b>${a.coming?'Next update':`${done}/${a.tasks.length}`}</b></div></div>${tasks}</section>`;
 }).join('');
 $('#mapContent').innerHTML=`<h2 id="mapTitle" class="mapTitle">The coast · ★ ${state.stars}</h2>${html}`;
 if(!$('#coastMap').open)$('#coastMap').showModal();
}
$('#mapContent').addEventListener('click',e=>{
 const r=e.target.closest('[data-restore]');if(r){const res=run({type:'restore',id:r.dataset.restore});if(res.ok)$('#coastMap').close();else showMap();return;}
 const p=e.target.closest('[data-replay]');if(p){$('#coastMap').close();showBeat(p.dataset.replay,{});}
});
function showBeat(id,effects){
 const area=AREAS.find(a=>a.tasks.some(t=>t.id===id)),t=area.tasks.find(t=>t.id===id);
 const extra=[];if(effects?.source==='chart')extra.push(['neri','Survey Kite unlocked: tap it for Kite parts.']);
 if(effects?.newChain)extra.push([CHAINS[effects.newChain].gen==='rig'?'ivo':'neri',`New chain: ${CHAINS[effects.newChain].names.join(' → ')}.`]);
 if(effects?.areaDone)extra.push(['bram',`${area.name} fully restored! The Survey Worksite opens in the next update.`]);
 playLines(t.name,t.lines.concat(extra),()=>{const icon=$(`.restoredIcon[data-task="${id}"]`);icon?.classList.add('pop');burst($('.world').getBoundingClientRect(),'gold',true);});
 sound.play('milestone');
}
function playLines(title,lines,done){
 let n=0;const dlg=$('#beat');
 const show=()=>{const [who,line]=lines[n];$('#beatContent').innerHTML=`<div class="beat"><small>${title}</small><div class="beatLine">${portrait(who)}<p><b>${CREW[who].name}</b>${line}</p></div><div class="beatDots">${lines.map((_,k)=>`<i class="${k===n?'on':''}"></i>`).join('')}</div><button class="primary" id="beatNext">${n<lines.length-1?'Next':'Continue'}</button></div>`;
  $('#beatNext').onclick=()=>{n++;if(n<lines.length)show();else{dlg.close();done?.();}};};
 show();if(!dlg.open)dlg.showModal();
}
// A generator level that opens a chain shows the whole new chain.
function newChainMoment(gen,chain){moment(`${SOURCES[gen].name} · new chain!`,CHAINS[chain].names.join(' → '),item(chain,0));}
function showIntro(){const a=currentArea(state);if(a.intro)playLines(a.name,a.intro);}

render();header();setInterval(()=>{header();if(state.energy<1)renderHint();},1000);
if(!state.moves)showIntro();
