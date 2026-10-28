// Coast Camp Home and Loading (Build 46p). One screen over the shared coastal Vault picture:
// while the camp loads it shows a slim progress bar and what is loading (v5/next/boot.js starts
// it before the game module); once the Home pictures are in, the same screen shows one main
// button (Play for a new camp, Continue for a save), the place the save has reached, Settings
// and the collection book. The board behind it is set up once and only shown or hidden here:
// opening Home again never starts the game again, and nothing here changes the rules or the save
// (the app decides when a save is written).
import {reduced} from '../feedback.mjs';

const $=id=>document.getElementById(id);

// Every picture the board screen shows right now: its <img> sprites and the CSS pictures of the
// board screen (HUD, cards, backdrop), so "ready" means what the player will actually see.
export function boardPictures(){
 const urls=new Set(),main=document.querySelector('main.game');if(!main)return [];
 for(const im of main.querySelectorAll('img[src]'))urls.add(im.src);
 for(const el of [document.body,$('backdrop'),main,...main.querySelectorAll('*')]){
  if(!el)continue;
  for(const p of [null,'::before','::after']){const bg=getComputedStyle(el,p).backgroundImage;
   if(bg&&bg!=='none')for(const m of bg.matchAll(/url\("?([^")]+)"?\)/g))if(!m[1].startsWith('data:'))urls.add(m[1]);}
 }
 return [...urls];
}

// hasSave: a save that loaded (Continue); damaged: a save is there but could not be read (it is
// left as it is: no Play, only Retry or an explicit new camp). chapter() names where the save
// stands, or '' to show nothing. onEnter runs each time the player goes from Home to the board.
export function createHome({boot,hasSave,damaged,chapter,onEnter,onSettings,onBook,onNewCamp,onOpenChange}){
 const home=$('home'),main=document.querySelector('main.game'),play=$('homePlay'),label=play.querySelector('span');
 let open=true,usable=false,boardDone=false,boardBad=[],boardCount=[0,0],waiting=false,leaving=0;
 const setOpen=v=>{open=v;document.body.classList.toggle('homeOpen',v);if(main)main.inert=v;onOpenChange?.(v);};
 setOpen(true);
 const loadVisible=v=>{$('homeLoad').hidden=!v;};
 function controls(){
  play.hidden=damaged;label.textContent=hasSave?'Continue':'Play';
  play.setAttribute('aria-label',hasSave?'Continue your camp':'Play: start a new camp');
  const c=damaged||!hasSave?'':chapter();$('homeChapter').textContent=c;$('homeChapter').hidden=!c;
  $('homeBook').hidden=!hasSave||damaged||!onBook;
  $('homeNote').hidden=!damaged;$('homeNew').hidden=!damaged;
  if(damaged){$('homeNote').textContent='Your saved camp could not be read, so it has been left exactly as it is. Try again, or start a new camp (the old save is kept in this browser as a backup).';$('homeRetry').hidden=false;}
 }
 // Home becomes usable once its own pictures are in (or the player chose to go on without them).
 function becomeUsable(){
  if(usable)return;usable=true;boot?.finish();
  home.classList.remove('isLoading');loadVisible(damaged);$('homeSettings').hidden=false;controls();
  if(damaged){$('homeBar').hidden=true;$('homeStatus').hidden=true;}
  resolveReady();
 }
 let resolveReady;const ready=new Promise(r=>resolveReady=r);
 // The board's pictures load behind Home; Play waits only for what is still missing.
 function boardProgress(n,t){boardCount=[n,t];if(waiting)boot?.setStatus(`Getting the board ready · ${n} of ${t} pictures`,n/t);}
 const boardP=(boot?boot.track(boardPictures(),boardProgress):Promise.resolve([])).then(bad=>{boardDone=true;boardBad=bad;if(waiting)afterBoard();});
 function afterBoard(){
  waiting=false;play.disabled=false;
  if(boardBad.length){home.classList.add('isWaiting');boot?.fail(`${boardBad.length} board picture${boardBad.length>1?'s':''} could not be loaded.`,()=>{home.classList.remove('isWaiting');loadVisible(false);enter();});return;}
  home.classList.remove('isWaiting');loadVisible(false);enter();
 }
 play.addEventListener('click',()=>{
  if(!open||!usable||waiting||damaged)return;
  if(boardDone&&!boardBad.length){enter();return;}
  waiting=true;play.disabled=true;home.classList.add('isWaiting');loadVisible(true);boot?.reset();
  if(boardDone)afterBoard();else boardProgress(...boardCount);
 });
 $('homeSettings').addEventListener('click',()=>onSettings?.());
 $('homeBook').addEventListener('click',()=>onBook?.());
 $('homeNew').addEventListener('click',()=>{if(onNewCamp?.()){damaged=false;hasSave=false;$('homeRetry').hidden=true;enter();}});
 // Home → board: a short fade of Home only (none with reduced motion); the board is already there.
 function enter(){
  if(!open)return;setOpen(false);clearTimeout(leaving);
  const done=()=>{home.hidden=true;home.classList.remove('leaving');};
  if(reduced())done();else{home.classList.add('leaving');leaving=setTimeout(done,240);}
  onEnter?.();
 }
 // Board → Home (the menu's Home): the same screen with Continue; the game keeps running behind.
 function show(){
  if(open)return;clearTimeout(leaving);hasSave=true;damaged=false;home.classList.remove('leaving');home.hidden=false;setOpen(true);
  controls();loadVisible(false);play.focus({preventScroll:true,focusVisible:false});
 }
 // The Home pictures: real progress while they load; a failure offers Retry or going on without.
 if(boot){
  const a=boot.homeArt,step=(n,t)=>boot.setStatus(`Loading the camp · ${n} of ${t} pictures`,n/t);
  if(a.done<a.total){step(a.done,a.total);a.listeners.add(step);}
  a.promise.then(bad=>{a.listeners.delete(step);
   if(bad.length)boot.fail('Some pictures could not be loaded.',becomeUsable);else becomeUsable();});
 }else becomeUsable();
 return {ready,enter,show,boardReady:boardP,get isOpen(){return open;}};
}
