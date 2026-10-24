// Coast Camp Chapter 2 (docs/V5_CHAPTER2_SILENT_OBSERVATORY_2026-10-24.md): the Vault door finale,
// the Silent Observatory, the Lens Bench, rewards that wait for space, parked generators, story
// cards seen once, and saves from before Chapter 2.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../v5/next/game.mjs';
import {fresh,act,load,loadChecked,makeOrder,upgrades,storyTarget,stageOf,areaDone,allDone,source,item,cog,blockedStage,hasGenerator,newestGenerator,openChains,SHED_SLOTS} from '../v5/next/game.mjs';
import {AREAS,TASKS,STAGES,CHAPTERS,chapterOfArea,chapterAvailable} from '../v5/next/areas.mjs';
import {CHAINS,GENERATOR_NAMES,maxTier} from '../v5/next/chains.mjs';
import {nextAction} from './v5-next-policy.mjs';
import {simulate} from './v5-next-economy-sim.mjs';

const ok=(s,a,now=1)=>{const r=act(s,a,now);assert.ok(r.ok,`${a.type}: ${r.message}`);return r;};
const done=a=>Object.fromEntries(a.tasks.map(t=>[t.id,STAGES]));
const through=n=>Object.assign({},...AREAS.slice(0,n).map(done));
// A camp standing in area n with everything before it built (generators as at the end of Chapter 1).
function at(n){const s=fresh(0);s.area=n;s.built=through(n);s.coins=3000;s.board[ROVER_I]={type:'source',id:'rig',level:4};
 for(const [i,id,l] of [[15,'chart',3],[20,'rope',3],[22,'shell',3],[27,'lamp',2]])s.board[i]={type:'source',id,level:l};
 s.orders=[];for(let i=0;i<s.slots;i++)s.orders.push(makeOrder(s));return s;}
const ROVER_I=21;
const fill=s=>{for(let i=0;i<s.board.length;i++)if(s.board[i]===null)s.board[i]=item('rig',i%3);};

test('chapters and areas: the Vault door ends Chapter 1, the Observatory is Chapter 2, Chapter 3 is only listed',()=>{
 assert.deepEqual(AREAS.map(a=>a.id),['beach','worksite','entrance','vault','harbour'],'append-only: saves keep the area index');
 assert.equal(AREAS[2].tasks.length,1);assert.equal(AREAS[3].tasks.length,5);assert.equal(AREAS[4].tasks.length,0);
 assert.ok(AREAS[4].coming&&!AREAS[2].coming&&!AREAS[3].coming);
 assert.equal(AREAS[3].name,'The Silent Observatory');assert.equal(AREAS[3].focus,'optic');
 for(const a of AREAS.slice(2,4))for(const t of a.tasks){assert.equal(t.stages.length,STAGES);assert.ok(t.stages.every(st=>st.lines.length>=1&&Number.isInteger(st.cost)));}
 assert.equal(chapterOfArea('entrance').id,'coast');assert.equal(chapterOfArea('vault').id,'observatory');
 assert.deepEqual(CHAPTERS.map(chapterAvailable),[true,true,false]);
 assert.equal(AREAS[3].tasks.flatMap(t=>t.stages).reduce((n,st)=>n+st.cost,0),2610,'Chapter 2 costs (tuned with the scripted player)');
 assert.equal(AREAS[2].tasks[0].stages.reduce((n,st)=>n+st.cost,0),840);
});

test('the optics chain: six parts named apart from the Kite and the Kiln, made by the Lens Bench',()=>{
 assert.equal(GENERATOR_NAMES.optic,'Lens Bench');assert.equal(maxTier('optic'),5);
 const names=CHAINS.optic.names;assert.equal(new Set(names).size,6);
 for(const f of ['chart','lamp','rig','rope','shell'])for(const n of names)assert.ok(!CHAINS[f].names.includes(n),`${n} is not also a ${f} part`);
 assert.ok(!g.GENERATOR_ORDER.includes('optic'),'not released by the Kiln at level 3');assert.equal(g.nextKind('lamp'),null);
 assert.ok(g.NEWEST_ORDER.at(-1)==='optic'&&g.BOOK_CHAINS.includes('optic'));
});

