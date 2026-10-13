import {containerInfo,contents} from './containers.mjs';
import {SAVE_KEY,FAMILIES,SOURCES,STAGES,fresh,load,act,goal,count,ready,matches,nameOf,normalContract,opportunity,nextOutput,burstOutput,item,near,sourceUnlocked} from './core.mjs';
import {art,scene as vectorScene,portrait} from './art.mjs';
import {feedback,sound,reduced,snapshotTask} from './feedback.mjs';
import {platform} from '../v4/platform.mjs';
import {siteSurface,SITE_NAMES,deliveryItems,continuation} from './presentation.mjs';
import {deliverFeedback} from './feedback.mjs';
import {ANCHORS,ROUTES,equipment,anchors,activeAnchors} from './expedition.mjs';
import {enablePremium,prototypeScene} from './premium.mjs';
import {objectiveGuide,objectGuide} from './guidance.mjs';
const premium=new URLSearchParams(location.search).get('art')!=='classic';
if(premium){enablePremium(new URLSearchParams(location.search).get('art'));document.body.dataset.art='premium';document.body.dataset.palette=['r2','phase1'].includes(new URLSearchParams(location.search).get('art'))?'muted':'vibrant';}
const scene=premium?prototypeScene:vectorScene;
const $=s=>document.querySelector(s);
let state;try{state=load(localStorage.getItem(SAVE_KEY));}catch{state=fresh();}
let selected=null,focus='goal',drag=null,suppressUntil=0,sideView=null;
const board=$('#board'),message=$('#message');
function persist(){try{const raw=JSON.stringify(state);localStorage.setItem(SAVE_KEY,raw);platform.save(raw);}catch{message.textContent='Storage unavailable. This session is playable, but progress cannot be saved.';}}
function needed(){const x=state.board[selected];if(focus==='goal'&&x?.type==='site')return x.phase==='idle'?[equipment(x.kind)]:[];if(focus==='goal'&&x?.type==='route')return [{family:ROUTES[x.id].family,tier:2,count:1}];return focus==='contract'?normalContract(state).needs:focus==='opportunity'?state.opportunity?.needs??[]:focus==='discovery'?[{family:'chart',tier:2,count:1}]:goal(state)?.needs??[];}
function needsHTML(needs,interactive=false){return needs.map(r=>{const tag=interactive?'button':'span';return `<${tag} class="need ${count(state,r)>=r.count?'done':near(state,[r])==='1 MERGE AWAY'?'almost':''}" title="${nameOf(item(r.family,r.tier))}" ${interactive?`type="button" data-guide-family="${r.family}" aria-label="Find producer for ${nameOf(item(r.family,r.tier))}"`:''}>${art(item(r.family,r.tier))}<b>${count(state,r)>=r.count&&r.count===1?'✓':Math.min(count(state,r),r.count)+'/'+r.count}</b></${tag}>`;}).join('');}
function sideOptions(){return ['contract',...(state.discovery&&!state.discoveryDone&&state.board.some(x=>x?.type==='glyph')?['discovery']:[]),...(state.stage>=1?[state.opportunity?'opportunity':'startOpportunity']:[])];}
function sideChoice(){const options=sideOptions();return options.includes(sideView)?sideView:state.opportunity?'opportunity':options.includes('discovery')?'discovery':'contract';}
function hint(){return selected===null?objectiveGuide(state).short:objectGuide(state,selected).short;}
function missionSlots(){
 if(state.stage===1)return Object.entries(ROUTES).map(([id,r])=>{const index=state.board.findIndex(x=>x?.type==='route'&&x.id===id),need={family:r.family,tier:2,count:1};return `<button class="missionSlot ${ready(state,[need])?'available':''}" data-site-index="${index}" aria-label="${r.name}: ${r.benefit}">${art(item(r.family,2))}<span>${id==='ridge'?'Room to work':'Relic supplies'}</span></button>`;}).join('<span class="or">or</span>');
 if(state.stage===2)return anchors(state).map(x=>`<button class="missionSlot ${x.phase==='done'?'complete':ready(state,[equipment(x.kind)])?'available':''}" data-site-index="${state.board.indexOf(x)}" aria-label="${nameOf(x)}: ${x.phase==='done'?'ready':ANCHORS[x.kind].effect}">${art(item(ANCHORS[x.kind].equipment,3))}<span>${x.phase==='done'?'✓':ANCHORS[x.kind].short}</span></button>`).join('');
 return needsHTML(goal(state)?.needs??[],true);
}
function renderSide(){
 const choice=sideChoice(),c=normalContract(state),op=opportunity(state),rare=choice==='discovery';
 const needs=choice==='contract'?c.needs:rare?[{family:'chart',tier:2,count:1}]:choice==='opportunity'?op.needs:[];
 const can=choice!=='startOpportunity'&&ready(state,needs)&&(rare?state.board.some(x=>x?.type==='glyph'):choice==='opportunity'?op.remaining>0:true);
 const title=choice==='contract'?c.vaultTrade?'Vault trade':c.exchange?'Equipment swap':'Supply run':rare?'Relic find':'Passing signal';
 const reward=choice==='contract'?(c.exchange?art(c.exchange)+(c.surge?'<span class="tradeSurge">+3 rich pulls</span>':''):'+'+c.energy+' ϟ'):rare?'Better parts':'3 rich pulls';
 $('#contracts').innerHTML=`<button class="contract ${rare?'discovery':choice.includes('pportunity')?'opportunity':''} ${can?'ready':''}" data-contract="${choice}" data-requirements="${needs.length}" aria-label="Optional: ${title} ${can?'ready to use':''}"><span class="contractHead">${portrait(rare?'neri':'ivo')}<span><small>BONUS · CAN SKIP</small><b>${title}</b></span></span><span class="needs">${rare?art({type:'glyph'}):''}${needsHTML(needs)}</span><span class="reward">${reward}<small ${choice==='opportunity'?'id="opClock"':''}>${can?'✓ READY':choice==='startOpportunity'?'OPEN · 3 MIN':choice==='opportunity'?Math.ceil(op.remaining/1000)+'s':'COLLECT'}</small></span></button><button class="sideMore" data-side-next aria-label="Other optional tasks" ${sideOptions().length<2?'hidden':''}>•••</button>`;
}
function render(){
 $('.world').classList.toggle('opened',state.stage===4);$('.destination').textContent=state.stage===4?'VAULT DISCOVERED':'OPEN THE TIDEGLASS VAULT';
 $('#energy').textContent=state.energy;$('#marks').textContent=state.marks;
 const viewStage=state.stage===0&&state.landingStep===1?1:state.stage;
 const sceneKey=viewStage+':'+state.post;if($('#scene').dataset.key!==sceneKey){$('#scene').innerHTML=scene(viewStage,state.post);$('#scene').dataset.key=sceneKey;}$('#sceneLabel').textContent=goal(state)?.scene??STAGES[state.stage]?.scene??'The vault is open';
 $('#chapterLabel').textContent=state.stage===4?'DISCOVERY · THE SKY WITHIN':'THE SALTGLASS REACH';
 $('.objective').dataset.stage=state.stage;
 const g=goal(state);$('#goalTitle').textContent=g?.name??'Expedition complete';$('#step').textContent=state.stage<4?(g?.phase??`${state.stage+1} / 4`):'DISCOVERED';
 $('#goalNeeds').innerHTML=missionSlots();$('#goalRecipe').textContent=objectiveGuide(state).recipe;$('#goalButton').textContent=g?.verb??'Journal';
 const goalReady=!!g&&g.action!=='inspect'&&ready(state,g.needs);$('#goalButton').hidden=!goalReady;$('#goalButton').disabled=false;
 $('.objective').classList.toggle('ready',goalReady);$('.objective').classList.remove('almost');$('#nextUnlock').textContent=g?.next??'';
 if(goalReady)$('#step').textContent='READY';
 renderSide();const c=normalContract(state),cr=sideChoice()==='contract'&&ready(state,c.needs);
 const readySignal=sideChoice()==='opportunity'&&state.opportunity&&opportunity(state).remaining>0&&ready(state,state.opportunity.needs);
 const selectedItem=state.board[selected];
 board.dataset.site=viewStage;board.setAttribute('aria-label',SITE_NAMES[viewStage]+' · 6 by 6 merge board');
 board.innerHTML=siteSurface(viewStage)+state.board.map((x,i)=>{
  const isSource=x?.type==='source',locked=isSource&&!sourceUnlocked(state,x.id);
  const useful=isSource&&!locked&&needed().some(r=>r.family===x.id&&count(state,r)<r.count);
  const expedition=!!g?.needs.some(r=>matches(x,r)),contract=sideChoice()==='contract'&&c.needs.some(r=>matches(x,r));
  const matching=selectedItem?.type==='item'&&x?.type==='item'&&i!==selected&&x.family===selectedItem.family&&x.tier===selectedItem.tier&&x.tier<7;
  return `<button class="tile ${x?.type??'empty'} ${locked?'locked':''} ${useful?'useful':''} ${selected===i?'selected':''} ${matching?'match':''} ${needed().some(r=>matches(x,r))?'wanted':''}" data-index="${i}" ${x?.family||isSource||x?.type==='crate'?`data-family="${x.family??(isSource?x.id:containerInfo(x).family)}"`:''} data-variant="${i%3}" data-use="${expedition&&contract?'both':expedition?'expedition':contract?'contract':''}" aria-label="${nameOf(x)}${x?.type==='crate'?' · tap to reveal · '+contents(x).map(nameOf).join(', '):''}${expedition&&contract?' · needed for expedition and contract':expedition?' · needed for expedition':contract?' · useful for contract':''}${locked?' · locked':isSource?' · '+SOURCES[x.id].cost+' energy · '+state.charges[x.id]+' charges':''}. Space ${i+1}" aria-pressed="${selected===i}">${art(x?.type==='site'&&state.stage<2?{type:'sealed'}:x)}${expedition||contract?`<span class="useBadge" aria-hidden="true">${expedition?'◆':''}${contract?'▰':''}</span>`:''}${isSource?(locked?`<span class="lockedLabel">${x.id==='chart'?'CLEAR PATH':'EXCAVATE'}</span>`:`<span class="energyCue">ϟ${SOURCES[x.id].cost}</span><span class="charge">${Array.from({length:7},(_,n)=>`<i class="${n>=state.charges[x.id]?'used':''}"></i>`).join('')}</span>`):x?.type==='crate'?`<span class="pulls">${x.left}</span>`:''}${x?.type==='glyph'?'<span class="boardRole echo">ECHO</span>':x?.type==='rock'?'<span class="boardRole stone">STONE</span>':''}</button>`;
 }).join('');
 for(const tile of board.querySelectorAll('.tile.item')){const x=state.board[+tile.dataset.index];tile.dataset.tier=x.tier;tile.classList.toggle('deliveryReady',(goalReady&&g.needs.some(r=>matches(x,r)))||(cr&&c.needs.some(r=>matches(x,r))));}
 for(const tile of board.querySelectorAll('.tile.site,.tile.route')){
  const x=state.board[+tile.dataset.index],need=x.type==='route'?{family:ROUTES[x.id].family,tier:2,count:1}:equipment(x.kind);
  const can=x.type==='route'?state.stage===1&&ready(state,[need]):state.stage>=2&&x.phase==='idle'&&ready(state,[need]);
  tile.classList.toggle('deliveryReady',can);tile.classList.toggle('match',can&&matches(selectedItem,need));tile.classList.toggle('useTarget',can&&matches(selectedItem,need));tile.dataset.phase=x.phase??'buried';
  if(state.stage>=2&&x.type==='site'||state.stage===1&&x.type==='route')tile.insertAdjacentHTML('beforeend',`<span class="anchorCue">${x.phase==='done'?'✓':can?'USE':''}</span>`);
  tile.setAttribute('aria-label',state.stage<2&&x.type==='site'?'Buried device':nameOf(x));
 }
 for(const tile of board.querySelectorAll('.tile.item,.tile.glyph')){const x=state.board[+tile.dataset.index];if((readySignal&&state.opportunity.needs.some(r=>matches(x,r)))||($('.discovery.ready')&&(x.type==='glyph'||matches(x,{family:'chart',tier:2}))))tile.classList.add('deliveryReady');}
 $('#free').textContent=state.board.filter(x=>x===null).length+' spaces';$('#hint').textContent=hint();const guide=selected===null?objectiveGuide(state):objectGuide(state,selected);$('#guideTitle').textContent=guide.title;$('#guideExplanation').textContent=guide.detail;$('#rationButton').hidden=state.energy>3;renderSelection();
 if(state.surge>0){$('#free').textContent=`ϟ SURGE · ${state.surge} pulls`;$('#free').title='Shared by all producers. Choose which family gets improved parts. No timer.';board.dataset.event='surge';}else{delete board.dataset.event;$('#free').removeAttribute('title');}
 if(state.discovery&&!state.discoveryDone&&!state.opportunity&&state.board.some(x=>x?.type==='glyph')){const label=$('.discovery .reward small');if(label&&state.board.some(x=>x?.type==='glyph')&&!ready(state,[{family:'chart',tier:2,count:1}]))label.textContent='MAKE SIGHT LENS';}
}
function renderSelection(){
 const x=state.board[selected];let title=state.stage<4?'Open the Tideglass Vault':'The crossing is yours',desc=state.stage<4?'Merge identical objects. Choose expedition progress or supplies.':'Chart the star ocean, clear caches, or collect an aurora beacon.',buttons='';
 if(x){title=nameOf(x);
  if(x.type==='item'){
   const used=goal(state)?.needs.some(r=>matches(x,r)),cn=normalContract(state).needs.some(r=>matches(x,r));
   desc=(used&&cn?'◆ Expedition · ▰ Contract':used?'◆ Keep for expedition':cn?'▰ Deliver now, or merge further':'')+(x.tier===7?' · Top discovery':` · ${FAMILIES[x.family].names[x.tier+1]}`);
   const site=anchors(state).find(v=>v.phase==='idle'&&matches(x,equipment(v.kind)));if(site&&state.stage>=2)desc=`Keep to merge · or use on ${nameOf(site)}${cn?' · also exchangeable':''}`;
   buttons=`${site&&state.stage>=2?`<button class="accent" data-action="deploy" data-target="${state.board.indexOf(site)}">Use · ${ANCHORS[site.kind].short}</button>`:''}<button data-action="recycle">Recycle +${2**x.tier} ϟ</button>`;
  }else if(x.type==='source'){
   if(!sourceUnlocked(state,x.id))desc=`Unlock: ${x.id==='chart'?'stabilize the landing':'open a breach'}.`;
   else {desc=`${state.surge>0?'SURGE · '+state.surge+' shared pulls · ':''}${state.charges[x.id]}/7 charges · Next: ${nameOf(nextOutput(state,x.id))}${burstOutput(state,x.id)?(state.taps[x.id]+1)%7===0?' + bonus tool':' + raw part':''}`;
    buttons=state.charges[x.id]?`<button class="accent" data-action="produce">Produce · ${SOURCES[x.id].cost} ϟ</button>`:'<button data-action="serviceTool">Service · tool</button><button class="accent" data-action="service">Service · 3 ϟ</button>';
   }
  }else if(x.type==='rock'){desc='Use a split spanner. Find buried supplies.';buttons='<button class="accent" data-action="clear">Clear</button>';}
  else if(x.type==='route'){desc=state.stage===1?ROUTES[x.id].benefit+' · the other breach stays buried.':'Choose a breach after the landing; the other opens with the vault.';if(state.stage===1)buttons=`<button class="accent" data-action="breach">Use ${FAMILIES[ROUTES[x.id].family].names[2]}</button>`;}
  else if(x.type==='site'){const a=ANCHORS[x.kind];title=state.stage<2?'Buried device':nameOf(x);desc=state.stage<2?'Clear a route to reach this equipment.':x.phase==='idle'?`${FAMILIES[a.equipment].names[3]} → ${a.effect}`:a.effect;if(state.stage>=2&&x.phase==='idle')buttons='<button class="accent" data-action="deploy">Use</button>';}
  else if(x.type==='sealed')desc='Unchosen excavation ground. Opens when the vault is secured.';
  else if(x.type==='crate'){desc=`${containerInfo(x).purpose} · Tap on board to reveal. Drag to keep.`;}
  else if(x.type==='glyph'){desc='Use with a sight lens for richer source drops.';buttons='<button data-action="recycle">Recycle +5 ϟ</button>';}
  else if(x.type==='brace'){desc='Tap a saltstone blocker to use this brace.';buttons='<button data-action="recycle">Recycle +3 ϟ</button>';}
 }
 const preview=x?.type==='crate'?`<span class="mergePreview" aria-label="Remaining rewards">${contents(x).slice(0,3).map(y=>art(y)).join('')}</span>`:x?.type==='item'&&x.tier<7?`<span class="mergePreview" title="Merge further: ${FAMILIES[x.family].names[x.tier+1]}"><span>→</span>${art(item(x.family,x.tier+1))}</span>`:x?.type==='rock'?`<span class="mergePreview" title="Blocker reward: mixed expedition gear"><span>→</span>${art({type:'crate',kind:'locker'})}</span>`:'';
 const rare=x?.type==='source'&&sourceUnlocked(state,x.id)?`<span class="rareTrack" role="progressbar" aria-label="Guaranteed rare in ${9-state.taps[x.id]%9} pulls" aria-valuemin="0" aria-valuemax="9" aria-valuenow="${state.taps[x.id]%9}">${Array.from({length:9},(_,i)=>`<i class="${i<state.taps[x.id]%9?'filled':''}"></i>`).join('')}<b>✦ ${9-state.taps[x.id]%9}</b></span>`:'';
 $('#selection').innerHTML=`${x?`<span class="preview">${art(x)}</span>`:''}<span class="copy"><b>${title}</b><small>${desc}</small>${rare}</span>${preview}<span class="actionGroup">${buttons}</span>`;
}
function run(a){
 const now=Date.now(),delivery=deliveryItems(state,a,now).map(v=>({...v,rect:board.querySelector(`[data-index="${v.index}"]`)?.getBoundingClientRect()}));
 const beforeBoard=state.board.map(x=>x?JSON.stringify(x):null);
 const objectiveAction=['goal','breach'].includes(a.type);const taskSelector=a.type==='deploy'?`[data-index="${a.index}"]`:objectiveAction?'.objective':`[data-contract="${a.type}"]`;
 const taskRect=$(taskSelector)?.getBoundingClientRect();
 const taskSnapshot=delivery.length?snapshotTask($(taskSelector)):null;
 const energyBefore=state.energy,firstContract=state.contracts===0,surgeBefore=state.surge??0;
 const rewardOrigin=document.querySelector(a.type==='contract'||a.type==='opportunity'?'#contracts':'.objective')?.getBoundingClientRect();
 const before=state.stage,landingBefore=state.landingStep,from=a.type==='produce'?board.querySelector(`[data-index="${state.board.findIndex(x=>x?.type==='source'&&x.id===a.id)}"]`)?.getBoundingClientRect():null;
 const result=act(state,a,now);message.textContent=result.message;
 if(!result.ok)return result;
 platform.startGameplay();if(['milestone','deployment','contract','discovery'].includes(result.event)){focus='goal';selected=null;}if(a.type==='merge')selected=result.index;render();persist();
 if(result.event==='milestone'&&state.stage<4)message.textContent=result.message+' unlocked. '+(goal(state)?.text??'');
 if(!delivery.length)feedback({event:result.event,tile:board.querySelector(`[data-index="${result.index}"]`),x:state.board[result.index],from:rewardOrigin,energyDelta:state.energy-energyBefore,stage:state.stage,firstContract,containerKind:result.containerKind,reveal:result.reveal,bonus:result.bonus,improved:result.improved,breakthrough:result.breakthrough,breakthroughUse:state.stage>=2&&state.board[result.index]?.tier===3?anchors(state).filter(v=>v.phase==='idle'&&ANCHORS[v.kind].equipment===state.board[result.index].family).map(v=>'Use: '+ANCHORS[v.kind].short+' · or merge higher')[0]:null,surgeStarted:state.surge>surgeBefore});
 if(delivery.length){
  const rewards=state.board.flatMap((x,index)=>x&&['item','crate'].includes(x.type)&&JSON.stringify(x)!==beforeBoard[index]?[{index,x,rect:board.querySelector(`[data-index="${index}"]`)?.getBoundingClientRect()}]:[]);
  const next=['deploy','feed'].includes(a.type)?result.message:continuation(state,a,rewards);message.textContent=next;
  deliverFeedback({kind:a.type,delivery,rewards,taskRect,taskSnapshot,task:$(taskSelector),energy:state.energy-energyBefore,next,stage:state.stage});
 }
 for(const i of result.reveal??[])board.querySelector(`[data-index="${i}"]`)?.classList.add('merge-pop');
 for(const i of result.operated??[])board.querySelector(`[data-index="${i}"]`)?.classList.add('unlocked');
 if(result.event==='milestone'&&(state.stage>before||state.landingStep>landingBefore)){const id=state.landingStep>landingBefore&&state.stage===0?'chart':state.stage===2?'flux':null;if(id)board.querySelector(`[data-index="${state.board.findIndex(x=>x?.type==='source'&&x.id===id)}"]`)?.classList.add('unlocked');}
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
 if(selected===i&&['item','glyph','brace'].includes(x?.type)){selected=null;render();return;}
 if(selected!==null&&selected!==i&&x?.type==='site'&&(prev?.type==='item'&&x.phase==='idle'&&matches(prev,equipment(x.kind)))){run({type:'deploy',from:selected,index:i});return;}
 if(selected!==null&&selected!==i&&x?.type==='route'&&prev?.type==='item'&&matches(prev,{family:ROUTES[x.id].family,tier:2})){run({type:'breach',from:selected,index:i});return;}
 if(selected!==null&&selected!==i&&prev?.type==='item'&&(!x||(x.type==='item'&&x.family===prev.family&&x.tier===prev.tier))){run({type:'merge',from:selected,to:i});return;}
 selected=i;render();
 if(x?.type==='crate')run({type:'crate',index:i});
 if(x?.type==='source'&&sourceUnlocked(state,x.id)&&state.charges[x.id]>0)run({type:'produce',id:x.id});
}
board.addEventListener('click',e=>{const tile=e.target.closest('[data-index]')??document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');if(tile&&board.contains(tile)&&performance.now()>suppressUntil)clickTile(+tile.dataset.index);});
board.addEventListener('pointerdown',e=>{const tile=e.target.closest('[data-index]');if(!tile||e.button!==0)return;const i=+tile.dataset.index;if(!['item','crate','brace','glyph'].includes(state.board[i]?.type))return;drag={from:i,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};tile.classList.add('picked');board.setPointerCapture?.(e.pointerId);});
board.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;if(drag.moved){board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('dragging');board.querySelectorAll('.target').forEach(x=>x.classList.remove('target'));const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');const to=target?+target.dataset.index:-1,a=state.board[drag.from],b=state.board[to];if(to>=0&&to!==drag.from&&(!b||(a?.type==='item'&&b.type==='item'&&a.family===b.family&&a.tier===b.tier&&a.tier<7)||(b?.type==='site'&&(a?.type==='item'&&b.phase==='idle'&&matches(a,equipment(b.kind))))||(b?.type==='route'&&matches(a,{family:ROUTES[b.id].family,tier:2}))))target.classList.add('target');}});
board.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;board.querySelectorAll('.dragging,.target,.picked').forEach(x=>x.classList.remove('dragging','target','picked'));if(!d.moved)return;suppressUntil=performance.now()+300;const tile=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');if(tile){selected=d.from;const index=+tile.dataset.index,x=state.board[index];run(x?.type==='site'?{type:'deploy',from:d.from,index}:x?.type==='route'?{type:'breach',from:d.from,index}:{type:'merge',from:d.from,to:index});}});
board.addEventListener('pointercancel',()=>{drag=null;board.querySelectorAll('.dragging,.target,.picked').forEach(x=>x.classList.remove('dragging','target','picked'));});
$('#selection').addEventListener('click',e=>{const button=e.target.closest('[data-action]'),type=button?.dataset.action;if(!type)return;const x=state.board[selected];run({type:type==='serviceTool'?'service':type,index:button.dataset.target!==undefined?+button.dataset.target:selected,from:button.dataset.target!==undefined?selected:undefined,id:x?.id,useTool:type==='serviceTool'});});
$('#goalButton').onclick=()=>{const g=goal(state);if(g?.action==='inspect'){const choices=state.board.flatMap((x,i)=>(state.stage===1?x?.type==='route':x?.type==='site'&&x.phase!=='done')?[i]:[]);selected=choices[(choices.indexOf(selected)+1)%choices.length];focus='goal';render();message.textContent=g.text;return;}g?run({type:g.action??'goal'}):showJournal();};
$('#goalNeeds').onclick=e=>{focus='goal';const badge=e.target.closest('[data-site-index]');if(badge){selected=+badge.dataset.siteIndex;const x=state.board[selected],need=x?.type==='site'?equipment(x.kind):{family:ROUTES[x.id].family,tier:2,count:1};if((x.type==='route'&&state.stage===1||x.type==='site'&&x.phase==='idle')&&ready(state,[need])){run({type:x.type==='route'?'breach':'deploy',index:selected});return;}}render();message.textContent=goal(state)?.text??'Keep collecting rare discoveries.';};
$('#contracts').onclick=e=>{if(e.target.closest('[data-side-next]')){const choices=sideOptions();sideView=choices[(choices.indexOf(sideChoice())+1)%choices.length];render();return;}const type=e.target.closest('[data-contract]')?.dataset.contract;if(!type)return;
 if(type==='startOpportunity'){sideView='opportunity';run({type});focus='opportunity';render();return;}
 sideView=type;focus=type;const can=type==='contract'?ready(state,normalContract(state).needs):type==='opportunity'?(state.opportunity&&(Date.now()>state.opportunity.ends||ready(state,state.opportunity.needs))):state.board.some(x=>x?.type==='glyph')&&ready(state,[{family:'chart',tier:2,count:1}]);
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
$('#helpButton').onclick=()=>{$('#journalContent').innerHTML='<h2>The Tideglass Vault</h2><ul><li>MERGE twins to make useful equipment.</li><li>USE equipment on a route or device. Each changes the board and helps another item family. Choose two devices.</li><li>DELIVER optional supplies, or keep them for the expedition. ••• shows other optional tasks.</li><li>OPEN rewards when you have room. A spanner clears a stone in one step.</li><li>Use a fragment with a sight lens for richer source drops. Sources show their next output and remaining charges.</li></ul>';$('#journal').showModal();};
for(const dialog of document.querySelectorAll('dialog')){dialog.querySelector('.close').onclick=()=>dialog.close();dialog.querySelector('.continue')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}
setInterval(()=>{const op=opportunity(state),clock=$('#opClock');if(op&&clock){clock.textContent=op.remaining?(ready(state,op.needs)?'✓ READY · ':'MAKE · ')+Math.ceil(op.remaining/1000)+'s':'PASSED · DISMISS';if(!op.remaining){const card=clock.closest('.contract');card.classList.remove('ready');card.removeAttribute('aria-label');}}},1000);
render();persist();platform.init();
