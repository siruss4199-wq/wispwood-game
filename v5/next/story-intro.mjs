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
const NAMES={bram:'Bram',ivo:'Ivo'};
export function storySeen(storage){try{return !!JSON.parse(storage.get(STORY_KEY)??'null')?.intro;}catch{return false;}}
// The pictures load ahead (Home is up), never holding anything back.
export function preloadIntro(){for(const s of INTRO){const im=new Image();im.src=ART(s.art);}}

// Plays the story over Home; resolves once the player is done (Check supplies) or skips.
export function playIntro({storage,face,reduced}){
 const $=id=>document.getElementById(id),root=$('story'),layers=[...root.querySelectorAll('.storyArt')];
 let n=0,top=0,closed=false,resolve;
 const done=new Promise(r=>resolve=r);
 function picture(s){
  const next=layers[1-top],cur=layers[top];
  next.src=ART(s.art);next.alt=s.alt;next.style.objectPosition=s.pos;root.querySelector('.storyBlur').src=ART(s.art);
  const swap=()=>{next.classList.add('on');cur.classList.remove('on');cur.alt='';top=1-top;};
  if(next.complete)swap();else{next.onload=next.onerror=()=>{next.onload=next.onerror=null;swap();};}
 }
 function scene(){
  const s=INTRO[n];picture(s);
  root.dataset.scene=s.art;
  const f=$('storyFace');f.hidden=!s.who;if(s.who)f.src=face(s.who);
  $('storyWho').textContent=s.who?NAMES[s.who]:'';$('storyWho').hidden=!s.who;
  $('storyText').textContent=s.text;$('storyText').classList.toggle('narration',!s.who);
  for(const [k,d] of [...root.querySelectorAll('.storyDots i')].entries())d.classList.toggle('on',k===n);
  $('storyNext').textContent=n<INTRO.length-1?'Next':'Check supplies';
  $('storyNext').focus({preventScroll:true,focusVisible:false});
 }
 function finish(how){
  if(closed)return;closed=true;
  try{storage.set(STORY_KEY,JSON.stringify({intro:how,scene:n+1,at:Date.now()}));}catch{}
  removeEventListener('keydown',keys);
  const end=()=>{root.hidden=true;root.classList.remove('leaving');document.body.classList.remove('storyOpen');};
  if(reduced())end();else{root.classList.add('leaving');setTimeout(end,260);}
  resolve(how);
 }
 const keys=e=>{if(e.key==='Escape'){e.preventDefault();finish('skipped');}};
 $('storyNext').onclick=()=>{if(closed)return;if(n<INTRO.length-1){n++;scene();}else finish('done');};
 $('storySkip').onclick=()=>finish('skipped');
 addEventListener('keydown',keys);
 for(const l of layers){l.classList.remove('on');l.removeAttribute('src');}
 root.hidden=false;document.body.classList.add('storyOpen');scene();
 return done;
}
