// Vaultwake V5 new loop (docs/V5_NEW_LOOP_PLAN_2026-10-22.md): generators make parts,
// merges grow them, crew orders pay coins, coins upgrade the coast's places stage by
// stage on the beach screen. The board
// starts as Rivet Rover's small camp among sealed cargo; each cargo opens with the
// part it shows, and new generators come out of it (docs/V5_SEALED_CARGO_PLAN_2026-10-22.md).
// Deterministic reducer: act(s,a,now) mutates s and returns {ok,...}; a refused
// action leaves s untouched. Classic V5 (v5/core.mjs) and its saves are not used.
import {cellPos,BOARD_SIZE} from '../core.mjs';
import {kit,kitDrop,kitsMerge,producerLevel,levelLift,validProducerLevel,nearestFree,MAX_KIT_SIZE,KIT_DROPS} from '../kits.mjs';
import {xpToNext,validLevel,freshLevel} from '../levels.mjs';
import {settleEnergy,REFILL_CAP,RATION_ENERGY,rationWait} from '../energy.mjs';
import {AREAS,TASKS,STAGES} from './areas.mjs';
import {CHAINS,GENERATOR_CHAINS,GENERATOR_NAMES,maxTier} from './chains.mjs';

export const SAVE_KEY='vaultwake-v5-coast';
export const VERSION=4,MAX_TIER=7,MAX_ENERGY=120;// MAX_TIER: the longest chain
export const SOURCES=Object.fromEntries(Object.entries(GENERATOR_NAMES).map(([id,name])=>[id,{name}]));
export const XP={merge:1,restore:8,feed:5,unseal:2};// feed: merging two generators; orders pay a fifth of their coins as XP
// Coins per part by tier (build 16: stars became coins, five to a star).
export const COIN_VALUE=[5,5,10,25,45,80];export const COIN_RATE=5;
export const CHEST_ENERGY=10;
// Coast Camp's own crates (the generator boxes of v5/kits.mjs, by size).
export const CRATES=['Driftwood crate','Sea chest','Captain\'s trunk'];
// Generators in the order they are found; each is opened with the one before's parts.
export const GENERATOR_ORDER=['rig','chart','rope','shell','lamp'];
// Generators grow by merging two of the same kind and level (user, 2026-10-22:
// "generatoriig uuriig ni merge hiij hugjuulj yavdag"). Copies come from cargo and
// from every second level chest.
export const MAX_GENERATOR_LEVEL=5;
// Each generator brings out the next kind when it reaches level 2 (user, 2026-10-22: "ehleed
// ehnii generatoroo saijruuldag baiy, ternii daraagaas daraagiin generator garch irdeg baih"):
// Rivet Rover Lv2 → Survey Kite, Kite Lv2 → Rope Winch, Rope Lv2 → Shell Trap, Shell Lv2 →
// Lantern Kiln. Cargo holds the copies and Brass cogs that level them.
export const UNLOCK_LEVEL=3;
export const nextKind=g=>GENERATOR_ORDER[GENERATOR_ORDER.indexOf(g)+1]??null;
export const generatorsMerge=(x,y)=>x?.type==='source'&&y?.type==='source'&&x.id===y.id&&producerLevel(x)===producerLevel(y)&&producerLevel(x)<MAX_GENERATOR_LEVEL;

export const item=(family,tier)=>({type:'item',family,tier});
export const jar=energy=>({type:'jar',energy});
export const coins=n=>({type:'coins',n});
export const source=id=>({type:'source',id});
// A Brass cog (found in cargo, user: "generator ahiulagch"): drag it onto a generator for +1 level.
export const cog=()=>({type:'cog'});
// A Tide token (found in cargo, build 18): lay it on a part and it becomes a part of the same
// tier that a crew order is waiting for.
export const token=()=>({type:'token'});
export const cargo=(key,find)=>({type:'cargo',key,...(find?{find}:{})});
const integer=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;

