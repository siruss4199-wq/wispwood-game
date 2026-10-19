// Real mobile controls: earn camp currency, repair, build the Pier, buy a targeted pack.
// No direct inventory/currency injection in fresh gameplay.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
(async()=>{
 const dir='test-artifacts/v5/camp-pier';fs.mkdirSync(dir,{recursive:true});
 for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await browserType.launch();
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
   const page=await context.newPage();page.setDefaultTimeout(9000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
   const shot=async name=>{await page.evaluate(async()=>Promise.all([...document.images].map(x=>x.decode().catch(()=>{}))));await page.evaluate(()=>scrollTo(0,0));if(name==='06-loft-built'||name==='08-treasure-delivered')await page.screenshot({path:`${dir}/${engine}-${name}-moment-390.png`,fullPage:true});await page.waitForFunction(()=>!document.querySelector('.moment,.deliveryReceipt'));await page.screenshot({path:`${dir}/${engine}-${name}-390.png`,fullPage:true});};
   await page.locator('#board [data-index="7"]').tap();await page.locator('#board [data-index="8"]').tap();await page.locator('#goalButton').tap();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5')).landingStep===1);
   let actions=0,deliveries=0;
   const requestStep=async (lane,override)=>{
    const before=await read();
    const action=override??await page.evaluate(async lane=>{
     const {requestAction}=await import('/tests/v5-workshop-policy.mjs');
     return requestAction(JSON.parse(localStorage.getItem('vaultwake-v5')),lane);
    },lane);
    if(action.type==='request'){
     await page.locator(`#requests [data-request="${action.id}"]`).tap();deliveries++;
    }else if(action.type==='merge'){
     const from=page.locator(`#board [data-index="${action.from}"]`),to=page.locator(`#board [data-index="${action.to}"]`);
     if(await from.getAttribute('aria-pressed')!=='true'){
      const prior=page.locator('#board .selected.item,#board .selected.glyph,#board .selected.brace');
      if(await prior.count())await prior.tap();
      await from.tap();
     }
     await to.tap();
    }else if(action.type==='produce'||action.type==='service'){
     const source=before.board.findIndex(x=>x?.type==='source'&&x.id===action.id);
     await page.locator(`#board [data-index="${source}"]`).tap();
     if(action.type==='service')await page.locator('#selection [data-action="service"]').tap();
    }else if(action.type==='recoverTide'){await page.locator('#campPierWorld').tap();await page.locator('#selection [data-action="recoverTide"]').tap();}else if(action.type==='ration'){await page.locator('#rationButton').tap();}
    else throw Error('Unexpected camp-order policy '+JSON.stringify(action));
    try{await page.waitForFunction(n=>JSON.parse(localStorage.getItem('vaultwake-v5')).moves>n,before.moves,{timeout:4000});}
    catch(error){
     const after=await read();
     throw Error(JSON.stringify({engine,actions,deliveries,action,before:{moves:before.moves,energy:before.energy,supplies:before.requests.supplies,board:before.board,orders:before.requests.orders},after:{moves:after.moves,energy:after.energy,supplies:after.requests.supplies},message:await page.locator('#message').textContent()},null,2));
    }
    actions++;assert.ok(actions<400,'camp Pier must be reachable via ordinary orders');
   };
   // Build the required Workshop from genuinely earned orders first.
   while(!(await read()).workshop.repaired){
    const state=await read();
    if(state.requests.supplies>=8){await page.locator('#workshop').tap();break;}
    await requestStep(deliveries%2);
   }
   assert.equal((await read()).workshop.repaired,true);
   for(let guard=0;(await read()).requests.supplies<12;guard++){
    assert.ok(guard<125,'12 supplies should not require grinding');
    await requestStep(deliveries%3);
   }
   assert.ok(await page.locator('[data-camp-action="buildPier"]').isVisible());
   const before=await read();await shot('01-ready-to-build');
   await page.locator('[data-camp-action="buildPier"]').tap();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5')).camp.pier);
   let state=await read();assert.equal(state.requests.supplies,before.requests.supplies-12);
   assert.equal(state.camp.packs,1);assert.ok(await page.locator('#campPierWorld').isVisible());
   assert.ok(state.board.filter(x=>x?.type==='crate').length>before.board.filter(x=>x?.type==='crate').length);
   await shot('02-pier-built');
   for(let guard=0;(await read()).requests.supplies<8;guard++){
    assert.ok(guard<115,'targeted supplies should be purchasable with normal requests');
    await requestStep(deliveries%3);
   }
   // A restock follows the unmet requirement of the selected camp order.
   const old=await read();
   let candidate=old.requests.orders.find(o=>o&&!o.needs.some(r=>r.family==='flux'&&old.stage<2));
   for(const order of old.requests.orders){
    const ready=await page.evaluate(async id=>{const {requestProgress}=await import('/v5/requests.mjs');const s=JSON.parse(localStorage.getItem('vaultwake-v5'));return requestProgress(s,s.requests.orders.find(o=>o.id===id)).ready;},order.id);
    if(!ready){candidate=order;break;}
   }
   if(candidate){const card=page.locator(`[data-request="${candidate.id}"]`);await card.tap();}
   for(let guard=0;(await read()).board.filter(x=>x?.type==='crate').length>=3;guard++){
    assert.ok(guard<4,'opening existing cases should free the restock slot');
    await page.locator('#board .tile.crate').first().tap();
   }
   state=await read();const family=await page.locator('[data-camp-action="packPier"]').getAttribute('data-family');
   assert.ok(['rig','chart','flux'].includes(family));
   assert.equal((await page.locator('#requests').boundingBox()).y<(await page.locator('#board').boundingBox()).y,true);
   await shot('03-targeted-order-case');
   await page.locator('[data-camp-action="packPier"]').tap();
   const packed=await read();assert.equal(packed.requests.supplies,state.requests.supplies-8);
   assert.equal(packed.camp.packs,state.camp.packs+1);
   const kind={rig:'salvage',chart:'survey',flux:'relic'}[family];
   assert.ok(packed.board.some((x,i)=>x?.type==='crate'&&x.kind===kind&&JSON.stringify(x)!==JSON.stringify(state.board[i])),'new targeted case appears on board');
   await shot('04-case-delivered');
   const requestBox=await page.locator('#requests').boundingBox(),boardBox=await page.locator('#board').boundingBox();
   assert.ok(requestBox.y+requestBox.height<=boardBox.y,'orders remain above full-sized merge board');
   const tile=await page.locator('#board .tile.item').first().boundingBox();assert.ok(tile.width>=44&&tile.height>=44);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.reload();assert.deepEqual(await read(),packed);assert.ok(await page.locator('#campPierWorld').isVisible());
   const preLoftActions=actions;let low=36,high=0;
   while((await read()).requests.supplies<20){await requestStep(deliveries%3);const n=(await read()).board.filter(Boolean).length;low=Math.min(low,n);high=Math.max(high,n);}
   const ready=await read();await page.locator('#campPierWorld').tap();await shot('05-loft-upgrade-ready');
   await page.locator('#selection [data-action="buildLoft"]').tap();
   let upgraded=await read();assert.equal(upgraded.camp.loft,true);assert.equal(upgraded.requests.supplies,ready.requests.supplies-20);assert.deepEqual(upgraded.requests.orders,ready.requests.orders);
   await shot('06-loft-built');
   // Finish the existing Standard order: replacements, never pending orders, introduce treasure.
   const oldId=upgraded.requests.orders[1].id;
   while((await read()).requests.orders[1].id===oldId)await requestStep(1);
   assert.equal((await read()).requests.orders[1].needs[0].line,'tide');
   await page.locator(`#requests [data-request="${(await read()).requests.orders[1].id}"]`).tap();await shot('07-treasure-order');
   const treasureId=(await read()).requests.orders[1].id;
   while((await read()).requests.orders[1].id===treasureId)await requestStep(1);
   assert.ok((await read()).camp.dives+(await read()).camp.earlyFragments>=2);assert.ok((await read()).discovered.includes('chart:tide:1'));await shot('08-treasure-delivered');
   // Discover the top collectible using real production and merges, including a pointer drag.
   let dragged=false;
   for(let guard=0;!(await read()).board.some(x=>x?.line==='tide'&&x.tier===2);guard++){
    assert.ok(guard<25);const current=await read();let pair;
    for(const tier of [1,0]){const ids=current.board.flatMap((x,i)=>x?.line==='tide'&&x.tier===tier?[i]:[]);if(ids.length>=2){pair=ids.slice(0,2);break;}}
    if(pair){
     const a=page.locator(`#board [data-index="${pair[0]}"]`),b=page.locator(`#board [data-index="${pair[1]}"]`);
     if(!dragged){await a.scrollIntoViewIfNeeded();const x=await a.boundingBox(),y=await b.boundingBox();await page.mouse.move(x.x+x.width/2,x.y+x.height/2);await page.mouse.down();await page.mouse.move(y.x+y.width/2,y.y+y.height/2,{steps:10});await page.mouse.up();dragged=true;}
     else{const prior=page.locator('#board .selected.item');if(await prior.count())await prior.tap();await a.tap();await b.tap();}
    }else if(!current.charges.chart){const index=current.board.findIndex(x=>x?.type==='source'&&x.id==='chart');await page.locator(`#board [data-index="${index}"]`).tap();await page.locator('#selection [data-action="service"]').tap();}
    else{await page.locator('#campPierWorld').tap();await page.locator('#selection [data-action="recoverTide"]').tap();}
   }
   await shot('09-pearl-astrolabe');const finished=await read();await page.reload();assert.deepEqual(await read(),finished);
   for(const width of [360,430]){await page.setViewportSize({width,height:844});await page.locator('#campPierWorld').tap();assert.ok(await page.locator('#selection [data-action="recoverTide"]').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const cell=await page.locator('#board .tile').first().boundingBox();assert.ok(cell.width>=44);await shot(`10-loft-${width}`);}
   fs.writeFileSync(`${dir}/${engine}-loft-trace.json`,JSON.stringify({actionsToLoft:ready.moves+1,totalActions:finished.moves,requestActions:actions,extraRequestActions:actions-preLoftActions,deliveries,merges:finished.merges,dives:finished.camp.dives,discovered:finished.discovered.filter(x=>x.includes('tide')),occupiedBefore:ready.board.filter(Boolean).length,occupiedAfter:finished.board.filter(Boolean).length,occupancyWhileEarning:[low,high],remainingEnergy:finished.energy,remainingSupplies:finished.requests.supplies},null,2));
   // TT-1F1: continue the SAME fresh save with earned currency, not developer stock.
   await page.setViewportSize({width:390,height:844});
   while((await read()).requests.supplies<18)await requestStep(deliveries%3);
   const deepReady=await read();assert.ok(deepReady.discovered.includes('chart:tide:2'));
   await page.locator('#campPierWorld').tap();await shot('11-deep-survey-ready');
   await page.locator('#selection [data-action="upgradeLoft"]').tap();const deepInstalled=await read();
   assert.equal(deepInstalled.camp.deepSurvey,true);assert.equal(deepInstalled.requests.supplies,deepReady.requests.supplies-18);assert.deepEqual(deepInstalled.board,deepReady.board);assert.deepEqual(deepInstalled.requests.orders,deepReady.requests.orders);
   assert.equal(await page.locator('#campPierWorld').getAttribute('data-deep'),'true');await shot('12-deep-survey-installed');
   if(!deepInstalled.charges.chart){await page.locator('#selection [data-action="service"]').tap();}
   const preRecovery=await read();await page.locator('#selection [data-action="recoverTide"]').tap();const postRecovery=await read();
   assert.equal(postRecovery.energy,preRecovery.energy-3);assert.equal(postRecovery.charges.chart,preRecovery.charges.chart-1);assert.deepEqual(postRecovery.taps,preRecovery.taps);assert.ok(postRecovery.board.some((x,i)=>x?.line==='tide'&&x.tier===1&&!preRecovery.board[i]));await shot('13-guaranteed-compass');
   // TT-1I: earn the first Sextant via actual recovery + merging.
   // Only after discovering it may a replacement order request that tier.
   for(let guard=0;!(await read()).discovered.includes('chart:tide:3');guard++){
    assert.ok(guard<48,'first Sextant must be discoverable before its request');
    const saved=await read();let action;
    for(const tier of [2,1,0]){
     const ids=saved.board.flatMap((x,i)=>x?.line==='tide'&&x.tier===tier?[i]:[]);
     if(ids.length>=2){action={type:'merge',from:ids[0],to:ids[1]};break;}
    }
    if(!action)action=saved.energy<3?{type:'ration'}:saved.charges.chart?{type:'recoverTide'}:{type:'service',id:'chart'};
    await requestStep(2,action);
   }
   assert.ok((await read()).discovered.includes('chart:tide:3'));
   let replacements=0;
   while(!(await read()).requests.orders[2].needs.some(r=>r.line==='tide'&&r.tier===3)){
    assert.ok(replacements++<5,'new Long orders should eventually ask for a discovered Sextant');
    const id=(await read()).requests.orders[2].id;
    while((await read()).requests.orders[2].id===id)await requestStep(2);
   }
   const newGoal=(await read()).requests.orders[2];assert.equal(newGoal.needs[0].tier,3,'Crown is not demanded before Sextant discovery');
   while(true){const action=await page.evaluate(async()=>{const {requestAction}=await import('/tests/v5-workshop-policy.mjs');return requestAction(JSON.parse(localStorage.getItem('vaultwake-v5')),2);});if(action.type==='request')break;await requestStep(2);}
   await shot('14-celestial-sextant-ready');const beforeDelivery=await read();await requestStep(2);const deepDone=await read();
   assert.equal(deepDone.requests.supplies,beforeDelivery.requests.supplies+newGoal.supplies);assert.equal(deepDone.requests.completed,beforeDelivery.requests.completed+1);assert.ok(deepDone.discovered.includes('chart:tide:3'));assert.ok(!deepDone.discovered.includes('chart:tide:4'),'Ocean Crown remains an unfinished collectible goal');
   await shot('15-new-treasure-delivered');await page.reload();assert.deepEqual(await read(),deepDone);
   const supplySpent=8+12+8+20+18;fs.writeFileSync(`${dir}/${engine}-deep-survey-trace.json`,JSON.stringify({requests:deepDone.requests.completed,suppliesSpent:supplySpent,suppliesEarned:supplySpent+deepDone.requests.supplies,remainingSupplies:deepDone.requests.supplies,upgradeMove:deepReady.moves+1,upgradeCost:18,tideRecoveries:deepDone.camp.dives,deepRecoveries:deepDone.camp.deepDives,merges:deepDone.merges,newOrder:newGoal,discovered:deepDone.discovered.filter(x=>x.includes('tide')),unfinished:'Ocean Crown',occupied:deepDone.board.filter(Boolean).length,energy:deepDone.energy},null,2));
   // TT-1H: continue this earned save all the way to the Crown. No seeded stock.
   for(let guard=0;!(await read()).discovered.includes('chart:tide:4');guard++){
    assert.ok(guard<90,'Crown must be reachable with Deep Survey');
    const s=await read();let action;
    for(const tier of [3,2,1,0]){const ids=s.board.flatMap((x,i)=>x?.line==='tide'&&x.tier===tier?[i]:[]);if(ids.length>=2){action={type:'merge',from:ids[0],to:ids[1]};break;}}
    if(!action)action=s.energy<3?{type:'ration'}:s.charges.chart?{type:'recoverTide'}:{type:'service',id:'chart'};
    await requestStep(0,action);
   }
   let crownSave=await read();assert.ok(!crownSave.camp.fleetViewed);
   const sceneGeometry=async label=>{
    await page.evaluate(()=>scrollTo(0,0));
    const selectors=['#fleetCrown','#workshop','#workshopBench','#campPierWorld'];
    const rects=await page.evaluate(selectors=>selectors.map(selector=>{
     const el=document.querySelector(selector),r=el.getBoundingClientRect();
     const points=[[.5,.5],[.15,.15],[.85,.15],[.15,.85],[.85,.85]];
     return {selector,x:r.x,y:r.y,width:r.width,height:r.height,uncovered:points.every(([x,y])=>el.contains(document.elementFromPoint(r.x+r.width*x,r.y+r.height*y)))};
    }),selectors);
    const overlap=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.5&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>.5;
    const scene=await page.locator('#scene').boundingBox(),title=await page.locator('.worldLabel').boundingBox();
    console.log('TT1H1_BOUNDS',engine,label,JSON.stringify({scene,title,rects}));
    for(const [i,a] of rects.entries()){
     assert.ok(a.width>=44&&a.height>=44,`${label}: ${a.selector} touch size`);
     assert.ok(a.uncovered,`${label}: ${a.selector} receives pointer hits`);
     assert.ok(a.x>=scene.x&&a.x+a.width<=scene.x+scene.width+.5&&a.y>=scene.y&&a.y+a.height<=scene.y+scene.height+.5,`${label}: ${a.selector} stays inside scene`);
     assert.ok(!overlap(a,title),`${label}: ${a.selector} covers scene label`);
     for(const b of rects.slice(i+1))assert.ok(!overlap(a,b),`${label}: ${a.selector} overlaps ${b.selector}: ${JSON.stringify(rects)}`);
    }
    console.log('TT1H1_GEOMETRY',engine,label,JSON.stringify(rects));
   };
   const evidence=async name=>{
    await page.evaluate(()=>scrollTo(0,0));
    const bytes=await page.screenshot({path:`${dir}/${engine}-${name}.jpg`,type:'jpeg',quality:72,fullPage:false});
    // Bounded visual diagnostics remain retrievable while optional artifact upload is disabled.
    if(process.env.TT1H1_VISUAL_EVIDENCE==='1')console.log('TT1H1_SCREENSHOT',`${engine}-${name}`,bytes.toString('base64'));
   };
   assert.equal(await page.locator('#fleetReveal').evaluate(x=>x.open),false,'never force a modal on discovery');
   await shot('17-earned-crown');await page.reload();assert.deepEqual(await read(),crownSave);
   for(const width of [360,390,430]){await page.setViewportSize({width,height:844});await evidence(`fleet-upgrade-${width}`);await sceneGeometry(`upgrade-${width}`);}
   // Earn the Precision Bench as well: its installed icon must coexist with the Crown.
   while((await read()).requests.supplies<12)await requestStep(0);
   await page.locator('#workshopBench').tap();await page.locator('[data-action="upgradeWorkshop"]').tap();
   assert.equal((await read()).workshop.precision,true);crownSave=await read();
   // Reproduce the reported original geometry on the earned save for visual comparison.
   await page.setViewportSize({width:390,height:844});
   const originalLayout=await page.addStyleTag({content:'#scene.fleetAwake,#scene.fleetAwake>.premiumScene,#scene.fleetAwake>svg{height:104px!important}#scene.fleetAwake #workshop{top:14px;bottom:auto}#scene.fleetAwake #workshopBench{left:124px;right:auto;max-width:128px;padding:4px 7px;justify-content:normal}#fleetCrown{left:auto;top:auto;right:103px;bottom:5px}.world:has(.fleetAwake) .worldLabel{max-width:none;line-height:normal}'});
   await page.waitForFunction(()=>!document.querySelector('.moment,.deliveryReceipt'));
   await evidence('fleet-collision-before-390');
   const oldCrown=await page.locator('#fleetCrown').boundingBox(),oldBench=await page.locator('#workshopBench').boundingBox();
   assert.ok(Math.min(oldCrown.x+oldCrown.width,oldBench.x+oldBench.width)>Math.max(oldCrown.x,oldBench.x)&&Math.min(oldCrown.y+oldCrown.height,oldBench.y+oldBench.height)>Math.max(oldCrown.y,oldBench.y),'original scene reproduces reported collision');
   console.log('TT1H1_BEFORE',engine,JSON.stringify({crown:oldCrown,bench:oldBench}));
   await originalLayout.evaluate(el=>el.remove());
   for(const width of [360,390,430]){
    await page.setViewportSize({width,height:844});
    // This is the same earned save, also the legacy shape (no receipt flag).
    await page.evaluate(s=>localStorage.setItem('vaultwake-v5',JSON.stringify(s)),crownSave);await page.reload();
    await sceneGeometry(`pending-${width}`);
    await page.locator('#workshopBench').tap();assert.ok(await page.locator('#selection [data-action="fitSpanner"]').count(),'Bench opens its own fitting control');
    await page.locator('#campPierWorld').tap();assert.ok(await page.locator('#selection [data-action="recoverTide"]').isVisible(),'Loft opens recovery');
    await page.locator('#fleetCrown').tap();await page.locator('#fleetNext').tap();
    await page.locator('#fleetReveal .close').tap();await page.reload();
    assert.ok(!(await read()).camp.fleetViewed,'closing midway leaves the scene pending');
    await page.locator('#fleetCrown').tap();await page.locator('#fleetNext').tap();await page.locator('#fleetNext').tap();
    assert.match(await page.locator('#fleetMilestone').textContent(),/Chapter 1 mystery milestone reached/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    for(const selector of ['#fleetNext','#fleetReveal .close','#fleetCrown']){const box=await page.locator(selector).boundingBox();assert.ok(box.width>=44&&box.height>=44);}
    await page.screenshot({path:`${dir}/${engine}-fleet-reveal-${width}.png`,fullPage:true});
    if(width===390)await evidence('fleet-dialog-390');
    await page.locator('#fleetNext').tap();const viewed=await read();
    assert.deepEqual(viewed,{...crownSave,camp:{...crownSave.camp,fleetViewed:true}},'story acknowledgement changes no gameplay resources');
    await page.reload();assert.deepEqual(await read(),viewed);
    assert.equal(await page.locator('#fleetReveal').evaluate(x=>x.open),false);
    assert.ok(await page.locator('#fleetCrown').isVisible());
    assert.match(await page.locator('#goalTitle').textContent(),/fleet left a signal/i,'story has a truthful Chapter 1 endpoint');
    assert.match(await page.locator('#step').textContent(),/FINISHED/);
    assert.equal(await page.locator('#requests .requestShelf').isVisible(),false,'endless orders are not a forced primary quest');
    const savedEnding=await read();
    await page.locator('#ordersToggle').tap();
    assert.equal(await page.locator('#requests .requestShelf').isVisible(),true,'optional orders are accessible on demand');
    assert.deepEqual(await read(),savedEnding,'folding optional tasks must not modify gameplay saves');
    await page.locator('#ordersToggle').tap();
    assert.equal(await page.locator('#requests .requestShelf').isVisible(),false);
    await sceneGeometry(`viewed-${width}`);await evidence(`fleet-scene-${width}`);
    await page.screenshot({path:`${dir}/${engine}-fleet-world-${width}.png`,fullPage:true});
   }
   console.log(engine,'TT-1H earned Crown, pending/closed/viewed reloads, legacy discovery, 360/390/430 reveal and world passed');
   // A previous TT-1E Loft save keeps all its treasures and pending orders on migration.
   const legacyLoft=structuredClone(deepReady);delete legacyLoft.camp.deepSurvey;delete legacyLoft.camp.deepDives;
   await page.evaluate(s=>localStorage.setItem('vaultwake-v5',JSON.stringify(s)),legacyLoft);await page.reload();const migratedLoft=await read();assert.deepEqual(migratedLoft.board,legacyLoft.board);assert.deepEqual(migratedLoft.requests,legacyLoft.requests);assert.equal(migratedLoft.camp.deepSurvey,false);
   await page.locator('#campPierWorld').tap();await page.locator('#selection [data-action="upgradeLoft"]').tap();const resumedDeep=await read();await page.reload();assert.deepEqual(await read(),resumedDeep);assert.equal(resumedDeep.camp.deepSurvey,true);
   for(const width of [360,390,430]){await page.setViewportSize({width,height:844});await page.locator('#campPierWorld').tap();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);for(const sel of ['#campPierWorld','#selection [data-action="recoverTide"]']){const b=await page.locator(sel).boundingBox();assert.ok(b.width>=44&&b.height>=44);}await shot(`16-deep-${width}`);}
   console.log(engine,'Deep Survey: earned upgrade, guaranteed Compass, Sextant request, unfinished Crown, legacy Loft and reload passed');
   // Resume actual legacy expedition fixtures with banked supplies; only the new purchase changes progress.
   for(const [phase,supplies] of [['primed',20],['completed',40]]){
    const legacy=JSON.parse(fs.readFileSync(`tests/fixtures/stage2/ridge-${phase}.json`));
    legacy.camp={version:1,pier:true,packs:1};legacy.workshop={...finished.workshop};legacy.requests={...finished.requests,supplies,orders:ready.requests.orders,sequences:ready.requests.sequences};
    await page.evaluate(s=>localStorage.setItem('vaultwake-v5',JSON.stringify(s)),legacy);await page.reload();const beforeUpgrade=await read();
    assert.equal(beforeUpgrade.stage,legacy.stage);assert.equal(beforeUpgrade.requests.supplies,supplies);assert.deepEqual(beforeUpgrade.requests.orders,legacy.requests.orders);
    await page.locator('#campPierWorld').tap();await page.locator('#selection [data-action="buildLoft"]').tap();const afterUpgrade=await read();
    assert.equal(afterUpgrade.stage,beforeUpgrade.stage);assert.deepEqual(afterUpgrade.board,beforeUpgrade.board);assert.deepEqual(afterUpgrade.seals,beforeUpgrade.seals);assert.deepEqual(afterUpgrade.requests.orders,beforeUpgrade.requests.orders);assert.equal(afterUpgrade.requests.supplies,supplies-20);
    await page.reload();assert.deepEqual(await read(),afterUpgrade);
    assert.ok(await page.locator('#campPierWorld img').evaluate(img=>img.complete&&img.naturalWidth>0));
   }
   assert.deepEqual(errors,[]);fs.writeFileSync(`${dir}/${engine}-trace.json`,JSON.stringify({actions,deliveries,workshop:packed.workshop,camp:packed.camp,remainingSupplies:packed.requests.supplies,selectedFamily:family},null,2));
   await context.close();console.log(engine,'real orders → Workshop → Pier → Loft → recover → merge → treasure order → reload; legacy 20/40-supply saves passed');
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});