test('the Vault door: three rings, the third with its own materials; turning it opens Chapter 2',()=>{
 const s=at(2);assert.equal(upgrades(s).length,1);
 const gold=s.orders.find(o=>o.story);assert.equal(gold.story,'vault-door');
 for(let n=1;n<=STAGES;n++){
  // A gold order's needs are set when it is made: here the next one is made as the game would after the
  // second ring's materials were delivered.
  if(n===STAGES){s.orders=s.orders.filter(o=>!o.story);s.orders.push(makeOrder(s));const o=s.orders.find(o=>o.story);assert.deepEqual(o.needs,[{family:'lamp',tier:3,count:1},{family:'chart',tier:4,count:1}],'the inner ring names its parts');}
  s.materials['vault-door']=n;const r=ok(s,{type:'restore',id:'vault-door'});assert.equal(r.stage,n);
  if(n===STAGES){assert.equal(r.effects.areaDone,'entrance');assert.equal(r.effects.nextArea,'vault');}}
 assert.equal(s.area,3);assert.equal(s.board.filter(x=>x?.type==='source').length,5,'no generator removed');
 assert.equal(s.orders.find(o=>o.story)?.story,'obs-hall','the next objective has its gold order at once');
 assert.equal(allDone(s),false);
});

test('the Observatory: places open in order, the sea gate waits for the array, authored materials',()=>{
 const s=at(3);assert.deepEqual(upgrades(s).map(u=>u.id),['obs-hall']);
 s.built={...s.built,'obs-hall':1,'obs-desk':1,'obs-bench':1,'obs-array':2,'obs-passage':2};
 assert.ok(!upgrades(s).some(u=>u.id==='obs-passage'),'the sea gate is closed while the array sleeps');
 assert.deepEqual(blockedStage(s,'obs-passage'),{stage:3,name:'Open the sea gate',requires:{'obs-array':3}});
 s.built['obs-array']=3;assert.ok(upgrades(s).some(u=>u.id==='obs-passage'));assert.equal(blockedStage(s,'obs-passage'),null);
 const a=TASKS['obs-array'].stages;assert.deepEqual(a.map(st=>st.gold[0]),[['optic',2,1],['optic',3,1],['optic',4,1]]);
 // The gold order follows a stage's own materials.
 const t=at(3);t.built={...t.built,'obs-hall':1,'obs-desk':1,'obs-bench':1};t.board[16]=source('optic');t.orders=t.orders.filter(o=>!o.story);t.materials={'obs-hall':2,'obs-desk':2,'obs-bench':2};
 assert.equal(storyTarget(t).id,'obs-array');const o=makeOrder(t);assert.equal(o.story,'obs-array');assert.deepEqual(o.needs,[{family:'optic',tier:2,count:1},{family:'lamp',tier:2,count:2}]);
});

test('the Lens Bench is earned from a place; on a full board it waits and lands after a space opens',()=>{
 const s=at(3);s.built={...s.built,'obs-hall':1,'obs-desk':1};s.materials={'obs-bench':1};s.board[0]=item('rig',0);s.board[1]=item('rig',0);fill(s);
 const r=ok(s,{type:'restore',id:'obs-bench'});assert.equal(r.effects.copy,-1);assert.equal(r.effects.pending,1);
 assert.equal(hasGenerator(s,'optic'),false);assert.deepEqual(s.pending,[{type:'source',id:'optic'}]);
 assert.equal(newestGenerator(s),'lamp','a waiting bench does not drive orders yet');
 const i=0,j=1;
 const m=ok(s,{type:'merge',from:i,to:j});assert.equal(m.arrived[0].thing.id,'optic');assert.equal(s.pending.length,0);
 assert.equal(newestGenerator(s),'optic');assert.ok(openChains(s).includes('optic'));
 // Before Chapter 2 a reward on a full board was lost: the Boardwalk's Rover copy now waits too.
 const b=fresh(0);b.coins=999;b.built={'beach-path':1};b.materials={'beach-path':2};fill(b);
 const w=ok(b,{type:'restore',id:'beach-path'});assert.equal(w.effects.copy,-1);assert.equal(b.pending.length,1);
});

