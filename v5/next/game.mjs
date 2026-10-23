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
// Coins per part by tier (build 16: stars became coins, five to a star; build 31: every tier
// a chain has, so no order is ever worth NaN).
export const COIN_VALUE=[5,5,10,25,45,80,140,240];
// Orders ask for tier 5 at most (build 31: a sixth-tier story order stalled the beach's end).
export const ORDER_TOP=5;export const COIN_RATE=5;
export const CHEST_ENERGY=7;
// The camp shed (build 32, user: "aguulah bolon udur tutmiin shagnaliig nem"): four spaces off
// the board for parts, crates, cogs and tokens. What is in the shed does not count for orders
// or cargo; tap it to bring it back to the board.
export const SHED_SLOTS=4,SHED_TYPES=['item','kit','cog','token'];
// The daily gift: one a day, seven in a row then round again. A missed day does not reset it.
// The collection book (build 33, user: "cugluulgiin nom nem"): every part found for the first
// time pays a few coins once it is ticked off in the book, more for higher tiers; a chain's
// whole page found and ticked gives a Brass cog.
export const BOOK_COINS=[1,1,2,3,5,8,12,20];// kept small: bigger book coins undid build 31's energy tension (scripted player)
export const BOOK_CHAINS=['rig','chart','rope','shell','lamp'];// the chains of GENERATOR_ORDER
export const bookKeys=family=>Array.from({length:maxTier(family)+1},(_,t)=>family+t);
// Parts found but not yet ticked off in the book.
export const bookReady=s=>s.found.filter(k=>!s.book.claimed.includes(k)&&BOOK_CHAINS.includes(k.replace(/\d+$/,'')));
export const pageReady=(s,family)=>!s.book.pages.includes(family)&&bookKeys(family).every(k=>s.book.claimed.includes(k));
// The shop (build 34, user: "delguur bolon zar shurtchilgaanii shagnal nem"): coins buy
// energy, crates, a Tide token or a Brass cog, a few of each per day, so the shop competes
// with the coast's upgrades for coins. Energy costs more coins than orders pay for it (about
// 3 coins an energy), so buying it never loops into profit. Two offers are paid by watching a
// rewarded ad instead (ad:true); the app gives them only after an ad has finished.
export const SHOP={
 energy:{name:'Energy pack',cost:80,energy:20,limit:3},
 chest:{name:'Sea chest',cost:40,kit:2,limit:2},
 token:{name:'Tide token',cost:50,token:1,limit:1},
 cog:{name:'Brass cog',cost:200,cog:1,limit:1},
 adEnergy:{name:'Energy',ad:true,energy:15,limit:3},
 adCrate:{name:'Driftwood crate',ad:true,kit:1,limit:2}
};
export const shopLeft=(s,id,day)=>SHOP[id].limit-(day>s.shop.day?0:s.shop.bought[id]??0);
// Changing an order (build 36, user: "gatssan taskaas ehel"): a crew order the player is stuck
// on can be swapped for a new one, three times a day for free and then after a rewarded ad (five
// a day). The gold story order cannot be changed: it is the coast's next stage.
export const FREE_SWAPS=3,AD_SWAPS=5;
export const swapsLeft=(s,day)=>FREE_SWAPS-(day>s.swaps.day?0:s.swaps.n);
export const adSwapsLeft=(s,day)=>AD_SWAPS-(day>s.swaps.day?0:s.swaps.ads);
export const DAILY=[{energy:10},{coins:25},{kit:1},{energy:15},{token:1},{coins:50},{cog:1}];
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
 for(let i=0;i<BOARD_SIZE;i++)if(!CAMP.includes(i))board[i]=GLASS[i]?glass(...GLASS[i]):cargoAt(i);
 const s={version:VERSION,board,energy:40,energyAt:now,coins:0,level:freshLevel(),taps:{},
  orders:[],slots:3,orderSeq:0,ordersDone:0,area:0,built:{},found:[],moves:0,merges:0,lastAt:now,
  shed:Array(SHED_SLOTS).fill(null),daily:{day:-1,count:0},book:{claimed:[],pages:[]},shop:{day:-1,bought:{}},swaps:{day:-1,n:0,ads:0}};
 for(const g of Object.keys(GENERATOR_CHAINS))s.taps[g]=0;
 for(let i=0;i<s.slots;i++)s.orders.push(makeOrder(s));
 note(s);return s;
}

