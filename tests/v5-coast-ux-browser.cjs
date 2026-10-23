// Presentation regressions: source guidance, true affordability, touch drag/cancel,
// modal return, focus, and short landscape. No engine writes outside isolated fixtures.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch();try{
 for(const width of [360,390,430,907]){
  const context=await browser.newContext({viewport:{width,height:width===907?510:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  const snap=async name=>{if(!process.env.COAST_UX_SCREENSHOTS)return;require('node:fs').mkdirSync(process.env.COAST_UX_SCREENSHOTS,{recursive:true});await page.screenshot({path:require('node:path').join(process.env.COAST_UX_SCREENSHOTS,`${width}-${name}.png`),fullPage:true});};
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8080/v5/play.html?new=1');
  while(await page.locator('#beat[open]').count())await page.locator('#beatNext').click();
  assert.match(await page.locator('#hint').textContent(),/Deliver/,'opening follows real ready order');
  await page.locator('#hint').click();assert.ok(await page.locator('.requestCard.ready').first().isVisible());
  // A controlled, valid saved board isolates the UI contract from random orders.
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.moves=10;s.orders=s.orders.map(o=>({...o,needs:[{family:'rig',tier:3,count:1}]}));s.board[14]={type:'item',family:'rig',tier:0};s.board[16]={type:'item',family:'rig',tier:0};s.coins=0;localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
  await page.reload();await page.locator('[data-order]').first().click();
  assert.equal(await page.locator('.tile.source.orderSource').count(),1);
  assert.match(await page.locator('#message').textContent(),/Rivet Rover/);
  assert.match(await page.locator('#hint').textContent(),/Merge/);
  const tile=i=>page.locator(`[data-index="${i}"]`);
  await tile(14).click();assert.equal(await tile(16).getAttribute('class').then(c=>c.includes('match')),true);
  const a=await tile(14).boundingBox(),b=await tile(16).boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:5});
  assert.equal(await page.locator('.dragGhost').count(),1);await page.mouse.up();
  assert.equal(await page.locator('.dragGhost').count(),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).board[16].tier),1);
  await page.waitForTimeout(320);await tile(21).click();
  assert.match(await page.locator('#selection').textContent(),/Tap to make parts/);
  await page.locator('#selection summary').click();assert.match(await page.locator('#selection details[open]').textContent(),/level/);
  await page.locator('#selection summary').click();
  await page.locator('#mapButton').click();assert.equal(await page.locator('[data-restore]:enabled').count(),0,'no false affordable action');
  await page.locator('#coastMap [data-back]').click();assert.equal(await page.locator('#coastMap[open]').count(),0);
  await page.locator('#helpButton').click();await page.locator('#help .close').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const box=await page.locator('#board').boundingBox();if(width===907)assert.ok(box.y+box.height<=510,'landscape board fits');
  // Tide-gated cargo must explain its real condition, never consume the key or glow as a target.
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.board[14]={...s.board[12].key,type:'item'};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
  await page.reload();const saved=await page.evaluate(()=>localStorage.getItem('vaultwake-v5-coast'));
  await tile(14).tap();assert.ok(!(await tile(12).getAttribute('class')).includes('match'));
  await tile(12).tap();assert.match(await page.locator('#selection').textContent(),/3 more beach upgrades/);
  await snap('locked-tide');
  assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5-coast')),saved);
  await page.locator('#selection [data-action="beach"]').tap();assert.match(await page.locator('.tideProgress').textContent(),/3 more beach upgrades/);
  await page.locator('[data-back]').tap();
  const dragFrom=await tile(14).boundingBox(),dragTo=await tile(12).boundingBox();
  await page.mouse.move(dragFrom.x+20,dragFrom.y+20);await page.mouse.down();await page.mouse.move(dragTo.x+20,dragTo.y+20,{steps:6});
  assert.equal(await page.locator('.tide.dragTarget').count(),0);await page.mouse.up();
  assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5-coast')),saved);
  // Reach every tide threshold with the unchanged engine, then inspect its rendered state.
  for(const stages of [2,3,6,9,12]){
   const expected=await page.evaluate(async n=>{const g=await import('/v5/next/game.mjs');const s=g.fresh(Date.now());s.coins=10000;
    for(let k=0;k<n;k++){const u=g.upgrades(s)[0];const r=g.act(s,{type:'restore',id:u.id},Date.now());if(!r.ok)throw Error(r.message);}
    s.moves=Math.max(s.moves,1);localStorage.setItem(g.SAVE_KEY,JSON.stringify(s));return s.board.filter((x,i)=>['cargo','glass'].includes(x?.type)&&g.tideLocked(s,i)).length;
   },stages);
   await page.reload();assert.equal(await page.locator('.tile.tide').count(),expected,`tide count after ${stages} stages`);
   if(stages===2){await page.locator('#mapButton').tap();await page.locator('[data-restore]:enabled').first().tap();
    assert.match(await page.locator('.beatReceipt').textContent(),/Tide receded/);
    while(await page.locator('#beat[open]').count())await page.locator('#beatNext').tap();
    assert.match(await page.locator('.restorationReceipt').textContent(),/shore spaces uncovered/);
    await snap('tide-receipt');
    await page.locator('[data-back]').tap();assert.equal(await page.locator('.tile.tide').count(),19);
    await snap('tide-receded');
   }
  }
  // Older saves may already have a usable source/part on the outer ring. Build 19 allows it.
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.built={};s.board[6]={type:'source',id:'rig'};s.board[0]={type:'item',family:'rig',tier:0};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
  await page.reload();assert.ok(!(await tile(6).getAttribute('class')).includes('tide'));
  await tile(6).tap();assert.match(await page.locator('#selection').textContent(),/Tap to make parts/);
  await tile(0).tap();assert.ok(await page.locator('[data-action="recycle"]').isVisible());
  await page.locator('#helpButton').tap();assert.match(await page.locator('#help').textContent(),/at least as strong/);
  assert.doesNotMatch(await page.locator('#help').textContent(),/and from level chests/);await page.locator('#help .close').tap();
  assert.deepEqual(errors,[]);console.log(`Coast UX ${width}: guidance, drag, details, affordability, overlays, layout, tide thresholds and legacy saves passed`);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
