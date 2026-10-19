import {campGoal} from './camp-goals.mjs';
import {fleetEarned,fleetPending,FLEET_LINES} from './fleet.mjs';
import {storySnapshot,requestBrief} from './story.mjs';
import {LOFT_COST,DEEP_SURVEY_COST,recoveryCost,pearlDiscovered,TIDE_NAMES,isTide,maxTier,sameKind,discoveryKey,tideItem,nextTide} from './treasures.mjs';
import {KITS} from './journey.mjs';
import {PIER_COST,PACK_COST} from './camp.mjs';
import {requestProgress} from './requests.mjs';
import {WORKSHOP_COST,BENCH_COST,BENCH_NEEDS,benchInputs} from './workshop.mjs';
import {containerInfo,contents} from './containers.mjs';
import {SAVE_KEY,FAMILIES,SOURCES,STAGES,fresh,load,act,goal,expeditionGoal,count,ready,matches,nameOf,normalContract,opportunity,nextOutput,burstOutput,item,near,sourceUnlocked} from './core.mjs';
import {art,scene as vectorScene,portrait} from './art.mjs';
import {feedback,sound,reduced,snapshotTask,moment} from './feedback.mjs';
import {platform} from '../v4/platform.mjs';
import {siteSurface,SITE_NAMES,deliveryItems,continuation} from './presentation.mjs';
import {deliverFeedback} from './feedback.mjs';
import {ANCHORS,ROUTES,FINDS,findSite,canRestore,equipment,anchors,activeAnchors} from './expedition.mjs';
import {enablePremium,prototypeScene} from './premium.mjs';
import {useAction,openingPair} from './interactions.mjs';
import {circuit,linkPhase,loopCell,optics,movable,receivers} from './seals.mjs';
import {routePrepared} from './navigation.mjs';
const premium=new URLSearchParams(location.search).get('art')!=='classic';
if(premium){enablePremium(new URLSearchParams(location.search).get('art'));document.body.dataset.art='premium';document.body.dataset.palette=['r2','phase1'].includes(new URLSearchParams(location.search).get('art'))?'muted':'vibrant';}
const scene=premium?prototypeScene:vectorScene;
const $=s=>document.querySelector(s);
let state;try{state=load(localStorage.getItem(SAVE_KEY));}catch{state=fresh();}
let selected=null,focus='goal',drag=null,suppressUntil=0,sideView=null,requestId=null,kitFocus='field',showVaultGoal=false;
function visibleGoal(){return state.stage===4&&showVaultGoal?expeditionGoal(state):goal(state);}
const board=$('#board'),message=$('#message');
function persist(){try{const raw=JSON.stringify(state);localStorage.setItem(SAVE_KEY,raw);platform.save(raw);}catch{message.textContent='Storage unavailable. This session is playable, but progress cannot be saved.';}}
function needed(){if(focus==='goal'&&state.stage===3&&!state.journey.kit)return KITS[kitFocus].needs;if(focus==='bench')return BENCH_NEEDS;if(focus==='request')return state.requests.orders.find(o=>o?.id===requestId)?.needs??[];const x=state.board[selected];if(x?.type==='rock'&&FINDS[x.find])return [{family:'rig',tier:2,count:1},...(canRestore(state,x)?[{family:'flux',tier:2,count:1}]:[])];if(focus==='goal'&&x?.type==='site')return x.phase==='idle'?[equipment(x.kind)]:[];if(focus==='goal'&&x?.type==='route')return [{family:ROUTES[x.id].family,tier:2,count:1}];return focus==='contract'?normalContract(state).needs:focus==='opportunity'?state.opportunity?.needs??[]:focus==='discovery'?[{family:'chart',tier:2,count:1}]:visibleGoal()?.needs??[];}
function needsHTML(needs){return needs.map(r=>`<span class="need ${count(state,r)>=r.count?'done':near(state,[r])==='1 MERGE AWAY'?'almost':''}" title="${nameOf(item(r.family,r.tier,r.line))}">${art(item(r.family,r.tier,r.line))}<b>${count(state,r)>=r.count&&r.count===1?'✓':Math.min(count(state,r),r.count)+'/'+r.count}</b></span>`).join('');}
function sideOptions(){return ['contract',...(state.discovery&&!state.discoveryDone&&state.board.some(x=>x?.type==='glyph')?['discovery']:[]),...(state.stage>=1?[state.opportunity?'opportunity':'startOpportunity']:[])];}
function sideChoice(){const options=sideOptions();return options.includes(sideView)?sideView:state.opportunity?'opportunity':options.includes('discovery')?'discovery':'contract';}
function hint(){
 if(state.stage===4&&visibleGoal()?.kind==='camp'&&focus!=='request'){
  const g=visibleGoal();
  if(g.action==='orders'){const o=state.requests.orders.find(x=>x?.id===g.orderId);if(o){const p=requestProgress(state,o),missing=p.progress.find(r=>r.current<r.count);return p.ready?'ORDER READY · collect '+o.supplies+' supplies above':missing?'NEXT ORDER · make '+nameOf(item(missing.family,missing.tier,missing.line)):'Complete the highlighted order';}return 'Deliver camp orders to earn supplies';}
  if(g.action==='treasure')return 'Survey Kite · recover and merge Tide Treasures';
  return 'Build the next camp upgrade · '+g.name;
 }
 if(state.stage===2&&optics(state).primed&&receivers(state).some(i=>circuit(state,i)))return state.board.includes(null)?'RINGS READY · ACTIVATE ABOVE ↑':'RINGS READY · MERGE TO FREE ONE SPACE';
 if(!state.merges&&state.stage===0&&!state.landingStep)return 'START · Tap the glowing pair';
 if(state.stage===0&&!state.landingStep)return 'GRIP TOOL MADE · Tap CLEAR PATH ↑';
 if(focus==='request'){
  const order=state.requests.orders.find(o=>o?.id===requestId);
  if(order){const progress=requestProgress(state,order);if(progress.ready)return 'ORDER READY · Collect above the board';
   const missing=progress.progress.find(r=>r.current<r.count);
   if(missing)return 'ORDER · Make '+nameOf(item(missing.family,missing.tier,missing.line))+' · use the board';
  }
 }
 if(state.stage===0&&state.landingStep===1){
  const g=visibleGoal();
  if(g&&ready(state,g.needs))return 'CROSSING READY · View routes above';
  const missing=g.needs.find(r=>count(state,r)<r.count);
  if(missing.family==='chart'&&!state.taps.chart)return 'NEW MACHINE · Tap Survey Kite for map parts';
  return 'NEXT · Merge parts into a '+nameOf(item(missing.family,missing.tier,missing.line));
 }
 if(state.stage===1)return 'Choose a crossing above · keep the other tool';if(state.stage===2){const g=visibleGoal();return g.action==='prime'&&ready(state,g.needs)?'LOOP CELL READY · Tap Charge Stone Lift':g.text;}if(state.stage===3)return state.journey.kit?'RINGS AWAKE · Open the Tideglass Vault':'Choose tool finds or survey finds · pack one kit';if(state.stage===4&&!state.journey.engine)return 'Inside: a dormant engine · restore it for enriched production';if(state.stage===4&&!state.journey.infusions)return 'Use a Loop Cell on the producer you want to enrich';if(state.journey.boost)return SOURCES[state.journey.boost.family].name+' · '+state.journey.boost.left+' enriched pulls ready';return 'Merge twins · choose where to use them';}
