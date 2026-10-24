// Coast Camp: the new-loop page (v5/play.html). Same look as Classic V5, one loop:
// generators → merge → crew orders → coins → upgrade the coast's places on the beach screen.
import {loadChecked,hasGenerator,blockedStage,allDone,swapsLeft,adSwapsLeft,SHOP,shopLeft,BOOK_COINS,BOOK_CHAINS,bookKeys,bookReady,pageReady,SHED_SLOTS,DAILY,newestGenerator,cog,token,SAVE_KEY,fresh,load,act,tick,nameOf,item,matches,count,orderItems,orderProgress,nextTask,currentArea,areaDone,upgrades,stageOf,builtCount,sourceOpen,SOURCES,chainsOf,CRATES,cargoKeys,reachable,generatorsMerge,MAX_GENERATOR_LEVEL,GLASS_HITS,nextKind,UNLOCK_LEVEL,GENERATOR_ORDER} from './game.mjs';
import {AREAS,STAGES,TASKS,CHAPTERS,chapterOfArea,chapterAvailable} from './areas.mjs';
import {primaryAction} from './guide.mjs';
import {createLog} from './playtest.mjs';
import {rewardedAd,initPlatform,platform} from './platform-cg.mjs';
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
// Moments show above an open screen (the beach) too: a modal dialog covers the page.
function moment(title,detail='',x=null){
 // A reveal card is read first: a moment that comes while one is open waits for it to close.
 const card=document.querySelector('#beat[open] .vaultReveal');if(card){$('#beat').addEventListener('close',()=>setTimeout(()=>moment(title,detail,x),250),{once:true});return;}
 sharedMoment(title,detail,null);const el=document.querySelector('.moment');const top=[...document.querySelectorAll('dialog[open]')].pop();if(el&&top)top.append(el);if(!x||!el)return;const icon=document.createElement('span');icon.style.cssText='float:left;width:42px;height:42px;margin-right:10px';icon.innerHTML=draw(x);icon.firstElementChild.style.cssText='width:100%;height:100%';el.prepend(icon);}

// Game sounds go through sfx: silent while an ad plays or when CrazyGames mutes the game
// (Build 41 M7), without touching the player's own sound setting.
let adPlaying=false;
const sfx=(...a)=>{if(!adPlaying&&!platform.muted())sound.play(...a);};
// Shown in the footer so a playtester can tell which build is running.
export const BUILD='Build 43 (Chapter 2 review) · playtest log';
enablePremium('vibrant');document.body.dataset.art='premium';document.body.dataset.palette='vibrant';
const $=q=>document.querySelector(q),board=$('#board');
const storage={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
// ?new=1 (the playtest page's "start from the beginning" link) starts a new camp.
const startNew=new URLSearchParams(location.search).has('new');
if(startNew)history.replaceState(null,'',location.pathname);
// A save that cannot be read is kept aside under its own key before a new camp starts, and the
// player is told (Chapter 2 plan D7); the save key itself is unchanged.
const BACKUP_KEY='vaultwake-v5-coast-backup';
let state,selected=null,focusOrder=null,drag=null,suppressClick=false,lostSave=false;
{const raw=startNew?'':storage.get(SAVE_KEY)??'',r=startNew?{state:fresh(Date.now()),kept:true}:loadChecked(raw,Date.now());state=r.state;
 if(!r.kept&&raw){storage.set(BACKUP_KEY,raw);lostSave=true;}}
const persist=()=>storage.set(SAVE_KEY,JSON.stringify(state));
// The local playtest log (Build 41 M6): this browser only, copied out by the player.
const playlog=createLog({storage:{get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>localStorage.setItem(k,v),remove:k=>localStorage.removeItem(k)},
 build:BUILD,viewport:`${innerWidth}x${innerHeight}`,touch:!!globalThis.matchMedia?.('(pointer:coarse)').matches});
playlog.startSession();
setInterval(()=>playlog.flush(),5000);
addEventListener('pagehide',()=>playlog.end('pagehide'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)playlog.end('hidden');else playlog.event('resume');});
persist();

const ICONS={rock:{type:'rock'},'crate-salvage':{type:'crate',kind:'salvage'},'crate-survey':{type:'crate',kind:'survey'},'source-chart':{type:'source',id:'chart'},'flux-3':item('flux',3),'chart-1':item('chart',1)};
// A gold coin (orders pay coins; coins upgrade the beach).
const COIN='<i class="coinIcon" aria-hidden="true"></i>';
const pips=n=>`<span class="pips" aria-label="stage ${n} of ${STAGES}">${Array.from({length:STAGES},(_,k)=>`<i class="${k<n?'on':''}"></i>`).join('')}</span>`;
// Places with stage art (build 38: workshop, pier, beacon) are drawn as they stand at their stage.
const stageArt=(t,n)=>`<img class="art" src="assets/premium/coast/place-${t.art}-${Math.max(1,n)}.webp" alt="" draggable="false">`;
const placeArt=(t,n)=>t.art?stageArt(t,n):iconArt(t.icon);
// Beach places drawn from the user's painted sheet (Build 41n): every stage shares one canvas with
// its ground at 90 % down the middle, so the picture stands on its spot; TOP is how far down the
// canvas each stage's top is (markers float just above it).
const ANCHORED=new Set(['path','tent','mast','workshop','pier','beacon','cliff','obs-hall','obs-desk','obs-bench','obs-array','obs-passage']);
const TOP={'obs-hall-1':.14,'obs-hall-2':.03,'obs-hall-3':.03,'obs-desk-1':.17,'obs-desk-2':.03,'obs-desk-3':.03,'obs-bench-1':.16,'obs-bench-2':.03,'obs-bench-3':.03,'obs-array-1':.22,'obs-array-2':.03,'obs-array-3':.03,'obs-passage-1':.08,'obs-passage-2':.03,'obs-passage-3':.03,'path-1':.33,'path-2':.32,'path-3':.16,'tent-1':.19,'tent-2':.17,'tent-3':.13,'mast-1':.22,'mast-2':.17,'mast-3':.1,'workshop-1':.19,'workshop-2':.18,'workshop-3':.18,'pier-1':.29,'pier-2':.12,'pier-3':.19,'beacon-1':.19,'beacon-2':.16,'beacon-3':.13,'cliff-1':.23,'cliff-2':.14,'cliff-3':.12};
// A marker sits beside a standing place, at its right shoulder (its left one near the right edge), so it never covers it; on an
// empty spot it marks the spot.
function markerAt(t){
 if(t.marker)return `left:${t.marker[0]}%;top:${t.marker[1]}%`;// a place that fills its scene (the Vault door) has its marker beside it
 const n=stageOf(state,t.id),top=ANCHORED.has(t.art)&&n?TOP[t.art+'-'+n]:null,[x,y]=t.at;
 if(top==null)return `left:${Math.min(88,Math.max(12,x))}%;top:${Math.max(24,y)}%`;
 return `left:${x>75?`calc(${x}% - .4 * var(--ps${n}))`:`min(92%,calc(${x}% + .4 * var(--ps${n})))`};top:max(10%,calc(${y}% - ${((.9-top)*.55).toFixed(2)} * var(--ps${n})))`;
}
const placeIcons=list=>list.map(t=>{const n=stageOf(state,t.id);return `<span class="restoredIcon stage${n} ${t.art?'staged':''} ${ANCHORED.has(t.art)?'anchored':''}" data-task="${t.id}" data-stage="${n}" style="left:${t.at[0]}%;top:${t.at[1]}%">${placeArt(t,n)}${pips(n)}</span>`;}).join('');
// Worksite icons are Coast Camp parts ('rope-2') and generators ('source-rope'), drawn by draw().
const iconArt=k=>{if(k==='workshop')return '<img class="art" src="assets/premium/workshop-operational.webp" alt="">';if(ICONS[k])return art(ICONS[k]);const g=k.match(/^source-(\w+)$/),p=k.match(/^(\w+)-(\d)$/);return draw(g?{type:'source',id:g[1]}:item(p[1],+p[2]));};
// A part a Tide token can turn into one an order wants.
const swappable=x=>state.orders.some(o=>o.needs.some(r=>r.tier===x.tier&&r.family!==x.family&&count(state,r)<r.count));
// What each generator level does (v5/kits.mjs levelLift), said when it is reached.
const LEVEL_GAIN={2:'Every third part comes out one tier higher.',3:'Every second part comes out one tier higher.',4:'Every part comes out one tier higher.',5:'Top level: every part one tier higher, every third two tiers.'};
const wantedKeys=()=>new Set(state.orders.flatMap(o=>o.needs.map(r=>r.family+r.tier)));

