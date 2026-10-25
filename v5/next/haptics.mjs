// Coast Camp haptics (Build 44). One short light pulse on a successful merge; a slightly
// different pattern for breaking tideglass and for a restoration stage; nothing while dragging
// or crossing tiles. Its own setting ('vaultwake-haptics'), separate from sound.
//
// Support, as the browsers document it (not promised to the player):
//  - navigator.vibrate (Vibration API): Chrome and most browsers on Android. Silently ignored
//    when the phone is in silent/vibration-off mode or the page has no user gesture yet.
//  - iPhone/iPad Safari has no Vibration API. Safari 17.4 added the <input type=checkbox switch>
//    control, and from iOS 18 toggling it gives the system's light tap. Toggling a hidden switch
//    from the same touch is the only web route there; it is a side effect of a form control,
//    not an API, so it is treated as "may work" and it is never described as guaranteed.
//  - Anything else (desktop, other iOS browsers before 18, in-app web views): no haptics; the
//    setting is hidden and the game says so in the menu.
const KEY='vaultwake-haptics';
const nav=typeof navigator!=='undefined'?navigator:{};
const canVibrate=typeof nav.vibrate==='function';
const apple=/iP(hone|ad|od)/.test(nav.userAgent??'')||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
const canSwitch=!canVibrate&&apple&&typeof HTMLInputElement!=='undefined'&&'switch' in HTMLInputElement.prototype;
let on=true;try{on=localStorage.getItem(KEY)!=='off';}catch{}
let toggleEl=null,last=0;
function iosTick(){
 if(!toggleEl){
  const label=document.createElement('label');label.setAttribute('aria-hidden','true');
  label.style.cssText='position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
  const input=document.createElement('input');input.type='checkbox';input.setAttribute('switch','');input.tabIndex=-1;
  label.append(input);document.body.append(label);toggleEl=label;
 }
 toggleEl.click();
}
// The patterns, in milliseconds (vibrate on, pause, on …). Short and light on purpose.
const PATTERN={merge:[12],ice:[8,40,14],restore:[16,60,28]};
export const haptics={
 // 'vibrate' | 'ios-switch' | null
 method:canVibrate?'vibrate':canSwitch?'ios-switch':null,
 supported:canVibrate||canSwitch,
 enabled:()=>on,
 toggle(){on=!on;try{localStorage.setItem(KEY,on?'on':'off');}catch{}return on;},
 // Returns true when a pulse was asked of the device (the device may still ignore it).
 pulse(kind='merge'){
  if(!on||!PATTERN[kind])return false;
  const now=performance.now();if(now-last<70)return false;last=now;
  try{
   if(canVibrate)return nav.vibrate(PATTERN[kind])!==false;
   if(canSwitch){iosTick();return true;}
  }catch{}
  return false;
 }
};
