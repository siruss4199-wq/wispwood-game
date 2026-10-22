// The dig-out start: sand covers most of a new board and a merge digs the sand beside
// it, freeing whatever is buried there. Salt-crusted parts (saves from the covered-board
// build) stay supported: visible, immovable, freed by merging a free twin onto them.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fresh,act,load,item,crust,sand,count,matches,nameOf,freesCrust,sealedJar,sealedCache} from '../v5/core.mjs';

const crustAt=s=>s.board.flatMap((x,i)=>x?.type==='crust'?[i]:[]);
const sandAt=s=>s.board.flatMap((x,i)=>x?.type==='sand'?[i]:[]);
// A save from the covered-board build: crusted parts sit where new boards have sand.
const crusted=()=>{const s=fresh(0);[[17,'rig',0],[25,'rig',0],[26,'chart',0],[28,'rig',1],[29,'flux',0],[35,'chart',1]].forEach(([i,f,t])=>s.board[i]=crust(f,t));return s;};
// An older board with no sand at all (salt-sealed rewards lie loose there).
const bare=()=>{const s=fresh(0);s.board=s.board.map(x=>x?.type==='sand'?null:x);return s;};
function refused(s,a){const before=JSON.stringify(s),r=act(s,a,1);assert.equal(r.ok,false,JSON.stringify(a));assert.equal(JSON.stringify(s),before,'refusal leaves state untouched');return r;}

test('a fresh board starts in sand: no crusts, and buried parts count for nothing until dug out',()=>{
 const s=fresh(0);assert.deepEqual(crustAt(s),[]);
 assert.deepEqual(sandAt(s),[3,4,9,10,11,14,15,16,17,21,22,25,26,28,29,33,35]);
 assert.deepEqual(s.board.flatMap((x,i)=>x?.type==='item'?[i]:[]),[2,7,8,13,18],'only Rivet Rover\'s starter parts lie in the open camp');
 for(const i of sandAt(s)){const x=s.board[i];assert.match(nameOf(x),x.find?/^Buried /:/^Sand$/);if(x.find?.type==='item')assert.equal(matches(x,x.find),false);}
 assert.equal(count(s,{family:'flux',tier:0}),0,'the three buried Violet shards are not counted');
 assert.match(nameOf(s.board[21]),/^Buried energy jar · \+8/);for(const i of [3,10])assert.equal(nameOf(s.board[i]),'Buried small rover toolbox');
 const old=crusted();for(const i of crustAt(old)){const x=old.board[i];assert.equal(matches(x,{family:x.family,tier:x.tier}),false);assert.match(nameOf(x),/^Salt-crusted /);}
});

test('sand cannot be moved, merged, recycled, opened or built on; only a merge beside it digs it',()=>{
 const s=fresh(0);
 refused(s,{type:'move',from:17,to:1});
 refused(s,{type:'move',from:7,to:10});
 refused(s,{type:'recycle',index:17});
 refused(s,{type:'merge',from:7,to:17});// a twin of the buried offcut does not free it the way it frees a crust
 refused(s,{type:'merge',from:17,to:7});
 refused(s,{type:'crate',index:21});
});

test('a merge digs the orthogonal sand beside it: plain sand opens, buried parts come out where they lay',()=>{
 const s=fresh(0),free=s.board.filter(x=>x===null).length;
 const r=act(s,{type:'merge',from:7,to:8},1);// the opening merge digs below and right of 8
 assert.equal(r.ok,true,r.message);
 assert.deepEqual(r.cracked,[{index:14,type:'sand',find:item('chart',1)},{index:9,type:'sand',find:item('chart',0)}]);
 assert.deepEqual(s.board[14],item('chart',1));assert.deepEqual(s.board[9],item('chart',0));
 for(const i of [3,15])assert.equal(s.board[i].type,'sand','diagonal sand stays');
 assert.equal(s.board.filter(x=>x===null).length,free+1);
 s.board[1]=item('chart',0);const r2=act(s,{type:'merge',from:1,to:9},2);// 9 borders the two buried toolboxes at 3 and 10 and a buried Violet shard at 15
 assert.deepEqual(r2.cracked,[{index:3,type:'kit',find:{type:'kit',family:'rig',size:1,left:3}},{index:15,type:'sand',find:item('flux',0)},{index:10,type:'kit',find:{type:'kit',family:'rig',size:1,left:3}}]);
 assert.deepEqual(s.board[3],{type:'kit',family:'rig',size:1,left:3});assert.deepEqual(s.board[10],{type:'kit',family:'rig',size:1,left:3});assert.deepEqual(s.board[15],item('flux',0));
 // Plain sand opens into working space.
 const p=fresh(0);p.board[10]=sand();p.board[1]=item('chart',0);p.board[9]=item('chart',0);act(p,{type:'merge',from:1,to:9},3);assert.equal(p.board[10],null);
});

