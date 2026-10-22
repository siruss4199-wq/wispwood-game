// Coast Camp: the new-loop page (v5/play.html). Same look as Classic V5, one loop:
// generators → merge → crew orders → ★ stars → restore the coast on the map.
import {SAVE_KEY,fresh,load,act,tick,nameOf,item,matches,count,orderItems,orderProgress,nextTask,currentArea,areaDone,sourceOpen,SOURCES,chainsOf,CRATES,cargoKeys,reachable,generatorsMerge,MAX_GENERATOR_LEVEL,GLASS_HITS,nextKind,UNLOCK_LEVEL,GENERATOR_ORDER} from './game.mjs';
import {AREAS} from './areas.mjs';
import {cellPos} from '../core.mjs';
import {CHAINS,draw,maxTier,chainsAt,GENERATOR_CHAINS} from './chains.mjs';
import {art,portrait} from '../art.mjs';
import {enablePremium} from '../premium.mjs';
import {kitsMerge,kitFull,kitDrop,kitCapacity,producerLevel,KIT_SIZES,KIT_DROPS,MAX_KIT_SIZE,MAX_PRODUCER_LEVEL} from '../kits.mjs';
import {xpToNext} from '../levels.mjs';
import {refillTimes,clock,REFILL_CAP,rationWait} from '../energy.mjs';
import {CREW} from '../crew.mjs';
import {sound,reduced,burst,rewardFlight,moment as sharedMoment} from '../feedback.mjs';
// The shared moment draws its icon with the Classic art; new chains need draw().
function moment(title,detail='',x=null){sharedMoment(title,detail,null);const el=document.querySelector('.moment');if(!x||!el)return;const icon=document.createElement('span');icon.style.cssText='float:left;width:42px;height:42px;margin-right:10px';icon.innerHTML=draw(x);icon.firstElementChild.style.cssText='width:100%;height:100%';el.prepend(icon);}

