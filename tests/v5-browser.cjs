const assert=require('node:assert/strict');const fs=require('node:fs');const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});fs.mkdirSync('test-artifacts/v5',{recursive:true});
 try{for(const width of [360,390,768]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:width<500,reducedMotion:'reduce'});page.setDefaultTimeout(8000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8080/v5/');
  await page.waitForFunction(()=>document.querySelectorAll('#board .tile').length===36);
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
  const shot=async name=>{await page.screenshot({path:`test-artifacts/v5/${name}-${width}.png`,fullPage:true});};
  assert.equal(await page.locator('.contract').count(),2);assert.equal(await page.locator('.source').count(),3);assert.equal(await page.locator('.source.locked').count(),2);
  assert.equal(await page.locator('#goalButton').isDisabled(),true);assert.match(await page.locator('#goalTitle').textContent(),/landing/);
  await shot('fresh');assert.equal((await read()).board.filter(Boolean).length,27);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const bounds=await page.locator('#board').boundingBox();assert.ok(bounds.width>=Math.min(width-24,370));assert.ok(bounds.y+bounds.height<830);
  // Deliver the available starter contract: deliberately trade a story ingredient for supplies.
  await page.locator('[data-contract="contract"]').tap();assert.equal((await read()).contracts,1);await shot('first-contract');
  // Test a physical pointer drag, not a synthetic reducer call.
  const a=await page.locator('[data-index="7"]').boundingBox(),b=await page.locator('[data-index="8"]').boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:7});await page.mouse.up();await page.waitForTimeout(320);assert.equal((await read()).merges,1);
  // Every remaining action runs through visible UI. Policy does not mutate game state.
  let several=false,unlock=false,blocked=false,rare=false,firstUnlock=false,actions=0;
  const density=[],captured=new Set(),timepoints=[[14,'session-1min'],[40,'session-3min'],[67,'session-5min'],[107,'session-8min']];
  while((await read()).stage<4&&actions++<400){
   const current=await read();
   const spanner=current.board.findIndex(x=>x?.type==='item'&&x.family==='rig'&&x.tier===2);
   if(!blocked&&current.stage>=1&&spanner>=0){
    await page.locator(`[data-index="${spanner}"]`).tap();await page.locator('[data-action="branch"]').tap();
    const stone=current.board.findIndex(x=>x?.type==='rock');await page.locator(`[data-index="${stone}"]`).tap();await page.locator('[data-action="clear"]').tap();
    assert.equal((await read()).board[stone].type,'item');await shot('blocker-reveal');blocked=true;
   }
   const cmd=await page.evaluate(async()=>{const {choose}=await import('/tests/v5-policy.mjs');const s=JSON.parse(localStorage.getItem('vaultwake-v5'));window.sessionPolicy??={};return choose(s,{openCaches:s.stage>=2,session:window.sessionPolicy});});
   if(cmd.type==='goal'&&(await read()).stage===3){assert.ok((await read()).board.filter(Boolean).length>=20);await shot('density-pre-vault');captured.add('density-pre-vault');}
   if(cmd.type==='merge'){await page.locator(`[data-index="${cmd.from}"]`).tap();await page.locator(`[data-index="${cmd.to}"]`).tap();}
   else if(cmd.type==='produce'){const s=await read();const i=s.board.findIndex(x=>x?.type==='source'&&x.id===cmd.id);await page.locator(`[data-index="${i}"]`).tap();}
   else if(cmd.type==='service'){const s=await read();const i=s.board.findIndex(x=>x?.type==='source'&&x.id===cmd.id);await page.locator(`[data-index="${i}"]`).tap();await page.locator('[data-action="service"]').tap();}
   else if(cmd.type==='crate'){await page.locator(`[data-index="${cmd.index}"]`).tap();assert.equal(await page.locator('[data-action="crate"]').count(),0);if(!captured.has('container-opening')){await shot('container-opening');captured.add('container-opening');}}
   else if(cmd.type==='recycle'){await page.locator(`[data-index="${cmd.index}"]`).tap();await page.locator('[data-action="recycle"]').tap();}
   else if(cmd.type==='ration')await page.locator('#rationButton').tap();
   else if(cmd.type==='goal')await page.locator('#goalButton').tap();
   else await page.locator(`[data-contract="${cmd.type}"]`).tap();
   if(await page.locator('#celebration').isVisible())await page.locator('#celebration .continue').tap();
   const s=await read();
   density.push({moves:s.moves,estimatedSeconds:s.moves*4.5,command:cmd.type,stage:s.stage,surge:s.surge??0,discovery:s.discoveryDone,occupied:s.board.filter(Boolean).length,items:s.board.filter(x=>x?.type==='item').length,caches:s.board.filter(x=>x?.type==='crate').length,blockers:s.board.filter(x=>['rock','sealed'].includes(x?.type)).length});
   if(s.surge>0){assert.match(await page.locator('#free').textContent(),/SURGE/);assert.equal(await page.locator('#board').getAttribute('data-event'),'surge');if(!captured.has('supply-surge')){await shot('supply-surge');captured.add('supply-surge');}}
   for(const [move,name]of timepoints)if(s.moves>=move&&!captured.has(name)){assert.ok(s.board.filter(Boolean).length>=20,`${name} remains an active workspace`);await shot(name);captured.add(name);}
   if(s.stage===1&&!firstUnlock){await shot('first-unlock');firstUnlock=true;}
   if(s.discovery&&!rare){await shot('rare-producer');rare=true;}
   if(s.merges>=3&&!several){await shot('merges');several=true;}
   if(s.stage===2&&!unlock){assert.equal(await page.locator('.source.locked').count(),0);assert.equal(await page.locator('.tile.sealed').count(),0);await shot('producer-unlock');const kinds=(await read()).board.filter(x=>x?.type==='crate').map(x=>x.kind);assert.ok(new Set(kinds).size>=3,'three useful container identities coexist without duplicates');await shot('container-types');unlock=true;}
  }
  for(const name of [...timepoints.map(x=>x[1]),'density-pre-vault'])assert.ok(captured.has(name),name);
  fs.writeFileSync(`test-artifacts/v5/density-${width}.json`,JSON.stringify({assumedSecondsPerDecision:4.5,samples:density},null,2));
  assert.ok(Math.min(...density.map(x=>x.occupied))>=17);
  let run=0;for(const sample of density){run=sample.command==='produce'?run+1:0;assert.ok(run<=3,'no producer-only grind');}
  assert.ok(density.some(x=>x.command==='opportunity'));assert.ok(density.some(x=>x.command==='contract'&&x.stage===2));assert.ok(new Set(density.map(x=>x.stage)).size>=4);
  assert.equal(blocked,true);assert.equal(rare,true);assert.equal((await read()).discoveryDone,true);
  assert.equal((await read()).stage,4,'chapter completable through UI');await shot('vault-open');
  assert.match(await page.locator('#scene svg').getAttribute('aria-label'),/Open vault/);
  assert.match(await page.locator('#goalTitle').textContent(),/next crossing/);
  assert.equal(await page.locator('#hint').textContent(), 'Horizon model ← Survey Kite');
  const saved=await read();await page.reload();assert.equal((await read()).stage,4);assert.equal((await read()).merges,saved.merges);
  // Opt-in timer persists. Existing discovery may occupy its slot until decoded.
  if(await page.locator('[data-contract="startOpportunity"]').count()){
   await page.locator('[data-contract="startOpportunity"]').tap();const deadline=(await read()).opportunity.ends;await page.reload();assert.equal((await read()).opportunity.ends,deadline);assert.equal(await page.locator('#opClock').count(),1);
  }
  await page.locator('#journalButton').tap();assert.equal(await page.locator('#journal .art').count(),24);await page.locator('#journal .close').tap();
  assert.equal(await page.evaluate(()=>localStorage.getItem('wispwood-v4')),null,'V4 save untouched');assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,actions,merges:saved.merges,stage:saved.stage}));await page.close();
 }
 // CrazyGames entry works even if external SDK is unavailable, as in Basic Launch preview.
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"no-preference"});const motionErrors=[];page.on("pageerror",e=>motionErrors.push(e.message));await page.route('https://sdk.crazygames.com/**',r=>r.abort());await page.goto('http://127.0.0.1:8080/v5/crazygames.html');await page.waitForFunction(()=>document.querySelectorAll('#board .tile').length===36);await page.locator('[data-index="34"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5')).board[34].type==='item');assert.equal(await page.locator('[data-action="crate"]').count(),0);await page.waitForTimeout(120);await page.screenshot({path:'test-artifacts/v5/container-opening-motion.png',fullPage:true});await page.locator('[data-index="0"]').click();assert.equal(await page.locator('.flight').count(),1);assert.equal(await page.locator('.rareTrack').getAttribute('aria-valuenow'),'1');await page.waitForTimeout(550);assert.equal(await page.locator('.flight').count(),0);
 await page.evaluate(()=>{window.seenParticles=0;new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.classList?.contains('fxParticle'))window.seenParticles++;}).observe(document.body,{childList:true});});
 const pair=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5'));for(let i=0;i<s.board.length;i++)for(let j=i+1;j<s.board.length;j++){const a=s.board[i],b=s.board[j];if(a?.type==='item'&&b?.type==='item'&&a.family===b.family&&a.tier===b.tier&&a.tier<7)return [i,j];}return null;});assert.ok(pair,'fresh CrazyGames entry exposes a mergeable pair');const pa=await page.locator(`[data-index="${pair[0]}"]`).boundingBox(),pb=await page.locator(`[data-index="${pair[1]}"]`).boundingBox();await page.mouse.move(pa.x+pa.width/2,pa.y+pa.height/2);await page.mouse.down();await page.mouse.move(pb.x+pb.width/2,pb.y+pb.height/2,{steps:5});await page.mouse.up();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5')).merges===1);assert.deepEqual(motionErrors,[]);assert.equal(await page.locator('.merge-pop').count(),1,'merged tile gets tactile pop feedback');assert.ok(await page.evaluate(()=>window.seenParticles)>0,'merge creates a particle burst');await page.waitForTimeout(600);assert.equal(await page.locator('.fxParticle').count(),0);
 await page.locator('#soundButton').click();assert.equal(await page.locator('#soundButton').textContent(),'Sound on');await page.reload();assert.equal(await page.locator('#soundButton').textContent(),'Sound on');await page.locator('#journalButton').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#journal').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#journal').isVisible(),false);await page.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
