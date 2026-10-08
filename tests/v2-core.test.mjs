import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,restore,serialize} from '../v2/core/state.mjs';
import {boardStatus,deliver,merge,mergeablePair,move,openEmptyIndices,producerIndices,tapProducer,validateState} from '../v2/core/engine.mjs';

test('V2 starts visually full with exactly two matching Seeds',()=>{
 const s=createInitialState(),st=boardStatus(s);
 assert.equal(s.cells.length,64);
 assert.equal(st.open,2);
 assert.equal(st.crates,62);
 assert.deepEqual(mergeablePair(s),[26,34]);
 assert.equal(st.empty,0);
 assert.equal(st.producers,0);
 assert.deepEqual(validateState(s),[]);
});

test('first merge reveals producer and preserves two production spaces',()=>{
 const r=merge(createInitialState(),26,34);
 assert.equal(r.ok,true);
 assert.equal(r.state.cells[34].content.tier,1);
 assert.equal(r.state.cells[33].content.type,'producer');
 assert.equal(r.state.cells[35].content,null);
 assert.equal(openEmptyIndices(r.state).length,2);
 assert.equal(r.state.phase,'core');
});

test('Tree taps twice create two Seeds and cost two Energy',()=>{
 let s=merge(createInitialState(),26,34).state;
 s=tapProducer(s,33).state;
 s=tapProducer(s,33).state;
 assert.equal(s.energy,18);
 const seeds=s.cells.filter(c=>c.content?.type==='item'&&c.content.tier===0);
 assert.equal(seeds.length,2);
 assert.equal(openEmptyIndices(s).length,0);
});

test('scripted onboarding reaches Herb without deadlock',()=>{
 let s=merge(createInitialState(),26,34).state;
 s=tapProducer(s,33).state;
 s=tapProducer(s,33).state;
 const seedPair=mergeablePair(s);
 assert.ok(seedPair);
 s=merge(s,seedPair[0],seedPair[1]).state;
 assert.ok(openEmptyIndices(s).length>=2);
 const sproutPair=mergeablePair(s);
 assert.ok(sproutPair);
 s=merge(s,sproutPair[0],sproutPair[1]).state;
 const herb=s.cells.findIndex(c=>c.content?.type==='item'&&c.content.tier===2);
 assert.ok(herb>=0);
 const done=deliver(s,herb);
 assert.equal(done.ok,true);
 assert.equal(done.state.quest.completed,true);
});

test('move is separate from merge',()=>{
 let s=merge(createInitialState(),26,34).state;
 const r=move(s,34,35);
 assert.equal(r.ok,true);
 assert.equal(r.state.cells[35].content.tier,1);
 assert.equal(r.state.cells[34].content,null);
});

test('save shape round trips cleanly',()=>{
 const s=createInitialState();
 const copy=restore(serialize(s));
 assert.deepEqual(copy,s);
 assert.equal(restore('bad'),null);
});

test('core loop invariant: when no pair exists after onboarding, producer plus two spaces are available',()=>{
 let s=merge(createInitialState(),26,34).state;
 assert.equal(mergeablePair(s),null);
 assert.equal(producerIndices(s).length,1);
 assert.ok(openEmptyIndices(s).length>=2);
});