test('crusted parts cannot be moved, merged together, recycled or used as the moving part',()=>{
 const s=crusted();s.board[1]=item('chart',0);
 refused(s,{type:'move',from:17,to:1});
 refused(s,{type:'recycle',index:17});
 s.board[4]=crust('rig',0);
 refused(s,{type:'merge',from:4,to:17});
 refused(s,{type:'merge',from:17,to:7});
 refused(s,{type:'merge',from:13,to:17},'a Grip tool does not free a crusted offcut');
 refused(s,{type:'merge',from:1,to:17},'another family does not free it');
});

test('merging a free twin onto a crusted part frees it one tier up and opens the source cell',()=>{
 const s=crusted(),free=s.board.filter(x=>x===null).length,merges=s.merges;
 const r=act(s,{type:'merge',from:7,to:17},1);
 assert.equal(r.ok,true,r.message);assert.equal(r.freedCrust,true);assert.match(r.message,/^Freed from the salt · Grip tool/);
 assert.deepEqual(s.board[17],item('rig',1));assert.equal(s.board[7],null);
 assert.deepEqual(r.cracked,[{index:11,type:'sand',find:item('chart',0)},{index:16,type:'sand',find:item('flux',0)}],'freeing a crust also digs the sand beside it');
 assert.equal(s.board.filter(x=>x===null).length,free+1);assert.equal(s.merges,merges+1);
 assert.equal(freesCrust(item('rig',1),crust('rig',1)),true);
 assert.equal(act(s,{type:'merge',from:13,to:28},2).ok,true,'a Grip tool frees the crusted Grip tool');
 assert.deepEqual(s.board[28],item('rig',2));
});

test('saves keep crusted parts; malformed ones fall back to a fresh game',()=>{
 const s=crusted();act(s,{type:'merge',from:7,to:17},1);
 const back=load(JSON.stringify(s),2);
 assert.deepEqual(crustAt(back),crustAt(s));assert.deepEqual(back.board[17],item('rig',1));
 for(const bad of [{type:'crust',family:'gold',tier:0},{type:'crust',family:'rig',tier:9},{type:'crust',family:'chart',tier:1,line:'tide'}]){
  const t=fresh(0);t.board[35]=bad;t.moves=5;assert.equal(load(JSON.stringify(t),3).moves,0,JSON.stringify(bad));
 }
});

test('saves keep sand and its finds; malformed sand finds fall back to a fresh game',()=>{
 const s=fresh(0);act(s,{type:'merge',from:7,to:8},1);
 const back=load(JSON.stringify(s),2);assert.deepEqual(back.board,s.board);assert.deepEqual(sandAt(back),sandAt(s));
 for(const ok of [sand(),sand(item('chart',3)),sand(sealedJar(50)),sand(sealedCache())]){const t=fresh(0);t.board[10]=ok;t.moves=5;assert.equal(load(JSON.stringify(t),3).moves,5,JSON.stringify(ok));}
 for(const find of [item('rig',4),item('chart',1,'tide'),{type:'item',family:'gold',tier:0},{type:'item',family:'rig'},sealedJar(0),sealedJar(99),{type:'jar'},{type:'rock'},crust('rig',0),null,'chart']){
  const t=fresh(0);t.board[10]={type:'sand',find};t.moves=5;assert.equal(load(JSON.stringify(t),3).moves,0,JSON.stringify(find));
 }
});

test('older saves load without gaining crusted parts or sand',()=>{
 const dir=new URL('./fixtures/stage2/',import.meta.url);
 for(const f of readdirSync(dir)){
  const raw=readFileSync(new URL(f,dir),'utf8'),old=JSON.parse(raw),s=load(raw,9);
  assert.equal(s.stage,old.stage,f);assert.deepEqual(crustAt(s),[],f);assert.deepEqual(sandAt(s),[],f);
 }
});

