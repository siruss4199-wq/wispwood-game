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
import {boardCoach} from './action-guide.mjs';
const premium=new URLSearchParams(location.search).get('art')!=='classic';
if(premium){enablePremium(new URLSearchParams(location.search).get('art'));document.body.dataset.art='premium';document.body.dataset.palette=['r2','phase1'].includes(new URLSearchParams(location.search).get('art'))?'muted':'vibrant';}
const scene=premium?prototypeScene:vectorScene;
const $=s=>document.querySelector(s);
let state;try{state=load(localStorage.getItem(SAVE_KEY));}catch{state=fresh();}
let selected=null,focus='goal',drag=null,suppressUntil=0,sideView=null,coachIndex=null,spotlight=null,coachExpanded=false;
const board=$('#board'),message=$('#message');
function persist(){try{const raw=JSON.stringify(state);localStorage.setItem(SAVE_KEY,raw);platform.save(raw);}catch{message.textContent='Storage unavailable. This session is playable, but progress cannot be saved.';}}
function needed(){const x=state.board[selected];if(focus==='goal'&&x?.type==='site')return x.phase==='idle'?[equipment(x.kind)]:[];if(focus==='goal'&&x?.type==='route')return [{family:ROUTES[x.id].family,tier:2,count:1}];return focus==='contract'?normalContract(state).needs:focus==='opportunity'?state.opportunity?.needs??[]:focus==='discovery'?[{family:'chart',tier:2,count:1}]:goal(state)?.needs??[];}
function needsHTML(needs,interactive=false){return needs.map(r=>{const tag=interactive?'button':'span';return `<${tag} class="need ${count(state,r)>=r.count?'done':near(state,[r])==='1 MERGE AWAY'?'almost':''}" title="${nameOf(item(r.family,r.tier))}" ${interactive?`type="button" data-guide-family="${r.family}" aria-label="Find producer for ${nameOf(item(r.family,r.tier))}"`:''}>${art(item(r.family,r.tier))}<b>${count(state,r)>=r.count&&r.count===1?'✓':Math.min(count(state,r),r.count)+'/'+r.count}</b></${tag}>`;}).join('');}
function sideOptions(){return ['contract',...(state.discovery&&!state.discoveryDone&&state.board.some(x=>x?.type==='glyph')?['discovery']:[]),...(state.stage>=1?[state.opportunity?'opportunity':'startOpportunity']:[])];}
function sideChoice(){const options=sideOptions();return options.includes(sideView)?sideView:state.opportunity?'opportunity':options.includes('discovery')?'discovery':'contract';}
function hint(){return selected===null?objectiveGuide(state).short:objectGuide(state,selected).short;}
function missionSlots(){
 if(state.stage===1)return Object.entries(ROUTES).map(([id,r])=>{const index=state.board.findIndex(x=>x?.type==='route'&&x.id===id),need={family:r.family,tier:2,count:1};return `<button class="missionSlot ${ready(state,[need])?'available':''}" data-site-index="${index}" aria-label="${r.name}: costs ${nameOf(item(r.family,2))} and gives ${r.benefit}">${art(item(r.family,2))}<span>${id==='ridge'?'Ridge · More space':'Conduit · Relics'}</span></button>`;}).join('<span class="or">or</span>');
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
// The guide is an optional, compact visual action sheet, not another paragraph.
function closeCoach(clear=true){
 $('#guidePanel').hidden=true;$('#guideButton').setAttribute('aria-expanded','false');
 coachIndex=null;if(clear)spotlight=null;
 board.querySelector('.coachRoute')?.remove();
 for(const el of board.querySelectorAll('.coachOrigin,.coachDestination'))el.classList.remove('coachOrigin','coachDestination');
}
function paintSpotlight(){
 board.querySelector('.coachRoute')?.remove();
 for(const el of board.querySelectorAll('.coachOrigin,.coachDestination'))el.classList.remove('coachOrigin','coachDestination');
 if(!spotlight)return;
 const [from,to]=spotlight;
 for(const [index,className] of [[from,'coachOrigin'],[to,'coachDestination']]){
  if(index!==null&&index>=0)board.querySelector(`[data-index="${index}"]`)?.classList.add(className);
 }
 if(from===null||to===null||from<0||to<0||from===to)return;
 const a=board.querySelector(`[data-index="${from}"]`)?.getBoundingClientRect();
 const b=board.querySelector(`[data-index="${to}"]`)?.getBoundingClientRect();
 const surface=board.getBoundingClientRect();
 if(!a||!b||!surface.width||!surface.height)return;
 const x1=a.left+a.width/2-surface.left,y1=a.top+a.height/2-surface.top;
 const x2=b.left+b.width/2-surface.left,y2=b.top+b.height/2-surface.top;
 const dx=x2-x1,dy=y2-y1,d=Math.hypot(dx,dy)||1;
 const sx=x1+dx/d*19,sy=y1+dy/d*19,ex=x2-dx/d*21,ey=y2-dy/d*21;
 const bend=Math.min(29,d*.12),mx=(sx+ex)/2-dy/d*bend,my=(sy+ey)/2+dx/d*bend;
 board.insertAdjacentHTML('beforeend',`<svg class="coachRoute" width="${surface.width}" height="${surface.height}" viewBox="0 0 ${surface.width} ${surface.height}" aria-hidden="true"><defs><marker id="coachArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#0c827b" stroke-width="1.8"/></marker></defs><path d="M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}" fill="none" stroke="#fff2bb" stroke-width="7" stroke-linecap="round"/><path d="M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}" fill="none" stroke="#0c827b" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 5" marker-end="url(#coachArrow)"/></svg>`);
}
function renderCoach(){
 const panel=$('#guidePanel'),model=boardCoach(state,coachIndex);
 if(panel.hidden)return;
 const action=(a,secondary=false)=>a?`<button type="button" class="${secondary?'coachSecondary':'coachPrimary'}" data-coach-kind="${a.kind}" ${a.index!==undefined&&a.index!==null?`data-coach-index="${a.index}"`:''} ${a.id?`data-coach-id="${a.id}"`:''} ${a.from!==undefined?`data-coach-from="${a.from}"`:''}>${a.label}</button>`:'';
 const steps=model.icons.map((v,i)=>`${i?'<span class="coachConnector" aria-hidden="true">→</span>':''}<span class="coachStep">${art(v.x)}<small>${v.label}</small></span>`).join('');
 // The one visible line tells the player what this object DOES. Optional details
 // stay collapsed so the game, not an instruction manual, remains in view.
 const summary=model.summary??model.detail.split('. ')[0]+'.';
 const relevant=coachIndex===null?null:state.board[coachIndex];
 const icon=relevant?art(relevant):model.icons[0]?art(model.icons[0].x):'';
 panel.innerHTML=`<div class="coachTop"><span class="coachEyebrow">${relevant?.type==='rock'?'OPTIONAL OBSTACLE':relevant&&['sealed','marker','lock'].includes(relevant.type)?'LOCKED TERRAIN':relevant?.type==='glyph'?'OPTIONAL DISCOVERY':'NEXT ACTION'}</span><button type="button" class="coachClose" data-coach-kind="close" aria-label="Close guidance">×</button></div><div class="coachCompact"><span class="coachThumb">${icon}</span><div class="coachCopy"><b class="coachHeadline">${model.title}</b><p class="coachSummary">${summary}</p></div></div><div class="coachActions">${action(model.primary)}${action(model.secondary,true)}</div><button type="button" class="coachWhy" data-coach-kind="why" aria-expanded="${coachExpanded}">${coachExpanded?'LESS INFO −':'WHY?  ·  SEE HOW +'}</button><div class="coachDetails" ${coachExpanded?'':'hidden'}><div class="coachSequence">${steps}</div><p class="coachExplanation">${model.detail}</p></div>`;
 spotlight=[model.from,model.to];paintSpotlight();
}
function openCoach(index=null){
 coachExpanded=false;
 coachIndex=Number.isInteger(index)&&index>=0?index:null;
 $('#guidePanel').hidden=false;$('#guideButton').setAttribute('aria-expanded','true');
 renderCoach();
}
function goToGuideTarget(index,from=null){
 closeCoach(false);
 if(index===null||index<0){selected=null;focus='goal';render();const objective=$('.objective');objective.classList.remove('coachStory');void objective.offsetWidth;objective.classList.add('coachStory');objective.scrollIntoView({block:'nearest',behavior:'smooth'});message.textContent='Follow the MAIN STORY above. Bonus tasks can be skipped.';return;}
 selected=index;focus='goal';spotlight=[from,index];render();
 board.querySelector(`[data-index="${index}"]`)?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
 message.textContent='Highlighted target · '+nameOf(state.board[index])+'. Tap it to use or produce; matching items merge together.';
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
  return `<button class="tile ${x?.type??'empty'} ${locked?'locked':''} ${useful?'useful':''} ${selected===i?'selected':''} ${matching?'match':''} ${needed().some(r=>matches(x,r))?'wanted':''}" data-index="${i}" ${x?.family||isSource||x?.type==='crate'?`data-family="${x.family??(isSource?x.id:containerInfo(x).family)}"`:''} data-variant="${i%3}" data-use="${expedition&&contract?'both':expedition?'expedition':contract?'contract':''}" aria-label="${nameOf(x)}${x?.type==='crate'?' · tap to reveal · '+contents(x).map(nameOf).join(', '):''}${expedition&&contract?' · needed for expedition and contract':expedition?' · needed for expedition':contract?' · useful for contract':''}${locked?' · locked':isSource?' · '+SOURCES[x.id].cost+' energy · '+state.charges[x.id]+' charges':''}. Space ${i+1}" aria-pressed="${selected===i}">${art(x?.type==='site'&&state.stage<2?{type:'sealed'}:x)}${expedition||contract?`<span class="useBadge" aria-hidden="true">${expedition?'◆':''}${contract?'▰':''}</span>`:''}${isSource?(locked?`<span class="lockedLabel">${x.id==='chart'?'CLEAR PATH':'EXCAVATE'}</span>`:`<span class="energyCue">ϟ${SOURCES[x.id].cost}</span><span class="charge">${Array.from({length:7},(_,n)=>`<i class="${n>=state.charges[x.id]?'used':''}"></i>`).join('')}</span>`):x?.type==='crate'?`<span class="pulls">${x.left}</span>`:''}${x?.type==='glyph'?'<span class="boardRole echo">+ LENS</span>':x?.type==='rock'?'<span class="boardRole stone">SPANNER</span>':x?.type==='sealed'?'<span class="boardRole ground">LOCKED</span>':''}</button>`;
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
 $('#free').textContent=state.board.filter(x=>x===null).length+' spaces';$('#hint').textContent=hint();$('#rationButton').hidden=state.energy>3;renderSelection();if(!$('#guidePanel').hidden)renderCoach();else paintSpotlight();
 if(state.surge>0){$('#free').textContent=`ϟ SURGE · ${state.surge} pulls`;$('#free').title='Shared by all producers. Choose which family gets improved parts. No timer.';board.dataset.event='surge';}else{delete board.dataset.event;$('#free').removeAttribute('title');}
 if(state.discovery&&!state.discoveryDone&&!state.opportunity&&state.board.some(x=>x?.type==='glyph')){const label=$('.discovery .reward small');if(label&&state.board.some(x=>x?.type==='glyph')&&!ready(state,[{family:'chart',tier:2,count:1}]))label.textContent='MAKE SIGHT LENS';}
}
function renderSelection(){
 const x=state.board[selected],story=goal(state);
 let title=state.stage<4?'Main story · '+(story?.name??'Expedition'):'The crossing is yours';
 let desc=state.stage<4?'Follow the main story above. The bonus task can wait. Tap an item to learn what it does.':'Keep discovering combinations or open the journal.';
 let buttons='';
 if(x){
  title=nameOf(x);
  if(x.type==='item'){
   const family=FAMILIES[x.family],neededForStory=story?.needs.some(r=>matches(x,r));
   const neededForBonus=normalContract(state).needs.some(r=>matches(x,r));
   const twin=state.board.some((y,i)=>i!==selected&&y?.type==='item'&&y.family===x.family&&y.tier===x.tier);
   const site=state.stage>=2&&anchors(state).find(y=>y.phase==='idle'&&matches(x,equipment(y.kind)));
   desc=`${family.name} · Tier ${x.tier+1}/8 · ${neededForStory?'KEEP for main story':site?'Use on a device OR merge higher':neededForBonus?'Bonus delivery OR merge higher':twin?'Tap matching twin to merge':'Make a second matching item'}`;
   const learn=x.tier===7?'':twin?'<button class="accent" data-action="findTwin">Find twin</button>':`<button class="accent" data-action="focusSource" data-family="${x.family}">Make twin</button>`;
   buttons=`${site?`<button class="accent" data-action="deploy" data-target="${state.board.indexOf(site)}">Use · ${ANCHORS[site.kind].short}</button>`:learn}<button data-action="recycle">Recycle</button>`;
  }else if(x.type==='source'){
   if(!sourceUnlocked(state,x.id))desc=`PRODUCER · Unlock by ${x.id==='chart'?'securing the landing':'opening a breach'}.`;
   else {desc=`PRODUCER · ${FAMILIES[x.id].name} parts · ${state.charges[x.id]}/7 charges · Next: ${nameOf(nextOutput(state,x.id))}${state.surge>0?' · Rich pulls active':''}`;
    buttons=state.charges[x.id]?`<button class="accent" data-action="produce">Produce · ${SOURCES[x.id].cost} ϟ</button>`:'<button data-action="serviceTool">Service · tool</button><button class="accent" data-action="service">Service · 3 ϟ</button>';
   }
  }else if(x.type==='rock'){
   const canClear=state.board.some(y=>y?.type==='brace'||matches(y,{family:'rig',tier:2}));
   desc='SALTSTONE · Not mergeable. Spend a Split Spanner to uncover supplies.';
   buttons=canClear?'<button class="accent" data-action="clear">Clear stone</button>':'<button class="accent" data-action="focusSource" data-family="rig">Make spanner</button>';
  }else if(x.type==='route'){
   const r=ROUTES[x.id],needed={family:r.family,tier:2,count:1};
   desc=state.stage===1?`STORY CHOICE · ${r.benefit} · the other route stays sealed.`:'This route opens through the main story.';
   if(state.stage===1)buttons=ready(state,[needed])?`<button class="accent" data-action="breach">Use ${nameOf(item(r.family,2))}</button>`:`<button class="accent" data-action="focusSource" data-family="${r.family}">Make required item</button>`;
  }else if(x.type==='site'){
   const a=ANCHORS[x.kind],needed=equipment(x.kind);
   title=state.stage<2?'Buried device':nameOf(x);
   desc=state.stage<2?'Open a route first.':x.phase==='done'?'DEVICE COMPLETE · Its bonus is active.':`DEVICE · Needs ${nameOf(item(needed.family,needed.tier))} · ${a.effect}`;
   if(state.stage>=2&&x.phase==='idle')buttons=ready(state,[needed])?'<button class="accent" data-action="deploy">Use on device</button>':`<button class="accent" data-action="focusSource" data-family="${needed.family}">Make equipment</button>`;
  }else if(x.type==='sealed')desc='BURIED GROUND · Not an item. Continue the main story to uncover it.';
  else if(x.type==='crate')desc=`REWARD CACHE · ${containerInfo(x).purpose} · Tap it to unpack when there is room.`;
  else if(x.type==='glyph'){
   title='Echo fragment · bonus secret';
   desc=state.discoveryDone?'ECHO · Already decoded. Extra fragments are recyclable.':'ECHO FRAGMENT · Not mergeable. Use with a Sight Lens for permanent richer drops. Optional.';
   buttons=state.discoveryDone?'<button data-action="recycle">Recycle</button>':ready(state,[{family:'chart',tier:2,count:1}])?'<button class="accent" data-action="discovery">Decode fragment</button>':'<button class="accent" data-action="focusSource" data-family="chart">Make Sight Lens</button>';
  }else if(x.type==='brace'){desc='CLEARING TOOL · Tap a Saltstone blocker to reveal a cache.';buttons='<button data-action="recycle">Recycle</button>';}
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
 closeCoach();
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
 if(selected===i&&['item','glyph','brace'].includes(x?.type)){selected=null;closeCoach();render();return;}
 if(selected!==null&&selected!==i&&x?.type==='site'&&(prev?.type==='item'&&x.phase==='idle'&&matches(prev,equipment(x.kind)))){run({type:'deploy',from:selected,index:i});return;}
 if(selected!==null&&selected!==i&&x?.type==='route'&&prev?.type==='item'&&matches(prev,{family:ROUTES[x.id].family,tier:2})){run({type:'breach',from:selected,index:i});return;}
 if(selected!==null&&selected!==i&&prev?.type==='item'&&(!x||(x.type==='item'&&x.family===prev.family&&x.tier===prev.tier))){run({type:'merge',from:selected,to:i});return;}
 selected=i;closeCoach();render();
 if(x&&['rock','sealed','lock','marker','glyph','site','route'].includes(x.type))openCoach(i);
 if(x?.type==='crate')run({type:'crate',index:i});
 if(x?.type==='source'&&sourceUnlocked(state,x.id)&&state.charges[x.id]>0)run({type:'produce',id:x.id});
}
board.addEventListener('click',e=>{const tile=e.target.closest('[data-index]')??document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');if(tile&&board.contains(tile)&&performance.now()>suppressUntil)clickTile(+tile.dataset.index);});
board.addEventListener('pointerdown',e=>{const tile=e.target.closest('[data-index]');if(!tile||e.button!==0)return;const i=+tile.dataset.index;if(!['item','crate','brace','glyph'].includes(state.board[i]?.type))return;drag={from:i,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};tile.classList.add('picked');board.setPointerCapture?.(e.pointerId);});
board.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;if(drag.moved){board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('dragging');board.querySelectorAll('.target').forEach(x=>x.classList.remove('target'));const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');const to=target?+target.dataset.index:-1,a=state.board[drag.from],b=state.board[to];if(to>=0&&to!==drag.from&&(!b||(a?.type==='item'&&b.type==='item'&&a.family===b.family&&a.tier===b.tier&&a.tier<7)||(b?.type==='site'&&(a?.type==='item'&&b.phase==='idle'&&matches(a,equipment(b.kind))))||(b?.type==='route'&&matches(a,{family:ROUTES[b.id].family,tier:2}))))target.classList.add('target');}});
board.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;board.querySelectorAll('.dragging,.target,.picked').forEach(x=>x.classList.remove('dragging','target','picked'));if(!d.moved)return;suppressUntil=performance.now()+300;const tile=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');if(tile){selected=d.from;const index=+tile.dataset.index,x=state.board[index];run(x?.type==='site'?{type:'deploy',from:d.from,index}:x?.type==='route'?{type:'breach',from:d.from,index}:{type:'merge',from:d.from,to:index});}});
board.addEventListener('pointercancel',()=>{drag=null;board.querySelectorAll('.dragging,.target,.picked').forEach(x=>x.classList.remove('dragging','target','picked'));});
$('#selection').addEventListener('click',e=>{
 const button=e.target.closest('[data-action]'),type=button?.dataset.action;if(!type)return;
 const x=state.board[selected];
 if(type==='focusSource'){
  const family=button.dataset.family;
  selected=state.board.findIndex(z=>z?.type==='source'&&z.id===family);
  focus='goal';render();message.textContent='Tap '+SOURCES[family].name+' to make '+FAMILIES[family].name+' parts. Merge matching twins to craft higher tiers.';return;
 }
 if(type==='findTwin'){
  const twin=state.board.findIndex((z,i)=>i!==selected&&z?.type==='item'&&z.family===x?.family&&z.tier===x?.tier);
  if(twin>=0){board.querySelector(`[data-index="${twin}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});message.textContent='Matching '+nameOf(x)+' is highlighted. Tap it to merge with your selected item.';}
  return;
 }
 run({type:type==='serviceTool'?'service':type,index:button.dataset.target!==undefined?+button.dataset.target:selected,from:button.dataset.target!==undefined?selected:undefined,id:x?.id,useTool:type==='serviceTool'});
});
$('#goalButton').onclick=()=>{const g=goal(state);if(g?.action==='inspect'){const choices=state.board.flatMap((x,i)=>(state.stage===1?x?.type==='route':x?.type==='site'&&x.phase!=='done')?[i]:[]);selected=choices[(choices.indexOf(selected)+1)%choices.length];focus='goal';render();message.textContent=g.text;return;}g?run({type:g.action??'goal'}):showJournal();};
$('#goalNeeds').onclick=e=>{focus='goal';const requirement=e.target.closest('[data-guide-family]');
 if(requirement){
  const family=requirement.dataset.guideFamily;selected=state.board.findIndex(x=>x?.type==='source'&&x.id===family);
  render();message.textContent='Required for MAIN STORY: '+requirement.title+'. Tap '+SOURCES[family].name+' to produce and merge parts.';return;
 }
 const badge=e.target.closest('[data-site-index]');if(badge){selected=+badge.dataset.siteIndex;const x=state.board[selected],need=x?.type==='site'?equipment(x.kind):{family:ROUTES[x.id].family,tier:2,count:1};if((x.type==='route'&&state.stage===1||x.type==='site'&&x.phase==='idle')&&ready(state,[need])){run({type:x.type==='route'?'breach':'deploy',index:selected});return;}}render();message.textContent=goal(state)?.text??'Keep collecting rare discoveries.';};
$('#contracts').onclick=e=>{if(e.target.closest('[data-side-next]')){const choices=sideOptions();sideView=choices[(choices.indexOf(sideChoice())+1)%choices.length];render();return;}const type=e.target.closest('[data-contract]')?.dataset.contract;if(!type)return;
 if(type==='startOpportunity'){sideView='opportunity';run({type});focus='opportunity';render();return;}
 sideView=type;focus=type;const can=type==='contract'?ready(state,normalContract(state).needs):type==='opportunity'?(state.opportunity&&(Date.now()>state.opportunity.ends||ready(state,state.opportunity.needs))):state.board.some(x=>x?.type==='glyph')&&ready(state,[{family:'chart',tier:2,count:1}]);
 if(can)run({type});else{render();message.textContent=type==='discovery'?'BONUS: Decode the Echo fragment with a Sight Lens. You can skip this and keep following the main story.':hint();}
};
$('#guideButton').onclick=()=>{$('#guidePanel').hidden?openCoach(selected):closeCoach();};
$('#guidePanel').addEventListener('click',e=>{
 const target=e.target.closest('[data-coach-kind]');if(!target)return;
 const type=target.dataset.coachKind,index=target.hasAttribute('data-coach-index')?+target.dataset.coachIndex:null;
 const original=coachIndex;
 if(type==='close'){closeCoach();return;}
 if(type==='why'){coachExpanded=!coachExpanded;renderCoach();return;}
 if(type==='show'){goToGuideTarget(index,original);return;}
 if(type==='match'){selected=Number(target.dataset.coachFrom);goToGuideTarget(index,selected);selected=Number(target.dataset.coachFrom);render();message.textContent='1 → 2: Tap the glowing matching twin to MERGE these two identical items.';return;}
 if(type==='decode'){run({type:'discovery'});return;}
 if(type==='goal'){run({type:'goal'});return;}
 if(type==='clear'){run({type:'clear',index});return;}
 if(type==='deploy'){run({type:'deploy',index});return;}
 if(type==='breach'){run({type:'breach',index});return;}
 if(type==='crate'){run({type:'crate',index});return;}
 if(type==='produce'){run({type:'produce',id:target.dataset.coachId});return;}
});
$('#soundButton').textContent=sound.enabled()?'Sound on':'Sound off';
$('#soundButton').onclick=()=>{$('#soundButton').textContent=sound.toggle()?'Sound on':'Sound off';sound.play('merge',2);};
$('#rationButton').onclick=()=>run({type:'ration'});
function celebrate(title,text){$('#celebrationContent').innerHTML=`${scene(state.stage,state.post)}<h2>${title}</h2><p>${text}</p>`;$('#celebration').showModal();}
function showJournal(){
 $('#journalContent').innerHTML=`<small>VAULTWAKE · FIELD JOURNAL</small><h2>The Tideglass expedition</h2><p>Open a vault buried in the Saltglass Reach. Inside, an ocean of stars is waiting to move again.</p><h3>Your discoveries · ${state.discovered.length}/24</h3>${Object.entries(FAMILIES).map(([f,d])=>`<h3>${d.name}</h3><div class="collection">${d.names.map((n,t)=>`<div class="${state.discovered.includes(f+':'+t)?'':'unknown'}">${art(item(f,t))}<small>${n}</small></div>`).join('')}</div>`).join('')}<p>${state.contracts} contracts · ${state.merges} merges · ${state.marks} expedition merit</p>`;$('#journal').showModal();
}
$('#journalButton').onclick=showJournal;
$('#helpButton').onclick=()=>{$('#journalContent').innerHTML='<h2>How to play Vaultwake</h2><ul><li><b>MAIN STORY</b> (top): required to open the vault. Tap a needed item icon to locate the right producer.</li><li><b>BONUS</b> (below): optional rewards; safe to skip.</li><li><b>PRODUCE</b>: tap a machine to get parts. <b>MERGE</b>: tap or drag two identical items together to craft the next level.</li><li><b>ECHO FRAGMENT</b>: decode using one Sight Lens for permanently improved drops. This is optional, not a matching merge item.</li><li><b>SALTSTONE</b>: use a Split Spanner to clear and uncover a reward. Buried ground is not a merge item.</li><li>Tap any object to see its purpose and suggested next action.</li></ul>';$('#journal').showModal();};
for(const dialog of document.querySelectorAll('dialog')){dialog.querySelector('.close').onclick=()=>dialog.close();dialog.querySelector('.continue')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}
setInterval(()=>{const op=opportunity(state),clock=$('#opClock');if(op&&clock){clock.textContent=op.remaining?(ready(state,op.needs)?'✓ READY · ':'MAKE · ')+Math.ceil(op.remaining/1000)+'s':'PASSED · DISMISS';if(!op.remaining){const card=clock.closest('.contract');card.classList.remove('ready');card.removeAttribute('aria-label');}}},1000);
render();persist();platform.init();
