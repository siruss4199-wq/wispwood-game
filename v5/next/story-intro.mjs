// Coast Camp's first-play story (Build 46q): three illustrated lines between Home's Play and the
// board, shown once, on the first new camp. Presentation only: it gives nothing, builds nothing
// and changes no rule; the pictures are story, not the coast's restoration states. Whether it
// has been seen (finished or skipped) is kept under its own key, beside the game save, which it
// never reads or writes. Every word and button is live HTML; Skip is there on every scene.
export const STORY_KEY='vaultwake-v5-coast-story';
const ART=n=>`assets/premium/coast/story/${n}.webp`;
// pos: where the cover-fitted picture is anchored on a phone, so what the line is about (the
// Vault, the seal, the broken path) stays above the dialogue panel.
export const INTRO=[
 {art:'arrival',who:null,text:'An unsigned letter led you to this forgotten coast.',pos:'50% 30%',
  alt:'From a small boat, a closed round Vault door in a sea cliff, with a camp and a pier on the beach below it.'},
 {art:'letter',who:'bram',text:'That seal… it’s on the Vault, too. Who sent you this?',pos:'50% 42%',
  alt:'An unsigned letter closed with a turquoise wave seal, the Vault door behind it.'},
 {art:'landing',who:'ivo',text:'Answers can wait a moment. Let’s clear the landing and sort our supplies.',pos:'50% 50%',
  alt:'A broken wooden path up the beach, with supply crates beside it.'}
];
const NAMES={bram:'Bram',ivo:'Ivo',neri:'Neri',tamsin:'Tamsin'};
export function storySeen(storage){try{return !!JSON.parse(storage.get(STORY_KEY)??'null')?.intro;}catch{return false;}}
// The pictures load ahead (Home is up), never holding anything back.
export function preloadIntro(){for(const s of INTRO){const im=new Image();im.src=ART(s.art);}}

