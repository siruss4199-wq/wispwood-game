// Coast Camp saves the game cannot read, and kept camps (secondary-chain pilot, round 2, 2026-10-29;
// v5/next/saves.mjs). A save from a newer build is told apart from a damaged one; every kept camp
// this build reads is listed for restoring, newest first, one per save, never the current one.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,load,act,item,SAVE_KEY,VERSION} from '../v5/next/game.mjs';
import {readSave,fromNewer,keptCamps,freeKey,isKeptKey,campLabel} from '../v5/next/saves.mjs';

const fixture=n=>readFileSync(new URL(`./fixtures/coast/${n}.json`,import.meta.url),'utf8');
const store=(o={})=>({get:k=>k in o?o[k]:null,set:(k,v)=>{o[k]=v;},o});

test('readSave: empty, readable, from a newer build, damaged',()=>{
 assert.equal(readSave(null,5).status,'empty');assert.equal(readSave('',5).status,'empty');
 for(const n of ['coast-ch1-pre-secondary','coast-ch2-pre-secondary','coast-pilot-extras']){
  const raw=fixture(n),r=readSave(raw,JSON.parse(raw).lastAt+1000);assert.equal(r.status,'ok',n);assert.equal(r.state.moves,JSON.parse(raw).moves);}
 // newer: a later save version, or parts, generators or order parts this build does not know
 const pilot=JSON.parse(fixture('coast-pilot-extras')),at=pilot.lastAt+1000;
 const later=structuredClone(pilot);later.version=VERSION+1;assert.equal(readSave(JSON.stringify(later),at).status,'newer');
 const part=structuredClone(pilot);part.board[14]=item('sail',0);assert.equal(readSave(JSON.stringify(part),at).status,'newer','a part of a chain added later');
 const shed=structuredClone(pilot);shed.shed[0]=item('pearlcraft',1);assert.equal(readSave(JSON.stringify(shed),at).status,'newer','in the shed too');
 const gen=structuredClone(pilot);gen.board[14]={type:'source',id:'loom'};assert.equal(readSave(JSON.stringify(gen),at).status,'newer','a generator added later');
 const order=structuredClone(pilot);order.orders[3].needs[1]={family:'sail',tier:0,count:1};assert.equal(readSave(JSON.stringify(order),at).status,'newer');
 // damaged: not JSON, the wrong shape, impossible values
 assert.equal(readSave('{not json',5).status,'damaged');assert.equal(readSave('[]',5).status,'damaged');
 const bad=structuredClone(pilot);bad.energy=-4;assert.equal(readSave(JSON.stringify(bad),at).status,'damaged');
 const odd=structuredClone(pilot);odd.board[14]={type:'item',family:'Mech!',tier:0};assert.equal(readSave(JSON.stringify(odd),at).status,'damaged','not a family name at all');
 assert.equal(fromNewer({}),false);
});

test('a pilot camp with extras reads in this build and plays on',()=>{
 const raw=fixture('coast-pilot-extras'),s=load(raw,JSON.parse(raw).lastAt+1000);
 assert.ok(s.board.some(x=>x?.family==='mech')&&s.board.some(x=>x?.family==='notes'));
 assert.deepEqual(s.secSince,JSON.parse(raw).secSince);
 const r=act(s,{type:'produce',id:'rig'},s.lastAt+2000);assert.ok(r.ok||/full|energy/i.test(r.message),r.message);
});

test('kept camps: kept keys only, readable ones, one per save, not the current one, newest first',()=>{
 const a=fresh(1000);a.moves=12;a.lastAt=5000;const b=fresh(1000);b.moves=40;b.lastAt=9000;
 const A=JSON.stringify(a),B=JSON.stringify(b),C=fixture('coast-pilot-extras');
 const st=store({[SAVE_KEY]:A,[SAVE_KEY+'-damaged']:B,[SAVE_KEY+'-damaged-2']:'{broken',[SAVE_KEY+'-kept']:C,[SAVE_KEY+'-kept-2']:B,[SAVE_KEY+'-backup']:A,
  [SAVE_KEY+'-playtest']:A,[SAVE_KEY+'-story']:'1','vaultwake-v5':A});
 const list=keptCamps(Object.keys(st.o),st.get,10000,A);
 assert.deepEqual(list.map(c=>c.key).sort(),[SAVE_KEY+'-damaged',SAVE_KEY+'-kept'].sort(),'the broken one, the copy of the current camp and the duplicate are left out; other keys are not camps');
 assert.equal(list[0].when>=list[1].when,true,'newest first');
 for(const c of list)assert.match(c.label,/stages built/);
 for(const k of [SAVE_KEY+'-damaged',SAVE_KEY+'-damaged-12',SAVE_KEY+'-kept',SAVE_KEY+'-kept-3',SAVE_KEY+'-backup',SAVE_KEY+'-kept-1793000000000'])assert.ok(isKeptKey(k),k);
 for(const k of [SAVE_KEY,SAVE_KEY+'-playtest',SAVE_KEY+'-story',SAVE_KEY+'-keptx','vaultwake-v5','vaultwake-v5-replay'])assert.equal(isKeptKey(k),false,k);
});

test('freeKey never names a key already in use',()=>{
 const st=store();assert.equal(freeKey('kept',st.get,7),SAVE_KEY+'-kept');
 st.set(SAVE_KEY+'-kept','x');assert.equal(freeKey('kept',st.get,7),SAVE_KEY+'-kept-2');
 for(let i=2;i<=9;i++)st.set(`${SAVE_KEY}-kept-${i}`,'x');assert.equal(freeKey('kept',st.get,7),SAVE_KEY+'-kept-7','then one named by the time');
 assert.equal(freeKey('damaged',st.get,7),SAVE_KEY+'-damaged');
 assert.match(campLabel(fresh(0)),/Landing Beach · 0 of \d+ stages built/);
});
