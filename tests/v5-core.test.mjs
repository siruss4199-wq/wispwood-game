import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {fresh,act,load,SAVE_KEY,goal,ready,item,FAMILIES,SOURCES,nextOutput,normalContract} from '../v5/core.mjs';
import {art,scene} from '../v5/art.mjs';import {choose} from './v5-policy.mjs';
function success(s,a,t=1000){const r=act(s,a,t);assert.equal(r.ok,true,r.message);return r;}
function failUnchanged(s,a,t=1000){const before=JSON.stringify(s);assert.equal(act(s,a,t).ok,false);assert.equal(JSON.stringify(s),before);}
test('first action teaches a merge; starter has a real contract versus expedition decision',()=>{
 const s=fresh(0);assert.equal(s.board.length,36);assert.equal(new Set(s.board.filter(x=>x?.family).map(x=>x.family)).size,3);
 assert.ok(ready(s,normalContract(s).needs));success(s,{type:'contract'});assert.equal(ready(s,goal(s).needs),false);
 success(s,{type:'merge',from:7,to:8});success(s,{type:'merge',from:2,to:18});assert.ok(ready(s,goal(s).needs));success(s,{type:'goal'});assert.equal(s.stage,1);success(s,{type:'produce',id:'chart'});
});
test('merge, movement, max tiers, protected sources and invalid indices',()=>{
 const s=fresh();failUnchanged(s,{type:'merge',from:7,to:7});failUnchanged(s,{type:'merge',from:0,to:1});failUnchanged(s,{type:'merge',from:7,to:9});failUnchanged(s,{type:'merge',from:-1,to:9});
 success(s,{type:'merge',from:7,to:1});assert.equal(s.board[7],null);assert.equal(s.board[1].tier,0);
 s.board[1]=item('rig',7);s.board[2]=item('rig',7);failUnchanged(s,{type:'merge',from:1,to:2});
});
test('source charges, energy and full-board failures are atomic; deterministic rare survives reload',()=>{
 const s=fresh();failUnchanged(s,{type:'produce',id:'flux'});s.energy=0;failUnchanged(s,{type:'produce',id:'rig'});s.energy=40;s.charges.rig=0;failUnchanged(s,{type:'produce',id:'rig'});success(s,{type:'service',id:'rig',useTool:true});assert.equal(s.charges.rig,7);assert.equal(s.board[13],null);
 s.taps.rig=8;assert.equal(nextOutput(load(JSON.stringify(s)),'rig').type,'glyph');success(s,{type:'produce',id:'rig'});assert.equal(s.discovery,true);
 s.board=s.board.map(x=>x??item('rig',0));failUnchanged(s,{type:'produce',id:'rig'});
});
test('branch consumes spanner rather than upgrading; brace clears blocker into finite cache',()=>{
 const s=fresh();s.board[7]=item('rig',2);success(s,{type:'branch',index:7});assert.equal(s.board[7].type,'brace');success(s,{type:'clear',index:31});assert.equal(s.board[7],null);assert.equal(s.board[31].left,3);
 for(let i=0;i<3;i++)success(s,{type:'crate',index:31});assert.equal(s.board[31].type,'item');failUnchanged(s,{type:'crate',index:31});
});
test('contracts consume exact tiers; no double delivery or partial consumption',()=>{
 const s=fresh();success(s,{type:'contract'});failUnchanged(s,{type:'contract'});s.board[7]=item('chart',3);failUnchanged(s,{type:'contract'});s.board[7]=item('chart',2);success(s,{type:'contract'});assert.equal(s.contracts,2);
});
test('opportunity is opt-in, persists deadline, expires without consuming inventory',()=>{
 const s=fresh(100);failUnchanged(s,{type:'startOpportunity'});s.stage=1;success(s,{type:'startOpportunity'},100);const reloaded=load(JSON.stringify(s),99999);assert.equal(reloaded.opportunity.ends,180100);
 reloaded.board[7]=item('chart',3);const board=JSON.stringify(reloaded.board);success(reloaded,{type:'opportunity'},180101);assert.equal(JSON.stringify(reloaded.board),board);assert.equal(reloaded.opportunity,null);
 success(s,{type:'opportunity'},180101);success(s,{type:'startOpportunity'},180102);s.board[7]=item('chart',3);success(s,{type:'opportunity'},180103);assert.equal(s.marks,8);
});
test('discovery competes for sight lens and permanently enriches sources',()=>{
 const s=fresh();s.board[7]={type:'glyph'};s.board[8]=item('chart',2);success(s,{type:'discovery'});assert.equal(s.boost,true);assert.equal(s.board[7],null);assert.equal(s.board[8],null);s.taps.rig=2;assert.equal(nextOutput(s,'rig').tier,2);failUnchanged(s,{type:'discovery'});
});
test('ration and recycling offer an immediate recovery without ads, cash or waiting',()=>{
 const s=fresh();failUnchanged(s,{type:'ration'});s.energy=0;success(s,{type:'ration'});assert.equal(s.energy,12);s.board[7]=item('flux',3);success(s,{type:'recycle',index:7});assert.equal(s.energy,20);failUnchanged(s,{type:'recycle',index:0});
});
test('corrupt or old saves never break boot and V4 key is untouched',()=>{
 for(const bad of ['',null,'{}','{','{"version":4}',JSON.stringify({...fresh(),energy:-4}),JSON.stringify({...fresh(),board:Array(36).fill({type:'item',family:'bad',tier:2})})])assert.equal(load(bad,100).version,5);
 const s=fresh();success(s,{type:'merge',from:7,to:8});assert.deepEqual(load(JSON.stringify(s)),s);assert.notEqual(SAVE_KEY,'wispwood-v4');
});
test('24 original item silhouettes, distinct producers and five actual world transformations',()=>{
 const sprites=[];for(const f of Object.keys(FAMILIES))for(let t=0;t<8;t++)sprites.push(art(item(f,t)));
 assert.equal(new Set(sprites).size,24);for(const svg of sprites){assert.match(svg,/<svg/);assert.doesNotMatch(svg,/<text|<image|http/);}
 assert.equal(new Set(Object.keys(SOURCES).map(id=>art({type:'source',id}))).size,3);assert.equal(new Set([0,1,2,3,4].map(x=>scene(x))).size,5);
 const css=fs.readFileSync(new URL('../v5/style.css',import.meta.url),'utf8');assert.match(css,/prefers-reduced-motion/);const html=fs.readFileSync(new URL('../v5/index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/v4\/.*css|rewarded|shop/i);
});
test('fresh-player simulation opens vault and continues through two optional discoveries without deadlock',()=>{
 for(const sideFirst of [true,false]){
  const s=fresh(0),milestones=[];let actions=0;
  while(goal(s)&&actions<1500){const a=choose(s,{sideFirst});const r=success(s,a,actions*4500);if(r.event==='milestone')milestones.push({stage:s.stage,post:s.post,actions:actions+1,minutes:((actions+1)*4.5/60).toFixed(1)});assert.equal(s.board.length,36);assert.ok(s.energy>=0);actions++;}
  assert.equal(s.stage,4);assert.equal(s.post,2);assert.ok(actions<1500);assert.ok(s.rations<20);
  console.log(JSON.stringify({sideFirst,actions,rations:s.rations,milestones}));
 }
});
test('staged board retains starter inventory and leaves reachable space around sources',()=>{
 const s=fresh();assert.equal(s.board.filter(x=>x===null).length,12);
 for(const [f,n] of [['rig',5],['chart',5],['flux',2]])assert.equal(s.board.filter(x=>x?.type==='item'&&x.family===f).length,n);
 assert.equal(s.board[2].family,'rig');assert.equal(s.board[11].family,'chart');assert.equal(s.board[33].family,'chart');
 for(const i of [0,5,30])assert.ok([i-6,i+6,i-1,i+1].some(j=>j>=0&&j<36&&s.board[j]?.type!=='sealed'));
});
test('illustrated objects use distinct materials; art boundary can accept later sprites',async()=>{
 const {MATERIALS,OBJECTS}=await import('../v5/objects.mjs');const {SPRITE_OVERRIDES}=await import('../v5/art.mjs');
 assert.equal(new Set(Object.values(OBJECTS).filter(Array.isArray).flat()).size,24);
 for(const material of ['steel','paper','glass','brass','rubber','coral','violet'])assert.ok(MATERIALS.includes('vw-'+material));
 assert.match(art(item('rig',3)),/data-render="illustrated-object"/);
 SPRITE_OVERRIDES['rig-0']='assets/test-sprite.webp';assert.match(art(item('rig',0)),/<img[^>]+test-sprite.webp/);delete SPRITE_OVERRIDES['rig-0'];
});
