// Coast Camp: the new-loop page (v5/play.html). Same look as Classic V5, one loop:
// generators → merge → crew orders → coins → upgrade the coast's places on the beach screen.
import {SAVE_KEY,fresh,load,act,tick,nameOf,item,matches,count,orderItems,orderProgress,nextTask,currentArea,areaDone,upgrades,stageOf,builtCount,sourceOpen,SOURCES,chainsOf,CRATES,cargoKeys,reachable,generatorsMerge,MAX_GENERATOR_LEVEL,GLASS_HITS,nextKind,UNLOCK_LEVEL,GENERATOR_ORDER,TIDE,tideLocked} from './game.mjs';
import {AREAS,STAGES} from './areas.mjs';
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
export const BUILD='Build 19 · Coast UX 2';
enablePremium('vibrant');document.body.dataset.art='premium';document.body.dataset.palette='vibrant';
const $=q=>document.querySelector(q),board=$('#board');
const storage={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
// ?new=1 (the playtest page's "start from the beginning" link) starts a new camp.
const startNew=new URLSearchParams(location.search).has('new');
if(startNew)history.replaceState(null,'',location.pathname);
let lastRestoration=null;
let state=startNew?fresh(Date.now()):load(storage.get(SAVE_KEY)??'',Date.now()),selected=null,focusOrder=null,drag=null,suppressUntil=0;
const persist=()=>storage.set(SAVE_KEY,JSON.stringify(state));
persist();

const ICONS={rock:{type:'rock'},'crate-salvage':{type:'crate',kind:'salvage'},'crate-survey':{type:'crate',kind:'survey'},'source-chart':{type:'source',id:'chart'},'flux-3':item('flux',3),'chart-1':item('chart',1)};
// A small wave (cells under the tide).
const WAVE='<svg class="wave" viewBox="0 0 24 12" aria-hidden="true"><path d="M1 8Q4 3 7 8T13 8T19 8T23 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
// A gold coin (orders pay coins; coins upgrade the beach).
const COIN='<i class="coinIcon" aria-hidden="true"></i>';
const pips=n=>`<span class="pips" aria-label="stage ${n} of ${STAGES}">${Array.from({length:STAGES},(_,k)=>`<i class="${k<n?'on':''}"></i>`).join('')}</span>`;
const placeIcons=list=>list.map(t=>{const n=stageOf(state,t.id);return `<span class="restoredIcon stage${n}" data-task="${t.id}" data-stage="${n}" style="left:${t.at[0]}%;top:${t.at[1]}%">${iconArt(t.icon)}${pips(n)}</span>`;}).join('');
const iconArt=(k,n=1)=>k==='workshop'?`<img class="art" src="assets/premium/workshop-${n?'operational':'damaged'}.webp" alt="">`:art(ICONS[k]);
// A part a Tide token can turn into one an order wants.
const swappable=x=>state.orders.some(o=>o.needs.some(r=>r.tier===x.tier&&r.family!==x.family&&count(state,r)<r.count));
const wantedKeys=()=>new Set(state.orders.flatMap(o=>o.needs.map(r=>r.family+r.tier)));
// Build 19 gates cargo and glass, not usable objects retained by older saves.
const underTide=i=>['cargo','glass'].includes(state.board[i]?.type)&&tideLocked(state,i);
function tideProgress(){
 const gates=Object.keys(TIDE).map(Number).filter(underTide);
 if(!gates.length)return 'The tide has cleared your shore.';
 const remaining=Math.min(...gates.map(i=>TIDE[i]-builtCount(state)));
 return `Tide recedes in ${remaining} more beach upgrade${remaining===1?'':'s'} · wave numbers count upgrades`;
}

// ---------- rendering ----------
function render(){
 const active=document.activeElement,focusSelector=active?.dataset.index!==undefined?`[data-index="${active.dataset.index}"]`:active?.dataset.order?`[data-order="${active.dataset.order}"]`:active?.dataset.action?`[data-action="${active.dataset.action}"]`:null;
 const area=currentArea(state),total=area.tasks.length*STAGES;
 $('#areaBrand').textContent=area.name.toUpperCase();
 $('#energy').innerHTML=`${state.energy}<span class="energyCap">/${REFILL_CAP}</span>`;
 $('#coins').textContent=state.coins;
 const lv=state.level;$('#levelNum').textContent=lv.level;$('#levelPill').style.setProperty('--p',Math.round(100*lv.xp/xpToNext(lv.level))+'%');$('#levelPill').setAttribute('aria-label',`Level ${lv.level}, ${lv.xp} of ${xpToNext(lv.level)} XP`);
 const ready=upgrades(state).some(u=>state.coins>=u.cost);$('#mapReady').hidden=!ready;
 // The beach and its upgrades live on their own screen (user, 2026-10-22: "ene zaaval boardtai
 // neg delgetsend tsug baimaargui"); the board screen keeps only the BEACH button, whose dot
 // shows when an upgrade is affordable, and the coin count.
 $('#mapButton').setAttribute('aria-label',ready?'Go to the beach: an upgrade is ready':`Go to the beach (${builtCount(state)} of ${total} upgrades)`);
 renderOrders();renderBoard();renderSelection();renderHint();
 $('#coinPill').setAttribute('aria-label',`${state.coins} coins · spend on beach upgrades`);
 $('#mapButton').classList.toggle('upgradeReady',ready);
 $('#rationButton').hidden=state.energy>3;
 const wait=rationWait(state,Date.now());$('#rationButton').textContent=wait>0?`Field ration in ${clock(wait)}`:'Field ration · +8 ϟ';$('#rationButton').disabled=wait>0;
 $('#soundButton').textContent=sound.enabled()?'Sound on':'Sound off';
 if(focusSelector)$(focusSelector)?.focus({preventScroll:true});
}
// Presentation guidance is derived from the engine; it never issues an action.
function leadOrder(){return state.orders.find(o=>orderItems(state,o))??state.orders.find(o=>o.id===focusOrder)??state.orders[0];}
function orderSource(o){return o?.needs.find(r=>count(state,r)<r.count)?.family??o?.needs[0]?.family;}
function renderOrders(){
 const lead=leadOrder(),oldScroll=$('#requests').dataset.lead===lead?.id?($('.requestShelf')?.scrollLeft??0):0;$('#requests').dataset.lead=lead?.id??'';
 $('#requests').innerHTML=`<div class="requestHeading"><span>THE CREW <small>Orders earn coins for your beach</small></span><span class="orderCount">${state.orders.length} requests · swipe ›</span></div><div class="requestShelf">${[...state.orders].sort((a,b)=>Number(b.id===lead?.id)-Number(a.id===lead?.id)).map(o=>{
  const p=orderProgress(state,o),ready=!!orderItems(state,o),who=CREW[o.who],gen=CHAINS[orderSource(o)]?.gen;
  return `<button class="requestCard ${ready?'ready':''} ${focusOrder===o.id?'active':''} ${o.id===lead?.id?'leadOrder':''}" data-order="${o.id}" aria-label="${who.name} asks for ${o.needs.map(r=>r.count+' '+nameOf(item(r.family,r.tier))).join(', ')}. ${ready?'Ready: tap to deliver.':`Find parts from ${SOURCES[gen]?.name}.`} Reward ${o.coins} coins"><span class="requestCrew">${portrait(o.who)}<b class="requestLane"><em>${who.name}</em><small>${ready?'Ready for you!':'Can you make this?'}</small></b></span><span class="requestItems">${p.map(r=>`<span title="${nameOf(item(r.family,r.tier))}">${draw(item(r.family,r.tier))}<b class="${r.have>=r.count?'complete':''}">${Math.min(r.have,r.count)}/${r.count}</b></span>`).join('')}</span><span class="requestReward">+${o.coins} ${COIN}</span><strong>${ready?'Deliver ✓':'Find parts'}</strong></button>`;
 }).join('')}</div>`;
 $('.requestShelf').scrollLeft=oldScroll;
}
function renderBoard(){
 const sel=state.board[selected],want=wantedKeys(),focus=state.orders.find(o=>o.id===focusOrder);
 const focusKeys=new Set(focus?.needs.map(r=>r.family+r.tier)??[]);
 const gen=focus&&!orderItems(state,focus)?CHAINS[orderSource(focus)]?.gen:null;
 board.innerHTML=state.board.map((x,i)=>{
  const [r,c]=cellPos(i),locked=x?.type==='source'&&!sourceOpen(state,x.id);
  const twin=sel&&i!==selected&&(sel.type==='item'&&(x?.type==='item'&&matches(x,sel)&&sel.tier<maxTier(sel.family)||x?.type==='cargo'&&reachable(state,i)&&matches(sel,x.key))||sel.type==='kit'&&kitsMerge(sel,x)||generatorsMerge(sel,x)||sel.type==='cog'&&x?.type==='source'&&producerLevel(x)<MAX_GENERATOR_LEVEL||sel.type==='token'&&x?.type==='item'&&swappable(x)||sel.type==='cargo'&&reachable(state,selected)&&matches(x,sel.key));
  const wanted=x?.type==='item'&&want.has(x.family+x.tier),focused=x?.type==='item'&&focusKeys.has(x.family+x.tier);
  let badge='';
  if(x?.type==='source')badge=locked?`<span class="lockedLabel">NEXT AREA</span>`:`<span class="energyCue">ϟ1</span>${producerLevel(x)>1?`<span class="srcLevel">Lv${producerLevel(x)}</span>`:''}`;
  else if(x?.type==='kit')badge=`<span class="pulls">${x.left}</span>`;
  else if(x?.type==='jar')badge=`<span class="sealBadge">+${x.energy}ϟ</span>`;
  else if(x?.type==='cargo'&&(x.find?.type==='source'||x.find?.type==='cog'||x.find?.type==='token'))badge=`<span class="cargoGlow ${x.find.type!=='source'?'cogGlow':''}" aria-hidden="true"></span>`;
  else if(wanted)badge='<span class="useBadge" aria-hidden="true">★</span>';
  // The tide covers the outer ring until the beach has enough upgrades.
  const tide=underTide(i);if(tide)badge=`<span class="tideBadge" aria-hidden="true">${WAVE}${TIDE[i]-builtCount(state)}</span>`;
  const deep=x?.type==='cargo'&&!reachable(state,i),ready=x?.type==='cargo'&&!deep&&state.board.some(y=>matches(y,x.key));
  return `<button class="tile ${x?.type??'empty'} ${x?.cracks?'cracked':''} ${ready?'keyReady':''} ${deep?'deep':''} ${tide?'tide':''} ${locked?'locked':''} ${selected===i?'selected':''} ${twin?'match':''} ${wanted?'wanted':''} ${focused?'nextAction':''} ${x?.type==='source'&&x.id===gen&&!locked?'orderSource':''}" data-index="${i}" style="grid-row:${r+1};grid-column:${c+1}" ${x?.family||x?.id?`data-family="${x.family??x.id}"`:''} aria-label="${nameOf(x)}${locked?' · locked':''}${twin?' · matching target':''}${tide?` · under the tide for ${TIDE[i]-builtCount(state)} more beach upgrades`:''}. Space ${i+1}" aria-pressed="${selected===i}">${draw(deep?{...x,deep:true}:x)}${badge}</button>`;
 }).join('');
 $('#free').textContent=state.board.filter(x=>x===null).length+' spaces';
}
function renderSelection(){
 const x=state.board[selected];let title='',desc='',buttons='';
 if(!x){const o=leadOrder(),gen=CHAINS[orderSource(o)]?.gen;$('#selection').innerHTML=`<span class="idleTip">${o&&orderItems(state,o)?'✓ Your crew has a delivery waiting above.':'Tap a part, then its glowing twin to merge.'}<small>${focusOrder&&o?o.needs.map(r=>`${r.count} × ${nameOf(item(r.family,r.tier))}`).join(' + ')+' · ':''}${gen?`${SOURCES[gen].name} makes these parts.`:'Crew orders earn coins. Coins restore the beach.'}</small></span>`;return;}
 title=nameOf(x);
 if(x.type==='item'){
  desc=x.tier<maxTier(x.family)?`Merge with a twin → ${CHAINS[x.family].names[x.tier+1]}.`:'Top of its chain.';
  if(wantedKeys().has(x.family+x.tier))desc='★ A crew order wants this. '+desc;
  buttons='<button data-action="recycle">Recycle · +1 ϟ</button>';
 }else if(x.type==='source'){
  const chain=CHAINS[GENERATOR_CHAINS[x.id][0][0]];
  const next=nextKind(x.id),waiting=next&&!state.board.some(y=>y?.type==='source'&&y.id===next);
  desc=(waiting?`Level ${UNLOCK_LEVEL} brings out the ${SOURCES[next].name}. `:'')+(sourceOpen(state,x.id)?`Level ${producerLevel(x)} · 1 energy a tap · ${chain.names.slice(0,4).join(' → ')} …`+(producerLevel(x)<MAX_GENERATOR_LEVEL?` Merge it with another level-${producerLevel(x)} ${SOURCES[x.id].name} (drag one onto the other) for level ${producerLevel(x)+1}.`:' Top level.'):'Wakes at the Survey Worksite (next area).');
  if(producerLevel(x)<MAX_GENERATOR_LEVEL)desc+=' Beach upgrades give generator copies; level chests give parts and energy.';
  if(sourceOpen(state,x.id))buttons=`<button class="accent" data-action="produce" ${state.energy<1||!state.board.includes(null)?'disabled':''}>${state.energy<1?'No energy':!state.board.includes(null)?'Board full':'Make · 1 ϟ'}</button>`;
 }else if(x.type==='kit'){
  desc=`Tap again for a free part (${chainsOf(state,x.family).map(c=>CHAINS[c].names[0]).join(' or ')} chain) · ${x.left} of ${kitCapacity(x)} left.`+(kitFull(x)&&x.size<MAX_KIT_SIZE?` Or merge with a twin into a ${CRATES[x.size]} (${KIT_DROPS[x.size+1].length} better parts).`:'');
  buttons=`<button class="accent" data-action="openKit" ${x.left===1||state.board.includes(null)?'':'disabled'}>${x.left===1||state.board.includes(null)?'Take a part':'Board full'}</button>`;
} else if(x.type==='glass'){const n=CHAINS[x.family].names;title=x.cracks?'Cracked tideglass':'Tideglass';desc=`A ${n[x.tier]} locked in tideglass. It takes no part: a merge in a space beside it that makes a ${n[x.tier]} or better (any chain) cracks it; ${GLASS_HITS} cracks break it and the ${n[x.tier]} is yours.`+(x.cracks?` ${GLASS_HITS-x.cracks} more merge${GLASS_HITS-x.cracks>1?'s':''} beside it.`:'');
 } else if(x.type==='cargo'&&!reachable(state,selected)){title='Sealed cargo';desc='Buried deeper in the cargo. Open the crates around it first, and this one will show the part that opens it.'+(x.find?.type==='source'?' Something glows inside.':['cog','token'].includes(x.find?.type)?' Something gleams inside.':'');
 }else if(x.type==='cargo'){const k=CHAINS[x.key.family].names[x.key.tier],have=state.board.some(y=>matches(y,x.key)),gen=CHAINS[x.key.family].gen;
  title='Sealed cargo';desc=`Opens with a ${k}: lay one on it. What is inside is a surprise`+(x.find?.type==='source'?' — something glows in there.':['cog','token'].includes(x.find?.type)?' — something gleams in there.':'.')+(have?' You have one: tap it, then this cargo.':sourceOpen(state,gen)?` ${SOURCES[gen].name} makes them.`:` Level up the earlier generators to unlock this one. Beach upgrades give generator copies.`);}
 else if(x.type==='jar')desc='Energy, sealed in a jar.';
 else if(x.type==='token')desc='Lay it on a part (tap the token, then the part, or drag): the part becomes one of the same tier that a crew order is waiting for.';
 else if(x.type==='cog')desc=`Lay it on a generator (tap the cog, then the generator, or drag): +1 level, up to ${MAX_GENERATOR_LEVEL}. Higher levels make better parts.`;
 if(underTide(selected)){const n=TIDE[selected]-builtCount(state);title='Under the tide';desc=`${n} more beach upgrade${n>1?'s':''} uncover this ${x.type==='glass'?'tideglass':'cargo'}. Earn coins from crew orders, then spend them on the beach.`;buttons='<button class="accent" data-action="beach">See beach</button>';}
 $('#selection').innerHTML=`<span class="preview">${draw(x)}</span><span class="copy"><b>${title}</b><small>${x.type==='glass'&&!underTide(selected)?`Merge beside it to make tier ${x.tier+1}+ · ${GLASS_HITS-(x.cracks??0)} cracks left.`:x.type==='source'?(sourceOpen(state,x.id)?`Tap to make parts · 1 energy · Level ${producerLevel(x)}`:'Locked · opens at the Survey Worksite'):desc.length>125?desc.split('. ')[0]+'.':desc}</small>${desc.length>125?`<details><summary>More about this</summary><p>${desc}</p></details>`:''}</span><span class="actionGroup">${buttons}</span>`;
}
const has=id=>state.board.some(x=>x?.type==='source'&&x.id===id);
function renderHint(){
 const ready=state.orders.find(o=>orderItems(state,o)),task=upgrades(state).find(u=>state.coins>=u.cost),o=leadOrder();
 let hint,action='';
 board.querySelectorAll('.openingPair').forEach(t=>t.classList.remove('openingPair'));
 if(ready){hint=`Deliver to ${CREW[ready.who].name} · +${ready.coins} coins`;action='order';}
 else if(task){hint=`Restore the beach · ${task.cost} coins`;action='beach';}
 else{
  const need=o?.needs.find(r=>count(state,r)<r.count),family=need?.family,pair=state.board.flatMap((x,i)=>x?.type==='item'&&x.tier<maxTier(x.family)&&(!need||x.family===family&&x.tier<need.tier)&&state.board.some((y,j)=>j!==i&&matches(y,x))?[i]:[]);
  if(pair.length){const first=pair[0],x=state.board[first],second=pair.find(i=>i!==first&&matches(state.board[i],x));hint=`Merge two ${nameOf(x)}s`;for(const i of [first,second])board.querySelector(`[data-index="${i}"]`)?.classList.add('openingPair');}
  else if(!state.board.includes(null))hint='Board full · merge twins or recycle a spare';
  else if(state.energy<1)hint='Energy recovering · check your field ration below';
  else{const gen=CHAINS[family]?.gen;hint=gen&&sourceOpen(state,gen)?`Tap ${SOURCES[gen].name} for parts`:'Choose a crew request to find its parts';if(gen&&sourceOpen(state,gen)){action='source';$('#hint').dataset.source=gen;}}
 }
 $('#hint').textContent=hint;$('#hint').dataset.action=action;$('#hint').disabled=!action;
 $('#hint').setAttribute('aria-label',hint);
}
$('#hint').onclick=()=>{const action=$('#hint').dataset.action;if(action==='beach'){showMap();return;}if(action==='order'){const o=leadOrder();focusOrder=o.id;render();$('.requestShelf').scrollLeft=0;$(`[data-order="${o.id}"]`).focus();return;}if(action==='source'){selected=state.board.findIndex(x=>x?.type==='source'&&x.id===$('#hint').dataset.source);focusOrder=leadOrder()?.id;render();}};
function header(){
 if(tick(state,Date.now())){persist();render();}
 const t=refillTimes(state,Date.now());$('#energyTimer').textContent=t?'+1 '+clock(t.next):'FULL';
 $('#energy').innerHTML=`${state.energy}<span class="energyCap">/${REFILL_CAP}</span>`;
}

// ---------- actions ----------
function run(a){
 const before={coins:state.coins,energy:state.energy},fromRect=a.type==='produce'?board.querySelector(`[data-index="${a.index??state.board.findIndex(x=>x?.type==='source'&&x.id===a.id)}"]`)?.getBoundingClientRect():a.type==='openKit'?board.querySelector(`[data-index="${a.index}"]`)?.getBoundingClientRect():null;
 const orderRect=a.type==='deliver'?$(`[data-order="${a.id}"]`)?.getBoundingClientRect():null;
 const reachBefore=new Set(cargoKeys(state).map(k=>k.index)),tideBefore=state.board.flatMap((x,i)=>underTide(i)?[i]:[]),r=act(state,a,Date.now());
 if(!r.ok){$('#message').textContent=r.message;sound.play('tap');return r;}
 $('#message').textContent=r.message;
 if(r.event==='merge'||r.event==='move'||r.event==='producerUp'||r.event==='unseal')selected=r.event==='producerUp'||r.event==='unseal'?null:r.index;
 if(r.event==='deliver'){focusOrder=null;selected=null;}
 persist();render();
 if(r.event==='produce'||r.event==='kit')sound.play('tap');
 const tile=r.index!=null?board.querySelector(`[data-index="${r.index}"]`):null;
 for(const j of r.cracked??[])board.querySelector(`[data-index="${j}"]`)?.classList.add('glassCrack');
 if(r.broken?.length){for(const j of r.broken)board.querySelector(`[data-index="${j}"]`)?.classList.add('glassBreak');sound.play('rare');}
 if(r.event==='swap'){tile?.classList.add('merge-pop');burst(tile?.getBoundingClientRect(),'gold');sound.play('rare');}
 if(r.event==='merge'){tile?.classList.add('merge-pop');burst(tile?.getBoundingClientRect(),state.board[r.index]?.family);sound.play('merge',state.board[r.index]?.tier??0);for(const d of r.dug??[])board.querySelector(`[data-index="${d.index}"]`)?.classList.add('unlocked');}
 if(r.event==='produce'||r.event==='kit')tile?.classList.add('outputPop');
 if((r.event==='produce'||r.event==='kit')&&fromRect&&tile&&!reduced()){const to=tile.getBoundingClientRect(),el=document.createElement('div');el.className='flight';el.innerHTML=draw(state.board[r.index]);el.style.cssText=`left:${fromRect.x}px;top:${fromRect.y}px;--dx:${to.x-fromRect.x}px;--dy:${to.y-fromRect.y}px`;document.body.append(el);setTimeout(()=>el.remove(),460);}
 if(r.event==='deliver'){moment('Delivered · +'+r.coins+' coins',upgrades(state).some(u=>state.coins>=u.cost)?'A beach upgrade is ready.':'Keep helping the crew to restore your beach.');rewardFlight(orderRect,$('#coinPill').getBoundingClientRect(),`+${r.coins} coins`);sound.play('contract');$('#coinPill').classList.remove('bump');void $('#coinPill').offsetWidth;$('#coinPill').classList.add('bump');}
 if(r.event==='producerUp'){const src=state.board[r.index];moment(SOURCES[src.id].name+' · level '+src.level,src.level>=MAX_GENERATOR_LEVEL?'Top level: its parts come out better every time.':'Its parts come out better more often.',src);sound.play('milestone');}
 if(r.event==='restore'){lastRestoration={id:r.task,spent:before.coins-state.coins,stage:stageOf(state,r.task),uncovered:tideBefore.filter(i=>!underTide(i))};showBeat(r.task,r.effects);}
 // A generator reaching level 3 brings out the next kind beside it.
 for(const n of r.released??[]){const t=board.querySelector(`[data-index="${n.index}"]`);t?.classList.add('unsealed');burst(t?.getBoundingClientRect(),'gold',true);setTimeout(()=>{newGeneratorMoment(n.id);sound.play('milestone');},r.event==='producerUp'?900:0);}
 if(r.event==='unseal'){tile?.classList.add('unsealed');burst(tile?.getBoundingClientRect(),'gold',r.opened.type==='source');sound.play(r.opened.type==='source'?'milestone':'rare');
  if(r.opened.type==='coins')rewardFlight(tile?.getBoundingClientRect(),$('#coinPill').getBoundingClientRect(),`+${r.opened.coins} coins`);
  if(r.opened.type==='jar')rewardFlight(tile?.getBoundingClientRect(),$('#energyPill').getBoundingClientRect(),`+${r.opened.energy} ϟ`);
  if(r.opened.type==='token')moment('A Tide token!','Lay it on a part: it turns into a part of the same tier that a crew order wants.',{type:'token'});
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
 if(underTide(i)||x?.type==='glass'){selected=i;render();return;}
 // A generator: tapping it makes a part; tapping a second identical one right after merges them.
 if(x?.type==='source'){const from=selected;selected=i;if(from!==i&&(generatorsMerge(prev,x)||prev?.type==='cog')){run({type:'merge',from,to:i});return;}if(sourceOpen(state,x.id)){const result=run({type:'produce',id:x.id,index:i});if(!result.ok)render();}else render();return;}
 if(selected!==null&&selected!==i&&prev){
  if(prev.type==='item'&&(x?.type==='item'&&matches(x,prev)||x?.type==='cargo'&&matches(prev,x.key))||prev.type==='kit'&&kitsMerge(prev,x)||prev.type==='cog'&&x?.type==='source'||prev.type==='token'&&x?.type==='item'||['item','kit','source','cog','token'].includes(prev.type)&&!x){run({type:'merge',from:selected,to:i});return;}
 }
 if(prev?.type==='cargo'&&reachable(state,selected)&&matches(x,prev.key)){run({type:'unseal',from:i,index:selected});return;}
 if(x?.type==='kit'&&selected===i){run({type:'openKit',index:i});return;}
 selected=selected===i&&x?.type==='item'?null:x?i:null;render();
}
board.addEventListener('click',e=>{const t=e.target.closest('[data-index]');if(t&&performance.now()>suppressUntil)clickTile(+t.dataset.index);});
board.addEventListener('pointerdown',e=>{const t=e.target.closest('[data-index]');if(!t||e.button!==0)return;const i=+t.dataset.index;if(!['item','kit','source','cog','token'].includes(state.board[i]?.type))return;drag={from:i,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};});
function clearDrag(){document.querySelector('.dragGhost')?.remove();board.querySelectorAll('.dragging,.dragTarget').forEach(x=>x.classList.remove('dragging','dragTarget'));}
board.addEventListener('pointermove',e=>{
 if(!drag||drag.id!==e.pointerId)return;
 if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8&&!drag.moved){
  drag.moved=true;selected=drag.from;renderBoard();board.setPointerCapture(e.pointerId);
  board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('dragging');
  const ghost=document.createElement('div');ghost.className='dragGhost';ghost.innerHTML=draw(state.board[drag.from]);document.body.append(ghost);
 }
 if(!drag.moved)return;
 const ghost=document.querySelector('.dragGhost');ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
 board.querySelectorAll('.dragTarget').forEach(x=>x.classList.remove('dragTarget'));
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('#board .tile');
 if(target&&(target.classList.contains('match')||target.classList.contains('empty')))target.classList.add('dragTarget');
});
board.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;clearDrag();if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);if(!d.moved)return;suppressUntil=performance.now()+300;const t=document.elementFromPoint(e.clientX,e.clientY)?.closest('#board [data-index]');if(t&&+t.dataset.index!==d.from){const i=+t.dataset.index;if(underTide(i)||state.board[i]?.type==='glass'){selected=i;render();return;}selected=d.from;run({type:'merge',from:d.from,to:i});}else render();});
board.addEventListener('pointercancel',()=>{drag=null;clearDrag();render();});
$('#selection').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='beach'){showMap();return;}const x=state.board[selected];run({type:b.dataset.action,index:selected,id:x?.id});});
$('#requests').addEventListener('click',e=>{const c=e.target.closest('[data-order]');if(!c)return;const o=state.orders.find(o=>o.id===c.dataset.order);if(!o)return;if(orderItems(state,o)){run({type:'deliver',id:o.id});return;}focusOrder=focusOrder===o.id?null:o.id;render();const gen=CHAINS[orderSource(o)]?.gen;$('#message').textContent=`${o.needs.map(r=>r.count+' × '+nameOf(item(r.family,r.tier))).join(' + ')} · ${focusOrder===o.id?(sourceOpen(state,gen)?`${SOURCES[gen].name} is outlined on the board.`:`${SOURCES[gen]?.name??'Its generator'} is not available yet.`):'Request focus cleared.'}`;});
// The upgrading happens on the beach screen (user: "tusdaa orchinruu ochij upgrade hiih").
$('#mapButton').onclick=showMap;
$('#rationButton').onclick=()=>run({type:'ration'});
$('#soundButton').onclick=()=>{sound.toggle();render();};
$('#helpButton').onclick=()=>$('#help').showModal();
$('#menuButton').onclick=()=>{$('#classicNote').textContent=storage.get('vaultwake-v5')?'Your Classic save is kept and continues where you left it.':'';$('#menu').showModal();};
$('#newGame').onclick=()=>{if(!confirm('Start the Coast Camp from the beginning? Your Classic save is not affected.'))return;state=fresh(Date.now());selected=null;focusOrder=null;lastRestoration=null;persist();$('#menu').close();render();showIntro();};
for(const d of document.querySelectorAll('dialog'))d.querySelector('.close')?.addEventListener('click',()=>d.close());