test('opening a route digs the sand or frees the crusted parts beside it and never deletes parts the player keeps there',()=>{
 for(const cover of ['sand','crust'])for(const route of ['ridge','conduit']){
  const s=fresh(0),start=route==='ridge'?24:27,family=route==='ridge'?'rig':'chart';
  s.stage=1;s.landingStep=2;s.routePrepared=true;s.board[1]=item(family,2);
  s.board[start+1]=item('flux',3);// a part the player freed or moved here earlier
  const crustCell=start+2;if(cover==='crust')s.board[crustCell]=crust('chart',0);else s.board[crustCell]=sand(item('chart',0));
  const r=act(s,{type:'breach',index:start,from:1},1);
  assert.equal(r.ok,true,r.message);
  assert.deepEqual(s.board[start+1],item('flux',3),route+': kept part survives');
  assert.deepEqual(s.board[crustCell],item('chart',0),route+': '+cover+'-covered part comes free');
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
 // Sand the breach digs into space (plain, or hiding a jar) counts as room.
 s.board[28]=sand();s.board[29]=sand(sealedJar(4));const energy=s.energy;
 const r2=act(s,{type:'breach',index:27,from:1},2);
 assert.equal(r2.ok,true,r2.message);assert.deepEqual(s.board[28],item('flux',2));assert.equal(s.board[29]?.kind,'relic');assert.ok(s.energy>=energy+4);
});

test('a merge beside a sealed jar cracks it: its energy is paid at once and the space comes free',()=>{
 const s=bare();s.board[22]=sealedJar(5);s.board[3]=sealedJar(8);s.board[15]=item('flux',0);s.board[16]=item('flux',0);const energy=s.energy;
 const r=act(s,{type:'merge',from:15,to:16},1);// Violet shards merge next to the loose +5 jar at 22 (an older save)
 assert.equal(r.ok,true);assert.deepEqual(r.cracked,[{index:22,type:'jar',energy:5}]);
 assert.equal(s.board[22],null);assert.equal(s.energy,energy+5+(s.merges%3===0?1:0));
 const r2=act(s,{type:'merge',from:18,to:2},2);// starter offcuts merge next to the +8 jar at 3
 assert.deepEqual(r2.cracked,[{index:3,type:'jar',energy:8}]);assert.equal(s.board[3],null);
 const t=fresh(0);t.board[15]=item('rig',0);t.board[16]=item('rig',0);const e=t.energy,r3=act(t,{type:'merge',from:16,to:15},1);// on a new board the +8 jar is buried in sand at 21, below 15
 assert.deepEqual(r3.cracked.find(x=>x.index===21),{index:21,type:'jar',energy:8,dug:true});assert.equal(t.board[21],null,'the dug-up jar leaves working space');assert.equal(t.energy,e+8+(t.merges%3===0?1:0));
});

test('the mystery chest cracks into a mixed parts case, loose or buried; diagonal merges crack nothing',()=>{
 const s=bare();s.board[12]=sealedCache();s.board[6]=item('rig',1);
 const r=act(s,{type:'merge',from:6,to:13},1);// Grip tools merge beside the loose chest at 12 (an older save)
 assert.deepEqual(r.cracked,[{index:12,type:'cache'}]);assert.deepEqual(s.board[12],{type:'crate',kind:'locker',left:3});
 const u=fresh(0);u.board[3]=sand(sealedCache());
 const r2=act(u,{type:'merge',from:18,to:2},1);// a chest buried beside the camp is dug into a case
 assert.deepEqual(r2.cracked,[{index:3,type:'cache',dug:true}]);assert.deepEqual(u.board[3],{type:'crate',kind:'locker',left:3});
 const t=bare();t.board[22]=sealedJar(5);t.board[1]=item('flux',0);t.board[15]=item('flux',0);
 const r3=act(t,{type:'merge',from:1,to:15},2);// 15 is diagonal to the jar at 22
 assert.equal(r3.ok,true);assert.deepEqual(r3.cracked,[]);assert.deepEqual(t.board[22],sealedJar(5));
});

test('sealed rewards never move, recycle or merge; saves keep them; malformed ones start fresh',()=>{
 const s=fresh(0);// loose sealed rewards, as older saves hold them
 s.board[22]=sealedJar(5);s.board[3]=sealedJar(8);s.board[12]=sealedCache();s.board[4]=item('chart',1);
 for(const a of [{type:'move',from:22,to:1},{type:'recycle',index:22},{type:'merge',from:3,to:4},{type:'merge',from:12,to:13}]){
  const before=JSON.stringify(s);assert.equal(act(s,a,1).ok,false,JSON.stringify(a));assert.equal(JSON.stringify(s),before);
 }
 assert.match(nameOf(sealedJar(5)),/energy jar · \+5/);assert.match(nameOf(sealedCache()),/mystery chest/);
 assert.deepEqual(load(JSON.stringify(s),2).board,s.board);
 for(const bad of [{type:'jar',energy:0},{type:'jar',energy:99},{type:'jar'}]){const t=fresh(0);t.board[22]=bad;t.moves=4;assert.equal(load(JSON.stringify(t),3).moves,0);}
});

test('opening the Vault frees salt and digs sand across the whole 7×7 board, new column and row included',async()=>{
 const {choose}=await import('./v5-policy.mjs');
 const s=fresh(0);let n=0;
 while(s.stage<4&&n<400){const r=act(s,choose(s,{sideFirst:false,openCaches:true,clearSalvage:true}),++n*4500);assert.equal(r.ok,true,r.message);}
 assert.equal(s.stage,4);
 assert.deepEqual(s.board.flatMap((x,i)=>['crust','sand','jar','cache'].includes(x?.type)?[i]:[]),[]);
});
