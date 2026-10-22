// Vaultwake V5 new loop (docs/V5_NEW_LOOP_PLAN_2026-10-22.md): generators make parts,
// merges grow them and dig the sand, crew orders pay ◆ stars, stars restore the coast.
// Deterministic reducer: act(s,a,now) mutates s and returns {ok,...}; a refused
// action leaves s untouched. Classic V5 (v5/core.mjs) and its saves are not used.
import {FAMILIES,cellPos,cellAt,BOARD_SIZE,CORE_SIZE,GATE_LEVELS} from '../core.mjs';
import {kit,kitName,kitDrop,kitsMerge,feeds,producerLevel,levelLift,validKit,validProducerLevel,nearestFree,MAX_KIT_SIZE} from '../kits.mjs';
import {xpToNext,validLevel,freshLevel} from '../levels.mjs';
import {settleEnergy,REFILL_CAP,RATION_ENERGY,rationWait} from '../energy.mjs';
import {AREAS,TASKS} from './areas.mjs';

export const SAVE_KEY='vaultwake-v5-coast';
export const VERSION=1,MAX_TIER=7,MAX_ENERGY=120;
export const SOURCES={rig:{name:'Rivet Rover'},chart:{name:'Survey Kite'},flux:{name:'Echo Crucible'}};
export const XP={merge:1,restore:5,feed:5};// orders pay their stars as XP
export const STAR_VALUE=[1,1,2,4,7,12];// stars per item by tier
export const CHEST_ENERGY=5;

export const item=(family,tier)=>({type:'item',family,tier});
export const sand=find=>({type:'sand',...(find?{find}:{})});
export const jar=energy=>({type:'jar',energy});
const gate=level=>({type:'gate',level});
const source=id=>({type:'source',id});
const integer=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;

export function nameOf(x){
 if(!x)return 'Empty space';
 if(x.type==='item')return FAMILIES[x.family].names[x.tier];
 if(x.type==='source')return SOURCES[x.id].name;
 if(x.type==='kit')return kitName(x);
 if(x.type==='jar')return 'Energy jar · +'+x.energy;
 if(x.type==='sand')return x.find?'Buried '+nameOf(x.find).toLowerCase():'Sand';
 if(x.type==='gate')return 'Sand · opens at level '+x.level;
 return '';
}
export const matches=(x,r)=>x?.type==='item'&&x.family===r.family&&x.tier===r.tier;
export const count=(s,r)=>s.board.filter(x=>matches(x,r)).length;
export function sourceOpen(s,id){
 if(id==='rig')return true;
 if(id==='chart')return s.done.includes('beach-mast');
 return s.area>=1;// Echo Crucible opens with the Survey Worksite (step 2)
}
export const openFamilies=s=>['rig','chart','flux'].filter(id=>sourceOpen(s,id));

// A small open camp around Rivet Rover; sand with finds everywhere else; the 7×7
// column and row are numbered gates that open with the level.
export function fresh(now=Date.now()){
 const board=Array(BOARD_SIZE).fill(null);
 board[0]=source('rig');board[5]=source('chart');board[30]=source('flux');
 for(const [i,t] of [[2,0],[7,0],[8,0],[13,1],[18,0]])board[i]=item('rig',t);
 const finds={3:kit('rig',1),10:kit('rig',1),9:item('rig',0),14:item('rig',1),4:jar(5),15:item('rig',0),16:item('chart',0),11:item('chart',0),17:jar(8),21:item('rig',2),22:item('chart',1),26:kit('chart',1),28:item('chart',0),29:jar(5),33:kit('rig',1),35:item('chart',1),20:item('rig',0),25:item('rig',1)};
 for(let i=0;i<CORE_SIZE;i++)if(board[i]===null&&![1,6,12].includes(i))board[i]=sand(finds[i]);
 for(let k=0;k<GATE_LEVELS.length;k++)board[CORE_SIZE+k]=gate(GATE_LEVELS[k]);
 const s={version:VERSION,board,energy:40,energyAt:now,stars:0,level:freshLevel(),taps:{rig:0,chart:0,flux:0},
  orders:[],slots:3,orderSeq:0,ordersDone:0,area:0,done:[],found:[],moves:0,merges:0,lastAt:now};
 for(let i=0;i<s.slots;i++)s.orders.push(makeOrder(s));
 note(s);return s;
}

