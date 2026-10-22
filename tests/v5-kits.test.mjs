// Generator boxes: tap for free parts, merge unopened twins, feed a large box to
// its producer for a level (v5/kits.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fresh,act,load,item,nameOf,nextOutput} from '../v5/core.mjs';
import {kit,KIT_DROPS,levelLift,MAX_PRODUCER_LEVEL} from '../v5/kits.mjs';
import {useAction} from '../v5/interactions.mjs';

const ok=(s,a,now=1)=>{const r=act(s,a,now);assert.equal(r.ok,true,JSON.stringify(a)+' '+r.message);return r;};
function refused(s,a){const before=JSON.stringify(s),r=act(s,a,1);assert.equal(r.ok,false,JSON.stringify(a));assert.equal(JSON.stringify(s),before,'refusal leaves state untouched');return r;}
const value=size=>KIT_DROPS[size].reduce((n,t)=>n+2**t,0);

test('a bigger box holds more and better parts than the two it was merged from',()=>{
 assert.deepEqual([1,2,3].map(n=>KIT_DROPS[n].length),[3,5,6]);
 assert.ok(value(2)>=2*value(1));assert.ok(value(3)>=2*value(2));
 assert.ok(Math.max(...KIT_DROPS[3])>Math.max(...KIT_DROPS[1]));
 assert.equal(nameOf(kit('rig',1)),'Small Rover toolbox');assert.equal(nameOf(kit('chart',2)),'Medium Kite map satchel');assert.equal(nameOf(kit('flux',3)),'Large Crucible shard flask');
});

test('tapping a box drops its parts for free beside it, then the box is gone',()=>{
 const s=fresh(0);s.board[1]=kit('rig',1);const energy=s.energy;
 const drops=[];
 for(let n=0;n<3;n++){const r=ok(s,{type:'openKit',index:1});drops.push(s.board[r.index]);if(n<2)assert.equal(s.board[1].left,2-n);}
 assert.deepEqual(drops,KIT_DROPS[1].map(t=>item('rig',t)));
 assert.deepEqual(s.board[1],item('rig',KIT_DROPS[1].at(-1)),'the last part takes the box space');
 assert.equal(s.energy,energy,'boxes cost no energy');
 refused(s,{type:'openKit',index:1});refused(s,{type:'openKit',index:0});
});

test('a box needs a free space for every part but its last',()=>{
 const s=fresh(0);s.board[1]=kit('chart',1);for(let i=0;i<s.board.length;i++)if(s.board[i]===null)s.board[i]=item('flux',3);
 assert.match(refused(s,{type:'openKit',index:1}).message,/Make space/);
 s.board[1].left=1;const r=ok(s,{type:'openKit',index:1});assert.equal(r.index,1);assert.deepEqual(s.board[1],item('chart',0));
});

test('two unopened twin boxes merge into the next size and dig the sand beside them',()=>{
 const s=fresh(0);s.board[1]=kit('rig',1);s.board[2]=kit('rig',1);
 const r=ok(s,{type:'merge',from:1,to:2});assert.deepEqual(s.board[2],kit('rig',2));assert.equal(s.board[1],null);
 assert.ok(r.cracked.some(x=>x.index===3),'2 borders the buried toolbox at 3');assert.equal(r.xp,1);
 s.board[1]=kit('rig',2);ok(s,{type:'mergeKit',from:1,index:2});assert.deepEqual(s.board[2],kit('rig',3));
 s.board[1]=kit('rig',3);assert.match(refused(s,{type:'mergeKit',from:1,index:2}).message,/Large boxes/);
 s.board[1]=kit('chart',3);refused(s,{type:'mergeKit',from:1,index:2});
 s.board[1]=kit('rig',1);s.board[6]=kit('rig',1);s.board[6].left=2;refused(s,{type:'mergeKit',from:1,index:6});
 s.board[6]=kit('chart',1);refused(s,{type:'mergeKit',from:1,index:6});
 s.board[6]=item('rig',0);refused(s,{type:'merge',from:1,to:6});
 assert.deepEqual(useAction(s,1,13),null);s.board[13]=kit('rig',1);assert.deepEqual(useAction(s,1,13),{type:'mergeKit',from:1,index:13});
});