// Shown in the footer so a playtester can tell which build is running.
export const BUILD='Build 14 · level to unlock';
enablePremium('vibrant');document.body.dataset.art='premium';document.body.dataset.palette='vibrant';
const $=q=>document.querySelector(q),board=$('#board');
const storage={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
// ?new=1 (the playtest page's "start from the beginning" link) starts a new camp.
const startNew=new URLSearchParams(location.search).has('new');
if(startNew)history.replaceState(null,'',location.pathname);
let state=startNew?fresh(Date.now()):load(storage.get(SAVE_KEY)??'',Date.now()),selected=null,focusOrder=null,drag=null,suppressUntil=0;
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
  const twin=sel&&i!==selected&&(sel.type==='item'&&(x?.type==='item'&&matches(x,sel)&&sel.tier<maxTier(sel.family)||x?.type==='cargo'&&reachable(state,i)&&matches(sel,x.key))||sel.type==='kit'&&kitsMerge(sel,x)||generatorsMerge(sel,x)||sel.type==='cog'&&x?.type==='source'&&producerLevel(x)<MAX_GENERATOR_LEVEL||sel.type==='cargo'&&matches(x,sel.key));
  const wanted=x?.type==='item'&&want.has(x.family+x.tier),focused=x?.type==='item'&&focusKeys.has(x.family+x.tier);
  let badge='';
  if(x?.type==='source')badge=locked?`<span class="lockedLabel">NEXT AREA</span>`:`<span class="energyCue">ϟ1</span>${producerLevel(x)>1?`<span class="srcLevel">Lv${producerLevel(x)}</span>`:''}`;
  else if(x?.type==='kit')badge=`<span class="pulls">${x.left}</span>`;
  else if(x?.type==='jar')badge=`<span class="sealBadge">+${x.energy}ϟ</span>`;
  else if(x?.type==='cargo'&&(x.find?.type==='source'||x.find?.type==='cog'))badge=`<span class="cargoGlow ${x.find.type==='cog'?'cogGlow':''}" aria-hidden="true"></span>`;
  else if(wanted)badge='<span class="useBadge" aria-hidden="true">★</span>';
  const deep=x?.type==='cargo'&&!reachable(state,i),ready=x?.type==='cargo'&&!deep&&state.board.some(y=>matches(y,x.key));
  return `<button class="tile ${x?.type??'empty'} ${x?.cracks?'cracked':''} ${ready?'keyReady':''} ${deep?'deep':''} ${locked?'locked':''} ${selected===i?'selected':''} ${twin?'match':''} ${wanted?'wanted':''} ${focused?'nextAction':''}" data-index="${i}" style="grid-row:${r+1};grid-column:${c+1}" ${x?.family||x?.id?`data-family="${x.family??x.id}"`:''} aria-label="${nameOf(x)}${locked?' · locked':''}. Space ${i+1}" aria-pressed="${selected===i}">${draw(deep?{...x,deep:true}:x)}${badge}</button>`;
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
  const chain=CHAINS[GENERATOR_CHAINS[x.id][0][0]];
  const next=nextKind(x.id),waiting=next&&!state.board.some(y=>y?.type==='source'&&y.id===next);
  desc=(waiting?`Level ${UNLOCK_LEVEL} brings out the ${SOURCES[next].name}. `:'')+(sourceOpen(state,x.id)?`Level ${producerLevel(x)} · 1 energy a tap · ${chain.names.slice(0,4).join(' → ')} …`+(producerLevel(x)<MAX_GENERATOR_LEVEL?` Merge it with another level-${producerLevel(x)} ${SOURCES[x.id].name} (drag one onto the other) for level ${producerLevel(x)+1}.`:' Top level.'):'Wakes at the Survey Worksite (next area).');
  if(sourceOpen(state,x.id))buttons=`<button class="accent" data-action="produce">Make · 1 ϟ</button>`;
 }else if(x.type==='kit'){
  desc=`Tap again for a free part (${chainsOf(state,x.family).map(c=>CHAINS[c].names[0]).join(' or ')} chain) · ${x.left} of ${kitCapacity(x)} left.`+(kitFull(x)&&x.size<MAX_KIT_SIZE?` Or merge with a twin into a ${CRATES[x.size]} (${KIT_DROPS[x.size+1].length} better parts).`:'');
  buttons='<button class="accent" data-action="openKit">Take a part</button>';
} else if(x.type==='glass'){const n=CHAINS[x.family].names;title=x.cracks?'Cracked tideglass':'Tideglass';desc=`A ${n[x.tier]} locked in tideglass. It takes no part: merge two parts in a space beside it and the glass cracks; ${GLASS_HITS} merges break it and the ${n[x.tier]} is yours.`+(x.cracks?` One more merge beside it.`:'');
 } else if(x.type==='cargo'&&!reachable(state,selected)){title='Sealed cargo';desc='Buried deeper in the cargo. Open the crates around it first, and this one will show the part that opens it.'+(x.find?.type==='source'?' Something glows inside.':x.find?.type==='cog'?' Something gleams inside.':'');
 }else if(x.type==='cargo'){const k=CHAINS[x.key.family].names[x.key.tier],have=state.board.some(y=>matches(y,x.key)),gen=CHAINS[x.key.family].gen;
  title='Sealed cargo';desc=`Opens with a ${k}: lay one on it. What is inside is a surprise`+(x.find?.type==='source'?' — something glows in there.':x.find?.type==='cog'?' — something gleams in there.':'.')+(have?' You have one: tap it, then this cargo.':sourceOpen(state,gen)?` ${SOURCES[gen].name} makes them.`:` Its generator is still sealed somewhere on the board.`);}
 else if(x.type==='jar')desc='Energy, sealed in a jar.';
 else if(x.type==='cog')desc=`Lay it on a generator (tap the cog, then the generator, or drag): +1 level, up to ${MAX_GENERATOR_LEVEL}. Higher levels make better parts.`;
 $('#selection').innerHTML=`<span class="preview">${draw(x)}</span><span class="copy"><b>${title}</b><small>${desc}</small></span><span class="actionGroup">${buttons}</span>`;
}
const has=id=>state.board.some(x=>x?.type==='source'&&x.id===id);
function renderHint(){
 const task=nextTask(state),ready=state.orders.find(o=>orderItems(state,o));let hint;
 if(!state.merges)hint='START · Tap a Copper offcut, then its twin';
 else if(task&&state.stars>=task.cost)hint=`★ ${task.cost} ready · ${task.name} ↑`;
 else if(ready)hint='Order ready · tap it to collect ★';
 else if(cargoKeys(state).some(k=>state.board.some(y=>matches(y,k))))hint='Lay a matching part on a crate to open it';
 else if(state.energy<1){const t=refillTimes(state,Date.now());hint='Out of energy · +1 in '+clock(t?.next??0);}
 else{// Next generator: which one has to reach level 2 to bring it out.
  const g=GENERATOR_ORDER.find(g=>has(g)&&nextKind(g)&&!has(nextKind(g)));
  hint=g?`${SOURCES[g].name} level ${UNLOCK_LEVEL} brings out the ${SOURCES[nextKind(g)].name} · merge a copy or lay a cog on it`:'Make the parts the crew orders want';}
 $('#hint').textContent=hint;
}
function header(){
 if(tick(state,Date.now())){persist();render();}
 const t=refillTimes(state,Date.now());$('#energyTimer').textContent=t?'+1 '+clock(t.next):'FULL';
 $('#energy').innerHTML=`${state.energy}<span class="energyCap">/${REFILL_CAP}</span>`;
}

