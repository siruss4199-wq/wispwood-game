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
import {CHAINS,GENERATOR_CHAINS,GENERATOR_NAMES,maxTier,SECONDARY_OF,isSecondary} from './chains.mjs';
export {SECONDARY_OF,isSecondary};

export const SAVE_KEY='vaultwake-v5-coast';
export const VERSION=4,MAX_TIER=7,MAX_ENERGY=120;// MAX_TIER: the longest chain
export const SOURCES=Object.fromEntries(Object.entries(GENERATOR_NAMES).map(([id,name])=>[id,{name}]));
export const XP={merge:1,restore:8,feed:5,unseal:2};// feed: merging two generators; orders pay a fifth of their coins as XP
// Coins per part by tier (build 16: stars became coins, five to a star; build 31: every tier
// a chain has, so no order is ever worth NaN).
export const COIN_VALUE=[5,5,10,25,45,80,140,240];
// Orders ask for tier 5 at most (build 31: a sixth-tier story order stalled the beach's end).
export const ORDER_TOP=5;export const COIN_RATE=5;
export const CHEST_ENERGY=15;
// A harder start (Build 46k, user: "togloom ehneesee mash amarhan sanagdaad baigaa, toglogchid hetsuu
// davan tuulj baigaa medremj uguhgui"; chose option A, docs/V5_HARDER_START_2026-10-27.md). Measured
// before (scripted player, first 30 min): energy never ran out, a stage every 2.7 min, the first gold
// order done in 1.5 min. A new camp starts with less energy, the first five levels give less, and the
// first six stages' gold orders ask one part a level bigger, so the first energy squeeze comes at
// about 12 min (5 s an action) and the first stages are goals that take planning.
export const START_ENERGY=30,EARLY_LEVELS=5,EARLY_LEVEL_ENERGY=5,GOLD_LIFT=1,GOLD_LIFT_STAGES=6;
export const levelEnergy=level=>level<=EARLY_LEVELS?EARLY_LEVEL_ENERGY:CHEST_ENERGY;
// The level path (docs/V5_LEVEL_PATH_2026-10-27.md; user: "togloomond ashiglaad gameplayd sonirholtoi
// zuilsee nemmeer baina"): the player level opens a merge rule and two kinds of crew order. The
// level-up energy stays.
export const LEVEL_PATH=[
 {level:3,id:'triple',name:'Triple merge',text:'Drag a level 3 or bigger part onto its twin while a third one touches it: all three make two of the next level.'},
 {level:5,id:'token',name:'Tide tokens from the crew',text:'Every eighth crew order also pays a Tide token.'},
 {level:8,id:'favour',name:'Crew favours',text:'Every sixth crew order asks one part a level higher and pays a Sea chest too (a Brass cog from the Survey Worksite on).'}
];
// The triple merge is for parts of level 3 and up (tier 2+): measured with the economy harness,
// triples of smaller parts used up the cheap pairs a player merges for free while energy is out
// (at 4.5 s an action, low-energy moments with a free move fell from about 80 % to 45 %).
export const TOKEN_EVERY=8,FAVOUR_EVERY=6,TRIPLE_MIN_TIER=2;
// What a level-path order pays on top of its coins. A favour pays a Sea chest at the beach and a
// Brass cog from the worksite on: cogs at the beach brought the Shell Trap out before the beach was
// finished (measured, 4 s an action: 45 min against the beach's 54).
export const BONUSES=['token','chest','cog'],BONUS_NAMES={token:'Tide token',chest:'Sea chest',cog:'Brass cog'};
// Secondary chains (pilot, 2026-10-29; docs/V5_SECONDARY_PILOT_2026-10-29.md). The Rivet Rover and
// the Survey Kite sometimes make a part of their secondary chain (chains.mjs SECONDARY_OF). Two output
// models were measured (tests/v5-next-secondary-pilot-metrics.mjs): 'bonus' (the tap's own part AND,
// sometimes, a secondary beside it) and 'replace' (sometimes a secondary INSTEAD of the tap's part,
// compensated by what secondary orders pay); 'off' is the game before the pilot. The roll is the
// tap's own number hashed (no re-roll by reloading), and a bounded bad-luck limit makes a drop
// certain on the `pity`-th ELIGIBLE tap without one (`first` for the very first one, so the new part
// is met soon after it opens). An eligible tap is a tap of that kind of generator that succeeds
// (energy spent, part made) while its drops are open (secondaryOn) and not paused (secondaryPaused);
// any other tap is neither rolled nor counted. s.secSince counts eligible taps without a drop, one
// count per kind (copies of a generator share it, and merging two copies keeps it), and is saved.
// It opens after the first lessons: once `orders` crew orders are delivered and the generator has
// been tapped `taps` times (the Kite's comes a little after the Kite itself).
// `salt` makes each generator's rolls its own. The rules are mutable only so the metrics script can
// compare models (and vary the rolls); the game never changes them.
export const SECONDARY_RULES={
 rig:{model:'bonus',chance:.1,pity:14,first:3,orders:4,taps:0,hold:3,salt:101},
 chart:{model:'bonus',chance:.1,pity:14,first:3,orders:4,taps:8,hold:3,salt:211}
};
// Secondary orders: how often an everyday order may ask a secondary part (every `every`-th, and never
// while another order on the board asks one); the highest tier ever asked (tier 3, the chain's top, is
// a collectible for the book); and `rarity`, what a secondary part is worth: the coins of a part that
// many tiers higher. Two, because tiers 0 and 1 both pay 5 coins: at one a Bolt would pay exactly what
// a Copper offcut pays. So a Bolt pays like a Split spanner (10), a Gear like a Pocket winch (25), a Gear
// assembly like a Crawler jack (45). Measured, see the pilot doc. Mutable for the metrics script only.
// `goal` (round 2): how many drops beyond those held a near-term goal may ask (secondaryNeed).
export const SECONDARY_ORDERS={every:3,top:2,rarity:2,goal:1};
export const secondaryOn=(s,gen)=>{const r=SECONDARY_RULES[gen];return !!r&&r.model!=='off'&&!!SECONDARY_OF[gen]&&sourceOpen(s,gen)&&s.ordersDone>=r.orders&&(s.taps[gen]??0)>=r.taps;};
// Board space is the bonus model's cost: a generator pauses its secondary drops while `hold` (its rule)
// or more of its secondary parts (below the chain's top, which is a keepsake) lie on the board or wait
// for space, and no order is waiting for one; and always while SECONDARY_PENDING_MAX secondary parts
// already wait for space (round 2: before, such a drop was rolled, lost and counted). While paused
// nothing is rolled or counted; drops resume as parts are merged, delivered, cleared or land.
export const secondaryPaused=(s,gen)=>{const f=SECONDARY_OF[gen];
 if(s.pending.filter(isSecondaryPart).length>=SECONDARY_PENDING_MAX)return true;
 return [...s.board,...s.pending].filter(x=>x?.type==='item'&&x.family===f&&x.tier<maxTier(f)).length>=SECONDARY_RULES[gen].hold&&!s.orders.some(o=>o?.needs?.some(r=>r.family===f));};