// ---- orders ----
// The first three teach the loop; then a deterministic mix grows with the level.
const FIRST=[[['rig',1,2]],[['rig',2,1]],[['rig',1,1],['rig',0,2]]];
function rand(n){let t=(n*2654435761+0x6D2B79F5)>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
const crewFor=needs=>needs.length>1?'bram':{rig:'ivo',chart:'neri',flux:'tamsin'}[needs[0].family];
export function makeOrder(s){
 const n=s.orderSeq++;let needs;
 if(n<FIRST.length)needs=FIRST[n].map(([family,tier,count])=>({family,tier,count}));
 else{
  const families=openFamilies(s),level=s.level.level,top=Math.min(4,1+Math.floor(level/2));
  const live=new Set(s.orders.filter(Boolean).flatMap(o=>o.needs.map(r=>r.family+r.tier)));
  let family,tier,k=0;
  do{family=families[Math.floor(rand(n*7+k)*families.length)];tier=1+Math.floor(rand(n*11+k)*top);k++;}while(live.has(family+tier)&&k<8);
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
function dig(s,j,out){
 const f=s.board[j].find;
 if(!f){s.board[j]=null;out.push({index:j,type:'sand'});}
 else if(f.type==='jar'){s.board[j]=null;s.energy=Math.min(MAX_ENERGY,s.energy+f.energy);out.push({index:j,type:'jar',energy:f.energy});}
 else if(f.type==='kit'){s.board[j]=kit(f.family,f.size);out.push({index:j,type:'kit'});}
 else{s.board[j]=item(f.family,f.tier);out.push({index:j,type:'item'});}
}
function digAround(s,index){
 const out=[],[r,c]=cellPos(index);
 for(const j of [cellAt(r-1,c),cellAt(r+1,c),cellAt(r,c-1),cellAt(r,c+1)])if(j>=0&&s.board[j]?.type==='sand')dig(s,j,out);
 return out;
}
export function openGates(s){
 const opened=[];
 for(let i=CORE_SIZE;i<s.board.length;i++)if(s.board[i]?.type==='gate'&&s.board[i].level<=s.level.level){s.board[i]=null;opened.push(i);}
 return opened;
}
// Parts seen for the first time (for "New!" moments in the UI).
function note(s){const fresh=[];for(const x of s.board)if(x?.type==='item'){const k=x.family+x.tier;if(!s.found.includes(k)){s.found.push(k);fresh.push(k);}}return fresh;}

// ---- levels ----
function gainXp(s,amount){
 s.level=validLevel(s.level);s.level.xp+=amount;const ups=[];
 while(s.level.xp>=xpToNext(s.level.level)){
  s.level.xp-=xpToNext(s.level.level);s.level.level++;
  const opened=openGates(s),families=openFamilies(s),family=families[(s.level.level-2)%families.length];
  const index=put(s,kit(family,1));const energy=CHEST_ENERGY+(index<0?5:0);
  s.energy=Math.min(MAX_ENERGY,s.energy+energy);
  ups.push({level:s.level.level,energy,family:index<0?null:family,index,opened});
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
  const i=s.board.findIndex(x=>x?.type==='source'&&x.id===a.id);
  if(i<0||!SOURCES[a.id])return fail('No such generator.');
  if(!sourceOpen(s,a.id))return fail(a.id==='chart'?'Restore the signal mast to fly the Survey Kite.':'Echo Crucible wakes at the Survey Worksite.');
  if(s.energy<1)return fail('Out of energy. It refills +1 every 2 minutes.');
  const n=s.taps[a.id]+1,tier=Math.min(3,(n%4===0?1:0)+levelLift(producerLevel(s.board[i]),n)),x=item(a.id,tier),j=put(s,x,i);
  if(j<0)return fail('The board is full. Merge or deliver parts first.');
  s.energy--;s.taps[a.id]=n;
  return {ok:true,event:'produce',index:j,message:nameOf(x)};
 }
 if(a.type==='merge'||a.type==='move'){
  const from=a.from,to=a.to??a.index;
  if(!valid(from)||!valid(to)||from===to)return fail('Choose another space.');
  const x=s.board[from],y=s.board[to];
  if(!['item','kit'].includes(x?.type))return fail('That stays where it is.');
  if(!y){s.board[to]=x;s.board[from]=null;return {ok:true,event:'move',index:to,message:'Moved.'};}
  if(x.type==='kit'){
   if(feeds(x,y)){y.level=producerLevel(y)+1;s.board[from]=null;return {ok:true,event:'producerUp',index:to,xp:XP.feed,message:`${SOURCES[y.id].name} reaches level ${y.level}`};}
   if(!kitsMerge(x,y))return fail(y?.type==='kit'&&x.size===MAX_KIT_SIZE?'Large boxes are as big as boxes get. Open one, or feed it to its generator.':'Merge two unopened boxes of the same kind and size.');
   s.board[to]=kit(x.family,x.size+1);s.board[from]=null;s.merges++;
   return {ok:true,event:'merge',index:to,xp:XP.merge,dug:digAround(s,to),message:nameOf(s.board[to])};
  }
  if(y.type!=='item'||y.family!==x.family||y.tier!==x.tier)return fail('Merge two identical parts.');
  if(x.tier>=MAX_TIER)return fail('This is the top of its chain.');
  s.board[to]=item(x.family,x.tier+1);s.board[from]=null;s.merges++;
  return {ok:true,event:'merge',index:to,xp:XP.merge,dug:digAround(s,to),message:nameOf(s.board[to])};
 }
 if(a.type==='openKit'){
  const box=valid(a.index)?s.board[a.index]:null;if(box?.type!=='kit')return fail('Choose a box.');
  const x=kitDrop(box),last=box.left===1,i=last?a.index:nearestFree(s.board,a.index,cellPos);
  if(i<0)return fail('Make space next to the box first.');
  box.left--;s.board[i]=x;
  return {ok:true,event:'kit',index:i,message:nameOf(x)+(last?' · the box is empty':` · ${box.left} left`)};
 }
 if(a.type==='deliver'){
  const lane=s.orders.findIndex(o=>o?.id===a.id),o=s.orders[lane];
  if(!o)return fail('That order has already changed.');
  const take=orderItems(s,o);if(!take)return fail('Make the parts this order needs first.');
  for(const i of take)s.board[i]=null;
  s.stars+=o.stars;s.ordersDone++;s.orders[lane]=makeOrder(s);
  // Every third order also brings a small box of its kind.
  const box=s.ordersDone%3===0?put(s,kit(o.needs[0].family,1),take[0]):-1;
  return {ok:true,event:'deliver',index:box>=0?box:null,xp:o.stars,stars:o.stars,box,freed:take,message:`+${o.stars} ★`+(box>=0?' · '+nameOf(s.board[box]):'')};
 }
 if(a.type==='restore'){
  const t=nextTask(s);
  if(!t||a.id!==undefined&&a.id!==t.id)return fail(t?'Restore '+t.name+' first.':'Everything here is restored.');
  if(s.stars<t.cost)return fail(`${t.name} needs ${t.cost} ★. Deliver crew orders for stars.`);
  s.stars-=t.cost;s.done.push(t.id);const e=t.effect??{},effects={};
  if(e.energy){s.energy=Math.min(MAX_ENERGY,s.energy+e.energy);effects.energy=e.energy;}
  if(e.producer){const src=s.board.find(x=>x?.type==='source'&&x.id===e.producer);if(src&&producerLevel(src)<5){src.level=producerLevel(src)+1;effects.producer=e.producer;}}
  if(e.kit){effects.kit=put(s,kit(e.kit[0],e.kit[1]));}
  if(e.slots&&s.slots<e.slots){s.slots=e.slots;while(s.orders.length<s.slots)s.orders.push(makeOrder(s));effects.slots=e.slots;}
  if(e.source)effects.source=e.source;
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
function validCell(x){
 if(x===null)return true;if(!x||typeof x!=='object')return false;
 if(x.type==='item')return !!FAMILIES[x.family]&&integer(x.tier,0,MAX_TIER);
 if(x.type==='source')return !!SOURCES[x.id]&&validProducerLevel(x);
 if(x.type==='kit')return validKit(x);
 if(x.type==='jar')return integer(x.energy,1,50);
 if(x.type==='gate')return integer(x.level,2,8);
 if(x.type==='sand'){const f=x.find;return f===undefined||f?.type==='item'&&!!FAMILIES[f.family]&&integer(f.tier,0,3)||f?.type==='jar'&&integer(f.energy,1,50)||f?.type==='kit'&&validKit(f);}
 return false;
}
const validNeed=r=>r&&FAMILIES[r.family]&&integer(r.tier,0,MAX_TIER)&&integer(r.count,1,4);
const validOrder=o=>o&&typeof o.id==='string'&&Array.isArray(o.needs)&&o.needs.length>=1&&o.needs.length<=2&&o.needs.every(validNeed)&&integer(o.stars,1,99)&&['ivo','neri','tamsin','bram'].includes(o.who);
export function load(raw,now=Date.now()){
 try{
  const s=JSON.parse(raw);
  if(s?.version!==VERSION||!Array.isArray(s.board)||s.board.length!==BOARD_SIZE||!s.board.every(validCell))return fresh(now);
  if(!integer(s.energy,0,MAX_ENERGY)||!integer(s.stars,0,99999)||!integer(s.area,0,AREAS.length-1)||!integer(s.slots,3,4))return fresh(now);
  if(!Array.isArray(s.orders)||s.orders.length!==s.slots||!s.orders.every(validOrder))return fresh(now);
  if(!Array.isArray(s.done)||!s.done.every(id=>TASKS[id])||!Array.isArray(s.found))return fresh(now);
  for(const k of ['orderSeq','ordersDone','moves','merges'])if(!integer(s[k],0,1e9))return fresh(now);
  if(!s.taps||!['rig','chart','flux'].every(k=>integer(s.taps[k],0,1e9)))return fresh(now);
  s.level=validLevel(s.level);
  if(s.rationAt!==undefined&&!(Number.isFinite(s.rationAt)&&s.rationAt<=now))delete s.rationAt;
  if(!Number.isFinite(s.energyAt)||s.energyAt>now)s.energyAt=now;
  settleEnergy(s,now);
  return s;
 }catch{return fresh(now);}
}
