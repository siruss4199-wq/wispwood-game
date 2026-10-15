import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,load,item} from '../v5/core.mjs';
import {beam,circuit,optics,linkPhase} from '../v5/seals.mjs';
import {choose} from './v5-policy.mjs';
import {layouts,arrange} from './v5-optics-policy.mjs';
const ok=(s,a)=>{assert.ok(a);const r=act(s,a,s.moves*1000);assert.ok(r.ok,JSON.stringify(a)+': '+r.message);};
const reject=(s,a)=>{const before=JSON.stringify(s);assert.equal(act(s,a).ok,false);assert.equal(JSON.stringify(s),before);};
function approach(route='conduit'){
 const s=fresh(0);while(!linkPhase(s)||!s.board.some(x=>x?.type==='site'&&x.kind==='scope'&&x.phase==='done'))ok(s,choose(s,{route,findStrategy:'mixed',sideFirst:false,decode:false}));return s;
}
test('old 17-action witness cannot power the vault; unlimited Loop Cells do not bypass geometry',()=>{
 const old=fresh(0),actions=[['merge',2,7],['goal'],['merge',1,9],['merge',9,14],['merge',2,8],['merge',1,8],['goal']];
 for(const [type,a,b]of actions)ok(old,type==='merge'?{type,from:a,to:b}:{type,index:a});
 reject(old,{type:'breach',index:27});
 const s=approach();
 s.board[21]=item('flux',1);s.board[22]=item('flux',1);reject(s,{type:'power'});
 for(let i=0;i<36;i++)if(!s.board[i]||s.board[i].type==='item')s.board[i]=item('flux',1);
 ok(s,{type:'prime'});assert.equal(circuit(s),null);reject(s,{type:'power'});assert.equal(s.stage,2);
});
test('stone rib stops the obvious middle crossing; inventory casts a visible shadow',()=>{
 const s=approach();s.seals.optics.primed=true;
 const mirrors=s.board.filter(x=>x?.type==='prism');s.board=s.board.map(x=>x?.type==='prism'?null:x);
 for(const i of [14,15,16,17])s.board[i]=null;
 s.board[14]={...mirrors[0],turn:0};s.board[17]={...mirrors[1],turn:1};
 assert.equal(beam(s).stop,'stone');reject(s,{type:'power'});
 s.board[14]=item('rig',3);assert.equal(beam(s).stop,'blocked');assert.equal(beam(s).blocked,14);
});
test('both routes have alternate geometric solutions and real socket directions',()=>{
 for(const route of ['ridge','conduit']){
  const s=approach(route);const i=s.board.indexOf(null);s.board[i]=item('flux',1);ok(s,{type:'prime',from:i});
  // A second receiver is an existing equipment decision, not a puzzle flag.
  const j=s.board.indexOf(null);s.board[j]=item('flux',3);ok(s,{type:'deploy',index:31,from:j});
  const options=layouts(s);assert.ok(new Set(options.map(x=>x.path.join(','))).size>=2);
  assert.deepEqual(new Set(options.map(x=>x.receiver)),new Set(['scope','relay']));
  for(const plan of options){const copy=structuredClone(s);for(let n=0;n<80&&!circuit(copy);n++)ok(copy,arrange(copy,plan));assert.deepEqual(circuit(copy),plan.path);assert.equal(new Set(beam(copy).prisms).size,2);}
  // A side-entry hit is a backplate, never a successful receiver.
  const copy=structuredClone(s);copy.board=copy.board.map(x=>x?.type==='item'||x?.type==='prism'?null:x);copy.seals.optics.direction=2;copy.board[26]=null;copy.board[32]={type:'prism',id:0,turn:0};
  assert.equal(beam(copy).stop,'backplate');reject(copy,{type:'power'});
 }
});
test('reflector swap is reversible on a completely full board; cannot recycle or merge equipment',()=>{
 const s=approach();s.board=s.board.map(x=>x??item('rig',0));const from=s.board.findIndex(x=>x?.type==='prism'),to=s.board.findIndex(x=>x?.type==='item'),before=structuredClone(s.board);
 ok(s,{type:'move',from,to});ok(s,{type:'move',from:to,to:from});assert.deepEqual(s.board,before);
 reject(s,{type:'recycle',index:from});reject(s,{type:'turn',index:0});
 const other=s.board.findIndex((x,i)=>x?.type==='prism'&&i!==from);ok(s,{type:'merge',from,to:other});assert.equal(s.board.filter(x=>x?.type==='prism').length,2);
});
test('legacy unresolved boards are not overwritten, even full or already using the old straight line',()=>{
 const s=approach();delete s.seals.optics;s.board=s.board.map(x=>x?.type==='prism'||!x?item('rig',0):x);s.board[21]=item('flux',1);s.board[22]=item('flux',1);
 const saved=load(JSON.stringify(s));assert.deepEqual(saved.board,s.board);reject(saved,{type:'power'});
 for(let n=0;n<150&&saved.stage<4;n++)ok(saved,choose(saved,{sideFirst:false,decode:false}));assert.equal(saved.stage,4);
});
test('priming spends exactly the held cell once; turning and moving have no energy cost',()=>{
 const s=approach(),from=s.board.indexOf(null);s.board[from]=item('flux',1);const energy=s.energy;
 ok(s,{type:'prime',from,index:20});assert.ok(optics(s).primed);assert.notEqual(s.board[from]?.type,'item');reject(s,{type:'prime',from,index:20});
 ok(s,{type:'turn',index:20});assert.equal(optics(s).direction,2);assert.equal(s.energy,energy);
});
