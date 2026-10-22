import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,item,load} from '../v5/core.mjs';
import {routePrepared} from '../v5/navigation.mjs';
import {circuit} from '../v5/seals.mjs';
import {useAction} from '../v5/interactions.mjs';
import {deliveryItems} from '../v5/presentation.mjs';
import {choose} from './v5-policy.mjs';
import {prepareRoute} from './v5-navigation-policy.mjs';
const ok=(s,a)=>{const r=act(s,a);assert.ok(r.ok,JSON.stringify(a)+r.message);return r;};
const reject=(s,a)=>{const before=JSON.stringify(s);assert.equal(act(s,a).ok,false);assert.equal(JSON.stringify(s),before);};
function survey(){const s=fresh(0);while(s.stage<1)ok(s,choose(s,{sideFirst:false,decode:false}));return s;}
test('prepared route choice spends one tool anywhere on a cluttered board, keeps the other and opens its reward',()=>{
 for(const id of ['ridge','conduit']){
  const s=survey(),index=id==='ridge'?24:27,family=id==='ridge'?'rig':'chart';
  const from=s.board.findIndex(x=>x?.family===family&&x.tier===2),kept=s.board.findIndex(x=>x?.family===(family==='rig'?'chart':'rig')&&x.tier===2),stock=structuredClone(s.board[kept]);
  assert.ok(routePrepared(s,id));assert.ok(useAction(s,from,index));
  assert.deepEqual(deliveryItems(s,{type:'breach',index}).map(x=>x.index),[from]);
  const tools=s.board.filter(x=>x?.type==='item'&&x.family===family&&x.tier===2).length;
  ok(s,{type:'breach',index});assert.equal(s.board.filter(x=>x?.type==='item'&&x.family===family&&x.tier===2).length,tools-1);assert.deepEqual(s.board[kept],stock);
  // On the covered board the spent tool's cell may be the first free space, where a find lands.
  assert.ok(s.board[from]===null||s.board[from].type==='crate'&&s.board[from].kind==='relic',JSON.stringify(s.board[from]));
  assert.equal(s.seals.navigation,true);assert.equal(s.expedition.log.find(x=>x.type==='seal').method,'prepared-route');
  assert.equal(s.board[index].type,'glyph');
  // The breach frees the salt-crusted parts beside it in place; its finds land in free space.
  for(const i of [index+1,index+2])assert.notEqual(s.board[i]?.type,'crust');
  assert.ok(s.board.some(x=>x?.type==='item'&&(id==='ridge'?x.family==='rig'&&x.tier===1:x.family==='flux'&&x.tier===2)));
  if(id==='conduit')assert.ok(s.board.some(x=>x?.type==='crate'&&x.kind==='relic'));
  reject(s,{type:'breach',index:id==='ridge'?27:24});assert.deepEqual(load(JSON.stringify(s)),s);
 }
});
test('scope restoration cannot refund the spent repair coil',()=>{
 const s=survey();prepareRoute(s,'conduit');ok(s,{type:'breach',index:27});
 const before=s.board.filter(x=>x?.family==='flux'&&x.tier===2).length;
 ok(s,{type:'restore',index:32});assert.equal(s.board.filter(x=>x?.family==='flux'&&x.tier===2).length,before-1);
 // Before the Vault rewards are raw parts: the finder yields Violet shards to merge, not a ready battery or coil.
 assert.ok(s.board.filter(x=>x?.family==='flux'&&x.tier===0).length>=2,'finder yields raw shards instead of a free next repair');assert.equal(s.surge,3);
});
test('both routes and all repair styles complete with depleted stock, full boards and save reloads',()=>{
 for(const route of ['ridge','conduit'])for(const findStrategy of ['recover','restore','mixed']){
  const s=fresh(0);let stressed=false;
  for(let n=0;n<220&&s.stage<4;n++){
   if(s.stage===2&&!stressed){s.board=s.board.map(x=>x??item('rig',0));s.energy=0;stressed=true;}
   ok(s,choose(s,{route,findStrategy,sideFirst:false,decode:false,openCaches:true}));
   if(n%5===0)Object.assign(s,load(JSON.stringify(s)));
  }
  assert.equal(s.stage,4,route+'/'+findStrategy);assert.ok(stressed);
 }
});
