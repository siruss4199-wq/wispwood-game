// Salt-crusted parts: visible, immovable, freed by merging a free twin onto them.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fresh,act,load,item,crust,count,matches,nameOf,freesCrust,sealedJar,sealedCache} from '../v5/core.mjs';

const crustAt=s=>s.board.flatMap((x,i)=>x?.type==='crust'?[i]:[]);
function refused(s,a){const before=JSON.stringify(s),r=act(s,a,1);assert.equal(r.ok,false,JSON.stringify(a));assert.equal(JSON.stringify(s),before,'refusal leaves state untouched');return r;}

test('a fresh board shows six crusted parts that count for nothing yet',()=>{
 const s=fresh(0),cells=crustAt(s);
 assert.equal(cells.length,6);
 for(const i of cells){const x=s.board[i];assert.equal(matches(x,{family:x.family,tier:x.tier}),false);assert.match(nameOf(x),/^Salt-crusted /);}
 assert.equal(count(s,{family:'flux',tier:0}),2,'the crusted Violet shard is not counted');
});

test('crusted parts cannot be moved, merged together, recycled or used as the moving part',()=>{
 const s=fresh(0);
 refused(s,{type:'move',from:17,to:1});
 refused(s,{type:'recycle',index:17});
 s.board[4]=crust('rig',0);
 refused(s,{type:'merge',from:4,to:17});
 refused(s,{type:'merge',from:17,to:7});
 refused(s,{type:'merge',from:13,to:17},'a Grip tool does not free a crusted offcut');
 refused(s,{type:'merge',from:9,to:17},'another family does not free it');
});

test('merging a free twin onto a crusted part frees it one tier up and opens the source cell',()=>{
 const s=fresh(0),free=s.board.filter(x=>x===null).length,merges=s.merges;
 const r=act(s,{type:'merge',from:7,to:17},1);
 assert.equal(r.ok,true,r.message);assert.equal(r.freedCrust,true);assert.match(r.message,/^Freed from the salt · Grip tool/);
 assert.deepEqual(s.board[17],item('rig',1));assert.equal(s.board[7],null);
 assert.equal(s.board.filter(x=>x===null).length,free+1);assert.equal(s.merges,merges+1);
 assert.equal(freesCrust(item('rig',1),crust('rig',1)),true);
 assert.equal(act(s,{type:'merge',from:13,to:28},2).ok,true,'a Grip tool frees the crusted Grip tool');
 assert.deepEqual(s.board[28],item('rig',2));
});

test('saves keep crusted parts; malformed ones fall back to a fresh game',()=>{
 const s=fresh(0);act(s,{type:'merge',from:7,to:17},1);
 const back=load(JSON.stringify(s),2);
 assert.deepEqual(crustAt(back),crustAt(s));assert.deepEqual(back.board[17],item('rig',1));
 for(const bad of [{type:'crust',family:'gold',tier:0},{type:'crust',family:'rig',tier:9},{type:'crust',family:'chart',tier:1,line:'tide'}]){
  const t=fresh(0);t.board[35]=bad;t.moves=5;assert.equal(load(JSON.stringify(t),3).moves,0,JSON.stringify(bad));
 }
});

test('older saves load without gaining crusted parts',()=>{
 const dir=new URL('./fixtures/stage2/',import.meta.url);
 for(const f of readdirSync(dir)){
  const raw=readFileSync(new URL(f,dir),'utf8'),old=JSON.parse(raw),s=load(raw,9);
  assert.equal(s.stage,old.stage,f);assert.deepEqual(crustAt(s),[],f);
 }
});

