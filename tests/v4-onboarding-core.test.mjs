import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA,createInitialState,restore,serialize} from '../v4/core/state.mjs';
import {freshOnboarding,nextOnboarding} from '../v4/core/onboarding.mjs';
import {initializePlayableState,merge,mergeablePair,orderReady,completeOrder,tapProducer,producerIndices,skipOnboarding,validateState} from '../v4/core/engine.mjs';
const fresh=()=>initializePlayableState(createInitialState());
test('new V4.6 save has schema 4 and a valid onboarding state',()=>{
 const s=fresh();assert.equal(SCHEMA,4);assert.equal(s.schema,4);assert.deepEqual(s.onboarding,freshOnboarding());assert.deepEqual(validateState(s),[]);
 const [a,b]=mergeablePair(s);assert.ok(a>=0&&b>=0);assert.equal(s.cells[a].content.chain,s.cells[b].content.chain);
});
test('real merge -> real order -> real producer tap progresses the tutorial once',()=>{
 const s=fresh(),original=JSON.stringify(s),[a,b]=mergeablePair(s);
 assert.equal(merge(s,a,a).ok,false);assert.equal(JSON.stringify(s),original);
 const merged=merge(s,a,b);assert.ok(merged.ok);assert.equal(merged.state.onboarding.step,'order');assert.equal(s.onboarding.step,'merge');
 assert.ok(merged.events.some(e=>e.type==='onboarding_step'&&e.step==='order'));
 const ready=merged.state.activeOrders.find(o=>orderReady(merged.state,o));assert.ok(ready,'one initial order must be ready');
 const delivered=completeOrder(merged.state,ready.id);assert.ok(delivered.ok);assert.equal(delivered.state.onboarding.step,'producer');
 assert.ok(delivered.events.some(e=>e.type==='onboarding_step'&&e.step==='producer'));
 const index=producerIndices(delivered.state)[0];
 const tapped=tapProducer(delivered.state,index);assert.ok(tapped.ok);assert.equal(tapped.state.onboarding.step,'done');
 assert.equal(tapped.state.onboarding.skipped,false);assert.equal(tapped.events.filter(e=>e.type==='onboarding_step').length,1);
 assert.equal(restore(serialize(tapped.state)).onboarding.step,'done');
});
test('out-of-sequence actions cannot skip the order step',()=>{
 const s=fresh(),tree=producerIndices(s)[0],merged=merge(s,...mergeablePair(s));
 const premature=tapProducer(merged.state,tree);assert.ok(premature.ok);assert.equal(premature.state.onboarding.step,'order');
 assert.equal(nextOnboarding(merged.state.onboarding,[{type:'produced'}]),merged.state.onboarding);
});
test('skipping is pure, saved and grants no inventory or currency',()=>{
 const s=fresh(),before=structuredClone(s),r=skipOnboarding(s);
 assert.ok(r.ok);assert.deepEqual(r.state.onboarding,{step:'done',skipped:true});
 assert.deepEqual(s,before);assert.deepEqual({...r.state,onboarding:before.onboarding},before);
 assert.equal(skipOnboarding(r.state).ok,false);assert.deepEqual(restore(serialize(r.state)).onboarding,{step:'done',skipped:true});
});
test('schema 3 and 2 saves migrate without inventory or order loss',()=>{
 const s=fresh();s.cells[18].content={type:'item',chain:'leaf',tier:4};s.energy=17;s.coins=137;s.ordersCompleted=9;
 s.activeOrders[0].id='saved-user-order';s.storage[0]={type:'item',chain:'wood',tier:3};
 const old=structuredClone(s);old.schema=3;delete old.onboarding;
 const m=restore(JSON.stringify(old));assert.equal(m.schema,4);assert.deepEqual(m.onboarding,{step:'done',skipped:false});
 assert.deepEqual({...m,schema:3,onboarding:undefined},{...old,onboarding:undefined});
 const two=structuredClone(old);two.schema=2;two.activeOrders.forEach(o=>{delete o.kind;delete o.npc;delete o.narrative;delete o.bonusUntil;delete o.bonusCoins;});
 const m2=restore(JSON.stringify(two));assert.equal(m2.schema,4);assert.equal(m2.onboarding.step,'done');assert.equal(m2.activeOrders[0].id,'saved-user-order');assert.equal(m2.storage[0].tier,3);
 assert.equal(restore('{garbled'),null);
});
test('both CrazyGames and web entries include the same onboard controls without a menu screen',()=>{
 for(const page of ['index.html','crazygames.html']){
  const html=fs.readFileSync(new URL('../v4/'+page,import.meta.url),'utf8');
  assert.match(html,/id="onboardingGuide"/);assert.match(html,/id="onboardingSkip"/);assert.match(html,/onboarding.css/);
  assert.doesNotMatch(html,/Start Game|Play Now|main menu/i);
 }
 const css=fs.readFileSync(new URL('../v4/onboarding.css',import.meta.url),'utf8');
 assert.match(css,/rushBar/);assert.match(css,/dockBook/);assert.match(css,/dockBag/);
});
