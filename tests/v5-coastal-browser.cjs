const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {read,perform}=require('./v5-coastal-browser-actions.cjs');
(async()=>{
 const engine=process.env.COASTAL_ENGINE??'chromium';const browser=await ({chromium,webkit}[engine]).launch();
 try{for(const [width,specialty] of [[360,'rig'],[390,'chart'],[430,'flux']]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});page.setDefaultTimeout(9000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');
  const shot=async name=>{
   await page.waitForFunction(()=>!document.querySelector('.moment,.deliveryReceipt'));
   await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
   await page.evaluate(()=>scrollTo(0,0));
   console.log('COASTAL_SCREENSHOT',`${engine}-${width}-${name}`,(await page.screenshot({type:'jpeg',quality:65,fullPage:true})).toString('base64'));
  };
  const geometry=async()=>{
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const rects=await page.locator('#scene button').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return {id:n.id,x:r.x,y:r.y,w:r.width,h:r.height};}));
   for(const a of rects){assert.ok(a.w>=44&&a.h>=44,JSON.stringify(a));for(const b of rects)if(a.id<b.id)assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),JSON.stringify({a,b}));}
   const board=await page.locator('#board .tile').first().boundingBox();assert.ok(board.width>=44&&board.height>=44);
  };
  let checkpoint=false;await shot('fresh');
  for(let n=0;!(await read(page)).discovered.includes('chart:tide:4')&&n<350;n++){
   const s=await read(page);const a=await page.evaluate(async options=>{
    const {coastalAction}=await import('/tests/v5-coastal-policy.mjs');return coastalAction(JSON.parse(localStorage.getItem('vaultwake-v5')),options);
   },{specialty,route:specialty==='flux'?'conduit':'ridge',receiver:specialty==='chart'?'relay':'scope'});
   await perform(page,a);
   if(a.type==='restoreWorkshop'){assert.ok((await read(page)).discovered.includes('chart:tide:1'));await shot('working-camp');}
   if(a.type==='prepareInstrument'){assert.equal((await read(page)).journey.instrument,specialty);await geometry();}
   if(!checkpoint&&(await read(page)).camp.loft){checkpoint=true;const saved=await read(page);await page.reload();assert.deepEqual(await read(page),saved);await geometry();}
  }
  const earned=await read(page);assert.equal(earned.stage,4);assert.ok(earned.discovered.includes('chart:tide:4'));assert.equal(earned.camp.fleetViewed,undefined);
  await geometry();await shot('fleet-earned');
  await page.reload();assert.equal((await read(page)).camp.fleetViewed,undefined);
  await page.locator('#fleetCrown').tap();assert.ok(await page.locator('#fleetReveal').isVisible());await shot('reveal');
  for(let n=0;await page.locator('#fleetReveal').isVisible()&&n<5;n++)await page.locator('#fleetNext').tap();
  assert.equal((await read(page)).camp.fleetViewed,true);const viewed=await read(page);await page.reload();assert.deepEqual(await read(page),viewed);assert.equal(await page.locator('#fleetReveal').isVisible(),false);
  await geometry();assert.deepEqual(errors,[]);
  console.log('COASTAL_BROWSER_METRICS',JSON.stringify({engine,width,specialty,actions:earned.moves,merges:earned.merges,orders:earned.requests.completed,rations:earned.rations}));
  await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
