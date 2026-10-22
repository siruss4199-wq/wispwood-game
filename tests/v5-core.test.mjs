import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {fresh,act,load,SAVE_KEY,goal,expeditionGoal,ready,item,FAMILIES,SOURCES,nextOutput,normalContract,near} from '../v5/core.mjs';
import {container,contents,CONTAINERS} from '../v5/containers.mjs';
import {art,scene} from '../v5/art.mjs';import {choose} from './v5-policy.mjs';
function success(s,a,t=1000){const r=act(s,a,t);assert.equal(r.ok,true,r.message);return r;}
function failUnchanged(s,a,t=1000){const before=JSON.stringify(s);assert.equal(act(s,a,t).ok,false);assert.equal(JSON.stringify(s),before);}
test('first action teaches a merge; starter has a real contract versus expedition decision',()=>{
 const s=fresh(0);assert.equal(s.board.length,36);assert.equal(new Set(s.board.filter(x=>x?.family).map(x=>x.family)).size,3);
 assert.ok(ready(s,normalContract(s).needs));success(s,{type:'contract'});assert.equal(ready(s,goal(s).needs),false);
 success(s,{type:'merge',from:7,to:8});success(s,{type:'merge',from:2,to:18});assert.ok(ready(s,goal(s).needs));success(s,{type:'goal'});assert.equal(s.stage,0);assert.equal(s.landingStep,1);success(s,{type:'produce',id:'chart'});
});
test('landing survey makes a two-family decision before any route can open',()=>{
 const s=fresh(0);assert.equal(s.landingStep,0);
 const chart=()=>s.board.findIndex(x=>x?.type==='source'&&x.id==='chart');
 assert.ok(chart()>=0);
 failUnchanged(s,{type:'produce',id:'chart'});
 success(s,{type:'merge',from:7,to:8});
 success(s,{type:'goal'});
 assert.equal(s.stage,0);assert.equal(s.landingStep,1);
 assert.equal(goal(s).name,'Chart the safe crossing');
 const saved=load(JSON.stringify(s));assert.equal(saved.landingStep,1);
 success(saved,{type:'produce',id:'chart'});
 failUnchanged(saved,{type:'breach',index:24});
 saved.board[7]=item('chart',2);saved.board[8]=item('rig',2);
 failUnchanged(saved,{type:'goal'});saved.workshop.repaired=true;
 success(saved,{type:'goal'});
 assert.equal(saved.stage,1);assert.equal(saved.landingStep,2);
 assert.equal(goal(saved).name,'Choose your crossing');
 assert.equal(load(JSON.stringify(saved)).landingStep,2);
});
test('merge, movement, max tiers, protected sources and invalid indices',()=>{
 const s=fresh();failUnchanged(s,{type:'merge',from:7,to:7});failUnchanged(s,{type:'merge',from:0,to:1});failUnchanged(s,{type:'merge',from:7,to:9});failUnchanged(s,{type:'merge',from:-1,to:9});
 success(s,{type:'merge',from:7,to:1});assert.equal(s.board[7],null);assert.equal(s.board[1].tier,0);
 s.board[1]=item('rig',7);s.board[2]=item('rig',7);failUnchanged(s,{type:'merge',from:1,to:2});
});
test('retired charges never block a pull; energy and full-board failures are atomic; deterministic rare survives reload',()=>{
 const s=fresh();failUnchanged(s,{type:'produce',id:'flux'});s.energy=0;failUnchanged(s,{type:'produce',id:'rig'});s.energy=40;s.charges.rig=0;failUnchanged(s,{type:'service',id:'rig',useTool:true});assert.deepEqual(s.board[13],item('rig',1));success(s,{type:'produce',id:'rig'});assert.equal(s.energy,39);assert.equal(s.charges.rig,0);
 s.taps.rig=8;assert.equal(nextOutput(load(JSON.stringify(s)),'rig').type,'glyph');success(s,{type:'produce',id:'rig'});assert.equal(s.discovery,true);
 s.board=s.board.map(x=>x??item('rig',0));failUnchanged(s,{type:'produce',id:'rig'});
});
test('brace clears saltstone straight into a finite mixed-gear reveal',()=>{
 const s=fresh();s.board[7]=item('rig',2);success(s,{type:'branch',index:7});const r=success(s,{type:'clear',index:32});assert.equal(r.reveal.length,3);assert.equal(r.containerKind,'locker');assert.equal(s.board[32].type,'item');failUnchanged(s,{type:'clear',index:32});
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
test('ration (once an hour, small) and recycling offer recovery without ads or cash',()=>{
 const s=fresh();failUnchanged(s,{type:'ration'});s.energy=0;success(s,{type:'ration'},1000);assert.equal(s.energy,8);assert.equal(s.rationAt,1000);s.board[7]=item('flux',3);success(s,{type:'recycle',index:7});assert.equal(s.energy,16);failUnchanged(s,{type:'recycle',index:0});
 s.energy=2;const r=act(s,{type:'ration'},1000+59*60000);assert.equal(r.ok,false);assert.match(r.message,/Next field ration in 1 min/);assert.equal(s.energy,2);
 success(s,{type:'ration'},1000+60*60000);assert.equal(s.energy,10);assert.deepEqual(load(JSON.stringify(s),1000+61*60000).rationAt,1000+60*60000);
});
test('corrupt or old saves never break boot and V4 key is untouched',()=>{
 for(const bad of ['',null,'{}','{','{"version":4}',JSON.stringify({...fresh(),energy:-4}),JSON.stringify({...fresh(),board:Array(36).fill({type:'item',family:'bad',tier:2})})])assert.equal(load(bad,100).version,5);
 const s=fresh();success(s,{type:'merge',from:7,to:8});assert.deepEqual(load(JSON.stringify(s)),s);const legacy=structuredClone(s);delete legacy.landingStep;assert.equal(load(JSON.stringify(legacy)).landingStep,0);assert.notEqual(SAVE_KEY,'wispwood-v4');
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
  while(expeditionGoal(s)&&actions<1500){const a=choose(s,{sideFirst});const r=success(s,a,actions*4500);if(r.event==='milestone')milestones.push({stage:s.stage,post:s.post,actions:actions+1,minutes:((actions+1)*4.5/60).toFixed(1)});assert.equal(s.board.length,36);assert.ok(s.energy>=0);actions++;}
  assert.equal(s.stage,4);assert.equal(s.post,2);assert.ok(actions<1500);assert.ok(s.rations<20);
  console.log(JSON.stringify({sideFirst,actions,rations:s.rations,milestones}));
 }
});
test('staged board starts 80% occupied with rewarding salvage and leaves reachable space around sources',()=>{
 const s=fresh();assert.equal(s.board.filter(x=>x===null).length,7);
 // Six salt-crusted parts replace the buried excavation strip and two spare corners.
 assert.deepEqual(s.board.flatMap((x,i)=>x?.type==='crust'?[i+':'+x.family+x.tier]:[]),['17:rig0','25:rig0','26:chart0','28:rig1','29:flux0','35:chart1']);
 assert.equal(s.board.some(x=>x?.type==='sealed'),false);
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

test('producer bursts preserve deterministic rare cadence, energy-only cost and the final free space',()=>{
 const s=fresh();for(let i=0;i<36;i++)if(s.board[i]?.type==='item')s.board[i]=null;
 s.taps.rig=8;const occupied=s.board.filter(Boolean).length,energy=s.energy;
 const r=success(s,{type:'produce',id:'rig'});assert.equal(s.board[r.index].type,'glyph');assert.equal(s.board.filter(Boolean).length,occupied+2);assert.equal(s.energy,energy-1);assert.equal(s.charges.rig,7);assert.equal(s.taps.rig,9);
 s.board=s.board.map(x=>x??item('chart',0));s.board[1]=null;s.taps.rig=11;
 success(s,{type:'produce',id:'rig'});assert.equal(s.board.filter(Boolean).length,36);assert.equal(s.board[1].tier,1);
 failUnchanged(s,{type:'produce',id:'rig'});
});
test('deliveries and discoveries return finite supplies without overwriting kept items',()=>{
 const s=fresh();const sources=s.board.filter(x=>x?.type==='source');success(s,{type:'contract'});assert.equal(s.board.filter(x=>x?.type==='crate').length,1,'duplicate cases arrive as useful loose parts');assert.deepEqual(s.board.filter(x=>x?.type==='source'),sources);
 for(let i=0;i<36;i++)if(s.board[i]?.type==='item')s.board[i]=null;
 s.board[7]={type:'glyph'};s.board[8]=item('chart',2);const before=s.board.filter(Boolean).length;success(s,{type:'discovery'});assert.equal(s.board.filter(Boolean).length,before+2);
 const full=fresh();full.board=full.board.map(x=>x??item('flux',7));const kept=full.board[1];success(full,{type:'contract'});assert.deepEqual(full.board[1],kept);assert.ok(full.board.includes(null),'crowded delivery still frees a working space');
});
test('equipment discoveries unpack loose supplies once without producing more boxes',()=>{
 const s=fresh();for(let i=0;i<36;i++)if(s.board[i]?.type==='item')s.board[i]=null;
 s.board[7]=item('rig',1);s.board[8]=item('rig',1);const before=s.board.filter(Boolean).length;success(s,{type:'merge',from:7,to:8});assert.equal(s.board.filter(Boolean).length,before+2);assert.equal(s.board.filter(x=>x?.type==='crate').length,1);
 const saved=load(JSON.stringify(s));saved.board[7]=item('rig',1);saved.board[8]=item('rig',1);saved.merges=3;const n=saved.board.filter(Boolean).length;success(saved,{type:'merge',from:7,to:8});assert.equal(saved.board.filter(Boolean).length,n-1);
});
test('finite caches, refused legacy service and deliberate recycling remain usable',()=>{
 const s=fresh();for(let i=0;i<36;i++)if(s.board[i]?.type==='item')s.board[i]=null;
 const n=s.board.filter(Boolean).length;success(s,{type:'crate',index:34});assert.equal(s.board[34].type,'item');assert.equal(s.board.filter(Boolean).length,n+2);
 s.charges.rig=0;failUnchanged(s,{type:'service',id:'rig'});const index=s.board.findIndex(x=>x?.type==='item'),before=s.board.filter(Boolean).length;success(s,{type:'recycle',index});assert.equal(s.board.filter(Boolean).length,before-1,'recycling does not secretly auto-fill');
});
test('first-session density stays active across goal-first, contract-first, cache and salvage policies',()=>{
 for(const sideFirst of [true,false])for(const openCaches of [true,false])for(const clearSalvage of [true,false]){
  const s=fresh(0),samples=[],checkpoints={fresh:27};let actions=0,lowRun=0,maxLowRun=0;
  while(s.stage<4&&actions<400){
   const cmd=choose(s,{sideFirst,openCaches,clearSalvage});if(s.stage===3&&cmd.type==='goal')checkpoints.preVault=s.board.filter(Boolean).length;
   success(s,cmd,++actions*4500);const occupied=s.board.filter(Boolean).length;samples.push(occupied);assert.ok(s.board.filter(x=>x?.type==='crate').length<=3,'reward containers stay a small purposeful set');
   lowRun=occupied<18?lowRun+1:0;maxLowRun=Math.max(maxLowRun,lowRun);
   if([27,67,134].includes(actions))checkpoints[actions]=occupied;
  }
  assert.equal(s.stage,4,'no blocker deadlock');assert.ok(actions<240);
  const mean=samples.reduce((a,b)=>a+b,0)/samples.length;assert.ok(mean>=20&&mean<=30,`mean ${mean}`);// level chests (step 4a) keep the board fullerassert.ok(Math.min(...samples)>=17);assert.ok(maxLowRun<=2,'no prolonged >18-empty state');
  for(const [point,n]of Object.entries(checkpoints))assert.ok(n>=20,`${point}: only ${n} occupied`);
  console.log(JSON.stringify({density:true,sideFirst,openCaches,clearSalvage,actions,mean:+mean.toFixed(1),min:Math.min(...samples),maxLowRun,checkpoints}));
 }
});

test('reward containers have distinct silhouettes, deterministic identities and one-tap reveals',()=>{
 assert.equal(new Set(Object.keys(CONTAINERS).map(k=>art(container(k)))).size,4);
 for(const kind of Object.keys(CONTAINERS)){
  const s=fresh();s.board[34]=container(kind);const expected=contents(s.board[34]),r=success(s,{type:'crate',index:34});
  assert.deepEqual(r.reveal.map(i=>s.board[i]),expected);assert.equal(s.board[34].type,'item');assert.equal(r.event,'container');failUnchanged(s,{type:'crate',index:34});
 }
});
test('partial opening preserves every remaining reward across save and resumes with one tap',()=>{
 const s=fresh();s.board=s.board.map(x=>x??item('rig',7));s.board[34]=container('survey');failUnchanged(s,{type:'crate',index:34});s.board[1]=null;
 const r=success(s,{type:'crate',index:34});assert.equal(r.reveal.length,1);assert.equal(s.board[34].left,2);
 const saved=load(JSON.stringify(s));assert.equal(saved.board[34].kind,'survey');saved.board[2]=null;success(saved,{type:'crate',index:34});assert.deepEqual(saved.board[34],item('chart',2));
});
test('parts case opens once without a charge bonus and old cache saves keep all their remaining mixed gear',()=>{
 const s=fresh();s.charges.rig=2;const energy=s.energy;success(s,{type:'crate',index:34});assert.equal(s.charges.rig,2);assert.equal(s.energy,energy);failUnchanged(s,{type:'crate',index:34});
 s.board[34]={type:'crate',left:2};const migrated=load(JSON.stringify(s));assert.equal(migrated.board[34].kind,'locker');assert.equal(migrated.board[34].left,2);assert.deepEqual(contents(migrated.board[34]),[item('flux',1),item('chart',1)]);
 const bad={...fresh()};bad.board[34]={type:'crate',kind:'invalid',left:3};assert.equal(load(JSON.stringify(bad)).board[34].kind,'salvage');
});
test('seventh-pull producer bonus is useful, finite, ignores charges and preserves ninth-pull rare output',()=>{
 const s=fresh();s.taps.rig=6;s.charges.rig=1;for(let i=0;i<36;i++)if(s.board[i]?.type==='item')s.board[i]=null;
 const r=success(s,{type:'produce',id:'rig'});assert.equal(r.bonus,'rig');assert.equal(r.reveal.length,2);assert.equal(s.board[r.reveal[1]].tier,1);assert.equal(s.charges.rig,1);assert.equal(success(s,{type:'produce',id:'rig'}).bonus,null);failUnchanged(s,{type:'service',id:'rig'});s.taps.rig=8;assert.equal(nextOutput(s,'rig').type,'glyph');
});

test('shared surge is finite, survives reload, protects rare pulls and failed commands',()=>{
 const s=fresh();s.stage=2;s.surge=3;
 assert.equal(nextOutput(s,'chart').tier,1);success(s,{type:'produce',id:'chart'});assert.equal(s.surge,2);
 const saved=load(JSON.stringify(s));assert.equal(saved.surge,2);success(saved,{type:'produce',id:'flux'});assert.equal(saved.surge,1);
 const energy=saved.energy;saved.energy=0;failUnchanged(saved,{type:'produce',id:'rig'});assert.equal(saved.surge,1);
 saved.energy=energy;saved.taps.rig=8;success(saved,{type:'produce',id:'rig'});assert.equal(saved.surge,1,'a guaranteed rare does not waste an improved part');
 success(saved,{type:'produce',id:'rig'});assert.equal(saved.surge,0);assert.equal(nextOutput(saved,'rig').tier,0);
 const old=fresh();delete old.surge;assert.deepEqual(load(JSON.stringify(old)),old);
 const corrupt={...old,surge:999};assert.equal(load(JSON.stringify(corrupt)).surge,undefined);
});
test('honest proximity cues distinguish one merge from a missing item',()=>{
 const s=fresh(),needs=[{family:'rig',tier:2,count:1}];assert.equal(near(s,needs),'1 ITEM LEFT');s.board[7]=item('rig',1);assert.equal(near(s,needs),'1 MERGE AWAY');s.board[7]=item('rig',2);assert.equal(near(s,needs),'READY');
});
test('T4 and T6 first crafts reward energy once, without renewable merge farming',()=>{
 const s=fresh(),charges={...s.charges};s.board[7]=item('rig',2);s.board[8]=item('rig',2);let energy=s.energy;
 const first=success(s,{type:'merge',from:7,to:8});assert.equal(first.breakthrough,true);assert.equal(s.energy,energy+3);assert.match(first.message,/breakthrough energy/);
 s.board[7]=item('rig',2);s.board[8]=item('rig',2);energy=s.energy;assert.equal(success(s,{type:'merge',from:7,to:8}).breakthrough,false);assert.equal(s.energy,energy);
 s.board[7]=item('rig',4);s.board[8]=item('rig',4);energy=s.energy;success(s,{type:'merge',from:7,to:8});assert.equal(s.energy,energy+8,'T6 breakthrough +7 and third-merge +1');assert.deepEqual(s.charges,charges);
});

test('each Surge item is strictly better than its normal deterministic pull, including decoded sources',()=>{
 for(const boost of [false,true])for(const family of Object.keys(SOURCES))for(let tap=0;tap<18;tap++){
  const s=fresh();s.stage=3;s.boost=boost;s.taps[family]=tap;
  const baseline=nextOutput(s,family);s.surge=3;const better=nextOutput(s,family);
  if(baseline.type==='glyph'){assert.deepEqual(better,baseline);continue;}
  assert.equal(better.tier,baseline.tier+1);assert.ok(better.tier<=3);
  const result=success(s,{type:'produce',id:family});assert.equal(result.improved,true);assert.equal(s.surge,2);assert.deepEqual(s.board[result.index],better);
 }
});
