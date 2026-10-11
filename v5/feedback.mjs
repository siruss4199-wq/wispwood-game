import {art} from './art.mjs';
import {containerInfo} from './containers.mjs';
// Presentation-only effects. No timers here mutate game state.
import {platform} from '../v4/platform.mjs';
let audioContext=null,lastTone=0,enabled=false;
try{enabled=localStorage.getItem('vaultwake-sound')==='on';}catch{}
export const sound={
 enabled:()=>enabled,
 toggle(){enabled=!enabled;try{localStorage.setItem('vaultwake-sound',enabled?'on':'off');}catch{}return enabled;},
 play(kind,tier=0){
  if(!enabled||platform.audioMuted()||document.hidden||performance.now()-lastTone<55)return;
  lastTone=performance.now();
  try{
   const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return;
   audioContext??=new AC();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
   const notes=kind==='milestone'?[392,587,784]:kind==='contract'?[523,659]:kind==='rare'?[660,990]:kind==='merge'?[310+tier*55,470+tier*55]:[240];
   notes.forEach((hz,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain(),at=audioContext.currentTime+i*.058;o.type='sine';o.frequency.setValueAtTime(hz,at);o.frequency.exponentialRampToValueAtTime(hz*1.09,at+.12);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.025,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+.17);o.connect(g);g.connect(audioContext.destination);o.start(at);o.stop(at+.19);o.onended=()=>{o.disconnect();g.disconnect();};});
  }catch{/* Silent mode remains fully playable when browser audio is unavailable. */}
 }
};
export const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function transient(node,ms){document.body.append(node);setTimeout(()=>node.remove(),ms);return node;}
export function burst(rect,family='gold',important=false){
 if(!rect||reduced())return;
 const colors={rig:['#ffc78d','#f48462'],chart:['#9bf1fa','#50bcdd'],flux:['#ecc5ff','#aa7be5'],gold:['#ffe7a7','#e8b969']};
 const n=important?11:6,palette=colors[family]??colors.gold;
 for(let i=0;i<n;i++){const angle=2*Math.PI*i/n,span=important?42:25;const p=document.createElement('i');p.className='fxParticle '+(family==='rig'?'chip':'spark');p.style.cssText=`left:${rect.x+rect.width/2}px;top:${rect.y+rect.height/2}px;--dx:${Math.cos(angle)*span}px;--dy:${Math.sin(angle)*span}px;--turn:${i*71}deg;background:${palette[i%2]}`;transient(p,530);}
}
export function rewardFlight(from,to,label){
 if(!from||!to||reduced())return;
 const el=document.createElement('span');el.className='rewardFlight';el.textContent=label;el.style.cssText=`left:${from.x+from.width/2}px;top:${from.y+from.height/2}px;--dx:${to.x+to.width/2-from.x-from.width/2}px;--dy:${to.y+to.height/2-from.y-from.height/2}px`;transient(el,680);
}
export function moment(title,detail='',object=null){
 document.querySelector('.moment')?.remove();const el=document.createElement('div');el.className='moment';el.setAttribute('role','status');const b=document.createElement('b'),small=document.createElement('small');b.textContent=title;small.textContent=detail;if(object){const icon=document.createElement('span');icon.style.cssText='float:left;width:42px;height:42px;margin-right:10px';icon.innerHTML=art(object);icon.firstElementChild.style.cssText='width:100%;height:100%';el.append(icon);}el.append(b,small);transient(el,reduced()?2100:1750);
}
// Snapshot sprites outlive the synchronous render. Rules/save settle immediately;
// these flights never remove items, issue commands or block a second interaction.
export function deliverFeedback({kind,delivery,rewards,taskRect,taskSnapshot,task,energy,next,stage}){
 const main=kind==='goal'||kind==='breach',rare=kind==='discovery',signal=kind==='opportunity';
 const board=document.querySelector('#board');
 task?.classList.remove('taskCollected');if(task){void task.offsetWidth;task.classList.add('taskCollected');setTimeout(()=>task.classList.remove('taskCollected'),620);}
 board.classList.remove('sitePayoff','echoPayoff');void board.offsetWidth;if(main||rare)board.classList.add(main?'sitePayoff':'echoPayoff');
 const title=main?['','Landing secured','Door uncovered','Ring engine online','Tideglass Vault opened'][stage]:kind==='deploy'?'Equipment installed':kind==='feed'?'Echo imprinted':rare?'The echo answers':signal?'Signal received':'Supplies secured';
 moment(title,next);
 sound.play(main?'milestone':rare||signal?'rare':'contract');
 if(reduced()){
  // No motion: leave a brief receipt of precisely what was consumed at the task.
  if(taskRect){const receipt=document.createElement('div');receipt.className='deliveryReceipt';receipt.dataset.kind=kind;receipt.style.cssText=`left:${taskRect.x}px;top:${taskRect.y+taskRect.height-27}px;width:${taskRect.width}px`;receipt.innerHTML=delivery.map(v=>art(v.x)).join('')+'<b>✓ Delivered</b>';transient(receipt,700);}
  for(const v of rewards)document.querySelector(`[data-index="${v.index}"]`)?.classList.add('rewardLanded');
  return;
 }
 if(taskSnapshot&&taskRect){
  taskSnapshot.removeAttribute('id');taskSnapshot.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  taskSnapshot.classList.add('deliveryTask');taskSnapshot.setAttribute('aria-hidden','true');taskSnapshot.tabIndex=-1;
  taskSnapshot.querySelectorAll('button').forEach(el=>el.tabIndex=-1);
  taskSnapshot.style.cssText=`position:fixed;left:${taskRect.x}px;top:${taskRect.y}px;width:${taskRect.width}px;height:${taskRect.height}px;margin:0;pointer-events:none;z-index:38`;
  transient(taskSnapshot,480);
 }
 function travel(x,from,to,phase,delay=0){
  if(!from||!to)return;const el=document.createElement('div');el.className='deliveryObject '+phase;el.dataset.kind=kind;el.dataset.art=x.type==='item'?`${x.family}-${x.tier}`:x.type;
  el.innerHTML=art(x);el.style.cssText=`left:${from.x+from.width/2-22}px;top:${from.y+from.height/2-22}px;--dx:${to.x+to.width/2-from.x-from.width/2}px;--dy:${to.y+to.height/2-from.y-from.height/2}px;animation-delay:${delay}ms`;
  transient(el,delay+480);
 }
 delivery.forEach((v,i)=>travel(v.x,v.rect,taskRect,'collect',i*35));
 rewards.slice(0,6).forEach((v,i)=>travel(v.x,taskRect,v.rect,'return',360+i*20));
 rewards.forEach(v=>{const tile=document.querySelector(`[data-index="${v.index}"]`);tile?.classList.add('rewardLanded');});
 if(energy>0)rewardFlight(taskRect,document.querySelector('.resource')?.getBoundingClientRect(),`+${energy} ϟ`);
 burst(taskRect,rare?'flux':signal?'chart':'gold',main||rare||signal);
 if(main||rare)burst(board.getBoundingClientRect(),rare?'flux':'gold',true);
}
export function feedback({event,tile,x,from,energyDelta,stage,firstContract=false,containerKind,reveal=[],bonus,breakthrough,surgeStarted}){
 const rect=tile?.getBoundingClientRect();
 if(event==='merge'){
  tile?.classList.add('merge-pop');burst(rect,x?.family,x?.tier>=4);sound.play('merge',x?.tier??0);
  if(x?.tier>=4&&!reduced()){const b=document.querySelector('#board');b.classList.remove('impact');void b.offsetWidth;b.classList.add('impact');}
  if(breakthrough)moment(x.tier>=5?'Masterwork':'New equipment',`Source recharged${x.tier>=5?' · +4 energy':''}`,x);
 }else if(event==='produce'&&x?.type==='glyph'){burst(rect,'flux',true);sound.play('rare');moment('Echo fragment found','Decode it, or reclaim its energy');}
 else if(event==='clear'||event==='container'){const info=containerInfo({kind:containerKind});burst(rect,info.family,true);sound.play('rare');moment(event==='clear'?'Saltbound Locker uncovered':info.name,`${reveal.length} finds revealed${containerKind==='salvage'?' · Rover charge support':''}`,{type:'crate',kind:containerKind});}
 else if(event==='contract'){rewardFlight(from,document.querySelector('.resource').getBoundingClientRect(),`+${energyDelta} ϟ`);sound.play('contract');if(firstContract)moment('Supplies secured','Your first contract delivered');}
 else if(event==='milestone'){
  document.querySelector('.moment')?.remove();
  const world=document.querySelector('.world');burst(world.getBoundingClientRect(),'gold',true);sound.play('milestone');
  if(stage<4)moment(['','Survey Kite unlocked','Echo Crucible unlocked','The rings are awake'][stage],stage===2?'Excavation cache revealed':'Expedition advanced');
 }else if(event==='discovery'){sound.play('rare');burst(document.querySelector('.world').getBoundingClientRect(),'flux',true);}
 else if(event==='produce'&&bonus){burst(rect,bonus,true);sound.play('rare');moment({rig:'Rover spare found',chart:'Survey bundle found',flux:'Charged fragment found'}[bonus],'A useful bonus from this source');}
 else if(event==='produce')sound.play('produce');
 if(surgeStarted){const existing=document.querySelector('.moment small');if(existing)existing.textContent+=' · Supply Surge: 3 shared pulls';else moment('Supply Surge · 3 pulls','Choose a producer: improved parts, shared allowance');}
}
