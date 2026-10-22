// Vaultwake V5 new loop (docs/V5_NEW_LOOP_PLAN_2026-10-22.md): generators make parts,
// merges grow them, crew orders pay ★ stars, stars restore the coast. The board
// starts as Rivet Rover's small camp among sealed cargo; each cargo opens with the
// part it shows, and new generators come out of it (docs/V5_SEALED_CARGO_PLAN_2026-10-22.md).
// Deterministic reducer: act(s,a,now) mutates s and returns {ok,...}; a refused
// action leaves s untouched. Classic V5 (v5/core.mjs) and its saves are not used.
import {cellPos,BOARD_SIZE} from '../core.mjs';
import {kit,kitDrop,kitsMerge,producerLevel,levelLift,validProducerLevel,nearestFree,MAX_KIT_SIZE,KIT_DROPS} from '../kits.mjs';
import {xpToNext,validLevel,freshLevel} from '../levels.mjs';
import {settleEnergy,REFILL_CAP,RATION_ENERGY,rationWait} from '../energy.mjs';
import {AREAS,TASKS} from './areas.mjs';
import {CHAINS,GENERATOR_CHAINS,GENERATOR_NAMES,maxTier} from './chains.mjs';

export const SAVE_KEY='vaultwake-v5-coast';
export const VERSION=3,MAX_TIER=7,MAX_ENERGY=120;// MAX_TIER: the longest chain
export const SOURCES=Object.fromEntries(Object.entries(GENERATOR_NAMES).map(([id,name])=>[id,{name}]));
export const XP={merge:1,restore:5,feed:5,unseal:2};// feed: merging two generators// orders pay their stars as XP
export const STAR_VALUE=[1,1,2,4,7,12];// stars per item by tier
export const CHEST_ENERGY=5;
// Coast Camp's own crates (the generator boxes of v5/kits.mjs, by size).
export const CRATES=['Driftwood crate','Sea chest','Captain\'s trunk'];
// Generators in the order they are found; each is opened with the one before's parts.
export const GENERATOR_ORDER=['rig','chart','rope','shell','lamp'];
// Generators grow by merging two of the same kind and level (user, 2026-10-22:
// "generatoriig uuriig ni merge hiij hugjuulj yavdag"). Copies come from cargo and
// from every second level chest.
export const MAX_GENERATOR_LEVEL=5;
export const generatorsMerge=(x,y)=>x?.type==='source'&&y?.type==='source'&&x.id===y.id&&producerLevel(x)===producerLevel(y)&&producerLevel(x)<MAX_GENERATOR_LEVEL;

export const item=(family,tier)=>({type:'item',family,tier});
export const jar=energy=>({type:'jar',energy});
export const stars=n=>({type:'stars',n});
export const source=id=>({type:'source',id});
export const cargo=(key,find)=>({type:'cargo',key,...(find?{find}:{})});
const integer=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;

export function nameOf(x){
 if(!x)return 'Empty space';
 if(x.type==='item')return CHAINS[x.family].names[x.tier];
 if(x.type==='source')return SOURCES[x.id].name;
 if(x.type==='kit')return CRATES[x.size-1]+' · '+SOURCES[x.family].name;
 if(x.type==='jar')return 'Energy · +'+x.energy;
 if(x.type==='stars')return 'Star pouch · +'+x.n+' ★';
 if(x.type==='cargo')return 'Sealed cargo · opens with a '+CHAINS[x.key.family].names[x.key.tier];
 if(x.type==='glass')return 'Tideglass · '+CHAINS[x.family].names[x.tier];
 return '';
}
export const matches=(x,r)=>x?.type==='item'&&x.family===r.family&&x.tier===r.tier;
export const count=(s,r)=>s.board.filter(x=>matches(x,r)).length;
// A generator works once it stands on the board (Echo Crucible waits for the next area).
export const sourceOpen=(s,id)=>s.board.some(x=>x?.type==='source'&&x.id===id)&&(id!=='flux'||s.area>=1);
export const openFamilies=s=>Object.keys(GENERATOR_CHAINS).filter(id=>sourceOpen(s,id));
export const chainsOf=(s,gen)=>GENERATOR_CHAINS[gen].map(([c])=>c);
export const openChains=s=>openFamilies(s).flatMap(g=>chainsOf(s,g));