// ---------- rendering ----------
function render(){
 const area=currentArea(state),total=area.tasks.length*STAGES;
 $('#areaBrand').textContent=area.name.toUpperCase();
 // Build 41i: the area's own picture, blurred, behind the board screen.
 {const bg=`url("assets/premium/${area.picture}-vibrant.webp")`;if($('#backdrop').style.backgroundImage!==bg)$('#backdrop').style.backgroundImage=bg;}
 $('#energy').innerHTML=`${state.energy}<span class="energyCap">/${REFILL_CAP}</span>`;
 $('#coins').textContent=state.coins;
 const lv=state.level;$('#levelNum').textContent=lv.level;$('#levelPill').style.setProperty('--p',Math.round(100*lv.xp/xpToNext(lv.level))+'%');$('#levelPill').setAttribute('aria-label',`Level ${lv.level}, ${lv.xp} of ${xpToNext(lv.level)} XP`);
 const ready=upgrades(state).some(u=>u.materials&&state.coins>=u.cost);$('#mapReady').hidden=!ready;
 // The beach and its upgrades live on their own screen (user, 2026-10-22: "ene zaaval boardtai
 // neg delgetsend tsug baimaargui"); the board screen keeps only the BEACH button, whose dot
 // shows when an upgrade is affordable, and the coin count.
 $('#mapButton').setAttribute('aria-label',ready?`Go to the ${area.name}: an upgrade is ready`:`Go to the ${area.name} (${builtCount(state)} of ${total} upgrades)`);
 $('#mapButton span').textContent=area.short??'MAP';
 {const pic=`url("assets/premium/${area.map??area.picture+'-vibrant'}.webp")`,nav=$('#mapButton .navIcon');if(nav&&nav.style.backgroundImage!==pic)nav.style.backgroundImage=pic;}
 renderOrders();renderBoard();renderShed();renderSelection();renderHint();
 $('#dailyButton').hidden=!giftReady();
 $('#adEnergyButton').hidden=!(state.energy<5&&shopLeft(state,'adEnergy',today())>0);
 if(!$('#adEnergyButton').hidden&&!adOffered)playlog.event('adOffer',{id:'adEnergy'});adOffered=!$('#adEnergyButton').hidden;
 {const n=bookReady(state).length+BOOK_CHAINS.filter(f=>pageReady(state,f)).length;$('#bookCount').hidden=!n;$('#bookCount').textContent=n;$('#bookButton').classList.toggle('ready',n>0);}
 calmBadges();
 $('#rationButton').hidden=state.energy>3;
 const wait=rationWait(state,Date.now());$('#rationButton').textContent=wait>0?`Field ration in ${clock(wait)}`:'Field ration · +8 ϟ';$('#rationButton').disabled=wait>0;
 $('#soundButton').textContent=sound.enabled()?'Sound on':'Sound off';
}
function renderOrders(){
 $('#requests').style.setProperty('--slots',state.orders.length);
 $('#requests').innerHTML=`<div class="requestHeading"><span>CREW ORDERS <small>Deliver for coins</small></span></div><div class="requestShelf">${[...state.orders].sort((a,b)=>Number(!!orderItems(state,b))-Number(!!orderItems(state,a))).map(o=>{
  const p=orderProgress(state,o),ready=!!orderItems(state,o),who=CREW[o.who];
  const place=o.story&&AREAS[state.area]?.tasks.find(t=>t.id===o.story);
  // Chapter 2: a part two orders both count is marked, so the player knows delivering one order
  // takes it from the other (inspecting never takes anything; delivering does).
  const shared=r=>r.have>0&&state.orders.reduce((n,q)=>n+q.needs.filter(x=>x.family===r.family&&x.tier===r.tier).reduce((a,x)=>a+x.count,0),0)>count(state,r);
  // Build 42: a short card (small portrait, the reward, the parts with real counts); a ready
  // card shows the one Deliver action, a tapped one is outlined and explained under the shelf.
  return `<button class="requestCard ${ready?'ready':''} ${place?'storyOrder':''} ${focusOrder===o.id?'active':''}" data-order="${o.id}" aria-pressed="${focusOrder===o.id}" aria-label="${place?`Gold order: the materials for ${place.name}. `:''}${who.name} asks for ${o.needs.map(r=>r.count+' '+nameOf(item(r.family,r.tier))).join(', ')}. ${ready?'Ready: tap to deliver.':'In progress.'} Reward ${o.coins} coins"><span class="requestCrew">${place?`<span class="storyBadge" aria-hidden="true">${iconArt(place.icon)}</span>`:portrait(o.who)}<b class="requestLane"><em>${who.name}</em>${who.role}</b></span><span class="requestItems">${p.map(r=>`<span class="${r.have>=r.count?'met':''} ${shared(r)?'shared':''}" ${shared(r)?'title="Another order wants this part too: delivering one takes it from the other"':''}>${draw(item(r.family,r.tier))}<b>${Math.min(r.have,r.count)}/${r.count}</b></span>`).join('')}</span><span class="requestReward">+${o.coins} ${COIN}</span>${ready?'<strong>Deliver</strong>':''}</button>`;
 }).join('')}</div>`;
 renderOrderTools();
}
// A tapped order that is not ready can be changed (build 36): free ones first, then after an ad.
// Build 42: the tapped order also explains where its missing parts come from: the generator,
// then each merge up to the tier wanted (real chain names, nothing invented).
function chainRoute(r){
 const gen=CHAINS[r.family].gen,open=sourceOpen(state,gen),steps=Array.from({length:r.tier+1},(_,k)=>k);
 // Chapter 2: a generator parked in the shed, or waiting for a free space, keeps its orders valid.
 const parked=state.shed.findIndex(x=>x?.type==='source'&&x.id===gen),waiting=state.pending.some(x=>x?.type==='source'&&x.id===gen);
 const how=open?`${SOURCES[gen].name}${r.tier?`, then merge ×${r.tier}`:''}`:parked>=0?`${SOURCES[gen].name} is parked in the shed`:waiting?`${SOURCES[gen].name} is waiting for a free space on the board`:`${SOURCES[gen].name} is still sealed on the board`;
 return `<li class="route ${open?'':'sealed'}"><span class="routeGen" title="${SOURCES[gen].name}">${draw({type:'source',id:gen})}</span>${steps.map(k=>`<i class="routeArrow" aria-hidden="true"></i><span class="routeStep ${k===r.tier?'goal':''}" title="${CHAINS[r.family].names[k]}">${draw(item(r.family,k))}</span>`).join('')}<small>${how}</small>${!open&&parked>=0?`<button type="button" class="unpark" data-unpark="${parked}">Bring it out</button>`:''}</li>`;
}
function renderOrderTools(){
 const o=state.orders.find(o=>o.id===focusOrder),bar=$('#orderTools');
 if(!o||orderItems(state,o)){bar.hidden=true;bar.innerHTML='';return;}
 const day=today(),free=swapsLeft(state,day),ads=adSwapsLeft(state,day);
 const missing=o.needs.filter(r=>count(state,r)<r.count);
 bar.hidden=false;
 const swap=o.story?`<span class="toolNote">Gold order: the ${currentArea(state).name}'s next stage. It stays.</span>`:`<span class="toolNote">Stuck on ${CREW[o.who].name}'s order?</span>`+(free>0?`<button data-swap>↻ New order <small>${free} free today</small></button>`:ads>0?'<button class="adOffer" data-swap-ad>▶ New order</button>':'<button disabled>No more changes today</button>');
 bar.innerHTML=`<ol class="routes" aria-label="Where the parts come from">${missing.map(chainRoute).join('')}</ol><div class="toolRow">${swap}</div>`;
}
function renderBoard(){
 const sel=state.board[selected],want=wantedKeys(),focus=state.orders.find(o=>o.id===focusOrder);
 const focusKeys=new Set(focus?.needs.map(r=>r.family+r.tier)??[]);
 // The tapped order's generators glow too (Build 41 M3, from PR #77).
 const focusGens=new Set(focus?.needs.filter(r=>count(state,r)<r.count).map(r=>CHAINS[r.family].gen)??[]);
 board.innerHTML=state.board.map((x,i)=>{
  const [r,c]=cellPos(i),locked=x?.type==='source'&&!sourceOpen(state,x.id);
  const twin=sel&&i!==selected&&(sel.type==='item'&&(x?.type==='item'&&matches(x,sel)&&sel.tier<maxTier(sel.family)||x?.type==='cargo'&&reachable(state,i)&&matches(sel,x.key))||sel.type==='kit'&&kitsMerge(sel,x)||generatorsMerge(sel,x)||sel.type==='cog'&&x?.type==='source'&&producerLevel(x)<MAX_GENERATOR_LEVEL||sel.type==='token'&&x?.type==='item'&&swappable(x)||sel.type==='cargo'&&matches(x,sel.key));
  const wanted=x?.type==='item'&&want.has(x.family+x.tier),focused=x?.type==='item'&&focusKeys.has(x.family+x.tier);
  let badge='';
  // Build 42: generators are marked by their cell, not an energy badge; only a level above 1 is named.
  if(x?.type==='source')badge=locked?`<span class="lockedLabel">NEXT AREA</span>`:producerLevel(x)>1?`<span class="srcLevel">Lv${producerLevel(x)}</span>`:'';
  else if(x?.type==='kit')badge=`<span class="pulls">${x.left}</span>`;
  else if(x?.type==='jar')badge=`<span class="sealBadge">+${x.energy}ϟ</span>`;
  else if(x?.type==='cargo'&&(x.find?.type==='source'||x.find?.type==='cog'||x.find?.type==='token'))badge=`<span class="cargoGlow ${x.find.type!=='source'?'cogGlow':''}" aria-hidden="true"></span>`;
  const deep=x?.type==='cargo'&&!reachable(state,i),ready=x?.type==='cargo'&&!deep&&state.board.some(y=>matches(y,x.key));
  return `<button class="tile ${x?.type??'empty'} ${x?.cracks?'cracked':''} ${x?.type==='glass'?'ice'+(x.cracks??0):''} ${ready?'keyReady':''} ${deep?'deep':''} ${locked?'locked':''} ${selected===i?'selected':''} ${twin?'match':''} ${wanted?'wanted':''} ${focused?'nextAction':''} ${x?.type==='source'&&focusGens.has(x.id)?'orderSource':''}" data-index="${i}" style="grid-row:${r+1};grid-column:${c+1}" ${x?.family||x?.id?`data-family="${x.family??x.id}"`:''} ${x?.type==='cargo'?`data-key="${x.key.family}"`:''} aria-label="${nameOf(x)}${locked?' · locked':''}${x?.type==='glass'?` · ${GLASS_HITS-(x.cracks??0)} of ${GLASS_HITS} hits left`:''}${wanted?' · an order wants it':''}. Space ${i+1}" aria-pressed="${selected===i}">${draw(deep?{...x,deep:true}:x)}${badge}</button>`;
 }).join('');
 // Board-full guidance only when it matters (Build 42): not a permanent "0 spaces".
 const free=state.board.filter(x=>x===null).length;
 $('#free').textContent=free===0?'Board full':free<=2?`${free} space${free>1?'s':''} left`:'';$('#free').hidden=free>2;
 // Chapter 2: a reward that found no space waits, and says so until it lands.
 if(state.pending.length){const n=state.pending.length,x=state.pending.find(y=>y.type==='source')??state.pending[0],name=x.type==='source'?SOURCES[x.id].name:x.type==='kit'?CRATES[x.size-1]:nameOf(x).split(' · ')[0];
  $('#free').textContent=`${name}${n>1?` and ${n-1} more`:''} waiting · free a space`;$('#free').hidden=false;}
}
// The shed (build 32): four spaces under the board; drag onto one to store, tap it to take out.
// Build 42: the shed is a compact occupancy row under the board, collapsed by default; a tap on
// the row, a drag or the Shed button opens its four spaces.
let shedOpen=false;
function renderShed(){
 const n=state.shed.filter(Boolean).length,el=$('#shed');
 el.hidden=false;el.classList.toggle('open',shedOpen);
 el.innerHTML=`<button class="shedToggle" type="button" data-shed-toggle aria-expanded="${shedOpen}" aria-label="Shed: ${n} of ${SHED_SLOTS} spaces used. ${shedOpen?'Fold':'Open'} the shed"><span class="shedLabel">Shed</span><b>${n}/${SHED_SLOTS}</b><span class="shedPeek" aria-hidden="true">${state.shed.map(x=>`<i class="${x?'full':''}">${x?draw(x):''}</i>`).join('')}</span><i class="shedChevron" aria-hidden="true"></i></button>`
  +`<div class="shedSlots">${state.shed.map((x,k)=>`<button class="shedSlot ${x?'full':''}" data-slot="${k}" aria-label="${x?nameOf(x)+' · tap to put it back on the board':'Empty shed space'}">${x?draw(x):''}</button>`).join('')}</div>`;
}
function renderSelection(){
 const x=state.board[selected];let title='',desc='',buttons='';
 if(!x){$('#selection').innerHTML='';return;}
 title=nameOf(x);
 if(x.type==='item'){
  desc=x.tier<maxTier(x.family)?`Merge with a twin → ${CHAINS[x.family].names[x.tier+1]}.`:'Top of its chain.';
  if(wantedKeys().has(x.family+x.tier))desc='A crew order wants this. '+desc;
  // Clearing a part only appears when the board is nearly full (Build 41 M4): it is the way out of
  // a full board, not an everyday energy trick.
  if(state.board.filter(y=>y===null).length<=2)buttons='<button data-action="recycle">Clear space · +1 ϟ</button>';
 }else if(x.type==='source'){
  const chain=CHAINS[GENERATOR_CHAINS[x.id][0][0]];
  const next=nextKind(x.id),waiting=next&&!state.board.some(y=>y?.type==='source'&&y.id===next);
  title=`${title} · Lv${producerLevel(x)}`;
  desc=sourceOpen(state,x.id)?`1 ϟ a tap · ${chain.names.slice(0,3).join(' → ')} …`+(producerLevel(x)<MAX_GENERATOR_LEVEL?` Merge with another Lv${producerLevel(x)} for Lv${producerLevel(x)+1}.`:' Top level.')+(waiting?` Lv${UNLOCK_LEVEL} brings out the ${SOURCES[next].name}.`:''):'Wakes at the Survey Worksite (next area).';
  if(sourceOpen(state,x.id))buttons=`<button class="accent" data-action="produce">Make · 1 ϟ</button>`;
 }else if(x.type==='kit'){
  desc=`Tap again for a free part (${chainsOf(state,x.family).map(c=>CHAINS[c].names[0]).join(' or ')} chain) · ${x.left} of ${kitCapacity(x)} left.`+(kitFull(x)&&x.size<MAX_KIT_SIZE?` Or merge with a twin into a ${CRATES[x.size]} (${KIT_DROPS[x.size+1].length} better parts).`:'');
  buttons='<button class="accent" data-action="openKit">Take a part</button>';
} else if(x.type==='glass'){const n=CHAINS[x.family].names,left=GLASS_HITS-(x.cracks??0);
  // Build 42: the hits left, as a count and as pips (the ice itself shows 0, 1 or 2 cracks).
  title=`Tideglass · ${n[x.tier]}`;desc=`<span class="hits" role="img" aria-label="${left} of ${GLASS_HITS} hits left">${Array.from({length:GLASS_HITS},(_,k)=>`<i class="${k<left?'on':''}"></i>`).join('')}</span> ${left} hit${left>1?'s':''} left. Merge a ${n[x.tier]} or better (any chain) in a space beside it; the last hit frees the part.`;
 } else if(x.type==='cargo'&&!reachable(state,selected)){title='Sealed cargo';desc='Buried deeper in the cargo. Open the crates around it first, and this one will show the part that opens it.'+(x.find?.type==='source'?' Something glows inside.':['cog','token'].includes(x.find?.type)?' Something gleams inside.':'');
 }else if(x.type==='cargo'){const k=CHAINS[x.key.family].names[x.key.tier],have=state.board.some(y=>matches(y,x.key)),gen=CHAINS[x.key.family].gen;
  title='Sealed cargo';desc=`Opens with a ${k}: lay one on it. What is inside is a surprise`+(x.find?.type==='source'?' — something glows in there.':['cog','token'].includes(x.find?.type)?' — something gleams in there.':'.')+(have?' You have one: drag it onto this cargo.':sourceOpen(state,gen)?` ${SOURCES[gen].name} makes them.`:` Its generator is still sealed somewhere on the board.`);}
 else if(x.type==='jar')desc='Energy, sealed in a jar.';
 else if(x.type==='token')desc='Drag it onto a part: the part becomes one of the same tier that a crew order is waiting for.';
 else if(x.type==='cog')desc=`Drag it onto a generator: +1 level, up to ${MAX_GENERATOR_LEVEL}. Higher levels make better parts.`;
 if(SHED_TYPES_UI.includes(x.type))buttons+=x.type==='source'?(state.board.filter(y=>y?.type==='source').length>1?'<button data-action="store">Park</button>':''):'<button data-action="store">Shed</button>';
 $('#selection').innerHTML=`<span class="preview">${draw(x)}</span><span class="copy"><b>${title}</b><small>${desc}</small></span>${buttons?`<span class="actionGroup">${buttons}</span>`:''}`;
}
const SHED_TYPES_UI=['item','kit','cog','token','source'];
const has=id=>state.board.some(x=>x?.type==='source'&&x.id===id);
// The one primary action (Build 41 M3, from PR #77's contextual objective): what to do next,
// and tapping it does it or shows where.
let guide=null;
function renderHint(){
 guide=primaryAction(state,focusOrder);let label=guide.label;
 if(guide.kind==='energy'){const t=refillTimes(state,Date.now());label+=' · +1 in '+clock(t?.next??0);}
 // Build 42: a ready order is delivered from its own card; the hint only points at it.
 if(guide.kind==='deliver')label=`Order ready · deliver it for +${state.orders.find(o=>o.id===guide.id)?.coins??0} coins`;
 const b=$('#hint');b.textContent=label;b.dataset.kind=guide.kind;
 // The hint already says the board is full: no second chip for it.
 if(guide.kind==='space'&&!state.pending.length)$('#free').hidden=true;
 // The very first merge shows its pair without being asked.
 if(guide.kind==='merge'&&!state.merges)for(const i of guide.cells)board.querySelector(`[data-index="${i}"]`)?.classList.add('hintPair');
}
$('#hint').onclick=()=>{
 const g=guide;if(!g)return;
 if(g.kind==='deliver')run({type:'deliver',id:g.id});
 else if(g.kind==='upgrade'){mapFocus=g.id;showMap();}
 else if(g.kind==='tap'){selected=g.index;run({type:'produce',id:g.id,index:g.index});render();}
 else if(g.kind==='merge'||g.kind==='unseal'){for(const i of g.cells)board.querySelector(`[data-index="${i}"]`)?.classList.add('hintPair');$('#message').textContent=g.kind==='merge'?'Drag one of the two marked parts onto the other.':'Drag the marked part onto the marked crate.';}
 else if(g.kind==='space')$('#message').textContent='Deliver a ready order, merge two twins, or tap a part and choose Shed.';
 else if(g.kind==='energy')$('#message').textContent='Energy refills +1 every 2 minutes. Merges, crates and deliveries cost nothing.';
};
function header(){
 if(tick(state,Date.now())){persist();render();}
 const t=refillTimes(state,Date.now());$('#energyTimer').textContent=t?'+1 '+clock(t.next):'FULL';
 $('#energy').innerHTML=`${state.energy}<span class="energyCap">/${REFILL_CAP}</span>`;
}

