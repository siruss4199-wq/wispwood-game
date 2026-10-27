// Coast Camp, the new loop (v5/next/): rules, saves and scripted-player pacing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cellPos} from '../v5/core.mjs';
import {xpToNext} from '../v5/levels.mjs';
import {rolePrice,RECENT,ROLE_PAY,roleOf,allDone,secondChain,FREE_SWAPS,AD_SWAPS,swapsLeft,adSwapsLeft,SHOP,shopLeft,BOOK_COINS,BOOK_CHAINS,bookKeys,bookReady,pageReady,SHED_SLOTS,DAILY,priceOf,totalBuilt,ORDER_TOP,SAVE_KEY,fresh,act,load,tick,item,jar,nextTask,storyTarget,makeOrder,upgrades,stageOf,areaDone,builtCount,orderItems,sourceOpen,COIN_VALUE,COIN_RATE,CAMP,ROVER,CARGO,GLASS,glass,CHEST_ENERGY,cog,MAX_GENERATOR_LEVEL,UNLOCK_LEVEL,nextKind,token,cargo,cargoKeys,source,CRATES,nameOf,GENERATOR_ORDER} from '../v5/next/game.mjs';
import {AREAS,TASKS} from '../v5/next/areas.mjs';
import {primaryAction} from '../v5/next/guide.mjs';
import {kit} from '../v5/kits.mjs';
import {maxTier as maxTierOf} from '../v5/next/chains.mjs';
import {nextAction} from './v5-next-policy.mjs';

// The camp's parts before build 30 (it now starts empty), for rule tests that need some.
const camp=()=>{const s=fresh(0);for(const [i,t] of [[14,0],[16,0],[20,0],[27,1],[28,0]])s.board[i]=item('rig',t);return s;};
// Every stage's materials in, for rule tests about coins and rewards (Build 41: a stage needs
// its gold order delivered first).
const stock=s=>{s.materials=Object.fromEntries(Object.keys(TASKS).map(id=>[id,3]));return s;};
const ok=(s,a,now=1)=>{const r=act(s,a,now);assert.equal(r.ok,true,JSON.stringify(a)+' '+r.message);return r;};
function refused(s,a){const before=JSON.stringify(s),r=act(s,a,1);assert.equal(r.ok,false,JSON.stringify(a));assert.equal(JSON.stringify(s),before,'refusal leaves state untouched');return r;}