// ---- the board ----
// Rivet Rover's camp; everything else is sealed cargo: [key chain, key tier, find].
export const CAMP=[0,1,2,6,7,8,12,13,18];
const I=item,K=kit,E=jar,S=stars,G=source;
export const CARGO={
 3:['rig',1,E(5)],4:['rig',1,E(5)],5:['rig',2,S(2)],36:['chart',2,S(3)],
 9:['rig',2,I('rig',1)],10:['rig',2,S(2)],37:['rope',2,S(3)],
 14:['rig',1,S(2)],15:['rig',2,I('rig',2)],16:['rig',1,G('chart')],38:['rope',2,E(5)],
 19:['rig',2,K('rig',1)],20:['rig',2,G('rig')],21:['rig',2,S(2)],22:['chart',2,K('chart',1)],23:['rope',2,S(3)],39:['rope',3,G('shell')],
 26:['chart',2,G('chart')],27:['rig',3,E(5)],28:['chart',3,K('chart',2)],
 30:['chart',3,G('rope')],31:['rig',3,G('rig')],33:['rig',3,S(4)],35:['rope',3,G('rope')],41:['shell',3,G('shell')],
 43:['chart',2,G('chart')],44:['chart',2,S(3)],45:['chart',3,I('chart',2)],46:['shell',3,G('lamp')],48:['shell',3,K('shell',2)],42:['lamp',4,K('rig',3)]
};
// Tideglass: a part locked in glass near the generator that makes it. Merge a free
// twin onto it and the glass breaks: the part comes free one tier up. Each new
// generator finds work waiting for it (docs/V5_SEALED_CARGO_PLAN_2026-10-22.md, build 9).
export const GLASS={24:['rig',1],11:['chart',1],17:['chart',0],25:['rope',0],32:['rope',1],29:['shell',0],40:['shell',1],34:['lamp',0],47:['lamp',1]};
export const glass=(family,tier)=>({type:'glass',family,tier});
export const cargoAt=i=>{const c=CARGO[i];return c?cargo({family:c[0],tier:c[1]},structuredClone(c[2])):null;};
export function fresh(now=Date.now()){
 const board=Array(BOARD_SIZE).fill(null);
 board[0]=source('rig');
 for(const [i,t] of [[2,0],[7,0],[8,0],[13,1],[18,0]])board[i]=item('rig',t);
 for(let i=0;i<BOARD_SIZE;i++)if(!CAMP.includes(i))board[i]=GLASS[i]?glass(...GLASS[i]):cargoAt(i);
 const s={version:VERSION,board,energy:40,energyAt:now,stars:0,level:freshLevel(),taps:{},
  orders:[],slots:3,orderSeq:0,ordersDone:0,area:0,done:[],found:[],moves:0,merges:0,lastAt:now};
 for(const g of Object.keys(GENERATOR_CHAINS))s.taps[g]=0;
 for(let i=0;i<s.slots;i++)s.orders.push(makeOrder(s));
 note(s);return s;
}

