// Coast Camp sounds (Build 44, bright coast pass). Short synthesized cues, no files and no
// libraries: every cue is a few oscillators and noise grains through one bus with a limiter, so
// rapid play cannot stack up into something louder (a soft clipper, no compressor). Classic V5 keeps v5/feedback.mjs; this module
// only reads the shared on/off setting from it ('vaultwake-sound').
//
// What each cue is meant to be (user brief, 2026-10-24):
//  merge     a short soft knock with a light bright finish (the finish note is a step of one
//            pentatonic scale chosen by tier, so no two notes ever clash and nothing climbs shrill)
//  discovery a slightly richer short chime on top of the merge (first find, tier 4 and up)
//  produce   a dry mechanical click and a small pop as the part comes out
//  ice       a brief crisp crack; the third hit adds a short shatter
//  deliver   a two-note coin/confirmation
//  milestone a soft rising four-note figure (a restoration stage, a new generator, a level)
//  tap, error, store: quiet interface ticks
import {sound} from '../feedback.mjs';

let ctx=null,bus=null,noiseBuf=null;
const last={};let lastMerge=0,mergeRun=0,recent=[];
// The finish notes: C major pentatonic from G5 (784 Hz) to E6 (1319 Hz).
const SCALE=[784,880,1047,1175,1319];

function context(){
 if(ctx)return ctx;
 const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return null;
 try{ctx=new AC();}catch{return null;}
 bus=busInto(ctx);noiseBuf=noise(ctx);
 return ctx;
}
// One bus: a master gain into a soft clipper. A DynamicsCompressor was tried first and measured
// (Chromium, offline render): its make-up gain made the 2nd to 10th of ten quick merges twice
// as loud as the first. The clipper has no memory, so a repeat is never louder than the first.
function busInto(c){
 const master=c.createGain();master.gain.value=.45;
 const clip=c.createWaveShaper(),n=1024,curve=new Float32Array(n);
 for(let i=0;i<n;i++){const x=i/(n-1)*2-1;curve[i]=Math.tanh(1.4*x)/Math.tanh(1.4);}
 clip.curve=curve;master.connect(clip);clip.connect(c.destination);return master;
}
function noise(c){
 const b=c.createBuffer(1,Math.floor(c.sampleRate*.4),c.sampleRate),d=b.getChannelData(0);
 let seed=7;for(let i=0;i<d.length;i++){seed=(seed*16807)%2147483647;d[i]=seed/1073741823.5-1;}
 return b;
}
// Browsers start audio only from a user gesture (iOS Safari also suspends it when the page is
// hidden or a call comes in): the first touch unlocks it, and it is resumed on the way back.
export function unlock(){
 const c=context();if(!c)return;
 if(c.state!=='running')c.resume?.().catch(()=>{});
 try{const b=c.createBuffer(1,1,22050),s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0);}catch{}
}
if(typeof document!=='undefined'){
 const once=()=>{unlock();removeEventListener('pointerdown',once,true);removeEventListener('keydown',once,true);};
 addEventListener('pointerdown',once,true);addEventListener('keydown',once,true);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ctx&&ctx.state!=='running')ctx.resume?.().catch(()=>{});});
}

// ---- building blocks ----
function env(g,t,attack,peak,decay){
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+attack+decay);
}
function tone(t,{type='sine',f,to=null,glide=.06,a=.004,peak=.2,d=.15,out=bus}){
 const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+glide);
 env(g,t,a,peak,d);o.connect(g);g.connect(out);o.start(t);o.stop(t+a+d+.03);o.onended=()=>{o.disconnect();g.disconnect();};
}
function grain(t,{filter='bandpass',f=1000,q=1,a=.001,peak=.2,d=.03,out=bus}){
 const s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuf;
 fl.type=filter;fl.frequency.value=f;fl.Q.value=q;env(g,t,a,peak,d);s.connect(fl);fl.connect(g);g.connect(out);
 s.start(t,(t*7.31)%.3);s.stop(t+a+d+.03);s.onended=()=>{s.disconnect();fl.disconnect();g.disconnect();};
}
function bell(t,f,peak=.12,d=.32){tone(t,{f,peak,d,a:.003});tone(t,{f:f*2.76,peak:peak*.22,d:d*.45,a:.002});}

