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
export function feedback({event,tile,x,from,energyDelta,stage,firstContract=false,containerKind,reveal=[],bonus}){
 const rect=tile?.getBoundingClientRect();
 if(event==='merge'){
  tile?.classList.add('merge-pop');burst(rect,x?.family,x?.tier>=4);sound.play('merge',x?.tier??0);
  if(x?.tier>=4&&!reduced()){const b=document.querySelector('#board');b.classList.remove('impact');void b.offsetWidth;b.classList.add('impact');}
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
}
