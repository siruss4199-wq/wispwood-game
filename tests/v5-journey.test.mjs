import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,item,load,nextOutput} from '../v5/core.mjs';
import {choose} from './v5-policy.mjs';import {KITS,ENGINE_NEEDS} from '../v5/journey.mjs';import {deliveryItems} from '../v5/presentation.mjs';import {useAction} from '../v5/interactions.mjs';
const ok=(s,a)=>{const r=act(s,a,1000+s.moves*1000);assert.ok(r.ok,JSON.stringify(a)+': '+r.message);return r;};
const reject=(s,a)=>{const before=JSON.stringify(s);assert.equal(act(s,a).ok,false);assert.equal(JSON.stringify(s),before);};
function opened(){const s=fresh(0);while(s.stage<4&&s.moves<250)ok(s,choose(s,{sideFirst:false,openCaches:true}));assert.equal(s.stage,4);return s;}
function engine(){const s=opened();for(let n=0;n<150&&!s.journey.engine;n++)ok(s,choose(s,{sideFirst:false,openCaches:true}));assert.ok(s.journey.engine);return s;}
test('both kits spend different real stock and return the promised three useful objects',()=>{
 for(const kit of Object.keys(KITS)){
 const s=fresh();s.craftMastery={rig:true,chart:true,flux:true};s.stage=3;s.landingStep=2;s.routePrepared=true;s.workshop.repaired=true;s.camp.pier=true;s.seals.navigation=s.seals.stabilization=s.seals.resonance=true;s.board=s.board.map(x=>x?.type==='source'?x:null);
 for(const [i,r]of KITS[kit].needs.entries())s.board[7+i]=item(r.family,r.tier);
 assert.equal(deliveryItems(s,{type:'goal',kit}).length,2);ok(s,{type:'goal',kit});assert.equal(s.journey.kit,kit);assert.equal(s.stage,4);
 const family=kit==='field'?'rig':'chart';for(const tier of [2,1])assert.ok(s.board.filter(x=>x?.family===family&&x.tier===tier).length>=(tier===1?2:1));
 assert.deepEqual(load(JSON.stringify(s)),s);reject(s,{type:'goal',kit});
 }
});
test('kit cannot silently lose promised finds on a full board or use an invalid choice',()=>{
 const s=fresh();s.craftMastery={rig:true,chart:true,flux:true};s.stage=3;s.landingStep=2;s.routePrepared=true;s.workshop.repaired=true;s.camp.pier=true;s.seals.navigation=s.seals.stabilization=s.seals.resonance=true;s.board=Array.from({length:36},()=>item('flux',0));s.board[7]=item('rig',2);s.board[8]=item('chart',1);
 reject(s,{type:'goal',kit:'field'});reject(s,{type:'goal',kit:'missing'});
 s.board[9]=null;ok(s,{type:'goal',kit:'field'});
});
test('old mid-chapter and completed saves retain earned access and migration is idempotent',()=>{
 for(const stage of [2,3,4]){const old=opened();old.stage=stage;delete old.journey;const s=load(JSON.stringify(old));assert.equal(s.journey.kit,'legacy');assert.equal(s.stage,stage);assert.deepEqual(s.board,old.board);assert.deepEqual(s.workshop,old.workshop);assert.deepEqual(s.requests,old.requests);assert.deepEqual(load(JSON.stringify(s)),s);}
});
test('engine is earned through gameplay; restored capability survives reload and cannot duplicate its cell',()=>{
 const s=engine();assert.ok(s.moves>0);assert.equal(deliveryItems(s,{type:'restoreEngine'}).length<=3,true);reject(s,{type:'restoreEngine'});assert.deepEqual(load(JSON.stringify(s)),s);
 const before=structuredClone(s),i=s.board.findIndex(x=>x?.family==='flux'&&x.tier===1),source=s.board.findIndex(x=>x?.type==='source'&&x.id==='chart');assert.deepEqual(useAction(s,i,source),{type:'infuse',from:i,index:source,id:'chart'});
 ok(s,{type:'infuse',id:'chart',from:i});assert.equal(s.board[i],null);assert.equal(s.energy,before.energy);assert.deepEqual(s.charges,before.charges);assert.deepEqual(s.taps,before.taps);assert.equal(s.journey.infusions,1);reject(s,{type:'infuse',id:'rig'});assert.deepEqual(load(JSON.stringify(s)),s);
});
test('enriched run affects only selected source, keeps normal cost and rare cadence, and does not waste Supply Surge',()=>{
 const s=engine();ok(s,{type:'infuse',id:'chart'});s.board=s.board.map(x=>x?.type==='source'?x:null);s.energy=80;s.charges={rig:7,chart:7,flux:7};s.surge=2;s.taps.chart=8;
 assert.equal(nextOutput(s,'chart').type,'glyph');ok(s,{type:'produce',id:'chart'});assert.equal(s.journey.boost.left,3);assert.equal(s.surge,2);
 ok(s,{type:'produce',id:'rig'});assert.equal(s.journey.boost.left,3);assert.equal(s.surge,1);
 for(let n=0;n<3;n++){s.producerStreak=0;const base=structuredClone(s);base.journey.boost=null;base.surge=0;assert.equal(nextOutput(s,'chart').tier,nextOutput(base,'chart').tier+1);const energy=s.energy,charge=s.charges.chart;ok(s,{type:'produce',id:'chart'});assert.equal(s.energy,energy-1);assert.equal(s.charges.chart,charge-1);assert.equal(s.surge,1);Object.assign(s,load(JSON.stringify(s)));}
 assert.equal(s.journey.boost,null);
});
test('engine missing ingredients and full-board production fail without charging anything',()=>{
 const s=opened();s.board=s.board.map(x=>x?.type==='source'?x:null);reject(s,{type:'restoreEngine'});for(const [i,r]of ENGINE_NEEDS.entries())s.board[7+i]=item(r.family,r.tier);ok(s,{type:'restoreEngine'});ok(s,{type:'infuse',id:'rig'});s.board=s.board.map(x=>x??item('rig',0));reject(s,{type:'produce',id:'rig'});
});
test('first crafted device yields a cross-family find once; crowded trays receive usable loose stock',()=>{
 // Before the rings wake the find is always loose raw-ish stock; packed cases come after.
 {const s=fresh();s.board=s.board.map(x=>x?.type==='source'?x:null);s.board[7]=item('rig',2);s.board[8]=item('rig',2);const r=ok(s,{type:'merge',from:7,to:8});assert.equal(r.discoveryReward.loose,true);assert.deepEqual(s.board[r.discoveryReward.index],item('chart',1));}
 for(const crates of [0,2]){const s=fresh();s.stage=3;s.landingStep=2;s.board=s.board.map(x=>x?.type==='source'?x:null);for(let n=0;n<crates;n++)s.board[10+n]={type:'crate',kind:'salvage',left:3};s.board[7]=item('rig',2);s.board[8]=item('rig',2);const r=ok(s,{type:'merge',from:7,to:8});assert.equal(r.discoveryReward.kind,'survey');assert.equal(r.discoveryReward.loose,crates===2);assert.ok(s.board.filter(x=>x?.type==='crate').length<=2);s.board[7]=item('rig',2);s.board[9]=item('rig',2);assert.equal(ok(s,{type:'merge',from:7,to:9}).discoveryReward,null);}
});
