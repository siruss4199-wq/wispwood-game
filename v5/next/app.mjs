// Coast Camp: the new-loop page (v5/play.html). Same look as Classic V5, one loop:
// generators → merge → crew orders → coins → upgrade the coast's places on the beach screen.
import {allDone,swapsLeft,adSwapsLeft,SHOP,shopLeft,BOOK_COINS,BOOK_CHAINS,bookKeys,bookReady,pageReady,SHED_SLOTS,DAILY,newestGenerator,cog,token,SAVE_KEY,fresh,load,act,tick,nameOf,item,matches,count,orderItems,orderProgress,nextTask,currentArea,areaDone,upgrades,stageOf,builtCount,sourceOpen,SOURCES,chainsOf,CRATES,cargoKeys,reachable,generatorsMerge,MAX_GENERATOR_LEVEL,GLASS_HITS,nextKind,UNLOCK_LEVEL,GENERATOR_ORDER} from './game.mjs';
import {AREAS,STAGES,TASKS} from './areas.mjs';
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
function moment(title,detail='',x=null){sharedMoment(title,detail,null);const el=document.querySelector('.moment');const top=[...document.querySelectorAll('dialog[open]')].pop();if(el&&top)top.append(el);if(!x||!el)return;const icon=document.createElement('span');icon.style.cssText='float:left;width:42px;height:42px;margin-right:10px';icon.innerHTML=draw(x);icon.firstElementChild.style.cssText='width:100%;height:100%';el.prepend(icon);}

