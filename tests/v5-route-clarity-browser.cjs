// Fresh progression uses only visible controls. Legacy fixtures are isolated contexts.
const {chromium,webkit}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
const {kitAction,KIT_ACTIONS}=require('./v5-kit-browser.cjs');
(async()=>{
 const dir='test-artifacts/v5/route-clarity';fs.mkdirSync(dir,{recursive:true});
 for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{for(const width of [360,390,430])for(const route of ['ridge','conduit']){
 const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(7000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5'))),trace=[];
 const shot=async name=>{await page.locator(".moment").waitFor({state:"detached"});await page.locator(".deliveryReceipt").waitFor({state:"detached"});await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${dir}/${engine}-${route}-${name}-${width}.png`,fullPage:true});};
 const perform=async a=>{
 const before=await read();
 if(['merge','move'].includes(a.type)){
  await page.locator('#board').scrollIntoViewIfNeeded();
  const from=page.locator(`[data-index="${a.from}"]`),to=page.locator(`[data-index="${a.to}"]`);
  if(trace.length%2===0){const x=await from.boundingBox(),y=await to.boundingBox();await page.mouse.move(x.x+x.width/2,x.y+x.height/2);await page.mouse.down();await page.mouse.move(y.x+y.width/2,y.y+y.height/2,{steps:9});await page.mouse.up();}
  else{if(await from.getAttribute('aria-pressed')!=='true')await from.tap();await to.tap();}
 }else if(a.type==='goal'){if(before.landingStep===1)assert.match(await page.locator('#hint').textContent(),/CROSSING READY/,'ready objective takes priority over suggesting more producer pulls');await page.locator('#goalButton').tap();}
 else if(a.type==='produce'||a.type==='service'){const i=before.board.findIndex(x=>x?.type==='source'&&x.id===a.id);await page.locator(`[data-index="${i}"]`).tap();if(a.type==='service')await page.locator('[data-action="service"]').tap();}
 else if(a.type==='crate')await page.locator(`[data-index="${a.index}"]`).tap();
 else if(KIT_ACTIONS.includes(a.type))await kitAction(page,a);
 else if(a.type==='ration')await page.locator('#rationButton').tap();
 else if(a.type==='request')await page.locator(`[data-request="${a.id}"]`).tap();
 else if(a.type==='restoreWorkshop')await page.locator('#workshop').tap();
 else if(a.type==='buildPier')await page.locator('#goalButton').tap();
 else throw Error('Unexpected fresh action '+JSON.stringify(a));
 await page.waitForFunction(n=>JSON.parse(localStorage.getItem('vaultwake-v5')).moves>n,before.moves);await page.waitForTimeout(330);trace.push(a);
 };
 await perform({type:'merge',from:7,to:8});
 for(let n=0;(await read()).stage<1&&n<80;n++){
 const a=await page.evaluate(async()=>{const {choose}=await import('/tests/v5-policy.mjs');return choose(JSON.parse(localStorage.getItem('vaultwake-v5')),{sideFirst:false,decode:false});});await perform(a);
 }
 const saved=await read();assert.equal(saved.stage,1);assert.ok(saved.merges>1);
 assert.equal(await page.locator('.surveyGhost,.surveyRay,.surveyMark').count(),0);
 assert.equal(await page.locator('#sealStates').isVisible(),false);assert.equal(await page.locator('.routeChoice').count(),2);assert.equal(await page.locator('.moment').count(),0,'prepared tools reveal routes without an instructional popup');
 assert.match(await page.locator('.routeChoice[data-route="ridge"]').textContent(),/Split spanner/);assert.match(await page.locator('.routeChoice[data-route="conduit"]').textContent(),/Sight lens/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 for(const b of await page.locator('.routeChoice').all()){const r=await b.boundingBox();assert.ok(r.width>=44&&r.height>=44);assert.equal(await b.locator('.art').first().evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');}
 await shot('choice');
 if(engine==='chromium'&&width===390&&route==='ridge'){
 // Same genuinely earned board, rendered by the previous build for an exact comparison.
 const base=await context.newPage();await base.goto('http://127.0.0.1:8081/v5/');await base.evaluate(s=>localStorage.setItem('vaultwake-v5',JSON.stringify(s)),saved);await base.reload();await base.waitForSelector('#board .tile');await base.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));await base.screenshot({path:`${dir}/before-choice-390.png`,fullPage:true});await base.close();
 }
 await page.reload();assert.deepEqual(await read(),saved);assert.equal(await page.locator("#message").textContent(),"","reload does not repeat the obsolete landing instruction");
 await page.locator(`.routeChoice[data-route="${route}"]`).tap();await page.waitForTimeout(600);
 const after=await read();assert.equal(after.stage,2);assert.equal(after.expedition.route,route);assert.ok(after.seals.navigation);
 const family=route==='ridge'?'rig':'chart',count=(s,f)=>s.board.filter(x=>x?.family===f&&x.tier===2).length;
 assert.equal(count(after,family),count(saved,family)-1);assert.equal(count(after,family==='rig'?'chart':'rig'),count(saved,family==='rig'?'chart':'rig'));
 assert.equal(await page.locator('.source.locked').count(),0);await shot('opened');await page.reload();assert.deepEqual(await read(),after);
 assert.deepEqual(errors,[]);fs.writeFileSync(`${dir}/${engine}-${route}-${width}-trace.json`,JSON.stringify({actions:trace,route,merges:after.merges,energy:after.energy,occupied:after.board.filter(Boolean).length},null,2));
 // Mid-survey legacy snapshot: real earned board plus persisted Workshop upgrades.
 if(width===390){const legacy=structuredClone(saved);legacy.workshop={version:1,repaired:true,precision:route==='conduit',presses:3,fittings:0};legacy.requests.supplies=17;
 const lens=legacy.board.findIndex(x=>x?.family==='chart'&&x.tier===2);[legacy.board[lens],legacy.board[6]]=[legacy.board[6],legacy.board[lens]];
 await page.evaluate(s=>localStorage.setItem('vaultwake-v5',JSON.stringify(s)),legacy);await page.reload();assert.deepEqual(await read(),legacy);
 await page.locator(`.routeChoice[data-route="${route}"]`).tap();await page.waitForTimeout(500);assert.equal((await read()).stage,2);assert.deepEqual((await read()).workshop,legacy.workshop);assert.equal((await read()).requests.supplies,17);
 }
 await context.close();console.log(engine,width,route,'fresh tap/drag → route → reward → reload; legacy save passed');
 }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
