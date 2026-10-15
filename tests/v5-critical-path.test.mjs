import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,item,load} from '../v5/core.mjs';
import {sight,VIEWS} from '../v5/navigation.mjs';
import {baffles,circuit} from '../v5/seals.mjs';
import {useAction} from '../v5/interactions.mjs';
import {deliveryItems} from '../v5/presentation.mjs';
import {choose} from './v5-policy.mjs';
import {layouts,arrange} from './v5-optics-policy.mjs';
import {prepareSight} from './v5-navigation-policy.mjs';
const ok=(s,a)=>{const r=act(s,a);assert.ok(r.ok,JSON.stringify(a)+r.message);return r;};
const reject=(s,a)=>{const before=JSON.stringify(s);assert.equal(act(s,a).ok,false);assert.equal(JSON.stringify(s),before);};
function survey(){const s=fresh(0);while(s.stage<1)ok(s,choose(s,{sideFirst:false,decode:false}));return s;}
test('navigation requires a real clear sightline; stock and containers obstruct without being consumed',()=>{
 for(const id of Object.keys(VIEWS)){
  const s=survey(),index=id==='ridge'?24:27,kept=structuredClone(s.board);
  reject(s,{type:'breach',index});assert.deepEqual(deliveryItems(s,{type:'breach',index}),[]);
  prepareSight(s,id);const path=sight(s,id).path,from=s.board.findIndex(x=>x?.type==='item'&&x.family===(id==='ridge'?'rig':'chart')&&x.tier===2);
  assert.ok(useAction(s,from,index));
  const box=s.board.findIndex(x=>x?.type==='crate');ok(s,{type:'move',from:box,to:path[1]});
  assert.equal(sight(s,id).ready,false);assert.equal(useAction(s,from,index),null);reject(s,{type:'breach',index});
  ok(s,{type:'move',from:path[1],to:box});ok(s,{type:'breach',index});
  assert.equal(s.seals.navigation,true);assert.deepEqual(s.expedition.log.find(x=>x.type==='seal').path,path);
  assert.ok(kept.filter(x=>x?.type==='item').length>0);
 }
});
test('route and lift repair change legal optical layouts, not merely flags or rewards',()=>{
 const signatures=[];
 for(const route of ['ridge','conduit'])for(const method of ['recover','restore']){
  const s=survey();prepareSight(s,route);ok(s,{type:'breach',index:route==='ridge'?24:27});
  const i=s.board.indexOf(null);s.board[i]=item(method==='recover'?'rig':'flux',2);
  if(method==='recover'){ok(s,{type:'clear',index:19,from:i});ok(s,{type:'deploy',index:20,from:19});}
  else ok(s,{type:'restore',index:19,from:i});
  for(const [kind,family,index]of [['scope','chart',23],['relay','flux',31]]){const j=s.board.indexOf(null);s.board[j]=item(family,3);ok(s,{type:'deploy',index,from:j});}
  const plans=layouts(s);assert.ok(plans.length>=2,route+'/'+method+' has alternatives');
  if(!s.board.some(x=>x?.family==='chart'&&x.tier===2))s.board[s.board.indexOf(null)]=item('chart',2);
  assert.deepEqual(new Set(plans.map(p=>p.receiver)),new Set(['scope','relay']));
  for(const plan of plans){const copy=structuredClone(s),j=copy.board.indexOf(null);copy.board[j]=item('flux',1);ok(copy,{type:'prime',from:j});
   for(let n=0;n<80&&!circuit(copy);n++)ok(copy,arrange(copy,plan));assert.deepEqual(circuit(copy),plan.path);
  }
  signatures.push(JSON.stringify({rails:baffles(s),paths:plans.map(p=>p.path)}));
  assert.deepEqual(load(JSON.stringify(s)),s);
 }
 assert.equal(new Set(signatures).size,4);
});
test('scope restoration cannot refund the spent repair coil',()=>{
 const s=survey();prepareSight(s,'conduit');ok(s,{type:'breach',index:27});
 const before=s.board.filter(x=>x?.family==='flux'&&x.tier===2).length;
 ok(s,{type:'restore',index:32});assert.equal(s.board.filter(x=>x?.family==='flux'&&x.tier===2).length,before-1);
 assert.ok(s.board.some(x=>x?.family==='flux'&&x.tier===1),'finder yields a useful battery instead of a free next repair');
});
test('a lens is live equipment: merging it breaks a solved circuit without burning the battery',()=>{
 const s=fresh(0);while(!circuit(s))ok(s,choose(s,{route:'conduit',findStrategy:'mixed',sideFirst:false,decode:false}));
 const path=circuit(s),lens=path.find(i=>s.board[i]?.family==='chart'&&s.board[i].tier===2),stock=structuredClone(s.board[lens]);
 assert.ok(Number.isInteger(lens));const spare=s.board.indexOf(null);s.board[spare]=item('chart',2);
 ok(s,{type:'merge',from:lens,to:spare});assert.equal(circuit(s),null);assert.ok(s.seals.optics.primed);reject(s,{type:'power'});
 // Replacing the lens restores the physical circuit; no extra battery payment.
 s.board[lens]=stock;assert.ok(circuit(s));const before=structuredClone(s.board[lens]);ok(s,{type:'power'});assert.deepEqual(s.board[lens],before,'lens remains a collectible, not a consumed delivery');
});
test('both routes and all repair styles complete with depleted stock, full boards and save reloads',()=>{
 for(const route of ['ridge','conduit'])for(const findStrategy of ['recover','restore','mixed']){
  const s=fresh(0);let stressed=false;
  for(let n=0;n<220&&s.stage<4;n++){
   if(s.stage===2&&!stressed){s.board=s.board.map(x=>x??item('rig',0));s.energy=0;s.charges={rig:0,chart:0,flux:0};stressed=true;}
   ok(s,choose(s,{route,findStrategy,sideFirst:false,decode:false,openCaches:true}));
   if(n%5===0)Object.assign(s,load(JSON.stringify(s)));
  }
  assert.equal(s.stage,4,route+'/'+findStrategy);assert.ok(stressed);
 }
});
