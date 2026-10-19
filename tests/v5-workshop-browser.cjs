const assert=require('node:assert/strict'),fs=require('node:fs');const {chromium}=require('playwright');
(async()=>{
 const out='test-artifacts/v5/workshop';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:390,height:844}}});
 try{
  const page=await context.newPage();page.setDefaultTimeout(8000);const errors=[],trace=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#workshop img',{state:'attached'});await page.evaluate(async()=>Promise.all([...document.images].map(x=>x.decode())));
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
  const shot=async name=>{await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${name}-390.png`,fullPage:true});};
  assert.equal(await page.locator('#workshop').getAttribute('data-state'),'damaged');await shot('01-damaged');
  await page.locator('#board [data-index="7"]').tap();await page.locator('#board [data-index="8"]').tap();await page.locator('#goalButton').tap();await page.waitForTimeout(1900);
  const goals=(await read()).requests.orders.filter(Boolean).map(o=>o.needs[0].family+':'+o.needs[0].tier);
  assert.equal(new Set(goals).size,3,'three request cards offer different main items');
  const shelf=await page.locator('#requests').boundingBox();assert.ok(shelf.height<=135,'request shelf stays compact at 390px');
  for(const c of await page.locator('.requestCard').all())assert.ok((await c.boundingBox()).height>=44,'request is a large tap target');
  await shot('01b-compact-variety');
  async function fulfill(lane,deliver=true){
   for(let step=0;step<100;step++){
    const a=await page.evaluate(async lane=>{
     const s=JSON.parse(localStorage.getItem('vaultwake-v5')),{requestProgress,reservedItems}=await import('/v5/requests.mjs');const o=s.requests.orders[lane],p=requestProgress(s,o);
     if(p.ready)return {type:'request',id:o.id};
     const r=p.progress.find(r=>r.current<r.count),kept=reservedItems(s);
     // Tide fragments share the chart family, but are not ordinary map scraps.
     for(let tier=r.tier-1;tier>=0;tier--){const pair=s.board.flatMap((x,i)=>x?.type==='item'&&(x.line??'')===(r.line??'')&&x.family===r.family&&x.tier===tier&&!kept.has(i)?[i]:[]);if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};}
     return {type:s.charges[r.family]?'produce':'service',index:s.board.findIndex(x=>x?.type==='source'&&x.id===r.family)};
    },lane);trace.push(a);
    const card=page.locator('#requests [data-request]').nth(lane);
    if(a.type==='request'){if(!deliver)return;await card.tap();await page.waitForTimeout(1900);return;}
    const before=await read();await card.tap();
    if(a.type==='merge'){await page.locator(`#board [data-index="${a.from}"]`).tap();await page.locator(`#board [data-index="${a.to}"]`).tap();}
    else{await page.locator(`#board [data-index="${a.index}"]`).tap();if(a.type==='service')await page.locator('[data-action="service"]').tap();}
    assert.ok((await read()).moves>before.moves,`Workshop strategy stalled: ${JSON.stringify(a)}; ${await page.locator('#message').textContent()}`);
   }
   throw Error('Request failed to finish');
  }
  for(const lane of [0,1,0,1])await fulfill(lane);
  let s=await read();assert.equal(s.requests.supplies,8);assert.equal(s.requests.completed,4);assert.ok(Object.values(s.taps).reduce((a,b)=>a+b,0)>0);await shot('02-earned-repair');
  const before=structuredClone(s);await page.locator('#workshop').tap();trace.push({type:'restoreWorkshop'});s=await read();assert.equal(s.requests.supplies,0);assert.equal(s.workshop.repaired,true);assert.deepEqual(s.board,before.board);assert.equal(s.stage,before.stage);
  await page.locator('#workshop img').evaluate(img=>img.decode());await page.waitForTimeout(1900);assert.match(await page.locator('#workshop img').getAttribute('src'),/operational/);
  assert.match(await page.locator('#workshop span').textContent(),/Press Grip/);
  assert.ok(await page.locator('#workshop').evaluate(el=>el.classList.contains('pressAvailable')),'press unlock is clearly visible');
  await shot('03-operational');
  const unavailable=await page.evaluate(async()=>{const {requestProgress}=await import('/v5/requests.mjs');const s=JSON.parse(localStorage.getItem('vaultwake-v5'));return requestProgress(s,s.requests.orders[2]).ready;});assert.equal(unavailable,false,'next request genuinely needs more production');
  const tools=[];
  for(let n=0;n<4;n++){
   s=await read();if(!s.charges.rig){await page.locator('#workshop').tap();await page.locator('[data-action="service"]').tap();s=await read();}
   const before=s;await page.locator('#workshop').tap();trace.push({type:'press'});s=await read();assert.equal(s.energy,before.energy-2);assert.equal(s.charges.rig,before.charges.rig-1);assert.equal(s.workshop.presses,n+1);
   const index=s.board.findIndex((x,i)=>x?.family==='rig'&&x.tier===1&&!before.board[i]);assert.ok(index>=0);tools.push(index);
  }
  await shot('04-pressed-tools');
  for(let n=0;n<4;n+=2){await page.locator(`#board [data-index="${tools[n]}"]`).tap();await page.locator(`#board [data-index="${tools[n+1]}"]`).tap();trace.push({type:'merge',from:tools[n],to:tools[n+1]});}
  // Pressing supplies the spanners; produce any remaining companion ingredient
  // through the real controls instead of assuming an unused map scrap remains.
  await fulfill(2,false);
  const long=page.locator('#requests [data-request]').nth(2);assert.match(await long.getAttribute('aria-label'),/Ready/);await shot('05-next-request-ready');await long.tap();trace.push({type:'request',lane:2});await page.waitForTimeout(1900);
  const saved=await read();assert.equal(saved.requests.completed,5);assert.equal(saved.requests.supplies,6);assert.equal(saved.workshop.presses,4);assert.ok(saved.board.some(x=>x?.family==='rig'&&x.tier===2),'expedition spanner remains protected');await page.reload();assert.deepEqual((await read()).workshop,saved.workshop);assert.deepEqual((await read()).requests,saved.requests);assert.deepEqual((await read()).board,saved.board);assert.equal(await page.locator('#workshop').getAttribute('data-state'),'operational');await shot('06-reloaded');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const box=await page.locator('#workshop').boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.deepEqual(errors,[]);
  fs.writeFileSync(`${out}/walkthrough.json`,JSON.stringify({trace,requests:saved.requests.completed,supplies:saved.requests.supplies,workshop:saved.workshop,taps:saved.taps,merges:saved.merges},null,2));
  await page.close();await context.close();console.log('Fresh-save request → repair → press → merge → request → reload passed at 390px');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