// Whether tap number n of generator gen makes a secondary part (read-only: the caller moves the counter).
export function secondaryRoll(s,gen,n){
 if(!secondaryOn(s,gen)||secondaryPaused(s,gen))return null;
 // met: the chain has dropped before (found on the board, or its first part still waiting for space)
 const r=SECONDARY_RULES[gen],fam=SECONDARY_OF[gen],limit=secondaryMet(s,fam)?r.pity:r.first,since=s.secSince?.[gen]??0;
 return since+1>=limit||rand(n*7919+r.salt)<r.chance?fam:null;
}
// A tap's secondary part that finds no free space waits with the other rewards (s.pending) and
// lands after the next action that frees one. With this many secondary parts waiting, drops pause
// (secondaryPaused), so the waiting list never grows past it and no drop is lost.
export const SECONDARY_PENDING_MAX=4;
export const levelOf=s=>Number.isInteger(s?.level?.level)?s.level.level:1;
export const unlocked=(s,id)=>levelOf(s)>=LEVEL_PATH.find(u=>u.id===id).level;
// The camp shed (build 32, user: "aguulah bolon udur tutmiin shagnaliig nem"): four spaces off
// the board for parts, crates, cogs and tokens. What is in the shed does not count for orders
// or cargo; tap it to bring it back to the board.
export const SHED_SLOTS=4,SHED_TYPES=['item','kit','cog','token'];
// The daily gift: one a day, seven in a row then round again. A missed day does not reset it.
// The collection book (build 33, user: "cugluulgiin nom nem"): every part found for the first
// time pays a few coins once it is ticked off in the book, more for higher tiers; a chain's
// whole page found and ticked gives a Brass cog.
export const BOOK_COINS=[1,1,2,3,5,8,12,20];// kept small: bigger book coins undid build 31's energy tension (scripted player)
export const BOOK_CHAINS=['rig','chart','rope','shell','lamp','optic','mech','notes'];// the chains of NEWEST_ORDER, then the secondary chains
export const bookKeys=family=>Array.from({length:maxTier(family)+1},(_,t)=>family+t);
// Parts found but not yet ticked off in the book.
export const bookReady=s=>s.found.filter(k=>!s.book.claimed.includes(k)&&BOOK_CHAINS.includes(k.replace(/\d+$/,'')));
// A secondary chain's page (pilot) pays no Brass cog: its parts pay their book coins, and the cog, a
// generator level, stays with the generators' own pages (measured: two more cogs brought the Shell Trap
// out during the beach for a quick player).
export const pageReady=(s,family)=>!CHAINS[family]?.secondary&&!s.book.pages.includes(family)&&bookKeys(family).every(k=>s.book.claimed.includes(k));
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
// from place stages.
export const MAX_GENERATOR_LEVEL=5;
// Each generator brings out the next kind when it reaches level 2 (user, 2026-10-22: "ehleed
// ehnii generatoroo saijruuldag baiy, ternii daraagaas daraagiin generator garch irdeg baih"):
// Rivet Rover Lv2 → Survey Kite, Kite Lv2 → Rope Winch, Rope Lv2 → Shell Trap, Shell Lv2 →
// Lantern Kiln. Cargo holds the copies and Brass cogs that level them.
export const UNLOCK_LEVEL=3;
export const nextKind=g=>GENERATOR_ORDER[GENERATOR_ORDER.indexOf(g)+1]??null;
// Generators earned from places, not from the level-3 chain above (Build 47e, from PR #80: the Lens
// Bench). NEWEST_ORDER is every generator in the order a player meets them ("newest" rewards follow it).
export const NEWEST_ORDER=[...GENERATOR_ORDER,'optic'];
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
export const GLASS=Object.fromEntries([[2,2,'rig',0],[2,4,'rig',1],[4,2,'rig',1],[4,4,'rig',0],[1,2,'rig',2],[1,4,'rig',1],[3,1,'rig',2],[3,5,'chart',1],[5,2,'rig',1],[5,4,'rope',1],[0,0,'chart',3],[0,6,'shell',2],[5,6,'lamp',2],[6,5,'lamp',1],[6,2,'rope',3],[5,0,'rope',1],[1,0,'shell',1]].map(([r,c,f,tier])=>[at(r,c),[f,tier]]));
export const GLASS_HITS=3;
// Build 41d (user: "ongorhoi nudiig bagasgay"): the camp's four corners start in tideglass too,
// small Rover parts that any merge beside them cracks, so a new camp shows four open spaces
// around the Rover and opens up as the player merges.
export const glass=(family,tier)=>({type:'glass',family,tier});
export const cargoAt=i=>{const c=CARGO[i];return c?cargo({family:c[0],tier:c[1]},structuredClone(c[2])):null;};
export function fresh(now=Date.now()){
 const board=Array(BOARD_SIZE).fill(null);
 board[ROVER]=source('rig');
 for(let i=0;i<BOARD_SIZE;i++)if(GLASS[i])board[i]=glass(...GLASS[i]);else if(!CAMP.includes(i))board[i]=cargoAt(i);
 const s={version:VERSION,board,energy:START_ENERGY,energyAt:now,coins:0,level:freshLevel(),taps:{},
  orders:[],slots:3,orderSeq:0,ordersDone:0,area:0,built:{},found:[],moves:0,merges:0,lastAt:now,
  shed:Array(SHED_SLOTS).fill(null),pending:[],seen:{},daily:{day:-1,count:0},book:{claimed:[],pages:[]},shop:{day:-1,bought:{}},swaps:{day:-1,n:0,ads:0},materials:{},
  secSince:Object.fromEntries(Object.keys(SECONDARY_OF).map(g=>[g,0]))};
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
// Everyday order kinds (Build 44) and what each pays on top of its parts' worth.
// Energy a delivery gives back (Audit 2026-10-25).
export const DELIVER_ENERGY=1;
// The big job (one part a tier past what its generator makes easily, ×1.3) was dropped on
// 2026-10-26 (user: "big job hereg baina uu ... hundruuleed yavchihiin bishuu"): it only made orders
// harder, not more interesting. Orders saved with role 'big' keep their coins and show as quick jobs.
// Two of every three are two-part jobs: with quick and two-part jobs in plain turns, the board
// ran dry while energy was out (measured: at 4.5 s an action, 45 % of low-energy moments had a
// free move, against 86 % or more this way and with the big job).
export const ROLES=['quick','pair'],ROLE_PAY={quick:1,pair:1.15},ROLE_TURN=['quick','pair','pair'];
// How many of the last everyday orders a new one may not repeat (Build 44, s.recent).
export const RECENT=6;
// An everyday order's coins: its parts' worth times its kind's pay, rounded to 5. Rounding up
// was tried (so every bonus shows) and measured: stages came sooner, and since order tiers
// follow the stages built, orders outran the generators (taps 790 → 1,003, waiting ×4).
export const rolePrice=(needs,role)=>Math.max(5,Math.round(priceOf(needs)*ROLE_PAY[role]/5)*5);
// The kind of an order, also for saves made before Build 44 (which did not store one).
export const roleOf=o=>o?.story?'gold':ROLES.includes(o?.role)?o.role:o?.needs?.length>1?'pair':'quick';
function rand(n){let t=(n*2654435761+0x6D2B79F5)>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
const CREW_OF={rig:'ivo',rope:'ivo',chart:'neri',shell:'neri',flux:'tamsin',lamp:'tamsin',optic:'tamsin',mech:'ivo',notes:'neri'};
const crewFor=needs=>needs.length>1?'bram':CREW_OF[needs[0].family];
// Coins an order pays: its parts' worth, half as much again for the story's (rounded to 5).
// A secondary part is paid as a part SECONDARY_ORDERS.rarity tiers higher (the pilot's rarity price).
export const partValue=r=>COIN_VALUE[Math.min(COIN_VALUE.length-1,r.tier+(isSecondary(r.family)?SECONDARY_ORDERS.rarity:0))];
export const priceOf=(needs,story=false)=>{const v=needs.reduce((v,r)=>v+r.count*partValue(r),0);return story?Math.round(v*1.5/5)*5:v;};
// The second part of an order comes from another open chain, chosen evenly by the order's own
// seed (build 41: it was always the first open chain, so Rivet Rover filled most second parts).
export function secondChain(families,main,tier,seed){const ok=families.filter(f=>f!==main&&tier<=maxTier(f));return ok.length?ok[Math.floor(rand(seed)*ok.length)]:null;}
// A second part never asks more than its generator can reach easily: one tier above the best
// part it makes (a new Lv1 generator: tier 2 at most), so fair chains do not mean dear parts.
// Build 46f: reach is that best part's tier, read from the same rule produce uses (the fourth-tap
// bonus plus levelLift, capped at tier 3). It was the generator's level, which matches the best
// part only at levels 1 and 2: a level-3 generator still makes tier 2 at best, yet its orders
// jumped to tier 4, so levelling up (which level 3 needs, for the next generator) made that
// chain's orders cost 60 % more energy for 20 % more output.
export const bestTier=level=>Math.max(...Array.from({length:12},(_,k)=>Math.min(3,((k+1)%4===0?1:0)+levelLift(level,k+1))));
const level=(s,chain)=>Math.max(1,...s.board.filter(x=>x?.type==='source'&&x.id===CHAINS[chain].gen).map(producerLevel));
const reach=(s,chain)=>bestTier(level(s,chain));
// What levelling pays instead (Build 46f, re-tuned with the economy harness): levels 3 and 4 make
// no better part than level 2, so an everyday part asked at its generator's limit pays 40 % more
// for each such level. Measured with the economy harness against Build 46e (numbers in
// docs/V5_AUDIT_FIXES_2026-10-25.md): 0 % left the late worksite stages slow, 30 % left a fast
// player stuck with no energy and nothing to merge; 40 % passes every economy guard.
export const PAY_PER_LEVEL=.4;
export function orderPrice(s,needs,role){
 // (a secondary part's price is its rarity, not its generator's level: no lift)
 const lift=needs.reduce((n,r)=>n+(!isSecondary(r.family)&&r.tier>=reach(s,r.family)+1?level(s,r.family)-bestTier(level(s,r.family)):0),0);
 return Math.round(rolePrice(needs,role)*(1+PAY_PER_LEVEL*lift)/5)*5;
}
// The gold order is a stage's materials, so it is the biggest order on the board (Build 41h,
// user: "story upgrade task bielelt heterhii hurdan ... merge togloh medremj avch amjilgui",
// with energy left to run out as in a classic free-to-play merge game): the newest generator's
// part one tier past what it makes easily and two of a second chain's part (a third part was
// measured too: three-part gold orders made the session 7 hours of waiting).
function goldNeeds(s,families,family,low,n){
 const tier=Math.max(2,Math.min(maxTier(family)-1,reach(s,family)+1+(totalBuilt(s)<GOLD_LIFT_STAGES?GOLD_LIFT:0)));
 const needs=[{family,tier,count:1}],other=secondChain(families,family,Math.max(1,low),n*29+3);
 needs.push(other?{family:other,tier:Math.max(1,Math.min(low+1,reach(s,other)+1,maxTier(other)-1)),count:2}:{family,tier:Math.max(1,tier-1),count:2});
 return needs;
}
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
  const story=!s.orders.some(o=>o?.story)&&storyTarget(s);
  let family,tier;
  // The gold order holds back the stage, so it asks what the newest generator can reach: one
  // tier above its level (Build 41; it asked its chain's second-best part, a Star chart from a
  // new Survey Kite).
  if(story){family=GENERATOR_CHAINS[newestGenerator(s)][0][0];tier=Math.max(1,Math.min(top,maxTier(family)-1,reach(s,family)+1));}
  // Half of an area's everyday orders want its focus chain once its generator is out (the
  // Survey Worksite's Rope Winch).
  const focus=currentArea(s)?.focus,pool=focus&&families.includes(focus)&&rand(n*19)<.5?[focus]:families;
  // Build 47b (from PR #80): a stage may name its own materials (gold: [[chain, tier, count], ...]),
  // e.g. the Vault door's inner ring; otherwise they follow the newest generator as above.
  if(story){needs=story.gold?story.gold.map(([family,tier,count])=>({family,tier,count})):goldNeeds(s,families,family,low,n);return {id:'o'+n,who:crewFor(needs),needs,coins:priceOf(needs,true),story:story.id};}
  // Build 44 (user, 2026-10-25: "orderuudiig utga uchirtai bolgoy"; docs/V5_ECONOMY_AUDIT_PROPOSAL,
  // proposal A): everyday orders take turns being a quick job (one small part of one chain) and a
  // two-part job (parts of two different chains; pays ×1.15). The big job was dropped on 2026-10-26
  // (see ROLES). The first chain is one no other everyday order on the board starts with, when the
  // area has one; only unlocked chains, never above maxTier − 1. Two of every three orders are
  // two-part jobs, so most cards mix chains once a second one is out.
  let role=ROLE_TURN[(n-FIRST.length)%ROLE_TURN.length];const others=s.orders.filter(o=>o&&!o.story),firsts=new Set(others.map(o=>o.needs[0].family));
  // The camp remembers its last few everyday orders (s.recent, Build 44): a new one repeats
  // neither those nor a card already on the board.
  const recent=Array.isArray(s.recent)?s.recent:(s.recent=[]),key=ns=>ns.map(r=>r.family+r.tier+'x'+r.count).sort().join('+');
  const avoid=new Set([...recent,...others.map(o=>key(o.needs))]),last=recent.at(-1)?.match(/^[a-z]+/)?.[0];
  const freshChains=pool.filter(f=>!firsts.has(f)&&f!==last),from=freshChains.length?freshChains:pool.filter(f=>!firsts.has(f)).length?pool.filter(f=>!firsts.has(f)):pool;
  const hi=f=>Math.max(1,Math.min(top,reach(s,f)+1,maxTier(f)-1)),floor=Math.max(1,low-1);
  const build=f1=>{
   // A quick job: one chain at the area's floor tier (one part, or two while they are small).
   if(role==='quick'){const t=Math.max(1,Math.min(hi(f1),low));return [{family:f1,tier:t,count:t<=2&&rand(n*13)<.7?2:1}];}
   // A two-part job: two chains, or two tiers of one while it is the only one out.
   const t=Math.max(1,Math.min(hi(f1),low+1+Math.floor(rand(n*29)*2))),f2=secondChain(families,f1,Math.max(1,t-1),n*23+5);
    // With one generator out (the first quarter hour) a two-part job asks two tiers of its chain
    // (Audit 2026-10-25: three in five orders there repeated one of the last four).
    return f2?[{family:f1,tier:t,count:1},{family:f2,tier:Math.max(1,Math.min(Math.max(1,t-1),reach(s,f2)+1,maxTier(f2)-1)),count:1}]:t>=2?[{family:f1,tier:t,count:1},{family:f1,tier:t-1,count:2}]:[{family:f1,tier:t,count:2}];
  };
  // A repeat, or an order already lying finished on the board, is varied: one more or one fewer
  // of a small part, a tier up within reach, a tier down to the floor, or another open chain;
  // the first that is new is kept.
  // Audit 2026-10-25 (user: "buguding ni hii"): the same parts in another number still read as
  // the same job, so the last four everyday orders' parts are avoided too while there is
  // anything else to ask (measured: repeats 24 % → see docs/V5_AUDIT_FIXES_2026-10-25.md).
  const loose=ns=>ns.map(r=>r.family+r.tier).sort().join('+'),seen=new Set(recent.slice(-4).map(k=>k.replace(/x\d+/g,'')));
  const done=ns=>ns.every(r=>count(s,r)>=r.count),bad=ns=>avoid.has(key(ns))||done(ns),stale=ns=>bad(ns)||seen.has(loose(ns));
  const first=from[Math.floor(rand(n*7)*from.length)];needs=build(first);
  if(stale(needs)){
   const vary=[];const one=ns=>{const r=ns[0];return r;};
   {const v=structuredClone(needs);if(v.length===1&&v[0].tier<=2){v[0].count=v[0].count===1?2:1;vary.push(v);}}
   {const v=structuredClone(needs);if(one(v).tier<hi(one(v).family)){one(v).tier++;vary.push(v);}}
   {const v=structuredClone(needs);if(one(v).tier>floor){one(v).tier--;vary.push(v);}}
   {const v=structuredClone(needs);if(v[1]&&v[1].tier>1){v[1].tier--;vary.push(v);}}
   {const v=structuredClone(needs);if(v[1]&&v[1].tier<hi(v[1].family)){v[1].tier++;vary.push(v);}}
   {const v=structuredClone(needs);if(v.length===1&&v[0].count===1){v[0].count=2;vary.push(v);}}
   for(const f of pool)if(f!==first)vary.push(build(f));
   // the area's focus chain gives way to another open chain before a job repeats (Audit 2026-10-25)
   for(const f of families)if(f!==first&&!pool.includes(f))vary.push(build(f));
   // Best: new to the camp and not already made; else at least not a card on the board.
   const onBoard=new Set(others.map(o=>key(o.needs)));
   needs=vary.find(v=>!stale(v))??(bad(needs)?vary.find(v=>!bad(v))??vary.find(v=>!onBoard.has(key(v))):null)??needs;
  }
  // The level path: from level 8 every sixth everyday order is a crew favour (its first part one tier
  // higher, within reach and the order limits, and a Sea chest or Brass cog on top); from level 5 every eighth
  // pays a Tide token too (every eighth: every fifth left slow players never short of energy). Counted by the order's own number, so it is deterministic.
  // The first everyday order after level 5 pays its Tide token at once (s.pathNext), so the level-up's
  // promise is kept on the next card, not up to eight orders later (measured: the first token came at
  // 51 min, against level 5 at about 10). Favours keep their turn (within six orders): a first favour
  // at once left slow players never short of energy (economy harness, 10 s an action).
  const k=n-FIRST.length,opened=s.pathNext;let bonus;
  if(unlocked(s,'favour')&&k%FAVOUR_EVERY===FAVOUR_EVERY-1){const r=needs[0],up=Math.min(ORDER_TOP,maxTier(r.family)-1,hi(r.family)+1);
   if(up>r.tier){needs=structuredClone(needs);needs[0]={family:r.family,tier:up,count:1};bonus=s.area>=1?'cog':'chest';}}
  if(!bonus&&unlocked(s,'token')&&(opened==='token'||k%TOKEN_EVERY===TOKEN_EVERY-1))bonus='token';
  if(opened==='token'&&bonus==='token')delete s.pathNext;
  // Never two identical cards (2026-10-26: with one generator out, two-part jobs of one chain could
  // run out of new combinations): a quick job not on the board takes the place.
  {const onBoard=new Set(others.map(o=>key(o.needs)));
   if(onBoard.has(key(needs))){const alt=pool.flatMap(f=>Array.from({length:hi(f)},(_,k)=>[1,2].map(c=>[{family:f,tier:k+1,count:c}])).flat()).find(v=>!onBoard.has(key(v)));
    if(alt){needs=alt;role='quick';}}}
  // Secondary chains (pilot): every SECONDARY_ORDERS.every-th everyday order may ask one secondary
  // part, while no other order on the board does (so the others never wait on a drop). A two-part job
  // keeps its first part and asks the secondary as its second (a mixed order); every third such order
  // is a quick job for the secondary alone (with ROLE_TURN's three turns, the turn alone would make
  // them all two-part jobs). A crew favour or a token order keeps its first part and its bonus. Never a
  // gold order (above), never more than one.
  {const sec=bonus&&role==='quick'?null:secondaryNeed(s,n,k);if(sec){if(!bonus&&Math.floor(k/SECONDARY_ORDERS.every)%3===2)role='quick';needs=role==='quick'?[sec]:[{...needs[0],count:1},sec];}}
  recent.push(key(needs));if(recent.length>RECENT)recent.splice(0,recent.length-RECENT);
  return {id:'o'+n,who:crewFor(needs),needs,coins:orderPrice(s,needs,role),role,born:s.moves,...(bonus?{bonus}:{})};
 }
 return {id:'o'+n,who:crewFor(needs),needs,coins:priceOf(needs),born:s.moves};
}
// The secondary part an everyday order asks, if any (pilot). Two kinds take turns (round 2,
// 2026-10-29; the director: asking only what is held was too restrictive):
// - a USE order asks a part that the secondary parts the player already holds (board, shed, or waiting
//   for space) make by merging (secondaryTier): it gives the extras collected a purpose;
// - a GOAL order asks a part at most SECONDARY_ORDERS.goal drops beyond what is held (secondaryGoal):
//   a Bolt when none is held, a Gear with one Bolt, a Gear assembly with three. It is a near-term goal,
//   never a wall: one drop comes at the latest on the `pity`-th eligible tap, and drops never pause
//   while an order wants the chain. Goals come only from a generator whose drops are open and only once
//   its chain has been met, so the first meeting is the drop itself, not an order for something unseen.
// Either way never above `top`, tier 1 only from the first stage built and tier 2 from the third; a
// turn that cannot give its kind gives the other. Measured (pilot doc): in round 1, at 5 % drops, asking
// one drop beyond what was held on EVERY secondary turn sent the scripted player tapping for luck (+80
// min over Chapters 1-2); at 10 % with goals on every other turn, round 2 measured no such cost (R2.2).
// Drops held: each part counts as the drops merged into it (a Gear is two Bolts); the chain's top part
// is a keepsake and does not count (it cannot be split back).
export const secondaryHeld=(s,family)=>[...s.board,...s.shed,...s.pending].reduce((n,x)=>n+(x?.type==='item'&&x.family===family&&x.tier<maxTier(family)?2**x.tier:0),0);
const secondaryCap=s=>{const built=totalBuilt(s);return Math.min(SECONDARY_ORDERS.top,built>=3?2:built>=1?1:0);};
export const secondaryTier=(s,family)=>{const held=secondaryHeld(s,family),cap=secondaryCap(s);
 if(held<1)return -1;let t=0;while(t<cap&&2**(t+1)<=held)t++;return t;};
