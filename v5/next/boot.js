// Coast Camp loading screen (Build 46p, Home + Loading). A plain script that runs while the page
// is still being read, before the game module: it shows only real progress (a percentage only
// where something can be counted), catches a game file that fails to load, and offers Retry,
// which reloads the page and never touches the save. The game module takes over through
// window.VWBoot once it runs (v5/next/home.mjs); nothing here waits on a timer or on sound.
(()=>{
 const $=id=>document.getElementById(id);
 const home=$('home'),bar=$('homeBar'),status=$('homeStatus');
 if(!home||!bar||!status)return;
 let finished=false,failed=false,stall=0;
 // Indeterminate (frac null) while what is loading cannot be counted, otherwise a percentage.
 function setStatus(text,frac=null){
  if(failed)return;
  status.textContent=text;
  if(frac===null){bar.classList.add('indet');bar.removeAttribute('aria-valuenow');bar.removeAttribute('aria-valuetext');}
  else{const p=Math.round(Math.max(0,Math.min(1,frac))*100);bar.classList.remove('indet');bar.style.setProperty('--p',p+'%');bar.setAttribute('aria-valuenow',p);bar.setAttribute('aria-valuetext',text);}
  clearTimeout(stall);if(!finished)stall=setTimeout(slow,15000);
 }
 // Nothing has moved for 15 s: say so and offer Retry, but keep loading.
 function slow(){if(finished||failed)return;status.textContent='Still loading. The connection may be slow.';$('homeRetry').hidden=false;}
 // A failure stops the loading screen with a clear Retry (and, for missing pictures, a way on).
 function fail(text,skip=null){
  if(finished&&!skip)return;
  failed=true;clearTimeout(stall);home.classList.add('isFailed');status.textContent=text;bar.hidden=true;
  $('homeRetry').hidden=false;const s=$('homeSkip');s.hidden=!skip;s.onclick=skip?()=>{reset();skip();}:null;
 }
 function reset(){failed=false;home.classList.remove('isFailed');bar.hidden=false;$('homeRetry').hidden=true;$('homeSkip').hidden=true;}
 $('homeRetry').onclick=()=>location.reload();
 // Real progress over a set of pictures: each one counts once it has loaded or failed.
 // Resolves with the addresses that failed.
 function track(urls,onProgress){
  const list=[...new Set(urls.filter(Boolean))];let n=0;const bad=[];
  return new Promise(resolve=>{
   if(!list.length){resolve(bad);return;}
   for(const u of list){const im=new Image();
    const end=ok=>{if(!ok)bad.push(u);n++;onProgress?.(n,list.length);if(n===list.length)resolve(bad);};
    im.onload=()=>end(true);im.onerror=()=>end(false);im.src=u;}
  });
 }
 // The Home pictures start loading at once; the game module reads their progress when it runs.
 const art=[...home.querySelectorAll('[data-home-art]')].map(e=>e.dataset.homeArt);
 const homeArt={done:0,total:new Set(art).size,listeners:new Set()};
 homeArt.promise=track(art,(n,t)=>{homeArt.done=n;homeArt.total=t;for(const f of homeArt.listeners)f(n,t);});
 // A game file (this site's scripts and styles) that fails to load, or the game failing while it
 // starts, stops the loading screen. Pictures are counted by track(); other sites' scripts (the
 // CrazyGames SDK) are the platform's business and never block the game.
 addEventListener('error',e=>{
  if(finished)return;const t=e.target;
  if(t&&t!==window&&(t.tagName==='SCRIPT'||t.tagName==='LINK')){
   let own=false;try{own=new URL(t.src||t.href,location.href).origin===location.origin;}catch{}
   if(own)fail('A game file could not be loaded. Check the connection and try again.');
  }else if(e instanceof ErrorEvent)fail('The game could not start. Try again.');
 },true);
 addEventListener('unhandledrejection',()=>{if(!finished)fail('The game could not start. Try again.');});
 setStatus('Loading the camp');
 window.VWBoot={setStatus,fail,reset,track,homeArt,finish(){finished=true;clearTimeout(stall);},get failed(){return failed;}};
})();
