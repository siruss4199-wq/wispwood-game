// Fresh runs use UI inputs only. Old-save injection is confined to migration cases.
const {chromium,webkit}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const dir='test-artifacts/v5/stage2-rescue';fs.mkdirSync(dir,{recursive:true});
 for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{
 for(const width of [360,390,430])for(const [route,receiver,findStrategy]of [['ridge','relay','recover'],['conduit','scope','restore']]){
 const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce',...(width===390?{recordVideo:{dir,size:{width,height:844}}}:{})});
 const page=await context.newPage(),errors=[],trace=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(7000);
 await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
 const shot=async name=>{if(width!==390)return;await page.locator('.moment,.deliveryReceipt').first().waitFor({state:'detached'});await page.evaluate(async()=>Promise.all([...document.images].map(x=>x.decode().catch(()=>{}))));await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${dir}/${engine}-${route}-${name}-390.png`,fullPage:true});};
 const options={route,receiver,findStrategy,sideFirst:false,decode:false};
 const perform=async a=>{
 const before=await read();
 if(a.type==='merge'||a.type==='move'){
  await page.locator('#board').scrollIntoViewIfNeeded();const from=page.locator(`[data-index="${a.from}"]`),to=page.locator(`[data-index="${a.to}"]`);
  if(trace.length%2){if(await from.getAttribute('aria-pressed')!=='true')await from.tap();await to.tap();}
  else {const x=await from.boundingBox(),y=await to.boundingBox();await page.mouse.move(x.x+x.width/2,x.y+x.height/2);await page.mouse.down();await page.mouse.move(y.x+y.width/2,y.y+y.height/2,{steps:9});await page.mouse.up();}
 }else if(a.type==='goal')await page.locator('#goalButton').tap();
 else if(a.type==='breach')await page.locator(`[data-route="${route}"]`).tap();
 else if(a.type==='produce'||a.type==='service'){
  const i=before.board.findIndex(x=>x?.type==='source'&&x.id===a.id);await page.locator(`[data-index="${i}"]`).tap();if(a.type==='service')await page.locator('[data-action="service"]').tap();
 }else if(a.type==='ration')await page.locator('#rationButton').tap();
 else if(a.type==='crate')await page.locator(`[data-index="${a.index}"]`).tap();
 else{
  const index=a.index??20,slot=page.locator(`[data-engine-action="${a.type}"][data-site-index="${index}"]`);
  if(await slot.count())await slot.tap();
  else {const tile=page.locator(`#board [data-index="${index}"]`);if(await tile.getAttribute('aria-pressed')!=='true')await tile.tap();if((await read()).moves===before.moves)await page.locator(`[data-action="${a.type}"]`).tap();}
 }
 await page.waitForFunction(n=>JSON.parse(localStorage.getItem('vaultwake-v5')).moves>n,before.moves);const after=await read();assert.equal(after.moves,before.moves+1,JSON.stringify(a));trace.push(a);await page.waitForTimeout(340);
 if(await page.locator('#celebration').isVisible())await page.locator('#celebration .continue').tap();
 assert.equal(await page.locator('.sealWire,.turnCue,.saltglassRib,.emitterPort,.receiverPort,.lensPlane').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 return after;
 };
 try{
 for(let n=0;n<160&&(await read()).stage<4;n++){
  const before=await read(),a=await page.evaluate(async options=>{const {choose}=await import('/tests/v5-policy.mjs');return choose(JSON.parse(localStorage.getItem('vaultwake-v5')),options);},options);
  if(['prime','power','restore','clear'].includes(a.type))await shot('before-'+a.type);
  const after=await perform(a);
  if(['breach','deploy','restore','clear','prime','power'].includes(a.type))await shot('after-'+a.type+'-'+(a.index??20));
  if(a.type==='prime'){assert.match(await page.locator('#goalTitle').textContent(),/Wake the ring engine/);assert.ok(await page.locator('[data-engine-action="power"]').count());}
  if(a.type==='power'){assert.equal(after.stage,3);assert.equal(await page.locator('.enginePowered').count(),1);assert.match(await page.locator('.premiumScene').getAttribute('src'),/powered/);}
 }
 const saved=await read();assert.equal(saved.stage,4);assert.ok(saved.merges>1);assert.ok(trace.some(x=>x.type==='produce'));assert.ok(trace.some(x=>x.type==='prime'));assert.ok(trace.some(x=>x.type==='power'));
 await shot('vault-open');await page.reload();assert.deepEqual(await read(),saved);assert.deepEqual(errors,[]);
 for(const tile of await page.locator('#board .tile').all()){const b=await tile.boundingBox();assert.ok(b.width>=44&&b.height>=44);}
 fs.writeFileSync(`${dir}/${engine}-${route}-${width}-trace.json`,JSON.stringify({route,receiver,findStrategy,actions:trace,merges:saved.merges,energy:saved.energy,taps:saved.taps},null,2));
 if(width===390){
 for(const phase of ['primed','connected','completed']){
  const old=JSON.parse(fs.readFileSync(`tests/fixtures/stage2/${route}-${phase}.json`));
  await page.evaluate(s=>localStorage.setItem('vaultwake-v5',JSON.stringify(s)),old);await page.reload();const migrated=await read();assert.equal(migrated.stage,old.stage);assert.equal(migrated.energy,old.energy);assert.equal(migrated.seals.optics.primed,true);
  if(phase==='primed'&&engine==='chromium'){
   const base=await context.newPage();await base.goto('http://127.0.0.1:8081/v5/');await base.evaluate(s=>localStorage.setItem('vaultwake-v5',JSON.stringify(s)),old);await base.reload();await base.waitForSelector('#board .tile');await base.evaluate(async()=>Promise.all([...document.images].map(x=>x.decode().catch(()=>{}))));await base.screenshot({path:`${dir}/${route}-before-optics-390.png`,fullPage:true});await base.close();await shot('legacy-charge-retained');
  }
  if(phase!=='completed'){const target=migrated.board.findIndex(x=>x?.type==='site'&&x.kind!=='winch'&&x.phase==='done');await perform({type:'power',index:target});await perform({type:'goal'});assert.equal((await read()).stage,4);}
  const again=await read();await page.reload();assert.deepEqual(await read(),again);
 }
 }
 console.log(engine,width,route,receiver,'fresh merges → lift → receiver → charge → power → vault → reload; old saves passed');
 }catch(e){await page.screenshot({path:`${dir}/${engine}-${route}-${width}-failure.png`,fullPage:true});fs.writeFileSync(`${dir}/${engine}-${route}-${width}-failure.json`,JSON.stringify({trace,state:await read(),message:await page.locator('#message').textContent(),errors},null,2));throw e;}
 finally{await context.close();}
 }
 }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