test('opening a route frees crusted parts beside it and never deletes parts the player keeps there',()=>{
 for(const route of ['ridge','conduit']){
  const s=fresh(0),start=route==='ridge'?24:27,family=route==='ridge'?'rig':'chart';
  s.stage=1;s.landingStep=2;s.routePrepared=true;s.board[1]=item(family,2);
  s.board[start+1]=item('flux',3);// a part the player freed or moved here earlier
  const crustCell=start+2,kept=structuredClone(s.board[crustCell]);
  const r=act(s,{type:'breach',index:start,from:1},1);
  assert.equal(r.ok,true,r.message);
  assert.deepEqual(s.board[start+1],item('flux',3),route+': kept part survives');
  assert.deepEqual(s.board[crustCell],item(kept.family,kept.tier),route+': crusted part comes free');
  const rewards=route==='ridge'?[item('rig',1)]:[item('flux',2)];
  for(const x of rewards)assert.ok(s.board.some(y=>JSON.stringify(y)===JSON.stringify(x)),route+': reward placed');
  if(route==='conduit')assert.ok(s.board.some(y=>y?.type==='crate'&&y.kind==='relic'));
 }
});

test('an older save with buried ground beside the route still opens it into space',()=>{
 const s=fresh(0);s.stage=1;s.landingStep=2;s.routePrepared=true;s.board[1]=item('rig',2);
 s.board[25]={type:'sealed'};s.board[26]={type:'sealed'};
 assert.equal(act(s,{type:'breach',index:24,from:1},1).ok,true);
 assert.deepEqual(s.board[25],item('rig',1));assert.equal(s.board[26],null);
});

test('a full board asks for space before the conduit breach instead of losing its finds',()=>{
 const s=fresh(0);s.stage=1;s.landingStep=2;s.routePrepared=true;s.board[1]=item('chart',2);
 for(let i=0;i<36;i++)if(s.board[i]===null)s.board[i]=item('flux',0);
 const before=JSON.stringify(s),r=act(s,{type:'breach',index:27,from:1},1);
 assert.equal(r.ok,false);assert.match(r.message,/free space/);assert.equal(JSON.stringify(s),before);
});

test('a merge beside a sealed jar cracks it: its energy is paid at once and the space comes free',()=>{
 const s=fresh(0),energy=s.energy;
 const r=act(s,{type:'merge',from:15,to:16},1);// Violet shards merge next to the +5 jar at 22
 assert.equal(r.ok,true);assert.deepEqual(r.cracked,[{index:22,type:'jar',energy:5}]);
 assert.equal(s.board[22],null);assert.equal(s.energy,energy+5+(s.merges%3===0?1:0));
 const r2=act(s,{type:'merge',from:10,to:9},2);// Ink scraps merge next to the +8 jar at 3
 assert.deepEqual(r2.cracked,[{index:3,type:'jar',energy:8}]);
});

test('the mystery chest cracks into a mixed parts case; diagonal merges crack nothing',()=>{
 const s=fresh(0);s.board[6]=item('rig',1);
 const r=act(s,{type:'merge',from:6,to:13},1);// Grip tools merge beside the chest at 12
 assert.deepEqual(r.cracked,[{index:12,type:'cache'}]);assert.deepEqual(s.board[12],{type:'crate',kind:'locker',left:3});
 const t=fresh(0);
 const r3=act(t,{type:'merge',from:16,to:15},2);// 15 is diagonal to the jar at 22
 assert.equal(r3.ok,true);assert.deepEqual(r3.cracked,[]);assert.deepEqual(t.board[22],sealedJar(5));
});

test('sealed rewards never move, recycle or merge; saves keep them; malformed ones start fresh',()=>{
 const s=fresh(0);
 for(const a of [{type:'move',from:22,to:21},{type:'recycle',index:22},{type:'merge',from:3,to:4},{type:'merge',from:12,to:6}]){
  const before=JSON.stringify(s);assert.equal(act(s,a,1).ok,false,JSON.stringify(a));assert.equal(JSON.stringify(s),before);
 }
 assert.match(nameOf(sealedJar(5)),/energy jar · \+5/);assert.match(nameOf(sealedCache()),/mystery chest/);
 assert.deepEqual(load(JSON.stringify(s),2).board,s.board);
 for(const bad of [{type:'jar',energy:0},{type:'jar',energy:99},{type:'jar'}]){const t=fresh(0);t.board[22]=bad;t.moves=4;assert.equal(load(JSON.stringify(t),3).moves,0);}
});