// ---- orders ----
// The first three teach the loop; then a deterministic mix grows with the level.
// The camp starts empty around Rivet Rover (build 30, user: "shuud orohod ingeed task deliver
// hiihed belen ehelj baina ... anhnii item generator-s garch ireeguigeer ehleh"): the first
// orders are built from its first taps and merges. Build 35 (user: "generatoroo hed tovshihod l
// ehnii 3 task shuud bieleh hemjeend ochij bainshdee"): a short ladder instead of Grip tools,
// a Split spanner, then a Pocket winch, then two kinds at once, so taps alone fill none of them.
const FIRST=[[['rig',2,1]],[['rig',3,1]],[['rig',2,1],['rig',1,2]]];
function rand(n){let t=(n*2654435761+0x6D2B79F5)>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
const CREW_OF={rig:'ivo',rope:'ivo',chart:'neri',shell:'neri',flux:'tamsin',lamp:'tamsin'};
const crewFor=needs=>needs.length>1?'bram':CREW_OF[needs[0].family];
// Coins an order pays: its parts' worth, half as much again for the story's (rounded to 5).
export const priceOf=(needs,story=false)=>{const v=needs.reduce((v,r)=>v+r.count*COIN_VALUE[r.tier],0);return story?Math.round(v*1.5/5)*5:v;};
// The second part of an order comes from another open chain, chosen evenly by the order's own
// seed (build 41: it was always the first open chain, so Rivet Rover filled most second parts).
export function secondChain(families,main,tier,seed){const ok=families.filter(f=>f!==main&&tier<=maxTier(f));return ok.length?ok[Math.floor(rand(seed)*ok.length)]:null;}
// A second part never asks more than its generator can reach easily: one tier above its level
// (a new Lv1 generator: tier 2 at most), so fair chains do not mean dear parts.
const reach=(s,chain)=>Math.max(1,...s.board.filter(x=>x?.type==='source'&&x.id===CHAINS[chain].gen).map(producerLevel));
export function makeOrder(s){
 const n=s.orderSeq++;let needs;
 if(n<FIRST.length)needs=FIRST[n].map(([family,tier,count])=>({family,tier,count}));
 else{
  // Difficulty follows the story and the merging, not the player level (build 29, user:
  // "taskuudiin shinechlel hetsuu bololtiig story bolon mergeteigee uyalduulaad"): the lowest
  // tier rises with beach upgrades (2 from 3 upgrades, 3 from 12), the top tier climbs every
  // six upgrades and one more once a generator reaches level 3, and two-part orders grow
  // more common as the beach is built.
  // Built counts every area's stages, so the Survey Worksite starts where the beach ended.
  const families=openChains(s),built=totalBuilt(s),best=Math.max(1,...s.board.filter(x=>x?.type==='source').map(producerLevel));
  const low=built>=12?3:built>=3?2:1,top=Math.min(ORDER_TOP,2+Math.floor(built/6)+(best>=3?1:0));
  // One order at a time is the story's: the newest generator's best part, for the next beach
  // stage, paying half as much again.
  const story=!s.orders.some(o=>o?.story)&&nextTask(s);
  const live=new Set(s.orders.filter(Boolean).flatMap(o=>o.needs.map(r=>r.family+r.tier)));
  let family,tier,k=0;
  if(story){family=GENERATOR_CHAINS[newestGenerator(s)][0][0];tier=Math.max(low,Math.min(top,maxTier(family)-1));}
  // Half of an area's everyday orders want its focus chain once its generator is out (the
  // Survey Worksite's Rope Winch).
  const focus=currentArea(s)?.focus,pool=focus&&families.includes(focus)&&rand(n*19)<.5?[focus]:families;
  if(!story)do{family=pool[Math.floor(rand(n*7+k)*pool.length)];const hi=Math.max(low,Math.min(top,maxTier(family)-1));tier=low+Math.floor(rand(n*11+k)*(hi-low+1));k++;}while(live.has(family+tier)&&k<8);
  if(story){needs=[{family,tier,count:1}];const other=secondChain(families,family,Math.max(1,low),n*29+3);needs.push({family:other??family,tier:other?Math.max(1,Math.min(low,reach(s,other))):Math.max(1,tier-1),count:1});if(needs[1].family===family&&needs[1].tier===tier)needs.pop();
   return {id:'o'+n,who:crewFor(needs),needs,coins:priceOf(needs,true),story:story.id};}
  needs=[{family,tier,count:tier<=2&&rand(n*13)<.6?2:1}];
  if(rand(n*17)<Math.min(.6,.2+built*.02)){const other=secondChain(families,family,Math.max(1,tier-1),n*23+5)??family,t=Math.max(1,other===family?tier-1:Math.min(tier-1,reach(s,other)));if(other!==family||t!==tier)needs.push({family:other,tier:t,count:1});}
 }
 return {id:'o'+n,who:crewFor(needs),needs,coins:priceOf(needs)};
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
// Stages bought in every area (orders grow harder with it).
export const totalBuilt=s=>Object.values(s.built).reduce((n,k)=>n+k,0);
// When an area is complete the next one with places opens (build 31: the Survey Worksite).
function advance(s){let next=null;while(areaDone(s)&&AREAS[s.area+1]?.tasks.length){s.area++;next=AREAS[s.area].id;}return next;}

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
  if(areaDone(s)){effects.areaDone=AREAS[s.area].id;const next=advance(s);if(next)effects.nextArea=next;}
  return {ok:true,event:'restore',task:t.id,stage:t.stage,effects,xp:XP.restore,message:t.name+(t.stage===1?' · restored':` · stage ${t.stage}`)};
 }
 // The shed: a part, crate, cog or token goes in the first free shed space, and back out to
 // the space asked for (or the nearest free one to the Rover).
 if(a.type==='store'){
  const x=valid(a.index)?s.board[a.index]:null;if(!SHED_TYPES.includes(x?.type))return fail('Only parts, crates, cogs and tokens go in the shed.');
  const k=Number.isInteger(a.slot)&&s.shed[a.slot]===null?a.slot:s.shed.indexOf(null);if(k<0)return fail('The shed is full. Take something out first.');
  s.shed[k]=x;s.board[a.index]=null;return {ok:true,event:'store',slot:k,message:nameOf(x)+' · in the shed'};
 }
 if(a.type==='unstore'){
  const x=Number.isInteger(a.slot)?s.shed[a.slot]:null;if(!x)return fail('That shed space is empty.');
  const i=valid(a.to)&&s.board[a.to]===null?a.to:nearestFree(s.board,ROVER,cellPos);if(i<0)return fail('The board is full. Make space first.');
  s.board[i]=x;s.shed[a.slot]=null;return {ok:true,event:'unstore',index:i,message:nameOf(x)+' · back on the board'};
 }
 // The daily gift: the app passes today's local day number; one gift per new day.
 if(a.type==='daily'){
  if(!Number.isInteger(a.day)||a.day<0)return fail('Unknown day.');
  if(a.day<=s.daily.day)return fail('Today\'s gift is already open. Come back tomorrow.');
  const n=s.daily.count%DAILY.length,g=DAILY[n],gift={day:n+1};
  if(g.kit||g.token||g.cog){const x=g.kit?kit(newestGenerator(s),g.kit):g.token?token():cog(),i=nearestFree(s.board,ROVER,cellPos),k=s.shed.indexOf(null);
   if(i<0&&k<0)return fail('Make space on the board or in the shed for today\'s gift.');
   if(i>=0){s.board[i]=x;gift.index=i;}else{s.shed[k]=x;gift.slot=k;}gift.thing=x;}
  if(g.energy){s.energy=Math.min(MAX_ENERGY,s.energy+g.energy);gift.energy=g.energy;}
  if(g.coins){s.coins+=g.coins;gift.coins=g.coins;}
  s.daily={day:a.day,count:s.daily.count+1};
  return {ok:true,event:'daily',gift,index:gift.index??null,message:`Daily gift · day ${n+1} of ${DAILY.length}`};
 }
 // The book: tick off a found part for its coins; a page with every part ticked gives a cog.
 if(a.type==='book'){
  const k=typeof a.key==='string'?a.key:'';if(!bookReady(s).includes(k))return fail(s.book.claimed.includes(k)?'Already in the book.':'Find this part on the board first.');
  const tier=+k.match(/\d+$/)[0],coins=BOOK_COINS[tier];s.book.claimed.push(k);s.coins+=coins;
  return {ok:true,event:'book',key:k,coins,message:`In the book · +${coins} coins`};
 }
 if(a.type==='bookPage'){
  if(!BOOK_CHAINS.includes(a.family)||!pageReady(s,a.family))return fail(s.book.pages?.includes(a.family)?'This page is already complete.':'Find every part on this page first.');
  const i=nearestFree(s.board,ROVER,cellPos),k=s.shed.indexOf(null);if(i<0&&k<0)return fail('Make space on the board or in the shed for the Brass cog.');
  if(i>=0)s.board[i]=cog();else s.shed[k]=cog();s.book.pages.push(a.family);
  return {ok:true,event:'bookPage',family:a.family,index:i>=0?i:null,slot:i>=0?null:k,message:`${CHAINS[a.family].names.at(-1)} page complete · a Brass cog`};
 }
 // The shop: buy with coins, or take an ad offer once its ad has played. Stock is per local day.
 // Change a crew order: the new one is made while the old still stands, so it asks for
 // something else.
 if(a.type==='swapOrder'){
  const lane=s.orders.findIndex(o=>o?.id===a.id),o=s.orders[lane];
  if(!o)return fail('That order has already changed.');
  if(o.story)return fail('The gold order is for the coast\'s next stage: it cannot be changed.');
  if(!Number.isInteger(a.day)||a.day<Math.max(0,s.swaps.day))return fail('Unknown day.');
  const free=swapsLeft(s,a.day)>0;
  if(!free&&!a.ad)return fail('No free order changes left today. Watch a short ad to change it.');
  if(!free&&adSwapsLeft(s,a.day)<1)return fail('No more order changes today.');
  if(a.day>s.swaps.day)s.swaps={day:a.day,n:0,ads:0};
  if(free)s.swaps.n++;else s.swaps.ads++;
  const next=makeOrder(s);s.orders[lane]=next;
  return {ok:true,event:'swapOrder',id:next.id,old:o.id,ad:!free,message:'A new crew order'};
 }
 if(a.type==='buy'||a.type==='adReward'){
  const o=SHOP[a.id];if(!o||!!o.ad!==(a.type==='adReward'))return fail('Unknown offer.');
  if(!Number.isInteger(a.day)||a.day<Math.max(0,s.shop.day))return fail('Unknown day.');
  if(shopLeft(s,a.id,a.day)<1)return fail(`No more ${o.name.toLowerCase()} today. The shop restocks tomorrow.`);
  if(!o.ad&&s.coins<o.cost)return fail(`${o.name} costs ${o.cost} coins.`);
  if(o.energy&&s.energy+o.energy>MAX_ENERGY)return fail('Energy is almost full. Spend some first.');
  let thing=null,index=null,slot=null;
  if(o.kit||o.token||o.cog){thing=o.kit?kit(newestGenerator(s),o.kit):o.token?token():cog();const i=nearestFree(s.board,ROVER,cellPos),k=s.shed.indexOf(null);
   if(i<0&&k<0)return fail('Make space on the board or in the shed first.');
   if(i>=0){s.board[i]=thing;index=i;}else{s.shed[k]=thing;slot=k;}}
  if(a.day>s.shop.day)s.shop={day:a.day,bought:{}};
  s.shop.bought[a.id]=(s.shop.bought[a.id]??0)+1;
  if(!o.ad)s.coins-=o.cost;
  if(o.energy)s.energy+=o.energy;
  return {ok:true,event:'shop',id:a.id,ad:!!o.ad,index,slot,thing,energy:o.energy??0,message:`${o.name}`+(o.energy?` · +${o.energy} energy`:'')+(slot!=null?' · in the shed':'')};
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
  // Build 30 could price a sixth-tier story order at NaN coins (saved as null): it is priced again.
  if(Array.isArray(s.orders))for(const o of s.orders)if(o&&o.coins===null&&Array.isArray(o.needs)&&o.needs.every(validNeed))o.coins=priceOf(o.needs,!!o.story);
  if(!Array.isArray(s.orders)||s.orders.length!==s.slots||!s.orders.every(validOrder))return fresh(now);
  if(!s.built||typeof s.built!=='object'||Array.isArray(s.built)||!Object.entries(s.built).every(([id,n])=>TASKS[id]&&integer(n,1,STAGES))||!Array.isArray(s.found))return fresh(now);
  for(const k of ['orderSeq','ordersDone','moves','merges'])if(!integer(s[k],0,1e9))return fresh(now);
  if(!s.taps||!Object.keys(GENERATOR_CHAINS).every(k=>integer(s.taps[k],0,1e9)))return fresh(now);
  // Build 32 added the shed and the daily gift; older saves get an empty shed and a gift today.
  s.shed??=Array(SHED_SLOTS).fill(null);s.daily??={day:-1,count:0};
  // Build 33 added the book: parts already found wait in it to be ticked off.
  s.book??={claimed:[],pages:[]};
  // Build 34 added the shop's daily stock.
  s.shop??={day:-1,bought:{}};
  // Build 36 added order changes.
  s.swaps??={day:-1,n:0,ads:0};
  if(!s.swaps||!integer(s.swaps.day,-1,1e7)||!integer(s.swaps.n,0,FREE_SWAPS)||!integer(s.swaps.ads,0,AD_SWAPS))return fresh(now);
  if(!s.shop||!integer(s.shop.day,-1,1e7)||!s.shop.bought||typeof s.shop.bought!=='object'||Array.isArray(s.shop.bought)||!Object.entries(s.shop.bought).every(([id,n])=>SHOP[id]&&integer(n,0,SHOP[id].limit)))return fresh(now);
  const bookKey=k=>typeof k==='string'&&/^[a-z]+\d$/.test(k)&&BOOK_CHAINS.includes(k.slice(0,-1))&&+k.slice(-1)<=maxTier(k.slice(0,-1));
  if(!s.book||!Array.isArray(s.book.claimed)||!Array.isArray(s.book.pages)||!s.book.claimed.every(k=>bookKey(k)&&s.found.includes(k))||new Set(s.book.claimed).size!==s.book.claimed.length||!s.book.pages.every(f=>BOOK_CHAINS.includes(f)&&bookKeys(f).every(k=>s.book.claimed.includes(k))))return fresh(now);
  if(!Array.isArray(s.shed)||s.shed.length!==SHED_SLOTS||!s.shed.every(x=>x===null||SHED_TYPES.includes(x?.type)&&validCell(x)))return fresh(now);
  if(!s.daily||!integer(s.daily.day,-1,1e7)||!integer(s.daily.count,0,1e7))return fresh(now);
  s.level=validLevel(s.level);
  // Saves that finished the beach before the Survey Worksite existed go up the cliff.
  advance(s);
  if(s.rationAt!==undefined&&!(Number.isFinite(s.rationAt)&&s.rationAt<=now))delete s.rationAt;
  if(!Number.isFinite(s.energyAt)||s.energyAt>now)s.energyAt=now;
  settleEnergy(s,now);
  return s;
 }catch{return fresh(now);}
}