// Game sounds go through sfx: silent while an ad plays or when CrazyGames mutes the game
// (Build 41 M7), without touching the player's own sound setting.
let adPlaying=false;
const sfx=(...a)=>{if(!adPlaying&&!platform.muted())sound.play(...a);};
// Shown in the footer so a playtester can tell which build is running.
export const BUILD='Build 41 (in progress) · playtest log';
enablePremium('vibrant');document.body.dataset.art='premium';document.body.dataset.palette='vibrant';
const $=q=>document.querySelector(q),board=$('#board');
const storage={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
// ?new=1 (the playtest page's "start from the beginning" link) starts a new camp.
const startNew=new URLSearchParams(location.search).has('new');
if(startNew)history.replaceState(null,'',location.pathname);
let state=startNew?fresh(Date.now()):load(storage.get(SAVE_KEY)??'',Date.now()),selected=null,focusOrder=null,drag=null,suppressClick=false;
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
const placeIcons=list=>list.map(t=>{const n=stageOf(state,t.id);return `<span class="restoredIcon stage${n} ${t.art?'staged':''}" data-task="${t.id}" data-stage="${n}" style="left:${t.at[0]}%;top:${t.at[1]}%">${placeArt(t,n)}${pips(n)}</span>`;}).join('');
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
 $('#energy').innerHTML=`${state.energy}<span class="energyCap">/${REFILL_CAP}</span>`;
 $('#coins').textContent=state.coins;
 const lv=state.level;$('#levelNum').textContent=lv.level;$('#levelPill').style.setProperty('--p',Math.round(100*lv.xp/xpToNext(lv.level))+'%');$('#levelPill').setAttribute('aria-label',`Level ${lv.level}, ${lv.xp} of ${xpToNext(lv.level)} XP`);
 const ready=upgrades(state).some(u=>u.materials&&state.coins>=u.cost);$('#mapReady').hidden=!ready;
 // The beach and its upgrades live on their own screen (user, 2026-10-22: "ene zaaval boardtai
 // neg delgetsend tsug baimaargui"); the board screen keeps only the BEACH button, whose dot
 // shows when an upgrade is affordable, and the coin count.
 $('#mapButton').setAttribute('aria-label',ready?`Go to the ${area.name}: an upgrade is ready`:`Go to the ${area.name} (${builtCount(state)} of ${total} upgrades)`);
 $('#mapButton span').textContent=area.short??'MAP';
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
  return `<button class="requestCard ${ready?'ready':''} ${place?'storyOrder':''} ${focusOrder===o.id?'active':''}" data-order="${o.id}" aria-label="${place?`Gold order: the materials for ${place.name}. `:''}${who.name} asks for ${o.needs.map(r=>r.count+' '+nameOf(item(r.family,r.tier))).join(', ')}. ${ready?'Ready: tap to deliver.':'In progress.'} Reward ${o.coins} coins"><span class="requestCrew">${place?`<span class="storyBadge" aria-hidden="true">${iconArt(place.icon)}</span>`:portrait(o.who)}<b class="requestLane"><em>${who.name}</em>${who.role}</b></span><span class="requestItems">${p.map(r=>`<span>${draw(item(r.family,r.tier))}<b>${r.have}/${r.count}</b></span>`).join('')}</span><span class="requestReward">+${o.coins} ${COIN}</span><strong>${ready?'✓ DELIVER':'MAKE'}</strong></button>`;
 }).join('')}</div>`;
 renderOrderTools();
}
// A tapped order that is not ready can be changed (build 36): free ones first, then after an ad.
function renderOrderTools(){
 const o=state.orders.find(o=>o.id===focusOrder),bar=$('#orderTools');
 if(!o||orderItems(state,o)){bar.hidden=true;bar.innerHTML='';return;}
 const day=today(),free=swapsLeft(state,day),ads=adSwapsLeft(state,day);
 bar.hidden=false;
 bar.innerHTML=o.story?`<span>The gold order is for the ${currentArea(state).name}'s next stage: it stays.</span>`:`<span>Stuck on ${CREW[o.who].name}'s order?</span>`+(free>0?`<button data-swap>↻ New order <small>${free} free today</small></button>`:ads>0?'<button class="adOffer" data-swap-ad>▶ New order</button>':'<button disabled>No more changes today</button>');
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
  if(x?.type==='source')badge=locked?`<span class="lockedLabel">NEXT AREA</span>`:`<span class="energyCue">ϟ1</span>${producerLevel(x)>1?`<span class="srcLevel">Lv${producerLevel(x)}</span>`:''}`;
  else if(x?.type==='kit')badge=`<span class="pulls">${x.left}</span>`;
  else if(x?.type==='jar')badge=`<span class="sealBadge">+${x.energy}ϟ</span>`;
  else if(x?.type==='cargo'&&(x.find?.type==='source'||x.find?.type==='cog'||x.find?.type==='token'))badge=`<span class="cargoGlow ${x.find.type!=='source'?'cogGlow':''}" aria-hidden="true"></span>`;
  else if(wanted)badge='<span class="useBadge" aria-hidden="true">★</span>';
  const deep=x?.type==='cargo'&&!reachable(state,i),ready=x?.type==='cargo'&&!deep&&state.board.some(y=>matches(y,x.key));
  return `<button class="tile ${x?.type??'empty'} ${x?.cracks?'cracked':''} ${ready?'keyReady':''} ${deep?'deep':''} ${locked?'locked':''} ${selected===i?'selected':''} ${twin?'match':''} ${wanted?'wanted':''} ${focused?'nextAction':''} ${x?.type==='source'&&focusGens.has(x.id)?'orderSource':''}" data-index="${i}" style="grid-row:${r+1};grid-column:${c+1}" ${x?.family||x?.id?`data-family="${x.family??x.id}"`:''} ${x?.type==='cargo'?`data-key="${x.key.family}"`:''} aria-label="${nameOf(x)}${locked?' · locked':''}. Space ${i+1}" aria-pressed="${selected===i}">${draw(deep?{...x,deep:true}:x)}${badge}</button>`;
 }).join('');
 $('#free').textContent=state.board.filter(x=>x===null).length+' spaces';
}
// The shed (build 32): four spaces under the board; drag onto one to store, tap it to take out.
function renderShed(){
 // The shed shows when something is in it or the board is getting full (Build 41 M4); a part can
 // always be stored from its own panel (Shed), which brings the shed out.
 // Build 41d: a new camp has four open spaces, so "getting full" is three or fewer.
 $('#shed').hidden=!(state.shed.some(Boolean)||state.board.filter(y=>y===null).length<=3);
 $('#shed').innerHTML=`<span class="shedLabel">SHED</span>`+state.shed.map((x,k)=>`<button class="shedSlot ${x?'full':''}" data-slot="${k}" aria-label="${x?nameOf(x)+' · tap to put it back on the board':'Empty shed space'}">${x?draw(x):''}</button>`).join('');
}
function renderSelection(){
 const x=state.board[selected];let title='',desc='',buttons='';
 if(!x){$('#selection').innerHTML='';return;}
 title=nameOf(x);
 if(x.type==='item'){
  desc=x.tier<maxTier(x.family)?`Merge with a twin → ${CHAINS[x.family].names[x.tier+1]}.`:'Top of its chain.';
  if(wantedKeys().has(x.family+x.tier))desc='★ A crew order wants this. '+desc;
  // Clearing a part only appears when the board is nearly full (Build 41 M4): it is the way out of
  // a full board, not an everyday energy trick.
  if(state.board.filter(y=>y===null).length<=2)buttons='<button data-action="recycle">Clear space · +1 ϟ</button>';
 }else if(x.type==='source'){
  const chain=CHAINS[GENERATOR_CHAINS[x.id][0][0]];
  const next=nextKind(x.id),waiting=next&&!state.board.some(y=>y?.type==='source'&&y.id===next);
  desc=(waiting?`Level ${UNLOCK_LEVEL} brings out the ${SOURCES[next].name}. `:'')+(sourceOpen(state,x.id)?`Level ${producerLevel(x)} · 1 energy a tap · ${chain.names.slice(0,4).join(' → ')} …`+(producerLevel(x)<MAX_GENERATOR_LEVEL?` Merge it with another level-${producerLevel(x)} ${SOURCES[x.id].name} (drag one onto the other) for level ${producerLevel(x)+1}.`:' Top level.'):'Wakes at the Survey Worksite (next area).');
  if(sourceOpen(state,x.id))buttons=`<button class="accent" data-action="produce">Make · 1 ϟ</button>`;
 }else if(x.type==='kit'){
  desc=`Tap again for a free part (${chainsOf(state,x.family).map(c=>CHAINS[c].names[0]).join(' or ')} chain) · ${x.left} of ${kitCapacity(x)} left.`+(kitFull(x)&&x.size<MAX_KIT_SIZE?` Or merge with a twin into a ${CRATES[x.size]} (${KIT_DROPS[x.size+1].length} better parts).`:'');
  buttons='<button class="accent" data-action="openKit">Take a part</button>';
} else if(x.type==='glass'){const n=CHAINS[x.family].names;title=x.cracks?'Cracked tideglass':'Tideglass';desc=`A ${n[x.tier]} locked in tideglass. It takes no part: a merge in a space beside it that makes a ${n[x.tier]} or better (any chain) cracks it; ${GLASS_HITS} cracks break it and the ${n[x.tier]} is yours.`+(x.cracks?` ${GLASS_HITS-x.cracks} more merge${GLASS_HITS-x.cracks>1?'s':''} beside it.`:'');
 } else if(x.type==='cargo'&&!reachable(state,selected)){title='Sealed cargo';desc='Buried deeper in the cargo. Open the crates around it first, and this one will show the part that opens it.'+(x.find?.type==='source'?' Something glows inside.':['cog','token'].includes(x.find?.type)?' Something gleams inside.':'');
 }else if(x.type==='cargo'){const k=CHAINS[x.key.family].names[x.key.tier],have=state.board.some(y=>matches(y,x.key)),gen=CHAINS[x.key.family].gen;
  title='Sealed cargo';desc=`Opens with a ${k}: lay one on it. What is inside is a surprise`+(x.find?.type==='source'?' — something glows in there.':['cog','token'].includes(x.find?.type)?' — something gleams in there.':'.')+(have?' You have one: drag it onto this cargo.':sourceOpen(state,gen)?` ${SOURCES[gen].name} makes them.`:` Its generator is still sealed somewhere on the board.`);}
 else if(x.type==='jar')desc='Energy, sealed in a jar.';
 else if(x.type==='token')desc='Drag it onto a part: the part becomes one of the same tier that a crew order is waiting for.';
 else if(x.type==='cog')desc=`Drag it onto a generator: +1 level, up to ${MAX_GENERATOR_LEVEL}. Higher levels make better parts.`;
 if(SHED_TYPES_UI.includes(x.type))buttons+='<button data-action="store">Shed</button>';
 $('#selection').innerHTML=`<span class="preview">${draw(x)}</span><span class="copy"><b>${title}</b><small>${desc}</small></span><span class="actionGroup">${buttons}</span>`;
}
const SHED_TYPES_UI=['item','kit','cog','token'];
const has=id=>state.board.some(x=>x?.type==='source'&&x.id===id);
// The one primary action (Build 41 M3, from PR #77's contextual objective): what to do next,
// and tapping it does it or shows where.
let guide=null;
function renderHint(){
 guide=primaryAction(state,focusOrder);let label=guide.label;
 if(guide.kind==='energy'){const t=refillTimes(state,Date.now());label+=' · +1 in '+clock(t?.next??0);}
 const b=$('#hint');b.textContent=label;b.dataset.kind=guide.kind;
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
 if(r.broken?.length){for(const j of r.broken)board.querySelector(`[data-index="${j}"]`)?.classList.add('glassBreak');sfx('rare');}
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
 if(r.event==='unstore'){tile?.classList.add('merge-pop');sfx('tap');}
 if(r.event==='shop'){const o=SHOP[r.id];if(r.energy)rewardFlight(($('#shop').open?$('#shopContent'):$('#adEnergyButton')).getBoundingClientRect(),$('#energyPill').getBoundingClientRect(),`+${r.energy} ϟ`);else moment(o.name+(r.ad?' · thanks for watching':''),r.slot!=null?'In the shed: the board is full.':'On the board next to Rivet Rover.',r.thing);tile?.classList.add('unsealed');sfx('rare');}
 if(r.event==='swapOrder'){const c=$(`[data-order="${r.id}"]`);c?.classList.add('merge-pop');sfx('tap');}
 if(r.event==='book'){sfx('rare');}
 if(r.event==='bookPage'){sfx('milestone');moment('Page complete!',`Every ${GENERATOR_NAMES_UI[r.family]} part found · a Brass cog`+(r.slot!=null?' (in the shed)':''),{type:'cog'});tile?.classList.add('unsealed');}
 if(r.event==='daily'){const g=r.gift;if(g.coins)rewardFlight($('#dailyButton').getBoundingClientRect(),$('#coinPill').getBoundingClientRect(),`+${g.coins} coins`);if(g.energy)rewardFlight($('#dailyButton').getBoundingClientRect(),$('#energyPill').getBoundingClientRect(),`+${g.energy} ϟ`);tile?.classList.add('unsealed');sfx('milestone');moment(`Daily gift · day ${g.day} of ${DAILY.length}`,giftText(DAILY[g.day-1])+(g.slot!=null?' · in the shed (the board is full)':''),g.thing??null);}
 // A generator reaching level 2 brings out the next kind beside it.
 for(const n of r.released??[]){const t=board.querySelector(`[data-index="${n.index}"]`);t?.classList.add('unsealed');burst(t?.getBoundingClientRect(),'gold',true);setTimeout(()=>{newGeneratorMoment(n.id);sfx('milestone');},r.event==='producerUp'?900:0);}
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
  drag.ghost=document.createElement('div');drag.ghost.className='dragGhost';drag.ghost.style.cssText=`width:${r.width}px;height:${r.height}px`;drag.ghost.innerHTML=draw(state.board[drag.from]);document.body.append(drag.ghost);}
 drag.ghost.style.transform=`translate(${e.clientX-drag.ghost.offsetWidth/2}px,${e.clientY-drag.ghost.offsetHeight*.7}px)`;
 const t=document.elementFromPoint(e.clientX,e.clientY)?.closest('#board [data-index], #shed [data-slot]'),i=t?(t.dataset.slot!=null?'s'+t.dataset.slot:+t.dataset.index):null;
 if(i!==drag.over){document.querySelector('#board .target, #shed .target')?.classList.remove('target');drag.over=i;if(t&&i!==drag.from)t.classList.add('target');}
});
document.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;endDrag();if(!d.moved)return;suppressClick=true;const el=document.elementFromPoint(e.clientX,e.clientY),slot=el?.closest('#shed [data-slot]');if(slot){run({type:'store',index:d.from,slot:+slot.dataset.slot});return;}const t=el?.closest('#board [data-index]');if(t&&+t.dataset.index!==d.from){selected=d.from;run({type:'merge',from:d.from,to:+t.dataset.index});}});
document.addEventListener('pointercancel',endDrag);
// iOS Safari can still start a scroll from a button; while dragging, the finger is ours.
board.addEventListener('touchmove',e=>{if(drag?.moved)e.preventDefault();},{passive:false});
$('#selection').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const x=state.board[selected];run({type:b.dataset.action,index:selected,id:x?.id});});
$('#requests').addEventListener('click',e=>{const c=e.target.closest('[data-order]');if(!c)return;const o=state.orders.find(o=>o.id===c.dataset.order);if(!o)return;if(orderItems(state,o)){run({type:'deliver',id:o.id});return;}focusOrder=focusOrder===o.id?null:o.id;render();$('#message').textContent=`${CREW[o.who].name} needs ${o.needs.map(r=>r.count+' × '+nameOf(item(r.family,r.tier))).join(' and ')}. Their parts are marked on the board.`;});
// The upgrading happens on the beach screen (user: "tusdaa orchinruu ochij upgrade hiih").
$('#mapButton').onclick=()=>{mapFocus=null;showMap();};
$('#rationButton').onclick=()=>run({type:'ration'});
$('#shed').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(!b)return;if(state.shed[+b.dataset.slot])run({type:'unstore',slot:+b.dataset.slot});else $('#message').textContent='Drag a part, crate, cog or token here to keep it off the board.';});
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
$('#orderTools').addEventListener('click',e=>{const id=focusOrder;if(e.target.closest('[data-swap]'))run({type:'swapOrder',id,day:today()});else if(e.target.closest('[data-swap-ad]'))watchAd({type:'swapOrder',id,day:today(),ad:true});});
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

// ---------- the beach screen and story ----------
// A full-screen view of the area: the picture with every place at its stage, and the list
// of places with their next stage and its price. Coins are spent here only.
// The area's picture changes with its stages (build 37, user: "bushiin zurgiin uurchlultiig hii"):
// it starts storm-grey, and each place brings its own patch of colour back, wider at every stage
// (REVEAL, in % of the picture's width), with a glow at stage 3, and the storm lifts a little
// with every stage (--p); a finished area is in full colour. The stage just bought spreads its colour out from the old size.
const REVEAL=[0,13,19,26];
let lastStage=null;// {id,stage} of the upgrade being shown, so its patch can grow
function sceneHtml(area){
 const done=areaDone(state,area),vars=area.tasks.map((t,k)=>{const n=stageOf(state,t.id),grow=lastStage?.id===t.id;return `--r${k}:${REVEAL[grow?lastStage.stage-1:n]}`;}).join(';');
 const masks=area.tasks.map((t,k)=>`radial-gradient(ellipse calc(var(--r${k})*1%) calc(var(--r${k})*2%) at ${t.at[0]}% ${t.at[1]}%,#000 40%,transparent 100%)`).join(',');
 return `<div class="beachScene ${done?'complete':''}" data-built="${builtCount(state,area)}" style="--p:${(builtCount(state,area)/(area.tasks.length*STAGES)).toFixed(3)}"><img class="sceneBase" src="assets/premium/${area.picture}-vibrant.webp" alt="${area.name}, ${done?'fully restored':builtCount(state,area)+' of '+area.tasks.length*STAGES+' upgrades'}"><div class="sceneStorm" aria-hidden="true"></div><img class="sceneColor" src="assets/premium/${area.picture}-vibrant.webp" alt="" aria-hidden="true" style="${vars};-webkit-mask-image:${masks};mask-image:${masks}"><div class="restored">${placeIcons(area.tasks.filter(t=>stageOf(state,t.id)>0))}</div></div>`;
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
 if(!u){const k=area.tasks.indexOf(t);return `<section id="mapCard" class="mapCard locked" data-card="${t.id}"><span class="cardArt unbuilt">${placeArt(t,0)}</span><div class="cardBody"><small class="cardPlace">Locked</small><h3>${t.name}</h3><p class="cardDone">Opens when ${area.tasks[k-1]?.name??'the place before it'} has its first stage.</p></div></section>`;}
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
function showMap(){
 const area=currentArea(state),ups=upgrades(state),open=new Map(ups.map(u=>[u.id,u]));
 if(!area.tasks.some(t=>t.id===mapFocus))mapFocus=null;
 mapFocus??=(ups.find(canBuild)??ups.find(u=>u.materials)??ups.find(u=>state.orders.some(o=>o.story===u.id))??ups[0])?.id??area.tasks.at(-1).id;
 const focus=area.tasks.find(t=>t.id===mapFocus),total=area.tasks.length*STAGES,built=builtCount(state);
 const places=area.tasks.map(t=>{
  const n=stageOf(state,t.id),u=open.get(t.id);
  const status=n>=STAGES?'done':u&&canBuild(u)?'ready':u?'next':'locked';
  const badge=status==='done'?'<b class="tileBadge done">✓</b>':status==='ready'?'<b class="tileBadge ready">!</b>':status==='locked'?'<b class="tileBadge locked">🔒</b>':'';
  return `<li class="place ${t.id===mapFocus?'selected':''}" style="--i:${area.tasks.indexOf(t)}" data-status="${status}" data-place="${t.id}"><button type="button" data-select="${t.id}" aria-label="${t.name}: ${status==='done'?'complete':status==='locked'?'locked':status==='ready'?'ready to build':`stage ${n} of ${STAGES}`}"><span class="placeIcon ${t.art&&!n?'unbuilt':''}">${placeArt(t,n)}</span>${pips(n)}${badge}</button></li>`;
 }).join('');
 const markers=area.tasks.filter(t=>open.has(t.id)).map((t,k)=>{const u=open.get(t.id);return `<button type="button" class="siteMarker ${canBuild(u)?'ready':''} ${t.id===mapFocus?'selected':''}" data-select="${t.id}" style="--i:${k};left:${Math.min(88,Math.max(12,t.at[0]))}%;top:${Math.max(24,t.at[1])}%" aria-label="${u.name}"><span>${canBuild(u)?'▲':'🔨'}</span></button>`;}).join('');
 // Finished areas stay listed above the current one, the ones still to come below it.
 const before=AREAS.slice(0,state.area).map(a=>`<section class="mapArea done"><div class="mapHead"><img src="assets/premium/${a.picture}-vibrant.webp" alt=""><div><h2>${a.name}</h2><b>Complete ✓</b></div></div></section>`).join('');
 const later=AREAS.slice(state.area+1).map(a=>`<section class="mapArea coming"><div class="mapHead"><img src="assets/premium/${a.picture}-vibrant.webp" alt=""><div><h2>${a.name}</h2><b>Next update</b></div></div></section>`).join('');
 $('#mapContent').innerHTML=`<div class="beachTop"><h2 id="mapTitle" class="mapTitle">${area.name}</h2><b class="beachCoins">${COIN} ${state.coins}</b></div>
  <div class="sceneWrap">${sceneHtml(area)}<div class="sceneLight" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="siteMarkers">${markers}</div>
  <div class="mapProgress" role="img" aria-label="${built} of ${total} upgrades"><i style="width:${(100*built/total).toFixed(1)}%"></i><b>${built} / ${total}${areaDone(state)?' · complete!':''}</b></div></div>
  ${mapCard(area,focus,open.get(focus.id))}
  <ol class="places">${places}</ol>${before}${later}
  <button class="backToBoard" type="button" data-back>Back to the board</button>`;
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
 const r=e.target.closest('[data-restore]');if(r){const from=r.getBoundingClientRect(),cost=upgrades(state).find(u=>u.id===r.dataset.restore)?.cost;receipt=cost;const res=run({type:'restore',id:r.dataset.restore});if(!res.ok)receipt=null;if(res.ok&&!res.effects.nextArea)lastStage={id:res.task,stage:res.stage};if(res.ok&&stageOf(state,res.task)>=STAGES)mapFocus=null;showMap();if(res.ok&&!res.effects.nextArea)buildFx(res.task,from);return;}
 const sel=e.target.closest('[data-select]');if(sel){mapFocus=sel.dataset.select;sfx('tap');showMap();return;}
 const make=e.target.closest('[data-make]');if(make){$('#coastMap').close();focusOrder=make.dataset.make;render();$('#message').textContent='The gold order is marked: make its parts and deliver it for the materials.';return;}
 const p=e.target.closest('[data-replay]');if(p){showBeat(p.dataset.replay,{},STAGES);return;}
 if(e.target.closest('[data-back],[data-go]'))$('#coastMap').close();
});
function rewardText(e={}){
 const out=[];
 if(e.energy)out.push(`+${e.energy} energy`);
 if(e.copy>=0&&e.copyId)out.push(`a ${SOURCES[e.copyId].name} to merge`);
 if(e.kit>=0&&state.board[e.kit]?.type==='kit')out.push(nameOf(state.board[e.kit]).replace(' · ',' for '));
 if(e.token>=0)out.push('a Tide token');
 if(e.slots)out.push('a fourth order card');
 out.push('+8 XP');
 return 'Rewards: '+out.join(' · ');
}
function showBeat(id,effects,stage=stageOf(state,id)){
 const area=AREAS.find(a=>a.tasks.some(t=>t.id===id)),t=area.tasks.find(t=>t.id===id),st=t.stages[Math.max(0,stage-1)];
 const extra=[];
 const next=AREAS[AREAS.indexOf(area)+1];
 if(effects?.nextArea)extra.push(['bram',`${area.name} is complete! Up the cliff: the ${next.name} is open.`]);
 else if(effects?.areaDone)extra.push(['bram',`${area.name} is complete! ${next?`The ${next.name} opens in the next update.`:''}`]);
 playLines(st.name,st.lines.concat(extra),()=>{if(effects?.nextArea){render();showMap();showIntro();}else if($('#coastMap').open)showMap();const icon=$(`#coastMap .restoredIcon[data-task="${id}"]`)??$(`.restoredIcon[data-task="${id}"]`);icon?.classList.add('upgraded');
  // The stage's rewards, said once the story has been told (build 22: every stage gives one).
  if(effects&&Object.keys(effects).length)moment(`${st.name} · stage ${stage} of ${STAGES}`,rewardText(effects),null);burst(($('#coastMap').open?$('#coastMap .beachScene'):board).getBoundingClientRect(),'gold',true);
  for(const i of [effects?.kit,effects?.copy])if(i>=0)board.querySelector(`[data-index="${i}"]`)?.classList.add('unsealed');
  if(effects?.areaDone&&allDone(state))setTimeout(showEnd,900);});
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
// The end of this prototype (Build 41 M5): once, after the last stage or on the next visit.
function showEnd(){
 if(!allDone(state)||state.seenEnd)return;run({type:'seenEnd'});playlog.flush();
 const gens=new Set(state.board.filter(x=>x?.type==='source').map(x=>x.id)).size,stages=Object.values(state.built).reduce((a,b)=>a+b,0);
 $('#endContent').innerHTML=`<small class="adTag">PROTOTYPE COMPLETE</small><h2 id="endTitle">The coast is restored — for now</h2>
  <p>You rebuilt Landing Beach and the Survey Worksite: <b>${stages} stages</b>, <b>${state.ordersDone} crew orders</b>, <b>${gens} generators</b>.</p>
  <p>Next on the coast: the Vault Entrance. The dial is mapped and the crew is working out the way in; it comes in a later update.</p>
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
if(!state.moves)showIntro();
else if(allDone(state)&&!state.seenEnd)setTimeout(showEnd,600);
