// Salt-crusted parts: visible, immovable, freed by merging a free twin onto them.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fresh,act,load,item,crust,count,matches,nameOf,freesCrust} from '../v5/core.mjs';

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