// ---------- the beach screen and story ----------
// A full-screen view of the area: the picture with every place at its stage, and the list
// of places with their next stage and its price. Coins are spent here only.
function beachScenery(){
 const path=stageOf(state,'beach-path'),tent=stageOf(state,'beach-tent'),mast=stageOf(state,'beach-mast'),pier=stageOf(state,'beach-pier');
 return `<svg class="beachScenery" viewBox="0 0 600 330" preserveAspectRatio="none" aria-hidden="true">
 ${path?`<path d="M65 300Q150 290 190 277T294 260" fill="none" stroke="${path>1?'#c18f56':'#fff0c5'}" stroke-width="${path>1?20:13}" stroke-linecap="round"/>${path>1?'<path d="M65 300Q150 290 190 277T294 260" fill="none" stroke="#ffe3a5" stroke-width="17" stroke-dasharray="3 7"/>':''}${path===3?'<g fill="#ffe083" stroke="#98602a" stroke-width="2"><circle cx="90" cy="287" r="5"/><circle cx="155" cy="274" r="5"/><circle cx="220" cy="258" r="5"/></g>':''}`:''}
 ${tent?`<g transform="translate(190 212)"><path d="M-34 20L0 -25L42 20Z" fill="#f67b5e" stroke="#ae514b" stroke-width="3"/><path d="M0 -25L6 20H42Z" fill="#d6504e"/><path d="M-8 20L1 0L14 20Z" fill="#244e60"/>${tent>=2?'<path d="M35 6V-15H44V15" fill="#5b7080"/>':''}${tent===3?'<path d="M-30 20V38H37V20" fill="#edc580"/>':''}</g>`:''}
 ${mast?`<g stroke="#536a72" stroke-width="4"><path d="M312 192V130"/>${mast>=2?'<path d="M312 133L345 143L312 153Z" fill="#ffbf4f" stroke="#db9a35"/>':''}${mast===3?'<path d="M299 145H325V156H299Z" fill="#ce9863"/>':''}</g>`:''}
 ${pier?`<g transform="translate(457 256)"><path d="M-30 0L42 25M-25 -14L47 11" stroke="#694e38" stroke-width="5"/><path d="M-28 -7L44 18" stroke="#e8b978" stroke-width="18"/><path d="M-28 -7L44 18" stroke="#b07d4f" stroke-width="18" stroke-dasharray="2 8"/>${pier>=2?'<path d="M14 8V-46L42 -46M38 -46V-12" fill="none" stroke="#536e7b" stroke-width="5"/>':''}${pier===3?'<path d="M8 35Q36 61 64 35Z" fill="#ff8869" stroke="#f8e8be" stroke-width="3"/>':''}</g>`:''}
 </svg>`;
}
function showMap(){
 const area=currentArea(state),open=new Map(upgrades(state).map(u=>[u.id,u]));
 const places=area.tasks.map(t=>{
  const n=stageOf(state,t.id),u=open.get(t.id),afford=u&&state.coins>=u.cost;
  const status=n>=STAGES?'done':afford?'ready':u?'next':'locked';
  const now=n?t.stages[n-1].name:t.name;
  const next=n>=STAGES?'Fully restored':!u?'Restore the previous location first':afford?`Ready · ${u.name}`:`${u.cost-state.coins} more coins · ${u.name}`;
  return `<li class="place" data-status="${status}" data-place="${t.id}"><span class="placeIcon stage${n}">${iconArt(t.icon,n)}</span><span><strong>${now}</strong>${pips(n)}<small>${next}</small></span>${n>=STAGES?`<button data-replay="${t.id}" aria-label="Replay ${t.name}">✓</button>`:u?`<button data-restore="${t.id}" ${afford?'':'disabled'}>${afford?'Upgrade':'Save'}<span>${COIN} ${u.cost}</span></button>`:'<button disabled aria-label="Locked">🔒</button>'}</li>`;
 }).join('');
 const later=AREAS.slice(state.area+1).map(a=>`<section class="mapArea coming"><div class="mapHead"><img src="assets/premium/${a.picture}-vibrant.webp" alt=""><div><h2>${a.name}</h2><b>Next update</b></div></div></section>`).join('');
 $('#mapContent').innerHTML=`<div class="beachTop"><h2 id="mapTitle" class="mapTitle">${area.name}</h2><b class="beachCoins">${COIN} ${state.coins}</b></div>
  ${lastRestoration?`<div class="restorationReceipt" role="status"><b>✓ ${area.tasks.find(t=>t.id===lastRestoration.id)?.stages[lastRestoration.stage-1]?.name??'Beach upgraded'}</b><span>−${lastRestoration.spent} coins · stage ${lastRestoration.stage} of ${STAGES}</span>${lastRestoration.uncovered?.length?`<span>Tide receded · ${lastRestoration.uncovered.length} shore spaces uncovered</span>`:''}</div>`:''}
  <div class="beachScene" style="--restored:${builtCount(state)/(area.tasks.length*STAGES)}"><img src="assets/premium/${area.picture}-vibrant.webp" alt="${area.name}">${beachScenery()}<div class="restored">${placeIcons(area.tasks.filter(t=>stageOf(state,t.id)>0))}</div></div>
  <div class="beachProgress"><p class="beachCount">${builtCount(state)} / ${area.tasks.length*STAGES} coastal improvements${areaDone(state)?' · complete!':''}</p><progress aria-label="Beach restoration" value="${builtCount(state)}" max="${area.tasks.length*STAGES}"></progress><p class="tideProgress">${tideProgress()}</p></div>
  <ol class="places">${places}</ol>${later}
  <button class="primary backToBoard" type="button" data-back>${state.orders.some(o=>orderItems(state,o))?'Back to the crew · delivery ready':'Back to the board · earn coins'}</button>`;
 if(!$('#coastMap').open)$('#coastMap').showModal();
}
$('#mapContent').addEventListener('click',e=>{
 const r=e.target.closest('[data-restore]');if(r){const res=run({type:'restore',id:r.dataset.restore});if(res.ok)showMap();return;}
 const p=e.target.closest('[data-replay]');if(p){showBeat(p.dataset.replay,{},STAGES,true);return;}
 if(e.target.closest('[data-back]'))$('#coastMap').close();
});
function showBeat(id,effects,stage=stageOf(state,id),replay=false){
 const area=AREAS.find(a=>a.tasks.some(t=>t.id===id)),t=area.tasks.find(t=>t.id===id),st=t.stages[Math.max(0,stage-1)];
 const extra=[];
 if(effects?.areaDone)extra.push(['bram',`${area.name} is complete! The Survey Worksite opens in the next update.`]);
 playLines(st.name,st.lines.concat(extra),()=>{if($('#coastMap').open)showMap();const icon=$(`#coastMap .restoredIcon[data-task="${id}"]`)??$(`.restoredIcon[data-task="${id}"]`);icon?.classList.add('pop');burst(($('#coastMap').open?$('#coastMap .beachScene'):board).getBoundingClientRect(),'gold',true);
  for(const i of [effects?.kit,effects?.copy])if(i>=0)board.querySelector(`[data-index="${i}"]`)?.classList.add('unsealed');},replay?null:lastRestoration);
 sound.play('milestone');
}
function playLines(title,lines,done,receipt=null){
 let n=0;const dlg=$('#beat');
 const show=()=>{const [who,line]=lines[n];$('#beatContent').innerHTML=`<div class="beat"><small>${title}</small>${receipt?`<div class="beatReceipt">✓ Stage ${receipt.stage} restored <b>−${receipt.spent} coins</b>${receipt.uncovered?.length?`<b>Tide receded · ${receipt.uncovered.length} shore spaces uncovered</b>`:''}</div>`:''}<div class="beatLine">${portrait(who)}<p><b>${CREW[who].name}</b>${line}</p></div><div class="beatDots">${lines.map((_,k)=>`<i class="${k===n?'on':''}"></i>`).join('')}</div><button class="primary" id="beatNext">${n<lines.length-1?'Next':'Continue'}</button></div>`;
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
