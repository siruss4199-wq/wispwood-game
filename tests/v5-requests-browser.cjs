const assert=require('node:assert/strict'),fs=require('node:fs');const {chromium}=require('playwright');
(async()=>{fs.mkdirSync('test-artifacts/v5/requests',{recursive:true});const browser=await chromium.launch();try{for(const width of [360,390,430]){
 const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true,reducedMotion:width===390?'no-preference':'reduce'});page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');await page.evaluate(async()=>Promise.all([...document.images].map(x=>x.decode())));
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
 const shot=async name=>{await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-artifacts/v5/requests/${name}-${width}.png`,fullPage:true});};
 await shot('fresh');
 await page.locator('#board [data-index="7"]').tap();await page.locator('#board [data-index="8"]').tap();await page.locator('#goalButton').tap();await page.waitForTimeout(1800);
 assert.equal((await read()).landingStep,1);assert.equal(await page.locator('#requests [data-request]').count(),3);await shot('before');
 const timeline=[];
 for(const lane of [0,1,0,2,1,0]){
  let delivered=false;
  for(let step=0;step<100;step++){
   const decision=await page.evaluate(async lane=>{
    const s=JSON.parse(localStorage.getItem('vaultwake-v5'));const {requestProgress,reservedItems}=await import('/v5/requests.mjs');const o=s.requests.orders[lane],p=requestProgress(s,o);
    if(p.ready)return {type:'deliver',id:o.id,supplies:o.supplies,energy:Math.min(o.energy,120-s.energy)};
    const need=p.progress.find(r=>r.current<r.count),kept=reservedItems(s);
    for(let t=need.tier-1;t>=0;t--){const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===need.family&&x.tier===t&&!kept.has(i)?[i]:[]);if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};}
    const index=s.board.findIndex(x=>x?.type==='source'&&x.id===need.family);return {type:s.charges[need.family]?'produce':'service',index};
   },lane);
   timeline.push(decision);
   if(decision.type==='deliver'){
    const before=await read(),card=page.locator(`#requests [data-request="${decision.id}"]`);await shot('ready');await card.tap();
    if(width===390)await page.waitForTimeout(130);await shot('delivery');await page.waitForTimeout(900);
    const after=await read();assert.equal(after.requests.supplies,before.requests.supplies+decision.supplies);assert.equal(after.energy,before.energy+decision.energy);assert.notEqual(after.requests.orders[lane].id,decision.id);await shot('replacement');await page.reload();assert.deepEqual((await read()).requests,after.requests);delivered=true;break;
   }
   // Clear selection through the request, then exercise real board taps.
   await page.locator('#requests [data-request]').nth(lane).tap();
   if(decision.type==='merge'){await page.locator(`#board [data-index="${decision.from}"]`).tap();await page.locator(`#board [data-index="${decision.to}"]`).tap();}
   else {await page.locator(`#board [data-index="${decision.index}"]`).tap();if(decision.type==='service')await page.locator('[data-action="service"]').tap();}
   await page.waitForTimeout(80);
  }
  assert.ok(delivered,'request loop must complete');
 }
 const s=await read();assert.equal(s.requests.completed,6);assert.ok(Object.values(s.taps).reduce((a,b)=>a+b,0)>0);assert.ok(s.merges>1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 for(const card of await page.locator('#requests [data-request]').all()){const box=await card.boundingBox();assert.ok(box.width>=44&&box.height>=44);}
 fs.writeFileSync(`test-artifacts/v5/requests/trace-${width}.json`,JSON.stringify({timeline,completed:s.requests.completed,supplies:s.requests.supplies,merges:s.merges,taps:s.taps},null,2));assert.deepEqual(errors,[]);await page.close();console.log('Requests real production/merge/deliver/reload',width,'passed');
 }}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