// ---------- actions ----------
function run(a){
 const before={coins:state.coins,energy:state.energy},fromRect=a.type==='produce'?board.querySelector(`[data-index="${a.index??state.board.findIndex(x=>x?.type==='source'&&x.id===a.id)}"]`)?.getBoundingClientRect():a.type==='openKit'?board.querySelector(`[data-index="${a.index}"]`)?.getBoundingClientRect():null;
 const orderRect=a.type==='deliver'?$(`[data-order="${a.id}"]`)?.getBoundingClientRect():null;
 const reachBefore=new Set(cargoKeys(state).map(k=>k.index)),r=act(state,a,Date.now());
 if(!r.ok){$('#message').textContent=r.message;sfx('tap');
  if(a.type==='produce'&&state.energy<1)playlog.event('blockedEnergy');else if(/board is full|Make space/i.test(r.message))playlog.event('blockedFull',{type:a.type});
  return r;}
 logResult(a,r,before);
 $('#message').textContent=r.message;
 if(r.event==='merge'||r.event==='move'||r.event==='producerUp'||r.event==='unseal')selected=r.event==='producerUp'||r.event==='unseal'?null:r.index;
 if(r.event==='deliver'||r.event==='store'||r.event==='swapOrder'){focusOrder=null;selected=null;}
 persist();render();
 const tile=r.index!=null?board.querySelector(`[data-index="${r.index}"]`):null;
 for(const j of r.cracked??[])board.querySelector(`[data-index="${j}"]`)?.classList.add('glassCrack');
 // The third hit: the ice falls away in fragments and the part is revealed (a still ring when
 // motion is reduced).
 if(r.broken?.length){for(const j of r.broken){const t=board.querySelector(`[data-index="${j}"]`);if(!t)continue;t.classList.add('glassBreak');
   if(!reduced())t.insertAdjacentHTML('beforeend',`<span class="iceBurst" aria-hidden="true">${Array.from({length:8},(_,k)=>`<i style="--a:${k*45+12}deg;--d:${26+(k%3)*8}px"></i>`).join('')}</span>`);
   setTimeout(()=>t.querySelector('.iceBurst')?.remove(),900);}sfx('rare');}
 if(r.event==='swap'){tile?.classList.add('merge-pop');burst(tile?.getBoundingClientRect(),'gold');sfx('rare');}
 if(r.event==='merge'){tile?.classList.add('merge-pop');burst(tile?.getBoundingClientRect(),state.board[r.index]?.family);sfx('merge',state.board[r.index]?.tier??0);for(const d of r.dug??[])board.querySelector(`[data-index="${d.index}"]`)?.classList.add('unlocked');}
 if((r.event==='produce'||r.event==='kit')&&fromRect&&tile&&!reduced()){const to=tile.getBoundingClientRect(),el=document.createElement('div');el.className='flight';el.innerHTML=draw(state.board[r.index]);el.style.cssText=`left:${fromRect.x}px;top:${fromRect.y}px;--dx:${to.x-fromRect.x}px;--dy:${to.y-fromRect.y}px`;document.body.append(el);setTimeout(()=>el.remove(),460);}
 if(r.event==='deliver'){rewardFlight(orderRect,$('#coinPill').getBoundingClientRect(),`+${r.coins} coins`);sfx('contract');
  if(r.materials){const t=TASKS[r.materials.id],u=t.stages[r.materials.stage-1];setTimeout(()=>moment('Materials in: '+t.name,`${u.name} can be built for ${u.cost} coins on the ${currentArea(state).name}.`),500);}$('#coinPill').classList.remove('bump');void $('#coinPill').offsetWidth;$('#coinPill').classList.add('bump');}
 if(r.event==='producerUp'){const src=state.board[r.index],next=nextKind(src.id),waiting=next&&src.level<UNLOCK_LEVEL&&!state.board.some(y=>y?.type==='source'&&y.id===next);
  moment(SOURCES[src.id].name+' · level '+src.level,LEVEL_GAIN[src.level]+(waiting?` Level ${UNLOCK_LEVEL} brings out the ${SOURCES[next].name}.`:''),src);tile?.classList.add('merge-pop');burst(tile?.getBoundingClientRect(),'gold',true);sfx('milestone');}
 // On the coast screen the build plays first (Build 41f), then its story.
 if(r.event==='restore'){if($('#coastMap').open&&!reduced())setTimeout(()=>showBeat(r.task,r.effects),1000);else showBeat(r.task,r.effects);}
 if(r.event==='store'){$(`#shed [data-slot="${r.slot}"]`)?.classList.add('merge-pop');sfx('tap');}
 if(r.event==='unstore'){tile?.classList.add('merge-pop');sfx('tap');if(!state.shed.some(Boolean)){shedOpen=false;renderShed();}}
 if(r.event==='shop'){const o=SHOP[r.id];if(r.energy)rewardFlight(($('#shop').open?$('#shopContent'):$('#adEnergyButton')).getBoundingClientRect(),$('#energyPill').getBoundingClientRect(),`+${r.energy} ϟ`);else moment(o.name+(r.ad?' · thanks for watching':''),r.slot!=null?'In the shed: the board is full.':'On the board next to Rivet Rover.',r.thing);tile?.classList.add('unsealed');sfx('rare');}
 if(r.event==='swapOrder'){const c=$(`[data-order="${r.id}"]`);c?.classList.add('merge-pop');sfx('tap');}
 if(r.event==='book'){sfx('rare');}
 if(r.event==='bookPage'){sfx('milestone');moment('Page complete!',`Every ${GENERATOR_NAMES_UI[r.family]} part found · a Brass cog`+(r.slot!=null?' (in the shed)':''),{type:'cog'});tile?.classList.add('unsealed');}
 if(r.event==='daily'){const g=r.gift;if(g.coins)rewardFlight($('#dailyButton').getBoundingClientRect(),$('#coinPill').getBoundingClientRect(),`+${g.coins} coins`);if(g.energy)rewardFlight($('#dailyButton').getBoundingClientRect(),$('#energyPill').getBoundingClientRect(),`+${g.energy} ϟ`);tile?.classList.add('unsealed');sfx('milestone');moment(`Daily gift · day ${g.day} of ${DAILY.length}`,giftText(DAILY[g.day-1])+(g.slot!=null?' · in the shed (the board is full)':''),g.thing??null);}
 // A generator reaching level 2 brings out the next kind beside it.
 for(const n of r.released??[]){const t=board.querySelector(`[data-index="${n.index}"]`);t?.classList.add('unsealed');burst(t?.getBoundingClientRect(),'gold',true);setTimeout(()=>{newGeneratorMoment(n.id);sfx('milestone');},r.event==='producerUp'?900:0);}
 // Chapter 2: rewards that waited for space land now (a first generator of its kind is introduced).
 for(const n of r.arrived??[]){const t=board.querySelector(`[data-index="${n.index}"]`);t?.classList.add('unsealed');burst(t?.getBoundingClientRect(),'gold',true);
  if(n.thing.type==='source'&&state.board.filter(y=>y?.type==='source'&&y.id===n.thing.id).length===1)setTimeout(()=>{newGeneratorMoment(n.thing.id);sfx('milestone');},300);else $('#message').textContent=nameOf(n.thing)+' · arrived on the board';}
 if(r.event==='unseal'){tile?.classList.add('unsealed');burst(tile?.getBoundingClientRect(),'gold',r.opened.type==='source');sfx(r.opened.type==='source'?'milestone':'rare');
  if(r.opened.type==='coins')rewardFlight(tile?.getBoundingClientRect(),$('#coinPill').getBoundingClientRect(),`+${r.opened.coins} coins`);
  if(r.opened.type==='jar')rewardFlight(tile?.getBoundingClientRect(),$('#energyPill').getBoundingClientRect(),`+${r.opened.energy} ϟ`);
  if(r.opened.type==='token')moment('A Tide token!','Lay it on a part: it turns into a part of the same tier that a crew order wants.',{type:'token'});
  if(r.opened.type==='cog')moment('A Brass cog!','Lay it on a generator: it goes up one level and makes better parts.',{type:'cog'});
  if(r.opened.type==='source'){const copies=state.board.filter(y=>y?.type==='source'&&y.id===r.opened.id).length;if(copies>1)moment(`A second ${SOURCES[r.opened.id].name}!`,`Drag it onto the other one of the same level: they merge into a stronger generator.`,{type:'source',id:r.opened.id});else newGeneratorMoment(r.opened.id);}
  // Crates that now touch open ground show their keys for the first time.
  for(const k of cargoKeys(state))if(!reachBefore.has(k.index))board.querySelector(`[data-index="${k.index}"]`)?.classList.add('newKey');}
 if(r.found?.length&&r.event!=='restore'){const k=r.found.at(-1),x=item(k.replace(/\d+$/,''),+k.match(/\d+$/)[0]);if(x.tier>=2)setTimeout(()=>moment('New: '+nameOf(x),(x.tier<maxTier(x.family)?'Next: '+CHAINS[x.family].names[x.tier+1]:'Top of the chain')+` · in the book: +${BOOK_COINS[x.tier]} coins`,x),r.levelUp?1600:0);}
 if(r.levelUp){const u=r.levelUp.at(-1);setTimeout(()=>{moment('Level '+u.level+'!',`The crew is fired up: +${r.levelUp.reduce((n,v)=>n+v.energy,0)} ϟ`);sfx('milestone');$('#levelPill').classList.add('levelUp');setTimeout(()=>$('#levelPill').classList.remove('levelUp'),1400);},r.event==='restore'?0:400);}
 return r;
}
// Taps make, open and show; merging, opening cargo and moving are done by dragging only
// (build 24, user: "touch-r mergelehgui, zuvhun drag hiij mergeldeg baiy").
function clickTile(i){
 const x=state.board[i];
 if(x?.type==='source'){selected=i;if(sourceOpen(state,x.id))run({type:'produce',id:x.id,index:i});render();return;}
 if(x?.type==='kit'&&selected===i){run({type:'openKit',index:i});return;}
 selected=selected===i&&x?.type==='item'?null:x?i:null;render();
}
// The click a drag ends with is not a tap; the next press clears the flag if no click came.
board.addEventListener('click',e=>{if(suppressClick){suppressClick=false;return;}const t=e.target.closest('[data-index]');if(t)clickTile(+t.dataset.index);});
// Drag to merge (build 23, user: "merge hiih uildel drag hiij zuuj bolohgui baina"): every
// movable thing owns its touch gesture (no page scroll), a copy follows the finger, and the
// space under it is marked; letting go there merges or moves.
const DRAGGABLE=['item','kit','source','cog','token'];
function endDrag(){document.querySelectorAll('#board .dragging,#board .target,#shed .target').forEach(x=>x.classList.remove('dragging','target'));drag?.ghost?.remove();drag=null;}
board.addEventListener('pointerdown',e=>{suppressClick=false;const t=e.target.closest('[data-index]');if(!t||e.button!==0)return;const i=+t.dataset.index;if(!DRAGGABLE.includes(state.board[i]?.type))return;drag={from:i,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,over:null};});
// Move and drop are heard on the whole page: a drag can end on the shed under the board.
document.addEventListener('pointermove',e=>{
 if(!drag||drag.id!==e.pointerId)return;
 if(!drag.moved){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<=8)return;drag.moved=true;
  const from=board.querySelector(`[data-index="${drag.from}"]`),r=from.getBoundingClientRect();from.classList.add('dragging');
  if(!shedOpen&&SHED_TYPES_UI.includes(state.board[drag.from]?.type)){shedOpen=true;renderShed();}
  drag.ghost=document.createElement('div');drag.ghost.className='dragGhost';drag.ghost.style.cssText=`width:${r.width}px;height:${r.height}px`;drag.ghost.innerHTML=draw(state.board[drag.from]);document.body.append(drag.ghost);}
 drag.ghost.style.transform=`translate(${e.clientX-drag.ghost.offsetWidth/2}px,${e.clientY-drag.ghost.offsetHeight*.7}px)`;
 const t=document.elementFromPoint(e.clientX,e.clientY)?.closest('#board [data-index], #shed [data-slot]'),i=t?(t.dataset.slot!=null?'s'+t.dataset.slot:+t.dataset.index):null;
 if(i!==drag.over){document.querySelector('#board .target, #shed .target')?.classList.remove('target');drag.over=i;if(t&&i!==drag.from)t.classList.add('target');}
});
document.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;endDrag();if(!d.moved)return;suppressClick=true;const el=document.elementFromPoint(e.clientX,e.clientY),slot=el?.closest('#shed [data-slot]');if(slot){run({type:'store',index:d.from,slot:+slot.dataset.slot});return;}const t=el?.closest('#board [data-index]');if(t&&+t.dataset.index!==d.from){selected=d.from;run({type:'merge',from:d.from,to:+t.dataset.index});}});
document.addEventListener('pointercancel',endDrag);
// iOS Safari can still start a scroll from a button; while dragging, the finger is ours.
board.addEventListener('touchmove',e=>{if(drag?.moved)e.preventDefault();},{passive:false});
$('#selection').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='store')shedOpen=true;const x=state.board[selected];run({type:b.dataset.action,index:selected,id:x?.id});});
$('#requests').addEventListener('click',e=>{const c=e.target.closest('[data-order]');if(!c)return;const o=state.orders.find(o=>o.id===c.dataset.order);if(!o)return;if(orderItems(state,o)){run({type:'deliver',id:o.id});return;}focusOrder=focusOrder===o.id?null:o.id;render();$('#message').textContent=`${CREW[o.who].name} needs ${o.needs.map(r=>r.count+' × '+nameOf(item(r.family,r.tier))).join(' and ')}. Their parts are marked on the board.`;});
// The upgrading happens on the beach screen (user: "tusdaa orchinruu ochij upgrade hiih").
$('#mapButton').onclick=()=>{mapFocus=null;showMap();};
$('#rationButton').onclick=()=>run({type:'ration'});
$('#shed').addEventListener('click',e=>{if(e.target.closest('[data-shed-toggle]')){shedOpen=!shedOpen;sfx('tap');renderShed();return;}const b=e.target.closest('[data-slot]');if(!b)return;if(state.shed[+b.dataset.slot])run({type:'unstore',slot:+b.dataset.slot});else $('#message').textContent='Drag a part, crate, cog or token here to keep it off the board.';});
// ---------- the daily gift ----------
// Today's local day number (the reducer only checks it is a new one).
const today=()=>{const n=Date.now();return Math.floor((n-new Date(n).getTimezoneOffset()*60000)/86400000);};
const giftReady=()=>today()>state.daily.day;
const giftThing=g=>g.kit?{type:'kit',family:newestGenerator(state),size:1,left:3}:g.token?token():g.cog?cog():null;
const giftText=g=>g.energy?`+${g.energy} energy`:g.coins?`+${g.coins} coins`:g.kit?'a Driftwood crate':g.token?'a Tide token':'a Brass cog: +1 generator level';
let giftShown=-1;
function showDaily(){
 giftShown=today();const next=state.daily.count%DAILY.length,ready=giftReady();
 $('#dailyContent').innerHTML=`<h2 id="dailyTitle">Daily gift</h2><p>${ready?'A gift from the crew for coming back. One each day; a missed day does not reset the row.':'Today\'s gift is open. The next one comes tomorrow.'}</p><ol class="dailyRow">${DAILY.map((g,k)=>{const done=k<next||(!ready&&k===next-1),now=ready&&k===next,x=giftThing(g);return `<li class="dailyDay ${done?'done':''} ${now?'today':''}"><small>Day ${k+1}</small><span class="dailyIcon">${x?draw(x):g.coins?'<i class="coinIcon big"></i>':'<b class="bolt">ϟ</b>'}</span><b>${g.energy?'+'+g.energy+' ϟ':g.coins?'+'+g.coins:g.kit?'Crate':g.token?'Token':'Cog'}</b>${done?'<i class="tick">✓</i>':''}</li>`;}).join('')}</ol>${ready?'<button class="primary dailyClaim" data-claim>Open the gift</button>':''}`;
 if(!$('#daily').open)$('#daily').showModal();
}
$('#dailyContent').addEventListener('click',e=>{if(!e.target.closest('[data-claim]'))return;const r=run({type:'daily',day:today()});if(r.ok)$('#daily').close();else showDaily();});
$('#dailyButton').onclick=showDaily;
// ---------- the collection book (build 33) ----------
// A page per generator chain: parts found (tick them off for coins), parts still to find
// (a shadow), and a Brass cog for a whole page. Pages of generators not yet out are closed.
const GENERATOR_NAMES_UI=Object.fromEntries(Object.entries(SOURCES).map(([k,v])=>[k,v.name]));
function showBook(){
 const ready=new Set(bookReady(state)),claimed=new Set(state.book.claimed),total=BOOK_CHAINS.reduce((n,f)=>n+bookKeys(f).length,0);
 const pages=BOOK_CHAINS.map(f=>{
  const keys=bookKeys(f),got=keys.filter(k=>claimed.has(k)).length,open=state.found.some(k=>k.slice(0,-1)===f)||has(f);
  if(!open)return `<section class="bookPage closed"><div class="bookHead"><span class="bookGen">${draw({type:'source',id:f})}</span><span><b>${SOURCES[f].name}</b><small>Comes out later · ${keys.length} parts</small></span></div></section>`;
  const cells=keys.map(k=>{const t=+k.slice(-1),x=item(f,t),name=CHAINS[f].names[t];
   if(ready.has(k))return `<button class="bookItem ready" data-key="${k}" aria-label="${name}: tick off for ${BOOK_COINS[t]} coins">${draw(x)}<small>${name}</small><b class="bookCoins">+${BOOK_COINS[t]} ${COIN}</b></button>`;
   if(claimed.has(k))return `<div class="bookItem got">${draw(x)}<small>${name}</small></div>`;
   return `<div class="bookItem unknown" aria-label="Not found yet">${draw(x)}<small>?</small></div>`;}).join('');
  const done=state.book.pages.includes(f),can=pageReady(state,f);
  return `<section class="bookPage"><div class="bookHead"><span class="bookGen">${draw({type:'source',id:f})}</span><span><b>${SOURCES[f].name}</b><small>${got} / ${keys.length} in the book</small></span>${done?'<em class="pageDone">✓ Cog</em>':can?`<button class="primary pageClaim" data-page="${f}">Claim the cog</button>`:`<em class="pagePrize">${draw({type:'cog'})}</em>`}</div><div class="bookGrid">${cells}</div></section>`;}).join('');
 $('#bookContent').innerHTML=`<h2 id="bookTitle">Collection book</h2><p class="bookIntro">${state.book.claimed.length} of ${total} parts · tick off new finds for coins; a full page gives a Brass cog.</p>${ready.size>1?`<button class="primary bookAll" data-all>Tick off all ${ready.size}</button>`:''}${pages}`;
 if(!$('#book').open)$('#book').showModal();
}
$('#bookContent').addEventListener('click',e=>{
 const k=e.target.closest('[data-key]'),pg=e.target.closest('[data-page]'),all=e.target.closest('[data-all]');
 if(k)run({type:'book',key:k.dataset.key});else if(pg)run({type:'bookPage',family:pg.dataset.page});else if(all){let n=0;for(const key of bookReady(state))n+=run({type:'book',key}).coins??0;$('#message').textContent=`In the book · +${n} coins`;}else return;
 showBook();
});
$('#bookButton').onclick=showBook;
$('#orderTools').addEventListener('click',e=>{const up=e.target.closest('[data-unpark]');if(up){run({type:'unstore',slot:+up.dataset.unpark});return;}const id=focusOrder;if(e.target.closest('[data-swap]'))run({type:'swapOrder',id,day:today()});else if(e.target.closest('[data-swap-ad]'))watchAd({type:'swapOrder',id,day:today(),ad:true});});
// ---------- the shop and rewarded ads (build 34) ----------
const offerThing=o=>o.kit?{type:'kit',family:newestGenerator(state),size:o.kit,left:3}:o.token?token():o.cog?cog():null;
function showShop(){
 const day=today(),row=id=>{const o=SHOP[id],left=shopLeft(state,id,day),x=offerThing(o);
  const what=o.energy?`+${o.energy} energy`:o.kit?`${CRATES[o.kit-1]} for the ${SOURCES[newestGenerator(state)].name}`:o.token?'Turns a part into one an order wants':'+1 level for a generator';
  const btn=left<1?'<button disabled>Sold out</button>':o.ad?`<button class="adOffer" data-ad="${id}">▶ Free</button>`:`<button class="buy" data-buy="${id}" ${state.coins<o.cost?'disabled':''}>${COIN} ${o.cost}</button>`;
  return `<li class="shopItem"><span class="shopIcon">${x?draw(x):'<b class="bolt">ϟ</b>'}</span><span class="shopText"><b>${o.name}</b><small>${what}</small><small class="left">${left} of ${o.limit} left today</small></span>${btn}</li>`;};
 const ids=Object.keys(SHOP);
 $('#shopContent').innerHTML=`<div class="shopTop"><h2 id="shopTitle">Shop</h2><b class="beachCoins">${COIN} ${state.coins}</b></div><p>A little help for coins, a few of each a day; it restocks tomorrow. Coins spent here are not spent on the coast.</p>
  <h3>Free with a short ad</h3><ol class="shopList">${ids.filter(id=>SHOP[id].ad).map(row).join('')}</ol>
  <h3>For coins</h3><ol class="shopList">${ids.filter(id=>!SHOP[id].ad).map(row).join('')}</ol>`;
 if(!$('#shop').open)$('#shop').showModal();
}
$('#shopContent').addEventListener('click',e=>{const b=e.target.closest('[data-buy]'),ad=e.target.closest('[data-ad]');if(b){run({type:'buy',id:b.dataset.buy,day:today()});showShop();}else if(ad)watchAd({type:'adReward',id:ad.dataset.ad});});
$('#shopButton').onclick=()=>{playlog.event('shopOpen');showShop();};
$('#adEnergyButton').onclick=()=>watchAd({type:'adReward',id:'adEnergy'});
// Where no ad network is on the page (the playtest page), a stand-in counts down instead;
// closing it early gives no reward, like a real rewarded ad.
function adStandIn(){
 return new Promise(resolve=>{
  const dlg=$('#adStandIn');let n=5,timer;const done=r=>{clearInterval(timer);dlg.close();resolve(r);};
  const show=()=>{$('#adContent').innerHTML=`<small class="adTag">AD STAND-IN</small><h2 id="adTitle">${n>0?'Your reward in '+n:'Reward ready'}</h2><p>On CrazyGames a short video ad plays here. This test page has no ad network, so nothing is shown.</p>${n>0?'<button class="adSkip" data-skip>Close · no reward</button>':'<button class="primary" data-collect>Collect the reward</button>'}`;};
  $('#adContent').onclick=e=>{if(e.target.closest('[data-skip]'))done('skipped');else if(e.target.closest('[data-collect]'))done('finished');};
  dlg.oncancel=e=>{e.preventDefault();if(n<=0)done('finished');else done('skipped');};
  show();dlg.showModal();timer=setInterval(()=>{n--;show();if(n<=0)clearInterval(timer);},1000);
 });
}
let adBusy=false;
// The action is run only when the ad finished; today's day is filled in then.
async function watchAd(action){
 if(adBusy)return;adBusy=true;const offer=action.type==='swapOrder'?'swap':action.id;playlog.event('ad',{id:offer,phase:'start'});
 const r=await rewardedAd({onStart(){adPlaying=true;},onEnd(){adPlaying=false;},standIn:adStandIn});
 adBusy=false;playlog.event('ad',{id:offer,phase:r});
 if(r==='finished')run({...action,day:today()});
 else $('#message').textContent=r==='skipped'?'The ad was closed early: no reward.':'No ad is available right now. Try again later.';
 if($('#shop').open)showShop();render();
}
// The gift opens by itself once a session is under way, never over another screen or a drag.
function offerGift(){if(!adBusy&&giftReady()&&giftShown!==today()&&state.moves>=3&&!drag&&!document.querySelector('dialog[open]'))showDaily();}
$('#soundButton').onclick=()=>{sound.toggle();render();};
$('#helpButton').onclick=()=>$('#help').showModal();
$('#menuButton').onclick=()=>{$('#classicNote').textContent=storage.get('vaultwake-v5')?'Your Classic save is kept and continues where you left it.':'';$('#menu').showModal();};
$('#newGame').onclick=()=>{if(!confirm('Start the Coast Camp from the beginning? Your Classic save is not affected.'))return;state=fresh(Date.now());selected=null;focusOrder=null;persist();$('#menu').close();render();showIntro();};
for(const d of document.querySelectorAll('dialog'))d.querySelector('.close')?.addEventListener('click',()=>d.close());
// A story bubble belongs to the screen it was shown on.
$('#coastMap').addEventListener('close',()=>{document.querySelector('#coastMap #bubble')?.remove();viewing=null;});