// Plays the first-play story over Home; resolves once the player is done (Check supplies) or skips.
export function playIntro({storage,face,reduced}){
 return playScenes({scenes:INTRO.map(x=>({...x,src:ART(x.art),id:x.art})),face,reduced,last:'Check supplies'}).then(r=>{
  try{storage.set(STORY_KEY,JSON.stringify({intro:r.how,scene:r.scene,at:Date.now()}));}catch{}
  return r.how;});
}
// Full-screen illustrated scenes with one line each (the first-play story, Build 47b's Vault reveal):
// live text, Next on every scene and the last button's own label, Skip and Escape throughout,
// cross-fades (none with reduced motion). A scene may carry a light effect (fx: 'seam' or 'open',
// at light: [x, y, r] as shares of its picture) drawn in CSS over the picture, never baked in, and
// the Vault door that opens (door, below).
// The board behind is inert while it plays. Resolves {how:'done'|'skipped', scene}.
export function playScenes({scenes,face,reduced,last='Continue',label=''}){
 const $=id=>document.getElementById(id),root=$('story'),layers=[...root.querySelectorAll('.storyArt')],main=document.querySelector('main.game'),wasInert=!!main?.inert;
 let n=0,top=0,closed=false,resolve;
 const done=new Promise(r=>resolve=r);
 // the light sits where the scene says on the picture as drawn (object-fit: cover, object-position)
 // Build 47f: a scene may also carry the Vault door (door: {cx, cy, rx, ry, seam} in the picture's
 // pixels, inside: the picture behind it). Its two halves are cut from the same picture along the
 // seam and drawn exactly over it, so they can swing open on the hinges painted at its sides.
 function light(s,img){
  const el=root.querySelector('.storyLight'),v=root.querySelector('.storyVault');root.dataset.fx=s.fx??'';
  if(!img.naturalWidth||!s.light&&!s.door){el.hidden=true;if(v)v.hidden=true;return;}
  const b=img.getBoundingClientRect(),k=Math.max(b.width/img.naturalWidth,b.height/img.naturalHeight),[px,py]=getComputedStyle(img).objectPosition.split(' ').map(v=>parseFloat(v)/100);
  const ox=b.left+(b.width-img.naturalWidth*k)*px,oy=b.top+(b.height-img.naturalHeight*k)*py;
  if(s.light){const [x,y,r]=s.light;el.style.setProperty('--lx',(ox+x*img.naturalWidth*k)+'px');el.style.setProperty('--ly',(oy+y*img.naturalHeight*k)+'px');el.style.setProperty('--lr',(r*img.naturalWidth*k)+'px');el.hidden=false;}else el.hidden=true;
  if(!v)return;v.hidden=!s.door;if(!s.door)return;
  const d=s.door,px2=n=>n+'px';
  for(const [k2,val] of Object.entries({cx:ox+d.cx*k,cy:oy+d.cy*k,rx:d.rx*k,ry:d.ry*k,seam:ox+d.seam*k,ox,oy,iw:img.naturalWidth*k,ih:img.naturalHeight*k}))v.style.setProperty('--'+k2,px2(val));
  v.style.setProperty('--vart',`url("${img.currentSrc||img.src}")`);v.querySelector('.vIn').style.backgroundImage=`url("${d.inside}")`;
 }
 function picture(s){
  const next=layers[1-top],cur=layers[top];
  const same=cur.getAttribute('src')===s.src;
  if(same){cur.alt=s.alt;cur.style.objectPosition=s.pos??'';light(s,cur);return;}
  next.src=s.src;next.alt=s.alt;next.style.objectPosition=s.pos??'';root.querySelector('.storyBlur').src=s.src;
  const swap=()=>{next.classList.add('on');cur.classList.remove('on');cur.alt='';top=1-top;light(s,next);};
  if(next.complete)swap();else{next.onload=next.onerror=()=>{next.onload=next.onerror=null;swap();};}
 }
 function scene(){
  const s=scenes[n];picture(s);
  root.dataset.scene=s.id??'';
  const f=$('storyFace');f.hidden=!s.who;if(s.who)f.src=face(s.who);
  $('storyWho').textContent=s.who?NAMES[s.who]:'';$('storyWho').hidden=!s.who;
  $('storyText').textContent=s.text;$('storyText').classList.toggle('narration',!s.who);
  for(const [k,d] of [...root.querySelectorAll('.storyDots i')].entries())d.classList.toggle('on',k===n);
  $('storyNext').textContent=n<scenes.length-1?'Next':last;
  $('storyNext').focus({preventScroll:true,focusVisible:false});
 }
 function finish(how){
  if(closed)return;closed=true;
  removeEventListener('keydown',keys);removeEventListener('resize',relight);
  // the board is given back only if this made it inert (Home keeps its own while it is up)
  const end=()=>{root.hidden=true;root.classList.remove('leaving');document.body.classList.remove('storyOpen');if(main&&!wasInert)main.inert=false;};
  if(reduced())end();else{root.classList.add('leaving');setTimeout(end,260);}
  resolve({how,scene:n+1});
 }
 const keys=e=>{if(e.key==='Escape'){e.preventDefault();finish('skipped');}};
 const relight=()=>{const s=scenes[n],img=layers[top];if(s)light(s,img);};
 $('storyNext').onclick=()=>{if(closed)return;if(n<scenes.length-1){n++;scene();}else finish('done');};
 $('storySkip').onclick=()=>finish('skipped');
 addEventListener('keydown',keys);addEventListener('resize',relight);
 $('storyLabel').textContent=label;$('storyLabel').hidden=!label;
 root.querySelector('.storyDots').innerHTML=scenes.map(()=>'<i></i>').join('');
 root.setAttribute('aria-label',label?`Story: ${label}`:'Story');
 for(const l of layers){l.classList.remove('on');l.removeAttribute('src');}
 if(main)main.inert=true;
 root.hidden=false;document.body.classList.add('storyOpen');scene();
 return done;
}
