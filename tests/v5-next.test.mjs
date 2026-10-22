// Coast Camp, the new loop (v5/next/): rules, saves and scripted-player pacing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cellPos} from '../v5/core.mjs';
import {SAVE_KEY,fresh,act,load,tick,item,jar,nextTask,orderItems,sourceOpen,STAR_VALUE,CAMP,ROVER,CARGO,GLASS,CHEST_ENERGY,cog,MAX_GENERATOR_LEVEL,UNLOCK_LEVEL,nextKind,cargo,cargoKeys,source,CRATES,nameOf,GENERATOR_ORDER} from '../v5/next/game.mjs';
import {AREAS} from '../v5/next/areas.mjs';
import {kit} from '../v5/kits.mjs';
import {nextAction} from './v5-next-policy.mjs';

const ok=(s,a,now=1)=>{const r=act(s,a,now);assert.equal(r.ok,true,JSON.stringify(a)+' '+r.message);return r;};
function refused(s,a){const before=JSON.stringify(s),r=act(s,a,1);assert.equal(r.ok,false,JSON.stringify(a));assert.equal(JSON.stringify(s),before,'refusal leaves state untouched');return r;}

test('its own save key; the Classic keys are never written',()=>{
 assert.equal(SAVE_KEY,'vaultwake-v5-coast');
 for(const f of ['v5/next/game.mjs','v5/next/app.mjs']){const src=readFileSync(new URL('../'+f,import.meta.url),'utf8');assert.doesNotMatch(src,/setItem\('vaultwake-v5'|vaultwake-v5-replay|vaultwake-v5-active-slot/,f);}
});

test('a new camp: Rivet Rover alone in the middle of its camp, sealed cargo and tideglass everywhere else, three orders',()=>{
 const s=fresh(0);
 assert.deepEqual(s.board.flatMap((x,i)=>x===null?[i]:[]),[15,22,26]);
 assert.deepEqual(CAMP,[14,15,16,20,21,22,26,27,28]);assert.equal(ROVER,21);assert.deepEqual(s.board[21],source('rig'),'Rivet Rover stands in the middle of the board');
 assert.deepEqual(s.board.flatMap((x,i)=>x?.type==='source'?[x.id]:[]),['rig'],'one generator to start');
 assert.equal(s.board.filter(x=>x?.type==='cargo').length,27);assert.equal(s.board.filter(x=>x?.type==='glass').length,13);
 assert.deepEqual([8,10,19,23,32,34].map(i=>s.board[i].type),Array(6).fill('glass'),'half-buried parts ring the camp');
 assert.ok(s.board.every((x,i)=>CAMP.includes(i)||x.type==='cargo'||x.type==='glass'));
 assert.deepEqual(s.orders.map(o=>o.needs),[[{family:'rig',tier:1,count:2}],[{family:'rig',tier:2,count:1}],[{family:'rig',tier:1,count:1},{family:'rig',tier:0,count:2}]]);
 assert.equal(s.stars,0);assert.equal(sourceOpen(s,'chart'),false);assert.equal(nextTask(s).id,'beach-path');
});

test('the first merge completes the first order and opens nothing',()=>{
 const s=fresh(0),r=ok(s,{type:'merge',from:14,to:16});
 assert.equal(s.board.filter(x=>x?.type==='cargo').length,27,'merging never opens cargo');assert.equal(r.xp,1);
 assert.ok(orderItems(s,s.orders[0]));
 const d=ok(s,{type:'deliver',id:'o0'});assert.equal(d.stars,2);assert.equal(s.stars,2);assert.equal(s.orders[0].id,'o3');
 refused(s,{type:'deliver',id:'o0'});
});

test('generators cost energy, place near themselves and refuse when locked, empty or full',()=>{
 const s=fresh(0),e=s.energy,r=ok(s,{type:'produce',id:'rig'});
 assert.equal(s.energy,e-1);assert.deepEqual(s.board[r.index],item('rig',0));assert.equal(r.index,15,'the nearest free space');
 refused(s,{type:'produce',id:'chart'});refused(s,{type:'produce',id:'flux'});
 const t=fresh(0);t.energy=0;refused(t,{type:'produce',id:'rig'});
 const u=fresh(0);for(let i=0;i<u.board.length;i++)if(u.board[i]===null)u.board[i]=item('rig',5);refused(u,{type:'produce',id:'rig'});
});

test('restoring spends stars in order and applies each place\'s effect',()=>{
 const s=fresh(0);
 refused(s,{type:'restore',id:'beach-path'});
 s.stars=200;refused(s,{type:'restore',id:'beach-tent'});
 const costs=AREAS[0].tasks.map(t=>t.cost);let spent=0;
 for(const t of AREAS[0].tasks){if(t.id==='beach-pier')for(const i of [15,22,26])if(s.board[i]?.type!=='source')s.board[i]=null;// room for the sea chest
  const e=s.energy,r=ok(s,{type:'restore',id:t.id});spent+=t.cost;assert.equal(s.stars,200-spent);
  if(t.id==='beach-path')assert.deepEqual(s.board[r.effects.kit],kit('rig',1));
  if(t.id==='beach-tent')assert.equal(s.energy,Math.min(120,e+15));
  if(t.id==='beach-mast'){assert.equal(s.slots,4);assert.equal(s.orders.length,4);}
  if(t.id==='beach-workshop'){assert.deepEqual(s.board[r.effects.copy],source('rig'),'a second Rivet Rover');const m=ok(s,{type:'merge',from:r.effects.copy,to:ROVER});assert.equal(s.board[ROVER].level,2);assert.equal(m.released,undefined,'level 2 is not yet enough for the Kite');}
  if(t.id==='beach-pier')assert.deepEqual(s.board[r.effects.kit],kit('rig',2),'a sea chest for the newest generator (still Rover here)');
  if(t.id==='beach-beacon')assert.equal(s.energy,Math.min(120,e+20));
  assert.equal(s.board.filter(x=>x?.type==='cargo').length,27,'restorations never open cargo');
  if(t.id==='beach-cliff')assert.equal(r.effects.areaDone,'beach');
 }
 assert.equal(nextTask(s),null);refused(s,{type:'restore'});
 assert.deepEqual(costs,[6,10,15,20,24,28,32]);
});

test('orders scale with level, never repeat a live need and pay stars by tier',()=>{
 const s=fresh(0);s.level.level=6;s.board[15]=source('chart');
 for(let n=0;n<60;n++){
  const o=s.orders[n%3];for(const r of o.needs)for(let k=0;k<r.count;k++){const i=s.board.indexOf(null);assert.ok(i>=0);s.board[i]=item(r.family,r.tier);}
  ok(s,{type:'deliver',id:o.id});
  for(const x of s.orders){assert.equal(x.stars,x.needs.reduce((v,r)=>v+r.count*STAR_VALUE[r.tier],0));for(const r of x.needs){assert.ok(['rig','chart'].includes(r.family));assert.ok(r.tier<=2+Math.floor(s.level.level/4),'the top tier climbs every fourth level');}if(+x.id.slice(1)>=3)assert.ok(x.needs[0].tier>=2,'from level 3 every order asks for tier 2 or more');}
  s.board=s.board.map(x=>x?.type==='kit'||x?.type==='item'?null:x);s.board[15]??=source('chart');
 }
 assert.equal(s.ordersDone,60);
});

test('every third order brings a small box of its kind; boxes and generator levels work here too',()=>{
 const s=fresh(0);s.ordersDone=2;const o=s.orders[1];s.board[15]=item('rig',2);
 const d=ok(s,{type:'deliver',id:o.id});assert.deepEqual(s.board[d.box],kit('rig',1));
 const t=fresh(0);t.board[15]=kit('rig',3);refused(t,{type:'merge',from:15,to:ROVER});// crates no longer feed generators
 t.board[15]=source('rig');const r=ok(t,{type:'merge',from:15,to:ROVER});assert.equal(r.event,'producerUp');assert.equal(t.board[ROVER].level,2);
 t.board[15]=kit('rig',1);t.board[22]=kit('rig',1);ok(t,{type:'merge',from:15,to:22});assert.deepEqual(t.board[22],kit('rig',2));
 ok(t,{type:'openKit',index:22});
});

test('levels give a chest with a driftwood crate of a generator you have',()=>{
 const s=fresh(0);s.level.xp=19;const e=s.energy,r=ok(s,{type:'merge',from:14,to:16});
 assert.equal(r.levelUp[0].level,2);assert.equal(r.levelUp[0].family,'rig');assert.equal(s.board.filter(x=>x?.type==='cargo').length,27);
 assert.equal(CHEST_ENERGY,15);assert.equal(s.energy,e+15);
});

test('energy refills over time and a low-energy ration helps once an hour',()=>{
 const s=fresh(0);s.energy=0;s.energyAt=0;tick(s,10*60*1000);assert.equal(s.energy,5);
 const t=fresh(0);t.energy=2;ok(t,{type:'ration'},1000);assert.equal(t.energy,10);t.energy=1;refused(t,{type:'ration'});
});

test('saves round-trip; anything malformed starts a new camp',()=>{
 const s=fresh(0);ok(s,{type:'merge',from:14,to:16});s.board[15]=kit('chart',2);s.board[ROVER].level=3;
 const back=load(JSON.stringify(s),5);assert.deepEqual(back.board,s.board);assert.deepEqual(back.orders,s.orders);assert.equal(back.moves,1);
 const bad=[x=>x.version=4,x=>x.board[2]={type:'water'},x=>x.board[2]={type:'cargo'},x=>x.board[2]=cargo({family:'gold',tier:0}),x=>x.board[2]=cargo({family:'rig',tier:1},item('rig',5)),x=>x.board[2]=cargo({family:'rig',tier:1},{type:'kit',family:'zz',size:1,left:3}),x=>x.board[2]=cargo({family:'rig',tier:1},{type:'stars',n:0}),x=>x.board[2]=cargo({family:'rig',tier:1},source('nope')),x=>x.board.pop(),x=>x.board[2]={type:'item',family:'gold',tier:0},x=>x.board[2]={type:'crate',kind:'salvage',left:3},x=>x.stars=-1,x=>x.orders.pop(),x=>x.orders[0].who='zed',x=>x.done.push('nowhere'),x=>x.slots=5,x=>x.taps.rig=-1,x=>x.board[ROVER].level=9];
 for(const f of bad){const t=structuredClone(s);f(t);assert.equal(load(JSON.stringify(t),5).moves,0,f.toString());}
 assert.equal(load('not json',5).moves,0);
 const classic=readFileSync(new URL('./fixtures/stage2/conduit-completed.json',import.meta.url),'utf8');assert.equal(load(classic,5).moves,0,'a Classic save is not a Coast Camp save');
});

test('a scripted player restores Landing Beach in 30–65 minutes (harder from build 10) and feels energy by the end',()=>{
 for(const step of [5000,6000]){
  const s=fresh(0);let now=0,firstRestore=null,actions=0,waited=0;const levels=[];
  while(!s.done.includes('beach-cliff')&&now<90*60*1000){
   tick(s,now);const a=nextAction(s);if(!a){now+=30000;waited+=30000;continue;}
   const r=ok(s,a,now);actions++;now+=step;
   if(r.event==='restore'&&firstRestore===null)firstRestore=now;
   for(const u of r.levelUp??[])levels.push(now);
  }
  assert.ok(s.done.includes('beach-cliff'),'area restored');
  assert.ok(firstRestore<3*60*1000,'first restoration within 3 minutes');
  assert.ok(now>=30*60*1000&&now<=65*60*1000,`area 1 took ${(now/60000).toFixed(1)} min`);
  assert.ok(levels.length>=4,'several level-ups');
  assert.ok(s.energy<25,'energy runs low by the end of the area');
  console.log(JSON.stringify({step,minutes:+(now/60000).toFixed(1),firstRestore:+(firstRestore/60000).toFixed(1),actions,levels:levels.length,energy:s.energy,waited}));
 }
});

test('crates are named for the coast; merges and feeding work as before',()=>{
 assert.deepEqual(CRATES,['Driftwood crate','Sea chest','Captain\'s trunk']);
 assert.equal(nameOf(kit('rig',1)),'Driftwood crate · Rivet Rover');assert.equal(nameOf(kit('chart',3)),'Captain\'s trunk · Survey Kite');
 const s=fresh(0);s.board[1]=kit('rig',3);s.board[6]=kit('rig',3);assert.match(act(s,{type:'merge',from:1,to:6},1).message,/as big as crates get/);
});

test('cargo opens only with the part it shows, only at the edge of open ground; the part is used up',()=>{
 const s=fresh(0);
 // 9, straight above the Rover, holds a star pouch and opens with a Split spanner; it touches the camp.
 assert.deepEqual(s.board[9].key,{family:'rig',tier:2});
 refused(s,{type:'merge',from:14,to:9});// a Copper offcut is the wrong part
 refused(s,{type:'move',from:14,to:3});refused(s,{type:'openKit',index:3});refused(s,{type:'recycle',index:3});
 s.board[15]=item('rig',2);const stars=s.stars,r=ok(s,{type:'merge',from:15,to:9});
 assert.equal(r.event,'unseal');assert.equal(s.board[15],null,'the key is used');assert.equal(s.board[9],null,'a star pouch leaves the space free');assert.equal(s.stars,stars+3);assert.equal(r.xp,2);
 // 2 is buried deeper (behind cargo and tideglass): it opens only once a neighbour is open.
 s.board[15]=item('rig',4);assert.match(refused(s,{type:'unseal',from:15,index:2}).message,/deeper/);
 // Energy is rare and small: one of two +5 jars.
 s.board[22]=item('rig',3);let e=s.energy;const k=ok(s,{type:'unseal',from:22,index:33});assert.equal(k.opened.type,'jar');assert.equal(s.energy,e+5);
 assert.equal(Object.values(CARGO).filter(c=>c[2].type==='jar').length,2);assert.ok(Object.values(CARGO).every(c=>c[2].type!=='jar'||c[2].energy<=5));
 // 3 now touches open ground (9): a Crawler jack opens its big star pouch.
 const st=s.stars;ok(s,{type:'unseal',from:15,index:3});assert.equal(s.stars,st+10,'deeper crates pay more');assert.equal(s.board[3],null);
 s.board[15]=item('rig',3);ok(s,{type:'unseal',from:15,index:13});assert.deepEqual(s.board[13],kit('rig',1));
 assert.equal(s.board.filter(x=>x?.type==='cargo').length,23);
});

test('one generator, one chain; each generator at level 3 brings out the next kind',async()=>{
 const {GENERATOR_CHAINS,CHAINS}=await import('../v5/next/chains.mjs');
 for(const g of Object.keys(GENERATOR_CHAINS)){assert.equal(GENERATOR_CHAINS[g].length,1);assert.equal(CHAINS[GENERATOR_CHAINS[g][0][0]].gen,g);}
 assert.deepEqual(GENERATOR_ORDER,['rig','chart','rope','shell','lamp']);assert.equal(UNLOCK_LEVEL,3);
 assert.deepEqual(GENERATOR_ORDER.map(nextKind),['chart','rope','shell','lamp',null]);
 // Cargo holds no new kinds, only copies (to level up a generator you have) and cogs.
 const gens=Object.entries(CARGO).filter(([,c])=>c[2].type==='source').map(([i,c])=>({cell:+i,id:c[2].id,key:CHAINS[c[0]].gen}));
 const copies={};for(const g of gens)copies[g.id]=(copies[g.id]??0)+1;assert.deepEqual(copies,{rig:3,chart:2,rope:1,shell:2});
 for(const g of gens)assert.ok(GENERATOR_ORDER.indexOf(g.key)<=GENERATOR_ORDER.indexOf(g.id),'a copy never needs a part from a later generator');
 for(const [,c] of Object.entries(CARGO))assert.ok(GENERATOR_ORDER.includes(CHAINS[c[0]].gen));
 // Play it through: the second Rover sits in a corner behind a crate (or tideglass) and opens with a Crawler jack.
 const s=fresh(0);assert.ok(!cargoKeys(s).some(k=>k.index===7),'the copy is not at the camp edge');assert.deepEqual(s.board[7],cargo({family:'rig',tier:4},source('rig')));
 s.board[15]=item('rig',3);ok(s,{type:'unseal',from:15,index:13});assert.ok(cargoKeys(s).some(k=>k.index===7),'opening a crate shows the keys of the crates behind it');
 s.board[15]=item('rig',4);const r=ok(s,{type:'unseal',from:15,index:7});assert.deepEqual(r.opened,{index:7,type:'source',id:'rig'});
 assert.equal(r.released,undefined,'a second Rover alone brings nothing');assert.equal(sourceOpen(s,'chart'),false);
 // Merge the two Rovers: level 2 is not enough yet; a Brass cog makes level 3 and brings out the Survey Kite beside it.
 const m2=ok(s,{type:'merge',from:7,to:ROVER});assert.equal(s.board[ROVER].level,2);assert.equal(m2.released,undefined);
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
 assert.deepEqual(keys.map(k=>k.index),[9,13,17,25,29,33],'only the crates touching the camp show their keys');
 // The more useful the find, the harder the key: in each ring, generators and Brass cogs
 // need a higher part than any energy, stars, part or crate.
 const ring=i=>{const [r,c]=cellPos(i);return Math.max(Math.abs(r-3),Math.abs(c-3));},useful=f=>f.type==='source'||f.type==='cog';
 for(const n of [2,3]){
  const cells=Object.entries(CARGO).filter(([i])=>ring(+i)===n),hi=Math.min(...cells.filter(([,c])=>useful(c[2])).map(([,c])=>c[1])),lo=Math.max(...cells.filter(([,c])=>!useful(c[2])).map(([,c])=>c[1]));
  assert.ok(hi>=lo&&hi>=4,`ring ${n}: generators and cogs need tier ${hi}+, everyday finds at most ${lo}`);
 }
 assert.ok(keys.filter(k=>!useful(s.board[k.index].find)).every(k=>k.tier>=2&&k.tier<=3),'everyday crates next to the camp: well-merged parts (Split spanners, Pocket winches, Survey scopes)');
 assert.equal(keys.filter(k=>k.tier===2).length,1,'one easier crate, straight above the Rover, to teach it');
 assert.equal(Object.values(CARGO).filter(c=>c[2].type==='cog').length,4,'four Brass cogs');
 assert.deepEqual(CARGO[42].slice(0,2),['lamp',4],'the far corner (a Brass cog) needs a Beacon lens');
 // A scripted player finds every generator during Landing Beach.
 const t=fresh(0);let now=0;const found=[];
 while(!t.done.includes('beach-cliff')&&now<90*60*1000){tick(t,now);const a=nextAction(t);if(!a){now+=30000;continue;}const r=ok(t,a,now);now+=6000;for(const n of r.released??[])found.push([n.id,+(now/60000).toFixed(1)]);}
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
 v2.done=['beach-path','beach-tent'];v2.moves=33;v2.stars=5;delete v2.taps.rope;delete v2.taps.shell;delete v2.taps.lamp;
 const s=load(JSON.stringify(v2),5);
 assert.equal(s.version,3);assert.equal(s.moves,33,'the camp is kept');assert.equal(s.stars,5);
 assert.ok(!s.board.some(x=>x?.type==='water'));assert.deepEqual(s.board[9],item('rig',2));
 assert.equal(s.board[5].type,'source');assert.equal(s.board[2].type,'cargo');assert.deepEqual(s.board[2].key,{family:CARGO[2][0],tier:CARGO[2][1]});
 for(const g of ['rope','shell','lamp'])assert.equal(s.board.filter(x=>x?.type==='cargo'&&x.find?.type==='source'&&x.find.id===g).length,1,g+' is sealed somewhere');
 // A build-3 save goes through the same step.
 const v1=structuredClone(v2);v1.version=1;v1.board=v1.board.map((x,i)=>x?.type==='water'?(i>=36?{type:'gate',level:3}:{type:'sand',...(x.find?{find:x.find}:{})}):x);
 const t=load(JSON.stringify(v1),5);assert.equal(t.version,3);assert.equal(t.moves,33);assert.ok(!t.board.some(x=>['sand','gate','water'].includes(x?.type)));
});

test('tideglass takes no part: merges beside it crack it, the third breaks it and frees the part as it is',()=>{
 const s=fresh(0);
 assert.deepEqual(s.board[8],{type:'glass',family:'rig',tier:2},'a Split spanner in glass beside the camp');
 s.board[15]=item('rig',2);
 assert.match(refused(s,{type:'merge',from:15,to:8}).message,/beside it/,'even its twin cannot be laid on it (that is what cargo does)');
 refused(s,{type:'move',from:8,to:15});refused(s,{type:'recycle',index:8});
 // Glass is not open ground: cargo behind it stays sealed until the glass breaks.
 assert.ok(!cargoKeys(s).some(k=>k.index===2));
 // Merge two Copper offcuts on 14, the camp space beside the glass: it cracks.
 const r=ok(s,{type:'merge',from:16,to:14});
 assert.deepEqual(r.cracked,[8]);assert.equal(r.broken,undefined);assert.equal(s.board[8].cracks,1);assert.match(r.message,/cracks/);
 // A merge elsewhere does nothing to it.
 s.board[22]=item('rig',0);s.board[26]=item('rig',0);ok(s,{type:'merge',from:26,to:22});assert.equal(s.board[8].cracks,1);
 s.board[20]=item('rig',1);ok(s,{type:'merge',from:20,to:14});assert.equal(s.board[8].cracks,2);
 // The third merge beside it breaks it: the Split spanner is free, nothing was used up.
 s.board[20]=item('rig',2);const t=ok(s,{type:'merge',from:20,to:14});
 assert.deepEqual(t.broken,[8]);assert.deepEqual(s.board[8],item('rig',2));assert.equal(t.xp,3);assert.match(t.message,/breaks/);
 assert.ok(cargoKeys(s).some(k=>k.index===2),'the cargo behind it now shows its key');
 // Glass of every generator's chain lies near where it is found.
 const fams=Object.values(GLASS).map(g=>g[0]);for(const f of ['rig','chart','rope','shell','lamp'])assert.ok(fams.includes(f),f);
 // Saves keep glass and its cracks; a build-9 save with uncracked glass still loads; malformed glass starts fresh.
 const u=fresh(0);u.board[0].cracks=1;u.moves=3;assert.deepEqual(load(JSON.stringify(u),5).board[0],{type:'glass',family:'chart',tier:3,cracks:1});
 const old=fresh(0);delete old.board[0].cracks;old.moves=4;assert.equal(load(JSON.stringify(old),5).moves,4);
 for(const f of [x=>x.board[0]={type:'glass',family:'rig',tier:7},x=>x.board[0].cracks=3,x=>x.board[0].cracks=-1]){const v=fresh(0);v.moves=3;f(v);assert.equal(load(JSON.stringify(v),5).moves,0,f.toString());}
});


test('a Brass cog from hard cargo raises the generator it is laid on by one level',()=>{
 const s=fresh(0);
 // Cell 17, beside the camp, holds a cog behind a Bridge rig (a tier-5 key: cogs are worth it).
 assert.deepEqual(s.board[17],cargo({family:'rig',tier:5},cog()));
 s.board[15]=item('rig',5);const r=ok(s,{type:'unseal',from:15,index:17});
 assert.equal(r.opened.type,'cog');assert.deepEqual(s.board[17],cog());assert.match(r.message,/Brass cog/);
 refused(s,{type:'merge',from:17,to:14});refused(s,{type:'recycle',index:17});refused(s,{type:'openKit',index:17});
 ok(s,{type:'move',from:17,to:15});
 const u=ok(s,{type:'merge',from:15,to:ROVER});assert.equal(u.event,'producerUp');assert.equal(u.cog,true);assert.equal(s.board[ROVER].level,2);assert.ok(!s.board.some(x=>x?.type==='cog'),'the cog is used up');assert.equal(u.released,undefined,'level 2 alone does not bring out the Kite');
 // Not past the top level.
 s.board[15]=cog();s.board[ROVER].level=MAX_GENERATOR_LEVEL;assert.match(refused(s,{type:'merge',from:15,to:ROVER}).message,/top level/);
 // Saves keep a cog on the board and in cargo; a malformed one starts a new camp.
 const back=load(JSON.stringify(s),5);assert.deepEqual(back.board[15],cog());assert.deepEqual(back.board[40].find,CARGO[40][2]);
 for(const f of [x=>x.board[15]={type:'cog',level:2},x=>x.board[2]=cargo({family:'rig',tier:4},{type:'cog',n:1})]){const t=structuredClone(s);f(t);assert.equal(load(JSON.stringify(t),5).moves,0,f.toString());}
});
