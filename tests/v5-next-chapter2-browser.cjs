// Chapter 2 integration in the browser (docs/V5_CHAPTER2_INTEGRATION_2026-10-28.md).
// Build 47b: a finished Chapter 1 save that already saw the old ending continues into the Vault
// door: its intro plays once (not again after a reload), the coast screen shows the coast's own
// Vault with lit rings, the three rings are turned through their gold orders, and the inner ring
// opens the Vault (the reveal, once, labelled "Chapter 1 complete", with Skip). Build 47d: inside,
// the Tide Archive's intro, its three stages (late-generator gold orders, the seal line). Build 47e: the
// Observatory (the Lens Bench's first copy, the sea gate waiting for the array, the signal and harbour
// cards), then Chapter 2's end card.
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
    if(await page.locator('#requests .requestCard.ready button, #hint[data-kind="deliver"]').count())await page.locator(`#hint[data-kind="deliver"]`).click({timeout:1500}).catch(()=>{});
    await page.waitForFunction(([k,id])=>!JSON.parse(localStorage.getItem(k)).orders.some(o=>o?.id===id),[KEY,gold.id],{timeout:5000});
    await page.locator('#mapButton').click();await page.waitForSelector('#coastMap[open]');
    await page.locator('#coastMap [data-restore="vault-door"]').click();await page.waitForTimeout(400);
    if(ring<3){await beats();if(await page.locator('#coastMap[open]').count()){assert.equal(await page.locator('#coastMap .doorRings').getAttribute('data-stage'),String(ring),tag(`ring ${ring} lit`));await page.locator('#coastMap .close').click();}}
   }
   // the inner ring: its line, then the Vault opens (the reveal), then the end card
   await beats();await page.waitForSelector('#story:not([hidden])',{timeout:8000});
   assert.match(await page.textContent('#storyLabel'),/Chapter 1 complete/i);assert.ok(await page.locator('#storySkip').isVisible());
   // Build 47f: the inner ring lights, the door's two halves swing open on the Observatory, then inside
   assert.match(await page.textContent('#storyText'),/light runs down the seam/);assert.equal(await page.getAttribute('#story','data-fx'),'seam');
   assert.ok(await page.locator('#story .storyVault:not([hidden])').isVisible(),tag('the door is drawn over the picture'));
   const closed=await page.locator('#story .vHalf.l').evaluate(e=>getComputedStyle(e).transform);assert.equal(closed,'none',tag('closed: the halves lie flat on the picture'));
   await page.locator('#storyNext').click();assert.equal(await page.getAttribute('#story','data-fx'),'open');assert.match(await page.textContent('#storyWho'),/Neri/);
   const open=await page.locator('#story .vHalf.l').evaluate(e=>getComputedStyle(e).transform);assert.notEqual(open,'none',tag('open: the halves have swung (reduced motion: at once)'));
   assert.equal(await page.locator('#story .vIn').evaluate(e=>getComputedStyle(e).opacity),'1',tag('the interior shows'));
   await page.locator('#storyNext').click();assert.match(await page.textContent('#storyText'),/Chapter 2 begins here/);assert.equal(await page.textContent('#storyNext'),'Enter the Vault');
   assert.ok(await page.locator('#story .storyVault').isHidden(),tag('inside: no door any more'));
   await page.locator('#storyNext').click();await page.waitForSelector('#story',{state:'hidden'});
   // Build 47d: inside, Chapter 2 begins with the Tide Archive's intro (no end card yet)
   const last=async()=>{for(let n=0;n<10&&await page.locator('#beat[open]').count();n++){const t=await page.locator('#beatNext').textContent();if(n>=1&&t==='Make the gold order')return t;await page.locator('#beatNext').click();await page.waitForTimeout(80);}return '';};
   assert.match(await page.locator('#beatContent').textContent(),/Records, floor to ceiling/,tag('the archive intro follows the reveal'));
   assert.equal(await last(),'Make the gold order',tag('the intro ends on the first objective'));await page.locator('#beatNext').click();
   {const g=(await save()).orders.find(o=>o?.story==='vault-archive');await page.waitForSelector(`#requests .requestCard.active[data-order="${g.id}"]`,{timeout:3000});
    assert.match(await page.textContent('#message'),/Light the archive: make 2 × Storm lantern/,tag('the first objective is said'));}
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
    await page.locator(`#requests [data-order="${gold.id}"]`).click();await page.waitForTimeout(150);await page.locator(`#hint[data-kind="deliver"]`).click({timeout:1500}).catch(()=>{});
    await page.waitForFunction(([k,id])=>!JSON.parse(localStorage.getItem(k)).orders.some(o=>o?.id===id),[KEY,gold.id],{timeout:5000});
    await page.locator('#mapButton').click();await page.waitForSelector('#coastMap[open]');
    if(st===1)assert.match(await page.locator('#coastMap .sceneBase').getAttribute('src'),/observatory-map\.webp$/,tag('the Observatory interior'));
    await page.locator('#coastMap [data-restore="vault-archive"]').click();await page.waitForTimeout(400);
    const said=await beats();if(st===2)assert.match(said,/same wave seal as on your letter/,tag('the seal links the letter and the archive'));
    if(st<3&&await page.locator('#coastMap[open]').count())await page.locator('#coastMap .close').click();
   }
   // Build 47e: the index read opens the Observatory's hall: no end card, the hall's gold order is out
   await page.waitForTimeout(1200);assert.equal(await page.locator('#endDialog[open]').count(),0,tag('no end card after the archive'));
   s=await save();assert.ok(s.orders.some(o=>o?.story==='obs-hall'),tag('the hall\'s gold order'));
   const set=async(built,materials,extra={})=>{await page.evaluate(([k,b,m,x])=>{const s=JSON.parse(localStorage.getItem(k));Object.assign(s.built,b);s.materials={...s.materials,...m};s.coins=5000;Object.assign(s,x);
     s.orders=s.orders.map(o=>{if(!o?.story)return o;const y={...o};delete y.story;return y;});localStorage.setItem(k,JSON.stringify(s));},[KEY,built,materials,extra]);
    await page.reload();await page.waitForSelector('#board .tile');await beats();};
   const obs=n=>({'obs-hall':n,'obs-desk':n,'obs-bench':n,'obs-array':n,'obs-passage':n});
   // the bench's first stage: the first Lens Bench, introduced with its chain
   await set({'obs-hall':3,'obs-desk':3},{'obs-bench':1});
   await page.locator('#mapButton').click();await page.waitForSelector('#coastMap[open]');
   assert.match(await page.locator('#coastMap .sceneBase').getAttribute('src'),/observatory-map\.webp$/);
   await page.locator('#coastMap [data-restore="obs-bench"]').click();await page.waitForTimeout(400);await beats();
   await page.waitForFunction(()=>/New generator: Lens Bench!/.test(document.querySelector('.moment')?.textContent??''),null,{timeout:5000});
   assert.match(await page.locator('.moment').textContent(),/Sea-glass chip → Polished blank/,tag('the Lens Bench\'s chain is shown'));
   s=await save();assert.equal([...s.board,...s.pending].filter(x=>x?.type==='source'&&x.id==='optic').length,1,tag('one Lens Bench'));
   if(await page.locator('#coastMap[open]').count())await page.locator('#coastMap .close').click();
   // inside the Vault the book has the Lens Bench's page (Chapter 1's book does not show it)
   await page.locator('#bookButton').click();await page.waitForSelector('#book[open]');assert.equal(await page.locator('#book .bookPage').count(),6,tag('a page for the Lens Bench'));
   assert.match(await page.locator('#book').textContent(),/Lens Bench/);await page.keyboard.press('Escape');
   // the sea gate's last stage waits for the array, says so, and shows the array (Build 47f)
   await set({...obs(3),'obs-array':2,'obs-passage':2},{'obs-array':3});
   await page.locator('#mapButton').click();await page.waitForSelector('#coastMap[open]');await page.locator('#coastMap .places [data-select="obs-passage"]').click();
   assert.match(await page.locator('#mapCard').textContent(),/Open the sea gate.*Finish the array first\..*It needs Wake the array \(stage 3 of 3\)/s,tag('the sea gate says what it waits for'));
   await page.locator('#mapCard [data-select="obs-array"]').click();assert.equal(await page.getAttribute('#mapCard','data-card'),'obs-array',tag('View array shows the array'));
   assert.match(await page.locator('#mapCard').textContent(),/Wake the array/);
   // no cut-out stands on the Observatory's picture, which already paints its furnishings
   assert.equal(await page.locator('#coastMap .beachScene[data-area="vault"] .restoredIcon').count(),0,tag('no duplicate furnishings'));
   // the array wakes: Tamsin's signal card (where it comes from, not who sends it)
   await page.locator('#coastMap [data-restore="obs-array"]').click();await page.waitForTimeout(300);
   for(let n=0;n<4&&!await page.locator('#beat[open] .vaultReveal').count();n++){await beats();await page.waitForTimeout(500);}
   assert.match(await page.textContent('#beatContent'),/A signal on one bearing.*Not who sends it/s,tag('the signal card'));
   assert.equal(await page.textContent('#beatNext'),'View sea gate');
   await page.locator('#beatNext').click();s=await save();assert.equal(s.seen['obs-signal'],true);
   await page.waitForSelector('#coastMap[open]');assert.equal(await page.getAttribute('#mapCard','data-card'),'obs-passage',tag('View sea gate shows the sea gate'));
   await page.locator('#coastMap .close').click();
   // the sea gate opens: the hidden harbour, then Chapter 2's end card
   await set({},{'obs-passage':3});
   await page.locator('#mapButton').click();await page.waitForSelector('#coastMap[open]');await page.locator('#coastMap [data-restore="obs-passage"]').click();await page.waitForTimeout(300);
   for(let n=0;n<4&&!await page.locator('#beat[open] .vaultReveal').count();n++){await beats();await page.waitForTimeout(500);}
   assert.match(await page.textContent('#beatContent'),/A hidden harbour/,tag('the harbour card'));await page.locator('#beatNext').click();
   await page.waitForSelector('#endDialog[open]',{timeout:5000});const end=await page.textContent('#endContent');
   assert.match(end,/Chapter 2 complete.*The sea gate is open/s);assert.match(end,/The Hidden Harbour is not available yet/);assert.doesNotMatch(end,/in development|Chapter 3/);
   assert.match(end,/Restoration stages\s*63 \/ 63/);assert.match(end,/Generator types found\s*\d/);assert.equal(await page.locator('#endContent button').count(),2,tag('Keep playing and Share feedback only'));
   s=await save();assert.equal(s.seenEnd,true);assert.equal(s.seen['obs-harbour'],true);
   await page.locator('#endContent [data-keep]').click();
   // reload: neither a reveal nor the end card again
   await page.reload();await page.waitForSelector('#board .tile');await page.waitForTimeout(800);
   assert.equal(await page.locator('#story:not([hidden])').count(),0,tag('the reveal plays once'));assert.equal(await page.locator('#endDialog[open]').count(),0);assert.equal(await beats(),'',tag('no intro again'));
   assert.deepEqual(errors,[],tag('no errors'));await context.close();}
   console.log(`${engine} Coast Camp Chapter 2 integration: finished save (old ending seen) → Vault door intro once → rings through gold orders → Vault opens once → Tide Archive (intro, seal line, three stages) → Observatory (Lens Bench, the sea gate waits for the array, signal, harbour) → Chapter 2 end card passed`);
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