// ---- the cues ----
const CUES={
 merge(t,tier=0,gain=1){
  // the knock: a short low thump with a woody contact; the finish: one bright pentatonic note
  tone(t,{f:260,to:150,glide:.07,peak:.42*gain,d:.09,a:.002});
  tone(t,{type:'triangle',f:520,to:300,glide:.05,peak:.12*gain,d:.05,a:.002});
  grain(t,{f:1100,q:1.6,peak:.22*gain,d:.028});
  const f=SCALE[Math.max(0,Math.min(SCALE.length-1,tier-1))];
  tone(t+.022,{f,peak:.15*gain,d:.12,a:.004});tone(t+.022,{f:f*2,peak:.035*gain,d:.08,a:.003});
 },
 discovery(t,tier=4){CUES.merge(t,tier,.8);bell(t+.07,1047,.1,.3);bell(t+.15,1568,.09,.34);},
 produce(t){
  grain(t,{filter:'highpass',f:2600,q:.7,peak:.26,d:.012});
  tone(t,{type:'square',f:1400,peak:.03,d:.018,a:.001});
  grain(t+.045,{filter:'highpass',f:3200,q:.7,peak:.18,d:.01});
  tone(t+.05,{f:340,to:230,glide:.05,peak:.2,d:.06,a:.003});
 },
 crack(t){
  grain(t,{filter:'highpass',f:3200,q:.8,peak:.34,d:.026});
  grain(t+.016,{f:5200,q:3,peak:.16,d:.02});
  tone(t,{f:2600,to:1500,glide:.04,peak:.05,d:.045,a:.001});
 },
 shatter(t){
  CUES.crack(t);
  [[.03,4200,.18],[.06,6100,.13],[.09,3600,.11],[.13,5200,.08],[.17,4600,.05]].forEach(([dt,f,p])=>grain(t+dt,{f,q:4,peak:p,d:.035}));
  [[.05,2093],[.1,2637],[.16,3136]].forEach(([dt,f])=>tone(t+dt,{f,peak:.04,d:.08,a:.002}));
 },
 deliver(t){
  tone(t,{type:'triangle',f:988,peak:.24,d:.12,a:.003});tone(t,{f:1976,peak:.05,d:.06,a:.002});
  tone(t+.075,{type:'triangle',f:1319,peak:.24,d:.2,a:.003});tone(t+.075,{f:2637,peak:.05,d:.09,a:.002});
 },
 milestone(t){[523,659,784,1047].forEach((f,k)=>tone(t+k*.075,{type:'triangle',f,peak:.19,d:k===3?.4:.2,a:.005}));},
 sparkle(t){[1568,2093,2637].forEach((f,k)=>tone(t+k*.04,{f,peak:.06,d:.12,a:.003}));},
 unseal(t){grain(t,{f:700,q:1,peak:.24,d:.06});tone(t+.03,{f:880,peak:.1,d:.18,a:.004});},
 tap(t){tone(t,{f:900,to:720,glide:.03,peak:.05,d:.035,a:.002});},
 error(t){tone(t,{f:300,to:250,glide:.06,peak:.1,d:.07,a:.003});tone(t+.09,{f:250,to:220,glide:.05,peak:.08,d:.07,a:.003});}
};
// The game's old kinds keep working: rare → sparkle, contract → deliver.
const ALIAS={rare:'sparkle',contract:'deliver'};
// Shortest gap between two of the same cue (ms); repeats inside it are dropped, not stacked.
const GAP={merge:45,discovery:120,produce:50,crack:35,shatter:80,deliver:90,milestone:300,sparkle:90,unseal:60,tap:40,error:120};

export const sfx={
 enabled:()=>sound.enabled(),
 toggle:()=>sound.toggle(),
 // play(kind, tier): tier is the merged part's tier (merge, discovery).
 play(kind,tier=0,{muted=false}={}){
  kind=ALIAS[kind]??kind;if(!CUES[kind]||muted||!sound.enabled()||(typeof document!=='undefined'&&document.hidden))return false;
  const now=performance.now();if(now-(last[kind]??-1e9)<(GAP[kind]??40))return false;
  // Never more than six cues in a quarter second: rapid play thins out instead of piling up.
  recent=recent.filter(x=>now-x<250);if(recent.length>=6&&kind!=='milestone')return false;
  const c=context();if(!c)return false;if(c.state==='suspended')c.resume?.().catch(()=>{});
  last[kind]=now;recent.push(now);
  // Merges in a quick run get a little softer each time (down to 40 %), never louder.
  let gain=1;if(kind==='merge'||kind==='discovery'){mergeRun=now-lastMerge<400?Math.min(4,mergeRun+1):0;lastMerge=now;gain=1-.15*mergeRun;}
  try{kind==='merge'?CUES.merge(c.currentTime+.005,tier,gain):CUES[kind](c.currentTime+.005,tier);}catch{return false;}
  return true;
 },
 // For the sound comparison page and the offline renders: draw a list of cues
 // [{kind,at(seconds),tier}] into any (offline) context through the same bus and the same
 // repeat rules as play().
 renderInto(c,events){
  const saved=[ctx,bus,noiseBuf];ctx=c;
  bus=busInto(c);noiseBuf=noise(c);
  const lastAt={};let run=0,prev=-1e9,win=[],played=0;
  for(const {kind:k0,at,tier=0} of events){const kind=ALIAS[k0]??k0,ms=at*1000;
   if(ms-(lastAt[kind]??-1e9)<(GAP[kind]??40))continue;win=win.filter(x=>ms-x<250);if(win.length>=6&&kind!=='milestone')continue;
   lastAt[kind]=ms;win.push(ms);played++;
   let gain=1;if(kind==='merge'||kind==='discovery'){run=ms-prev<400?Math.min(4,run+1):0;prev=ms;gain=1-.15*run;}
   kind==='merge'?CUES.merge(at,tier,gain):CUES[kind](at,tier);}
  [ctx,bus,noiseBuf]=saved;return played;
 },
 KINDS:Object.keys(CUES)
};