export const secondaryMet=(s,family)=>s.found.some(k=>k.replace(/\d+$/,'')===family)||s.pending.some(x=>x?.type==='item'&&x.family===family);
export const secondaryGoal=(s,family)=>{if(!secondaryMet(s,family))return -1;const held=secondaryHeld(s,family);let best=-1;
 for(let t=0;t<=secondaryCap(s);t++){const miss=2**t-held;if(miss>=1&&miss<=SECONDARY_ORDERS.goal)best=t;}return best;};
export function secondaryNeed(s,n,k){
 const every=SECONDARY_ORDERS.every;
 if(k%every!==every-1||s.orders.some(o=>o?.needs?.some(r=>isSecondary(r.family))))return null;
 const open=Object.keys(SECONDARY_OF).filter(g=>secondaryOn(s,g)).map(g=>SECONDARY_OF[g]);
 const use=open.filter(f=>secondaryTier(s,f)>=0),goal=open.filter(f=>secondaryGoal(s,f)>=0);
 // goal turns are every other secondary turn
 const kind=Math.floor(k/every)%2===1?(goal.length?'goal':'use'):(use.length?'use':'goal'),fams=kind==='use'?use:goal;if(!fams.length)return null;
 // a use order: the chain with more parts held, else either by the order's own seed; a goal: either
 const most=Math.max(...fams.map(f=>kind==='use'?secondaryHeld(s,f):0)),pick=fams.filter(f=>(kind==='use'?secondaryHeld(s,f):0)===most),family=pick[Math.floor(rand(n*37+11)*pick.length)];
 return {family,tier:kind==='use'?secondaryTier(s,family):secondaryGoal(s,family),count:1};
}
// Board cells an order would take: exact matches, lowest index first.
export function orderItems(s,o){
 const used=new Set(),take=[];
 for(const r of o.needs){let left=r.count;for(let i=0;i<s.board.length&&left;i++)if(!used.has(i)&&matches(s.board[i],r)){used.add(i);take.push(i);left--;}if(left)return null;}
 return take;
}
// A crew order still not ready 200 moves after it came (Audit 2026-10-25: one in ten took over
// an hour, mostly two-crew jobs) is "stuck": its card suggests a new order. Measured: half of
// all crew orders are delivered within 60 moves, nine in ten within about 320. Gold orders
// cannot be changed, so they are never stuck. Orders saved before this have no born and are not.
export const STUCK_MOVES=200;
export const isStuck=(s,o)=>!!o&&!o.story&&Number.isInteger(o.born)&&s.moves-o.born>=STUCK_MOVES&&!orderItems(s,o);
export function orderProgress(s,o){return o.needs.map(r=>({...r,have:Math.min(r.count,count(s,r))}));}

