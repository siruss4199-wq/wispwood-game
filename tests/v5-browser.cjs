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
  await shot('fresh');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const bounds=await page.locator('#board').boundingBox();assert.ok(bounds.width>=Math.min(width-24,370));assert.ok(bounds.y+bounds.height<830);
  // Deliver the available starter contract: deliberately trade a story ingredient for supplies.
  await page.locator('[data-contract="contract"]').tap();assert.equal((await read()).contracts,1);await shot('first-contract');
  // Test a physical pointer drag, not a synthetic reducer call.
  const a=await page.locator('[data-index="7"]').boundingBox(),b=await page.locator('[data-index="8"]').boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:7});await page.mouse.up();await page.waitForTimeout(320);assert.equal((await read()).merges,1);
  // Every remaining action runs through visible UI. Policy does not mutate game state.
  let several=false,unlock=false,actions=0;
  while((await read()).stage<4&&actions++<400){
   const cmd=await page.evaluate(async()=>{const {choose}=await import('/tests/v5-policy.mjs');return choose(JSON.parse(localStorage.getItem('vaultwake-v5')));});
   if(cmd.type==='merge'){await page.locator(`[data-index="${cmd.from}"]`).tap();await page.locator(`[data-index="${cmd.to}"]`).tap();}
   else if(cmd.type==='produce'){const s=await read();const i=s.board.findIndex(x=>x?.type==='source'&&x.id===cmd.id);await page.locator(`[data-index="${i}"]`).tap();}
   else if(cmd.type==='service'){const s=await read();const i=s.board.findIndex(x=>x?.type==='source'&&x.id===cmd.id);await page.locator(`[data-index="${i}"]`).tap();await page.locator('[data-action="service"]').tap();}
   else if(cmd.type==='recycle'){await page.locator(`[data-index="${cmd.index}"]`).tap();await page.locator('[data-action="recycle"]').tap();}
   else if(cmd.type==='ration')await page.locator('#rationButton').tap();
   else if(cmd.type==='goal')await page.locator('#goalButton').tap();
   else await page.locator(`[data-contract="${cmd.type}"]`).tap();
   if(await page.locator('#celebration').isVisible())await page.locator('#celebration .continue').tap();
   const s=await read();
   if(s.merges>=3&&!several){await shot('merges');several=true;}
   if(s.stage===2&&!unlock){assert.equal(await page.locator('.source.locked').count(),0);assert.equal(await page.locator('.tile.sealed').count(),0);await shot('producer-unlock');unlock=true;}
  }
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
 const page=await browser.newPage();await page.route('https://sdk.crazygames.com/**',r=>r.abort());await page.goto('http://127.0.0.1:8080/v5/crazygames.html');await page.waitForFunction(()=>document.querySelectorAll('#board .tile').length===36);await page.locator('[data-index="0"]').click();assert.equal(await page.locator('.flight').count(),1);await page.waitForTimeout(550);assert.equal(await page.locator('.flight').count(),0);await page.locator('#journalButton').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#journal').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#journal').isVisible(),false);await page.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