// ---------- the beach screen and story ----------
// A full-screen view of the area: the picture with every place at its stage, and the list
// of places with their next stage and its price. Coins are spent here only.
// The area's picture changes with its stages (build 37, user: "bushiin zurgiin uurchlultiig hii"):
// it starts storm-grey, and each place brings its own patch of colour back, wider at every stage
// (REVEAL, in % of the picture's width), with a glow at stage 3, and the storm lifts a little
// with every stage (--p); a finished area is in full colour. The stage just bought spreads its colour out from the old size.
const REVEAL=[0,13,19,26];
let lastStage=null;// {id,stage} of the upgrade being shown, so its patch can grow
// The Tideglass Vault (Build 42): a separate layer, its state read from the save. It is sealed
// on the beach and while the Survey Worksite surveys, lights and maps its door (ws-door's
// stages); it opens only when a Vault Entrance area with places is built, which this build
// does not have yet. No keys, meters or currencies of its own.
const ENTRANCE=AREAS.find(a=>a.id==='entrance');
const VAULT_AT={beach:[92.5,21],worksite:[88,24]};
function vaultState(){
 if(ENTRANCE&&areaDone(state,ENTRANCE))return 'open';
 if(state.area<1)return 'sealed';
 return ['reached','surveyed','lit','mapped'][stageOf(state,'ws-door')];
}
const VAULT_TEXT={sealed:'sealed, beyond the cliff gate',reached:'sealed; its door waits at the worksite',surveyed:'sealed; its door is surveyed',lit:'sealed; its door is lit',mapped:'sealed; its dial is mapped',open:'open'};
function vaultLayer(area){
 const at=VAULT_AT[area.id];if(!at)return '';const st=vaultState();
 return `<div class="vaultLayer ${st}" style="left:${at[0]}%;top:${at[1]}%" role="img" aria-label="The Tideglass Vault: ${VAULT_TEXT[st]}"><img src="assets/premium/coast/vault-door-${st==='open'?'open':'sealed'}.webp" alt="" draggable="false"><b class="vaultPlate"><i class="lockGlyph" aria-hidden="true"></i>${st==='open'?'Open':'Sealed'}</b></div>`;
}
function sceneHtml(area){
 const done=areaDone(state,area),vars=area.tasks.map((t,k)=>{const n=stageOf(state,t.id),grow=lastStage?.id===t.id;return `--r${k}:${REVEAL[grow?lastStage.stage-1:n]}`;}).join(';');
 const masks=area.tasks.map((t,k)=>`radial-gradient(ellipse calc(var(--r${k})*1%) calc(var(--r${k})*2%) at ${t.at[0]}% ${t.at[1]}%,#000 40%,transparent 100%)`).join(',');
 const pic=area.map?`assets/premium/${area.map}.webp`:`assets/premium/${area.picture}-vibrant.webp`;
 return `<div class="beachScene ${done?'complete':''} ${area.map?'mapped':''}" data-area="${area.id}" data-built="${builtCount(state,area)}" style="--p:${(builtCount(state,area)/(area.tasks.length*STAGES)).toFixed(3)}"><img class="sceneBase" src="${pic}" alt="${area.name}, ${done?'fully restored':builtCount(state,area)+' of '+area.tasks.length*STAGES+' upgrades'}"><div class="sceneStorm" aria-hidden="true"></div><img class="sceneColor" src="${pic}" alt="" aria-hidden="true" style="${vars};-webkit-mask-image:${masks};mask-image:${masks}">${vaultLayer(area)}<div class="restored">${placeIcons(area.tasks.filter(t=>stageOf(state,t.id)>0))}</div></div>`;
}
// After the picture is drawn with the old size, the new one is set so the colour spreads.
function growScene(){
 if(!lastStage)return;const area=currentArea(state),k=area.tasks.findIndex(t=>t.id===lastStage.id),img=$('#coastMap .sceneColor');lastStage=null;
 if(!img||k<0)return;requestAnimationFrame(()=>requestAnimationFrame(()=>img.style.setProperty(`--r${k}`,REVEAL[stageOf(state,area.tasks[k].id)])));
}
// The coast screen (Build 41e, user: "Bolhi baina 2000onii togloom bishdee yamar"): the area's
// picture fills the top with a marker on every place that can be built; one card for the
// chosen place says what its next stage needs (its gold order's parts, its coins) with one big
// button; the places sit below as a grid of tiles to choose from.
let mapFocus=null;
const canBuild=u=>u.materials&&state.coins>=u.cost;
function mapCard(area,t,u){
 const n=stageOf(state,t.id);
 if(n>=STAGES)return `<section id="mapCard" class="mapCard done" data-card="${t.id}"><span class="cardArt">${placeArt(t,n)}</span><div class="cardBody"><small class="cardPlace">${t.name}</small><h3>${t.stages[STAGES-1].name}</h3>${pips(n)}<p class="cardDone">Fully restored ✓</p></div><button class="cardButton replay" type="button" data-replay="${t.id}">Replay its story</button></section>`;
 if(!u){const k=area.tasks.indexOf(t),b=blockedStage(state,t.id);
  // Chapter 2: a stage can wait for another place (the sea gate waits for the array).
  const why=b?`Opens once ${Object.entries(b.requires).map(([id,m])=>TASKS[id].stages[m-1].name).join(' and ')} is done.`:viewing?'Not built yet.':`Opens when ${area.tasks[k-1]?.name??'the place before it'} has its first stage.`;
  return `<section id="mapCard" class="mapCard locked" data-card="${t.id}"><span class="cardArt ${n?'':'unbuilt'}">${placeArt(t,n)}</span><div class="cardBody"><small class="cardPlace">${b?`Stage ${b.stage}`:'Locked'}</small><h3>${b?b.name:t.name}</h3>${pips(n)}<p class="cardDone">${why}</p></div></section>`;}
 const order=state.orders.find(o=>o.story===t.id),coinsOk=state.coins>=u.cost;
 const stuff=u.materials?`<span class="need ok"><b class="needIcon">✓</b><span>Materials</span></span>`
  :order?`<span class="need"><span class="needParts">${orderProgress(state,order).map(r=>`<i>${draw(item(r.family,r.tier))}<b>${r.have}/${r.count}</b></i>`).join('')}</span><span>Gold order</span></span>`
  :`<span class="need"><b class="needIcon">…</b><span>Gold order coming</span></span>`;
 const coins=`<span class="need ${coinsOk?'ok':''}"><b class="needIcon coinNeed">${COIN}</b><span><b>${Math.min(state.coins,u.cost)}</b>/${u.cost}</span></span>`;
 const button=canBuild(u)?`<button class="cardButton build" type="button" data-restore="${t.id}">Build · ${COIN} ${u.cost}</button>`
  :!u.materials&&order?`<button class="cardButton go" type="button" data-make="${order.id}">Make the gold order</button>`
  :!u.materials?`<button class="cardButton go" type="button" data-go>Deliver an order</button>`
  :`<button class="cardButton go" type="button" data-go>Earn ${u.cost-state.coins} more ${COIN}</button>`;
 return `<section id="mapCard" class="mapCard ${canBuild(u)?'ready':''}" data-card="${t.id}"><span class="cardArt next">${placeArt(t,u.stage)}<em>Stage ${u.stage}</em></span><div class="cardBody"><small class="cardPlace">${n?t.stages[n-1].name:t.name}</small><h3>${u.name}</h3>${pips(n)}<div class="needs">${stuff}${coins}</div></div>${button}</section>`;
}
// Chapter 2: a finished area can be looked at again (its scene, its places, their stories);
// viewing changes nothing in the camp.
let viewing=null;
function showMap(){
 if(viewing!=null&&viewing>=state.area)viewing=null;
 const area=viewing!=null?AREAS[viewing]:currentArea(state),ups=viewing!=null?[]:upgrades(state),open=new Map(ups.map(u=>[u.id,u]));
 if(!area.tasks.some(t=>t.id===mapFocus))mapFocus=null;
 mapFocus??=(ups.find(canBuild)??ups.find(u=>u.materials)??ups.find(u=>state.orders.some(o=>o.story===u.id))??ups[0])?.id??area.tasks.at(-1).id;
 const focus=area.tasks.find(t=>t.id===mapFocus),total=area.tasks.length*STAGES,built=builtCount(state,area);
 const places=area.tasks.map(t=>{
  const n=stageOf(state,t.id),u=open.get(t.id);
  const status=n>=STAGES?'done':u&&canBuild(u)?'ready':u?'next':'locked';
  const badge=status==='done'?'<b class="tileBadge done">✓</b>':status==='ready'?'<b class="tileBadge ready">!</b>':status==='locked'?'<b class="tileBadge locked">🔒</b>':'';
  return `<li class="place ${t.id===mapFocus?'selected':''}" style="--i:${area.tasks.indexOf(t)}" data-status="${status}" data-place="${t.id}"><button type="button" data-select="${t.id}" aria-label="${t.name}: ${status==='done'?'complete':status==='locked'?'locked':status==='ready'?'ready to build':`stage ${n} of ${STAGES}`}"><span class="placeIcon ${t.art&&!n?'unbuilt':''}">${placeArt(t,n)}</span>${pips(n)}${badge}</button></li>`;
 }).join('');
 const markers=area.tasks.filter(t=>open.has(t.id)).map((t,k)=>{const u=open.get(t.id);return `<button type="button" class="siteMarker ${area.map?'small':''} ${area.map&&stageOf(state,t.id)&&ANCHORED.has(t.art)?'beside':''} ${canBuild(u)?'ready':''} ${t.id===mapFocus?'selected':''}" data-select="${t.id}" style="--i:${k};${markerAt(t)}" aria-label="${u.name}${canBuild(u)?': ready to build':''}"><span><i class="mk ${canBuild(u)?'up':'next'}" aria-hidden="true"></i></span></button>`;}).join('');
 // Finished areas stay listed above the current one, the ones still to come below it.
 const before=viewing!=null?`<button class="backToBoard viewBack" type="button" data-view="now">Back to ${currentArea(state).name}</button>`:AREAS.slice(0,state.area).map((a,i)=>`<section class="mapArea done"><div class="mapHead"><img src="assets/premium/${a.picture}-vibrant.webp" alt=""><div><h2>${a.name}</h2><b>Complete ✓</b></div><button type="button" class="viewArea" data-view="${i}" aria-label="Look at ${a.name} again">View</button></div></section>`).join('');
  const laterAreas=viewing!=null?[]:AREAS.slice(state.area+1);
 const later=laterAreas.map(a=>`<section class="mapArea coming"><div class="mapHead"><img src="assets/premium/${a.picture}-vibrant.webp" alt=""><div><h2>${a.name}</h2><b>${a.tasks.length?'Later in the story':'In development'}</b></div></div></section>`).join('');
 $('#mapContent').innerHTML=`<div class="beachTop"><h2 id="mapTitle" class="mapTitle">${area.name}</h2><b class="beachCoins">${COIN} ${state.coins}</b></div>
  <div class="sceneWrap">${sceneHtml(area)}<div class="sceneLight" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="siteMarkers">${markers}</div>
  <div class="mapProgress" role="img" aria-label="${built} of ${total} upgrades"><i style="width:${(100*built/total).toFixed(1)}%"></i><b>${built} / ${total}${areaDone(state)?' · complete!':''}</b></div></div>
  ${mapCard(area,focus,open.get(focus.id))}
  <ol class="places">${places}</ol>${before}${journal()}${laterAreas.length?`<details class="mapFuture"><summary>Coming next · ${laterAreas.length} area${laterAreas.length>1?'s':''}</summary>${later}</details>`:''}
  <button class="backToBoard" type="button" data-back>Back to the board</button>`;
 // The place row scrolls sideways to keep the chosen place in view (Build 41n).
 {const row=$('#coastMap .places'),sel=row?.querySelector('.place.selected');if(sel)row.scrollLeft=Math.max(0,sel.offsetLeft-(row.clientWidth-sel.offsetWidth)/2);}
 // Opening plays the screen in (picture, pins, card, tiles); choosing another place swaps the card.
 const content=$('#mapContent'),opening=!$('#coastMap').open;
 content.classList.toggle('entering',opening);if(opening){clearTimeout(content._enter);content._enter=setTimeout(()=>content.classList.remove('entering'),1400);}
 if(!opening&&shownCard!==mapFocus)$('#mapCard')?.classList.add('swapIn');shownCard=mapFocus;
 if(opening)$('#coastMap').showModal();
 if(!$('#beat').open)growScene();
}
let shownCard=null;
// Effects on the coast screen are drawn inside it: the screen is a modal dialog, so anything on
// the page body would be hidden behind it (Build 41f).
function mapFx(cls,x,y,css='',ms=900){const el=document.createElement('i');el.className='mapFx '+cls;el.style.cssText=`left:${x}px;top:${y}px;${css}`;$('#coastMap').append(el);setTimeout(()=>el.remove(),ms);return el;}
function buildFx(id,from){
 if(reduced())return;
 const icon=$(`#coastMap .restoredIcon[data-task="${id}"]`),scene=$('#coastMap .beachScene');const to=(icon??scene).getBoundingClientRect(),tx=to.x+to.width/2,ty=to.y+to.height/2;
 // Coins fly from the button to the place, then it is built with a thump, a ring and sparks.
 if(from)for(let k=0;k<6;k++){const fx=from.x+from.width/2+(k-2.5)*14,fy=from.y+from.height/2;mapFx('coinFly',fx,fy,`--dx:${tx-fx}px;--dy:${ty-fy}px;animation-delay:${k*55}ms`,900);}
 setTimeout(()=>{scene?.classList.remove('thump');void scene?.offsetWidth;scene?.classList.add('thump');icon?.classList.add('built');
  mapFx('buildRing',tx,ty,'',800);for(let k=0;k<14;k++){const a=2*Math.PI*k/14,d=46+(k%3)*14;mapFx('buildSpark',tx,ty,`--dx:${Math.cos(a)*d}px;--dy:${Math.sin(a)*d}px;background:${k%2?'#ffe08a':'#ffffff'}`,800);}
  sfx('milestone');},520);
}
$('#mapContent').addEventListener('click',e=>{
 const v=e.target.closest('[data-view]');if(v){viewing=v.dataset.view==='now'?null:+v.dataset.view;mapFocus=null;sfx('tap');showMap();$('#mapContent').scrollTop=0;$('#coastMap').scrollTop=0;return;}
 const rs=e.target.closest('[data-replay-stage]');if(rs){const [id,k]=rs.dataset.replayStage.split(':');playLines(TASKS[id].stages[k-1].name,TASKS[id].stages[k-1].lines);return;}
 const rv=e.target.closest('[data-replay-reveal]');if(rv){const r=REVEALS.find(x=>x.id===rv.dataset.replayReveal);if(r?.card)revealCard(r.card(),()=>{});else if(r?.intro){const a=AREAS.find(x=>x.id===r.intro);playLines(a.name,a.intro);}return;}
 const r=e.target.closest('[data-restore]');if(r){const from=r.getBoundingClientRect(),cost=upgrades(state).find(u=>u.id===r.dataset.restore)?.cost;receipt=cost;const res=run({type:'restore',id:r.dataset.restore});if(!res.ok)receipt=null;if(res.ok&&!res.effects.nextArea)lastStage={id:res.task,stage:res.stage};if(res.ok&&stageOf(state,res.task)>=STAGES)mapFocus=null;showMap();if(res.ok&&!res.effects.nextArea)buildFx(res.task,from);return;}
 const sel=e.target.closest('[data-select]');if(sel){mapFocus=sel.dataset.select;sfx('tap');showMap();return;}
 const make=e.target.closest('[data-make]');if(make){$('#coastMap').close();focusOrder=make.dataset.make;render();$('#message').textContent='The gold order is marked: make its parts and deliver it for the materials.';return;}
 const p=e.target.closest('[data-replay]');if(p){showBeat(p.dataset.replay,{},STAGES);return;}
 if(e.target.closest('[data-back],[data-go]'))$('#coastMap').close();
});
// The journal (Chapter 2 plan): every stage told so far and every reveal seen, area by area,
// each with a replay, so a skipped line is never lost. Read from the save; nothing new is stored.
const REVEAL_TITLES={'cliff-gate':'The cliff gate is open','door':'The dial is mapped','vault-open':'The Vault is open','obs-signal':'A signal on one bearing','obs-harbour':'A hidden harbour'};
function journal(){
 const rows=AREAS.slice(0,state.area+1).filter(a=>a.tasks.length).map(a=>{
  const told=a.tasks.flatMap(t=>Array.from({length:stageOf(state,t.id)},(_,k)=>({t,k:k+1})));
  const reveals=REVEALS.filter(r=>state.seen[r.id]&&(r.then===a.id||r.intro===a.id||(r.id.startsWith('obs-')&&a.id==='vault')));
  if(!told.length&&!reveals.length)return '';
  return `<li><h4>${a.name}</h4><ol>${reveals.map(r=>`<li class="jReveal"><span>${REVEAL_TITLES[r.id]}</span><button type="button" data-replay-reveal="${r.id}">Replay</button></li>`).join('')}${told.map(({t,k})=>`<li><span>${t.stages[k-1].name}</span><button type="button" data-replay-stage="${t.id}:${k}" aria-label="Replay ${t.stages[k-1].name}">Replay</button></li>`).join('')}</ol></li>`;}).join('');
 return rows?`<details class="journal"><summary>Story so far</summary><ol>${rows}</ol></details>`:'';
}
function rewardText(e={}){
 const out=[];
 if(e.energy)out.push(`+${e.energy} energy`);
 if(e.copy>=0&&e.copyId)out.push(`a ${SOURCES[e.copyId].name} to merge`);
 if(e.kit>=0&&state.board[e.kit]?.type==='kit')out.push(nameOf(state.board[e.kit]).replace(' · ',' for '));
 if(e.token>=0)out.push('a Tide token');
 if(e.cog>=0)out.push('a Brass cog');
 if(e.slots)out.push('a fourth order card');
 if(e.pending)out.push(`${e.pending} waiting for a free space`);
 out.push('+8 XP');
 return 'Rewards: '+out.join(' · ');
}
// ---------- the story (Chapter 2 plan D8) ----------
// A stage's lines are a bubble that does not stop play; the chapter's big moments are reveal cards.
// A reveal is marked seen (state.seen) when it is dismissed, so it plays once: again after a reload
// that came before the dismissal, never after it. Stale ones (a camp that loads long past them, or
// a save from before they existed) are marked seen without playing.
const REVEALS=[
 {id:'cliff-gate',when:s=>s.area>=1,live:s=>s.area===1&&!builtCount(s,AREAS[1]),card:gateCard,then:'worksite'},
 {id:'door',when:s=>s.area>=2,live:s=>s.area===2&&!builtCount(s,AREAS[2]),intro:'entrance'},
 {id:'vault-open',when:s=>s.area>=3,live:s=>s.area===3&&!builtCount(s,AREAS[3]),card:vaultOpenCard,then:'vault'},
 {id:'obs-signal',when:s=>stageOf(s,'obs-array')>=STAGES,live:s=>stageOf(s,'obs-passage')<STAGES,card:signalCard},
 {id:'obs-harbour',when:s=>stageOf(s,'obs-passage')>=STAGES,live:()=>true,card:harbourCard}
];
const markSeen=id=>{if(act(state,{type:'seen',id},Date.now()).ok){persist();playlog.event('reveal',{id});}};
const pendingReveals=()=>REVEALS.filter(v=>v.when(state)&&!state.seen[v.id]);
// The newest reveal the camp has reached plays; older unseen ones are only marked.
function nextReveal(done=()=>{}){
 const list=pendingReveals(),last=list.at(-1);
 for(const v of list.slice(0,-1))markSeen(v.id);
 if(!last){done();return false;}
 if(!last.live(state)){markSeen(last.id);done();return false;}
 const finish=()=>{markSeen(last.id);const a=last.then&&AREAS.find(x=>x.id===last.then);if(a?.intro)playLines(a.name,a.intro,done);else done();};
 if(last.intro){const a=AREAS.find(x=>x.id===last.intro);playLines(a.name,a.intro,finish);}else revealCard(last.card(),finish);
 return true;
}
// One card in the story dialog; Continue or Esc skips it.
function revealCard(html,done){
 const dlg=$('#beat'),finish=()=>{dlg.oncancel=null;dlg.close();done();};
 $('#beatContent').innerHTML=`<div class="beat vaultReveal">${html}<button class="primary" id="beatNext">Continue</button></div>`;
 $('#beatNext').onclick=finish;dlg.oncancel=e=>{e.preventDefault();finish();};
 if(!dlg.open)dlg.showModal();
}
const nextLine=()=>{const u=upgrades(state)[0];if(!u)return '';const gold=state.orders.some(o=>o.story===u.id);return `<p class="revealNext"><b>Next</b>${u.name}${gold?' · its gold order is on the board':''}</p>`;};
// Build 42's card: the cliff gate swings off the still-sealed Vault door.
function gateCard(){return `<small>Landing Beach · stage ${STAGES} of ${STAGES}</small><div class="revealStage" aria-hidden="true"><img class="revealDoor" src="assets/premium/coast/vault-door-sealed.webp" alt="" draggable="false"><i class="gate left"></i><i class="gate right"></i></div><h3>The cliff gate is open</h3><p>The Survey Worksite is ours to build. Beyond it, the Vault door is still sealed.</p>${nextLine()}`;}
// Reveal A: the third ring turns and the door opens on a quiet observatory.
function vaultOpenCard(){return `<small>Chapter 1 complete · Coast Camp</small><div class="revealPanel" aria-hidden="true"><img class="panelFrom" src="assets/premium/coast/vault-reveal-sealed.webp" alt="" draggable="false"><img class="panelTo" src="assets/premium/coast/vault-reveal-open.webp" alt="" draggable="false"></div><h3>The Vault is open</h3><p class="revealLine">${portrait('neri')}<span><b>Neri</b>It was never a treasure room. Lamps, desks, brass rings: an observatory, gone quiet.</span></p><p>Chapter 2, The Silent Observatory, begins. Your board, generators and coins come with you.</p>${nextLine()}`;}
// Reveal D: the array wakes and reads a signal; where it comes from, not who sends it.
function signalCard(){return `<small>The Silent Observatory · the array</small><div class="revealStage signal" aria-hidden="true"><img class="revealDoor" src="assets/premium/coast/place-obs-array-3.webp" alt="" draggable="false"><i class="beam"></i></div><h3>A signal on one bearing</h3><p class="revealLine">${portrait('tamsin')}<span><b>Tamsin</b>Three long, two short: the call sign in their logs. I can tell where it comes from. Not who sends it, or how long it has been sending.</span></p>${nextLine()}`;}
// Reveal E: the sea gate opens on a hidden harbour; the chapter is complete (the end card follows).
function harbourCard(){return `<small>The Silent Observatory · the sea gate</small><div class="revealPanel single" aria-hidden="true"><img class="panelTo" src="assets/premium/coast/harbour-view.webp" alt="" draggable="false"></div><h3>A hidden harbour</h3><p class="revealLine">${portrait('bram')}<span><b>Bram</b>The bearing runs straight through it. Who sent that signal, and what happened in that harbour?</span></p>`;}
// The bubble: a stage's lines at the bottom of the screen, read at the player's pace.
function bubble(title,lines,spent){
 document.querySelector('#bubble')?.remove();
 const host=$('#coastMap').open?$('#coastMap'):document.body,el=document.createElement('aside');el.id='bubble';el.className='storyBubble';el.setAttribute('role','status');
 let n=0;const show=()=>{const [who,line]=lines[n];el.innerHTML=`<div class="bubbleLine">${portrait(who)}<p><small>${title}${spent?` · −${spent} coins`:''}</small><b>${CREW[who].name}</b>${line}</p></div><div class="bubbleNav">${lines.length>1?`<span>${n+1} / ${lines.length}</span>`:''}<button type="button" data-bubble-next>${n<lines.length-1?'Next':'OK'}</button></div>`;};
 el.addEventListener('click',e=>{if(!e.target.closest('[data-bubble-next]'))return;n++;if(n<lines.length)show();else el.remove();});
 show();host.append(el);
}
// A bought stage: its lines (a bubble; a card when a reveal follows), its rewards, then any reveal
// and, at the end of the available content, the chapter-complete card.
function showBeat(id,effects,stage=stageOf(state,id)){
 const area=AREAS.find(a=>a.tasks.some(t=>t.id===id)),t=area.tasks.find(t=>t.id===id),st=t.stages[Math.max(0,stage-1)];
 const spent=receipt;
 const after=()=>{const icon=$(`#coastMap .restoredIcon[data-task="${id}"]`)??$(`.restoredIcon[data-task="${id}"]`);icon?.classList.add('upgraded');
  if(effects&&Object.keys(effects).length)moment(`${st.name} · stage ${stage} of ${STAGES}`,rewardText(effects),null);burst(($('#coastMap').open?$('#coastMap .beachScene'):board).getBoundingClientRect(),'gold',true);
  for(const i of [effects?.kit,effects?.copy,effects?.cog,effects?.token])if(i>=0)board.querySelector(`[data-index="${i}"]`)?.classList.add('unsealed');
  // A first generator of its kind (the Lens Bench) is introduced with its chain.
  if(effects?.copy>=0&&effects.copyId&&[...state.board,...state.shed].filter(y=>y?.type==='source'&&y.id===effects.copyId).length===1)setTimeout(()=>newGeneratorMoment(effects.copyId),700);
  if(effects?.areaDone&&allDone(state))setTimeout(showEnd,900);};
 const toNext=()=>{if(effects?.nextArea){render();showMap();}else if($('#coastMap').open)showMap();after();};
 if(pendingReveals().some(v=>v.live(state)))playLines(st.name,st.lines,()=>nextReveal(toNext));
 else{receipt=null;bubble(st.name,st.lines,spent);toNext();}
 sfx('milestone');
}
// The coins a bought stage cost, said on its story card (Build 41 M3, from PR #77's receipt).
let receipt=null;
function playLines(title,lines,done){
 let n=0;const dlg=$('#beat'),spent=receipt;receipt=null;
 const show=()=>{const [who,line]=lines[n];$('#beatContent').innerHTML=`<div class="beat"><small>${title}</small>${spent?`<b class="beatReceipt">−${spent} coins</b>`:''}<div class="beatLine">${portrait(who)}<p><b>${CREW[who].name}</b>${line}</p></div><div class="beatDots">${lines.map((_,k)=>`<i class="${k===n?'on':''}"></i>`).join('')}</div><button class="primary" id="beatNext">${n<lines.length-1?'Next':'Continue'}</button></div>`;
  $('#beatNext').onclick=()=>{n++;if(n<lines.length)show();else{dlg.close();done?.();}};};
 show();if(!dlg.open)dlg.showModal();
}
// A generator level that opens a chain shows the whole new chain.
// A generator found in cargo shows its whole chain.
function newGeneratorMoment(gen){const c=CHAINS[GENERATOR_CHAINS[gen][0][0]];moment(`New generator: ${SOURCES[gen].name}!`,c.names.join(' → '),{type:'source',id:gen});}
function showIntro(){const a=currentArea(state);if(a.intro)playLines(a.name,a.intro);}

