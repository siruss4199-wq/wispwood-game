// Coast Camp's CrazyGames page (tools/coast-crazygames.mjs, 2026-10-26) in a real browser, with a
// stand-in for the SDK that records its calls (no request leaves the machine): it goes straight
// into play, reports loading and gameplay, shows no ad or rewarded-ad offer anywhere (Basic Launch)
// and no link out of the game, fits 907 × 510 and phones, and plays with no error or missing file.
// URL: the page to test (default the repo's v5/coast-crazygames.html; the packaged zip's
// index.html can be passed to check the upload itself).
const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');const {throughHome}=require('./v5-next-home-helper.cjs');
const URL=process.env.CG_URL||'http://127.0.0.1:8080/v5/coast-crazygames.html',KEY='vaultwake-v5-coast';
const STUB=`window.__cg=[];window.CrazyGames={SDK:{environment:'crazygames',init:async()=>{__cg.push('init')},
 game:{loadingStart(){__cg.push('loadingStart')},loadingStop(){__cg.push('loadingStop')},gameplayStart(){__cg.push('gameplayStart')},gameplayStop(){__cg.push('gameplayStop')},happytime(){__cg.push('happytime')},settings:{muteAudio:false},addSettingsChangeListener(){}},
 ad:{requestAd(t,cb){__cg.push('requestAd:'+t);cb.adError&&cb.adError()}}}};`;
(async()=>{
 const engines=(process.env.ENGINES||'chromium,webkit').split(',').map(e=>[e,{chromium,webkit}[e]]);
 for(const [engine,type] of engines){
  let browser;try{browser=await type.launch();}catch(e){if(engine!=='chromium'&&/Executable doesn't exist/.test(e.message)){console.log(`${engine}: not installed here, skipped`);continue;}throw e;}
  try{for(const [W,H] of [[907,510],[390,844],[360,780]]){
   const context=await browser.newContext({viewport:{width:W,height:H},isMobile:W<700&&engine==='chromium',hasTouch:W<700});
   const page=await context.newPage(),errors=[],missing=[],outside=[];throughHome(page);
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400)missing.push(r.status()+' '+r.url());});
   await page.route('https://sdk.crazygames.com/**',r=>r.fulfill({contentType:'application/javascript',body:STUB}));
   page.on('request',r=>{const u=r.url();if(!u.startsWith('http://127.0.0.1:')&&!u.startsWith('https://sdk.crazygames.com/'))outside.push(u);});
   await page.goto(URL);await page.waitForSelector('#board .tile');
   const tag=`${engine} ${W}×${H}`;
   // Straight into play: the board is there; the intro story card is the only thing on top.
   for(let n=0;n<8&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(80);}
   await page.waitForFunction(()=>window.__cg.includes('gameplayStart'),null,{timeout:6000});
   const calls=await page.evaluate(()=>window.__cg);
   assert.deepEqual(calls.slice(0,3),['init','loadingStart','loadingStop'],`${tag}: SDK lifecycle ${calls}`);
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.ads),'off');
   // No ad or rewarded-ad offer anywhere: low energy, the shop, an order with its free changes used.
   await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.energy=1;s.daily={day:9e6,count:1};s.swaps={day:9e6,n:3,ads:0};localStorage.setItem(k,JSON.stringify(s));},KEY);
   await page.reload();await page.waitForSelector('#board .tile');
   for(let n=0;n<8&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(80);}
   const adVisible=async()=>page.locator('.adOffer:visible, [data-ad]:visible, [data-swap-ad]:visible, #adEnergyButton:visible, .adsOnly:visible').count();
   assert.equal(await adVisible(),0,`${tag}: no ad offer on the board`);
   await page.locator('#shopButton').click();await page.waitForSelector('#shop[open]');
   assert.equal(await adVisible(),0,`${tag}: no ad offer in the shop`);assert.doesNotMatch(await page.locator('#shopContent').textContent(),/short ad/i);
   await page.locator('#shop .close').click();
   await page.locator('#requests .requestCard:not(.storyOrder)').first().click();
   assert.equal(await adVisible(),0,`${tag}: no ad offer for a new order`);
   await page.locator('#requests .requestCard:not(.storyOrder)').first().click();
   // Nothing leads out of the game.
   await page.locator('#menuButton').click();
   assert.equal(await page.locator('#menu a:visible, #playlogButton:visible').count(),0,`${tag}: no link out of the game in the menu`);
   await page.keyboard.press('Escape');
   // A few moves: tap the generator, merge, nothing breaks; the layout fits.
   const s=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);const gen=s.board.findIndex(x=>x?.type==='source');
   await page.locator(`#board [data-index="${gen}"]`).click();await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${tag}: no sideways scroll`);
   const b=await page.locator('#board').boundingBox();assert.ok(b.width>=300,`${tag}: board ${b.width}px`);
   assert.ok(!calls.includes('requestAd:rewarded')&&!(await page.evaluate(()=>window.__cg)).some(c=>c.startsWith('requestAd')),`${tag}: no ad requested`);
   assert.deepEqual(errors,[],`${tag}: no page errors`);assert.deepEqual(missing,[],`${tag}: no missing files`);assert.deepEqual(outside,[],`${tag}: no other requests`);
   console.log(`${tag}: CrazyGames page: SDK lifecycle, no ads, nothing leads out, fits, no errors passed`);
   await context.close();
  }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