// ---------- actions ----------
function run(a){
 const before={stars:state.stars,energy:state.energy},fromRect=a.type==='produce'?board.querySelector(`[data-index="${a.index??state.board.findIndex(x=>x?.type==='source'&&x.id===a.id)}"]`)?.getBoundingClientRect():a.type==='openKit'?board.querySelector(`[data-index="${a.index}"]`)?.getBoundingClientRect():null;
 const orderRect=a.type==='deliver'?$(`[data-order="${a.id}"]`)?.getBoundingClientRect():null;
 const reachBefore=new Set(cargoKeys(state).map(k=>k.index)),r=act(state,a,Date.now());
 if(!r.ok){$('#message').textContent=r.message;sound.play('tap');return r;}
 $('#message').textContent=r.message;
 if(r.event==='merge'||r.event==='move'||r.event==='producerUp'||r.event==='unseal')selected=r.event==='producerUp'||r.event==='unseal'?null:r.index;
 if(r.event==='deliver'){focusOrder=null;selected=null;}
 persist();render();
 const tile=r.index!=null?board.querySelector(`[data-index="${r.index}"]`):null;
 for(const j of r.cracked??[])board.querySelector(`[data-index="${j}"]`)?.classList.add('glassCrack');
 if(r.broken?.length){for(const j of r.broken)board.querySelector(`[data-index="${j}"]`)?.classList.add('glassBreak');sound.play('rare');}
 if(r.event==='merge'){tile?.classList.add('merge-pop');burst(tile?.getBoundingClientRect(),state.board[r.index]?.family);sound.play('merge',state.board[r.index]?.tier??0);for(const d of r.dug??[])board.querySelector(`[data-index="${d.index}"]`)?.classList.add('unlocked');}
 if((r.event==='produce'||r.event==='kit')&&fromRect&&tile&&!reduced()){const to=tile.getBoundingClientRect(),el=document.createElement('div');el.className='flight';el.innerHTML=draw(state.board[r.index]);el.style.cssText=`left:${fromRect.x}px;top:${fromRect.y}px;--dx:${to.x-fromRect.x}px;--dy:${to.y-fromRect.y}px`;document.body.append(el);setTimeout(()=>el.remove(),460);}
 if(r.event==='deliver'){rewardFlight(orderRect,$('#starPill').getBoundingClientRect(),`+${r.stars} ★`);sound.play('contract');$('#starPill').classList.remove('bump');void $('#starPill').offsetWidth;$('#starPill').classList.add('bump');}
 if(r.event==='producerUp'){const src=state.board[r.index];moment(SOURCES[src.id].name+' · level '+src.level,src.level>=MAX_GENERATOR_LEVEL?'Top level: its parts come out better every time.':'Its parts come out better more often.',src);sound.play('milestone');}
 if(r.event==='restore')showBeat(r.task,r.effects);
 // A generator reaching level 2 brings out the next kind beside it.
 for(const n of r.released??[]){const t=board.querySelector(`[data-index="${n.index}"]`);t?.classList.add('unsealed');burst(t?.getBoundingClientRect(),'gold',true);setTimeout(()=>{newGeneratorMoment(n.id);sound.play('milestone');},r.event==='producerUp'?900:0);}
 if(r.event==='unseal'){tile?.classList.add('unsealed');burst(tile?.getBoundingClientRect(),'gold',r.opened.type==='source');sound.play(r.opened.type==='source'?'milestone':'rare');
  if(r.opened.type==='stars')rewardFlight(tile?.getBoundingClientRect(),$('#starPill').getBoundingClientRect(),`+${r.opened.stars} ★`);
  if(r.opened.type==='jar')rewardFlight(tile?.getBoundingClientRect(),$('#energyPill').getBoundingClientRect(),`+${r.opened.energy} ϟ`);
  if(r.opened.type==='cog')moment('A Brass cog!','Lay it on a generator: it goes up one level and makes better parts.',{type:'cog'});
  if(r.opened.type==='source'){const copies=state.board.filter(y=>y?.type==='source'&&y.id===r.opened.id).length;if(copies>1)moment(`A second ${SOURCES[r.opened.id].name}!`,`Drag it onto the other one of the same level: they merge into a stronger generator.`,{type:'source',id:r.opened.id});else newGeneratorMoment(r.opened.id);}
  // Crates that now touch open ground show their keys for the first time.
  for(const k of cargoKeys(state))if(!reachBefore.has(k.index))board.querySelector(`[data-index="${k.index}"]`)?.classList.add('newKey');}
 if(r.found?.length&&r.event!=='restore'){const k=r.found.at(-1),x=item(k.replace(/\d+$/,''),+k.match(/\d+$/)[0]);if(x.tier>=2)setTimeout(()=>moment('New: '+nameOf(x),x.tier<maxTier(x.family)?'Next: '+CHAINS[x.family].names[x.tier+1]:'Top of the chain',x),r.levelUp?1600:0);}
 if(r.levelUp){const u=r.levelUp.at(-1);setTimeout(()=>{moment('Level '+u.level+'!',`Chest: +${r.levelUp.reduce((n,v)=>n+v.energy,0)} ϟ`+(u.generator?' · a second '+SOURCES[u.generator].name+' to merge':u.family?' · '+nameOf({type:'kit',family:u.family,size:1}):''),u.generator?{type:'source',id:u.generator}:u.family?{type:'kit',family:u.family,size:1,left:3}:null);sound.play('milestone');$('#levelPill').classList.add('levelUp');setTimeout(()=>$('#levelPill').classList.remove('levelUp'),1400);},r.event==='restore'?0:400);}
 return r;
}
function clickTile(i){
 const x=state.board[i],prev=state.board[selected];
 // A generator: tapping it makes a part; tapping a second identical one right after merges them.
 if(x?.type==='source'){const from=selected;selected=i;if(from!==i&&(generatorsMerge(prev,x)||prev?.type==='cog')){run({type:'merge',from,to:i});return;}if(sourceOpen(state,x.id))run({type:'produce',id:x.id,index:i});render();return;}
 if(selected!==null&&selected!==i&&prev){
  if(prev.type==='item'&&(x?.type==='item'&&matches(x,prev)||x?.type==='cargo'&&matches(prev,x.key))||prev.type==='kit'&&kitsMerge(prev,x)||prev.type==='cog'&&x?.type==='source'||['item','kit','source','cog'].includes(prev.type)&&!x){run({type:'merge',from:selected,to:i});return;}
 }
 if(prev?.type==='cargo'&&matches(x,prev.key)){run({type:'unseal',from:i,index:selected});return;}
 if(x?.type==='kit'&&selected===i){run({type:'openKit',index:i});return;}
 selected=selected===i&&x?.type==='item'?null:x?i:null;render();
}
board.addEventListener('click',e=>{const t=e.target.closest('[data-index]');if(t&&performance.now()>suppressUntil)clickTile(+t.dataset.index);});
board.addEventListener('pointerdown',e=>{const t=e.target.closest('[data-index]');if(!t||e.button!==0)return;const i=+t.dataset.index;if(!['item','kit','source','cog'].includes(state.board[i]?.type))return;drag={from:i,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};});
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
 const extra=[];
 if(effects?.areaDone)extra.push(['bram',`${area.name} fully restored! The Survey Worksite opens in the next update.`]);
 playLines(t.name,t.lines.concat(extra),()=>{const icon=$(`.restoredIcon[data-task="${id}"]`);icon?.classList.add('pop');burst($('.world').getBoundingClientRect(),'gold',true);
  for(const i of [effects?.kit,effects?.copy])if(i>=0)board.querySelector(`[data-index="${i}"]`)?.classList.add('unsealed');});
 sound.play('milestone');
}
function playLines(title,lines,done){
 let n=0;const dlg=$('#beat');
 const show=()=>{const [who,line]=lines[n];$('#beatContent').innerHTML=`<div class="beat"><small>${title}</small><div class="beatLine">${portrait(who)}<p><b>${CREW[who].name}</b>${line}</p></div><div class="beatDots">${lines.map((_,k)=>`<i class="${k===n?'on':''}"></i>`).join('')}</div><button class="primary" id="beatNext">${n<lines.length-1?'Next':'Continue'}</button></div>`;
  $('#beatNext').onclick=()=>{n++;if(n<lines.length)show();else{dlg.close();done?.();}};};
 show();if(!dlg.open)dlg.showModal();
}
// A generator level that opens a chain shows the whole new chain.
// A generator found in cargo shows its whole chain.
function newGeneratorMoment(gen){const c=CHAINS[GENERATOR_CHAINS[gen][0][0]];moment(`New generator: ${SOURCES[gen].name}!`,c.names.join(' → '),{type:'source',id:gen});}
function showIntro(){const a=currentArea(state);if(a.intro)playLines(a.name,a.intro);}

$('#build').textContent='COAST CAMP · '+BUILD.toUpperCase();
render();header();setInterval(()=>{header();if(state.energy<1)renderHint();},1000);
if(!state.moves)showIntro();
