import {containerInfo,contents} from './containers.mjs';
import {SAVE_KEY,FAMILIES,SOURCES,STAGES,fresh,load,act,goal,count,ready,matches,nameOf,normalContract,opportunity,nextOutput,burstOutput,item,near,sourceUnlocked} from './core.mjs';
import {art,scene as vectorScene,portrait} from './art.mjs';
import {feedback,sound,reduced,snapshotTask} from './feedback.mjs';
import {platform} from '../v4/platform.mjs';
import {siteSurface,SITE_NAMES,deliveryItems,continuation} from './presentation.mjs';
import {deliverFeedback} from './feedback.mjs';
import {ANCHORS,ROUTES,FINDS,findSite,canRestore,equipment,anchors,activeAnchors} from './expedition.mjs';
import {enablePremium,prototypeScene} from './premium.mjs';
import {useAction,openingPair} from './interactions.mjs';
import {circuit,linkPhase,loopCell,beam,optics,movable,BAFFLES} from './seals.mjs';
const premium=new URLSearchParams(location.search).get('art')!=='classic';
if(premium){enablePremium(new URLSearchParams(location.search).get('art'));document.body.dataset.art='premium';document.body.dataset.palette=['r2','phase1'].includes(new URLSearchParams(location.search).get('art'))?'muted':'vibrant';}
const scene=premium?prototypeScene:vectorScene;
const $=s=>document.querySelector(s);
let state;try{state=load(localStorage.getItem(SAVE_KEY));}catch{state=fresh();}
let selected=null,focus='goal',drag=null,suppressUntil=0,sideView=null;
const board=$('#board'),message=$('#message');
function persist(){try{const raw=JSON.stringify(state);localStorage.setItem(SAVE_KEY,raw);platform.save(raw);}catch{message.textContent='Storage unavailable. This session is playable, but progress cannot be saved.';}}
function needed(){const x=state.board[selected];if(x?.type==='rock'&&FINDS[x.find])return [{family:'rig',tier:2,count:1},...(canRestore(state,x)?[{family:'flux',tier:2,count:1}]:[])];if(focus==='goal'&&x?.type==='site')return x.phase==='idle'?[equipment(x.kind)]:[];if(focus==='goal'&&x?.type==='route')return [{family:ROUTES[x.id].family,tier:2,count:1}];return focus==='contract'?normalContract(state).needs:focus==='opportunity'?state.opportunity?.needs??[]:focus==='discovery'?[{family:'chart',tier:2,count:1}]:goal(state)?.needs??[];}
function needsHTML(needs){return needs.map(r=>`<span class="need ${count(state,r)>=r.count?'done':near(state,[r])==='1 MERGE AWAY'?'almost':''}" title="${nameOf(item(r.family,r.tier))}">${art(item(r.family,r.tier))}<b>${count(state,r)>=r.count&&r.count===1?'✓':Math.min(count(state,r),r.count)+'/'+r.count}</b></span>`).join('');}
function sideOptions(){return ['contract',...(state.discovery&&!state.discoveryDone&&state.board.some(x=>x?.type==='glyph')?['discovery']:[]),...(state.stage>=1?[state.opportunity?'opportunity':'startOpportunity']:[])];}
function sideChoice(){const options=sideOptions();return options.includes(sideView)?sideView:state.opportunity?'opportunity':options.includes('discovery')?'discovery':'contract';}
function hint(){if(!state.merges)return 'Tap two matching copper offcuts';if(state.stage===0&&state.landingStep===1)return 'Prepare a Sight Lens + Split Spanner';if(state.stage===1)return 'Choose a route below';if(circuit(state))return 'Receiver lit · power the rings';if(linkPhase(state)&&optics(state).primed)return beam(state).stop==='stone'?'Stone blocks light · find another crossing':'Move & turn reflectors · clear the beam';if(linkPhase(state))return 'Use a Loop Cell on the lift';if(state.stage===2)return 'Recover gear · or restore machinery';return 'Merge twins · choose where to use them';}
function missionSlots(){
 if(state.stage===1)return Object.entries(ROUTES).map(([id,r])=>{const index=state.board.findIndex(x=>x?.type==='route'&&x.id===id),need={family:r.family,tier:2,count:1};return `<button class="missionSlot ${ready(state,[need])?'available':''}" data-site-index="${index}" aria-label="${r.name}: ${r.benefit}">${art(item(r.family,2))}<span>${id==='ridge'?'Room to work':'Relic supplies'}</span></button>`;}).join('<span class="or">or</span>');
 if(linkPhase(state)&&state.board.some(x=>x?.type==='site'&&x.kind!=='winch'&&x.phase==='done'))return `<span class="circuitRecipe">${art(optics(state).primed?{type:'prism',id:0,turn:0}:item('flux',1))}<span>${optics(state).primed?'Guide the light':'Power the lift'}<br><small>${optics(state).primed?'Relics or field gear':'One Loop Cell'}</small></span></span>`;
 if(state.stage===2)return anchors(state).filter(x=>state.seals.stabilization?x.kind!=='winch':x.kind==='winch').map(x=>{
  const buried=state.board.findIndex(v=>v?.type==='rock'&&v.find===x.kind);
  if(x.phase==='idle'&&buried>=0)return `<button class="missionSlot ${ready(state,[{family:'rig',tier:2,count:1}])||ready(state,[{family:'flux',tier:2,count:1}])?'available':''}" data-site-index="${buried}" aria-label="${FINDS[x.kind].name}: recover or restore">${art(item(FINDS[x.kind].family,3))}<span>Recover / Restore</span></button>`;
  return `<button class="missionSlot ${x.phase==='done'?'complete':ready(state,[equipment(x.kind)])?'available':''}" data-site-index="${state.board.indexOf(x)}" aria-label="${nameOf(x)}: ${x.phase==='done'?'ready':ANCHORS[x.kind].effect}">${art(item(ANCHORS[x.kind].equipment,3))}<span>${x.phase==='done'?'✓':ANCHORS[x.kind].short}</span></button>`;
 }).join('');
 return needsHTML(goal(state)?.needs??[]);
}
function renderSide(){
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
 const sceneKey=viewStage+':'+state.post;if($('#scene').dataset.key!==sceneKey){$('#scene').innerHTML=scene(viewStage,state.post);$('#scene').dataset.key=sceneKey;}$('#sceneLabel').textContent=goal(state)?.scene??STAGES[state.stage]?.scene??'The vault is open';
 $('#chapterLabel').textContent=state.stage===4?'DISCOVERY · THE SKY WITHIN':'THE SALTGLASS REACH';
 $('.objective').dataset.stage=state.stage;
 const g=goal(state);$('#goalTitle').textContent=g?.name??'Expedition complete';$('#step').textContent=state.stage<4?(g?.phase??`${state.stage+1} / 4`):'DISCOVERED';
 $('#goalNeeds').innerHTML=missionSlots();$('#goalButton').textContent=g?.verb??'Journal';
 const goalReady=!!g&&g.action!=='inspect'&&ready(state,g.needs);$('#goalButton').hidden=!goalReady;$('#goalButton').disabled=false;
 $('.objective').classList.toggle('ready',goalReady);$('.objective').classList.remove('almost');$('#nextUnlock').textContent=g?.next??'';
 if(goalReady)$('#step').textContent='READY';
 let seals=$('#sealStates');if(!seals){seals=document.createElement('div');seals.id='sealStates';$('.objective').append(seals);}
 seals.hidden=state.stage===0;seals.innerHTML=['navigation','stabilization','resonance'].map((k,n)=>`<span class="sealState ${state.seals[k]?'secured':''}" aria-label="${k} seal ${state.seals[k]?'secured':'unresolved'}"><i aria-hidden="true">${state.seals[k]?'✓':['◇','⌂','ϟ'][n]}</i>${['Navigate','Stabilize','Resonate'][n]}</span>`).join('');
 renderSide();const c=normalContract(state),sideVisible=!$('#contracts').hidden,cr=sideVisible&&sideChoice()==='contract'&&ready(state,c.needs);
 const readySignal=sideChoice()==='opportunity'&&state.opportunity&&opportunity(state).remaining>0&&ready(state,state.opportunity.needs);
 const selectedItem=state.board[selected];
 board.dataset.site=viewStage;board.setAttribute('aria-label',SITE_NAMES[viewStage]+' · 6 by 6 merge board');
 board.innerHTML=siteSurface(viewStage)+state.board.map((x,i)=>{
  const isSource=x?.type==='source',locked=isSource&&!sourceUnlocked(state,x.id);
  const useful=isSource&&!locked&&needed().some(r=>r.family===x.id&&count(state,r)<r.count);
  const expedition=!!g?.needs.some(r=>matches(x,r)),contract=sideVisible&&sideChoice()==='contract'&&c.needs.some(r=>matches(x,r));
  const matching=selectedItem?.type==='item'&&x?.type==='item'&&i!==selected&&x.family===selectedItem.family&&x.tier===selectedItem.tier&&x.tier<7;
  return `<button class="tile ${x?.type??'empty'} ${locked?'locked':''} ${useful?'useful':''} ${selected===i?'selected':''} ${matching?'match':''} ${needed().some(r=>matches(x,r))?'wanted':''}" data-index="${i}" ${x?.family||isSource||x?.type==='crate'?`data-family="${x.family??(isSource?x.id:containerInfo(x).family)}"`:''} data-variant="${i%3}" data-use="${expedition&&contract?'both':expedition?'expedition':contract?'contract':''}" aria-label="${nameOf(x)}${x?.type==='crate'?' · tap to reveal · '+contents(x).map(nameOf).join(', '):''}${expedition&&contract?' · needed for expedition and contract':expedition?' · needed for expedition':contract?' · useful for contract':''}${locked?' · locked':isSource?' · '+SOURCES[x.id].cost+' energy · '+state.charges[x.id]+' charges':''}. Space ${i+1}" aria-pressed="${selected===i}">${art(x?.type==='site'&&state.stage<2?{type:'sealed'}:x)}${expedition||contract?`<span class="useBadge" aria-hidden="true">${expedition?'◆':''}${contract?'▰':''}</span>`:''}${isSource?(locked?`<span class="lockedLabel">${x.id==='chart'?'CLEAR PATH':'EXCAVATE'}</span>`:`<span class="energyCue">ϟ${SOURCES[x.id].cost}</span><span class="charge">${Array.from({length:7},(_,n)=>`<i class="${n>=state.charges[x.id]?'used':''}"></i>`).join('')}</span>`):x?.type==='crate'?`<span class="pulls">${x.left}</span>`:''}</button>`;
 }).join('');
 const connected=circuit(state),ray=beam(state),wiring=linkPhase(state)&&optics(state).primed?ray.path:state.stage>=3?state.seals.link:null;
 if(wiring?.length){
  const ends=wiring.map(i=>[(i%6+.5)*100,(Math.floor(i/6)+.5)*100]);
  if(linkPhase(state)&&ray.stop==='stone'){const last=wiring.at(-1),next=ray.blocked;ends.push([((last%6+next%6)/2+.5)*100,((Math.floor(last/6)+Math.floor(next/6))/2+.5)*100]);}
  const points=ends.map(x=>x.join(',')).join(' ');
  board.insertAdjacentHTML('afterbegin',`<svg class="sealWire ${connected||state.seals.resonance?'live':''}" viewBox="0 0 600 600" aria-hidden="true"><polyline points="${points}"/></svg>`);
  for(const i of ray.prisms)board.querySelector(`[data-index="${i}"]`)?.classList.add('litReflector');
  if(ray.stop==='blocked')board.querySelector(`[data-index="${ray.blocked}"]`)?.classList.add('beamBlocked');
 }
 if(linkPhase(state)){
  for(const [a]of BAFFLES)board.insertAdjacentHTML('beforeend',`<span class="saltglassRib" style="left:${(a%6+1)*100/6}%;top:${Math.floor(a/6)*100/6}%" aria-hidden="true"></span>`);
  const lift=board.querySelector('.site[data-index="'+state.board.findIndex(x=>x?.type==='site'&&x.kind==='winch')+'"]');
  lift?.insertAdjacentHTML('beforeend',`<span class="emitterPort ${optics(state).direction===2?'south':'north'}" aria-hidden="true">${optics(state).direction===2?'▼':'▲'}</span>`);
  for(const tile of board.querySelectorAll('.tile.site'))if(state.board[+tile.dataset.index].kind!=='winch')tile.insertAdjacentHTML('beforeend','<span class="receiverPort top" aria-hidden="true"></span><span class="receiverPort bottom" aria-hidden="true"></span>');
  for(const tile of board.querySelectorAll('.tile.prism')){tile.insertAdjacentHTML('beforeend','<span class="turnCue" aria-hidden="true">↻</span>');tile.setAttribute('aria-label','Ring reflector · select then tap to turn, or drag to move');}
 }
 for(const tile of board.querySelectorAll('.tile.rock')){
  const x=state.board[+tile.dataset.index];if(!FINDS[x.find])continue;
  tile.classList.add('surveyed');tile.setAttribute('aria-label',FINDS[x.find].name+' · recover with a spanner'+(canRestore(state,x)?' or restore with a pulse coil':''));
  tile.insertAdjacentHTML('beforeend',`<span class="findPeek" aria-hidden="true">${art(item(FINDS[x.find].family,3))}</span>`);
 }
 const pair=openingPair(state);if(pair.length===2)for(const i of pair)board.querySelector(`[data-index="${i}"]`).classList.add('openingPair');
 for(const tile of board.querySelectorAll('.tile')){const i=+tile.dataset.index;if(useAction(state,selected,i)||useAction(state,i,selected))tile.classList.add('useTarget','match');}
 for(const tile of board.querySelectorAll('.tile.item')){const x=state.board[+tile.dataset.index];tile.dataset.tier=x.tier;tile.classList.toggle('deliveryReady',(goalReady&&g.needs.some(r=>matches(x,r)))||(cr&&c.needs.some(r=>matches(x,r))));}
 for(const tile of board.querySelectorAll('.tile.site,.tile.route')){
  const x=state.board[+tile.dataset.index],need=x.type==='route'?{family:ROUTES[x.id].family,tier:2,count:1}:equipment(x.kind);
  const can=x.type==='route'?state.stage===1&&ready(state,[need]):state.stage>=2&&x.phase==='idle'&&ready(state,[need]);
  tile.classList.toggle('deliveryReady',can);tile.classList.toggle('match',can&&matches(selectedItem,need));tile.classList.toggle('useTarget',can&&matches(selectedItem,need));tile.dataset.phase=x.phase??'buried';
  const power=connected&&(connected[0]===+tile.dataset.index||connected.at(-1)===+tile.dataset.index);if(power)tile.classList.add('deliveryReady');
  if(state.stage>=2&&x.type==='site'||state.stage===1&&x.type==='route')tile.insertAdjacentHTML('beforeend',`<span class="anchorCue">${power?'POWER':x.phase==='done'?'✓':can?'USE':''}</span>`);
  tile.setAttribute('aria-label',state.stage<2&&x.type==='site'?'Buried device':nameOf(x));
 }
 for(const tile of board.querySelectorAll('.tile.item,.tile.glyph')){const x=state.board[+tile.dataset.index];if((readySignal&&state.opportunity.needs.some(r=>matches(x,r)))||($('.discovery.ready')&&(x.type==='glyph'||matches(x,{family:'chart',tier:2}))))tile.classList.add('deliveryReady');}
 $('#free').textContent=state.board.filter(x=>x===null).length+' spaces';$('#hint').textContent=hint();$('#rationButton').hidden=state.energy>3;renderSelection();
 if(state.surge>0){$('#free').textContent=`ϟ SURGE · ${state.surge} pulls`;$('#free').title='Shared by all producers. Choose which family gets improved parts. No timer.';board.dataset.event='surge';}else{delete board.dataset.event;$('#free').removeAttribute('title');}
 if(state.discovery&&!state.discoveryDone&&!state.opportunity&&state.board.some(x=>x?.type==='glyph')){const label=$('.discovery .reward small');if(label&&state.board.some(x=>x?.type==='glyph')&&!ready(state,[{family:'chart',tier:2,count:1}]))label.textContent='1 LENS LEFT';}
}
function renderSelection(){
 const x=state.board[selected];let title=state.stage<4?'Open the Tideglass Vault':'The crossing is yours',desc=state.stage<4?'Merge identical objects. Choose expedition progress or supplies.':'Chart the star ocean, clear caches, or collect an aurora beacon.',buttons='';
 if(x){title=nameOf(x);
  if(x.type==='item'){
   const used=goal(state)?.needs.some(r=>matches(x,r)),cn=normalContract(state).needs.some(r=>matches(x,r));
   desc=(used&&cn?'◆ Expedition · ▰ Contract':used?'◆ Keep for expedition':cn?'▰ Deliver now, or merge further':'')+(x.tier===7?' · Top discovery':` · ${FAMILIES[x.family].names[x.tier+1]}`);
   const site=anchors(state).find(v=>v.phase==='idle'&&matches(x,equipment(v.kind)));if(site&&state.stage>=2)desc=`Keep to merge · or use on ${nameOf(site)}${cn?' · also exchangeable':''}`;
   if(loopCell(x)&&linkPhase(state)&&!optics(state).primed)desc='Use on the lift to light the beam · or keep to merge';
   buttons=`${site&&state.stage>=2?`<button class="accent" data-action="deploy" data-target="${state.board.indexOf(site)}">Use · ${ANCHORS[site.kind].short}</button>`:''}<button data-action="recycle">Recycle +${2**x.tier} ϟ</button>`;
  }else if(x.type==='prism'){
   desc='Drag to redirect light · tap again to turn';buttons='<button class="accent" data-action="turn">Turn ↻</button>';
  }else if(x.type==='source'){
   if(!sourceUnlocked(state,x.id))desc=`Unlock: ${x.id==='chart'?'stabilize the landing':'open a breach'}.`;
   else {desc=`${state.surge>0?'SURGE · '+state.surge+' shared pulls · ':''}${state.charges[x.id]}/7 charges · Next: ${nameOf(nextOutput(state,x.id))}${burstOutput(state,x.id)?(state.taps[x.id]+1)%7===0?' + bonus tool':' + raw part':''}`;
    buttons=state.charges[x.id]?`<button class="accent" data-action="produce">Produce · ${SOURCES[x.id].cost} ϟ</button>`:'<button data-action="serviceTool">Service · tool</button><button class="accent" data-action="service">Service · 3 ϟ</button>';
   }
  }else if(x.type==='rock'){
   const find=FINDS[x.find];
   if(find){title=find.name;desc='Recover the gear · or restore its site';
    buttons=`<button class="findChoice ${ready(state,[{family:'rig',tier:2,count:1}])||state.board.some(v=>v?.type==='brace')?'available':''}" data-action="clear" aria-label="Recover ${FAMILIES[find.family].names[3]} using a split spanner">${art(item('rig',2))}<span>Recover</span>${art(item(find.family,3))}</button>${canRestore(state,x)?`<button class="findChoice ${ready(state,[{family:'flux',tier:2,count:1}])?'available':''}" data-action="restore" aria-label="Restore ${ANCHORS[x.find].name} using a pulse coil">${art(item('flux',2))}<span>Restore</span>${art(findSite(state,x))}</button>`:''}`;
   }else {desc='Use a split spanner. Find buried supplies.';buttons='<button class="accent" data-action="clear">Clear</button>';}
  }
  else if(x.type==='route'){desc=state.stage===1?ROUTES[x.id].benefit+' · the other breach stays buried.':'Choose a breach after the landing; the other opens with the vault.';if(state.stage===1)buttons=`<button class="accent" data-action="breach">Use ${FAMILIES[ROUTES[x.id].family].names[2]}</button>`;}
  else if(x.type==='site'){const a=ANCHORS[x.kind];title=state.stage<2?'Buried device':nameOf(x);desc=state.stage<2?'Clear a route to reach this equipment.':x.phase==='idle'?`${FAMILIES[a.equipment].names[3]} → ${a.effect}`:a.effect;if(state.stage>=2&&x.phase==='idle')buttons='<button class="accent" data-action="deploy">Use</button>';
   if(linkPhase(state)&&x.kind==='winch'){desc=optics(state).primed?'Aim above or below the stone rib':'Use one Loop Cell to light the beam';buttons=`${!optics(state).primed?'<button class="accent" data-action="prime">Use Loop Cell</button>':''}<button data-action="turn">Turn ↕</button>`;}
   if(linkPhase(state)&&x.kind!=='winch'&&x.phase==='done')desc=x.kind==='scope'?'Receive light → sealed relic ampoule':'Receive light → winch + 3 rich pulls';
  }
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
 const objectiveAction=['goal','breach','power'].includes(a.type);const taskSelector=['deploy','clear','restore','prime'].includes(a.type)?`[data-index="${a.index??state.board.findIndex(x=>x?.type==='site'&&x.kind==='winch')}"]`:objectiveAction?'.objective':`[data-contract="${a.type}"]`;
 const taskRect=$(taskSelector)?.getBoundingClientRect();
 const taskSnapshot=delivery.length?snapshotTask($(taskSelector)):null;
 const energyBefore=state.energy,firstContract=state.contracts===0,surgeBefore=state.surge??0;
 const rewardOrigin=document.querySelector(a.type==='contract'||a.type==='opportunity'?'#contracts':'.objective')?.getBoundingClientRect();
 const before=state.stage,landingBefore=state.landingStep,from=a.type==='produce'?board.querySelector(`[data-index="${state.board.findIndex(x=>x?.type==='source'&&x.id===a.id)}"]`)?.getBoundingClientRect():null;
 const result=act(state,a,now);message.textContent=result.message;
 if(!result.ok)return result;
 platform.startGameplay();if(['milestone','deployment','contract','discovery','clear','turn'].includes(result.event)){focus='goal';selected=null;}if(a.type==='merge')selected=state.board[result.index]?.type==='prism'?null:result.index;render();persist();
 if(a.type==='goal'&&before===0&&landingBefore===1){for(const tile of board.querySelectorAll('.tile.item')){const x=state.board[+tile.dataset.index];if(x.tier===2&&['rig','chart'].includes(x.family))tile.classList.add('unlocked');}board.querySelectorAll('.rock.surveyed').forEach(tile=>tile.classList.add('unlocked'));}
 if(result.event==='milestone'&&state.stage<4)message.textContent=result.message+' unlocked. '+(goal(state)?.text??'');
 if(!delivery.length)feedback({event:result.event,tile:board.querySelector(`[data-index="${result.index}"]`),x:state.board[result.index],from:rewardOrigin,energyDelta:state.energy-energyBefore,stage:state.stage,firstContract,containerKind:result.containerKind,reveal:result.reveal,bonus:result.bonus,improved:result.improved,breakthrough:result.breakthrough,breakthroughUse:state.stage>=2&&state.board[result.index]?.tier===3?anchors(state).filter(v=>v.phase==='idle'&&ANCHORS[v.kind].equipment===state.board[result.index].family).map(v=>'Use: '+ANCHORS[v.kind].short+' · or merge higher')[0]:null,surgeStarted:state.surge>surgeBefore});
 if(delivery.length){
  const rewards=state.board.flatMap((x,index)=>x&&['item','crate'].includes(x.type)&&JSON.stringify(x)!==beforeBoard[index]?[{index,x,rect:board.querySelector(`[data-index="${index}"]`)?.getBoundingClientRect()}]:[]);
  const next=['deploy','feed','clear','restore','prime'].includes(a.type)?result.message:continuation(state,a,rewards);message.textContent=next;
  deliverFeedback({kind:a.type,delivery,rewards,taskRect,taskSnapshot,task:$(taskSelector),energy:state.energy-energyBefore,next,stage:state.stage});
 }
 for(const i of result.reveal??[])board.querySelector(`[data-index="${i}"]`)?.classList.add('merge-pop');
 for(const i of result.opened??[])board.querySelector(`[data-index="${i}"]`)?.classList.add('clearedGround');
 if(result.restored!==undefined)board.querySelector(`[data-index="${result.restored}"]`)?.classList.add('unlocked');
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
 if(selected===i&&x?.type==='prism'){run({type:'turn',index:i});return;}
 const link=circuit(state);if(x?.type==='site'&&link&&(i===link[0]||i===link.at(-1))){run({type:'power',index:i});return;}
 if(selected===i&&['item','glyph','brace'].includes(x?.type)){selected=null;render();return;}
 const use=useAction(state,selected,i)??useAction(state,i,selected);if(use){run(use);return;}
 if(selected!==null&&selected!==i&&movable(prev)&&(!x||prev.type==='item'&&x.type==='item'&&x.family===prev.family&&x.tier===prev.tier)){run({type:'merge',from:selected,to:i});return;}
 selected=i;render();
 if(x?.type==='crate')run({type:'crate',index:i});
 if(x?.type==='source'&&sourceUnlocked(state,x.id)&&state.charges[x.id]>0)run({type:'produce',id:x.id});
}
board.addEventListener('click',e=>{const tile=e.target.closest('[data-index]')??document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');if(tile&&board.contains(tile)&&performance.now()>suppressUntil)clickTile(+tile.dataset.index);});
board.addEventListener('pointerdown',e=>{const tile=e.target.closest('[data-index]');if(!tile||e.button!==0)return;suppressUntil=0;const i=+tile.dataset.index;if(!['item','crate','brace','glyph','prism'].includes(state.board[i]?.type))return;drag={from:i,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};tile.classList.add('picked');board.setPointerCapture?.(e.pointerId);});
board.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;if(drag.moved){board.querySelector(`[data-index="${drag.from}"]`)?.classList.add('dragging');board.querySelectorAll('.target').forEach(x=>x.classList.remove('target'));const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');const to=target?+target.dataset.index:-1,a=state.board[drag.from],b=state.board[to];if(to>=0&&to!==drag.from&&(!b||(a?.type==='prism'&&movable(b))||b?.type==='prism'||(a?.type==='item'&&b.type==='item'&&a.family===b.family&&a.tier===b.tier&&a.tier<7)||useAction(state,drag.from,to)))target.classList.add('target');}});
board.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;board.querySelectorAll('.dragging,.target,.picked').forEach(x=>x.classList.remove('dragging','target','picked'));if(!d.moved)return;suppressUntil=performance.now()+300;const tile=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');if(tile){selected=d.from;const index=+tile.dataset.index,x=state.board[index];const use=useAction(state,d.from,index);if(use)run(use);else if(!x||movable(x))run({type:'merge',from:d.from,to:index});else render();}});
board.addEventListener('pointercancel',()=>{drag=null;board.querySelectorAll('.dragging,.target,.picked').forEach(x=>x.classList.remove('dragging','target','picked'));});
$('#selection').addEventListener('click',e=>{const button=e.target.closest('[data-action]'),type=button?.dataset.action;if(!type)return;const x=state.board[selected];run({type:type==='serviceTool'?'service':type,index:button.dataset.target!==undefined?+button.dataset.target:selected,from:button.dataset.target!==undefined?selected:undefined,id:x?.id,useTool:type==='serviceTool'});});
$('#goalButton').onclick=()=>{const g=goal(state);if(g?.action==='inspect'){const choices=state.board.flatMap((x,i)=>(state.stage===1?x?.type==='route':x?.type==='site'&&x.phase!=='done')?[i]:[]);selected=choices[(choices.indexOf(selected)+1)%choices.length];focus='goal';render();message.textContent=g.text;return;}g?run({type:g.action??'goal'}):showJournal();};
$('#goalNeeds').onclick=e=>{focus='goal';const badge=e.target.closest('[data-site-index]');if(badge){selected=+badge.dataset.siteIndex;const x=state.board[selected];if(x?.type==='rock'){render();return;}const need=x?.type==='site'?equipment(x.kind):{family:ROUTES[x.id].family,tier:2,count:1};if((x.type==='route'&&state.stage===1||x.type==='site'&&x.phase==='idle')&&ready(state,[need])){run({type:x.type==='route'?'breach':'deploy',index:selected});return;}}render();message.textContent=goal(state)?.text??'Keep collecting rare discoveries.';};
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
$('#helpButton').onclick=()=>{$('#journalContent').innerHTML='<h2>The Tideglass Vault</h2><ul><li>MERGE twins to make useful equipment.</li><li>Survey a route, then repair the Stone lift. Recover buried gear with a spanner, or restore its device with a coil.</li><li>Choose a receiver: Relic finder brings relic supplies; Power bridge recharges sources.</li><li>Use one Loop Cell on the lift. Move and turn both reflectors to guide light around obstacles. Tap the lit receiver to power the rings.</li><li>DELIVER optional supplies, or keep them for the expedition. ••• shows other optional tasks.</li><li>OPEN rewards when you have room. Use a fragment with a sight lens for richer source drops.</li></ul>';$('#journal').showModal();};
for(const dialog of document.querySelectorAll('dialog')){dialog.querySelector('.close').onclick=()=>dialog.close();dialog.querySelector('.continue')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}
setInterval(()=>{const op=opportunity(state),clock=$('#opClock');if(op&&clock){clock.textContent=op.remaining?(ready(state,op.needs)?'✓ READY · ':'MAKE · ')+Math.ceil(op.remaining/1000)+'s':'PASSED · DISMISS';if(!op.remaining){const card=clock.closest('.contract');card.classList.remove('ready');card.removeAttribute('aria-label');}}},1000);
render();persist();platform.init();