$('#build').textContent='COAST CAMP · '+BUILD.toUpperCase();
// CrazyGames lifecycle (Build 41 M7; no-ops without the SDK): loading until the page has loaded,
// then gameplay whenever no menu, end screen, log, ad or hidden tab is in the way.
initPlatform().then(on=>{if(!on)return;platform.loadingStart();const stop=()=>{platform.loadingStop();syncPlaying();};document.readyState==='complete'?stop():addEventListener('load',stop,{once:true});});
const syncPlaying=()=>platform.setPlaying(!adBusy&&!document.hidden&&!document.querySelector('#menu[open],#help[open],#playlog[open],#endDialog[open],#adStandIn[open]'));
document.addEventListener('visibilitychange',syncPlaying);
// What the playtest log keeps of an action (Build 41 M6).
function logResult(a,r,before){
 playlog.touch();
 if(r.event==='merge')playlog.milestone('firstMerge');
 if(r.event==='deliver'){playlog.milestone('firstOrder');playlog.event('order',{coins:r.coins});}
 if(r.effects?.areaDone)platform.happytime();
 if(r.event==='restore'){playlog.milestone('firstStage');playlog.event('stage',{task:r.task,stage:r.stage});if(r.effects?.nextArea)playlog.event('area',{id:r.effects.nextArea});}
 for(const n of r.released??[])playlog.event('generator',{id:n.id});
 if(r.event==='unseal'||r.event==='producerUp')playlog.milestone('firstDiscovery');
 if(before.energy>0&&state.energy===0)playlog.event('energyOut');
 if(['ration','shop','swapOrder','daily'].includes(r.event))playlog.event(r.event,r.event==='shop'?{id:r.id,ad:r.ad}:r.event==='swapOrder'?{ad:r.ad}:undefined);
 if(r.event==='seenEnd')playlog.milestone('complete',{orders:state.ordersDone});
}
let adOffered=false;
// The end of the content this build has (Build 41 M5; Chapter 2: it says which chapter is
// complete and that the next one is in development, never that the game is over). Once, after the
// last stage or on the next visit; a later update with more places shows it again at its own end.
function showEnd(){
 if(!allDone(state)||state.seenEnd)return;run({type:'seenEnd'});playlog.flush();
 const gens=new Set([...state.board,...state.shed].filter(x=>x?.type==='source').map(x=>x.id)).size,stages=Object.values(state.built).reduce((a,b)=>a+b,0);
 const ch=chapterOfArea(currentArea(state).id),next=CHAPTERS[CHAPTERS.indexOf(ch)+1];
 $('#endContent').innerHTML=`<small class="adTag">CHAPTER ${ch.n} COMPLETE</small><h2 id="endTitle">${ch.title}</h2>
  <p>So far: <b>${stages} stages</b> restored, <b>${state.ordersDone} crew orders</b>, <b>${gens} generators</b>.</p>
  ${next&&!chapterAvailable(next)?`<p>Chapter ${next.n}, <b>${next.title}</b>, is in development. Crew orders, the collection book, the shop and daily gifts carry on meanwhile.</p>`:''}
  <button class="primary" type="button" data-keep>Keep playing</button><button class="menuButton" type="button" data-feedback>Share feedback</button>`;
 $('#endDialog').showModal();
}
$('#endContent').addEventListener('click',e=>{if(e.target.closest('[data-keep]'))$('#endDialog').close();if(e.target.closest('[data-feedback]')){$('#endDialog').close();showPlaylog(true);}});
// The playtest log screen: copy or download it, or clear it (the game's save is not touched).
const QUESTIONS='1. What was the most fun?\n2. Where did you get stuck or bored?\n3. Would you play again tomorrow? Why?';
function showPlaylog(ask=false){
 playlog.flush();const json=playlog.toJSON(),sum=JSON.parse(json).summary;
 $('#playlogContent').innerHTML=`<h2 id="playlogTitle">Playtest log</h2><p>Kept only in this browser and never sent anywhere: ${sum.sessions} sessions, ${sum.totalMinutes} minutes, ${sum.events} events. Copy it into your message to the team.</p>
  ${ask?`<p class="playlogAsk">${QUESTIONS.replace(/\n/g,'<br>')}</p>`:''}
  <textarea id="playlogText" readonly rows="6" aria-label="Playtest log as JSON">${(ask?QUESTIONS+'\n\n':'')+json}</textarea>
  <div class="playlogButtons"><button class="primary" type="button" data-copy>Copy</button><button class="menuButton" type="button" data-download>Download .json</button><button class="menuButton danger" type="button" data-clear>Clear log</button></div>`;
 if(!$('#playlog').open)$('#playlog').showModal();
}
$('#playlogContent').addEventListener('click',async e=>{
 const text=$('#playlogText');
 if(e.target.closest('[data-copy]')){try{await navigator.clipboard.writeText(text.value);$('#playlogContent [data-copy]').textContent='Copied';}catch{text.select();document.execCommand?.('copy');$('#playlogContent [data-copy]').textContent='Selected · copy it';}}
 if(e.target.closest('[data-download]')){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([playlog.toJSON()],{type:'application/json'}));a.download='coast-camp-playtest.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 if(e.target.closest('[data-clear]')&&confirm('Clear the playtest log? Your game is not affected.')){playlog.clear();showPlaylog();}
});
$('#playlogButton').onclick=()=>{$('#menu').close();showPlaylog();};
// At most two things call for attention outside the board at once (Build 41 M3), in this order:
// an affordable upgrade, energy from an ad when low, the daily gift, parts waiting in the book.
function calmBadges(){let n=0;for(const el of [$('#mapReady'),$('#adEnergyButton'),$('#dailyButton'),$('#bookCount')]){if(el.hidden)continue;if(n>=2){el.hidden=true;if(el.id==='bookCount')$('#bookButton').classList.remove('ready');}else n++;}}
render();header();setInterval(()=>{header();if(state.energy<1)renderHint();offerGift();$('#dailyButton').hidden=!giftReady();calmBadges();syncPlaying();},1000);
if(lostSave)$('#message').textContent='Your saved camp could not be read, so a new one started. The old save is kept on this device.';
if(!state.moves)showIntro();
else nextReveal(()=>{if(allDone(state)&&!state.seenEnd)setTimeout(showEnd,600);});
