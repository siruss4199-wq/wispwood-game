// The 7×7 board: original 6×6 cells keep their places. A fresh board's new column and
// row start covered (crusts, jars, a chest); 6×6 saves gain sand gates that open with
// the expedition level.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fresh,act,load,item,cellPos,openGates,GATE_LEVELS,BOARD_SIZE,CORE_SIZE,sealedJar} from '../v5/core.mjs';
import {xpToNext} from '../v5/levels.mjs';
// A 6×6 save from before the 7×7 board: load() appends the closed gates.
const migrated=()=>{const s=fresh(0);s.board=s.board.slice(0,CORE_SIZE);return load(JSON.stringify(s),0);};

test('cell positions: 6×6 core unchanged, new right column and bottom row',()=>{
 assert.deepEqual([0,5,6,35].map(cellPos),[[0,0],[0,5],[1,0],[5,5]]);
 assert.deepEqual([36,42,43,48].map(cellPos),[[0,6],[6,6],[6,0],[6,5]]);
 const seen=new Set(Array.from({length:BOARD_SIZE},(_,i)=>cellPos(i).join(',')));assert.equal(seen.size,49);
});

test('a fresh board has no gates; a migrated 6×6 save has 13: two open per level from 2 to 7, the corner at 8',()=>{
 const f=fresh(0);assert.equal(f.board.length,BOARD_SIZE);assert.ok(!f.board.some(x=>x?.type==='gate'));
 assert.ok(f.board.slice(CORE_SIZE).every(x=>['crust','jar','cache'].includes(x?.type)),'the new cells start covered');
 const s=migrated();assert.equal(s.board.length,BOARD_SIZE);
 assert.deepEqual(s.board.slice(CORE_SIZE).map(x=>x.type+x.level),GATE_LEVELS.map(l=>'gate'+l));
 for(let l=2;l<=7;l++)assert.equal(GATE_LEVELS.filter(x=>x===l).length,2,'level '+l);
 assert.deepEqual(GATE_LEVELS.filter(x=>x===8),[8]);
});

test('levelling up opens that level’s gates before the chest lands, so the chest can use them',()=>{
 const s=migrated();s.level.xp=xpToNext(1)-1;
 const r=act(s,{type:'merge',from:7,to:8},1);
 assert.equal(s.level.level,2);assert.deepEqual(r.levelUp[0].opened,[36,43]);
 assert.ok([36,43].every(i=>s.board[i]===null||s.board[i].type==='crate'));
 assert.ok(s.board.slice(CORE_SIZE).filter(x=>x?.type==='gate').every(x=>x.level>2));
});

test('gates refuse moves, merges and cases; opened gate cells hold parts like any other',()=>{
 const s=migrated();
 for(const a of [{type:'move',from:7,to:36},{type:'merge',from:36,to:7},{type:'crate',index:36},{type:'recycle',index:36}]){
  const before=JSON.stringify(s);assert.equal(act(s,a,1).ok,false,JSON.stringify(a));assert.equal(JSON.stringify(s),before);
 }
 s.level.level=2;openGates(s);assert.equal(act(s,{type:'move',from:7,to:36},2).ok,true);assert.deepEqual(s.board[36],item('rig',0));
});

test('salt cracks across the new edge: a merge in the new column cracks jars beside it in both parts of the board',()=>{
 const s=fresh(0);assert.deepEqual(s.board[38],sealedJar(10),'the fresh column holds a jar below 37');
 s.board[11]=sealedJar(5);s.board[36]=item('rig',0);s.board[37]=item('rig',0);
 const e=s.energy,r=act(s,{type:'merge',from:36,to:37},1);// 37 is row 1, column 6: beside 11 (core) and 38 (column)
 assert.deepEqual(r.cracked,[{index:38,type:'jar',energy:10},{index:11,type:'jar',energy:5}]);assert.ok(s.energy>=e+15);
});

test('6×6 saves load with the gates appended, opened up to their level; nothing else moves',()=>{
 const dir=new URL('./fixtures/stage2/',import.meta.url);
 for(const f of readdirSync(dir)){
  const raw=readFileSync(new URL(f,dir),'utf8'),old=JSON.parse(raw),s=load(raw,9);
  assert.equal(old.board.length,36);assert.equal(s.board.length,BOARD_SIZE,f);
  assert.ok(s.board.slice(CORE_SIZE).every(x=>x.type==='gate'),f+': level 1 keeps all gates');
 }
 const s=fresh(0);s.board=s.board.slice(0,CORE_SIZE);s.level={version:1,level:4,xp:0};
 const back=load(JSON.stringify(s),5);
 assert.deepEqual(back.board.slice(0,CORE_SIZE),s.board);
 assert.equal(back.board.slice(CORE_SIZE).filter(x=>x===null).length,6,'levels 2–4 open six cells');
 for(const bad of [{type:'gate',level:1},{type:'gate',level:9},{type:'gate'}]){const t=fresh(0);t.board[40]=bad;t.moves=3;assert.equal(load(JSON.stringify(t),6).moves,0);}
 const t=fresh(0);t.board.push(null);assert.equal(load(JSON.stringify(t),6).board.length,BOARD_SIZE,'other lengths start fresh');
});
