import {containerInfo,contents} from './containers.mjs';
import {SAVE_KEY,FAMILIES,SOURCES,STAGES,fresh,load,act,goal,count,ready,matches,nameOf,normalContract,opportunity,nextOutput,burstOutput,item,near} from './core.mjs';
import {art,scene,portrait} from './art.mjs';
import {feedback,sound,reduced} from './feedback.mjs';
import {platform} from '../v4/platform.mjs';
import {siteSurface,SITE_NAMES,deliveryItems,continuation} from './presentation.mjs';
import {deliverFeedback} from './feedback.mjs';
const $=s=>document.querySelector(s);
let state;try{state=load(localStorage.getItem(SAVE_KEY));}catch{state=fresh();}
let selected=null,focus='goal',drag=null,suppressUntil=0;
const board=$('#board'),message=$('#message');
function persist(){try{const raw=JSON.stringify(state);localStorage.setItem(SAVE_KEY,raw);platform.save(raw);}catch{message.textContent='Storage unavailable. This session is playable, but progress cannot be saved.';}}
function needed(){return focus==='contract'?normalContract(state).needs:focus==='opportunity'?state.opportunity?.needs??[]:focus==='discovery'?[{family:'chart',tier:2,count:1}]:goal(state)?.needs??[];}
function needsHTML(needs){return needs.map(r=>`<span class="need ${count(state,r)>=r.count?'done':near(state,[r])==='1 MERGE AWAY'?'almost':''}" title="${nameOf(item(r.family,r.tier))} · ${near(state,[r])}">${art(item(r.family,r.tier))}<b>${Math.min(count(state,r),r.count)}/${r.count}</b></span>`).join('');}
function hint(){if(!state.merges)return 'Tap two matching copper offcuts';const reqs=needed();if(ready(state,reqs)&&reqs.length)return focus==='goal'?'Expedition materials ready — build above':'Contract ready — choose whether to deliver';const r=reqs.find(r=>count(state,r)<r.count);return r?`${nameOf(item(r.family,r.tier))} ← ${SOURCES[r.family].name}`:'Explore, collect, or clear saltstone';}
function render(){
 $('.world').classList.toggle('opened',state.stage===4);$('.destination').textContent=state.stage===4?'VAULT DISCOVERED':'OPEN THE TIDEGLASS VAULT';
 $('#energy').textContent=state.energy;$('#marks').textContent=state.marks;
 $('#scene').innerHTML=scene(state.stage,state.post);$('#sceneLabel').textContent=STAGES[state.stage]?.scene??'The vault is open';
 $('#chapterLabel').textContent=state.stage===4?'DISCOVERY · THE SKY WITHIN':'THE SALTGLASS REACH';
 const g=goal(state);$('#goalTitle').textContent=g?.name??'Expedition complete';$('#step').textContent=state.stage<4?`${state.stage+1} / 4`:'DISCOVERED';
 $('#goalNeeds').innerHTML=needsHTML(g?.needs??[]);$('#goalButton').textContent=g?.verb??'Journal';$('#goalButton').disabled=!!g&&!ready(state,g.needs);$('#nextUnlock').textContent=g?.next??'All chapter badges found. Keep collecting.';
 if(g){const close=near(state,g.needs);if(close&&close!=='READY')$('#step').textContent=close;$('.objective').classList.toggle('almost',close==='1 MERGE AWAY');}
 const goalReady=!!g&&ready(state,g.needs);$('.objective').classList.toggle('ready',goalReady);
 if(goalReady){$('#step').textContent='READY';$('#goalButton').textContent='✓ '+g.verb;}
 const c=normalContract(state),cr=ready(state,c.needs),overlap=c.needs.some(r=>g?.needs.some(v=>v.family===r.family&&v.tier===r.tier));
 let cards=`<button class="contract ${cr?'ready':''} ${focus==='contract'?'active':''}" data-contract="contract" aria-label="${c.title}. ${c.needs.map(r=>nameOf(item(r.family,r.tier))+' '+count(state,r)+' of '+r.count).join(', ')}. Reward ${c.energy} energy. ${cr?'Ready to deliver.':''}"><span class="contractHead">${portrait(c.who.startsWith('Neri')?'neri':'ivo')}<span><small>SUPPLY CONTRACT</small><b>${c.title}</b></span></span><span class="contractBottom"><span class="needs">${needsHTML(c.needs)}</span><span class="reward">+${c.energy} ϟ<small>${cr?'DELIVER':'MAKE ITEMS'} · +${c.marks} ✦</small></span></span>${overlap?'<span class="choiceNote">Also needed for the expedition</span>':''}</button>`;
 if(state.discovery&&!state.discoveryDone&&!state.opportunity){const dr=state.board.some(x=>x?.type==='glyph')&&ready(state,[{family:'chart',tier:2,count:1}]);cards+=`<button class="contract discovery ${dr?'ready':''}" data-contract="discovery"><span class="contractHead"><span><small>RARE DISCOVERY</small><b>Decode the echo</b></span></span><span class="contractBottom"><span class="needs"><span class="need">${art({type:'glyph'})}<b>${state.board.some(x=>x?.type==='glyph')?'1':'0'}/1</b></span>${needsHTML([{family:'chart',tier:2,count:1}])}</span><span class="reward">+18 ϟ<small>${dr?'DECODE':'RICHER DROPS'}</small></span></span></button>`;}
 else {const op=opportunity(state),expired=op&&op.remaining===0;cards+=`<button class="contract opportunity ${op&&!expired&&ready(state,op.needs)?'ready':''}" data-contract="${op?'opportunity':'startOpportunity'}" ${state.stage<1?'disabled':''}><span class="contractHead"><span><small>OPTIONAL · ${state.stage<1?'AFTER LANDING':'NO PENALTY'}</small><b>${op?'Catch the signal':'A passing signal'}</b></span></span><span class="contractBottom">${op?`<span class="needs">${needsHTML(op.needs)}</span>`:`<span class="choiceNote">${state.stage>=2?'A resonator':'A scope'} before the signal fades</span>`}<span class="reward">+28 ϟ<small id="opClock">${op?(expired?'PASSED · DISMISS':Math.ceil(op.remaining/1000)+'s · '+(ready(state,op.needs)?'DELIVER':'MAKE')):'START 3 MIN'}</small></span></span></button>`;}
 $('#contracts').innerHTML=cards;
 const normalReward=$('[data-contract="contract"] .reward small');
 if(normalReward)normalReward.textContent=cr?'✓ READY':near(state,c.needs)==='1 MERGE AWAY'?'1 MERGE':'MAKE ITEMS';
 if(c.surge)$('[data-contract="contract"] .contractHead small').textContent='SUPPLIES · 3 BOOSTS';
 const signalTitle=$('.opportunity b');if(signalTitle)signalTitle.textContent=state.opportunity?'Signal Window':'Signal Window · opt in';
 const signalNote=$('.opportunity .choiceNote');if(signalNote)signalNote.textContent='Trade a '+(state.stage>=2?'resonator':'scope')+' → 3 boosted pulls';
 const signalReward=$('.opportunity .reward');if(signalReward)signalReward.firstChild.textContent=`+${state.opportunity?.energy??12} ϟ`;
 const discoveryReward=$('.discovery .reward');if(discoveryReward)discoveryReward.firstChild.textContent='+8 ϟ';
 for(const card of document.querySelectorAll('.contract.ready')){card.setAttribute('aria-label',`${card.querySelector('.contractHead b').textContent} · READY · tap to deliver`);const label=card.querySelector('.reward small');if(!card.classList.contains('opportunity'))label.textContent='✓ READY';}
 const readySignal=state.opportunity&&opportunity(state).remaining>0&&ready(state,state.opportunity.needs);
 if(readySignal)$('#opClock').textContent='✓ READY · '+Math.ceil(opportunity(state).remaining/1000)+'s';
 const selectedItem=state.board[selected];
 board.dataset.site=state.stage;board.setAttribute('aria-label',SITE_NAMES[state.stage]+' · 6 by 6 merge board');
 board.innerHTML=siteSurface(state.stage)+state.board.map((x,i)=>{
  const isSource=x?.type==='source',locked=isSource&&state.stage<SOURCES[x.id].unlock;
  const useful=isSource&&!locked&&needed().some(r=>r.family===x.id&&count(state,r)<r.count);
  const expedition=!!g?.needs.some(r=>matches(x,r)),contract=c.needs.some(r=>matches(x,r));
  const matching=selectedItem?.type==='item'&&x?.type==='item'&&i!==selected&&x.family===selectedItem.family&&x.tier===selectedItem.tier&&x.tier<7;
  return `<button class="tile ${x?.type??'empty'} ${locked?'locked':''} ${useful?'useful':''} ${selected===i?'selected':''} ${matching?'match':''} ${needed().some(r=>matches(x,r))?'wanted':''}" data-index="${i}" ${x?.family||isSource||x?.type==='crate'?`data-family="${x.family??(isSource?x.id:containerInfo(x).family)}"`:''} data-variant="${i%3}" data-use="${expedition&&contract?'both':expedition?'expedition':contract?'contract':''}" aria-label="${nameOf(x)}${x?.type==='crate'?' · tap to reveal · '+contents(x).map(nameOf).join(', '):''}${expedition&&contract?' · needed for expedition and contract':expedition?' · needed for expedition':contract?' · useful for contract':''}${locked?' · locked':isSource?' · '+SOURCES[x.id].cost+' energy · '+state.charges[x.id]+' charges':''}. Space ${i+1}" aria-pressed="${selected===i}">${art(x)}${expedition||contract?`<span class="useBadge" aria-hidden="true">${expedition?'◆':''}${contract?'▰':''}</span>`:''}${isSource?(locked?`<span class="lockedLabel">${x.id==='chart'?'CLEAR PATH':'EXCAVATE'}</span>`:`<span class="energyCue">ϟ${SOURCES[x.id].cost}</span><span class="charge">${Array.from({length:7},(_,n)=>`<i class="${n>=state.charges[x.id]?'used':''}"></i>`).join('')}</span>`):x?.type==='crate'?`<span class="pulls">${x.left}</span>`:''}</button>`;
 }).join('');
 for(const tile of board.querySelectorAll('.tile.item')){const x=state.board[+tile.dataset.index];tile.dataset.tier=x.tier;tile.classList.toggle('deliveryReady',(goalReady&&g.needs.some(r=>matches(x,r)))||(cr&&c.needs.some(r=>matches(x,r))));}
 for(const tile of board.querySelectorAll('.tile.item,.tile.glyph')){const x=state.board[+tile.dataset.index];if((readySignal&&state.opportunity.needs.some(r=>matches(x,r)))||($('.discovery.ready')&&(x.type==='glyph'||matches(x,{family:'chart',tier:2}))))tile.classList.add('deliveryReady');}
 $('#free').textContent=state.board.filter(x=>x===null).length+' spaces';$('#hint').textContent=hint();$('#rationButton').hidden=state.energy>3;renderSelection();
 if(state.surge>0){$('#free').textContent=`ϟ SURGE · ${state.surge} pulls`;$('#free').title='Shared by all producers. Choose which family gets improved parts. No timer.';board.dataset.event='surge';}else{delete board.dataset.event;$('#free').removeAttribute('title');}
 if(state.discovery&&!state.discoveryDone&&!state.opportunity){const label=$('.discovery .reward small');if(label&&state.board.some(x=>x?.type==='glyph')&&!ready(state,[{family:'chart',tier:2,count:1}]))label.textContent='1 LENS LEFT';}
}
function renderSelection(){
 const x=state.board[selected];let title=state.stage<4?'Open the Tideglass Vault':'The crossing is yours',desc=state.stage<4?'Merge identical objects. Choose expedition progress or supplies.':'Chart the star ocean, clear caches, or collect an aurora beacon.',buttons='';
 if(x){title=nameOf(x);
  if(x.type==='item'){
   const used=goal(state)?.needs.some(r=>matches(x,r)),cn=normalContract(state).needs.some(r=>matches(x,r));
   desc=(used&&cn?'◆ Expedition · ▰ Contract':used?'◆ Keep for expedition':cn?'▰ Deliver now, or merge further':'')+(x.tier===7?' · Top discovery':` · ${FAMILIES[x.family].names[x.tier+1]}`);
   buttons=`${x.family==='rig'&&x.tier===2?'<button class="accent" data-action="branch">Make brace</button>':''}<button data-action="recycle">Recycle +${2**x.tier} ϟ</button>`;
  }else if(x.type==='source'){
   if(state.stage<SOURCES[x.id].unlock)desc=`Unlock: ${x.id==='chart'?'clear the landing':'find the buried door'}.`;
   else {desc=`${state.surge>0?'SURGE · '+state.surge+' shared pulls · ':''}${state.charges[x.id]}/7 charges · Next: ${nameOf(nextOutput(state,x.id))}${burstOutput(state,x.id)?(state.taps[x.id]+1)%7===0?' + bonus tool':' + raw part':''}`;
    buttons=state.charges[x.id]?`<button class="accent" data-action="produce">Produce · ${SOURCES[x.id].cost} ϟ</button>`:'<button data-action="serviceTool">Service · tool</button><button class="accent" data-action="service">Service · 3 ϟ</button>';
   }
  }else if(x.type==='rock'){desc='A trail brace clears this space and reveals expedition gear immediately.';buttons='<button class="accent" data-action="clear">Use brace</button>';}
  else if(x.type==='sealed')desc='Excavation reveals parts, a resonance ampoule, and more saltstone.';
  else if(x.type==='crate'){desc=`${containerInfo(x).purpose} · Tap on board to reveal. Drag to keep.`;}
  else if(x.type==='glyph'){desc=state.discoveryDone?'Decoded fragment. Recycle or keep as a souvenir.':'Pair with a sight lens to decode. Richer source outputs.';buttons='<button data-action="recycle">Recycle +5 ϟ</button>';}
  else if(x.type==='brace'){desc='Tap a saltstone blocker to use this brace.';buttons='<button data-action="recycle">Recycle +3 ϟ</button>';}
 }
 const preview=x?.type==='crate'?`<span class="mergePreview" aria-label="Remaining rewards">${contents(x).slice(0,3).map(y=>art(y)).join('')}</span>`:x?.type==='item'&&x.tier<7?`<span class="mergePreview" title="Merge further: ${FAMILIES[x.family].names[x.tier+1]}"><span>→</span>${art(item(x.family,x.tier+1))}</span>`:x?.type==='rock'?`<span class="mergePreview" title="Blocker reward: mixed expedition gear"><span>→</span>${art({type:'crate',kind:'locker'})}</span>`:'';
 const rare=x?.type==='source'&&state.stage>=SOURCES[x.id].unlock?`<span class="rareTrack" role="progressbar" aria-label="Guaranteed rare in ${9-state.taps[x.id]%9} pulls" aria-valuemin="0" aria-valuemax="9" aria-valuenow="${state.taps[x.id]%9}">${Array.from({length:9},(_,i)=>`<i class="${i<state.taps[x.id]%9?'filled':''}"></i>`).join('')}<b>✦ ${9-state.taps[x.id]%9}</b></span>`:'';
 $('#selection').innerHTML=`${x?`<span class="preview">${art(x)}</span>`:''}<span class="copy"><b>${title}</b><small>${desc}</small>${rare}</span>${preview}<span class="actionGroup">${buttons}</span>`;
}
function run(a){
 const now=Date.now(),delivery=deliveryItems(state,a,now).map(v=>({...v,rect:board.querySelector(`[data-index="${v.index}"]`)?.getBoundingClientRect()}));
 const beforeBoard=state.board.map(x=>x?JSON.stringify(x):null);
 const taskSelector=a.type==='goal'?'.objective':`[data-contract="${a.type}"]`;
 const taskRect=$(taskSelector)?.getBoundingClientRect();
 const taskSnapshot=$(taskSelector)?.cloneNode(true);
 const energyBefore=state.energy,firstContract=state.contracts===0,surgeBefore=state.surge??0;
 const rewardOrigin=document.querySelector(a.type==='contract'||a.type==='opportunity'?'#contracts':'.objective')?.getBoundingClientRect();
 const before=state.stage,from=a.type==='produce'?board.querySelector(`[data-index="${state.board.findIndex(x=>x?.type==='source'&&x.id===a.id)}"]`)?.getBoundingClientRect():null;
 const result=act(state,a,now);message.textContent=result.message;
 if(!result.ok)return result;
 platform.startGameplay();if(['milestone','contract','discovery'].includes(result.event)){focus='goal';selected=null;}if(a.type==='merge')selected=result.index;render();persist();
 if(result.event==='milestone'&&state.stage<4)message.textContent=result.message+' unlocked. '+(goal(state)?.text??'');
 if(!delivery.length)feedback({event:result.event,tile:board.querySelector(`[data-index="${result.index}"]`),x:state.board[result.index],from:rewardOrigin,energyDelta:state.energy-energyBefore,stage:state.stage,firstContract,containerKind:result.containerKind,reveal:result.reveal,bonus:result.bonus,breakthrough:result.breakthrough,surgeStarted:state.surge>surgeBefore});
 if(delivery.length){
  const rewards=state.board.flatMap((x,index)=>x&&['item','crate'].includes(x.type)&&JSON.stringify(x)!==beforeBoard[index]?[{index,x,rect:board.querySelector(`[data-index="${index}"]`)?.getBoundingClientRect()}]:[]);
  const next=continuation(state,a,rewards);message.textContent=next;
  deliverFeedback({kind:a.type,delivery,rewards,taskRect,taskSnapshot,task:$(taskSelector),energy:state.energy-energyBefore,next,stage:state.stage});
 }
 for(const i of result.reveal??[])board.querySelector(`[data-index="${i}"]`)?.classList.add('merge-pop');
 if(result.event==='milestone'&&state.stage>before){const id=state.stage===1?'chart':state.stage===2?'flux':null;if(id)board.querySelector(`[data-index="${state.board.findIndex(x=>x?.type==='source'&&x.id===id)}"]`)?.classList.add('unlocked');}
 if(result.index!==null&&result.event!=='merge')board.querySelector(`[data-index="${result.index}"]`)?.classList.add('pop');
 if(a.type==='produce'){
  board.querySelector(`[data-index="${selected}"]`)?.classList.add('react');
  if(from&&!reduced()){const to=board.querySelector(`[data-index="${result.index}"]`)?.getBoundingClientRect();if(to){const el=document.createElement('div');el.className='flight';el.innerHTML=art(state.board[result.index]);el.style.cssText=`left:${from.x}px;top:${from.y}px;--dx:${to.x-from.x}px;--dy:${to.y-from.y}px`;document.body.append(el);setTimeout(()=>el.remove(),460);}}
 }
 if(result.event==='milestone'){
  $('.world').classList.remove('changed');void $('.world').offsetWidth;$('.world').classList.add('changed');
  platform.event([{type:'milestone_completed'}]);
  if(state.stage===4&&before<4){const reveal=()=>celebrate('The sky was buried here.', 'The vault opens onto a moving star ocean. You found the first crossing. The expedition continues: chart it, or build an aurora beacon.');if(reduced())reveal();else setTimeout(reveal,850);}
 }
 return result;
}
function clickTile(i){
 const x=state.board[i],prev=state.board[selected];
 if(selected!==null&&selected!==i&&prev?.type==='item'&&(!x||(x.type==='item'&&x.family===prev.family&&x.tier===prev.tier))){run({type:'merge',from:selected,to:i});return;}
 selected=i;render();
 if(x?.type==='crate')run({type:'crate',index:i});
 if(x?.type==='source'&&state.stage>=SOURCES[x.id].unlock&&state.charges[x.id]>0)run({type:'produce',id:x.id});
}
board.addEventListener('click',e=>{const tile=e.target.closest('[data-index]')??document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');if(tile&&board.contains(tile)&&performance.now()>suppressUntil)clickTile(+tile.dataset.index);});
board.addEventListener('pointerdown',e=>{const tile=e.target.closest('[data-index]');if(!tile||e.button!==0)return;const i=+tile.dataset.index;if(!['item','crate','brace','glyph'].includes(state.board[i]?.type))return;drag={from:i,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};tile.classList.add('picked');board.setPointerCapture?.(e.pointerId);});
board.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;if(drag.moved){board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('dragging');board.querySelectorAll('.target').forEach(x=>x.classList.remove('target'));const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');const to=target?+target.dataset.index:-1,a=state.board[drag.from],b=state.board[to];if(to>=0&&to!==drag.from&&(!b||(a?.type==='item'&&b.type==='item'&&a.family===b.family&&a.tier===b.tier&&a.tier<7)))target.classList.add('target');}});
board.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;board.querySelectorAll('.dragging,.target,.picked').forEach(x=>x.classList.remove('dragging','target','picked'));if(!d.moved)return;suppressUntil=performance.now()+300;const tile=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');if(tile){selected=d.from;run({type:'merge',from:d.from,to:+tile.dataset.index});}});
board.addEventListener('pointercancel',()=>{drag=null;board.querySelectorAll('.dragging,.target,.picked').forEach(x=>x.classList.remove('dragging','target','picked'));});
$('#selection').addEventListener('click',e=>{const type=e.target.closest('[data-action]')?.dataset.action;if(!type)return;const x=state.board[selected];run({type:type==='serviceTool'?'service':type,index:selected,id:x?.id,useTool:type==='serviceTool'});});
$('#goalButton').onclick=()=>goal(state)?run({type:'goal'}):showJournal();
$('#goalNeeds').onclick=()=>{focus='goal';render();message.textContent=goal(state)?.text??'Keep collecting rare discoveries.';};
$('#contracts').onclick=e=>{const type=e.target.closest('[data-contract]')?.dataset.contract;if(!type)return;
 if(type==='startOpportunity'){run({type});focus='opportunity';render();return;}
 focus=type;const can=type==='contract'?ready(state,normalContract(state).needs):type==='opportunity'?(state.opportunity&&(Date.now()>state.opportunity.ends||ready(state,state.opportunity.needs))):state.board.some(x=>x?.type==='glyph')&&ready(state,[{family:'chart',tier:2,count:1}]);
 if(can)run({type});else{render();message.textContent=type==='discovery'?'Find a sight lens and an echo fragment.':hint();}
};
$('#soundButton').textContent=sound.enabled()?'Sound on':'Sound off';
$('#soundButton').onclick=()=>{$('#soundButton').textContent=sound.toggle()?'Sound on':'Sound off';sound.play('merge',2);};
$('#rationButton').onclick=()=>run({type:'ration'});
function celebrate(title,text){$('#celebrationContent').innerHTML=`${scene(state.stage,state.post)}<h2>${title}</h2><p>${text}</p>`;$('#celebration').showModal();}
function showJournal(){
 $('#journalContent').innerHTML=`<small>VAULTWAKE · FIELD JOURNAL</small><h2>The Tideglass expedition</h2><p>Open a vault buried in the Saltglass Reach. Inside, an ocean of stars is waiting to move again.</p><h3>Your discoveries · ${state.discovered.length}/24</h3>${Object.entries(FAMILIES).map(([f,d])=>`<h3>${d.name}</h3><div class="collection">${d.names.map((n,t)=>`<div class="${state.discovered.includes(f+':'+t)?'':'unknown'}">${art(item(f,t))}<small>${n}</small></div>`).join('')}</div>`).join('')}<p>${state.contracts} contracts · ${state.merges} merges · ${state.marks} expedition merit</p>`;$('#journal').showModal();
}
$('#journalButton').onclick=showJournal;
$('#helpButton').onclick=()=>{$('#journalContent').innerHTML='<h2>Find what lies inside.</h2><ul><li>Tap an object, then its identical twin to merge. Drag also works.</li><li>The expedition panel opens the vault. ◆ marks expedition ingredients; ▰ marks contract ingredients. Tap its ingredients to focus again.</li><li>Supply contracts refill energy and return focused supplies when there is room, but may consume an expedition ingredient.</li><li>First equipment discoveries and expedition milestones bring finite field supplies. Big assemblies return offcuts. Tap a reward container once to reveal all that fits. Drag it to save for later; unclaimed contents never disappear.</li><li>Tap a source to produce. Its selected panel shows the next output. Service empty sources with a tool or energy.</li><li>A split spanner can merge into a winch, or become a brace to clear saltstone.</li><li>Rare fragments arrive every ninth source pull. Decode one with a sight lens to enrich all sources.</li><li>Signal contracts are optional. The timer begins only when you choose Start. Expiry never removes items.</li><li>Board full? Deliver, merge, recycle a selected item, or clear a blocker. Low energy? Use a free field ration.</li></ul>';$('#journal').showModal();};
for(const dialog of document.querySelectorAll('dialog')){dialog.querySelector('.close').onclick=()=>dialog.close();dialog.querySelector('.continue')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}
setInterval(()=>{const op=opportunity(state),clock=$('#opClock');if(op&&clock){clock.textContent=op.remaining?(ready(state,op.needs)?'✓ READY · ':'MAKE · ')+Math.ceil(op.remaining/1000)+'s':'PASSED · DISMISS';if(!op.remaining){const card=clock.closest('.contract');card.classList.remove('ready');card.removeAttribute('aria-label');}}},1000);
render();persist();platform.init();
