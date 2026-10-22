const assert=require('node:assert/strict'),fs=require('node:fs');
const {kitAction,KIT_ACTIONS}=require('./v5-kit-browser.cjs');
const {chromium}=require('playwright');
(async()=>{
 const out='test-artifacts/v5/workshop-evolution';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();let legacy,completed;
 try{for(const mode of ['fresh','legacy']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:390,height:844}}});
  if(mode==='legacy')await context.addInitScript(raw=>localStorage.setItem('vaultwake-v5',raw),JSON.stringify(legacy));
  const page=await context.newPage(),errors=[],trace=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#workshop',{state:'attached'});
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
  const shot=async(name,top=true)=>{if(top)await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(500);await page.evaluate(async()=>Promise.all([...document.images].map(x=>x.decode())));await page.screenshot({path:`${out}/${mode}-${name}-390.png`,fullPage:true});};
  const lineage=new Set();let deliveredFitting=false,fittingShots=false;
  async function execute(a){
   const before=await read();trace.push(a);
   if(a.type==='request'){
    const indices=await page.evaluate(async id=>{const {requestProgress}=await import('/v5/requests.mjs'),s=JSON.parse(localStorage.getItem('vaultwake-v5'));return requestProgress(s,s.requests.orders.find(o=>o.id===id)).indices;},a.id);
    if(indices.some(i=>lineage.has(i)))deliveredFitting=true;
    const card=page.locator(`[data-request="${a.id}"]`);await card.tap();await page.waitForTimeout(1850);
   }else if(a.type==='merge'){
    const fitted=lineage.has(a.from)||lineage.has(a.to);lineage.delete(a.from);lineage.delete(a.to);
    await page.locator(`[data-index="${a.from}"]`).tap();await page.locator(`[data-index="${a.to}"]`).tap();if(fitted)lineage.add(a.to);
   }else if(a.type==='fitSpanner'){
    await page.locator('#workshopBench').tap();assert.ok(await page.locator('.benchRoute').isVisible());
    if(!fittingShots)await shot('04-fitting-requirements',false);
    const inputs=await page.evaluate(async()=>{const {benchInputs}=await import('/v5/workshop.mjs');return benchInputs(JSON.parse(localStorage.getItem('vaultwake-v5')));});
    await page.locator('[data-action="fitSpanner"]').tap();const after=await read();
    assert.equal(after.energy,before.energy-1);assert.equal(after.charges.rig,before.charges.rig,'charges are retired');assert.deepEqual(after.taps,before.taps);
    assert.equal(after.board[inputs[0]].tier,2);assert.equal(after.board[inputs[1]],null);lineage.add(inputs[0]);
    if(!fittingShots){await page.waitForTimeout(750);await shot('05-fitted-spanner');fittingShots=true;}
   }else if(a.type==='press')await page.locator('#workshop').tap();
   else if(KIT_ACTIONS.includes(a.type))await kitAction(page,a);
   else{
    const index=before.board.findIndex(x=>x?.type==='source'&&x.id===a.id);await page.locator(`[data-index="${index}"]`).tap();
    if(a.type==='service')await page.locator('[data-action="service"]').tap();
   }
   const after=await read();assert.ok(after.moves>before.moves,JSON.stringify(a));
  }
  async function fulfill(lane){for(let n=0;n<100;n++){
   const a=await page.evaluate(async lane=>{const {requestAction}=await import('/tests/v5-workshop-policy.mjs');return requestAction(JSON.parse(localStorage.getItem('vaultwake-v5')),lane);},lane);
   // Focus the unfinished order before picking its next pair. A prior merge
   // leaves its output selected; tapping that output again would deselect it.
   if(a.type!=='request')await page.locator('#requests [data-request]').nth(lane).tap();
   await execute(a);if(a.type==='request')return;
  }throw Error('request policy stalled');}
  if(mode==='fresh'){
   await execute({type:'merge',from:7,to:8});await page.locator('#goalButton').tap();await page.waitForTimeout(1850);
   for(let n=0;(await read()).requests.supplies<8;n++){assert.ok(n<12);await fulfill(n%2);}
   await page.locator('#workshop').tap();await page.waitForTimeout(1850);assert.equal((await read()).workshop.repaired,true);
   legacy=await read();delete legacy.workshop.precision;delete legacy.workshop.fittings;
  }else{assert.equal((await read()).workshop.repaired,true);assert.equal((await read()).workshop.precision,false);}
  await shot('01-operational');
  for(let n=0;(await read()).requests.supplies<12;n++){assert.ok(n<12);await fulfill(n%3);}
  await shot('02-upgrade-available');
  // Workshop tap still presses; inspecting the bench never purchases anything.
  let s=await read();if(!s.charges.rig)await execute({type:'service',id:'rig'});
  s=await read();await execute({type:'press',id:'rig'});assert.equal((await read()).requests.supplies,s.requests.supplies);assert.equal((await read()).workshop.precision,false);
  await page.locator('#workshopBench').tap();assert.equal((await read()).requests.supplies,s.requests.supplies);
  assert.ok(await page.locator('[data-action="upgradeWorkshop"]').evaluate(el=>el.classList.contains('available')),'affordable upgrade is visually actionable');
  const before=await read();await page.locator('[data-action="upgradeWorkshop"]').tap();trace.push({type:'upgradeWorkshop'});let upgraded=await read();
  assert.equal(upgraded.requests.supplies,before.requests.supplies-12);assert.deepEqual(upgraded.board,before.board);assert.deepEqual(upgraded.requests.orders,before.requests.orders);
  assert.equal(upgraded.workshop.precision,true);assert.equal(await page.locator('#workshop').getAttribute('data-state'),'precision');assert.equal(await page.locator('.benchFitting').count(),1);
  await page.waitForTimeout(1850);await shot('03-bench-installed');
  const supported=upgraded.requests.orders.findIndex(o=>o.needs.some(r=>r.family==='rig'&&r.tier===2));
  if(supported>=0)await fulfill(supported);
  for(let n=0;n<6&&!deliveredFitting;n++)await fulfill(n%3);
  // The first fitted Spanner is still expedition-protected. When its first
  // real replacement order is now pending, finish that order with a *spare*
  // instead of stopping the walkthrough at an arbitrary six deliveries.
  if(!deliveredFitting){
   const pending=await read(),lane=pending.requests.orders.findIndex(o=>o?.needs.some(r=>r.family==='rig'&&r.tier===2&&!r.line));
   if(lane>=0)await fulfill(lane);
  }
  if(!deliveredFitting){
   const diagnostic=await read();
   console.log('TT1I_BENCH_TRACE',JSON.stringify({mode,completed:diagnostic.requests.completed,sequences:diagnostic.requests.sequences,orders:diagnostic.requests.orders,workshop:diagnostic.workshop,kept:[...lineage],trace:trace.slice(-48)}));
  }
  assert.ok(deliveredFitting,'a manufactured spanner or its merged descendant is consumed by a real request');
  completed=await read();assert.ok(completed.workshop.fittings>0);await shot('06-request-delivered');
  // Remove the legacy init script by reusing storage in a clean page context.
  await context.close();const reloaded=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const rp=await reloaded.newPage();await rp.goto('http://127.0.0.1:8080/v5/');await rp.evaluate(raw=>localStorage.setItem('vaultwake-v5',raw),JSON.stringify(completed));await rp.reload();
  const saved=await rp.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));assert.deepEqual(saved.workshop,completed.workshop);assert.deepEqual(saved.requests,completed.requests);assert.deepEqual(saved.board,completed.board);
  for(const width of [360,390,430]){await rp.setViewportSize({width,height:844});await rp.locator('#workshopBench').tap();
   assert.equal(await rp.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   for(const selector of ['#workshopBench','[data-action="fitSpanner"]']){const b=await rp.locator(selector).boundingBox();assert.ok(b&&b.width>=44&&b.height>=44,selector);}
   assert.equal(await rp.locator('[data-action="press"]').count(),0,'Bench screen must not duplicate producer actions');
   await rp.screenshot({path:`${out}/${mode}-layout-${width}.png`,fullPage:true});
   const rover=(await rp.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')))).board.findIndex(x=>x?.type==='source'&&x.id==='rig');
   await rp.locator(`#board [data-index="${rover}"]`).tap();
   assert.equal(await rp.locator('.benchRoute').count(),0,'Selecting the producer must not open the Bench recipe');
   assert.ok(await rp.locator('[data-action="produce"],[data-action="service"]').count(),'Rover retains a playable producer/refill action');
  }
  await reloaded.close();assert.deepEqual(errors,[]);
  fs.writeFileSync(`${out}/${mode}-trace.json`,JSON.stringify({mode,trace,requests:completed.requests.completed,supplies:completed.requests.supplies,workshop:completed.workshop,taps:completed.taps,merges:completed.merges,occupied:completed.board.filter(Boolean).length},null,2));
  console.log(`${mode}: request → repair → earn → install → fit → deliver → reload passed; requests=${completed.requests.completed}, fittings=${completed.workshop.fittings}`);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
