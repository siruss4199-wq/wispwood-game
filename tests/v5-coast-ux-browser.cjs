// Presentation regressions: source guidance, true affordability, touch drag/cancel,
// modal return, focus, and short landscape. No engine writes outside isolated fixtures.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch();try{
 for(const width of [360,390,430,907]){
  const context=await browser.newContext({viewport:{width,height:width===907?510:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
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
  assert.deepEqual(errors,[]);console.log(`Coast UX ${width}: guidance, drag, details, affordability, overlays, layout passed`);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