// ---- orders ----
// The first three teach the loop; then a deterministic mix grows with the level.
const FIRST=[[['rig',1,2]],[['rig',2,1]],[['rig',1,1],['rig',0,2]]];
function rand(n){let t=(n*2654435761+0x6D2B79F5)>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
const CREW_OF={rig:'ivo',rope:'ivo',chart:'neri',shell:'neri',flux:'tamsin',lamp:'tamsin'};
const crewFor=needs=>needs.length>1?'bram':CREW_OF[needs[0].family];
export function makeOrder(s){
 const n=s.orderSeq++;let needs;
 if(n<FIRST.length)needs=FIRST[n].map(([family,tier,count])=>({family,tier,count}));
 else{
  const families=openChains(s),level=s.level.level,top=Math.min(4,1+Math.floor(level/2));
  const live=new Set(s.orders.filter(Boolean).flatMap(o=>o.needs.map(r=>r.family+r.tier)));
  let family,tier,k=0;
  do{family=families[Math.floor(rand(n*7+k)*families.length)];tier=1+Math.floor(rand(n*11+k)*Math.min(top,maxTier(family)-1));k++;}while(live.has(family+tier)&&k<8);
  needs=[{family,tier,count:tier===1&&rand(n*13)<.5?2:1}];
  if(level>=3&&rand(n*17)<.3){const other=families.find(f=>f!==family)??family;if(other!==family||tier>1)needs.push({family:other,tier:1,count:1});}
 }
 const stars=needs.reduce((v,r)=>v+r.count*STAR_VALUE[r.tier],0);
 return {id:'o'+n,who:crewFor(needs),needs,stars};
}
// Board cells an order would take: exact matches, lowest index first.
export function orderItems(s,o){
 const used=new Set(),take=[];
 for(const r of o.needs){let left=r.count;for(let i=0;i<s.board.length&&left;i++)if(!used.has(i)&&matches(s.board[i],r)){used.add(i);take.push(i);left--;}if(left)return null;}
 return take;
}
export function orderProgress(s,o){return o.needs.map(r=>({...r,have:Math.min(r.count,count(s,r))}));}

// ---- board helpers ----
const put=(s,x,near=0)=>{const i=nearestFree(s.board,near,cellPos);if(i>=0)s.board[i]=x;return i;};
// Cargo cell j opens: its find takes the space, or pays out and leaves it free.
function reveal(s,j){
 const f=s.board[j].find;
 if(!f){s.board[j]=null;return {index:j,type:'space'};}
 if(f.type==='jar'){s.board[j]=null;s.energy=Math.min(MAX_ENERGY,s.energy+f.energy);return {index:j,type:'jar',energy:f.energy};}
 if(f.type==='stars'){s.board[j]=null;s.stars+=f.n;return {index:j,type:'stars',stars:f.n};}
 if(f.type==='source'){s.board[j]=source(f.id);return {index:j,type:'source',id:f.id};}
 if(f.type==='kit'){s.board[j]=kit(f.family,f.size);return {index:j,type:'kit'};}
 s.board[j]=item(f.family,f.tier);return {index:j,type:'item'};
}
// Parts seen for the first time (for "New!" moments in the UI).
function note(s){const fresh=[];for(const x of s.board)if(x?.type==='item'){const k=x.family+x.tier;if(!s.found.includes(k)){s.found.push(k);fresh.push(k);}}return fresh;}
// The most recently found generator (for rewards that follow your newest chain).
export const newestGenerator=s=>[...GENERATOR_ORDER].reverse().find(g=>sourceOpen(s,g))??'rig';
// Only cargo touching open ground (an orthogonal neighbour that is not cargo) can be
// opened, so the board opens outward from the camp one ring at a time; cargo
// further in keeps even its key hidden.
const neighbours=i=>{const [r,c]=cellPos(i);return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].map(([rr,cc])=>rr<0||cc<0||rr>6||cc>6?-1:cc===6?36+rr:rr===6?43+cc:rr*6+cc).filter(j=>j>=0);};
export const reachable=(s,i)=>s.board[i]?.type==='cargo'&&neighbours(i).some(j=>!['cargo','glass'].includes(s.board[j]?.type));
// Which part each reachable cargo is waiting for.
export const cargoKeys=s=>s.board.flatMap((x,i)=>reachable(s,i)?[{index:i,...x.key}]:[]);

// ---- levels ----
function gainXp(s,amount){
 s.level=validLevel(s.level);s.level.xp+=amount;const ups=[];
 while(s.level.xp>=xpToNext(s.level.level)){
  s.level.xp-=xpToNext(s.level.level);s.level.level++;
  const families=openFamilies(s).filter(g=>g!=='flux'),family=families[(s.level.level-2)%families.length];
  // Odd levels from 5 bring a copy of a generator you have, to merge with it.
  const copy=s.level.level>=5&&s.level.level%2===1;
  const index=put(s,copy?source(family):kit(family,1));const energy=CHEST_ENERGY+(index<0?5:0);
  s.energy=Math.min(MAX_ENERGY,s.energy+energy);
  ups.push({level:s.level.level,energy,family:index<0?null:family,index,...(copy&&index>=0?{generator:family}:{})});
 }
 return ups;
}

// ---- restoration ----
export const currentArea=s=>AREAS[s.area];
export function nextTask(s){const a=currentArea(s);return a?.tasks.find(t=>!s.done.includes(t.id))??null;}
export const areaDone=(s,a=currentArea(s))=>!!a&&a.tasks.length>0&&a.tasks.every(t=>s.done.includes(t.id));

export function act(s,a,now=Date.now()){
 const wasFull=s.energy>=REFILL_CAP,r=step(s,a,now);
 if(!r.ok)return r;
 if(wasFull&&s.energy<REFILL_CAP)s.energyAt=now;
 s.moves++;s.lastAt=now;
 const found=note(s),xp=r.xp??0,levelUp=xp?gainXp(s,xp):[];
 if(levelUp.length)found.push(...note(s));
 return {...r,...(found.length?{found}:{}),...(levelUp.length?{levelUp}:{})};
}
export function tick(s,now=Date.now()){return settleEnergy(s,now);}