test('a large unopened box fed to its own producer raises its level; levels lift its pulls',()=>{
 const s=fresh(0);s.board[1]=kit('rig',3);
 assert.deepEqual(useAction(s,1,0),{type:'feedKit',from:1,index:0});
 const r=ok(s,{type:'merge',from:1,to:0});assert.equal(r.event,'producerUp');assert.equal(r.xp,10);
 assert.equal(s.board[0].level,2);assert.equal(s.board[1],null);
 for(const bad of [kit('rig',2),kit('chart',3)]){s.board[1]=bad;refused(s,{type:'feedKit',from:1,index:0});}
 s.board[1]=kit('rig',3);s.board[1].left=5;refused(s,{type:'feedKit',from:1,index:0});
 s.board[0].level=MAX_PRODUCER_LEVEL;s.board[1]=kit('rig',3);refused(s,{type:'feedKit',from:1,index:0});
 assert.deepEqual([1,2,3,4,5].map(l=>[1,2,3,4,5,6].map(n=>levelLift(l,n))),[[0,0,0,0,0,0],[0,0,1,0,0,1],[0,1,0,1,0,1],[1,1,1,1,1,1],[1,1,2,1,1,2]]);
 const t=fresh(0);t.board[0].level=4;assert.equal(nextOutput(t,'rig').tier,1,'a level-4 Rover lifts every pull');
 t.board[0].level=5;t.taps.rig=2;assert.equal(nextOutput(t,'rig').tier,2);
 t.taps.rig=8;assert.equal(nextOutput(t,'rig').type,'glyph','the ninth-pull find is unchanged');
});

test('new games bury two small Rover toolboxes beside the camp; chests and orders bring more',()=>{
 const s=fresh(0);assert.deepEqual([3,10].map(i=>s.board[i].find),[kit('rig',1),kit('rig',1)]);
 ok(s,{type:'merge',from:7,to:8});s.board[1]=item('chart',0);const r=ok(s,{type:'merge',from:1,to:9});
 assert.deepEqual([3,10].map(i=>s.board[i]),[kit('rig',1),kit('rig',1)]);assert.equal(r.cracked.filter(x=>x.type==='kit').length,2);
 // Every third crew order brings a small box of the order's kind.
 const t=fresh(0);t.stage=2;t.landingStep=2;t.requests.completed=2;
 const o=t.requests.orders.find(Boolean);assert.ok(o);{for(const need of o.needs)for(let n=0;n<need.count;n++)t.board[t.board.indexOf(null)]=item(need.family,need.tier,need.line);const d=ok(t,{type:'request',id:o.id});assert.ok(d.box>=0,d.message);assert.deepEqual(t.board[d.box],kit(o.needs[0].family,1));}
});

test('saves keep boxes and producer levels; malformed ones start fresh; older saves gain neither',()=>{
 const s=fresh(0);s.board[1]=kit('flux',2);s.board[1].left=3;s.board[0].level=3;s.moves=4;
 const back=load(JSON.stringify(s),2);assert.deepEqual(back.board[1],s.board[1]);assert.equal(back.board[0].level,3);assert.equal(back.moves,4);
 for(const bad of [{type:'kit',family:'gold',size:1,left:3},{type:'kit',family:'rig',size:4,left:3},{type:'kit',family:'rig',size:1,left:0},{type:'kit',family:'rig',size:1,left:4},{type:'kit',family:'rig'}]){
  const t=fresh(0);t.board[1]=bad;t.moves=5;assert.equal(load(JSON.stringify(t),3).moves,0,JSON.stringify(bad));
 }
 for(const level of [1,6,'2',2.5]){const t=fresh(0);t.board[0].level=level;t.moves=5;assert.equal(load(JSON.stringify(t),3).moves,0,'level '+level);}
 const t=fresh(0);t.board[3]={type:'sand',find:{type:'kit',family:'rig',size:9,left:1}};t.moves=5;assert.equal(load(JSON.stringify(t),3).moves,0);
 const dir=new URL('./fixtures/stage2/',import.meta.url);
 for(const f of readdirSync(dir)){
  const raw=readFileSync(new URL(f,dir),'utf8'),old=JSON.parse(raw),s2=load(raw,9);
  assert.equal(s2.stage,old.stage,f);assert.equal(s2.board.some(x=>x?.type==='kit'||x?.type==='source'&&x.level!==undefined),false,f);
 }
});
