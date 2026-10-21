import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,item} from '../v5/core.mjs';
import {deliveryItems,siteSurface,continuation,SITE_NAMES} from '../v5/presentation.mjs';
test('delivery snapshots identify exact consumed cells without mutating saved gameplay',()=>{
 const s=fresh(),before=JSON.stringify(s),a={type:'contract'},items=deliveryItems(s,a);
 assert.deepEqual(items,[{index:13,x:item('rig',1)}]);assert.equal(JSON.stringify(s),before);
 assert.ok(act(s,a).ok);assert.equal(s.board[13],null);assert.deepEqual(items[0].x,item('rig',1));
 assert.deepEqual(deliveryItems(s,{type:'goal'}),[]);
});
test('discovery and expiring signals only collect when their actual reducer command can deliver',()=>{
 const s=fresh();s.board[7]={type:'glyph'};s.board[8]=item('chart',2);
 assert.deepEqual(deliveryItems(s,{type:'discovery'}).map(x=>x.index),[8,7]);s.discoveryDone=true;assert.deepEqual(deliveryItems(s,{type:'discovery'}),[]);
 s.stage=1;act(s,{type:'startOpportunity'},100);s.board[9]=item('chart',3);
 assert.equal(deliveryItems(s,{type:'opportunity'},180100).length,1);assert.deepEqual(deliveryItems(s,{type:'opportunity'},180101),[]);
});
test('counted expedition ingredients collect separately and continuation follows actual progress',()=>{
 const s=fresh();s.board[7]=item('rig',1);assert.equal(deliveryItems(s,{type:'goal'}).length,1,'the simplified landing consumes one Grip Tool');
 assert.ok(act(s,{type:'goal'}).ok);assert.match(continuation(s,{type:'goal'}),/Survey Kite/);
 s.stage=2;assert.match(continuation(s,{type:'goal'}),/Echo Crucible/);s.stage=3;assert.match(continuation(s,{type:'goal'}),/vault instruments/);
 assert.match(continuation(s,{type:'discovery'}),/third pull/);s.surge=2;assert.match(continuation(s,{type:'contract'}),/2 refined pulls/);
});
test('worksite surfaces change with chapter stages without adding interactive cells or external assets',()=>{
 assert.equal(new Set([0,1,2,3].map(siteSurface)).size,4);assert.equal(SITE_NAMES.length,5);
 for(let stage=0;stage<5;stage++){const svg=siteSurface(stage);assert.match(svg,/aria-hidden="true"/);assert.doesNotMatch(svg,/<button|<image|http|data-index/);}
});
