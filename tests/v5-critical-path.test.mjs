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
  ok(s,{type:'breach',index});assert.equal(s.board[from],null);assert.deepEqual(s.board[kept],stock);
  assert.equal(s.seals.navigation,true);assert.equal(s.expedition.log.find(x=>x.type==='seal').method,'prepared-route');
  assert.equal(s.board[index].type,'glyph');assert.equal(s.board[index+1].family,id==='ridge'?'rig':'flux');
  if(id==='ridge')assert.equal(s.board[index+2],null);else assert.equal(s.board[index+2].kind,'relic');
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
   if(s.stage===2&&!stressed){s.board=s.board.map(x=>x??item('rig',0));s.energy=0;s.charges={rig:0,chart:0,flux:0};stressed=true;}
   ok(s,choose(s,{route,findStrategy,sideFirst:false,decode:false,openCaches:true}));
   if(n%5===0)Object.assign(s,load(JSON.stringify(s)));
  }
  assert.equal(s.stage,4,route+'/'+findStrategy);assert.ok(stressed);
 }
});