function step(s,a,now){
 const fail=message=>({ok:false,message}),valid=i=>Number.isInteger(i)&&i>=0&&i<s.board.length;
 if(!a||typeof a.type!=='string')return fail('Unknown action.');
 if(a.type==='produce'){
  const i=valid(a.index)&&s.board[a.index]?.type==='source'&&s.board[a.index].id===a.id?a.index:s.board.findIndex(x=>x?.type==='source'&&x.id===a.id);
  if(i<0||!SOURCES[a.id])return fail('That generator is still sealed in cargo somewhere on the board.');
  if(!sourceOpen(s,a.id))return fail('Echo Crucible wakes at the Survey Worksite.');
  if(s.energy<1)return fail('Out of energy. It refills +1 every 2 minutes.');
  const n=(s.taps[a.id]??0)+1,chain=GENERATOR_CHAINS[a.id][0][0],tier=Math.min(3,maxTier(chain),(n%4===0?1:0)+levelLift(producerLevel(s.board[i]),n)),x=item(chain,tier),j=put(s,x,i);
  if(j<0)return fail('The board is full. Merge, deliver or open cargo first.');
  s.energy--;s.taps[a.id]=n;
  return {ok:true,event:'produce',index:j,message:nameOf(x)};
 }
 if(a.type==='merge'||a.type==='move'||a.type==='unseal'){
  const from=a.from,to=a.to??a.index;
  if(!valid(from)||!valid(to)||from===to)return fail('Choose another space.');
  const x=s.board[from],y=s.board[to];
  if(!['item','kit','source'].includes(x?.type))return fail('That stays where it is.');
  if(x.type==='source'){
   if(!y){s.board[to]=x;s.board[from]=null;return {ok:true,event:'move',index:to,message:'Moved.'};}
   if(!generatorsMerge(x,y))return fail(y?.type==='source'&&y.id===x.id&&producerLevel(y)>=MAX_GENERATOR_LEVEL?`${SOURCES[x.id].name} is at its top level.`:'Merge two generators of the same kind and level.');
   y.level=producerLevel(y)+1;s.board[from]=null;
   return {ok:true,event:'producerUp',index:to,xp:XP.feed,message:`${SOURCES[y.id].name} reaches level ${y.level}`};
  }
  // A part laid on the cargo it opens is used up, and the cargo opens.
  if(y?.type==='cargo'){
   if(!reachable(s,to))return fail('Open the cargo next to your camp first: this one is buried deeper.');
   if(!matches(x,y.key))return fail(`This cargo opens with a ${CHAINS[y.key.family].names[y.key.tier]}.`);
   s.board[from]=null;const opened=reveal(s,to);
   return {ok:true,event:'unseal',index:to,opened,xp:XP.unseal,message:'Cargo opened · '+(opened.type==='source'?'a new generator: '+SOURCES[opened.id].name+'!':opened.type==='jar'?`+${opened.energy} energy`:opened.type==='stars'?`+${opened.stars} ★`:opened.type==='space'?'empty':nameOf(s.board[to]))};
  }
  if(a.type==='unseal')return fail('Lay the part on the cargo it opens.');
  // A free twin breaks the tideglass: the part comes free one tier up.
  if(y?.type==='glass'){
   if(x.type!=='item'||x.family!==y.family||x.tier!==y.tier)return fail(`Merge a free ${CHAINS[y.family].names[y.tier]} onto it to break the glass.`);
   if(y.tier>=maxTier(y.family))return fail('This is the top of its chain.');
   s.board[to]=item(y.family,y.tier+1);s.board[from]=null;s.merges++;
   return {ok:true,event:'merge',freed:true,index:to,xp:XP.merge+1,message:'The tideglass breaks · '+nameOf(s.board[to])};
  }
  if(!y){s.board[to]=x;s.board[from]=null;return {ok:true,event:'move',index:to,message:'Moved.'};}
  if(x.type==='kit'){
   if(y?.type==='source')return fail('Crates give parts. To level a generator up, merge it with another of the same kind and level.');
   if(!kitsMerge(x,y))return fail(y?.type==='kit'&&x.size===MAX_KIT_SIZE?`A ${CRATES[MAX_KIT_SIZE-1]} is as big as crates get. Open it for its parts.`:'Merge two unopened crates of the same kind and size.');
   s.board[to]=kit(x.family,x.size+1);s.board[from]=null;s.merges++;
   return {ok:true,event:'merge',index:to,xp:XP.merge,message:nameOf(s.board[to])};
  }
  if(y.type!=='item'||y.family!==x.family||y.tier!==x.tier)return fail('Merge two identical parts.');
  if(x.tier>=maxTier(x.family))return fail('This is the top of its chain.');
  s.board[to]=item(x.family,x.tier+1);s.board[from]=null;s.merges++;
  return {ok:true,event:'merge',index:to,xp:XP.merge,message:nameOf(s.board[to])};
 }
 if(a.type==='openKit'){
  const box=valid(a.index)?s.board[a.index]:null;if(box?.type!=='kit')return fail('Choose a crate.');
  const chain=GENERATOR_CHAINS[box.family][0][0],x=item(chain,Math.min(kitDrop(box).tier,maxTier(chain))),last=box.left===1,i=last?a.index:nearestFree(s.board,a.index,cellPos);
  if(i<0)return fail('Make space next to the crate first.');
  box.left--;s.board[i]=x;
  return {ok:true,event:'kit',index:i,message:nameOf(x)+(last?' · the crate is empty':` · ${box.left} left`)};
 }
 if(a.type==='deliver'){
  const lane=s.orders.findIndex(o=>o?.id===a.id),o=s.orders[lane];
  if(!o)return fail('That order has already changed.');
  const take=orderItems(s,o);if(!take)return fail('Make the parts this order needs first.');
  for(const i of take)s.board[i]=null;
  s.stars+=o.stars;s.ordersDone++;s.orders[lane]=makeOrder(s);
  // Every third order also brings a driftwood crate of its kind.
  const box=s.ordersDone%3===0?put(s,kit(CHAINS[o.needs[0].family].gen,1),take[0]):-1;
  return {ok:true,event:'deliver',index:box>=0?box:null,xp:o.stars,stars:o.stars,box,freed:take,message:`+${o.stars} ★`+(box>=0?' · '+nameOf(s.board[box]):'')};
 }
 if(a.type==='restore'){
  const t=nextTask(s);
  if(!t||a.id!==undefined&&a.id!==t.id)return fail(t?'Restore '+t.name+' first.':'Everything here is restored.');
  if(s.stars<t.cost)return fail(`${t.name} needs ${t.cost} ★. Deliver crew orders for stars.`);
  s.stars-=t.cost;s.done.push(t.id);const e=t.effect??{},effects={};
  if(e.energy){s.energy=Math.min(MAX_ENERGY,s.energy+e.energy);effects.energy=e.energy;}
  if(e.producer){const src=s.board.find(x=>x?.type==='source'&&x.id===e.producer);if(src&&producerLevel(src)<5){src.level=producerLevel(src)+1;effects.producer=e.producer;}}
  if(e.copy){effects.copy=put(s,source(e.copy));effects.copyId=e.copy;}
  if(e.kit){const family=e.kit[0]==='newest'?newestGenerator(s):e.kit[0];effects.kit=put(s,kit(family,e.kit[1]));effects.kitFamily=family;}
  if(e.slots&&s.slots<e.slots){s.slots=e.slots;while(s.orders.length<s.slots)s.orders.push(makeOrder(s));effects.slots=e.slots;}
  if(e.area)effects.areaDone=AREAS[s.area].id;
  return {ok:true,event:'restore',task:t.id,effects,xp:XP.restore,message:t.name+' · restored'};
 }
 if(a.type==='recycle'){
  const x=valid(a.index)?s.board[a.index]:null;if(x?.type!=='item')return fail('Only loose parts can be recycled.');
  s.board[a.index]=null;s.energy=Math.min(MAX_ENERGY,s.energy+1);
  return {ok:true,event:'recycle',message:'Recycled · +1 energy'};
 }
 if(a.type==='ration'){
  if(s.energy>3)return fail('Field rations are for low energy.');
  const wait=rationWait(s,now);if(wait>0)return fail(`Next field ration in ${Math.ceil(wait/60000)} min.`);
  s.energy+=RATION_ENERGY;s.rationAt=now;return {ok:true,event:'ration',message:`Field ration · +${RATION_ENERGY} energy`};
 }
 return fail('Unknown action.');
}

