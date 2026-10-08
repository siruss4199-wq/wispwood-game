const KEY='wispwood-audio';
let ctx=null;
let localEnabled=localStorage.getItem(KEY)!=='off';
let platformMuted=false;
let removePlatformListener=null;

function context(){
  if(!ctx){
    const AC=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AC)return null;
    ctx=new AC();
  }
  return ctx;
}
function unlock(){
  const c=context();
  if(c?.state==='suspended')c.resume().catch(()=>{});
}
function enabled(){return localEnabled&&!platformMuted;}
function setEnabled(value){
  localEnabled=!!value;
  localStorage.setItem(KEY,localEnabled?'on':'off');
}
function tone(freq,duration=.08,volume=.035,type='sine',delay=0,slide=1){
  if(!enabled())return;
  const c=context();if(!c)return;
  const t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
  o.type=type;
  o.frequency.setValueAtTime(freq,t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+duration);
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(volume,t+.008);
  g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration+.02);
}
function play(name){
  if(!enabled())return;
  unlock();
  if(name==='select')tone(420,.045,.022,'sine',0,1.08);
  else if(name==='merge'){tone(430,.07,.036,'triangle',0,1.35);tone(650,.09,.026,'sine',.045,1.3);}
  else if(name==='produce')tone(310,.06,.024,'triangle',0,1.18);
  else if(name==='rush'){tone(520,.08,.035,'sine',0,1.32);tone(740,.1,.032,'triangle',.06,1.25);tone(980,.13,.028,'sine',.13,1.08);}
  else if(name==='order'){tone(440,.08,.032,'triangle',0,1.25);tone(660,.1,.032,'triangle',.07,1.2);}
  else if(name==='milestone'){tone(360,.1,.035,'sine',0,1.25);tone(540,.13,.036,'triangle',.08,1.25);tone(810,.18,.034,'sine',.17,1.12);}
  else if(name==='unlock'){tone(500,.07,.025,'sine',0,1.18);tone(760,.1,.022,'sine',.06,1.12);}
  else if(name==='clear'){tone(280,.08,.026,'triangle',0,.78);tone(610,.09,.024,'sine',.05,1.18);}
  else if(name==='store')tone(340,.06,.02,'sine',0,.86);
  else if(name==='error')tone(180,.08,.018,'square',0,.82);
}
function playEvents(events=[]){
  if(events.some(e=>e.type==='milestone_completed'))return play('milestone');
  if(events.some(e=>e.type==='wisp_burst'))return play('rush');
  if(events.some(e=>e.type==='order_completed'))return play('order');
  if(events.some(e=>e.type==='cobweb_cleared'))return play('clear');
  if(events.some(e=>e.type==='cell_unlocked'))return play('unlock');
  if(events.some(e=>e.type==='merged'))return play('merge');
  if(events.some(e=>e.type==='produced'))return play('produce');
  if(events.some(e=>e.type==='stored'||e.type==='retrieved'))return play('store');
}
function bindPlatformMute(platform){
  platformMuted=!!platform.audioMuted?.();
  removePlatformListener?.();
  removePlatformListener=platform.onAudioSettingChange?.(muted=>{platformMuted=!!muted;})??null;
}
export const audio={unlock,enabled,setEnabled,play,playEvents,bindPlatformMute};
