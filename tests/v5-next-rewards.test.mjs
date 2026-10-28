// Rewards on a full board (Build 47a, ported from PR #80's Chapter 2 plan D6). Before, a stage
// bought on a full board lost its generator copy, crate or Tide token (repro: fill every space,
// buy "Lay a boardwalk": 70 coins paid, the Rover copy gone). Now the reward waits in the save,
// in the order it was earned, and lands once next to the Rover after the next action that
// leaves a space. Old saves load with nothing waiting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,load,act,item,PENDING_MAX} from '../v5/next/game.mjs';
import {kit} from '../v5/kits.mjs';

const gens=s=>s.board.filter(x=>x?.type==='source').length;
const free=s=>s.board.filter(x=>x===null).length;
// A camp that can buy beach stages: coins, materials in, and every empty space filled with
// copper offcuts (plus eight cargo cells turned into offcuts, so there are twins enough for a
// merge to free a space several times over).
function fullCamp(){
 const s=fresh(0);s.coins=5000;s.daily={day:9e6,count:1};
 s.built={'beach-path':1,'beach-tent':2,'beach-mast':2};s.materials={'beach-path':3,'beach-tent':3,'beach-mast':3};
 let n=0;for(let i=0;i<s.board.length;i++)if(s.board[i]===null||s.board[i].type==='cargo'&&n++<8)s.board[i]=item('rig',0);
 return s;
}
const ok=(s,a,now=1000)=>{const r=act(s,a,now);assert.ok(r.ok,r.message);return r;};
const twins=s=>{const b=s.board,i=b.findIndex(x=>x?.type==='item'&&x.family==='rig'&&x.tier===0),j=b.findIndex((x,k)=>k!==i&&x?.type==='item'&&x.family==='rig'&&x.tier===0);return [i,j];};

test('a stage bought on a full board keeps its reward: it waits, then lands once', ()=>{
 const s=fullCamp();assert.equal(free(s),0);const g0=gens(s);
 const r=ok(s,{type:'restore',id:'beach-path'});// stage 2: a Rivet Rover copy
 assert.equal(r.effects.copy,-1);assert.equal(r.effects.pending,1);
 assert.deepEqual(s.pending,[{type:'source',id:'rig'}],'the copy waits in the save');assert.equal(gens(s),g0,'not on the board yet');
 const [i,j]=twins(s);const m=ok(s,{type:'merge',from:i,to:j});
 assert.equal(m.arrived.length,1);assert.deepEqual(m.arrived[0].thing,{type:'source',id:'rig'});
 assert.deepEqual(s.board[m.arrived[0].index],{type:'source',id:'rig'});
 assert.equal(gens(s),g0+1,'exactly one copy');assert.deepEqual(s.pending,[]);
 // nothing lands twice
 const [a,b]=twins(s);const again=ok(s,{type:'merge',from:a,to:b});assert.equal(again.arrived,undefined);assert.equal(gens(s),g0+1);
});

test('several waiting rewards keep their number and order, across save and reload', ()=>{
 const s=fullCamp();
 ok(s,{type:'restore',id:'beach-path'});// copy (Rover)
 ok(s,{type:'restore',id:'beach-tent'});// stage 3: Tide token
 ok(s,{type:'restore',id:'beach-mast'});// stage 3: Tide token
 ok(s,{type:'restore',id:'beach-path'});// stage 3: copy (Rover)
 const want=[{type:'source',id:'rig'},{type:'token'},{type:'token'},{type:'source',id:'rig'}];
 assert.deepEqual(s.pending,want);
 // save and reload (twice): same rewards, same order, nothing added
 let t=load(JSON.stringify(s),2000);assert.deepEqual(t.pending,want);t=load(JSON.stringify(t),3000);assert.deepEqual(t.pending,want);
 // one space: the first earned lands first
 const [i,j]=twins(t);const m=ok(t,{type:'merge',from:i,to:j},4000);
 assert.deepEqual(m.arrived.map(a=>a.thing),[want[0]]);assert.deepEqual(t.pending,want.slice(1));
 // reload mid-way: the rest still wait, in order
 t=load(JSON.stringify(t),5000);assert.deepEqual(t.pending,want.slice(1));
 // three more spaces: the rest land, in order, once
 for(let k=0;k<3;k++){const [a,b]=twins(t);ok(t,{type:'merge',from:a,to:b},6000+k);}
 assert.deepEqual(t.pending,[]);
 const landed=t.board.filter(x=>x?.type==='token').length;assert.equal(landed,2,'both tokens, once each');
 t=load(JSON.stringify(t),9000);assert.deepEqual(t.pending,[],'reload after landing adds nothing');
 assert.equal(t.board.filter(x=>x?.type==='token').length,2);
});

test('a bought stage cannot be claimed twice, and waiting does not change its price', ()=>{
 const s=fullCamp(),coins=s.coins;
 ok(s,{type:'restore',id:'beach-path'});assert.equal(coins-s.coins,70);
 ok(s,{type:'restore',id:'beach-path'});assert.equal(s.built['beach-path'],3);
 const r=act(s,{type:'restore',id:'beach-path'},1000);assert.equal(r.ok,false);assert.match(r.message,/fully upgraded/);
 assert.equal(s.pending.length,2,'one reward per stage bought');
});

test('older saves load with nothing waiting; a damaged waiting list is not trusted', ()=>{
 const old=fresh(0);delete old.pending;old.moves=5;// a Build 46 save has no pending field
 const s=load(JSON.stringify(old),1000);assert.deepEqual(s.pending,[]);assert.equal(s.moves,5);
 const bad=fresh(0);bad.moves=5;bad.pending=[{type:'cargo',key:{family:'rig',tier:1}}];
 assert.equal(load(JSON.stringify(bad),1000).moves,0,'cargo can never be a waiting reward');
 const many=fresh(0);many.moves=5;many.pending=Array(PENDING_MAX+1).fill({type:'token'});
 assert.equal(load(JSON.stringify(many),1000).moves,0);
 const fine=fresh(0);fine.moves=5;fine.pending=[kit('rig',2),{type:'cog'}];
 assert.deepEqual(load(JSON.stringify(fine),1000).pending,fine.pending);
});

test('a reward with room still goes straight onto the board', ()=>{
 const s=fresh(0);s.coins=500;s.daily={day:9e6,count:1};s.built={'beach-path':1};s.materials={'beach-path':2};
 const g0=gens(s),r=ok(s,{type:'restore',id:'beach-path'});
 assert.ok(r.effects.copy>=0);assert.equal(r.effects.pending,undefined);assert.equal(gens(s),g0+1);assert.deepEqual(s.pending,[]);
});
