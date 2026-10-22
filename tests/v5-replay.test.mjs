import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,SAVE_KEY} from '../v5/core.mjs';
import {loadSlot,beginReplay,returnOriginal,slotKey,REPLAY_KEY,ACTIVE_KEY} from '../v5/replay.mjs';
const mem=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};};
test('completed main save is untouched after starting a fresh replay and reloading',()=>{
 const db=mem(),s=fresh(1);s.stage=4;s.requests.supplies=54;s.camp.fleetViewed=true;s.discovered.push('chart:tide:4');
 const old=JSON.stringify(s);db.setItem(SAVE_KEY,old);
 const replay=beginReplay(db,2);
 assert.equal(replay.stage,0);assert.equal(replay.merges,0);
 assert.equal(db.getItem(SAVE_KEY),old);
 assert.equal(loadSlot(db,3).active,true);assert.equal(loadSlot(db,3).state.stage,0);
 assert.equal(slotKey(true),REPLAY_KEY);
 assert.ok(act(replay,{type:'merge',from:7,to:8}).ok);
 db.setItem(REPLAY_KEY,JSON.stringify(replay));
 assert.equal(loadSlot(db,4).state.merges,1);
 const original=returnOriginal(db,5);
 assert.equal(original.stage,4);assert.equal(original.requests.supplies,54);
 assert.equal(db.getItem(SAVE_KEY),old);assert.equal(db.getItem(ACTIVE_KEY),null);
 assert.equal(loadSlot(db,6).active,false);assert.equal(db.getItem(REPLAY_KEY),JSON.stringify(replay));
});
test('failed replay storage write cannot switch original slot',()=>{
 const db=mem(),old=JSON.stringify(fresh(1));db.setItem(SAVE_KEY,old);
 const broken={...db,setItem:(k,v)=>{if(k===REPLAY_KEY)throw Error('Quota');db.setItem(k,v);}};
 assert.throws(()=>beginReplay(broken),/Quota/);
 assert.equal(db.getItem(ACTIVE_KEY),null);assert.equal(db.getItem(SAVE_KEY),old);
});
