// Coast Camp in a real browser at 360/390/430 px: the scripted player's choices are
// made through visible taps only, through two restorations; then reload, the map,
// the menu, and the Classic save left untouched.
// Sealed cargo covers the board; each crate shows the part that opens it.
const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8080/v5/play.html';
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')));
async function closeBeats(page){for(let n=0;n<6&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').tap();await page.waitForTimeout(80);}}
async function perform(page,a){
 const s=await read(page),tile=i=>page.locator(`#board [data-index="${i}"]`),pressed=async i=>await tile(i).getAttribute('aria-pressed')==='true';
 if(a.type==='produce')await tile(s.board.findIndex(x=>x?.type==='source'&&x.id===a.id)).tap();
 else if(a.type==='merge'){if(!await pressed(a.from))await tile(a.from).tap();await tile(a.to).tap();}
 else if(a.type==='openKit'){if(!await pressed(a.index))await tile(a.index).tap();await page.locator('#selection [data-action="openKit"]').tap();}
 else if(a.type==='deliver')await page.locator(`[data-order="${a.id}"]`).tap();
 else if(a.type==='restore'){await page.locator('#taskButton').tap();await closeBeats(page);}
 else if(a.type==='recycle'){if(!await pressed(a.index))await tile(a.index).tap();await page.locator('#selection [data-action="recycle"]').tap();}
 else if(a.type==='ration')await page.locator('#rationButton').tap();
 else if(a.type==='unseal'){if(!await pressed(a.from))await tile(a.from).tap();await tile(a.index).tap();}
 else throw Error('Unexpected action '+JSON.stringify(a));
 await page.waitForFunction(n=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).moves>n,s.moves,{timeout:4000});
}
(async()=>{
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  try{for(const width of [360,390,430]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(URL);
   // A Classic save in the same browser must never be touched.
   const classic=JSON.stringify({version:5,marker:'classic'});
   await page.evaluate(v=>{localStorage.clear();localStorage.setItem('vaultwake-v5',v);},classic);
   await page.reload();await page.waitForSelector('#board .tile');
   assert.equal(await page.locator('#beat[open]').count(),1,'the area intro plays on a new camp');await closeBeats(page);
   assert.equal(await page.locator('#board .tile').count(),49);
   assert.equal(await page.locator('#board .tile.cargo').count(),40,'sealed cargo covers all but the camp');assert.equal(await page.locator('#board .cargoKey').count(),40,'each crate shows its key');assert.equal(await page.locator('#board .tile.source').count(),1,'one generator to start');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no sideways scroll');
   for(const t of await page.locator('#board .tile').all()){const b=await t.boundingBox();assert.ok(b.width>=44&&b.height>=44,'44px touch targets');}
   for(const sel of ['#energyPill','#starPill','#levelPill','#mapButton','#menuButton']){const b=await page.locator(sel).boundingBox();assert.ok(b&&b.x>=0&&b.x+b.width<=width,sel+' fits the header');}
   let restores=0;
   for(let n=0;n<160&&restores<2;n++){
    const a=await page.evaluate(async()=>{const {nextAction}=await import('/tests/v5-next-policy.mjs');return nextAction(JSON.parse(localStorage.getItem('vaultwake-v5-coast')));});
    assert.ok(a,'the scripted player always has a move early on');
    await perform(page,a);if(a.type==='restore')restores++;
   }
   assert.equal(restores,2,'two places restored through the UI');
   const s=await read(page);assert.deepEqual(s.done,['beach-path','beach-tent']);
   assert.equal(await page.locator('.restoredIcon').count(),2,'restored places stand on the coast picture');
   assert.ok(await page.locator('#board .tile.cargo').count()<40,'cargo was opened by laying parts on it');
   await page.reload();await page.waitForSelector('#board .tile');
   assert.deepEqual((await read(page)).board,s.board,'reload keeps the board');assert.equal(await page.locator('#beat[open]').count(),0,'no intro on a running camp');
   await page.locator('#mapButton').tap();assert.equal(await page.locator('#coastMap .place').count(),7);assert.equal(await page.locator('#coastMap .place[data-status="done"]').count(),2);
   await page.locator('#coastMap .close').tap();
   await page.locator('#menuButton').tap();assert.equal(await page.locator('#classicLink').getAttribute('href'),'index.html');await page.locator('#menu .close').tap();
   assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5')),classic,'Classic save untouched');
   assert.match(await page.locator('#build').textContent(),/BUILD \d/,'the footer names the build');
   // The playtest page's "start from the beginning" link starts a new camp and cleans the address.
   await page.goto(URL+'?new=1');await page.waitForSelector('#board .tile');await closeBeats(page);
   assert.equal((await read(page)).moves,0);assert.equal(new globalThis.URL(page.url()).search,'');
   assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5')),classic,'Classic save still untouched');
   assert.deepEqual(errors,[]);
   console.log(`${engine} ${width} Coast Camp: intro → orders → 2 restorations → reload → map passed`);
   await context.close();
  }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