test('its own save key; the Classic keys are never written',()=>{
 assert.equal(SAVE_KEY,'vaultwake-v5-coast');
 for(const f of ['v5/next/game.mjs','v5/next/app.mjs']){const src=readFileSync(new URL('../'+f,import.meta.url),'utf8');assert.doesNotMatch(src,/setItem\('vaultwake-v5'|vaultwake-v5-replay|vaultwake-v5-active-slot/,f);}
});

test('a new camp: Rivet Rover alone in the middle of its camp, sealed cargo and tideglass everywhere else, three orders',()=>{
 const s=fresh(0);
 // Build 41d (user: "ongorhoi nudiig bagasgay"): four open spaces beside the Rover; the camp's
 // corners hold small Rover parts in tideglass that the first merges crack open.
 assert.deepEqual(s.board.flatMap((x,i)=>x===null?[i]:[]),[15,20,22,27],'four open spaces around the Rover');
 assert.deepEqual([14,16,26,28].map(i=>s.board[i]),[glass('rig',0),glass('rig',1),glass('rig',1),glass('rig',0)],'the corners are in tideglass');
 assert.deepEqual(CAMP,[14,15,16,20,21,22,26,27,28]);assert.equal(ROVER,21);assert.deepEqual(s.board[21],source('rig'),'Rivet Rover stands in the middle of the board');
 assert.deepEqual(s.board.flatMap((x,i)=>x?.type==='source'?[x.id]:[]),['rig'],'one generator to start');
 assert.equal(s.board.filter(x=>x?.type==='cargo').length,27);assert.equal(s.board.filter(x=>x?.type==='glass').length,17);
 assert.deepEqual([8,10,19,23,32,34].map(i=>s.board[i].type),Array(6).fill('glass'),'half-buried parts ring the camp');
 assert.ok(s.board.every((x,i)=>CAMP.includes(i)||x.type==='cargo'||x.type==='glass'));
 assert.deepEqual(s.orders.map(o=>o.needs),[[{family:'rig',tier:2,count:1}],[{family:'rig',tier:3,count:1}],[{family:'rig',tier:2,count:1},{family:'rig',tier:1,count:2}]]);
 assert.ok(s.orders.every(o=>!orderItems(s,o)),'no order can be delivered before building something');
 assert.equal(s.coins,0);assert.deepEqual(s.built,{});assert.equal(sourceOpen(s,'chart'),false);assert.equal(nextTask(s),null,'nothing to build before the first gold order');assert.equal(storyTarget(s).id,'beach-path');assert.equal(storyTarget(s).stage,1);
});

// Build 35 (user: "generatoroo hed tovshihod l ehnii 3 task shuud bieleh hemjeend ochij bainshdee"):
// the first orders are a short ladder (Split spanner, Pocket winch, then two kinds at once), so
// taps alone fill none of them and each takes a few merges.
test('the first orders need merging: taps alone fill none; the first takes four taps and two merges',()=>{
 const s=fresh(0),at=[];
 for(let n=0;n<4;n++){at.push(ok(s,{type:'produce',id:'rig'}).index);assert.ok(s.orders.every(o=>!orderItems(s,o)),`no order ready after ${n+1} taps`);}
 const t=fresh(0),i=[0,1,2,3].map(()=>ok(t,{type:'produce',id:'rig'}).index);
 assert.deepEqual(i.map(j=>t.board[j]),[item('rig',0),item('rig',0),item('rig',0),item('rig',1)],'every fourth part comes out a tier higher');
 const r=ok(t,{type:'merge',from:i[0],to:i[1]});assert.equal(r.xp,1);assert.ok(!orderItems(t,t.orders[0]));
 ok(t,{type:'merge',from:i[3],to:i[1]});assert.deepEqual(t.board[i[1]],item('rig',2));
 assert.equal(t.board.filter(x=>x?.type==='cargo').length,27,'merging never opens cargo');
 assert.ok(orderItems(t,t.orders[0]),'a Split spanner: the first order is ready');
 const d=ok(t,{type:'deliver',id:'o0'});assert.equal(d.coins,10);assert.equal(t.coins,10);assert.equal(d.xp,2);assert.equal(t.orders[0].id,'o3');
 refused(t,{type:'deliver',id:'o0'});
});



test('generators cost energy, place near themselves and refuse when locked, empty or full',()=>{
 const s=fresh(0),e=s.energy,r=ok(s,{type:'produce',id:'rig'});
 assert.equal(s.energy,e-1);assert.deepEqual(s.board[r.index],item('rig',0));assert.equal(r.index,15,'the nearest free space');
 refused(s,{type:'produce',id:'chart'});refused(s,{type:'produce',id:'flux'});
 const t=fresh(0);t.energy=0;refused(t,{type:'produce',id:'rig'});
 const u=fresh(0);for(let i=0;i<u.board.length;i++)if(u.board[i]===null)u.board[i]=item('rig',5);refused(u,{type:'produce',id:'rig'});
});

test('coins upgrade each place in three stages; every stage gives a reward',()=>{
 const s=fresh(0);
 refused(s,{type:'restore',id:'beach-path'});
 s.coins=5000;assert.match(refused(s,{type:'restore',id:'beach-path'}).message,/gold order/,'coins alone do not build');
 stock(s);assert.match(refused(s,{type:'restore',id:'beach-tent'}).message,/before it/,'a place opens once the place before it has its first stage');
 let spent=0;
 for(const t of AREAS[0].tasks){if(t.id==='beach-pier')for(const i of [15,22,26])if(s.board[i]?.type!=='source')s.board[i]=null;// room for the sea chest
  const e=s.energy,r=ok(s,{type:'restore',id:t.id});spent+=t.stages[0].cost;assert.equal(s.coins,5000-spent);assert.equal(stageOf(s,t.id),1);assert.equal(r.stage,1);
  if(t.id==='beach-path')assert.deepEqual(s.board[r.effects.kit],kit('rig',1));
  const chest=(r.levelUp??[]).reduce((n,u)=>n+u.energy,0);
  // Build 41g: stage and level energy top up to the refill cap (50) and no further.
  if(t.id==='beach-tent'){assert.ok(r.effects.energy<=8);assert.equal(s.energy,Math.max(e,Math.min(50,e+8+chest)));}
  if(t.id==='beach-mast'){assert.equal(s.slots,4);assert.equal(s.orders.length,4);}
  if(t.id==='beach-workshop'){assert.deepEqual(s.board[r.effects.copy],source('rig'),'a second Rivet Rover');const m=ok(s,{type:'merge',from:r.effects.copy,to:ROVER});assert.equal(s.board[ROVER].level,2);assert.equal(m.released,undefined,'level 2 is not yet enough for the Kite');}
  if(t.id==='beach-pier')assert.deepEqual(s.board[r.effects.kit],kit('rig',2),'a sea chest for the newest generator (still Rover here)');
  if(t.id==='beach-beacon')assert.equal(s.energy,Math.max(e,Math.min(50,e+10+chest)));
  assert.equal(s.board.filter(x=>x?.type==='cargo').length,27,'upgrades never open cargo');
 }
 // Later stages follow, in any order; the cheapest open one is the next.
 assert.equal(upgrades(s).length,7);assert.ok(upgrades(s).every(u=>u.stage===2));assert.equal(nextTask(s).id,'beach-path');
 for(let k=0;k<14;k++){const u=nextTask(s),r=ok(s,{type:'restore',id:u.id});assert.ok(Object.keys(r.effects).filter(k=>k!=='areaDone').length>=1,'every stage gives a reward');if(k<13)assert.equal(r.effects.areaDone,undefined);else{assert.equal(r.effects.areaDone,'beach');assert.equal(r.effects.nextArea,'worksite');}}
 // The last stage opens the Survey Worksite (build 31).
 assert.ok(areaDone(s,AREAS[0]));assert.equal(builtCount(s,AREAS[0]),21);assert.equal(s.area,1);assert.equal(builtCount(s),0);assert.equal(nextTask(s).id,'ws-camp');
 assert.match(refused(s,{type:'restore',id:'beach-path'}).message,/fully upgraded/);assert.match(refused(s,{type:'restore',id:'ws-ropes'}).message,/before it/);
 assert.deepEqual(AREAS[0].tasks.map(t=>t.stages.length),Array(7).fill(3));
 const total=AREAS[0].tasks.flatMap(t=>t.stages.map(x=>x.cost)).reduce((a,b)=>a+b);assert.equal(total,2800);// Build 41h: ×2 (was 1400)
 assert.ok(AREAS[0].tasks.every(t=>t.stages[0].cost<t.stages[1].cost&&t.stages[1].cost<t.stages[2].cost),'each stage costs more');
});

test('orders grow harder with the beach and the generators, never repeat a live need, and one is the story\'s',()=>{
 const tiers=(s,n=40)=>{const all=[];for(let k=0;k<n;k++){const o=makeOrder(s);if(o.story)s.orders.push(o);else all.push(o.needs[0].tier);}assert.equal(all.length,n-1);return all;};// the main part (a second part may be one tier lower)
 // A new beach and a level-1 Rover: tiers 1-2 only.
 const a=fresh(0);a.orderSeq=10;const t0=tiers(a);assert.ok(Math.min(...t0)>=1&&Math.max(...t0)<=2,JSON.stringify([...new Set(t0)]));
 // Player level alone changes nothing (build 29).
 const b=fresh(0);b.orderSeq=10;b.level.level=9;assert.deepEqual(tiers(b),t0);
 // Twelve beach stages: tier 3 and up (an easy turn one under), but never more than one tier
 // past what a level-1 Rover makes easily (Build 41g).
 const c=fresh(0);c.orderSeq=10;c.built={'beach-path':3,'beach-tent':3,'beach-mast':3,'beach-workshop':3};const t2=tiers(c);assert.ok(Math.min(...t2)>=2&&Math.max(...t2)<=3,JSON.stringify([...new Set(t2)]));
 // A generator at level 3 lifts the top tier by one.
 const d=fresh(0);d.orderSeq=10;d.board[ROVER].level=3;{const t=tiers(d);assert.ok(t.includes(3)&&Math.max(...t)===4,'a hard turn goes one tier over the top (Build 41g)');}
 // The story's order: one at a time, for the next beach stage, the newest generator's best part, half as much again.
 const e=fresh(0);e.orderSeq=10;e.orders=[];const so=makeOrder(e);assert.equal(so.story,'beach-path');assert.equal(so.needs[0].family,'rig');assert.equal(so.needs[0].tier,2);
 assert.equal(so.coins,Math.round(so.needs.reduce((v,r)=>v+r.count*COIN_VALUE[r.tier],0)*1.5/5)*5);
 e.orders.push(so);assert.equal(makeOrder(e).story,undefined,'only one story order at a time');
 // Delivering it brings the next story order; normal orders pay by tier and never repeat a live need.
 const s=fresh(0);s.board[15]=source('chart');
 for(let n=0;n<60;n++){
  const o=s.orders[n%3];for(const r of o.needs)for(let k=0;k<r.count;k++){const i=s.board.indexOf(null);assert.ok(i>=0);s.board[i]=item(r.family,r.tier);}
  ok(s,{type:'deliver',id:o.id});
  assert.ok(s.orders.filter(x=>x.story).length<=1);
  // Build 44: a bigger kind of job pays more for its parts (rounded to 5); the first three are the plain ladder.
  for(const x of s.orders)if(!x.story)assert.equal(x.coins,x.role?rolePrice(x.needs,x.role):x.needs.reduce((v,r)=>v+r.count*COIN_VALUE[r.tier],0));
  s.board=s.board.map(x=>x?.type==='kit'||x?.type==='item'?null:x);s.board[15]??=source('chart');
 }
 assert.equal(s.ordersDone,60);
 // Its gold order brought the first stage's materials; nothing else is open, so no gold order waits.
 assert.equal(s.materials['beach-path'],1);assert.ok(!s.orders.some(x=>x.story),'no gold order while every open stage has its materials');
 const r=ok(s,{type:'restore',id:'beach-path'},2);assert.ok(r.effects.goldOrder,'building a stage brings the next gold order at once');
 assert.equal(s.orders.find(x=>x.story).story,'beach-path','the next stage wants its own');assert.equal(s.orders.length,3);
 // Saves keep it; a story order for a place that does not exist starts a new camp.
 assert.deepEqual(load(JSON.stringify(s),5).orders,s.orders);
 const bad=structuredClone(s);bad.orders.find(x=>x.story).story='nowhere';assert.equal(load(JSON.stringify(bad),5).moves,0);
});


// Build 41 (user: "ene hairtsagiig amarhan uguud baina"): orders no longer bring a box.
test('orders pay coins, no box; boxes and generator levels work here too',()=>{
 const s=fresh(0);s.ordersDone=2;const o=s.orders[1];s.board[15]=item('rig',3);
 const d=ok(s,{type:'deliver',id:o.id});assert.equal(d.box,-1);assert.ok(!s.board.some(x=>x?.type==='kit'),'no box');
 const t=fresh(0);t.board[15]=kit('rig',3);refused(t,{type:'merge',from:15,to:ROVER});// crates no longer feed generators
 t.board[15]=source('rig');const r=ok(t,{type:'merge',from:15,to:ROVER});assert.equal(r.event,'producerUp');assert.equal(t.board[ROVER].level,2);
 t.board[15]=kit('rig',1);t.board[22]=kit('rig',1);ok(t,{type:'merge',from:15,to:22});assert.deepEqual(t.board[22],kit('rig',2));
 ok(t,{type:'openKit',index:22});
});

test('levels give energy, no crate',()=>{
 const s=camp();s.level.xp=19;const e=s.energy,r=ok(s,{type:'merge',from:14,to:16});
 assert.equal(r.levelUp[0].level,2);assert.equal(r.levelUp[0].family,null);assert.ok(!s.board.some(x=>x?.type==='kit'),'no crate');assert.equal(s.board.filter(x=>x?.type==='cargo').length,27);
 assert.equal(CHEST_ENERGY,15);assert.equal(s.energy,Math.min(50,e+15),'up to the refill cap');
 // Build 41g: level energy tops up to 50 and no further; bought energy above it is kept.
 for(const [start,end] of [[30,45],[45,50],[60,60]]){const t=camp();t.level.xp=19;t.energy=start;ok(t,{type:'merge',from:14,to:16});assert.equal(t.energy,end,`${start} → ${end}`);}
});

test('energy refills over time and a low-energy ration helps once an hour',()=>{
 const s=fresh(0);s.energy=0;s.energyAt=0;tick(s,10*60*1000);assert.equal(s.energy,5);
 const t=fresh(0);t.energy=2;ok(t,{type:'ration'},1000);assert.equal(t.energy,10);t.energy=1;refused(t,{type:'ration'});
});

test('saves round-trip; anything malformed starts a new camp',()=>{
 const s=camp();ok(s,{type:'merge',from:14,to:16});s.board[15]=kit('chart',2);s.board[ROVER].level=3;
 const back=load(JSON.stringify(s),5);assert.deepEqual(back.board,s.board);assert.deepEqual(back.orders,s.orders);assert.equal(back.moves,1);
 const bad=[x=>x.version=5,x=>x.board[2]={type:'water'},x=>x.board[2]={type:'cargo'},x=>x.board[2]=cargo({family:'gold',tier:0}),x=>x.board[2]=cargo({family:'rig',tier:1},item('rig',5)),x=>x.board[2]=cargo({family:'rig',tier:1},{type:'kit',family:'zz',size:1,left:3}),x=>x.board[2]=cargo({family:'rig',tier:1},{type:'coins',n:0}),x=>x.board[2]=cargo({family:'rig',tier:1},source('nope')),x=>x.board.pop(),x=>x.board[2]={type:'item',family:'gold',tier:0},x=>x.board[2]={type:'crate',kind:'salvage',left:3},x=>x.coins=-1,x=>x.orders.pop(),x=>x.orders[0].who='zed',x=>x.built.nowhere=1,x=>x.built['beach-path']=4,x=>x.built=[],x=>x.slots=5,x=>x.taps.rig=-1,x=>x.board[ROVER].level=9];
 for(const f of bad){const t=structuredClone(s);f(t);assert.equal(load(JSON.stringify(t),5).moves,0,f.toString());}
 assert.equal(load('not json',5).moves,0);
 const classic=readFileSync(new URL('./fixtures/stage2/conduit-completed.json',import.meta.url),'utf8');assert.equal(load(classic,5).moves,0,'a Classic save is not a Coast Camp save');
});

// Build 41h (user: "story upgrade task bielelt heterhii hurdan ... merge togloh medremj avch
// amjilgui", choosing a classic free-to-play pace): about three minutes of play per stage, and
// energy runs out, so the beach takes longer in real time than in play.
test('a scripted player upgrades Landing Beach (21 stages) in 45–110 minutes of play and runs out of energy',()=>{
 for(const step of [5000,6000]){
  const s=fresh(0);let now=0,firstRestore=null,actions=0,waited=0;const levels=[];
  while(s.area<1&&now<24*3600e3){
   tick(s,now);const a=nextAction(s);if(!a){now+=30000;waited+=30000;continue;}
   const r=ok(s,a,now);actions++;now+=step;
   if(r.event==='restore'&&firstRestore===null)firstRestore=now;
   for(const u of r.levelUp??[])levels.push(now);
  }
  assert.ok(areaDone(s,AREAS[0]),'area complete');
  assert.ok(firstRestore<3*60*1000,'first upgrade within 3 minutes');
  const play=now-waited;assert.ok(play>=45*60000&&play<=110*60000,`area 1 took ${(play/60000).toFixed(1)} min of play`);
  assert.ok(waited>0,'energy ran out');assert.ok(now<=4*3600e3,`and the beach is done within ${(now/3600e3).toFixed(1)} h of real time`);
  assert.ok(levels.length>=4,'several level-ups');
  console.log(JSON.stringify({step,minutes:+(now/60000).toFixed(1),firstRestore:+(firstRestore/60000).toFixed(1),actions,levels:levels.length,energy:s.energy,waited}));
 }
});

test('crates are named for the coast; merges and feeding work as before',()=>{
 assert.deepEqual(CRATES,['Driftwood crate','Sea chest','Captain\'s trunk']);
 assert.equal(nameOf(kit('rig',1)),'Driftwood crate · Rivet Rover');assert.equal(nameOf(kit('chart',3)),'Captain\'s trunk · Survey Kite');
 const s=fresh(0);s.board[1]=kit('rig',3);s.board[6]=kit('rig',3);assert.match(act(s,{type:'merge',from:1,to:6},1).message,/as big as crates get/);
});

test('cargo opens only with the part it shows, only at the edge of open ground; the part is used up',()=>{
 const s=camp();
 // 9, straight above the Rover, holds a star pouch and opens with a Split spanner; it touches the camp.
 assert.deepEqual(s.board[9].key,{family:'rig',tier:2});
 refused(s,{type:'merge',from:14,to:9});// a Copper offcut is the wrong part
 refused(s,{type:'move',from:14,to:3});refused(s,{type:'openKit',index:3});refused(s,{type:'recycle',index:3});
 s.board[15]=item('rig',2);const coins=s.coins,r=ok(s,{type:'merge',from:15,to:9});
 assert.equal(r.event,'unseal');assert.equal(s.board[15],null,'the key is used');assert.equal(s.board[9],null,'a coin pouch leaves the space free');assert.equal(s.coins,coins+15);assert.equal(r.xp,2);
 // 2 is buried deeper (behind cargo and tideglass): it opens only once a neighbour is open.
 s.board[15]=item('rig',4);assert.match(refused(s,{type:'unseal',from:15,index:2}).message,/deeper/);
 // Energy is rare and small: one of two +5 jars.
 s.board[22]=item('rig',3);let e=s.energy;const k=ok(s,{type:'unseal',from:22,index:33});assert.equal(k.opened.type,'jar');assert.equal(s.energy,e+5);
 assert.equal(Object.values(CARGO).filter(c=>c[2].type==='jar').length,2);assert.ok(Object.values(CARGO).every(c=>c[2].type!=='jar'||c[2].energy<=5));
 // 3 now touches open ground (9), but it is on the edge: it wants a Survey Kite part (a Survey scope).
 assert.deepEqual(s.board[3].key,{family:'chart',tier:4});assert.match(refused(s,{type:'unseal',from:15,index:3}).message,/opens with/);
 s.board[15]=item('chart',4);const st=s.coins;ok(s,{type:'unseal',from:15,index:3});assert.equal(s.coins,st+50,'deeper crates pay more');assert.equal(s.board[3],null);
 s.board[15]=item('rig',3);ok(s,{type:'unseal',from:15,index:13});assert.deepEqual(s.board[13],kit('rig',1));
 assert.equal(s.board.filter(x=>x?.type==='cargo').length,23);
});

test('one generator, one chain; each generator at level 3 brings out the next kind',async()=>{
 const {GENERATOR_CHAINS,CHAINS}=await import('../v5/next/chains.mjs');
 for(const g of Object.keys(GENERATOR_CHAINS)){assert.equal(GENERATOR_CHAINS[g].length,1);assert.equal(CHAINS[GENERATOR_CHAINS[g][0][0]].gen,g);}
 assert.deepEqual(GENERATOR_ORDER,['rig','chart','rope','shell','lamp']);assert.equal(UNLOCK_LEVEL,3);
 assert.deepEqual(GENERATOR_ORDER.map(nextKind),['chart','rope','shell','lamp',null]);
 // Cargo holds no generators or cogs any more: copies come from the beach's stages (build 18).
 assert.ok(Object.values(CARGO).every(c=>c[2].type!=='source'&&c[2].type!=='cog'),'no generators or cogs in cargo');
 for(const [,c] of Object.entries(CARGO))assert.ok(GENERATOR_ORDER.includes(CHAINS[c[0]].gen));
 const gifts=AREAS[0].tasks.flatMap(t=>t.stages.flatMap((st,k)=>st.effect?.copy?[t.id+(k+1)+':'+st.effect.copy]:[]));
 // Build 41g (user: "1-2 turliin oiroltsoo tuvshinii itemiin task tasraltgui"): four Rovers early so
 // the Survey Kite comes out early (Build 41h: the lanterns' Rover, as stages are slower).
 assert.deepEqual(gifts,['beach-path2:rig','beach-path3:rig','beach-tent2:rig','beach-mast2:rig','beach-workshop1:newest','beach-pier2:newest','beach-beacon2:newest','beach-cliff2:newest'],'the beach gives four Rovers, then copies of the newest generator');
 // Play it through: two Rovers make level 2.
 const s=fresh(0);s.board[7]=source('rig');
 // Merge the two Rovers: level 2 is not enough yet; a Brass cog makes level 3 and brings out the Survey Kite beside it.
 const m2=ok(s,{type:'merge',from:7,to:ROVER});assert.equal(s.board[ROVER].level,2);assert.equal(m2.released,undefined);assert.equal(sourceOpen(s,'chart'),false);
 s.board[7]=cog();const m=ok(s,{type:'merge',from:7,to:ROVER});assert.equal(s.board[ROVER].level,3);
 assert.equal(m.released.length,1);assert.equal(m.released[0].id,'chart');assert.deepEqual(s.board[m.released[0].index],source('chart'));
 for(let n=0;n<8;n++){const p=ok(s,{type:'produce',id:'chart'});assert.equal(s.board[p.index].family,'chart');s.board[p.index]=null;}
 refused(s,{type:'produce',id:'rope'});
 // A Brass cog on a level-2 Kite brings out the Rope Winch; a full board only delays it.
 const t=structuredClone(s);t.board.find(x=>x?.type==='source'&&x.id==='chart').level=2;for(let i=0;i<t.board.length;i++)if(t.board[i]===null)t.board[i]=item('rig',0);
 const k=t.board.findIndex(x=>x?.type==='source'&&x.id==='chart');t.board[t.board.findIndex(x=>x?.type==='item')]=cog();
 const c=t.board.findIndex(x=>x?.type==='cog'),u=ok(t,{type:'merge',from:c,to:k});assert.equal(u.released?.length,1,'the cog leaves a space for it');
 // An old save whose Rover is already level 3 gets its Kite on the next action.
 const old=fresh(0);old.board[ROVER].level=3;old.moves=5;const back=load(JSON.stringify(old),5);assert.equal(sourceOpen(back,'chart'),false);
 const e=ok(back,{type:'produce',id:'rig'});assert.equal(e.released[0].id,'chart');
});

test('cargo keys grow harder away from the camp and every generator is reachable',()=>{
 const s=fresh(0),keys=cargoKeys(s);
 assert.deepEqual(keys.map(k=>k.index),[9,33],'only the crates touching open ground show their keys (the camp corners are glass at first)');
 // The more useful the find, the harder the key: in each ring, Tide tokens, captain's trunks
 // and big coin pouches need a higher part than any small pouch, energy, part or small crate.
 const ring=i=>{const [r,c]=cellPos(i);return Math.max(Math.abs(r-3),Math.abs(c-3));},useful=f=>f.type==='token'||f.type==='kit'&&f.size===3||f.type==='coins'&&f.n>=60;
 for(const n of [2,3]){
  const cells=Object.entries(CARGO).filter(([i])=>ring(+i)===n),hi=Math.min(...cells.filter(([,c])=>useful(c[2])).map(([,c])=>c[1])),lo=Math.max(...cells.filter(([,c])=>!useful(c[2])).map(([,c])=>c[1]));
  assert.ok(hi>=lo&&hi>=4,`ring ${n}: tokens, trunks and big pouches need tier ${hi}+, everyday finds at most ${lo}`);
 }
 assert.ok(keys.filter(k=>!useful(s.board[k.index].find)).every(k=>k.tier>=2&&k.tier<=3),'everyday crates next to the camp: well-merged parts (Split spanners, Pocket winches, Survey scopes)');
 assert.equal(keys.filter(k=>k.tier===2).length,1,'one easier crate, straight above the Rover, to teach it');
 assert.equal(Object.values(CARGO).filter(c=>c[2].type==='token').length,4,'four Tide tokens');
 assert.deepEqual(CARGO[42].slice(0,2),['rope',4],'the far corner (a big coin pouch) needs a Rope ladder');
 // A scripted player finds every generator during Landing Beach.
 const t=fresh(0);let now=0;const found=[];
 while(t.area<1&&now<90*60*1000){tick(t,now);const a=nextAction(t);if(!a){now+=30000;continue;}const r=ok(t,a,now);now+=6000;for(const n of r.released??[])found.push([n.id,+(now/60000).toFixed(1)]);}
 assert.equal(found[0][0],'chart','Rivet Rover level 3 brings out the Survey Kite during Landing Beach');
 assert.ok(found.map(f=>f[0]).every((id,n)=>id===['chart','rope','shell','lamp'][n]),'kinds come out in order');
 const at=Object.fromEntries(found);assert.ok(at.chart>=8&&at.chart<25,`the Survey Kite after levelling the Rover twice (${at.chart} min)`);
 assert.ok(!at.rope||at.rope-at.chart>=6,'the Rope Winch takes more levelling (or waits for the next area)');
 assert.ok(t.board.some(x=>x?.type==='cargo'),'some cargo is still sealed when the beach is restored');
 console.log(JSON.stringify({generatorsFoundAt:found,sealedLeft:t.board.filter(x=>x?.type==='cargo').length}));
});

test('build-4 (tide) and build-3 (sand) saves load as sealed cargo, keeping everything',()=>{
 // A build-4 save: water with finds, the Kite and Crucible standing on the board, two places restored.
 const v2=fresh(0);v2.version=2;
 v2.board=v2.board.map((x,i)=>x?.type==='cargo'?{type:'water',...(i%3?{find:{type:'item',family:'rig',tier:1}}:{})}:x);
 v2.board[5]={type:'source',id:'chart'};v2.board[30]={type:'source',id:'flux'};v2.board[9]=item('rig',2);
 v2.done=['beach-path','beach-tent'];v2.moves=33;v2.stars=5;delete v2.coins;delete v2.built;for(const o of v2.orders){o.stars=o.coins/COIN_RATE;delete o.coins;}delete v2.taps.rope;delete v2.taps.shell;delete v2.taps.lamp;
 const s=load(JSON.stringify(v2),5);
 assert.equal(s.version,4);assert.equal(s.moves,33,'the camp is kept');assert.equal(s.coins,25,'stars become coins, five to a star');assert.deepEqual(s.built,{'beach-path':1,'beach-tent':1});
 assert.ok(!s.board.some(x=>x?.type==='water'));assert.deepEqual(s.board[9],item('rig',2));
 assert.equal(s.board[5].type,'source');assert.equal(s.board[2].type,'cargo');assert.deepEqual(s.board[2].key,{family:CARGO[2][0],tier:CARGO[2][1]});
 for(const g of ['rope','shell','lamp'])assert.equal(s.board.filter(x=>x?.type==='cargo'&&x.find?.type==='source'&&x.find.id===g).length,1,g+' is sealed somewhere');
 // A build-3 save goes through the same step.
 const v1=structuredClone(v2);v1.version=1;v1.board=v1.board.map((x,i)=>x?.type==='water'?(i>=36?{type:'gate',level:3}:{type:'sand',...(x.find?{find:x.find}:{})}):x);
 const t=load(JSON.stringify(v1),5);assert.equal(t.version,4);assert.equal(t.moves,33);assert.ok(!t.board.some(x=>['sand','gate','water'].includes(x?.type)));
});

test('tideglass takes no part: merges beside it crack it, the third breaks it and frees the part as it is',()=>{
 const s=camp();
 assert.deepEqual(s.board[8],{type:'glass',family:'rig',tier:2},'a Split spanner in glass beside the camp');
 s.board[15]=item('rig',2);
 assert.match(refused(s,{type:'merge',from:15,to:8}).message,/beside it/,'even its twin cannot be laid on it (that is what cargo does)');
 refused(s,{type:'move',from:8,to:15});refused(s,{type:'recycle',index:8});
 // Glass is not open ground: cargo behind it stays sealed until the glass breaks.
 assert.ok(!cargoKeys(s).some(k=>k.index===7));
 // A small merge beside it (two Copper offcuts make a Grip tool) is too weak to crack it.
 const w=ok(s,{type:'merge',from:16,to:14});assert.equal(w.cracked,undefined);assert.equal(s.board[8].cracks,undefined);
 // A merge beside it that makes a Split spanner or better (any chain) cracks it.
 s.board[16]=item('rig',1);const r=ok(s,{type:'merge',from:16,to:14});
 assert.deepEqual(r.cracked,[8]);assert.equal(r.broken,undefined);assert.equal(s.board[8].cracks,1);assert.match(r.message,/cracks/);
 // A merge elsewhere does nothing to it.
 s.board[22]=item('rig',2);s.board[26]=item('rig',2);ok(s,{type:'merge',from:26,to:22});assert.equal(s.board[8].cracks,1);
 s.board[14]=item('rig',3);s.board[20]=item('rig',3);ok(s,{type:'merge',from:20,to:14});assert.equal(s.board[8].cracks,2);
 // The third merge beside it breaks it: the Split spanner is free, nothing was used up.
 s.board[20]=item('rig',4);const t=ok(s,{type:'merge',from:20,to:14});
 assert.deepEqual(t.broken,[8]);assert.deepEqual(s.board[8],item('rig',2));assert.equal(t.xp,3);assert.match(t.message,/breaks/);
 assert.ok(cargoKeys(s).some(k=>k.index===7),'the cargo behind it now shows its key');
 // Glass of every generator's chain lies near where it is found.
 const fams=Object.values(GLASS).map(g=>g[0]);for(const f of ['rig','chart','rope','shell','lamp'])assert.ok(fams.includes(f),f);
 // Saves keep glass and its cracks; a build-9 save with uncracked glass still loads; malformed glass starts fresh.
 const u=fresh(0);u.board[0].cracks=1;u.moves=3;assert.deepEqual(load(JSON.stringify(u),5).board[0],{type:'glass',family:'chart',tier:3,cracks:1});
 const old=fresh(0);delete old.board[0].cracks;old.moves=4;assert.equal(load(JSON.stringify(old),5).moves,4);
 for(const f of [x=>x.board[0]={type:'glass',family:'rig',tier:7},x=>x.board[0].cracks=3,x=>x.board[0].cracks=-1]){const v=fresh(0);v.moves=3;f(v);assert.equal(load(JSON.stringify(v),5).moves,0,f.toString());}
});


test('a Brass cog (from older saves) still raises the generator it is laid on by one level',()=>{
 const s=camp();s.board[15]=cog();
 refused(s,{type:'merge',from:15,to:14});refused(s,{type:'recycle',index:15});refused(s,{type:'openKit',index:15});
 ok(s,{type:'move',from:15,to:22});
 const u=ok(s,{type:'merge',from:22,to:ROVER});assert.equal(u.event,'producerUp');assert.equal(u.cog,true);assert.equal(s.board[ROVER].level,2);assert.ok(!s.board.some(x=>x?.type==='cog'),'the cog is used up');
 s.board[15]=cog();s.board[ROVER].level=MAX_GENERATOR_LEVEL;assert.match(refused(s,{type:'merge',from:15,to:ROVER}).message,/top level/);
 const back=load(JSON.stringify(s),5);assert.deepEqual(back.board[15],cog());
 for(const f of [x=>x.board[15]={type:'cog',level:2},x=>x.board[2]=cargo({family:'rig',tier:4},{type:'cog',n:1})]){const t=structuredClone(s);f(t);assert.equal(load(JSON.stringify(t),5).moves,0,f.toString());}
});

test('a Tide token from hard cargo turns a part into one a crew order is waiting for',()=>{
 const s=fresh(0);
 // Cell 7, in the corner beside the camp, holds a token behind a Crawler jack.
 assert.deepEqual(s.board[7],cargo({family:'rig',tier:4},token()));
 s.board[14]=null;// the camp corner's glass is broken
 s.board[15]=item('rig',3);ok(s,{type:'unseal',from:15,index:13});
 s.board[15]=item('rig',4);const r=ok(s,{type:'unseal',from:15,index:7});
 assert.equal(r.opened.type,'token');assert.deepEqual(s.board[7],token());assert.match(r.message,/Tide token/);
 refused(s,{type:'recycle',index:7});refused(s,{type:'merge',from:7,to:ROVER});
 // An order wants a Sight lens (Kite, tier 2); lay the token on a Split spanner (Rover, tier 2).
 s.orders[0]={id:'o99',who:'neri',needs:[{family:'chart',tier:2,count:1}],coins:10};
 s.board[22]=item('rig',2);const t=ok(s,{type:'merge',from:7,to:22});
 assert.equal(t.event,'swap');assert.deepEqual(s.board[22],item('chart',2));assert.ok(!s.board.some(x=>x?.type==='token'),'the token is used up');
 assert.ok(orderItems(s,s.orders[0]),'the order can be delivered');
 // No order waits for another part of that tier: refused, nothing changes.
 s.board[15]=token();s.board[26]=item('rig',5);assert.match(refused(s,{type:'merge',from:15,to:26}).message,/No crew order/);
 // Saves keep a token; a malformed one starts a new camp.
 assert.deepEqual(load(JSON.stringify(s),5).board[15],token());
 const bad=structuredClone(s);bad.board[15]={type:'token',n:2};assert.equal(load(JSON.stringify(bad),5).moves,0);
});

test('a build-15 save (version 3, stars) loads with coins and its restored places at stage 1',()=>{
 const v3=fresh(0);v3.version=3;v3.stars=12;v3.done=['beach-path','beach-tent','beach-mast'];delete v3.coins;delete v3.built;
 for(const o of v3.orders){o.stars=o.coins/COIN_RATE;delete o.coins;}
 v3.board[2]=cargo({family:'rig',tier:4},{type:'stars',n:4});v3.moves=40;v3.slots=4;v3.orders.push({...v3.orders[0],id:'o9'});
 const s=load(JSON.stringify(v3),5);
 assert.equal(s.version,4);assert.equal(s.moves,40,'the camp is kept');assert.equal(s.coins,60);assert.equal(s.stars,undefined);assert.equal(s.done,undefined);
 assert.deepEqual(s.built,{'beach-path':1,'beach-tent':1,'beach-mast':1});
 assert.deepEqual(s.orders.map(o=>o.coins),v3.orders.map(o=>o.stars*COIN_RATE));assert.deepEqual(s.board[2].find,{type:'coins',n:20});
 // Its next upgrades: the Workshop's first stage, and second stages of what it has.
 assert.deepEqual(upgrades(s).map(u=>u.id+u.stage).sort(),['beach-mast2','beach-path2','beach-tent2','beach-workshop1']);
 // Its Classic save keys are never part of this.
 assert.equal(SAVE_KEY,'vaultwake-v5-coast');
});

test('the edge of the board wants Kite and Rope Winch parts; generators come only from the beach',()=>{
 // Every crate on the outer ring opens with a Survey Kite or a Rope Winch part, so the edge opens as they arrive.
 const ring=i=>{const [r,c]=cellPos(i);return Math.max(Math.abs(r-3),Math.abs(c-3));};
 const edge=Object.entries(CARGO).filter(([i])=>ring(+i)===3);assert.equal(edge.length,17);
 assert.ok(edge.every(([,c])=>['chart','rope'].includes(c[0])),'no Rover keys on the edge');
 assert.ok(edge.some(([,c])=>c[0]==='chart')&&edge.some(([,c])=>c[0]==='rope'));
 const s=fresh(0);assert.equal(s.board.filter(x=>x?.type==='glass'||x?.type==='cargo').length,44);
 // Levels give energy, never generators.
 const t=camp();t.level.level=4;t.level.xp=xpToNext(4)-1;const before=t.board.filter(x=>x?.type==='source').length;
 const r=ok(t,{type:'merge',from:14,to:16});assert.equal(r.levelUp[0].level,5);assert.equal(r.levelUp[0].generator,undefined);
 assert.equal(t.board.filter(x=>x?.type==='source').length,before,'no generator from a level');
});


test('a generator looks different at each level',async()=>{
 const {draw}=await import('../v5/next/chains.mjs');
 assert.doesNotMatch(draw(source('rig')),/genDeco/,'level 1 is plain');
 for(const L of [2,3,4,5]){const svg=draw({type:'source',id:'rig',level:L});assert.match(svg,new RegExp(`genDeco lv${L}`));}
 assert.ok(draw({type:'source',id:'rig',level:5}).length>draw({type:'source',id:'rig',level:2}).length,'higher levels add more: plate, ring, sparkles, crown');
});

// Build 31: a tighter economy and the second area, the Survey Worksite.
const beachDone=()=>Object.fromEntries(AREAS[0].tasks.map(t=>[t.id,3]));
test('the Survey Worksite: seven places in three stages, every stage a reward, the Rope Winch its focus',()=>{
 const w=AREAS[1];assert.equal(w.id,'worksite');assert.equal(w.focus,'rope');assert.ok(!w.coming);assert.ok(w.intro.length>=1);
 assert.deepEqual(w.tasks.map(t=>t.stages.length),Array(7).fill(3));
 assert.ok(w.tasks.every(t=>t.stages[0].cost<t.stages[1].cost&&t.stages[1].cost<t.stages[2].cost),'each stage costs more');
 assert.ok(w.tasks.every(t=>t.stages.every(x=>Object.keys(x.effect).length===1&&x.lines.length>=1)),'every stage gives one reward and a line');
 assert.equal(w.tasks.flatMap(t=>t.stages.map(x=>x.cost)).reduce((a,b)=>a+b),3270);// Build 41h: ×2 (Build 41e: 1635)
 assert.equal(Object.keys(TASKS).length,14,'place ids are unique across areas');
 assert.ok(AREAS.slice(2).every(a=>a.coming&&!a.tasks.length),'later areas are still to come');
 // Its stages are bought like the beach's and keep the beach's stages.
 const s=stock(fresh(0));s.area=1;s.built=beachDone();s.coins=5000;
 assert.equal(nextTask(s).id,'ws-camp');const r=ok(s,{type:'restore'});assert.equal(r.task,'ws-camp');assert.equal(r.effects.energy,Math.min(8,Math.max(0,50-40)));
 assert.equal(stageOf(s,'beach-cliff'),3);assert.equal(builtCount(s),1);assert.equal(totalBuilt(s),22);
});

test('worksite orders lean on the Rope Winch, ask tier 3–5 and pay whole coins',()=>{
 const s=fresh(0);s.area=1;s.built=beachDone();s.board[15]=source('chart');s.board[16]=source('rope');s.board[ROVER].level=3;s.orderSeq=10;
 const main=[];for(let k=0;k<80;k++){const o=makeOrder(s);if(o.story){s.orders.push(o);continue;}main.push(o);}
 const rope=main.filter(o=>o.needs[0].family==='rope').length;
 assert.ok(rope/main.length>=.45,`rope orders ${rope}/${main.length}`);
 for(const o of main){assert.ok(o.needs.every(r=>r.tier>=1&&r.tier<=ORDER_TOP),JSON.stringify(o.needs));assert.ok(o.needs[0].tier>=2,'tier 3 and up, an easy turn one under');assert.ok(Number.isInteger(o.coins)&&o.coins>0);assert.equal(o.coins,rolePrice(o.needs,roleOf(o)));}
 // The beach alone has no focus: Rope Winch parts are one chain among the others there.
 const b=fresh(0);b.built=beachDone();b.board[15]=source('chart');b.board[16]=source('rope');b.board[ROVER].level=3;b.orderSeq=10;// the same generators
 const bm=[];for(let k=0;k<80;k++){const o=makeOrder(b);if(o.story)b.orders.push(o);else bm.push(o);}
 assert.ok(bm.filter(o=>o.needs[0].family==='rope').length<rope);
});

test('no order asks past tier 5 or is worth NaN; a saved NaN-priced order is priced again',()=>{
 // Build 30 could ask a sixth-tier Star chart for the beach's last stage and price it NaN.
 const s=fresh(0);s.built={...beachDone(),'beach-cliff':2};s.board[15]=source('chart');s.board[15].level=3;s.board[ROVER].level=3;s.orders=[];
 const so=makeOrder(s);assert.equal(so.story,'beach-cliff');assert.ok(so.needs[0].tier<=ORDER_TOP);assert.ok(Number.isInteger(so.coins));
 for(let k=0;k<100;k++){const o=makeOrder(s);assert.ok(Number.isInteger(o.coins)&&o.needs.every(r=>r.tier<=ORDER_TOP),JSON.stringify(o));}
 assert.equal(COIN_VALUE.length,8,'every tier a chain has is priced');
 const t=fresh(0);t.moves=7;t.orders[0]={id:'o99',who:'neri',needs:[{family:'chart',tier:6,count:1},{family:'rig',tier:3,count:1}],coins:NaN,story:'beach-cliff'};
 const back=load(JSON.stringify(t),5);assert.equal(back.moves,7,'the save is kept');assert.equal(back.orders[0].coins,priceOf(t.orders[0].needs,true));assert.ok(Number.isInteger(back.orders[0].coins));
});

test('a save that finished the beach before the worksite existed goes up the cliff; one in progress stays',()=>{
 const s=fresh(0);s.built=beachDone();s.coins=40;s.moves=900;s.board[16]=source('rope');delete s.materials;
 const back=load(JSON.stringify(s),5);assert.equal(back.area,1);assert.equal(back.moves,900);assert.equal(back.coins,40);assert.deepEqual(back.built,s.built);assert.equal(nextTask(back).id,'ws-camp');
 const t=fresh(0);t.built={...beachDone(),'beach-cliff':2};t.moves=500;const u=load(JSON.stringify(t),5);assert.equal(u.area,0);assert.equal(u.moves,500);
 // An area out of range still starts a new camp.
 const v=fresh(0);v.area=4;v.moves=3;assert.equal(load(JSON.stringify(v),5).moves,0);
});

test('the economy is tight: energy runs out through both areas, and both still finish',()=>{
 // A quick player (an action every 4 s) runs out of energy and buys packs when coins allow.
 const s=fresh(0);let now=0,waited=0,lowest=99,beach=null,shell=null,lamp=null;const STEP=4000;
 assert.equal(s.energy,40,'a new camp starts with 40 energy');
 let beachWait=0;
 while(!(s.area===1&&areaDone(s))&&now<48*3600e3){
  // Build 41g: out of energy, a player buys the shop's Energy pack when coins allow.
  tick(s,now);const a=nextAction(s);if(!a&&s.energy<1&&act(s,{type:'buy',id:'energy',day:Math.floor(now/864e5)},now).ok)continue;if(!a){now+=30000;waited+=30000;continue;}
  const r=ok(s,a,now);now+=STEP;if(r.effects?.nextArea){beach=now;beachWait=waited;}if(r.released?.some(n=>n.id==='shell'))shell=now;if(r.released?.some(n=>n.id==='lamp'))lamp=now;
  if(beach&&now>beach+5*60000)lowest=Math.min(lowest,s.energy);
 }
 assert.ok(areaDone(s,AREAS[1]),'the worksite is finished');
 const beachPlay=beach-beachWait,sitePlay=now-beach-(waited-beachWait);
 assert.ok(beachPlay>=40*60000&&beachPlay<=100*60000,`the beach took ${(beachPlay/60000).toFixed(1)} min of play`);
 assert.ok(sitePlay>=40*60000&&sitePlay<=110*60000,`the worksite took ${(sitePlay/60000).toFixed(1)} min of play`);
 assert.ok(now<=12*3600e3,`both areas within ${(now/3600e3).toFixed(1)} h of real time`);
 assert.ok(shell>beach,'the Shell Trap comes out at the worksite');
 assert.ok(lamp>shell&&lamp<now,'the Lantern Kiln comes out before the worksite is finished (build 36)');
 assert.ok(lowest<1,`energy runs out at the worksite (lowest ${lowest})`);
 console.log(JSON.stringify({beach:+(beach/60000).toFixed(1),worksite:+((now-beach)/60000).toFixed(1),waited:waited/60000,shell:+(shell/60000).toFixed(1),lamp:+(lamp/60000).toFixed(1)}));
});

// Build 32: the camp shed and the daily gift.
test('the shed holds four parts, crates, cogs or tokens off the board; they do not count for orders',()=>{
 const s=camp();assert.deepEqual(s.shed,Array(SHED_SLOTS).fill(null));assert.equal(SHED_SLOTS,4);
 s.orders[0]={id:'oX',who:'ivo',needs:[{family:'rig',tier:1,count:1}],coins:5};
 assert.ok(orderItems(s,s.orders[0]));
 const r=ok(s,{type:'store',index:27});assert.equal(r.slot,0);assert.deepEqual(s.shed[0],item('rig',1));assert.equal(s.board[27],null);
 assert.equal(orderItems(s,s.orders[0]),null,'a part in the shed does not fill an order');
 s.board[15]=kit('rig',1);s.board[22]=cog();s.board[26]=token();
 ok(s,{type:'store',index:15,slot:3});assert.deepEqual(s.shed[3],kit('rig',1));ok(s,{type:'store',index:22});ok(s,{type:'store',index:26});
 assert.deepEqual(s.shed.map(x=>x.type),['item','cog','token','kit']);
 assert.match(refused(s,{type:'store',index:14}).message,/full/);
 refused(s,{type:'store',index:ROVER});refused(s,{type:'store',index:0});refused(s,{type:'store',index:9});// generators, glass and cargo stay
 // Out again: to the space asked for, else the nearest free one to the Rover.
 const o=ok(s,{type:'unstore',slot:0,to:27});assert.equal(o.index,27);assert.deepEqual(s.board[27],item('rig',1));assert.equal(s.shed[0],null);
 const p=ok(s,{type:'unstore',slot:1,to:14});assert.notEqual(p.index,14,'an occupied space sends it to a free one');assert.equal(s.board[p.index].type,'cog');
 refused(s,{type:'unstore',slot:0});
 const full=fresh(0);full.shed[2]=item('chart',2);for(let i=0;i<full.board.length;i++)if(full.board[i]===null)full.board[i]=item('rig',0);refused(full,{type:'unstore',slot:2});
 // Saves keep the shed.
 assert.deepEqual(load(JSON.stringify(s),5).shed,s.shed);
});

test('a daily gift each new day, seven in a cycle; a missed day does not reset it',()=>{
 assert.equal(DAILY.length,7);
 const s=fresh(0);s.board[16]=source('chart');assert.deepEqual(s.daily,{day:-1,count:0});
 const e=s.energy,a=ok(s,{type:'daily',day:20000});assert.equal(a.gift.day,1);assert.equal(s.energy,e+10);
 assert.match(refused(s,{type:'daily',day:20000}).message,/tomorrow/);refused(s,{type:'daily',day:19999});refused(s,{type:'daily'});
 const c=s.coins;ok(s,{type:'daily',day:20003});assert.equal(s.coins,c+25,'day 2 after a gap of three days');
 const k=ok(s,{type:'daily',day:20004});assert.deepEqual(s.board[k.index],kit('chart',1),'a driftwood crate of the newest generator');
 ok(s,{type:'daily',day:20005});const t=ok(s,{type:'daily',day:20006});assert.equal(s.board[t.index].type,'token');
 ok(s,{type:'daily',day:20007});const g=ok(s,{type:'daily',day:20008});assert.equal(g.gift.day,7);assert.equal(s.board[g.index].type,'cog');
 const again=ok(s,{type:'daily',day:20009});assert.equal(again.gift.day,1,'round again');assert.equal(s.daily.count,8);
 // A gift that needs a space goes to the shed when the board is full, and waits when both are.
 const f=fresh(0);f.daily={day:5,count:2};for(let i=0;i<f.board.length;i++)if(f.board[i]===null)f.board[i]=item('rig',0);
 const r=ok(f,{type:'daily',day:6});assert.equal(r.gift.slot,0);assert.equal(f.shed[0].type,'kit');
 f.daily.count=4;f.shed=f.shed.map(()=>item('rig',1));assert.match(refused(f,{type:'daily',day:7}).message,/space/);
});

test('saves from before the shed and the daily gift load with an empty shed and a gift waiting',()=>{
 const s=camp();ok(s,{type:'merge',from:14,to:16});s.moves=40;delete s.shed;delete s.daily;
 const back=load(JSON.stringify(s),5);assert.equal(back.moves,40);assert.deepEqual(back.shed,Array(SHED_SLOTS).fill(null));assert.deepEqual(back.daily,{day:-1,count:0});
 assert.equal(act(back,{type:'daily',day:100},5).ok,true,'the first gift is ready');
 for(const f of [x=>x.shed=[null],x=>x.shed[0]={type:'source',id:'rig'},x=>x.shed[1]=item('gold',1),x=>x.daily={day:'x',count:0},x=>x.daily.count=-1]){const t=fresh(0);t.moves=3;f(t);assert.equal(load(JSON.stringify(t),5).moves,0,f.toString());}
});

// Build 33: the collection book.
test('the book: each part found pays its coins once when ticked off; a whole page gives a Brass cog',()=>{
 assert.deepEqual(BOOK_CHAINS,GENERATOR_ORDER,'one page per generator chain');assert.equal(BOOK_COINS.length,8);
 assert.equal(bookKeys('lamp').length,5);assert.equal(bookKeys('rig').length,8);
 const s=fresh(0);assert.deepEqual(s.book,{claimed:[],pages:[]});assert.deepEqual(bookReady(s),[]);
 const a=ok(s,{type:'produce',id:'rig'}),b=ok(s,{type:'produce',id:'rig'});assert.deepEqual(bookReady(s),['rig0']);
 refused(s,{type:'book',key:'rig1'});refused(s,{type:'book',key:'flux0'});refused(s,{type:'book'});
 const c=s.coins,r=ok(s,{type:'book',key:'rig0'});assert.equal(r.coins,BOOK_COINS[0]);assert.equal(s.coins,c+BOOK_COINS[0]);
 assert.match(refused(s,{type:'book',key:'rig0'}).message,/Already/);
 ok(s,{type:'merge',from:a.index,to:b.index});assert.deepEqual(bookReady(s),['rig1'],'a new part waits in the book');
 // A full page: every Rivet Rover part found and ticked → a Brass cog, once.
 const p=fresh(0);p.found=bookKeys('rig');refused(p,{type:'bookPage',family:'rig'});
 let coins=0;for(const k of bookKeys('rig')){coins+=ok(p,{type:'book',key:k}).coins;}assert.equal(coins,BOOK_COINS.reduce((x,y)=>x+y));
 assert.ok(pageReady(p,'rig'));const g=ok(p,{type:'bookPage',family:'rig'});assert.equal(p.board[g.index].type,'cog');assert.deepEqual(p.book.pages,['rig']);
 assert.match(refused(p,{type:'bookPage',family:'rig'}).message,/already/);refused(p,{type:'bookPage',family:'chart'});refused(p,{type:'bookPage',family:'flux'});
 // With the board full the cog goes to the shed; with both full it waits.
 const f=fresh(0);f.found=bookKeys('lamp');f.book.claimed=[...f.found];for(let i=0;i<f.board.length;i++)if(f.board[i]===null)f.board[i]=item('rig',0);
 assert.equal(ok(f,{type:'bookPage',family:'lamp'}).slot,0);assert.equal(f.shed[0].type,'cog');
 const h=fresh(0);h.found=bookKeys('lamp');h.book.claimed=[...h.found];for(let i=0;i<h.board.length;i++)if(h.board[i]===null)h.board[i]=item('rig',0);h.shed=h.shed.map(()=>item('rig',1));
 assert.match(refused(h,{type:'bookPage',family:'lamp'}).message,/space/);
 assert.deepEqual(load(JSON.stringify(p),5).book,p.book,'saves keep the book');
});

test('saves from before the book load with every part already found waiting in it',()=>{
 const s=camp();ok(s,{type:'merge',from:14,to:16});s.moves=60;delete s.book;assert.ok(s.found.length>=2);
 const back=load(JSON.stringify(s),5);assert.equal(back.moves,60);assert.deepEqual(back.book,{claimed:[],pages:[]});assert.deepEqual(bookReady(back),s.found.filter(k=>/^(rig|chart|rope|shell|lamp)/.test(k)));
 for(const f of [x=>x.book={claimed:'x',pages:[]},x=>x.book.claimed=['rig9'],x=>x.book.claimed=['rig5'],x=>x.book.claimed=['rig1','rig1'],x=>x.book.pages=['rig'],x=>x.book.pages=['flux']]){const t=camp();ok(t,{type:'merge',from:14,to:16});t.moves=3;f(t);assert.equal(load(JSON.stringify(t),5).moves,0,f.toString());}
});

// Build 34: the shop and rewarded-ad offers.
test('the shop sells energy, crates, a token and a cog for coins, a few a day',()=>{
 const s=fresh(0);s.board[15]=source('chart');s.coins=1000;assert.deepEqual(s.shop,{day:-1,bought:{}});
 const e=s.energy;ok(s,{type:'buy',id:'energy',day:50});assert.equal(s.energy,e+20);assert.equal(s.coins,920);
 ok(s,{type:'buy',id:'energy',day:50});ok(s,{type:'buy',id:'energy',day:50});assert.equal(shopLeft(s,'energy',50),0);
 assert.match(refused(s,{type:'buy',id:'energy',day:50}).message,/tomorrow/);
 const c=ok(s,{type:'buy',id:'chest',day:50});assert.deepEqual(s.board[c.index],kit('chart',2),'a sea chest of the newest generator');
 const t=ok(s,{type:'buy',id:'token',day:50});assert.equal(s.board[t.index].type,'token');refused(s,{type:'buy',id:'token',day:50});
 const g=ok(s,{type:'buy',id:'cog',day:50});assert.equal(s.board[g.index].type,'cog');assert.equal(s.coins,1000-240-40-50-200);
 // A new day restocks; an earlier day is refused.
 assert.equal(shopLeft(s,'energy',51),3);ok(s,{type:'buy',id:'cog',day:51});refused(s,{type:'buy',id:'cog',day:50});assert.equal(s.shop.day,51);
 // Not enough coins, unknown offers, ad offers through 'buy', energy past the cap: refused, untouched.
 const p=fresh(0);p.coins=30;assert.match(refused(p,{type:'buy',id:'chest',day:1}).message,/40 coins/);
 refused(p,{type:'buy',id:'gold',day:1});refused(p,{type:'buy',id:'adEnergy',day:1});refused(p,{type:'buy',id:'chest'});
 const q=fresh(0);q.coins=500;q.energy=110;assert.match(refused(q,{type:'buy',id:'energy',day:1}).message,/full/);
 // Energy bought costs more coins than orders pay for it (about 3 coins an energy).
 assert.ok(SHOP.energy.cost/SHOP.energy.energy>3.5);
 // With the board full a crate goes to the shed; with both full the coins stay.
 const f=fresh(0);f.coins=100;for(let i=0;i<f.board.length;i++)if(f.board[i]===null)f.board[i]=item('rig',0);
 assert.equal(ok(f,{type:'buy',id:'chest',day:1}).slot,0);f.shed=f.shed.map(()=>item('rig',1));assert.match(refused(f,{type:'buy',id:'token',day:1}).message,/space/);assert.equal(f.coins,60);
 assert.deepEqual(load(JSON.stringify(s),5).shop,s.shop,'saves keep the day\'s stock');
});

test('rewarded-ad offers give energy or a crate, free, a few a day; they cannot be bought',()=>{
 const s=fresh(0);s.energy=0;const r=ok(s,{type:'adReward',id:'adEnergy',day:9});assert.equal(r.ad,true);assert.equal(s.energy,15);assert.equal(s.coins,0);
 ok(s,{type:'adReward',id:'adEnergy',day:9});ok(s,{type:'adReward',id:'adEnergy',day:9});refused(s,{type:'adReward',id:'adEnergy',day:9});
 const k=ok(s,{type:'adReward',id:'adCrate',day:9});assert.deepEqual(s.board[k.index],kit('rig',1));ok(s,{type:'adReward',id:'adCrate',day:9});refused(s,{type:'adReward',id:'adCrate',day:9});
 refused(s,{type:'adReward',id:'energy',day:9});refused(s,{type:'adReward',id:'cog',day:9});
 assert.deepEqual(Object.entries(SHOP).filter(([,o])=>o.ad).map(([id])=>id),['adEnergy','adCrate']);
});

test('saves from before the shop load with a full day\'s stock; a malformed shop starts a new camp',()=>{
 const s=camp();s.moves=12;delete s.shop;const back=load(JSON.stringify(s),5);assert.equal(back.moves,12);assert.deepEqual(back.shop,{day:-1,bought:{}});
 for(const f of [x=>x.shop={day:'x',bought:{}},x=>x.shop.bought={gold:1},x=>x.shop.bought={cog:2},x=>x.shop.bought=[]]){const t=fresh(0);t.moves=3;f(t);assert.equal(load(JSON.stringify(t),5).moves,0,f.toString());}
});

test('CrazyGames adapter: lifecycle once per change, rewarded ads that always restore, quiet without the SDK',async()=>{
 const {initPlatform,platform,rewardedAd,resetPlatform}=await import('../v5/next/platform-cg.mjs');
 // No SDK: everything is a no-op and the stand-in decides.
 resetPlatform();delete globalThis.CrazyGames;
 assert.equal(await initPlatform(),false);await platform.setPlaying(true);assert.equal(platform.playing,false);
 assert.equal(await rewardedAd({standIn:async()=>'finished'}),'finished');assert.equal(platform.muted(),false);
 const calls=[];let mode='finish';
 const fake={environment:'crazygames',init:async()=>calls.push('init'),game:{settings:{muteAudio:false},loadingStart:()=>calls.push('loadingStart'),loadingStop:()=>calls.push('loadingStop'),gameplayStart:()=>calls.push('start'),gameplayStop:()=>calls.push('stop'),happytime:()=>calls.push('happy')},
  ad:{requestAd(kind,cb){calls.push('ad:'+kind);if(mode==='silent')return;cb.adStarted();mode==='finish'?cb.adFinished():cb.adError('no fill');}}};
 try{
  resetPlatform();globalThis.CrazyGames={SDK:fake};
  assert.equal(await initPlatform(),true);await platform.loadingStart();await platform.loadingStart();await platform.loadingStop();
  await platform.setPlaying(true);await platform.setPlaying(true);await platform.happytime();
  assert.deepEqual(calls,['init','loadingStart','loadingStop','start','happy'],'each change is passed on once');
  // An ad stops gameplay, mutes through onStart/onEnd and starts gameplay again, finished or not.
  for(const [m,want] of [['finish','finished'],['error','error']]){mode=m;calls.length=0;const seen=[];
   assert.equal(await rewardedAd({onStart:()=>seen.push('mute'),onEnd:()=>seen.push('unmute'),standIn:async()=>'stand-in'}),want);
   assert.deepEqual(calls,['stop','ad:rewarded','start']);assert.deepEqual(seen,['mute','unmute']);}
  // No answer at all: the game is given back after the timeout, with the sound.
  mode='silent';calls.length=0;const seen=[];
  assert.equal(await rewardedAd({onStart:()=>seen.push('mute'),onEnd:()=>seen.push('unmute'),standIn:async()=>'x',timeout:30}),'error');
  assert.deepEqual(seen,['unmute']);assert.deepEqual(calls,['stop','ad:rewarded','start']);
  fake.game.settings.muteAudio=true;assert.equal(platform.muted(),true,'CrazyGames can mute the game');
  // Outside CrazyGames the SDK reports disabled: no calls, the stand-in plays.
  resetPlatform();fake.environment='disabled';calls.length=0;
  assert.equal(await initPlatform(),false);assert.equal(await rewardedAd({standIn:async()=>'stand-in'}),'stand-in');assert.deepEqual(calls,['init']);
  // An SDK that never finishes init does not hold the game.
  resetPlatform();globalThis.CrazyGames={SDK:{...fake,environment:'crazygames',init:()=>new Promise(()=>{})}};assert.equal(await initPlatform({timeout:20}),false);
 }finally{delete globalThis.CrazyGames;resetPlatform();}
});


// Build 36: the Lantern Kiln comes out at the worksite; stuck orders can be changed.
test('the worksite\'s stage copies reach the Lantern Kiln: Light the door gives the missing one',()=>{
 const w=AREAS[1].tasks.flatMap(t=>t.stages);assert.equal(w.filter(x=>x.effect.copy==='newest').length,6);
 assert.deepEqual(w.find(x=>x.name==='Light the door').effect,{copy:'newest'});
 // Three copies take a generator from level 1 to 3: the Rope Winch's bring out the Shell Trap, the Shell Trap's the Kiln.
 const s=fresh(0);s.board[15]=source('shell');for(const i of [14,16,20])s.board[i]=source('shell');
 ok(s,{type:'merge',from:14,to:15});ok(s,{type:'merge',from:20,to:16});const r=ok(s,{type:'merge',from:16,to:15});
 assert.equal(s.board[15].level,3);assert.deepEqual(r.released.map(n=>n.id),['lamp']);
});

test('a stuck crew order can be changed: three a day free, then five after an ad; never the gold one',()=>{
 const s=fresh(0);s.board[15]=source('chart');s.orderSeq=10;s.orders=[];for(let k=0;k<3;k++)s.orders.push(makeOrder(s));
 const story=s.orders.find(o=>o.story),lane=s.orders.findIndex(o=>!o.story),old=s.orders[lane];
 assert.ok(story,'one gold order');assert.match(refused(s,{type:'swapOrder',id:story.id,day:3}).message,/gold/);
 const r=ok(s,{type:'swapOrder',id:old.id,day:3});assert.equal(r.ad,false);assert.notEqual(s.orders[lane].id,old.id);
 assert.notDeepEqual(s.orders[lane].needs,old.needs,'it asks for something else');assert.ok(!s.orders[lane].story);
 assert.equal(s.orders.length,3);assert.equal(swapsLeft(s,3),FREE_SWAPS-1);assert.equal(s.coins,0,'free');
 for(let k=1;k<FREE_SWAPS;k++)ok(s,{type:'swapOrder',id:s.orders[lane].id,day:3});
 assert.match(refused(s,{type:'swapOrder',id:s.orders[lane].id,day:3}).message,/ad/);
 for(let k=0;k<AD_SWAPS;k++)assert.equal(ok(s,{type:'swapOrder',id:s.orders[lane].id,day:3,ad:true}).ad,true);
 assert.equal(adSwapsLeft(s,3),0);refused(s,{type:'swapOrder',id:s.orders[lane].id,day:3,ad:true});
 // A new day: three free again; an earlier day or an unknown order is refused.
 assert.equal(swapsLeft(s,4),FREE_SWAPS);ok(s,{type:'swapOrder',id:s.orders[lane].id,day:4});refused(s,{type:'swapOrder',id:s.orders[lane].id,day:3});
 refused(s,{type:'swapOrder',id:'o999',day:4});refused(s,{type:'swapOrder',id:s.orders[lane].id});
 assert.deepEqual(load(JSON.stringify(s),5).swaps,s.swaps,'saves keep the day\'s changes');
 // Older saves get a full day of changes; a malformed record starts a new camp.
 const t=camp();t.moves=9;delete t.swaps;assert.deepEqual(load(JSON.stringify(t),5).swaps,{day:-1,n:0,ads:0});
 for(const f of [x=>x.swaps={day:'x',n:0,ads:0},x=>x.swaps.n=4,x=>x.swaps.ads=-1]){const u=fresh(0);u.moves=3;f(u);assert.equal(load(JSON.stringify(u),5).moves,0,f.toString());}
});

// Build 41 (M1): the second part of an order comes from another open chain, evenly.
test('second parts are spread evenly over the other open chains, for 2 to 5 open chains',()=>{
 const gens=['rig','chart','rope','shell','lamp'],seeds=[10,1000,5000,20000,77777];
 for(let k=2;k<=5;k++){
  const s=fresh(0);gens.slice(1,k).forEach((g,i)=>{s.board[[15,16,20,22][i]]=source(g);});
  s.built=Object.fromEntries(AREAS[0].tasks.slice(0,4).map(t=>[t.id,3]));
  const open=gens.slice(0,k),byMain={};let total=0;
  for(const seed of seeds){s.orderSeq=seed;
   for(let n=0;n<4000;n++){s.orders=[{id:'x',who:'ivo',needs:[{family:'rig',tier:9,count:1}],coins:5,story:'beach-path'}];
    const o=makeOrder(s);assert.ok(o.needs.every(r=>open.includes(r.family)),'only open chains are asked for');
    assert.ok(o.needs.every(r=>r.tier>=1&&r.tier<=maxTierOf(r.family)));
    if(o.needs.length<2||o.needs[1].family===o.needs[0].family)continue;
    const m=o.needs[0].family;(byMain[m]??={})[o.needs[1].family]=(byMain[m][o.needs[1].family]??0)+1;total++;}}
  assert.ok(total>=1000,`${k} chains: ${total} second parts`);
  for(const [m,c] of Object.entries(byMain)){const n=Object.values(c).reduce((a,b)=>a+b,0),others=open.filter(f=>f!==m);
   if(n<200)continue;
   for(const f of others){const share=(c[f]??0)/n,even=1/others.length;assert.ok(share>=even*.65&&share<=even*1.35,`${k} chains, main ${m}: ${f} has ${(share*100).toFixed(1)}% of ${n} (even ${(even*100).toFixed(1)}%)`);}}
 }
 // Story orders too: their second part is spread over the other open chains.
 {const s=fresh(0);['chart','rope','shell'].forEach((g,i)=>{s.board[[15,16,20][i]]=source(g);});const c={};
  for(let n=0;n<1200;n++){s.orderSeq=100+n;s.orders=[];const o=makeOrder(s);assert.ok(o.story);if(o.needs[1])c[o.needs[1].family]=(c[o.needs[1].family]??0)+1;}
  const n=Object.values(c).reduce((a,b)=>a+b,0);for(const f of ['rig','chart','rope'])assert.ok((c[f]??0)/n>=.2,`story second parts: ${JSON.stringify(c)}`);}
 // The helper itself: never the main chain, only chains that reach the tier, null when none.
 assert.equal(secondChain(['rig'],'rig',2,1),null);
 for(let n=0;n<200;n++){const c=secondChain(['rig','chart','lamp'],'chart',3,n);assert.ok(['rig','lamp'].includes(c));}
 assert.equal(secondChain(['rig','lamp'],'rig',5,1),null,'Lantern Kiln parts stop at tier 4');
});

// Build 41 (user: "umnu story upgrade shuud hurdan hiigdej baina"): a stage needs coins and its
// gold order's materials. A save from before keeps every stage it could buy then.
test('a stage needs its gold order delivered; older saves keep what they could buy',()=>{
 const s=fresh(0);s.coins=500;assert.match(refused(s,{type:'restore',id:'beach-path'}).message,/gold order/);
 const so=makeOrder(s);assert.equal(so.story,'beach-path');s.orders[0]=so;
 for(const r of so.needs)for(let k=0;k<r.count;k++)s.board[s.board.indexOf(null)]=item(r.family,r.tier);
 const d=ok(s,{type:'deliver',id:so.id});assert.deepEqual(d.materials,{id:'beach-path',stage:1});assert.match(d.message,/materials for Clear the landing path/);
 assert.equal(s.materials['beach-path'],1);assert.equal(nextTask(s).id,'beach-path');ok(s,{type:'restore',id:'beach-path'});
 assert.equal(nextTask(s),null,'the next stage waits for its own gold order');
 assert.equal(s.orders.filter(x=>x.story).length,1,'and building brought it at once');assert.equal(s.orders.length,3,'in place of a crew order');
 // A Build 40 save mid-beach (no materials field): every stage it could buy is open; nothing else.
 const old=fresh(0);old.built={'beach-path':2,'beach-tent':1};old.coins=120;old.moves=300;delete old.materials;
 const back=load(JSON.stringify(old),5);assert.equal(back.moves,300);assert.equal(back.coins,120);assert.deepEqual(back.built,old.built);
 assert.deepEqual(back.materials,{'beach-path':3,'beach-tent':2,'beach-mast':1});assert.ok(upgrades(back).every(u=>u.materials));
 ok(back,{type:'restore',id:'beach-path'});
 // A Build 41 save keeps its materials as they are; a malformed entry starts a new camp.
 assert.deepEqual(load(JSON.stringify(s),5).materials,s.materials);
 for(const m of [{'nowhere':1},{'beach-path':4},{'beach-path':0},[]]){const t=structuredClone(s);t.materials=m;assert.equal(load(JSON.stringify(t),5).moves,0,JSON.stringify(m));}
});

// Build 41 M3: one primary action, in order: deliver, upgrade, a wanted pair, the wanted
// generator, a crate key, any pair, then why nothing can happen.
test('the primary action names the one next step',()=>{
 const s=fresh(0);assert.deepEqual(primaryAction(s),{kind:'tap',index:ROVER,id:'rig',label:'Tap Rivet Rover for a Copper offcut'});
 s.board[14]=item('rig',0);s.board[16]=item('rig',0);
 assert.deepEqual(primaryAction(s).kind,'merge');assert.deepEqual(primaryAction(s).cells,[14,16]);
 s.board[20]=item('rig',2);const d=primaryAction(s);assert.equal(d.kind,'deliver');assert.equal(d.id,'o0');
 s.coins=40;s.board[20]=null;assert.notEqual(primaryAction(s).kind,'upgrade','coins alone are not enough');stock(s);assert.equal(primaryAction(s).kind,'upgrade');assert.match(primaryAction(s).label,/Clear the landing path/);
 // The tapped order comes first: a Pocket winch (tier 3) is wanted, a pair of Split spanners leads to it.
 const t=fresh(0);t.board[15]=source('chart');t.board[14]=item('rig',2);t.board[16]=item('rig',2);t.board[20]=item('chart',0);t.board[22]=item('chart',0);
 t.orders=[{id:'a',who:'neri',needs:[{family:'chart',tier:1,count:1}],coins:5},{id:'b',who:'ivo',needs:[{family:'rig',tier:3,count:1}],coins:25}];
 assert.deepEqual(primaryAction(t).cells,[20,22]);assert.deepEqual(primaryAction(t,'b').cells,[14,16]);
 // Out of energy with nothing to merge; a full board with nothing to merge.
 const e=fresh(0);e.energy=0;assert.equal(primaryAction(e).kind,'energy');
 const f=fresh(0);let k=0;for(let i=0;i<f.board.length;i++)if(f.board[i]===null)f.board[i]=item(['rig','chart','rope','shell','lamp','rig','chart','rope'][k++],k<6?0:1);
 assert.equal(primaryAction(f).kind,'space');
 // A crate key in hand when no order part can be made (no energy).
 const c=fresh(0);c.energy=0;c.board[15]=item('rig',2);c.orders=c.orders.map(o=>({...o,needs:[{family:'chart',tier:1,count:1}]}));
 assert.deepEqual(primaryAction(c),{kind:'unseal',cells:[15,9],label:'Lay the Split spanner on its crate'});
});

// Build 41 M5/M6: the prototype-complete screen once, and the local playtest log.
test('the end of the prototype is seen once; older finished saves see it on their next visit',()=>{
 const s=fresh(0);refused(s,{type:'seenEnd'});
 s.built=Object.fromEntries(AREAS.flatMap(a=>a.tasks.map(t=>[t.id,3])));s.area=1;assert.ok(allDone(s));
 assert.equal(s.seenEnd,undefined);const back=load(JSON.stringify(s),5);assert.equal(back.seenEnd,undefined,'a finished save from before Build 41 has not seen it');
 ok(back,{type:'seenEnd'});assert.equal(back.seenEnd,true);refused(back,{type:'seenEnd'});
 assert.equal(load(JSON.stringify(back),5).seenEnd,true);
 const bad=structuredClone(back);bad.seenEnd='yes';bad.moves=4;assert.equal(load(JSON.stringify(bad),5).moves,0);
});

test('the playtest log: sessions, milestones, bounds, storage failure and a clean export',async()=>{
 const {createLog,LOG_KEY,MAX_EVENTS,MAX_BYTES}=await import('../v5/next/playtest.mjs');
 const mem={},storage={get:k=>mem[k]??null,set:(k,v)=>{mem[k]=v;},remove:k=>{delete mem[k];}};let t=1000;const now=()=>t;
 const log=createLog({storage,now,build:'Build 41',viewport:'390x844',touch:true});
 log.startSession();t+=30000;log.milestone('firstMerge');log.milestone('firstMerge');t+=60000;log.event('order',{coins:10});
 t+=20*60000;log.touch();log.end('hidden');
 assert.ok(mem[LOG_KEY],'saved under its own key');
 const out=JSON.parse(log.toJSON());assert.equal(out.summary.sessions,1);assert.ok(out.summary.totalMinutes>=20);assert.equal(out.counts.firstMerge,1,'a milestone happens once');
 assert.deepEqual(Object.keys(out.sessions[0]).sort(),['end','last','n','start','touch','viewport']);
 assert.doesNotMatch(log.toJSON(),/userAgent|Mozilla|email|@/,'no identifiers');
 // A reload keeps it.
 const again=createLog({storage,now,build:'Build 41'});again.startSession();assert.equal(again.data.sessions.length,2);assert.ok(again.data.milestones.firstMerge);
 // Bounded: the oldest events go, milestones stay.
 for(let k=0;k<MAX_EVENTS+300;k++)again.event('tick',{k});again.flush();
 assert.ok(again.data.events.length<=MAX_EVENTS);assert.ok(mem[LOG_KEY].length<=MAX_BYTES);assert.ok(again.data.milestones.firstMerge);
 // Corrupt storage starts a new log; a storage error turns the log off without throwing.
 mem[LOG_KEY]='{not json';const fresh1=createLog({storage,now});assert.equal(fresh1.data.sessions.length,0);
 const full={get:()=>null,set:()=>{throw new Error('QuotaExceededError');},remove:()=>{}};const q=createLog({storage:full,now});q.startSession();
 assert.equal(q.flush(),false);assert.equal(q.off,true);q.event('order');assert.equal(q.flush(),false);
 // Clearing removes only the log.
 mem.other='keep';again.clear();assert.equal(mem[LOG_KEY],undefined);assert.equal(mem.other,'keep');
});

// Build 44 (user, 2026-10-25: "orderuudiig utga uchirtai bolgoy"): everyday orders take turns being
// quick, two-crew and big jobs; a big job is the most work and pays the most per part; the camp
// remembers its last orders (s.recent) and repeats neither those nor a card on the board.
test('everyday orders are quick, two-crew and big jobs, vary, and old saves keep loading',()=>{
 const s=fresh(0);s.board[15]=source('chart');s.built={'beach-path':2,'beach-tent':1};s.orderSeq=3;s.orders=[];s.recent=[];
 const gold=makeOrder(s);assert.ok(gold.story);s.orders=[gold];
 const made=[];for(let k=0;k<40;k++){const o=makeOrder(s);assert.ok(!o.story);made.push(o);
  assert.ok(['quick','pair','big'].includes(o.role));
  if(o.role==='pair')assert.ok(new Set(o.needs.map(r=>r.family)).size===2||o.needs[0].count===2,JSON.stringify(o.needs));
  assert.ok(s.recent.length<=RECENT);
  const key=x=>x.needs.map(r=>r.family+r.tier+'x'+r.count).sort().join('+');
  assert.ok(!s.orders.some(x=>!x.story&&key(x)===key(o)),'not the same card as one on the board');
  s.orders.push(o);if(s.orders.length>3)s.orders.splice(1,1);}
 const units=o=>o.needs.reduce((n,r)=>n+r.count*2**r.tier,0),mean=f=>{const a=made.filter(o=>o.role===f);return a.reduce((n,o)=>n+units(o),0)/a.length;};
 assert.ok(mean('big')>mean('quick'),'a big job is more work than a quick one');
 for(const o of made)assert.equal(o.coins,rolePrice(o.needs,o.role));
 // An older save (no role on its orders, no recent list) loads as it was; its kinds are inferred.
 const old=fresh(0);delete old.recent;for(const o of old.orders)delete o.role;
 const back=load(JSON.stringify(old),5);assert.deepEqual(back.orders,old.orders);assert.deepEqual(back.recent,[]);
 for(const o of back.orders)assert.ok(['quick','pair','big','gold'].includes(roleOf(o)));
 // A damaged recent list is dropped, not the camp.
 const bad=fresh(0);bad.recent=[1,2,3];bad.moves=7;const b2=load(JSON.stringify(bad),5);assert.equal(b2.moves,7);assert.deepEqual(b2.recent,[]);
});

// Build 45g: an order's card pools needs that name the same part, so what it shows agrees with
// delivery (orderItems takes a different piece per part). One Grip tool on the board was shown
// as "1/1" beside "1/2" for an order wanting Grip tool ×1 + Grip tool ×2.
import {needsOf,missingOf} from '../v5/next/needs.mjs';
test('order needs pool the same part and agree with delivery on every board', () => {
 const s=fresh(0),o={id:'t',who:'bram',needs:[{family:'rig',tier:1,count:1},{family:'rig',tier:1,count:2}],coins:10};
 s.board=s.board.map(x=>x?.type==='item'?null:x);s.board[s.board.indexOf(null)]=item('rig',1);
 assert.deepEqual(needsOf(s,o).map(r=>[r.family,r.tier,r.have,r.count,r.sibling]),[['rig',1,1,3,false]]);
 // different tiers of one chain stay apart and are marked as siblings
 const two={...o,needs:[{family:'rig',tier:2,count:1},{family:'rig',tier:1,count:2}]};
 assert.deepEqual(needsOf(s,two).map(r=>[r.tier,r.have,r.count,r.sibling]),[[2,0,1,true],[1,1,2,true]]);
 // shown complete exactly when delivery accepts, over many random boards and orders
 let seed=7;const rnd=n=>{seed=(seed*1103515245+12345)%2147483648;return seed%n;};
 for(let k=0;k<400;k++){
  const t=fresh(0);t.board=t.board.map(()=>rnd(3)?null:item(['rig','chart'][rnd(2)],rnd(3)));
  const ord={id:'r',who:'bram',needs:Array.from({length:1+rnd(3)},()=>({family:['rig','chart'][rnd(2)],tier:rnd(3),count:1+rnd(2)})),coins:5};
  const shown=needsOf(t,ord);
  assert.equal(shown.every(r=>r.have>=r.count),!!orderItems(t,ord),JSON.stringify(ord.needs));
  assert.equal(shown.reduce((n,r)=>n+r.count,0),ord.needs.reduce((n,r)=>n+r.count,0));
  assert.equal(missingOf(t,ord).length===0,!!orderItems(t,ord));
 }
});

// Build 45i: one presentation map sizes every board sprite by its measured visible object, so a
// copper offcut no longer outweighs the generator that makes it. Every painted board icon has
// measured bounds (tools/measure-art-fit.py), and each fit keeps its object inside its kind's range
// and the sprite inside its cell.
import {readdirSync} from 'node:fs';
import {ART_BOUNDS} from '../v5/next/art-bounds.mjs';
import {artFit,toneOf,TARGET_OF} from '../v5/next/art-fit.mjs';
test('board art: every sprite is measured and drawn at its kind\'s size',async()=>{
 const {draw}=await import('../v5/next/chains.mjs');
 const icons=readdirSync(new URL('../v5/assets/premium/coast/icons/',import.meta.url)).filter(f=>f.endsWith('.webp')).map(f=>f.slice(0,-5));
 for(const f of [...icons,'copper-offcut','grip-tool','split-spanner','pocket-winch'])assert.ok(ART_BOUNDS[f],`${f}: run tools/measure-art-fit.py`);
 const RANGE={item:[.72,.8],container:[.78,.84],generator:[.85,.88]};
 for(const f of Object.keys(ART_BOUNDS)){const a=artFit(f),[lo,hi]=RANGE[a.kind];
  assert.ok(a.fit>0&&a.fit<=1,`${f}: fit ${a.fit}`);
  const shown=ART_BOUNDS[f][0]*a.fit;
  if(TARGET_OF[f])assert.ok(Math.abs(shown-TARGET_OF[f])<.005,`${f}: pilot target ${TARGET_OF[f]}, shown ${shown.toFixed(3)}`);
  else assert.ok(shown>=lo-.005&&shown<=hi+.005,`${f}: ${a.kind} shown at ${shown.toFixed(3)} of the cell`);}
 // what the user saw: materials no longer outweigh generators; containers agree with each other
 // (the files the board draws now: Build 45k pilot art for the Rover and the bundle, the tool art
 // integration's -v2 Grip tool and Split spanner)
 const s=f=>ART_BOUNDS[f][0]*artFit(f).fit;
 for(const m of ['copper-offcut','grip-tool-v2','split-spanner-v2'])assert.ok(s(m)<=s('gen-rig-pilot')-.05,`${m} smaller than the Rivet Rover`);
 const c=['cargo-crate','cargo-barrel','cargo-bundle-pilot','cargo-basket','driftwood-crate'].map(s);assert.ok(Math.max(...c)-Math.min(...c)<=.05,`containers ${c.map(x=>x.toFixed(2))}`);
 // the new art replaces exactly its identities, and keeps its colours on the board
 assert.match(draw({type:'item',family:'rig',tier:1}),/grip-tool-v2\.webp/);assert.match(draw({type:'item',family:'rig',tier:2}),/split-spanner-v2\.webp/);
 assert.match(draw({type:'item',family:'rig',tier:0}),/copper-offcut-vibrant\.webp/);assert.match(draw({type:'item',family:'rig',tier:3}),/pocket-winch-vibrant\.webp/);
 assert.match(draw({type:'glass',family:'rig',tier:2}),/split-spanner-v2\.webp/);
 // the two tools are balanced against each other (the art direction's 78-80 % start)
 for(const m of ['grip-tool-v2','split-spanner-v2'])assert.ok(s(m)>=.74&&s(m)<=.8,`${m} shown at ${s(m).toFixed(3)}`);
 assert.match(draw({type:'source',id:'rig',level:3}),/gen-rig-pilot\.webp/);assert.match(draw({type:'source',id:'rope'}),/gen-rope\.webp/);
 assert.match(draw({type:'cargo',key:{family:'chart',tier:2}}),/cargo-bundle-pilot\.webp/);assert.match(draw({type:'cargo',key:{family:'rope',tier:2}}),/cargo-barrel\.webp/);
 for(const f of Object.keys(TARGET_OF))assert.equal(toneOf(f),null,`${f} is never toned`);
 // colour tones are an interim for containers only (art direction 45j): no item, tool, map, light
 // or generator is recoloured on the board, so order cards and the board show the same art
 for(const f of Object.keys(ART_BOUNDS))if(toneOf(f))assert.equal(artFit(f).kind,'container',`${f} is toned but is not a container`);
 // the renderer puts the fit on the sprite
 assert.match(draw({type:'item',family:'rig',tier:0}),/style="--fit:0\.\d+;--dx:-?0(\.\d+)?;--dy:-?0(\.\d+)?"/);
});

// Build 45n (user: "zarimdaa merge hiihed musuu tsohihgui baih shig baina"): the tideglass hint
// agrees with the rules. Every glass on a new board, every merge size in each space beside it:
// the hint calls the merge too small exactly when the reducer leaves that glass uncracked, and
// iceNeed (the level the message names) is set exactly on glass that some merge cannot crack.
test('tideglass hint: "too small" agrees with crack()',async()=>{
 const {iceNeed,weakIceBeside,besideOf}=await import('../v5/next/ice.mjs');
 const G=await import('../v5/next/game.mjs');
 let checked=0;
 for(const k of Object.keys(G.GLASS).map(Number)){
  const g0=G.fresh().board[k];
  assert.equal(iceNeed(g0)!==null,g0.tier>=2,`glass ${k} mark`);
  for(const to of besideOf(k))for(let tier=0;tier<4;tier++){
   const s=G.fresh();if(s.board[to]?.type==='glass'||s.board[to]?.type==='source')continue;
   const from=s.board.findIndex((x,i)=>i!==to&&i!==k&&x?.type!=='glass'&&x?.type!=='source');
   s.board[to]=item('rig',tier);s.board[from]=item('rig',tier);s.board[k]={...s.board[k],cracks:0};
   const r=G.act(s,{type:'merge',from,to});if(!r.ok)continue;
   const weak=weakIceBeside(s.board,to).includes(k),cracked=(s.board[k]?.cracks??0)>0||s.board[k]?.type!=='glass';
   assert.equal(weak,!cracked,`glass ${k} (tier ${G.GLASS[k][1]}), merge to tier ${tier+1} at ${to}`);checked++;}
 }
 assert.ok(checked>100,`checked ${checked} merges`);
});