export function nameOf(x){
 if(!x)return 'Empty space';
 if(x.type==='item')return CHAINS[x.family].names[x.tier];
 if(x.type==='source')return SOURCES[x.id].name;
 if(x.type==='kit')return CRATES[x.size-1]+' · '+SOURCES[x.family].name;
 if(x.type==='jar')return 'Energy · +'+x.energy;
 if(x.type==='coins')return 'Coin pouch · +'+x.n+' coins';
 if(x.type==='cargo')return 'Sealed cargo · opens with a '+CHAINS[x.key.family].names[x.key.tier];
 if(x.type==='glass')return 'Tideglass · '+CHAINS[x.family].names[x.tier];
 if(x.type==='cog')return 'Brass cog · +1 generator level';
 if(x.type==='token')return 'Tide token · turns a part into one an order wants';
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
// Rivet Rover stands in the middle of the board with its small camp around it;
// sealed cargo and tideglass fill the two rings outside (user, 2026-10-22:
// "generatoroo tuvruugee oruulay"). Keys need well-merged parts.
export const cellIndex=(r,c)=>c===6?36+r:r===6?43+c:r*6+c;
const at=(r,c)=>cellIndex(r,c);
export const CAMP=[at(2,2),at(2,3),at(2,4),at(3,2),at(3,3),at(3,4),at(4,2),at(4,3),at(4,4)];
export const ROVER=at(3,3);
const I=item,K=kit,E=jar,S=n=>coins(n*COIN_RATE),T=token;
// [row, column, key chain, key tier, find]
const CARGO_CELLS=[
 // The more useful the find, the harder the key (user, 2026-10-22: "hairtsagnaas mash heregtei
 // zuiliig hetsuu neey"): everyday finds open with tier-3 parts next to the camp and tier 3–4
 // at the edge; Tide tokens, captain's trunks and big coin pouches with tier 4–5. Generators
 // no longer come from cargo: the beach's stages give the copies (build 18, user: "storynd
 // upgrade hiiheer generator ugdug, hairtsagand arai uur zuil uldeegeed"). Energy is rare.
 // Ring 2 (next to the camp, between the tideglass): one Split-spanner crate above the Rover
 // to teach it; a Tide token in a corner behind a Crawler jack.
 [1,1,'rig',4,T()],[1,3,'rig',2,S(3)],[1,5,'chart',5,K('chart',3)],
 [2,1,'rig',3,K('rig',1)],[4,1,'chart',3,S(4)],[5,1,'rope',5,T()],
 [2,5,'rig',5,S(12)],[4,5,'chart',3,I('chart',3)],[5,5,'chart',3,K('chart',1)],
 [5,3,'rig',3,E(5)],
 // Ring 3 (the edge) is packed by other crews: every crate there wants a Survey Kite or a
 // Rope Winch part, so the edge opens as those generators arrive (build 21, user chose this
 // over the tide: "ene shine uurchlult sain bish, uur shiidel"). Tier 3–4 for everyday
 // finds, 4–5 for tokens, trunks and big pouches.
 [0,1,'chart',5,K('chart',3)],[0,2,'rope',3,E(5)],[0,3,'chart',4,S(10)],[0,4,'rope',4,K('chart',2)],[0,5,'chart',4,T()],
 [1,6,'rope',3,S(6)],[2,6,'chart',3,I('rope',2)],[3,6,'rope',5,S(16)],[4,6,'chart',5,K('rope',3)],
 [6,6,'rope',4,S(16)],[6,4,'chart',3,K('chart',1)],[6,3,'rope',4,S(10)],[6,1,'chart',3,K('rope',1)],[6,0,'rope',5,K('rig',3)],
 [4,0,'chart',5,T()],[3,0,'rope',3,K('rig',2)],[2,0,'chart',4,S(12)]
];
export const CARGO=Object.fromEntries(CARGO_CELLS.map(([r,c,f,tier,find])=>[at(r,c),[f,tier,find]]));
// Tideglass: a part locked in glass near the generator that makes it. Six ring the camp, so a
// new camp opens on half-buried parts beside the Rover (user, 2026-10-22, with a reference
// board: "ehlel ni iimerhuuduu baimaar baina"; level-numbered cells were left out as a copy).
// It does not take a
// key like cargo: merges in the spaces beside it crack it, and the second breaks it and
// frees the part as it is (user, 2026-10-22: "hairtsag mus 2 neeh yalgaa alga").
export const GLASS=Object.fromEntries([[1,2,'rig',2],[1,4,'rig',1],[3,1,'rig',2],[3,5,'chart',1],[5,2,'rig',1],[5,4,'rope',1],[0,0,'chart',3],[0,6,'shell',2],[5,6,'lamp',2],[6,5,'lamp',1],[6,2,'rope',3],[5,0,'rope',1],[1,0,'shell',1]].map(([r,c,f,tier])=>[at(r,c),[f,tier]]));
export const GLASS_HITS=3;
export const glass=(family,tier)=>({type:'glass',family,tier});
export const cargoAt=i=>{const c=CARGO[i];return c?cargo({family:c[0],tier:c[1]},structuredClone(c[2])):null;};
export function fresh(now=Date.now()){
 const board=Array(BOARD_SIZE).fill(null);
 board[ROVER]=source('rig');
 for(const [r,c,t] of [[2,2,0],[2,4,0],[3,2,0],[4,3,1],[4,4,0]])board[at(r,c)]=item('rig',t);
 for(let i=0;i<BOARD_SIZE;i++)if(!CAMP.includes(i))board[i]=GLASS[i]?glass(...GLASS[i]):cargoAt(i);
 const s={version:VERSION,board,energy:50,energyAt:now,coins:0,level:freshLevel(),taps:{},
  orders:[],slots:3,orderSeq:0,ordersDone:0,area:0,built:{},found:[],moves:0,merges:0,lastAt:now};
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
  // Difficulty follows the story and the merging, not the player level (build 29, user:
  // "taskuudiin shinechlel hetsuu bololtiig story bolon mergeteigee uyalduulaad"): the lowest
  // tier rises with beach upgrades (2 from 3 upgrades, 3 from 12), the top tier climbs every
  // six upgrades and one more once a generator reaches level 3, and two-part orders grow
  // more common as the beach is built.
  const families=openChains(s),built=builtCount(s),best=Math.max(1,...s.board.filter(x=>x?.type==='source').map(producerLevel));
  const low=built>=12?3:built>=3?2:1,top=2+Math.floor(built/6)+(best>=3?1:0);
  // One order at a time is the story's: the newest generator's best part, for the next beach
  // stage, paying half as much again.
  const story=!s.orders.some(o=>o?.story)&&nextTask(s);
  const live=new Set(s.orders.filter(Boolean).flatMap(o=>o.needs.map(r=>r.family+r.tier)));
  let family,tier,k=0;
  if(story){family=GENERATOR_CHAINS[newestGenerator(s)][0][0];tier=Math.max(low,Math.min(top,maxTier(family)-1));}
  else do{family=families[Math.floor(rand(n*7+k)*families.length)];const hi=Math.max(low,Math.min(top,maxTier(family)-1));tier=low+Math.floor(rand(n*11+k)*(hi-low+1));k++;}while(live.has(family+tier)&&k<8);
  if(story){needs=[{family,tier,count:1}];const other=families.find(f=>f!==family);needs.push({family:other??family,tier:other?Math.max(1,low):Math.max(1,tier-1),count:1});if(needs[1].family===family&&needs[1].tier===tier)needs.pop();
   const coins=Math.round(needs.reduce((v,r)=>v+r.count*COIN_VALUE[r.tier],0)*1.5/5)*5;return {id:'o'+n,who:crewFor(needs),needs,coins,story:story.id};}
  needs=[{family,tier,count:tier<=2&&rand(n*13)<.6?2:1}];
  if(rand(n*17)<.2+built*.02){const other=families.find(f=>f!==family)??family,t=Math.max(1,tier-1);if(other!==family||t!==tier)needs.push({family:other,tier:t,count:1});}
 }
 const coins=needs.reduce((v,r)=>v+r.count*COIN_VALUE[r.tier],0);
 return {id:'o'+n,who:crewFor(needs),needs,coins};
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
 if(f.type==='coins'){s.board[j]=null;s.coins+=f.n;return {index:j,type:'coins',coins:f.n};}
 if(f.type==='source'){s.board[j]=source(f.id);return {index:j,type:'source',id:f.id};}
 if(f.type==='kit'){s.board[j]=kit(f.family,f.size);return {index:j,type:'kit'};}
 if(f.type==='cog'){s.board[j]=cog();return {index:j,type:'cog'};}
 if(f.type==='token'){s.board[j]=token();return {index:j,type:'token'};}
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
// A merge on cell i cracks the tideglass beside it, if what it makes is at least as strong
// as the part in the glass (build 19: small merges no longer chip it); the last crack frees
// the part.
function crack(s,i,power=Infinity){
 const cracked=[],freed=[];
 for(const j of neighbours(i)){const g=s.board[j];if(g?.type!=='glass'||power<g.tier)continue;
  g.cracks=(g.cracks??0)+1;if(g.cracks>=GLASS_HITS){s.board[j]=item(g.family,g.tier);freed.push(j);}else cracked.push(j);}
 return {cracked,freed,bonus:freed.length*XP.unseal};
}
// A generator at level 2 brings out the next kind beside it, once there is a free space
// (checked after every action, so a full board only delays it).
function release(s){
 const out=[];
 for(const g of GENERATOR_ORDER){const n=nextKind(g);if(!n||s.board.some(x=>x?.type==='source'&&x.id===n))continue;
  const up=s.board.findIndex(x=>x?.type==='source'&&x.id===g&&producerLevel(x)>=UNLOCK_LEVEL);if(up<0)continue;
  const i=nearestFree(s.board,up,cellPos);if(i<0)continue;s.board[i]=source(n);out.push({index:i,id:n,from:g});}
 return out;
}
const withCracks=(r,c)=>{if(c.cracked.length)r.cracked=c.cracked;if(c.freed.length){r.broken=c.freed;r.xp+=c.bonus;r.message+=' · the tideglass breaks';}else if(c.cracked.length)r.message+=' · the tideglass cracks';return r;};

// ---- levels ----
function gainXp(s,amount){
 s.level=validLevel(s.level);s.level.xp+=amount;const ups=[];
 while(s.level.xp>=xpToNext(s.level.level)){
  s.level.xp-=xpToNext(s.level.level);s.level.level++;
  const families=openFamilies(s).filter(g=>g!=='flux'),family=families[(s.level.level-2)%families.length];
  // A driftwood crate of a generator you have (generators themselves come from the beach's
  // stages only since build 19).
  const index=put(s,kit(family,1));const energy=CHEST_ENERGY+(index<0?5:0);
  s.energy=Math.min(MAX_ENERGY,s.energy+energy);
  ups.push({level:s.level.level,energy,family:index<0?null:family,index});
 }
 return ups;
}

// ---- restoration ----
export const currentArea=s=>AREAS[s.area];
// Places are upgraded in three stages; a place's first stage opens once the place before
// it has its first stage, and its later stages follow its own.
export const stageOf=(s,id)=>s.built[id]??0;
export function upgrades(s){
 const a=currentArea(s);if(!a)return [];
 return a.tasks.flatMap((t,k)=>{const n=stageOf(s,t.id);if(n>=STAGES||n===0&&k>0&&!stageOf(s,a.tasks[k-1].id))return [];
  const st=t.stages[n];return [{id:t.id,stage:n+1,name:st.name,cost:st.cost,effect:st.effect,lines:st.lines,icon:t.icon,place:t.name}];}).sort((x,y)=>x.cost-y.cost);
}
// The cheapest upgrade open now (the one the main screen points to).
export const nextTask=s=>upgrades(s)[0]??null;
export const areaDone=(s,a=currentArea(s))=>!!a&&a.tasks.length>0&&a.tasks.every(t=>stageOf(s,t.id)>=STAGES);
export const builtCount=(s,a=currentArea(s))=>a?a.tasks.reduce((n,t)=>n+stageOf(s,t.id),0):0;

export function act(s,a,now=Date.now()){
 const wasFull=s.energy>=REFILL_CAP,r=step(s,a,now);
 if(!r.ok)return r;
 if(wasFull&&s.energy<REFILL_CAP)s.energyAt=now;
 s.moves++;s.lastAt=now;
 const released=release(s);
 const found=note(s),xp=r.xp??0,levelUp=xp?gainXp(s,xp):[];
 if(levelUp.length)found.push(...note(s));
 if(levelUp.length)released.push(...release(s));
 if(released.length)r.message+=released.map(n=>` · the ${SOURCES[n.id].name} comes out`).join('');
 return {...r,...(released.length?{released}:{}),...(found.length?{found}:{}),...(levelUp.length?{levelUp}:{})};
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
  if(!['item','kit','source','cog','token'].includes(x?.type))return fail('That stays where it is.');
  if(x.type==='source'){
   if(!y){s.board[to]=x;s.board[from]=null;return {ok:true,event:'move',index:to,message:'Moved.'};}
   if(!generatorsMerge(x,y))return fail(y?.type==='source'&&y.id===x.id&&producerLevel(y)>=MAX_GENERATOR_LEVEL?`${SOURCES[x.id].name} is at its top level.`:'Merge two generators of the same kind and level.');
   y.level=producerLevel(y)+1;s.board[from]=null;
   return withCracks({ok:true,event:'producerUp',index:to,xp:XP.feed,message:`${SOURCES[y.id].name} reaches level ${y.level}`},crack(s,to));
  }
  // A Brass cog raises the generator it is laid on by one level.
  if(x.type==='cog'){
   if(!y){s.board[to]=x;s.board[from]=null;return {ok:true,event:'move',index:to,message:'Moved.'};}
   if(y.type!=='source')return fail('Lay the Brass cog on a generator: +1 level.');
   if(producerLevel(y)>=MAX_GENERATOR_LEVEL)return fail(`${SOURCES[y.id].name} is at its top level.`);
   y.level=producerLevel(y)+1;s.board[from]=null;
   return {ok:true,event:'producerUp',cog:true,index:to,xp:XP.feed,message:`Brass cog · ${SOURCES[y.id].name} reaches level ${y.level}`};
  }
  // A Tide token turns the part it is laid on into a part of the same tier an order wants.
  if(x.type==='token'){
   if(!y){s.board[to]=x;s.board[from]=null;return {ok:true,event:'move',index:to,message:'Moved.'};}
   if(y.type!=='item')return fail('Lay the Tide token on a part: it becomes a part a crew order wants.');
   const want=s.orders.flatMap(o=>o.needs).find(r=>r.tier===y.tier&&r.family!==y.family&&count(s,r)<r.count);
   if(!want)return fail(`No crew order is waiting for a different ${['first','second','third','fourth','fifth','sixth','seventh','eighth'][y.tier]}-tier part.`);
   s.board[to]=item(want.family,y.tier);s.board[from]=null;
   return {ok:true,event:'swap',index:to,xp:XP.unseal,message:'Tide token · '+nameOf(s.board[to])};
  }
  // A part laid on the cargo it opens is used up, and the cargo opens.
  if(y?.type==='cargo'){
   if(!reachable(s,to))return fail('Open the cargo next to your camp first: this one is buried deeper.');
   if(!matches(x,y.key))return fail(`This cargo opens with a ${CHAINS[y.key.family].names[y.key.tier]}.`);
   s.board[from]=null;const opened=reveal(s,to);
   return {ok:true,event:'unseal',index:to,opened,xp:XP.unseal,message:'Cargo opened · '+(opened.type==='source'?'a new generator: '+SOURCES[opened.id].name+'!':opened.type==='cog'?'a Brass cog! Lay it on a generator: +1 level':opened.type==='token'?'a Tide token! Lay it on a part to turn it into one an order wants':opened.type==='jar'?`+${opened.energy} energy`:opened.type==='stars'?`+${opened.stars} ★`:opened.type==='space'?'empty':nameOf(s.board[to]))};
  }
  if(a.type==='unseal')return fail('Lay the part on the cargo it opens.');
  if(y?.type==='glass')return fail(`Tideglass takes no part. Merge in a space beside it: ${GLASS_HITS} merges break it.`);
  if(!y){s.board[to]=x;s.board[from]=null;return {ok:true,event:'move',index:to,message:'Moved.'};}
  if(x.type==='kit'){
   if(y?.type==='source')return fail('Crates give parts. To level a generator up, merge it with another of the same kind and level.');
   if(!kitsMerge(x,y))return fail(y?.type==='kit'&&x.size===MAX_KIT_SIZE?`A ${CRATES[MAX_KIT_SIZE-1]} is as big as crates get. Open it for its parts.`:'Merge two unopened crates of the same kind and size.');
   s.board[to]=kit(x.family,x.size+1);s.board[from]=null;s.merges++;
   return withCracks({ok:true,event:'merge',index:to,xp:XP.merge,message:nameOf(s.board[to])},crack(s,to,x.size+1));
  }
  if(y.type!=='item'||y.family!==x.family||y.tier!==x.tier)return fail('Merge two identical parts.');
  if(x.tier>=maxTier(x.family))return fail('This is the top of its chain.');
  s.board[to]=item(x.family,x.tier+1);s.board[from]=null;s.merges++;
  return withCracks({ok:true,event:'merge',index:to,xp:XP.merge,message:nameOf(s.board[to])},crack(s,to,x.tier+1));
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
  // The lane is cleared first, so a delivered story order is followed by the next one.
  s.coins+=o.coins;s.ordersDone++;s.orders[lane]=null;s.orders[lane]=makeOrder(s);
  // Every third order also brings a driftwood crate of its kind.
  const box=s.ordersDone%3===0?put(s,kit(CHAINS[o.needs[0].family].gen,1),take[0]):-1;
  return {ok:true,event:'deliver',index:box>=0?box:null,xp:Math.max(1,Math.round(o.coins/COIN_RATE)),coins:o.coins,box,freed:take,message:`+${o.coins} coins`+(box>=0?' · '+nameOf(s.board[box]):'')};
 }
 // Upgrade a place on the beach one stage (the action keeps its old name, 'restore').
 if(a.type==='restore'){
  const up=upgrades(s),t=a.id===undefined?up[0]:up.find(u=>u.id===a.id);
  if(!t)return fail(TASKS[a.id]&&stageOf(s,a.id)>=STAGES?`${TASKS[a.id].name} is fully upgraded.`:TASKS[a.id]?'Upgrade the place before it first.':'Everything here is upgraded.');
  if(s.coins<t.cost)return fail(`${t.name} needs ${t.cost} coins. Deliver crew orders for coins.`);
  s.coins-=t.cost;s.built[t.id]=t.stage;const e=t.effect??{},effects={};
  if(e.energy){s.energy=Math.min(MAX_ENERGY,s.energy+e.energy);effects.energy=e.energy;}
  if(e.copy){const id=e.copy==='newest'?newestGenerator(s):e.copy;effects.copy=put(s,source(id));effects.copyId=id;}
  if(e.kit){const family=e.kit[0]==='newest'?newestGenerator(s):e.kit[0];effects.kit=put(s,kit(family,e.kit[1]));effects.kitFamily=family;}
  if(e.token){effects.token=put(s,token());}
  if(e.slots&&s.slots<e.slots){s.slots=e.slots;while(s.orders.length<s.slots)s.orders.push(makeOrder(s));effects.slots=e.slots;}
  if(areaDone(s))effects.areaDone=AREAS[s.area].id;
  return {ok:true,event:'restore',task:t.id,stage:t.stage,effects,xp:XP.restore,message:t.name+(t.stage===1?' · restored':` · stage ${t.stage}`)};
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
 if(f?.type==='coins')return integer(f.n,1,100);
 if(f?.type==='kit')return validCrate(f);
 if(f?.type==='source')return !!GENERATOR_CHAINS[f.id];
 if(f?.type==='cog'||f?.type==='token')return Object.keys(f).length===1;
 return false;
}
function validCell(x){
 if(x===null)return true;if(!x||typeof x!=='object')return false;
 if(x.type==='item')return validItem(x);
 if(x.type==='source')return !!SOURCES[x.id]&&validProducerLevel(x);
 if(x.type==='kit')return validCrate(x);
 if(x.type==='cargo')return !!x.key&&validItem(x.key)&&validFind(x.find);
 if(x.type==='cog'||x.type==='token')return Object.keys(x).length===1;
 if(x.type==='glass')return validItem(x)&&x.tier<maxTier(x.family)&&(x.cracks===undefined||integer(x.cracks,0,GLASS_HITS-1));
 return false;
}
const validNeed=r=>r&&CHAINS[r.family]&&integer(r.tier,0,maxTier(r.family))&&integer(r.count,1,4);
const validOrder=o=>o&&typeof o.id==='string'&&Array.isArray(o.needs)&&o.needs.length>=1&&o.needs.length<=2&&o.needs.every(validNeed)&&integer(o.coins,1,999)&&(o.story===undefined||!!TASKS[o.story])&&['ivo','neri','tamsin','bram'].includes(o.who);

// Build 3 (version 1) had sand and numbered cells; build 4 (version 2) had the tide.
// Both become sealed cargo: each covered cell gets the key this layout gives it and
// keeps its own find. Generators the player already has stay; the new ones (Rope
// Winch, Shell Trap, Lantern Kiln) are sealed into covered cells, keyed as in a new
// camp, so no save misses them. Anything already on the board stays where it is.
const covered=x=>x?.type==='sand'||x?.type==='gate'||x?.type==='water';
function upgrade(s){
 const keyOf=i=>{const c=CARGO[i];return c?{family:c[0],tier:c[1]}:{family:'rig',tier:1};};
 s.board=s.board.map((x,i)=>covered(x)?cargo(keyOf(i),x.find):x);
 for(const [g,cell] of [['rope',at(5,1)],['shell',at(0,5)],['lamp',at(4,6)]]){
  if(s.board.some(x=>x?.type==='source'&&x.id===g||x?.type==='cargo'&&x.find?.type==='source'&&x.find.id===g))continue;
  const key={family:CARGO[cell][0],tier:CARGO[cell][1]};
  let j=s.board[cell]?.type==='cargo'?cell:s.board.findIndex(x=>x?.type==='cargo'&&x.find?.type!=='source');
  if(j<0)j=s.board.indexOf(null);
  if(j<0)j=s.board.findIndex(x=>x?.type==='item'&&x.tier===0);
  if(j>=0)s.board[j]=cargo(key,source(g));
 }
 for(const g of Object.keys(GENERATOR_CHAINS))s.taps[g]??=0;
 s.version=3;
}
// Build 16 (version 4): stars became coins (five to a star) and each restored place is
// a place at stage 1 of 3. Orders and star pouches in cargo convert the same way.
function toV4(s){
 if(!integer(s.stars,0,99999)||!Array.isArray(s.done)||!Array.isArray(s.orders)||!Array.isArray(s.board))return;
 s.coins=s.stars*COIN_RATE;delete s.stars;
 s.built=Object.fromEntries(s.done.filter(id=>TASKS[id]).map(id=>[id,1]));delete s.done;
 for(const o of s.orders)if(o&&integer(o.stars,1,99)){o.coins=o.stars*COIN_RATE;delete o.stars;}
 for(const x of s.board)if(x?.type==='cargo'&&x.find?.type==='stars'&&integer(x.find.n,1,20))x.find={type:'coins',n:x.find.n*COIN_RATE};
 s.version=VERSION;
}
export function load(raw,now=Date.now()){
 try{
  const s=JSON.parse(raw);
  if((s?.version===1||s?.version===2)&&Array.isArray(s.board)&&s.taps&&typeof s.taps==='object')upgrade(s);
  if(s?.version===3)toV4(s);
  if(s?.version!==VERSION||!Array.isArray(s.board)||s.board.length!==BOARD_SIZE||!s.board.every(validCell))return fresh(now);
  if(!integer(s.energy,0,MAX_ENERGY)||!integer(s.coins,0,999999)||!integer(s.area,0,AREAS.length-1)||!integer(s.slots,3,4))return fresh(now);
  if(!Array.isArray(s.orders)||s.orders.length!==s.slots||!s.orders.every(validOrder))return fresh(now);
  if(!s.built||typeof s.built!=='object'||Array.isArray(s.built)||!Object.entries(s.built).every(([id,n])=>TASKS[id]&&integer(n,1,STAGES))||!Array.isArray(s.found))return fresh(now);
  for(const k of ['orderSeq','ordersDone','moves','merges'])if(!integer(s[k],0,1e9))return fresh(now);
  if(!s.taps||!Object.keys(GENERATOR_CHAINS).every(k=>integer(s.taps[k],0,1e9)))return fresh(now);
  s.level=validLevel(s.level);
  if(s.rationAt!==undefined&&!(Number.isFinite(s.rationAt)&&s.rationAt<=now))delete s.rationAt;
  if(!Number.isFinite(s.energyAt)||s.energyAt>now)s.energyAt=now;
  settleEnergy(s,now);
  return s;
 }catch{return fresh(now);}
}