test('parking: a generator goes in the shed with its level, the last one stays, a parked kind is not released again',()=>{
 const s=at(3);const lamp=s.board.findIndex(x=>x?.id==='lamp');
 const r=ok(s,{type:'store',index:lamp});assert.deepEqual(s.shed[r.slot],{type:'source',id:'lamp',level:2});
 assert.ok(!openChains(s).includes('lamp'),'a parked generator brings no new orders');
 for(let k=0;k<30;k++){const o=makeOrder(s);if(!o.story)assert.ok(o.needs.every(n=>n.family!=='lamp'),JSON.stringify(o.needs));}
 assert.ok(hasGenerator(s,'lamp'));act(s,{type:'merge',from:21,to:14},1);// nothing to release twice
 assert.equal([...s.board,...s.shed].filter(x=>x?.type==='source'&&x.id==='lamp').length,1);
 const back=ok(s,{type:'unstore',slot:r.slot});assert.equal(s.board[back.index].level,2,'it keeps its level');
 const one=fresh(0);assert.match(act(one,{type:'store',index:21}).message,/at least one generator/);
});

test('story cards are seen once; a seen card stays seen through a reload',()=>{
 const s=fresh(0);ok(s,{type:'seen',id:'vault-open'});assert.equal(act(s,{type:'seen',id:'vault-open'}).ok,false);
 assert.equal(act(s,{type:'seen',id:'Bad id!'}).ok,false);
 const back=load(JSON.stringify(s),5);assert.deepEqual(back.seen,{'vault-open':true});
});

test('saves from before Chapter 2 load unchanged and move on; an unreadable save is reported, not hidden',()=>{
 // A camp that finished the worksite under Build 41/42 (no pending, seen or Lens Bench taps) and saw the old end card.
 const old=at(2);old.area=1;old.moves=1234;old.seenEnd=true;delete old.pending;delete old.seen;delete old.taps.optic;old.orders=old.orders.filter(o=>!o.story);while(old.orders.length<old.slots)old.orders.push({id:'x'+old.orders.length,who:'ivo',needs:[{family:'rig',tier:2,count:1}],coins:10});
 const raw=JSON.stringify(old),r=loadChecked(raw,5);assert.equal(r.kept,true);
 const s=r.state;assert.equal(s.moves,1234);assert.equal(s.area,2,'up to the Vault door');assert.equal(s.orders.find(o=>o.story)?.story,'vault-door','its gold order is ready at once');assert.deepEqual(s.pending,[]);assert.deepEqual(s.seen,{});assert.equal(s.taps.optic,0);
 assert.equal(s.seenEnd,undefined,'the old end card does not hide the new end');assert.deepEqual(s.board,old.board,'the board is untouched');assert.equal(s.coins,old.coins);
 // A camp partway through Chapter 1 stays where it was.
 const mid=fresh(0);mid.built={'beach-path':2};mid.moves=50;delete mid.pending;delete mid.seen;const m=load(JSON.stringify(mid),5);assert.equal(m.area,0);assert.equal(m.moves,50);
 // Unreadable: the app is told, so it can keep the raw save aside.
 assert.equal(loadChecked('{"version":4,"board":[]}',5).kept,false);assert.equal(loadChecked('',5).kept,false);
 const bad=fresh(0);bad.pending=[{type:'glass',family:'rig',tier:1}];assert.equal(loadChecked(JSON.stringify(bad),5).kept,false);
});

test('the scripted player finishes the Vault door and the Observatory: a few minutes of play a stage, room on the board',()=>{
 const MIN=60000,rows=[];
 for(const sp of [5,8])for(const sd of [1,2,3]){
  let entered=null,steps=0;const occ=[];
  const r=simulate(g,nextAction,sp,sd,{shop:true,until:72*3600e3,toArea:3,onStep:(s,now)=>{if(s.area===3){entered??=now;steps++;occ.push(s.board.filter(x=>x!==null).length);}}});
  assert.ok(r.finished,`${sp} s seed ${sd}: finished`);
  occ.sort((a,b)=>a-b);const play=steps*sp/60,real=(r.total-entered)/MIN,per=play/15;
  rows.push({sp,sd,play:+play.toFixed(0),real:+real.toFixed(0),per:+per.toFixed(1),occ:occ[occ.length>>1]});
  assert.ok(per>=sp*.45&&per<=sp*1.1,`${sp} s seed ${sd}: ${per.toFixed(1)} min of play a stage`);
  assert.ok(real<=5*60,`${sp} s seed ${sd}: Chapter 2 in ${(real/60).toFixed(1)} h of real time`);
  assert.ok(occ[occ.length>>1]<=40,`${sp} s seed ${sd}: board median ${occ[occ.length>>1]}/49`);
 }
 console.log(JSON.stringify(rows));
});