function missionSlots(){
 const g=visibleGoal();if(g?.kind==='camp')return g.cost?`<span class="need campNeed"><img class="art" src="assets/premium/${g.image}.webp" alt=""><b>${Math.min(g.supplies,g.cost)}/${g.cost} ◆</b></span>`:needsHTML(g.needs);
 if(state.stage===3&&!state.journey.kit)return Object.entries(KITS).map(([id,k])=>`<button class="missionSlot engineChoice ${ready(state,k.needs)?'available':''}" data-kit="${id}" aria-label="${k.name}: ${k.needs.map(r=>nameOf(item(r.family,r.tier,r.line))).join(', ')}. ${k.reward}"><b>Open · ${k.name}</b><span class="kitItems">${needsHTML(k.needs)}</span><small>${k.reward}</small></button>`).join('');
 if(state.stage===4&&state.journey.engine&&!state.journey.infusions)return Object.entries(SOURCES).map(([id,p])=>`<button class="missionSlot engineChoice ${count(state,{family:'flux',tier:1})?'available':''}" data-infuse="${id}" aria-label="Enrich ${p.name}: one Loop Cell, three improved pulls">${art({type:'source',id})}<b>${p.name}</b><small>1 Loop Cell → 3 rich pulls</small></button>`).join('');
 if(state.stage===1)return Object.entries(ROUTES).map(([id,r])=>{
  const index=state.board.findIndex(x=>x?.type==='route'&&x.id===id),need={family:r.family,tier:2,count:1},can=routePrepared(state,id)&&ready(state,[need]);
  const reward=id==='ridge'?item('rig',1):item('flux',2);
  return `<button class="missionSlot routeChoice ${can?'available':''}" data-site-index="${index}" data-route="${id}" aria-label="${r.name}. Use one ${nameOf(item(r.family,2))}. Receive ${r.benefit}. ${r.kept}. ${can?'Ready to open':'Merge required item'}"><b>${r.name}</b><span class="routeCost">${art(item(r.family,2))}<span>${can?'USE':'MAKE'}<strong>${nameOf(item(r.family,2))}</strong></span></span><span class="routeReward">${art(reward)}<span>${r.reward}</span></span></button>`;
 }).join('');
 if(state.stage===2){
  const slot=(need,index,action,title,reward)=>{
   const can=!need||ready(state,[need]);
   return `<button class="missionSlot engineChoice ${can?'available':''}" data-site-index="${index}" data-engine-action="${action}" aria-label="${title}. ${need?'Use '+nameOf(item(need.family,need.tier))+'. ':''}${reward}. ${can?'Ready':'Merge required item'}"><b>${title}</b><span class="engineCost">${art(need?item(need.family,need.tier):state.board[index])}<span>${need?`${Math.min(count(state,need),need.count)}/${need.count} ${nameOf(item(need.family,need.tier))}`:'READY'}</span></span><small>${reward}</small></button>`;
  };
  const lift=state.board.findIndex(x=>x?.type==='site'&&x.kind==='winch');
  if(!state.seals.stabilization){
   const rock=state.board.findIndex(x=>x?.type==='rock'&&x.find==='winch');
   if(ready(state,[equipment('winch')])||rock<0)return slot(equipment('winch'),lift,'deploy','Repair Stone Lift','Open ground + survey parts');
   return slot({family:'rig',tier:2,count:1},rock,'clear','Recover winch','Keep equipment or repair the Lift')+slot({family:'flux',tier:2,count:1},rock,'restore','Restore Lift','Open ground + survey parts');
  }
  const targets=receivers(state);
  if(!targets.length)return anchors(state).filter(x=>x.kind!=='winch').map(x=>slot(equipment(x.kind),state.board.indexOf(x),'deploy',nameOf(x),x.kind==='scope'?'Relic supplies':'Refill sources + rich pulls')).join('');
  if(!optics(state).primed)return slot({family:'flux',tier:1,count:1},lift,'prime','Charge Stone Lift',ready(state,[{family:'flux',tier:1,count:1}])?'Use cell → wake the receiver':'Echo Crucible → merge two Violet Shards');
  const room=state.board.includes(null);
  return targets.map(i=>`<button class="missionSlot engineActivate ${room?'available':'blocked'}" data-site-index="${i}" data-engine-action="power" aria-label="${room?'Activate the rings':'Make one free space to activate the rings'} using ${nameOf(state.board[i])}. ${state.board[i].kind==='scope'?'Claim a relic case':'Receive a winch and three improved pulls'}"><span class="activateArt">${art(state.board[i])}</span><span class="activateCopy"><b>${room?'ACTIVATE RINGS →':'MAKE ONE SPACE'}</b><small>${nameOf(state.board[i])} · ${state.board[i].kind==='scope'?'Relic rewards':'Producer boost'}</small></span></button>`).join('');
 }
 return needsHTML(visibleGoal()?.needs??[]);
}
function renderWorkshop(){
 let crown=$('#fleetCrown');
 if(fleetEarned(state)){
  if(!crown){$('#scene').insertAdjacentHTML('beforeend','<button id="fleetCrown" type="button"><img src="assets/premium/tide-4.webp" alt="Ocean Crown"><span></span></button>');crown=$('#fleetCrown');}
  crown.classList.toggle('pending',fleetPending(state));crown.querySelector('span').textContent=fleetPending(state)?'REVEAL SIGNAL':'FLEET SIGNAL';
  crown.setAttribute('aria-label',fleetPending(state)?'Ocean Crown discovered: reveal the missing fleet signal':'Ocean Crown: revisit the fleet signal');
 }else crown?.remove();
 $('#scene').classList.toggle('fleetAwake',fleetEarned(state));
 let button=$('#workshop');
 if(!button){$('#scene').insertAdjacentHTML('beforeend','<button id="workshop"><img width="256" height="256" alt=""><span></span></button>');button=$('#workshop');}
 const restored=state.workshop.repaired,ready=state.requests.supplies>=WORKSHOP_COST;
 let pier=$('#campPierWorld');
 if(state.camp.pier&&!pier){$('#scene').insertAdjacentHTML('beforeend',`<button type="button" id="campPierWorld" aria-label="Supply Pier: view order rewards and supply cases">${art({type:'crate',kind:'salvage'})}<span>SUPPLY PIER</span></button>`);}
 else if(!state.camp.pier&&pier)pier.remove();
 pier=$('#campPierWorld');if(pier){pier.dataset.loft=state.camp.loft;pier.dataset.deep=state.camp.deepSurvey;{pier.innerHTML=state.camp.loft?'<img class="art" src="assets/premium/charting-loft.webp" alt="Charting Loft with treasure winch">'+(state.camp.deepSurvey?'<img class="deepInstrument" src="assets/premium/tide-3.webp" alt="Installed deep-survey instrument">':'')+'<span>'+(state.camp.deepSurvey?'DEEP SURVEY':'CHARTING LOFT')+'</span>':art({type:'crate',kind:'salvage'})+'<span>SUPPLY PIER</span>';pier.setAttribute('aria-label',state.camp.loft?(state.camp.deepSurvey?'Deep Survey Loft: recover Reef Compasses':'Charting Loft: recover treasures or upgrade Deep Survey'):'Supply Pier: develop Charting Loft for 20 camp supplies');}}
 // Reveal camp management only after the first landing milestone, not before
 // the player has learned the basic merge interaction.
 button.hidden=state.stage===0&&!state.landingStep&&!restored;
 const src='assets/premium/workshop-'+(restored?'operational':'damaged')+'.webp';
 if(button.querySelector('img').getAttribute('src')!==src)button.querySelector('img').src=src;
 button.dataset.state=state.workshop.precision?'precision':restored?'operational':'damaged';button.classList.toggle('repairReady',!restored&&ready);
 button.classList.toggle('pressAvailable',restored&&state.charges.rig>0&&state.energy>=2&&state.board.includes(null));
 button.querySelector('span').textContent=restored?'Press Grip · 2 ϟ':ready?'Repair · 8 ◆':`Workshop · ${state.requests.supplies}/8 ◆`;
 button.classList.toggle('precision',state.workshop.precision);
 if(state.workshop.precision&&!button.querySelector('.benchFitting'))button.insertAdjacentHTML('beforeend','<i class="benchFitting" aria-hidden="true">'+art(item('rig',2))+'</i>');
 let bench=$('#workshopBench');
 if(!bench){$('#scene').insertAdjacentHTML('beforeend','<button id="workshopBench"></button>');bench=$('#workshopBench');}
 bench.hidden=!restored;
 bench.classList.toggle('ready',state.workshop.precision?benchInputs(state).every(i=>i>=0)&&state.energy>=1&&state.charges.rig>0:state.requests.supplies>=BENCH_COST);
 bench.innerHTML=state.workshop.precision?art(item('rig',2))+'<span>Precision<br>Bench</span>':'<span>Precision Bench<br><b>'+Math.min(state.requests.supplies,BENCH_COST)+'/'+BENCH_COST+' ◆</b></span>';
 bench.setAttribute('aria-label',state.workshop.precision?'View Precision Bench recipe and fitting action':'View Precision Bench upgrade: '+BENCH_COST+' supplies. Grip tool and Ink scrap become a Split spanner.');
 button.setAttribute('aria-label',restored?'Coastal Workshop operational. Tap here to press a Grip tool for 2 energy and one Rover charge, or select Rivet Rover.':`Coastal Workshop damaged. Repair for 8 supplies. You have ${state.requests.supplies}.`);
}
function renderRequests(){
 $('#requests').hidden=state.stage===0&&!state.landingStep;
 $('#sideTray').hidden=state.stage===0&&!state.landingStep;
 const q=state.requests;
 const focused=q.orders.find(o=>o?.id===requestId);
 const missing=focused&&requestProgress(state,focused).progress.find(r=>r.current<r.count);
 const family=missing?.family&&sourceUnlocked(state,missing.family)?missing.family:focused?.needs.find(r=>sourceUnlocked(state,r.family))?.family??'rig';
 const action=state.workshop.repaired?(state.camp.pier
  ?state.camp.loft&&missing?.line==='tide'?`<button class="campAction" data-camp-action="recoverTide">${state.camp.deepSurvey?'Deep Survey':'Recover treasure'} · ${recoveryCost(state)}ϟ</button>`:`<button class="campAction ${q.supplies>=PACK_COST?'affordable':''}" data-camp-action="packPier" data-family="${family}" aria-label="Order a ${FAMILIES[family].name} supply case for ${PACK_COST} camp supplies">+${FAMILIES[family].name} case · ${PACK_COST}◆</button>`
  :`<button class="campAction ${q.supplies>=PIER_COST?'affordable':''}" data-camp-action="buildPier" aria-label="Build Supply Pier for ${PIER_COST} camp supplies">Build Pier · ${PIER_COST}◆</button>`):'';
 const primary=campGoal(state);
 const purpose=primary?.cost?primary.name+' · '+Math.min(primary.supplies,primary.cost)+'/'+primary.cost+' ◆'+(primary.supplies>=primary.cost?' · READY':''):primary?.action==='treasure'?'Recover & merge the next treasure':primary?.action==='orders'?'Orders fund Supply Pier cases':(state.camp.earlyFragments??0)<2?'Next order: Tide Dial Fragment':!state.workshop.repaired?'Workshop 8◆':!state.camp.pier?'Unlock useful supply cases':!state.camp.loft?'Charting Loft 20◆':state.camp.deepSurvey?(state.discovered.includes('chart:tide:4')?'Fulfill treasure orders':'Discover the Ocean Crown'):pearlDiscovered(state)?'Deep Survey 18◆':'Discover a Pearl Astrolabe';
 $('#requests').innerHTML=`<div class="requestHeading"><span>ORDERS <small>${purpose}</small></span><b title="Earn camp supplies by delivering orders">◆ <span id="supplies">${q.supplies}</span></b>${action}</div><div class="requestShelf">${q.orders.filter(Boolean).map(o=>{
 const p=requestProgress(state,o),active=requestId===o.id&&focus==='request',energy=Math.min(o.energy,120-state.energy);
 return `<button class="requestCard ${p.ready?'ready':''} ${active?'active':''}" data-request="${o.id}" aria-pressed="${active}" aria-label="${o.lane} request: ${o.needs.map(r=>r.count+' '+nameOf(item(r.family,r.tier,r.line))).join(', ')}. ${p.ready?active?'Deliver':'Ready. Tap once to collect':'In progress'}. Reward ${o.supplies} camp supplies${energy?` and ${energy} energy`:`, energy full`}"><b class="requestLane">${o.lane==='long'?'Expedition kit':o.lane==='quick'?'Quick':'Standard'}</b><span class="requestItems">${p.progress.map(r=>`<span>${art(item(r.family,r.tier,r.line))}<b>${r.current}/${r.count}</b>${r.protected?'<i title="One copy kept for expedition">◆</i>':''}</span>`).join('')}</span><span class="requestReward">+${o.supplies} ◆${energy?` · +${energy} ϟ`:``}</span><strong>${p.ready?'✓ COLLECT':active&&p.progress.some(r=>r.protected)?'MAKE SPARE':'MAKE'}</strong></button>`;
 }).join('')}</div>`;
}
function renderSide(){
 let switcher=$('#vaultGoalSwitch');if(!switcher){$('#sideTray').insertAdjacentHTML('beforeend','<button id="vaultGoalSwitch" type="button"></button>');switcher=$('#vaultGoalSwitch');switcher.onclick=()=>{showVaultGoal=!showVaultGoal;render();$('.objective').scrollIntoView({block:'nearest'});};}switcher.hidden=state.stage!==4||!campGoal(state);switcher.textContent=showVaultGoal?'Return to camp development':'Explore the vault engine & collection goals';
 if(state.stage===0&&!state.landingStep){$('#contracts').innerHTML='';$('#contracts').hidden=true;return;}
 $('#contracts').hidden=false;
 const choice=sideChoice(),c=normalContract(state),op=opportunity(state),rare=choice==='discovery';
 const needs=choice==='contract'?c.needs:rare?[{family:'chart',tier:2,count:1}]:choice==='opportunity'?op.needs:[];
 const can=choice!=='startOpportunity'&&ready(state,needs)&&(rare?state.board.some(x=>x?.type==='glyph'):choice==='opportunity'?op.remaining>0:true);
 const title=choice==='contract'?c.vaultTrade?'Cell exchange':c.exchange?'Equipment swap':'Supply run':rare?'Relic find':'Passing signal';
 const reward=choice==='contract'?(c.exchange?art(c.exchange)+(c.surge?'<span class="tradeSurge">+3 rich pulls</span>':''):'+'+c.energy+' ϟ'):rare?'Richer drops':'3 rich pulls';
 $('#contracts').innerHTML=`<button class="contract ${rare?'discovery':choice.includes('pportunity')?'opportunity':''} ${can?'ready':''}" data-contract="${choice}" data-requirements="${needs.length}" aria-label="Optional: ${title} ${can?'ready to use':''}"><span class="contractHead">${portrait(rare?'neri':'ivo')}<span><small>OPTIONAL</small><b>${title}</b></span></span><span class="needs">${rare?art({type:'glyph'}):''}${needsHTML(needs)}</span><span class="reward">${reward}<small ${choice==='opportunity'?'id="opClock"':''}>${can?'✓ READY':choice==='startOpportunity'?'OPEN · 3 MIN':choice==='opportunity'?Math.ceil(op.remaining/1000)+'s':'COLLECT'}</small></span></button><button class="sideMore" data-side-next aria-label="Other optional tasks" ${sideOptions().length<2?'hidden':''}>•••</button>`;
}
function render(){
 $('.world').classList.toggle('opened',state.stage===4);$('.destination').textContent=state.stage===4?'VAULT DISCOVERED':'OPEN THE TIDEGLASS VAULT';
 $('#energy').textContent=state.energy;$('#marks').textContent=state.marks;
 const viewStage=state.stage===0&&state.landingStep===1?1:state.stage;
 const sceneKey=viewStage+':'+state.post;if($('#scene').dataset.key!==sceneKey){$('#scene').innerHTML=scene(viewStage,state.post);$('#scene').dataset.key=sceneKey;}$('#sceneLabel').textContent=state.camp.fleetViewed?'Chapter 1 · fleet mystery milestone reached':visibleGoal()?.scene??STAGES[state.stage]?.scene??'The vault is open';
 renderWorkshop();
 $('.world').classList.toggle('pierBuilt',state.camp.pier);
 $('#chapterLabel').textContent=state.stage===4?'DISCOVERY · THE SKY WITHIN':'THE SALTGLASS REACH';
 $('.objective').dataset.stage=state.stage;$('.objective').dataset.journey=state.stage===4&&!state.journey.infusions?'active':'';
 const baseGoal=visibleGoal(),g=state.stage===3&&!state.journey.kit?{...baseGoal,needs:KITS[kitFocus].needs}:baseGoal;$('#goalTitle').textContent=g?.name??'Keep exploring the coast';$('#step').textContent=g?.phase??(state.stage<4?`${state.stage+1} / 4`:'DISCOVERED');
 $('#goalNeeds').innerHTML=missionSlots();$('#goalButton').textContent=g?.verb??'Journal';
 const goalReady=g?.kind==='camp'?!!g.ready:!!g&&g.action!=='inspect'&&ready(state,g.needs)&&(g.action!=='power'||state.board.includes(null));$('#goalButton').hidden=g?.kind==='camp'?false:!goalReady||state.stage===2||state.stage===3&&!state.journey.kit;$('#goalButton').disabled=false;
 $('.objective').classList.toggle('ready',goalReady);$('.objective').classList.remove('almost');$('#nextUnlock').textContent=g?.next??'';
 if(goalReady)$('#step').textContent=state.stage===2&&g?.action==='power'?'TAP BELOW':'READY';
 let seals=$('#sealStates');if(!seals){seals=document.createElement('div');seals.id='sealStates';$('.objective').append(seals);}
 seals.hidden=state.stage!==3||!state.journey.kit;seals.innerHTML=['navigation','stabilization','resonance'].map((k,n)=>`<span class="sealState ${state.seals[k]?'secured':''}" aria-label="${k} seal ${state.seals[k]?'secured':'unresolved'}"><i aria-hidden="true">${state.seals[k]?'✓':['◇','⌂','ϟ'][n]}</i>${['Navigate','Stabilize','Resonate'][n]}</span>`).join('');
 renderRequests();renderSide();const order=focus==='request'?state.requests.orders.find(o=>o?.id===requestId):null,orderProgress=order?requestProgress(state,order):null,c=order??normalContract(state),sideVisible=!!order||!$('#contracts').hidden&&$('#sideTray').open,cr=order?orderProgress.ready:sideVisible&&sideChoice()==='contract'&&ready(state,c.needs);
 const readySignal=sideChoice()==='opportunity'&&state.opportunity&&opportunity(state).remaining>0&&ready(state,state.opportunity.needs);
 const selectedItem=state.board[selected];
 board.dataset.site=viewStage;board.classList.toggle('firstMerge',state.merges===0&&state.stage===0&&!state.landingStep);board.setAttribute('aria-label',SITE_NAMES[viewStage]+' · 6 by 6 merge board');
 board.innerHTML=siteSurface(viewStage)+state.board.map((x,i)=>{
  const isSource=x?.type==='source',locked=isSource&&!sourceUnlocked(state,x.id);
  const useful=isSource&&!locked&&(orderProgress?orderProgress.progress.some(r=>r.family===x.id&&r.current<r.count):needed().some(r=>r.family===x.id&&count(state,r)<r.count));
  const expedition=!!g?.needs.some(r=>matches(x,r)),contract=sideVisible&&(!!order||sideChoice()==='contract')&&c.needs.some(r=>matches(x,r));
  const matching=selectedItem?.type==='item'&&x?.type==='item'&&i!==selected&&sameKind(x,selectedItem)&&x.tier<maxTier(x,state);
  return `<button class="tile ${x?.type??'empty'} ${locked?'locked':''} ${useful?'useful':''} ${selected===i?'selected':''} ${matching?'match':''} ${needed().some(r=>matches(x,r))?'wanted':''}" data-index="${i}" ${x?.family||isSource||x?.type==='crate'?`data-family="${x.family??(isSource?x.id:containerInfo(x).family)}"`:''} data-variant="${i%3}" data-use="${expedition&&contract?'both':expedition?'expedition':contract?'contract':''}" aria-label="${nameOf(x)}${x?.type==='crate'?' · tap to reveal · '+contents(x).map(nameOf).join(', '):''}${expedition&&contract?' · needed for expedition and contract':expedition?' · needed for expedition':contract?' · useful for contract':''}${locked?' · locked':isSource?' · '+SOURCES[x.id].cost+' energy · '+state.charges[x.id]+' charges':''}. Space ${i+1}" aria-pressed="${selected===i}">${art((x?.type==='site'&&state.stage<2||x?.type==='route'&&state.stage!==1)?{type:'sealed'}:x)}${expedition||contract?`<span class="useBadge" aria-hidden="true">${expedition?'◆':''}${contract?'▰':''}</span>`:''}${isSource?(locked?`<span class="lockedLabel">${x.id==='chart'?'CLEAR PATH':'EXCAVATE'}</span>`:`<span class="energyCue">ϟ${SOURCES[x.id].cost}</span><span class="charge">${Array.from({length:7},(_,n)=>`<i class="${n>=state.charges[x.id]?'used':''}"></i>`).join('')}</span>`):x?.type==='crate'?`<span class="pulls">${x.left}</span>`:''}</button>`;
 }).join('');
 const poweredTargets=linkPhase(state)&&optics(state).primed?receivers(state):[];
 for(const tile of board.querySelectorAll('.tile.source'))tile.classList.toggle('engineCharged',state.journey.boost?.family===state.board[+tile.dataset.index].id);
 for(const tile of board.querySelectorAll('.tile.rock')){
  const x=state.board[+tile.dataset.index];if(!FINDS[x.find])continue;
  tile.classList.add('surveyed');tile.setAttribute('aria-label',FINDS[x.find].name+' · recover with a spanner'+(canRestore(state,x)?' or restore with a pulse coil':''));
  tile.insertAdjacentHTML('beforeend',`<span class="findPeek" aria-hidden="true">${art(item(FINDS[x.find].family,3))}</span>`);
 }
 const pair=openingPair(state);if(pair.length===2)for(const i of pair)board.querySelector(`[data-index="${i}"]`).classList.add('openingPair');
 for(const tile of board.querySelectorAll('.tile')){const i=+tile.dataset.index;if(useAction(state,selected,i)||useAction(state,i,selected))tile.classList.add('useTarget','match');}
 for(const tile of board.querySelectorAll('.tile.item')){const x=state.board[+tile.dataset.index];tile.dataset.tier=x.tier;tile.classList.toggle('deliveryReady',(goalReady&&g.needs.some(r=>matches(x,r)))||(cr&&(orderProgress?orderProgress.indices.includes(+tile.dataset.index):c.needs.some(r=>matches(x,r)))));}
 for(const tile of board.querySelectorAll('.tile.site,.tile.route')){
  const x=state.board[+tile.dataset.index],need=x.type==='route'?{family:ROUTES[x.id].family,tier:2,count:1}:equipment(x.kind);
  const can=x.type==='route'?state.stage===1&&routePrepared(state,x.id)&&ready(state,[need]):state.stage===2&&x.phase==='idle'&&g.needs.some(r=>r.family===need.family&&r.tier===need.tier)&&ready(state,[need]);
  tile.classList.toggle('deliveryReady',can);tile.classList.toggle('match',can&&matches(selectedItem,need));tile.classList.toggle('useTarget',can&&matches(selectedItem,need));tile.dataset.phase=x.phase??'buried';
  const power=poweredTargets.includes(+tile.dataset.index);if(power)tile.classList.add('deliveryReady');
  if(state.stage>=2&&x.type==='site'||state.stage===1&&x.type==='route')tile.insertAdjacentHTML('beforeend',`<span class="anchorCue">${power?'POWER':x.phase==='done'?'✓':can?'USE':''}</span>`);
  tile.classList.toggle('engineCharged',x.type==='site'&&x.kind==='winch'&&optics(state).primed);tile.classList.toggle('enginePowered',state.seals.resonance&&state.seals.link.at(-1)===+tile.dataset.index);
  tile.setAttribute('aria-label',state.stage<2&&x.type==='site'?'Buried device':nameOf(x));
 }
 for(const tile of board.querySelectorAll('.tile.item,.tile.glyph')){const x=state.board[+tile.dataset.index];if((readySignal&&state.opportunity.needs.some(r=>matches(x,r)))||($('.discovery.ready')&&(x.type==='glyph'||matches(x,{family:'chart',tier:2}))))tile.classList.add('deliveryReady');}
 $('#free').textContent=state.board.filter(x=>x===null).length+' spaces';$('#hint').textContent=hint();$('#rationButton').hidden=state.energy>3;renderSelection();
 if(state.surge>0){$('#free').textContent=`ϟ SURGE · ${state.surge} pulls`;$('#free').title='Shared by all producers. Choose which family gets improved parts. No timer.';board.dataset.event='surge';}else{delete board.dataset.event;$('#free').removeAttribute('title');}
 if(state.discovery&&!state.discoveryDone&&!state.opportunity&&state.board.some(x=>x?.type==='glyph')){const label=$('.discovery .reward small');if(label&&state.board.some(x=>x?.type==='glyph')&&!ready(state,[{family:'chart',tier:2,count:1}]))label.textContent='1 LENS LEFT';}
}
function renderSelection(){
 const x=state.board[selected];let title=state.stage<4?'Open the Tideglass Vault':'The star ocean awaits',desc=state.stage<4?'Merge identical objects. Choose expedition progress or supplies.':state.journey.engine?'Use Loop Cells on producers for enriched runs.':'Restore the engine inside with a spanner, lens and coil.',buttons='';
 if(!x&&focus==='goal'&&visibleGoal()?.kind==='camp'){title=visibleGoal().name;desc=visibleGoal().next;}
 if(!x&&focus==='request'){
  const order=state.requests.orders.find(o=>o?.id===requestId);
  if(order){const p=requestProgress(state,order),missing=p.progress.find(r=>r.current<r.count);
   const brief=requestBrief(order,state);
   title=p.ready?brief.title+' · ready':brief.title;
   desc=brief.reason+' '+(p.ready?'Tap the ready order to collect its reward.':missing?.line==='tide'?'Recover and merge Tide Treasures with Survey Kite.':'Make '+nameOf(item(missing.family,missing.tier,missing.line))+' using its producer.');
  }
 }
 if(!x&&!state.merges&&state.stage===0&&!state.landingStep){title='Start with the glowing pair';desc='Tap one Copper Offcut, then tap its twin. They become a Grip Tool.';}
 else if(!x&&state.stage===0&&!state.landingStep){title='Landing ready';desc='You made a Grip Tool. Tap CLEAR PATH above to open the landing.';}
 if(!x&&focus==='pier'){
  title=state.camp.deepSurvey?'Deep Survey Loft':state.camp.loft?'Charting Loft':'Develop the Supply Pier';
  desc=state.camp.deepSurvey?'Every recovery: Reef Compass · 3 energy + 1 Kite charge.':state.camp.loft?'Recovery: 2 energy + 1 Kite charge. Deep Survey unlocks two treasures and guaranteed compasses.':'Build a Charting Loft · permanently unlock Wayfinding treasures.';
  buttons='<span class="benchRoute tidePreview">'+TIDE_NAMES.map((_,tier)=>'<span class="'+(tier>2&&!state.camp.deepSurvey?'futureTreasure':'')+'">'+art(tideItem(tier))+'</span>').join('<span>→</span>')+'</span>';
  if(!state.camp.loft)buttons+=`<button class="accent" data-action="buildLoft">Build Loft · ${state.requests.supplies}/${LOFT_COST} ◆</button>`;
  else{
   buttons+=`<button class="accent" data-action="recoverTide">${state.camp.deepSurvey?'Deep Survey · Reef Compass':'Recover treasure'} · ${recoveryCost(state)} ϟ</button>`;
   if(!state.camp.deepSurvey)buttons+=`<button class="benchAction ${pearlDiscovered(state)&&state.requests.supplies>=DEEP_SURVEY_COST?'available':''}" data-action="upgradeLoft">${pearlDiscovered(state)?'Deep Survey · '+state.requests.supplies+'/'+DEEP_SURVEY_COST+' ◆':'Deep Survey · discover a Pearl Astrolabe'}</button>`;
   if(!state.charges.chart)buttons+='<button data-action="service" data-source="chart">Service Kite · 3 ϟ</button>';
  }
 }
 if(x){title=nameOf(x);
  if(x.type==='item'){
   const used=visibleGoal()?.needs.some(r=>matches(x,r)),cn=normalContract(state).needs.some(r=>matches(x,r));
   desc=(used&&cn?'◆ Expedition · ▰ Contract':used?'◆ Keep for expedition':cn?'▰ Deliver now, or merge further':'')+(x.tier===maxTier(x,state)?isTide(x)&&!state.camp.deepSurvey?' · Deep Survey unlocks two more treasures':' · Top discovery':` · ${nameOf(item(x.family,x.tier+1,x.line))}`);
   const site=anchors(state).find(v=>v.phase==='idle'&&matches(x,equipment(v.kind)));if(site&&state.stage>=2)desc=`Keep to merge · or use on ${nameOf(site)}${cn?' · also exchangeable':''}`;
   if(isTide(x))desc=(x.tier===0&&!state.camp.loft?'Early order reward → merge two for a Reef Compass · ':'Charting Loft → Survey Kite recovery · ')+(x.tier<maxTier(x,state)?'merge twins or deliver a tide order':!state.camp.deepSurvey?'Deep Survey unlocks two more treasures':'top treasure · deliver a tide order');
   if(loopCell(x)&&linkPhase(state)&&!optics(state).primed)desc='Use on the Stone Lift · power your receiver';
   buttons=`${site&&state.stage>=2?`<button class="accent" data-action="deploy" data-target="${state.board.indexOf(site)}">Use · ${ANCHORS[site.kind].short}</button>`:''}<button data-action="recycle">Recycle +${2**x.tier} ϟ</button>`;
   if(loopCell(x)&&linkPhase(state)&&!optics(state).primed)buttons='<button class="accent" data-action="prime" data-target="'+state.board.findIndex(v=>v?.type==='site'&&v.kind==='winch')+'">Use · Stone Lift</button>'+buttons;
  }else if(x.type==='source'){
   if(!sourceUnlocked(state,x.id))desc=`Unlock: ${x.id==='chart'?'stabilize the landing':'open a breach'}.`;
   else {desc=`${state.journey.boost?.family===x.id?'ENRICHED · '+state.journey.boost.left+' pulls · ':''}${state.surge>0?'SURGE · '+state.surge+' shared pulls · ':''}${state.charges[x.id]}/7 charges · Next: ${nameOf(nextOutput(state,x.id))}${burstOutput(state,x.id)?(state.taps[x.id]+1)%7===0?' + bonus tool':' + raw part':''}`;
    buttons=state.charges[x.id]?`<button class="accent" data-action="produce">Produce · ${SOURCES[x.id].cost} ϟ</button>`:'<button data-action="serviceTool">Service · tool</button><button class="accent" data-action="service">Service · 3 ϟ</button>';
   }
   if(x.id==='chart'&&state.camp.loft)buttons+=`<button class="accent" data-action="recoverTide">${state.camp.deepSurvey?'Deep Survey':'Recover'} ${nameOf(nextTide(state))} · ${recoveryCost(state)} ϟ</button>`;
   if(state.journey.engine)buttons+='<button class="accent" data-action="infuse">Enrich · 1 Loop Cell</button>';
   if(x.id==='rig'&&state.workshop.repaired&&state.charges.rig)buttons+='<button class="accent toolPress" data-action="press">Tool press · 2 ϟ</button>';
   if(x.id==='rig'&&state.workshop.repaired){
    const inputs=benchInputs(state),installed=state.workshop.precision;
    desc=installed?'Precision Bench · use spare materials, or keep them for requests':'Next: Precision Bench · fit a spanner from a tool and chart';
    const recipe=BENCH_NEEDS.map((r,n)=>'<span class="benchInput '+(inputs[n]>=0?'present':'missing')+'">'+art(item(r.family,r.tier,r.line))+'<small>'+(inputs[n]>=0?'✓':'0/1')+'</small></span>').join('');
    buttons+='<span class="benchRoute">'+recipe+'<span>→</span>'+art(item('rig',2))+'</span>';
    buttons+=installed?'<button class="benchAction '+(inputs.every(i=>i>=0)&&state.energy>=1&&state.charges.rig?'available':'')+'" data-action="fitSpanner">Fit spanner · 1 ϟ + 1 charge</button>':'<button class="benchAction '+(state.requests.supplies>=BENCH_COST?'available':'')+'" data-action="upgradeWorkshop">Install bench · 12 ◆</button>';
   }
  }else if(x.type==='rock'){
   const find=FINDS[x.find];
   if(find){title=find.name;desc='Recover portable equipment · or restore its device now';
    buttons=`<button class="findChoice ${ready(state,[{family:'rig',tier:2,count:1}])||state.board.some(v=>v?.type==='brace')?'available':''}" data-action="clear" aria-label="Recover ${FAMILIES[find.family].names[3]} using a split spanner">${art(item('rig',2))}<span>Recover</span>${art(item(find.family,3))}</button>${canRestore(state,x)?`<button class="findChoice ${ready(state,[{family:'flux',tier:2,count:1}])?'available':''}" data-action="restore" aria-label="Restore ${ANCHORS[x.find].name} using a pulse coil">${art(item('flux',2))}<span>Restore</span>${art(findSite(state,x))}</button>`:''}`;
   }else {desc='Use a split spanner. Find buried supplies.';buttons='<button class="accent" data-action="clear">Clear</button>';}
  }
  else if(x.type==='route'){desc=state.stage===1?ROUTES[x.id].benefit+'. '+ROUTES[x.id].kept+'.':'Choose a breach after the landing; the other opens with the vault.';if(state.stage===1)buttons=`<button class="accent" data-action="breach">Use ${FAMILIES[ROUTES[x.id].family].names[2]}</button>`;}
  else if(x.type==='site'){const a=ANCHORS[x.kind];title=state.stage<2?'Buried device':nameOf(x);desc=state.stage<2?'Clear a route to reach this equipment.':x.phase==='idle'?`${FAMILIES[a.equipment].names[3]} → ${a.effect}`:a.effect;if(state.stage>=2&&x.phase==='idle')buttons='<button class="accent" data-action="deploy">Use</button>';
   if(linkPhase(state)&&x.kind==='winch'){desc=optics(state).primed?'Charged · activate your prepared receiver':'Merge two Violet Shards from Echo Crucible';buttons=!optics(state).primed?'<button class="accent" data-action="prime">Use Loop Cell</button>':'';}
   if(linkPhase(state)&&x.kind!=='winch'&&x.phase==='done'){desc=x.kind==='scope'?'Activate → relic capsule + awakened rings':'Activate → pocket winch + 3 rich pulls';if(optics(state).primed)buttons='<button class="accent" data-action="power">Activate</button>';}

  }
  else if(x.type==='sealed')desc='Unchosen excavation ground. Opens when the vault is secured.';
  else if(x.type==='crate'){desc=`${containerInfo(x).purpose} · Tap on board to reveal. Drag to keep.`;}
  else if(x.type==='glyph'){desc='Use with a sight lens for richer source drops.';buttons='<button data-action="recycle">Recycle +5 ϟ</button>';}
  else if(x.type==='brace'){desc='Tap a saltstone blocker to use this brace.';buttons='<button data-action="recycle">Recycle +3 ϟ</button>';}
 }
 const preview=x?.type==='crate'?`<span class="mergePreview" aria-label="Remaining rewards">${contents(x).slice(0,3).map(y=>art(y)).join('')}</span>`:x?.type==='item'&&x.tier<maxTier(x,state)?`<span class="mergePreview" title="Merge further: ${nameOf(item(x.family,x.tier+1,x.line))}"><span>→</span>${art(item(x.family,x.tier+1,x.line))}</span>`:x?.type==='rock'?`<span class="mergePreview" title="Blocker reward: mixed expedition gear"><span>→</span>${art({type:'crate',kind:'locker'})}</span>`:'';
 const rare=x?.type==='source'&&sourceUnlocked(state,x.id)?`<span class="rareTrack" role="progressbar" aria-label="Guaranteed rare in ${9-state.taps[x.id]%9} pulls" aria-valuemin="0" aria-valuemax="9" aria-valuenow="${state.taps[x.id]%9}">${Array.from({length:9},(_,i)=>`<i class="${i<state.taps[x.id]%9?'filled':''}"></i>`).join('')}<b>✦ ${9-state.taps[x.id]%9}</b></span>`:'';
 $('#selection').innerHTML=`${x?`<span class="preview">${art(x)}</span>`:''}<span class="copy"><b>${title}</b><small>${desc}</small>${rare}</span>${preview}<span class="actionGroup">${buttons}</span>`;
}
function run(a){
 const now=Date.now(),delivery=deliveryItems(state,a,now).map(v=>({...v,rect:board.querySelector(`[data-index="${v.index}"]`)?.getBoundingClientRect()}));
 const beforeBoard=state.board.map(x=>x?JSON.stringify(x):null);
 const objectiveAction=['goal','breach','power','restoreEngine'].includes(a.type);const taskSelector=a.type==='infuse'?`[data-index="${state.board.findIndex(x=>x?.type==='source'&&x.id===a.id)}"]`:a.type==='fitSpanner'?'#workshopBench':['deploy','clear','restore','prime'].includes(a.type)?`[data-index="${a.index??state.board.findIndex(x=>x?.type==='site'&&x.kind==='winch')}"]`:objectiveAction?'.objective':a.type==='request'?`[data-request="${a.id}"]`:`[data-contract="${a.type}"]`;
 const taskRect=$(taskSelector)?.getBoundingClientRect();
 const taskSnapshot=delivery.length?snapshotTask($(taskSelector)):null;
 const projectBefore=a.type==='request'?campGoal(state):null;
 const energyBefore=state.energy,firstContract=state.contracts===0,surgeBefore=state.surge??0;
 const rewardOrigin=document.querySelector(a.type==='contract'||a.type==='opportunity'?'#contracts':'.objective')?.getBoundingClientRect();
 const before=state.stage,landingBefore=state.landingStep,from=['produce','press'].includes(a.type)?board.querySelector(`[data-index="${state.board.findIndex(x=>x?.type==='source'&&x.id===a.id)}"]`)?.getBoundingClientRect():null;
 const knownBefore=new Set(state.discovered);const result=act(state,a,now);message.textContent=result.message;
 if(!result.ok)return result;
 platform.startGameplay();if(result.event==='restoration'){focus='goal';selected=state.board.findIndex(x=>x?.type==='source'&&x.id==='rig');}else if(['milestone','deployment','contract','discovery','clear','turn'].includes(result.event)){focus='goal';selected=null;}if(a.type==='merge')selected=state.board[result.index]?.type==='prism'?null:result.index;render();persist();
 if(a.type==='goal'&&before===0&&landingBefore===1){for(const tile of board.querySelectorAll('.tile.item')){const x=state.board[+tile.dataset.index];if(x.tier===2&&['rig','chart'].includes(x.family))tile.classList.add('unlocked');}board.querySelectorAll('.rock.surveyed').forEach(tile=>tile.classList.add('unlocked'));}
 if(result.event==='milestone'&&state.stage<4)message.textContent=result.message;
 if(!delivery.length)feedback({event:result.event,tile:board.querySelector(`[data-index="${result.index}"]`),x:state.board[result.index],from:rewardOrigin,energyDelta:state.energy-energyBefore,stage:state.stage,firstContract,containerKind:result.containerKind,reveal:result.reveal,bonus:result.bonus,improved:result.improved,breakthrough:result.breakthrough,newDiscovery:result.newDiscovery,discoveryReward:result.discoveryReward,breakthroughUse:state.stage>=2&&!isTide(state.board[result.index])&&state.board[result.index]?.tier===3?anchors(state).filter(v=>v.phase==='idle'&&ANCHORS[v.kind].equipment===state.board[result.index].family).map(v=>'Use: '+ANCHORS[v.kind].short+' · or merge higher')[0]:null,surgeStarted:state.surge>surgeBefore});
 if(delivery.length){
  const rewards=state.board.flatMap((x,index)=>x&&['item','crate'].includes(x.type)&&JSON.stringify(x)!==beforeBoard[index]?[{index,x,rect:board.querySelector(`[data-index="${index}"]`)?.getBoundingClientRect()}]:[]);
  const next=['request','fitSpanner','restoreEngine','infuse'].includes(a.type)?result.message:['deploy','feed','clear','restore','prime'].includes(a.type)?result.message:continuation(state,a,rewards);message.textContent=next;
  deliverFeedback({kind:a.type,delivery,rewards,taskRect,taskSnapshot,task:$(taskSelector),energy:state.energy-energyBefore,next,stage:state.stage});
 }
 for(const i of result.reveal??[])board.querySelector(`[data-index="${i}"]`)?.classList.add('merge-pop');
 for(const i of result.opened??[])board.querySelector(`[data-index="${i}"]`)?.classList.add('clearedGround');
 if(result.restored!==undefined)board.querySelector(`[data-index="${result.restored}"]`)?.classList.add('unlocked');
 for(const i of result.operated??[])board.querySelector(`[data-index="${i}"]`)?.classList.add('unlocked');
 if(result.event==='milestone'&&(state.stage>before||state.landingStep>landingBefore)){const id=state.landingStep>landingBefore&&state.stage===0?'chart':state.stage===2?'flux':null;if(id)board.querySelector(`[data-index="${state.board.findIndex(x=>x?.type==='source'&&x.id===id)}"]`)?.classList.add('unlocked');}
 if(result.index!==null&&result.event!=='merge')board.querySelector(`[data-index="${result.index}"]`)?.classList.add('pop');
 if(result.discoveryReward){board.querySelector(`[data-index="${result.discoveryReward.index}"]`)?.classList.add('rewardLanded');}
 if(a.type==='restoreEngine'){moment('Star-ocean engine restored','Use a Loop Cell on a producer · three enriched pulls',item('flux',5));}
 if(a.type==='infuse'){moment(SOURCES[a.id].name+' enriched','Next three pulls · richer parts',item(a.id,1));}
 if(a.type==='upgradeLoft'){selected=null;focus='pier';render();moment('Deep Survey installed','Guaranteed compasses · two new treasures to merge',tideItem(3));sound.play('milestone');$('.world').classList.add('changed');}
 if(a.type==='buildLoft'){selected=null;focus='pier';render();moment('Charting Loft built','Survey Kite now recovers Tide Treasures · Neri can trace the missing coast',tideItem(1));sound.play('milestone');$('.world').classList.add('changed');}
 if(a.type==='recoverTide'){if(!knownBefore.has(discoveryKey(state.board[result.index]))){moment(nameOf(state.board[result.index]),'Wayfinding treasure · merge twins or deliver an order',state.board[result.index]);sound.play('rare');}board.querySelector(`[data-index="${result.index}"]`)?.classList.add('merge-pop');}
 if(result.tideFragment&&state.camp.earlyFragments===1){moment('First Tide Dial fragment','Neri: This fragment points toward a coast erased from the charts.',tideItem(0));}
 if(result.tideDiscovery){moment(nameOf(state.board[result.index]),state.board[result.index].tier===4?'Ocean Crown installed at the Loft · tap REVEAL SIGNAL to uncover the fleet’s message':state.board[result.index].tier===2&&!state.camp.deepSurvey?'Pearl discovered · Deep Survey is now available at the Loft':'New treasure · deliver it or merge toward '+TIDE_NAMES[Math.min(4,state.board[result.index].tier+1)],state.board[result.index]);}
 if(a.type==='request'&&projectBefore?.cost&&projectBefore.supplies<projectBefore.cost){
  const nowReady=campGoal(state);
  if(nowReady.name===projectBefore.name&&nowReady.supplies>=nowReady.cost){
   moment(projectBefore.name+' ready','You earned enough supplies · tap the camp improvement to build it');
   sound.play('milestone');$('.world').classList.add('changed');
  }
 }
 if(a.type==='buildPier'){moment('Supply Pier built','Camp orders now fund useful material cases', {type:'crate',kind:'salvage'});sound.play('milestone');$('.world').classList.add('changed');}
 if(a.type==='packPier'){moment('Supply case delivered','Tap the new case on the board to unpack useful parts', {type:'crate',kind:{rig:'salvage',chart:'survey',flux:'relic'}[a.family]});sound.play('rare');}
 if(a.type==='press'){sound.play('merge',1);board.querySelector(`[data-index="${result.index}"]`)?.classList.add('merge-pop');}
 if(result.event==='restoration'){moment(a.type==='upgradeWorkshop'?'Precision Bench installed':'Workshop restored',a.type==='upgradeWorkshop'?'Spare tool + chart → spanner':'Tap Workshop or Rivet Rover for a Grip tool · 2 energy + 1 charge',item('rig',a.type==='upgradeWorkshop'?2:1));sound.play('milestone');$('.world').classList.add('changed');board.querySelector('.source[data-family="rig"]')?.classList.add('unlocked');}
 if(a.type==='produce'||a.type==='press'){
  board.querySelector(`[data-index="${selected}"]`)?.classList.add('react');
  if(from&&!reduced()){const to=board.querySelector(`[data-index="${result.index}"]`)?.getBoundingClientRect();if(to){const el=document.createElement('div');el.className='flight';el.innerHTML=art(state.board[result.index]);el.style.cssText=`left:${from.x}px;top:${from.y}px;--dx:${to.x-from.x}px;--dy:${to.y-from.y}px`;document.body.append(el);setTimeout(()=>el.remove(),460);}}
 }
 if(result.event==='milestone'){
  $('.world').classList.remove('changed');void $('.world').offsetWidth;$('.world').classList.add('changed');
  platform.event([{type:'milestone_completed'}]);
  if(state.stage===4&&before<4){const reveal=()=>celebrate('A map of tomorrow.', 'Neri: The Vault is not a treasure room. Its moving stars chart a coast that does not yet exist. Who hid this map of the future? Complete camp orders, restore your expedition facilities, and recover the missing Tide instruments.');if(reduced())reveal();else setTimeout(reveal,850);}
 }
 return result;
}
function clickTile(i){
 const x=state.board[i],prev=state.board[selected];
 const link=circuit(state,i);if(x?.type==='site'&&link){run({type:'power',index:i});return;}
 if(selected===i&&['item','glyph','brace'].includes(x?.type)){selected=null;render();return;}
 const use=useAction(state,selected,i)??useAction(state,i,selected);if(use){run(use);return;}
 if(selected!==null&&selected!==i&&movable(prev)&&(!x||prev.type==='item'&&x.type==='item'&&sameKind(x,prev))){run({type:'merge',from:selected,to:i});return;}
 selected=i;render();
 if(x?.type==='crate')run({type:'crate',index:i});
 if(x?.type==='source'&&sourceUnlocked(state,x.id)&&state.charges[x.id]>0)run({type:'produce',id:x.id});
}
board.addEventListener('click',e=>{const tile=e.target.closest('[data-index]')??document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');if(tile&&board.contains(tile)&&performance.now()>suppressUntil)clickTile(+tile.dataset.index);});
board.addEventListener('pointerdown',e=>{const tile=e.target.closest('[data-index]');if(!tile||e.button!==0)return;suppressUntil=0;const i=+tile.dataset.index;if(!['item','crate','brace','glyph','prism'].includes(state.board[i]?.type))return;drag={from:i,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};tile.classList.add('picked');board.setPointerCapture?.(e.pointerId);});
board.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;if(drag.moved){board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('dragging');board.querySelectorAll('.target').forEach(x=>x.classList.remove('target'));const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');const to=target?+target.dataset.index:-1,a=state.board[drag.from],b=state.board[to];if(to>=0&&to!==drag.from&&(!b||(a?.type==='prism'&&movable(b))||b?.type==='prism'||(a?.type==='item'&&b.type==='item'&&sameKind(a,b)&&a.tier<maxTier(a,state))||useAction(state,drag.from,to)))target.classList.add('target');}});
board.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;board.querySelectorAll('.dragging,.target,.picked').forEach(x=>x.classList.remove('dragging','target','picked'));if(!d.moved)return;suppressUntil=performance.now()+300;const tile=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');if(tile){selected=d.from;const index=+tile.dataset.index,x=state.board[index];const use=useAction(state,d.from,index);if(use)run(use);else if(!x||movable(x))run({type:'merge',from:d.from,to:index});else render();}});
board.addEventListener('pointercancel',()=>{drag=null;board.querySelectorAll('.dragging,.target,.picked').forEach(x=>x.classList.remove('dragging','target','picked'));});
$('#selection').addEventListener('click',e=>{const button=e.target.closest('[data-action]'),type=button?.dataset.action;if(!type)return;const x=state.board[selected];run({type:type==='serviceTool'?'service':type,index:button.dataset.target!==undefined?+button.dataset.target:selected,from:button.dataset.target!==undefined?selected:undefined,id:button.dataset.source??x?.id,useTool:type==='serviceTool'});});
$('#goalButton').onclick=()=>{const g=visibleGoal();if(g?.kind==='camp'){
 if(g.action==='orders'){
   const o=state.requests.orders.find(o=>o?.id===g.orderId)??state.requests.orders.find(o=>o&&requestProgress(state,o).ready)??state.requests.orders.find(Boolean);
   if(o&&requestProgress(state,o).ready){requestId=null;focus='goal';run({type:'request',id:o.id});return;}
   requestId=o?.id??null;focus='request';selected=null;render();$('#requests').scrollIntoView({block:'nearest'});message.textContent=o?'Make the highlighted order items, then tap the order to collect '+o.supplies+' supplies.':'Deliver orders to earn camp supplies.';return;
  }
 if(g.action==='treasure'){const pair=state.board.flatMap((x,i)=>isTide(x)&&x.tier<maxTier(x,state)&&state.board.some((y,j)=>i!==j&&sameKind(x,y))?[i]:[]);selected=pair[0]??null;focus=pair.length?'goal':'pier';render();(pair.length?board:$('#selection')).scrollIntoView({block:'nearest'});return;}
 run({type:g.action});return;
 }if(g?.action==='inspect'){const choices=state.board.flatMap((x,i)=>(state.stage===1?x?.type==='route':x?.type==='site'&&x.phase!=='done')?[i]:[]);selected=choices[(choices.indexOf(selected)+1)%choices.length];focus='goal';render();message.textContent=g.text;return;}g?run({type:g.action??'goal'}):showJournal();};
$('#goalNeeds').onclick=e=>{focus='goal';const kit=e.target.closest('[data-kit]')?.dataset.kit;if(kit){kitFocus=kit;if(ready(state,KITS[kit].needs))run({type:'goal',kit});else{message.textContent=KITS[kit].needs.map(r=>nameOf(item(r.family,r.tier,r.line))).join(' + ');selected=null;render();}return;}const infusion=e.target.closest('[data-infuse]')?.dataset.infuse;if(infusion){run({type:'infuse',id:infusion});return;}const badge=e.target.closest('[data-site-index]');if(badge){selected=+badge.dataset.siteIndex;const x=state.board[selected];if(badge.dataset.engineAction){const action=badge.dataset.engineAction;if(badge.classList.contains('available')){run({type:action,index:selected});return;}render();$('#selection').scrollIntoView({block:'nearest'});return;}if(x?.type==='rock'){render();return;}const need=x?.type==='site'?equipment(x.kind):{family:ROUTES[x.id].family,tier:2,count:1};if((x.type==='route'&&state.stage===1||x.type==='site'&&x.phase==='idle')&&ready(state,[need])){run({type:x.type==='route'?'breach':'deploy',index:selected});return;}}render();message.textContent=visibleGoal()?.text??'Keep collecting rare discoveries.';};
$('#scene').onclick=e=>{
 if(e.target.closest('#fleetCrown')){showFleet();return;}
 if(e.target.closest('#campPierWorld')){selected=null;focus='pier';render();$('#selection').scrollIntoView({block:'nearest'});return;}
 if(e.target.closest('#workshopBench')){
  selected=state.board.findIndex(x=>x?.type==='source'&&x.id==='rig');focus='bench';render();
  $('#selection').scrollIntoView({block:'nearest'});return;
 }
 if(!e.target.closest('#workshop'))return;if(!state.workshop.repaired){const result=run({type:'restoreWorkshop'});if(!result.ok)message.textContent=`Camp requests fund repairs · ${state.requests.supplies}/${WORKSHOP_COST} supplies`;return;}selected=state.board.findIndex(x=>x?.type==='source'&&x.id==='rig');if(!state.charges.rig){render();$('#selection').scrollIntoView({block:'nearest'});return;}run({type:'press',id:'rig'});board.scrollIntoView({block:'center'});};
$('#requests').onclick=e=>{
 const camp=e.target.closest('[data-camp-action]');
 if(camp){const result=run({type:camp.dataset.campAction,family:camp.dataset.family});if(result.ok)board.scrollIntoView({block:'nearest'});return;}
 const id=e.target.closest('[data-request]')?.dataset.request;if(!id)return;
 const o=state.requests.orders.find(o=>o?.id===id);if(!o)return;
 if(requestProgress(state,o).ready){requestId=null;focus='goal';run({type:'request',id});return;}
 requestId=id;focus='request';selected=null;render();board.scrollIntoView({block:'nearest'});
};
$('#contracts').onclick=e=>{if(e.target.closest('[data-side-next]')){const choices=sideOptions();sideView=choices[(choices.indexOf(sideChoice())+1)%choices.length];render();return;}const type=e.target.closest('[data-contract]')?.dataset.contract;if(!type)return;
 if(type==='startOpportunity'){sideView='opportunity';run({type});focus='opportunity';render();return;}
 sideView=type;focus=type;const can=type==='contract'?ready(state,normalContract(state).needs):type==='opportunity'?(state.opportunity&&(Date.now()>state.opportunity.ends||ready(state,state.opportunity.needs))):state.board.some(x=>x?.type==='glyph')&&ready(state,[{family:'chart',tier:2,count:1}]);
 if(can)run({type});else{render();message.textContent=type==='discovery'?'Find a sight lens and an echo fragment.':hint();}
};
$('#soundButton').textContent=sound.enabled()?'Sound on':'Sound off';
$('#soundButton').onclick=()=>{$('#soundButton').textContent=sound.toggle()?'Sound on':'Sound off';sound.play('merge',2);};
$('#rationButton').onclick=()=>run({type:'ration'});
function celebrate(title,text){$('#celebrationContent').innerHTML=`${scene(state.stage,state.post)}<h2>${title}</h2><p>${text}</p>`;$('#celebration').showModal();}
function showFleet(){
 if(!fleetEarned(state))return;
 let step=0;const dialog=$('#fleetReveal');
 const draw=()=>{
  const entry=FLEET_LINES[step];
  $('#fleetDialogue').innerHTML=`<b>${entry.voice}</b><p>${entry.line}</p>`;
  $('#fleetProgress').textContent=`${step+1} / ${FLEET_LINES.length}`;
  $('#fleetNext').textContent=step===2?'Keep exploring':'Continue';
  $('#fleetMilestone').hidden=step!==2;
  dialog.dataset.beat=step;
 };
 $('#fleetNext').onclick=()=>{
  if(step<2){step++;draw();return;}
  run({type:'viewFleet'});dialog.close();
 };
 draw();dialog.showModal();sound.play('milestone');
}
function showJournal(){
 const story=storySnapshot(state);
 $('#journalContent').innerHTML=`<small>VAULTWAKE · FIELD JOURNAL</small><h2>The coast that vanished</h2><h3>Expedition report · ${story.expedition.title}</h3><p><b>${story.expedition.voice}:</b> ${story.expedition.line}</p><p><b>Unanswered:</b> ${story.expedition.question}</p><h3>Camp discoveries · ${story.camp.title}</h3><p><b>${story.camp.voice}:</b> ${story.camp.line}</p><p><b>Next clue:</b> ${story.camp.question}</p><h3>Your discoveries · ${state.discovered.length}/29</h3>${Object.entries(FAMILIES).map(([f,d])=>`<h3>${d.name}</h3><div class="collection">${d.names.map((n,t)=>`<div class="${state.discovered.includes(f+':'+t)?'':'unknown'}">${art(item(f,t))}<small>${n}</small></div>`).join('')}</div>`).join('')}<h3>Wayfinding · Tide treasures${state.camp.loft?'':' · build the Charting Loft'}</h3><div class="collection">${TIDE_NAMES.map((n,t)=>`<div class="${state.discovered.includes('chart:tide:'+t)?'':'unknown'}">${art(tideItem(t))}<small>${n}</small></div>`).join('')}</div><p>${state.contracts} contracts · ${state.merges} merges · ${state.marks} expedition merit</p>`;$('#journal').showModal();
}
$('#journalButton').onclick=showJournal;
$('#helpButton').onclick=()=>{$('#journalContent').innerHTML='<h2>The Tideglass Vault</h2><ul><li>MERGE twins to make useful equipment.</li><li>Complete ORDERS to earn restoration supplies. Spend supplies on the Workshop, Pier and Charting Loft to unlock new production and discoveries.</li><li>Make the two route tools, then choose working space or relic supplies. Repair the Stone lift next. Recover buried gear with a spanner, or restore its device with a coil.</li><li>Choose a receiver: Relic finder brings relic supplies; Power bridge recharges sources.</li><li>Merge two Violet Shards from Echo Crucible. Use their Loop Cell on the Stone Lift, then activate your chosen receiver to raise the vault rings.</li><li>DELIVER optional supplies, or keep them for the expedition. ••• shows other optional tasks.</li><li>OPEN rewards when you have room. Use a fragment with a sight lens for richer source drops.</li></ul>';$('#journal').showModal();};
for(const dialog of document.querySelectorAll('dialog')){dialog.querySelector('.close').onclick=()=>dialog.close();dialog.querySelector('.continue')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}
setInterval(()=>{const op=opportunity(state),clock=$('#opClock');if(op&&clock){clock.textContent=op.remaining?(ready(state,op.needs)?'✓ READY · ':'MAKE · ')+Math.ceil(op.remaining/1000)+'s':'PASSED · DISMISS';if(!op.remaining){const card=clock.closest('.contract');card.classList.remove('ready');card.removeAttribute('aria-label');}}},1000);
render();persist();platform.init();