// ---- board helpers ----
const put=(s,x,near=0)=>{const i=nearestFree(s.board,near,cellPos);if(i>=0)s.board[i]=x;return i;};
// Rewards that find no free space wait (Build 47a, ported from PR #80's Chapter 2 plan D6): a
// stage bought on a full board used to lose its generator copy, crate or Tide token. A waiting
// reward is kept in the save (s.pending, in the order it was earned) and lands where a reward with
// room would (the first free space from the top left, as before), first earned first, after the
// next action that leaves a space. Each one is placed once: it
// leaves the list as it lands. PENDING_MAX only bounds what load() accepts (every stage in the
// game gives at most one board reward, far fewer than 100).
export const SEEN_ID=/^[a-z0-9-]{1,40}$/;
export const PENDING_MAX=100,PENDING_TYPES=['source','kit','token','cog','item'];
const give=(s,x)=>{const i=put(s,x);if(i<0)s.pending.push(x);return i;};
const isSecondaryPart=x=>x?.type==='item'&&isSecondary(x.family);
function placePending(s){
 const out=[];
 while(s.pending.length){const i=nearestFree(s.board,0,cellPos);if(i<0)break;const x=s.pending.shift();s.board[i]=x;out.push({index:i,thing:x});}
 return out;
}
// Cargo cell j opens: its find takes the space, or pays out and leaves it free.
function reveal(s,j){
 const f=s.board[j].find;
 if(!f){s.board[j]=null;return {index:j,type:'space'};}
 if(f.type==='jar'){s.board[j]=null;return {index:j,type:'jar',energy:bonus(s,f.energy)};}
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
export const newestGenerator=s=>[...NEWEST_ORDER].reverse().find(g=>sourceOpen(s,g))??'rig';
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
function crack(s,i,power=Infinity,also=[]){
 const cracked=[],freed=[];
 // A triple merge makes parts on two spaces: the glass beside either cracks once.
 for(const j of new Set([i,...also].flatMap(neighbours))){const g=s.board[j];if(g?.type!=='glass'||power<g.tier)continue;
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

// Energy from levels, stages and cargo jars tops energy up to the refill cap and no further
// (Build 41g, user: "energy er ni duusah shinj alga"); bought, daily and ad energy can go over.
function bonus(s,n){const before=s.energy;s.energy=Math.max(s.energy,Math.min(REFILL_CAP,s.energy+n));return s.energy-before;}
// ---- levels ----
function gainXp(s,amount){
 s.level=validLevel(s.level);s.level.xp+=amount;const ups=[];
 while(s.level.xp>=xpToNext(s.level.level)){
  s.level.xp-=xpToNext(s.level.level);s.level.level++;
  // Energy only (Build 41, user: "ene hairtsagiig amarhan uguud baina"): level chests no longer
  // add a driftwood crate.
  const energy=bonus(s,levelEnergy(s.level.level));
  const unlock=LEVEL_PATH.find(u=>u.level===s.level.level);
  if(unlock?.id==='token')s.pathNext='token';
  ups.push({level:s.level.level,energy,family:null,index:-1,...(unlock?{unlock:unlock.id}:{})});
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
  // Build 47b (from PR #80): a stage may wait for another place's stage (requires: {place: stage}).
  const st=t.stages[n];if(!stageReady(s,st))return [];
  return [{id:t.id,stage:n+1,name:st.name,cost:st.cost,effect:st.effect,lines:st.lines,icon:t.icon,place:t.name,materials:(s.materials?.[t.id]??0)>n,...(st.gold?{gold:st.gold}:{})}];}).sort((x,y)=>x.cost-y.cost);
}
export const stageReady=(s,st)=>!st?.requires||Object.entries(st.requires).every(([id,n])=>stageOf(s,id)>=n);
// The next stage of a place that waits for another place (for the card's explanation).
export function blockedStage(s,id){const t=TASKS[id],n=stageOf(s,id),st=t?.stages[n];return st&&!stageReady(s,st)?{stage:n+1,name:st.name,requires:st.requires}:null;}
// The cheapest upgrade whose materials are in (the one the main screen points to), and the
// cheapest still waiting for them (the gold order is for that one).
export const nextTask=s=>upgrades(s).find(u=>u.materials)??null;
export const storyTarget=s=>upgrades(s).find(u=>!u.materials)??null;
export const areaDone=(s,a=currentArea(s))=>!!a&&a.tasks.length>0&&a.tasks.every(t=>stageOf(s,t.id)>=STAGES);
export const builtCount=(s,a=currentArea(s))=>a?a.tasks.reduce((n,t)=>n+stageOf(s,t.id),0):0;
// Every area that has places is finished: the end of this prototype (Build 41 M5).
export const allDone=s=>AREAS.filter(a=>a.tasks.length).every(a=>areaDone(s,a));
// Stages bought in every area (orders grow harder with it).
export const totalBuilt=s=>Object.values(s.built).reduce((n,k)=>n+k,0);
// When an area is complete the next one with places opens (build 31: the Survey Worksite).
function advance(s){let next=null;while(areaDone(s)&&AREAS[s.area+1]?.tasks.length){s.area++;next=AREAS[s.area].id;}return next;}
// A stage waiting for materials with no gold order live gets one at once (Build 41e): it takes the
// place of the crew order the player has made least of (parts made stay on the board). Used after a
// purchase and, since Build 47b (from PR #80), when a save moves on to a new area as it loads.
function ensureGold(s){
 if(s.orders.some(o=>o?.story)||!storyTarget(s))return null;
 const made=o=>orderProgress(s,o).reduce((n,r)=>n+r.have/r.count,0),lane=s.orders.reduce((k,o,i)=>made(o)<made(s.orders[k])?i:k,0);
 const o=makeOrder(s);if(!o.story)return null;s.orders[lane]=o;return o.id;
}

export function act(s,a,now=Date.now()){
 const wasFull=s.energy>=REFILL_CAP,r=step(s,a,now);
 if(!r.ok)return r;
 if(wasFull&&s.energy<REFILL_CAP)s.energyAt=now;
 s.moves++;s.lastAt=now;
 const released=release(s),arrived=placePending(s);
 const found=note(s),xp=r.xp??0,levelUp=xp?gainXp(s,xp):[];
 if(levelUp.length)found.push(...note(s));
 if(levelUp.length)released.push(...release(s));
 if(released.length)r.message+=released.map(n=>` · the ${SOURCES[n.id].name} comes out`).join('');
 return {...r,...(released.length?{released}:{}),...(arrived.length?{arrived}:{}),...(found.length?{found}:{}),...(levelUp.length?{levelUp}:{})};
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
  const n=(s.taps[a.id]??0)+1,chain=GENERATOR_CHAINS[a.id][0][0],tier=Math.min(3,maxTier(chain),(n%4===0?1:0)+levelLift(producerLevel(s.board[i]),n)),sec=secondaryRoll(s,a.id,n),on=secondaryOn(s,a.id)&&!secondaryPaused(s,a.id);
  // Pilot: 'replace' makes the secondary part instead of the tap's own; 'bonus' makes it as well.
  const replace=sec&&SECONDARY_RULES[a.id].model==='replace',x=item(replace?sec:chain,replace?0:tier),j=put(s,x,i);
  // A full board refuses the tap before anything is spent or rolled: no energy, no part, no counter.
  if(j<0)return fail('The board is full. Merge, deliver or open cargo first.');
  s.energy--;s.taps[a.id]=n;
  if(replace){s.secSince[a.id]=0;return {ok:true,event:'produce',index:j,secondary:{family:sec,index:j},message:nameOf(x)};}
  let extra=null;
  if(sec){const y=item(sec,0),k=put(s,y,i);if(k<0)s.pending.push(y);s.secSince[a.id]=0;extra={family:sec,index:k};}
  else if(on)s.secSince[a.id]=Math.min(SECONDARY_RULES[a.id].pity,(s.secSince[a.id]??0)+1);
  return {ok:true,event:'produce',index:j,...(extra?{secondary:extra}:{}),message:nameOf(x)+(extra?' · and a '+nameOf(item(extra.family,0)):'')};
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
   if(!want)return fail(`No crew order is missing a Lv${y.tier+1} part of another kind, so the token cannot turn this one. Try a part of a level an order still needs.`);
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
  // Triple merge (the level path, level 3): a third identical part touching the space dropped on
  // joins, and the three make two (the second takes the third's space).
  const third=unlocked(s,'triple')&&x.tier>=TRIPLE_MIN_TIER?neighbours(to).find(k=>matches(s.board[k],x))??-1:-1;
  if(third>=0){s.board[third]=item(x.family,x.tier+1);s.merges++;}
  return withCracks({ok:true,event:'merge',index:to,...(third>=0?{triple:third}:{}),xp:XP.merge*(third>=0?2:1),message:nameOf(s.board[to])+(third>=0?' ×2 · triple merge':'')},crack(s,to,x.tier+1,third>=0?[third]:[]));
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
  // Audit 2026-10-25 (user: "buguding ni hii"): a delivery also gives the crew +1 energy, so a
  // quick player waits less for energy (measured, chapter: 65 → 44 % of the time at 4 s an
  // action, 44 → 29 % at 6 s; +2 or more left no waiting at all, so energy stopped mattering).
  // Build 46f: the gold order gives no energy (its reward is the stage's materials); with orders
  // asking what the generators make, a stage takes more crew orders and their energy alone kept
  // slower players from ever running out.
  const gain=o.story?0:DELIVER_ENERGY;
  s.coins+=o.coins;s.ordersDone++;s.orders[lane]=null;s.energy=Math.min(MAX_ENERGY,s.energy+gain);
  if(o.story&&TASKS[o.story]&&stageOf(s,o.story)<STAGES)s.materials[o.story]=stageOf(s,o.story)+1;
  s.orders[lane]=makeOrder(s);
  // A tool the order pays on top (the level path): next to the Rover; the delivery has just freed
  // at least one space, and the shed takes it if the board is somehow full.
  let tool=null;
  if(BONUSES.includes(o.bonus)){const x=o.bonus==='cog'?cog():o.bonus==='chest'?kit(newestGenerator(s),2):token(),i=nearestFree(s.board,ROVER,cellPos),k=s.shed.indexOf(null);
   if(i>=0){s.board[i]=x;tool={type:o.bonus,index:i};}else if(k>=0){s.shed[k]=x;tool={type:o.bonus,slot:k};}}
  // A gold order is the materials for its place's next stage (Build 41, user: "story upgrade
  // shuud hurdan hiigdej baina"): the stage can be bought once they are delivered. Orders no
  // longer bring a driftwood crate every third time.
  const materials=o.story&&s.materials[o.story]>stageOf(s,o.story)?{id:o.story,stage:s.materials[o.story]}:null;
  return {ok:true,event:'deliver',index:null,xp:Math.max(1,Math.round(o.coins/COIN_RATE)),coins:o.coins,box:-1,freed:take,...(materials?{materials}:{}),energy:gain,...(tool?{tool}:{}),message:`+${o.coins} coins`+(gain?` · +${gain} energy`:'')+(tool?` · a ${BONUS_NAMES[tool.type]}`:'')+(materials?` · materials for ${TASKS[o.story].stages[materials.stage-1].name}`:'')};
 }
 // Upgrade a place on the beach one stage (the action keeps its old name, 'restore').
 if(a.type==='restore'){
  const up=upgrades(s),t=a.id===undefined?up[0]:up.find(u=>u.id===a.id);
  // Build 47e: a stage that waits for another place (the sea gate for the array) says which.
  const wait=!t&&TASKS[a.id]?blockedStage(s,a.id):null;
  if(wait)return fail(`${wait.name} opens once ${Object.entries(wait.requires).map(([id,n])=>TASKS[id].stages[n-1].name).join(' and ')} is done.`);
  if(!t)return fail(TASKS[a.id]&&stageOf(s,a.id)>=STAGES?`${TASKS[a.id].name} is fully upgraded.`:TASKS[a.id]?'Upgrade the place before it first.':'Everything here is upgraded.');
  if(!t.materials)return fail(`${t.name} needs its materials: deliver the gold order for it.`);
  if(s.coins<t.cost)return fail(`${t.name} needs ${t.cost} coins. Deliver crew orders for coins.`);
  s.coins-=t.cost;s.built[t.id]=t.stage;const e=t.effect??{},effects={};
  if(e.energy){effects.energy=bonus(s,e.energy);}
  if(e.copy){const id=e.copy==='newest'?newestGenerator(s):e.copy;effects.copy=give(s,source(id));effects.copyId=id;}
  if(e.kit){const family=e.kit[0]==='newest'?newestGenerator(s):e.kit[0];effects.kit=give(s,kit(family,e.kit[1]));effects.kitFamily=family;}
  if(e.token){effects.token=give(s,token());}
  if(e.cog){effects.cog=give(s,cog());}
  if(s.pending.length)effects.pending=s.pending.length;
  if(e.slots&&s.slots<e.slots){s.slots=e.slots;while(s.orders.length<s.slots)s.orders.push(makeOrder(s));effects.slots=e.slots;}
  if(areaDone(s)){effects.areaDone=AREAS[s.area].id;const next=advance(s);if(next)effects.nextArea=next;}
  // A stage that opens with no gold order live gets one at once (Build 41e): it takes the place
  // of the crew order the player has made least of (parts made stay on the board).
  // Build 47b (from PR #80): a gold order for a place that needs no more materials (finished, or
  // already supplied) is replaced, so a finished area leaves no stale gold order behind.
  for(let k=0;k<s.orders.length;k++){const o=s.orders[k];if(o?.story&&(stageOf(s,o.story)>=STAGES||(s.materials[o.story]??0)>stageOf(s,o.story))){s.orders[k]=null;s.orders[k]=makeOrder(s);}}
  const gold=ensureGold(s);if(gold)effects.goldOrder=gold;
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
  if(!BOOK_CHAINS.includes(a.family)||!pageReady(s,a.family))return fail(s.book.pages?.includes(a.family)?'This page is already complete.':CHAINS[a.family]?.secondary?'This page pays its coins as its parts are ticked off.':'Find every part on this page first.');
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
 // The prototype-complete screen has been seen (Build 41 M5): it shows once.
 // A story card the player has dismissed (Build 47b, from PR #80): it never plays again by itself.
 if(a.type==='seen'){if(typeof a.id!=='string'||!SEEN_ID.test(a.id))return fail('Unknown story card.');if(s.seen[a.id])return fail('Already seen.');s.seen[a.id]=true;return {ok:true,event:'seen',id:a.id,message:''};}
 if(a.type==='seenEnd'){if(!allDone(s)||s.seenEnd)return fail('Nothing to see yet.');s.seenEnd=true;return {ok:true,event:'seenEnd',message:'The coast so far is restored.'};}
 if(a.type==='recycle'){
  const x=valid(a.index)?s.board[a.index]:null;if(x?.type!=='item')return fail('Only loose parts can be recycled.');
  // A secondary part cost no energy (bonus model), so clearing it gives none back (pilot).
  const gain=isSecondary(x.family)?0:1;s.board[a.index]=null;s.energy=Math.min(MAX_ENERGY,s.energy+gain);
  return {ok:true,event:'recycle',energy:gain,message:'Recycled'+(gain?' · +1 energy':'')};
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
const validOrder=o=>o&&typeof o.id==='string'&&Array.isArray(o.needs)&&o.needs.length>=1&&o.needs.length<=2&&o.needs.every(validNeed)&&integer(o.coins,1,999)&&(o.story===undefined||!!TASKS[o.story])&&['ivo','neri','tamsin','bram'].includes(o.who)&&(o.bonus===undefined||BONUSES.includes(o.bonus));

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
  if(!integer(s.energy,0,MAX_ENERGY)||!integer(s.coins,0,999999)||!integer(s.area,0,AREAS.length-1)||!AREAS[s.area].tasks.length||!integer(s.slots,3,4))return fresh(now);
  // Build 30 could price a sixth-tier story order at NaN coins (saved as null): it is priced again.
  if(Array.isArray(s.orders))for(const o of s.orders)if(o&&o.coins===null&&Array.isArray(o.needs)&&o.needs.every(validNeed))o.coins=priceOf(o.needs,!!o.story);
  if(!Array.isArray(s.orders)||s.orders.length!==s.slots||!s.orders.every(validOrder))return fresh(now);
  for(const o of s.orders)if(o.born!==undefined&&!integer(o.born,0,s.moves))delete o.born;
  if(!s.built||typeof s.built!=='object'||Array.isArray(s.built)||!Object.entries(s.built).every(([id,n])=>TASKS[id]&&integer(n,1,STAGES))||!Array.isArray(s.found))return fresh(now);
  for(const k of ['orderSeq','ordersDone','moves','merges'])if(!integer(s[k],0,1e9))return fresh(now);
  // A generator added later (Build 47e: the Lens Bench) starts with no taps in an older save.
  if(s.taps&&typeof s.taps==='object'&&!Array.isArray(s.taps))for(const k of Object.keys(GENERATOR_CHAINS))s.taps[k]??=0;
  if(!s.taps||!Object.keys(GENERATOR_CHAINS).every(k=>integer(s.taps[k],0,1e9)))return fresh(now);
  // Build 32 added the shed and the daily gift; older saves get an empty shed and a gift today.
  s.shed??=Array(SHED_SLOTS).fill(null);s.daily??={day:-1,count:0};
  // Build 47a added rewards waiting for space, Build 47b dismissed story cards; older saves have none.
  s.pending??=[];s.seen??={};
  // Build 33 added the book: parts already found wait in it to be ticked off.
  s.book??={claimed:[],pages:[]};
  // Build 34 added the shop's daily stock.
  s.shop??={day:-1,bought:{}};
  // Build 36 added order changes.
  s.swaps??={day:-1,n:0,ads:0};
  // Build 44 remembers the last everyday orders (to vary new ones); older or damaged saves start
  // with none, which only means the next order may repeat an old one.
  if(!Array.isArray(s.recent)||s.recent.length>RECENT||!s.recent.every(k=>typeof k==='string'&&k.length<=40))s.recent=[];
  // Build 41 added materials (stages whose gold order is delivered). An older save is not held
  // back: every stage it could buy before has its materials (set below, once its area is known).
  const before41=s.materials===undefined;s.materials??={};
  if(!s.materials||typeof s.materials!=='object'||Array.isArray(s.materials)||!Object.entries(s.materials).every(([id,n])=>TASKS[id]&&integer(n,1,STAGES)))return fresh(now);
  // Build 41 added seenEnd (the prototype-complete screen shown): absent means not yet.
  if(s.seenEnd!==undefined&&typeof s.seenEnd!=='boolean')return fresh(now);
  // The level path (Build 46j): a Tide-token order level 5 promised, still to come. Saves before it
  // have none; a damaged value is dropped (it only means the next token order waits its turn).
  if(s.pathNext!==undefined&&s.pathNext!=='token')delete s.pathNext;
  // The secondary-chain pilot's bad-luck counters (2026-10-29). Saves before it have none: they start
  // at 0, so the first secondary part comes within its `first` taps once it opens. A damaged value only
  // restarts that count (it never resets the camp).
  if(!s.secSince||typeof s.secSince!=='object'||Array.isArray(s.secSince))s.secSince={};
  for(const k of Object.keys(s.secSince))if(!SECONDARY_OF[k])delete s.secSince[k];
  for(const g of Object.keys(SECONDARY_OF))if(!integer(s.secSince[g],0,SECONDARY_RULES[g].pity))s.secSince[g]=0;
  if(!s.swaps||!integer(s.swaps.day,-1,1e7)||!integer(s.swaps.n,0,FREE_SWAPS)||!integer(s.swaps.ads,0,AD_SWAPS))return fresh(now);
  if(!s.shop||!integer(s.shop.day,-1,1e7)||!s.shop.bought||typeof s.shop.bought!=='object'||Array.isArray(s.shop.bought)||!Object.entries(s.shop.bought).every(([id,n])=>SHOP[id]&&integer(n,0,SHOP[id].limit)))return fresh(now);
  const bookKey=k=>typeof k==='string'&&/^[a-z]+\d$/.test(k)&&BOOK_CHAINS.includes(k.slice(0,-1))&&+k.slice(-1)<=maxTier(k.slice(0,-1));
  if(!s.book||!Array.isArray(s.book.claimed)||!Array.isArray(s.book.pages)||!s.book.claimed.every(k=>bookKey(k)&&s.found.includes(k))||new Set(s.book.claimed).size!==s.book.claimed.length||!s.book.pages.every(f=>BOOK_CHAINS.includes(f)&&bookKeys(f).every(k=>s.book.claimed.includes(k))))return fresh(now);
  if(!s.seen||typeof s.seen!=='object'||Array.isArray(s.seen)||!Object.entries(s.seen).every(([k,v])=>SEEN_ID.test(k)&&v===true))return fresh(now);
  if(!Array.isArray(s.pending)||s.pending.length>PENDING_MAX||!s.pending.every(x=>PENDING_TYPES.includes(x?.type)&&validCell(x)))return fresh(now);
  if(!Array.isArray(s.shed)||s.shed.length!==SHED_SLOTS||!s.shed.every(x=>x===null||SHED_TYPES.includes(x?.type)&&validCell(x)))return fresh(now);
  if(!s.daily||!integer(s.daily.day,-1,1e7)||!integer(s.daily.count,0,1e7))return fresh(now);
  s.level=validLevel(s.level);
  // Saves that finished the beach before the Survey Worksite existed go up the cliff.
  // Saves that finished the beach before the Survey Worksite existed go up the cliff, and since
  // Build 47b a finished worksite goes on to the Vault door, with its gold order ready.
  if(advance(s))ensureGold(s);
  // seenEnd marked the end of the content of its day (Build 41 M5); a camp with new places to build
  // (Build 47b: the Vault door) sees the end card again when it reaches the new end.
  // Build 47e: a camp that had read the Tide Archive (Build 47d's end) has the Observatory to build:
  // its first stage gets its gold order at once, as a new area's does.
  if(s.seenEnd&&!allDone(s)){delete s.seenEnd;ensureGold(s);}
  if(before41)for(const u of upgrades(s))s.materials[u.id]=u.stage;
  if(s.rationAt!==undefined&&!(Number.isFinite(s.rationAt)&&s.rationAt<=now))delete s.rationAt;
  if(!Number.isFinite(s.energyAt)||s.energyAt>now)s.energyAt=now;
  settleEnergy(s,now);
  return s;
 }catch{return fresh(now);}
}