// ---- saves ----
const validItem=f=>!!CHAINS[f.family]&&integer(f.tier,0,maxTier(f.family));
const validCrate=x=>!!GENERATOR_CHAINS[x.family]&&integer(x.size,1,MAX_KIT_SIZE)&&integer(x.left,1,KIT_DROPS[x.size].length);
function validFind(f){
 if(f===undefined)return true;
 if(f?.type==='item')return validItem(f)&&f.tier<=3;
 if(f?.type==='jar')return integer(f.energy,1,50);
 if(f?.type==='stars')return integer(f.n,1,20);
 if(f?.type==='kit')return validCrate(f);
 if(f?.type==='source')return !!GENERATOR_CHAINS[f.id];
 return false;
}
function validCell(x){
 if(x===null)return true;if(!x||typeof x!=='object')return false;
 if(x.type==='item')return validItem(x);
 if(x.type==='source')return !!SOURCES[x.id]&&validProducerLevel(x);
 if(x.type==='kit')return validCrate(x);
 if(x.type==='cargo')return !!x.key&&validItem(x.key)&&validFind(x.find);
 if(x.type==='glass')return validItem(x)&&x.tier<maxTier(x.family);
 return false;
}
const validNeed=r=>r&&CHAINS[r.family]&&integer(r.tier,0,maxTier(r.family))&&integer(r.count,1,4);
const validOrder=o=>o&&typeof o.id==='string'&&Array.isArray(o.needs)&&o.needs.length>=1&&o.needs.length<=2&&o.needs.every(validNeed)&&integer(o.stars,1,99)&&['ivo','neri','tamsin','bram'].includes(o.who);

