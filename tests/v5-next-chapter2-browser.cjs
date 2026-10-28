// Chapter 2 integration in the browser (docs/V5_CHAPTER2_INTEGRATION_2026-10-28.md).
// Build 47b: a finished Chapter 1 save that already saw the old ending continues into the Vault
// door: its intro plays once (not again after a reload), the coast screen shows the coast's own
// Vault with lit rings, the three rings are turned through their gold orders, and the inner ring
// opens the Vault (the reveal, once, labelled "Chapter 1 complete", with Skip). Build 47d: inside,
// the Tide Archive's intro, its three stages (late-generator gold orders, the seal line), the end card.
const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');const {throughHome}=require('./v5-next-home-helper.cjs');
const URL='http://127.0.0.1:8080/v5/play.html',KEY='vaultwake-v5-coast';
(async()=>{
 const {AREAS}=await import('../v5/next/areas.mjs');
 const built=Object.fromEntries([...AREAS[0].tasks,...AREAS[1].tasks].map(t=>[t.id,3]));
 const engines=(process.env.ENGINES||'chromium,webkit').split(',').map(e=>[e,{chromium,webkit}[e]]);
 for(const [engine,type] of engines){
  let browser;try{browser=await type.launch();}catch(e){if(engine!=='chromium'&&/Executable doesn't exist/.test(e.message)){console.log(`${engine}: not installed here, skipped`);continue;}throw e;}
  try{for(const [W,H] of [[360,780],[390,844],[430,932],[907,510]]){
   const context=await browser.newContext({viewport:{width:W,height:H},isMobile:W<700&&engine==='chromium',hasTouch:W<700,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];throughHome(page);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   const tag=s=>`${engine} ${W}×${H}: ${s}`;const save=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
   const beats=async()=>{const lines=[];for(let n=0;n<10&&await page.locator('#beat[open]').count();n++){lines.push(await page.locator('#beatContent').textContent());await page.locator('#beatNext').click();await page.waitForTimeout(80);}return lines.join(' | ');};
   await page.goto(URL+'?new=1');await page.waitForSelector('#board .tile');await beats();
   // a Build 46 camp at the end of Chapter 1 that saw the old "for now" ending
   await page.evaluate(([k,b])=>{const s=JSON.parse(localStorage.getItem(k));s.area=1;s.built=b;s.materials={...b};s.coins=2000;s.moves=900;s.ordersDone=80;s.seenEnd=true;s.daily={day:9e6,count:1};
    delete s.pending;delete s.seen;localStorage.setItem(k,JSON.stringify(s));},[KEY,built]);
   await page.reload();await page.waitForSelector('#board .tile');
   const intro=await beats();assert.match(intro,/three rings/,tag('the door intro plays'));
   let s=await save();assert.equal(s.area,2);assert.equal(s.seen.door,true);assert.notEqual(s.seenEnd,true);assert.ok(s.orders.some(o=>o?.story==='vault-door'),tag('gold order for the outer ring'));
   assert.equal(await page.locator('#endDialog[open]').count(),0,tag('no end card yet'));
   await page.reload();await page.waitForSelector('#board .tile');assert.equal(await beats(),'',tag('the intro does not play again'));
   // the coast screen: the coast's own Vault, no ring lit yet
   await page.locator('#mapButton').click();await page.waitForSelector('#coastMap[open]');
   assert.match(await page.locator('#coastMap .sceneBase').getAttribute('src'),/vault-door-vibrant\.webp$/,tag('the coast\'s Vault picture'));
   assert.equal(await page.locator('#coastMap .doorRings').getAttribute('data-stage'),'0');
   await page.locator('#coastMap .close').click();
   // turn the three rings: each gold order's parts are laid on the board and delivered by hand
   for(let ring=1;ring<=3;ring++){
    await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)),o=s.orders.find(x=>x?.story==='vault-door');let k2=0;const free=s.board.reduce((a,x,i)=>x===null||x.type==='cargo'?[...a,i]:a,[]);
     for(const r of o.needs)for(let c=0;c<r.count;c++)s.board[free[k2++]]={type:'item',family:r.family,tier:r.tier};localStorage.setItem(k,JSON.stringify(s));},KEY);
    await page.reload();await page.waitForSelector('#board .tile');await beats();
    const gold=(await save()).orders.find(o=>o?.story==='vault-door');
    if(ring===3)assert.deepEqual(gold.needs,[{family:'lamp',tier:3,count:1},{family:'chart',tier:4,count:1}],tag('inner ring: a Signal lamp and a Bearing dial'));
    await page.locator(`#requests [data-order="${gold.id}"]`).click();await page.waitForTimeout(150);
    if(await page.locator('#requests .requestCard.ready button, #hint[data-kind="deliver"]').count())await page.locator('#hint[data-kind="deliver"]').click().catch(()=>{});
    await page.waitForFunction(([k,id])=>!JSON.parse(localStorage.getItem(k)).orders.some(o=>o?.id===id),[KEY,gold.id],{timeout:5000});
    await page.locator('#mapButton').click();await page.waitForSelector('#coastMap[open]');
    await page.locator('#coastMap [data-restore="vault-door"]').click();await page.waitForTimeout(400);
    if(ring<3){await beats();if(await page.locator('#coastMap[open]').count()){assert.equal(await page.locator('#coastMap .doorRings').getAttribute('data-stage'),String(ring),tag(`ring ${ring} lit`));await page.locator('#coastMap .close').click();}}
   }
   // the inner ring: its line, then the Vault opens (the reveal), then the end card
   await beats();await page.waitForSelector('#story:not([hidden])',{timeout:8000});
   assert.match(await page.textContent('#storyLabel'),/Chapter 1 complete/i);assert.ok(await page.locator('#storySkip').isVisible());
   assert.match(await page.textContent('#storyText'),/Light runs down the seam/);assert.equal(await page.getAttribute('#story','data-fx'),'seam');
   await page.locator('#storyNext').click();assert.equal(await page.getAttribute('#story','data-fx'),'open');assert.match(await page.textContent('#storyWho'),/Neri/);
   await page.locator('#storyNext').click();await page.waitForSelector('#story',{state:'hidden'});
   // Build 47d: inside, Chapter 2 begins with the Tide Archive's intro (no end card yet)
   const inside=await beats();assert.match(inside,/Records, floor to ceiling/,tag('the archive intro follows the reveal'));
   s=await save();assert.equal(s.area,3);assert.equal(s.seen['vault-open'],true);assert.equal(s.seen.archive,true);
   assert.equal(await page.locator('#endDialog[open]').count(),0,tag('no end card: Chapter 2 is playable'));
   assert.ok(s.orders.some(o=>o?.story==='vault-archive'),tag('the archive\'s gold order'));
   // the archive's three stages through their gold orders (Lantern Kiln and Shell Trap parts)
   for(let st=1;st<=3;st++){
    await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)),o=s.orders.find(x=>x?.story==='vault-archive');let k2=0;const free=s.board.reduce((a,x,i)=>x===null||x.type==='cargo'?[...a,i]:a,[]);
     for(const r of o.needs)for(let c=0;c<r.count;c++)s.board[free[k2++]]={type:'item',family:r.family,tier:r.tier};localStorage.setItem(k,JSON.stringify(s));},KEY);
    await page.reload();await page.waitForSelector('#board .tile');await beats();
    const gold=(await save()).orders.find(o=>o?.story==='vault-archive');
    assert.ok(gold.needs.every(r=>['lamp','shell'].includes(r.family)),tag(`archive stage ${st} wants late-generator parts`));
    await page.locator(`#requests [data-order="${gold.id}"]`).click();await page.waitForTimeout(150);await page.locator('#hint[data-kind="deliver"]').click().catch(()=>{});
    await page.waitForFunction(([k,id])=>!JSON.parse(localStorage.getItem(k)).orders.some(o=>o?.id===id),[KEY,gold.id],{timeout:5000});
    await page.locator('#mapButton').click();await page.waitForSelector('#coastMap[open]');
    if(st===1)assert.match(await page.locator('#coastMap .sceneBase').getAttribute('src'),/observatory-map\.webp$/,tag('the Observatory interior'));
    await page.locator('#coastMap [data-restore="vault-archive"]').click();await page.waitForTimeout(400);
    const said=await beats();if(st===2)assert.match(said,/same wave seal as on your letter/,tag('the seal links the letter and the archive'));
    if(st<3&&await page.locator('#coastMap[open]').count())await page.locator('#coastMap .close').click();
   }
   await page.waitForSelector('#endDialog[open]',{timeout:5000});assert.match(await page.textContent('#endContent'),/The archive is read/);
   s=await save();assert.equal(s.seenEnd,true);
   await page.locator('#endContent [data-keep]').click();
   // reload: neither a reveal nor the end card again
   await page.reload();await page.waitForSelector('#board .tile');await page.waitForTimeout(800);
   assert.equal(await page.locator('#story:not([hidden])').count(),0,tag('the reveal plays once'));assert.equal(await page.locator('#endDialog[open]').count(),0);assert.equal(await beats(),'',tag('no intro again'));
   assert.deepEqual(errors,[],tag('no errors'));await context.close();}
   console.log(`${engine} Coast Camp Chapter 2 integration: finished save (old ending seen) → Vault door intro once → rings through gold orders → Vault opens once → Tide Archive (intro, seal line, three stages) → end card passed`);
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