// Build 3 (version 1) had sand and numbered cells; build 4 (version 2) had the tide.
// Both become sealed cargo: each covered cell gets the key this layout gives it and
// keeps its own find. Generators the player already has stay; the new ones (Rope
// Winch, Shell Trap, Lantern Kiln) are sealed into covered cells, keyed as in a new
// camp, so no save misses them. Anything already on the board stays where it is.
const covered=x=>x?.type==='sand'||x?.type==='gate'||x?.type==='water';
function upgrade(s){
 const keyOf=i=>{const c=CARGO[i];return c?{family:c[0],tier:c[1]}:{family:'rig',tier:1};};
 s.board=s.board.map((x,i)=>covered(x)?cargo(keyOf(i),x.find):x);
 for(const [g,cell] of [['rope',30],['shell',39],['lamp',46]]){
  if(s.board.some(x=>x?.type==='source'&&x.id===g||x?.type==='cargo'&&x.find?.type==='source'&&x.find.id===g))continue;
  const key={family:CARGO[cell][0],tier:CARGO[cell][1]};
  let j=s.board[cell]?.type==='cargo'?cell:s.board.findIndex(x=>x?.type==='cargo'&&x.find?.type!=='source');
  if(j<0)j=s.board.indexOf(null);
  if(j<0)j=s.board.findIndex(x=>x?.type==='item'&&x.tier===0);
  if(j>=0)s.board[j]=cargo(key,source(g));
 }
 for(const g of Object.keys(GENERATOR_CHAINS))s.taps[g]??=0;
 s.version=VERSION;
}
export function load(raw,now=Date.now()){
 try{
  const s=JSON.parse(raw);
  if((s?.version===1||s?.version===2)&&Array.isArray(s.board)&&s.taps&&typeof s.taps==='object')upgrade(s);
  if(s?.version!==VERSION||!Array.isArray(s.board)||s.board.length!==BOARD_SIZE||!s.board.every(validCell))return fresh(now);
  if(!integer(s.energy,0,MAX_ENERGY)||!integer(s.stars,0,99999)||!integer(s.area,0,AREAS.length-1)||!integer(s.slots,3,4))return fresh(now);
  if(!Array.isArray(s.orders)||s.orders.length!==s.slots||!s.orders.every(validOrder))return fresh(now);
  if(!Array.isArray(s.done)||!s.done.every(id=>TASKS[id])||!Array.isArray(s.found))return fresh(now);
  for(const k of ['orderSeq','ordersDone','moves','merges'])if(!integer(s[k],0,1e9))return fresh(now);
  if(!s.taps||!Object.keys(GENERATOR_CHAINS).every(k=>integer(s.taps[k],0,1e9)))return fresh(now);
  s.level=validLevel(s.level);
  if(s.rationAt!==undefined&&!(Number.isFinite(s.rationAt)&&s.rationAt<=now))delete s.rationAt;
  if(!Number.isFinite(s.energyAt)||s.energyAt>now)s.energyAt=now;
  settleEnergy(s,now);
  return s;
 }catch{return fresh(now);}
}
