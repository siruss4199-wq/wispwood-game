const assert=require('node:assert/strict');const fs=require('node:fs');const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});fs.mkdirSync('test-artifacts/v5',{recursive:true});
 try{for(const [width,style] of [[360,'expedition'],[390,'contract'],[768,'exploration'],[390,'aggressive']]){
  const motion=width===390;
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:width<500,reducedMotion:motion?'no-preference':'reduce'});page.setDefaultTimeout(8000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(width<500&&style!=='aggressive'){
   await page.goto('http://127.0.0.1:8080/v5/?art=classic');
   await page.waitForFunction(()=>document.querySelectorAll('#board .tile').length===36);
   await page.screenshot({path:`test-artifacts/v5/premium-before-${width}.png`,fullPage:true});
  }
  if(width===390&&style==='contract'){
   await page.goto('http://127.0.0.1:8080/v5/?art=phase1');await page.waitForFunction(()=>document.querySelectorAll('#board .tile').length===36);
   await page.evaluate(async()=>{await Promise.all([...document.images].map(x=>x.decode()));});
   await page.screenshot({path:'test-artifacts/v5/refinement-before-390.png',fullPage:true});
  }
  await page.goto('http://127.0.0.1:8080/v5/');
  await page.waitForFunction(()=>document.querySelectorAll('#board .tile').length===36);
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
  const shot=async name=>{await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));});await page.screenshot({path:`test-artifacts/v5/${style}-${name}-${width}.png`,fullPage:true});};
  const showSide=async type=>{for(let n=0;n<4&&!await page.locator('[data-contract="'+type+'"]').count();n++)await page.locator('[data-side-next]').tap();assert.equal(await page.locator('[data-contract="'+type+'"]').count(),1);};
  const payoff=async(kind)=>{
   if(motion){assert.ok(await page.locator('.deliveryObject.collect').count()>0,kind+' collects actual board objects');await page.waitForTimeout(260);await shot(kind+'-delivery');await page.waitForTimeout(750);assert.equal(await page.locator('.deliveryObject').count(),0);assert.equal(await page.locator('.deliveryTask').count(),0);}
   else{assert.equal(await page.locator('.deliveryObject').count(),0);assert.ok(await page.locator('.deliveryReceipt').count()>0);await shot(kind+'-delivery');await page.waitForTimeout(710);}
   assert.ok((await page.locator('#message').textContent()).length>10);
   assert.equal(await page.locator('#board .selected').count(),0);
  };
  assert.equal(await page.locator('.contract').count(),1);assert.equal(await page.locator('.source').count(),3);assert.equal(await page.locator('.source.locked').count(),2);
  assert.equal(await page.locator('#goalButton').isVisible(),false);assert.match(await page.locator('#goalTitle').textContent(),/landing/);
  await shot('fresh');assert.equal((await read()).board.filter(Boolean).length,27);
  assert.equal(await page.locator('body').getAttribute('data-art'),'premium');
  assert.ok(await page.locator('#board img[data-art="rig-0"]').count()>0);
  assert.equal(await page.locator('.premiumScene').count(),1);
  assert.equal(await page.evaluate(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0)),true);
  for(const tile of await page.locator('#board .tile').all()){const b=await tile.boundingBox();assert.ok(b.width>=44&&b.height>=44,'touch targets stay at least 44px');}
  assert.equal(await page.locator('.tile.site').count(),3);assert.equal(await page.locator('.tile.route').count(),2);
  for(const family of ['rig','chart','flux']){const css=await page.locator(`.tile.item[data-family="${family}"]`).first().evaluate(el=>({background:getComputedStyle(el).backgroundColor,image:getComputedStyle(el).backgroundImage,shadow:getComputedStyle(el).boxShadow}));assert.deepEqual(css,{background:'rgba(0, 0, 0, 0)',image:'none',shadow:'none'});}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const bounds=await page.locator('#board').boundingBox();assert.ok(bounds.width>=Math.min(width-24,370));assert.ok(bounds.y+bounds.height<830);
  await shot('task-ready');await page.locator('[data-contract="contract"]').tap();assert.equal((await read()).contracts,1);await payoff('contract');
  const a=await page.locator('[data-index="7"]').boundingBox(),b=await page.locator('[data-index="8"]').boundingBox();
  if(width===390&&style==='contract'){
   const touch=await page.context().newCDPSession(page);const from={x:a.x+a.width/2,y:a.y+a.height/2},to={x:b.x+b.width/2,y:b.y+b.height/2};
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
   for(let n=1;n<=7;n++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*n/7,y:from.y+(to.y-from.y)*n/7}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  }else{await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:7});await page.mouse.up();}
  await page.waitForTimeout(320);assert.equal((await read()).merges,1);
  let actions=0;const timeline=[],captured=new Set();
  while((await read()).stage<4&&actions++<300){
   const before=await read();
   const cmd=await page.evaluate(async style=>{const {choose}=await import('/tests/v5-policy.mjs');const s=JSON.parse(localStorage.getItem('vaultwake-v5'));window.sessionPolicy??={};return choose(s,{style,openCaches:true,session:window.sessionPolicy});},style);
   if(cmd.type==='goal'){assert.equal(await page.locator('.objective.ready').count(),1);await shot('main-ready-'+before.stage);if(before.stage===3)await shot('pre-vault');}
   if(cmd.type==='merge'){const selected=page.locator('#board .selected.item,#board .selected.glyph,#board .selected.brace');if(await selected.count())await selected.tap();await page.locator(`[data-index="${cmd.from}"]`).tap();await page.locator(`[data-index="${cmd.to}"]`).tap();}
   else if(cmd.type==='produce'||cmd.type==='service'){
    const i=before.board.findIndex(x=>x?.type==='source'&&x.id===cmd.id);await page.locator(`[data-index="${i}"]`).tap();if(cmd.type==='service')await page.locator('[data-action="service"]').tap();
   }else if(cmd.type==='crate')await page.locator(`[data-index="${cmd.index}"]`).tap();
   else if(cmd.type==='deploy'&&style==='contract'){
    const family={winch:'rig',scope:'chart',relay:'flux'}[before.board[cmd.index].kind],from=before.board.findIndex(x=>x?.family===family&&x.tier===3);
    const a=await page.locator(`[data-index="${from}"]`).boundingBox(),b=await page.locator(`[data-index="${cmd.index}"]`).boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:7});assert.equal(await page.locator('.site.target').count(),1,'installed-equipment destination snaps');await page.mouse.up();
   }
   else if(['deploy','feed','breach','branch','clear','recycle'].includes(cmd.type)){
    if(!await page.locator(`[data-index="${cmd.index}"]`).getAttribute('aria-pressed').then(x=>x==='true'))await page.locator(`[data-index="${cmd.index}"]`).tap();
    if((await read()).moves===before.moves)await page.locator(`[data-action="${cmd.type}"]`).tap();
   }else if(cmd.type==='ration')await page.locator('#rationButton').tap();
   else if(cmd.type==='goal')await page.locator('#goalButton').tap();
   else {await showSide(cmd.type);await page.locator(`[data-contract="${cmd.type}"]`).tap();}
   let s=await read();assert.equal(s.moves,before.moves+1,'exactly one action: '+JSON.stringify(cmd));
   if(['goal','breach','deploy','feed','contract','discovery','opportunity'].includes(cmd.type))await payoff(cmd.type);
   if(cmd.type==='feed'&&!s.board.some(x=>x?.type==='glyph')){assert.equal(await page.locator('[data-contract="discovery"]').count(),0);assert.equal(await page.locator('[data-contract="startOpportunity"]').count(),1,'spending the clue must not strand the optional slot');}
   if(await page.locator('#celebration').isVisible())await page.locator('#celebration .continue').tap();
   assert.equal(await page.locator('#board').getAttribute('data-site'),String(s.stage));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(await page.locator('#goalButton').isVisible()){const actionBounds=await page.locator('#goalButton').boundingBox(),goalBounds=await page.locator('.objective').boundingBox();assert.ok(actionBounds.x+actionBounds.width<=goalBounds.x+goalBounds.width);}assert.equal(await page.locator('.contract').count(),1);assert.equal(await page.locator('.world .objective').count(),1);
   const bounds=await page.locator('#board').boundingBox();assert.ok(bounds.y+bounds.height<844,'board remains visible');
   timeline.push({move:s.moves,action:cmd.type,stage:s.stage,occupied:s.board.filter(Boolean).length,energy:s.energy,charges:s.charges,log:s.expedition.log.at(-1)});
   for(const [check,name] of [[s.merges>=3,'early-merges'],[s.stage===1,'route-choice'],[s.stage===2,'producer-unlock'],[cmd.type==='deploy','device-used'],[cmd.type==='feed','fragment-choice'],[cmd.type==='discovery','rare-decoded'],[cmd.type==='clear','blocker-solution'],[s.expedition.log.some(x=>x.type==='device-used'),'device-consequence'],[s.stage===3,'powered-site'],[cmd.type==='crate','container-opening']]){
    if(check&&!captured.has(name)){await shot(name);captured.add(name);}
   }
   if(cmd.type==='deploy'){assert.equal(s.board[cmd.index].phase,'done');assert.ok(s.expedition.log.some(x=>x.type==='device-used'));await shot('device-'+s.board[cmd.index].kind);}
   if(cmd.type==='breach'){assert.equal(await page.locator('.source.locked').count(),0);assert.equal(await page.locator('.tile.sealed').count(),2,'unchosen route remains a real spatial consequence');assert.equal(await page.locator('.objective.ready').count(),0,'inspect is not a fake delivery');}
  }
  const saved=await read();assert.equal(saved.stage,4);await shot('vault-open');assert.ok(saved.discovered.length<18);assert.equal(saved.expedition.log.filter(x=>x.type==='deployment').length,2);
  assert.equal(saved.discoveryDone,true,'discovery cannot silently fall out of the plan');assert.equal(saved.expedition.log.filter(x=>x.type==='device-used').length,2);assert.equal(saved.board.some(x=>x?.type==='site'&&x.phase==='active'),false);
  assert.ok(timeline.some(x=>x.action==='opportunity'));assert.ok(new Set(timeline.map(x=>x.stage)).size>=4);
  assert.ok(Math.min(...timeline.map(x=>x.occupied))>=17);let run=0;for(const sample of timeline){run=sample.action==='produce'?run+1:0;assert.ok(run<=3);}
  fs.writeFileSync(`test-artifacts/v5/${style}-session-${width}.json`,JSON.stringify({style,timeline,decisions:saved.expedition.log,discovered:saved.discovered},null,2));
  await page.reload();assert.equal((await read()).stage,4);assert.deepEqual((await read()).expedition,saved.expedition);
  await page.locator('#journalButton').tap();assert.equal(await page.locator('#journal .art').count(),24);await shot('aspirational-journal');await page.locator('#journal .close').tap();
  assert.equal(await page.evaluate(()=>localStorage.getItem('wispwood-v4')),null);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,style,actions,merges:saved.merges,stage:saved.stage,discovered:saved.discovered.length}));await page.close();
 }
 // CrazyGames entry works even if external SDK is unavailable, as in Basic Launch preview.
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"no-preference"});const motionErrors=[];page.on("pageerror",e=>motionErrors.push(e.message));await page.route('https://sdk.crazygames.com/**',r=>r.abort());await page.goto('http://127.0.0.1:8080/v5/crazygames.html');await page.waitForFunction(()=>document.querySelectorAll('#board .tile').length===36);await page.locator('[data-index="34"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5')).board[34].type==='item');assert.equal(await page.locator('[data-action="crate"]').count(),0);await page.waitForTimeout(120);await page.screenshot({path:'test-artifacts/v5/container-opening-motion.png',fullPage:true});await page.locator('[data-index="0"]').click();assert.equal(await page.locator('.flight').count(),1);assert.equal(await page.locator('.rareTrack').getAttribute('aria-valuenow'),'1');await page.waitForTimeout(550);assert.equal(await page.locator('.flight').count(),0);
 await page.evaluate(()=>{window.seenParticles=0;new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.classList?.contains('fxParticle'))window.seenParticles++;}).observe(document.body,{childList:true});});
 const pair=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5'));for(let i=0;i<s.board.length;i++)for(let j=i+1;j<s.board.length;j++){const a=s.board[i],b=s.board[j];if(a?.type==='item'&&b?.type==='item'&&a.family===b.family&&a.tier===b.tier&&a.tier<7)return [i,j];}return null;});assert.ok(pair,'fresh CrazyGames entry exposes a mergeable pair');const pa=await page.locator(`[data-index="${pair[0]}"]`).boundingBox(),pb=await page.locator(`[data-index="${pair[1]}"]`).boundingBox();await page.mouse.move(pa.x+pa.width/2,pa.y+pa.height/2);await page.mouse.down();await page.mouse.move(pb.x+pb.width/2,pb.y+pb.height/2,{steps:5});await page.mouse.up();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5')).merges===1);assert.deepEqual(motionErrors,[]);assert.equal(await page.locator('.merge-pop').count(),1,'merged tile gets tactile pop feedback');assert.ok(await page.evaluate(()=>window.seenParticles)>0,'merge creates a particle burst');await page.waitForTimeout(600);assert.equal(await page.locator('.fxParticle').count(),0);
 await page.locator('#soundButton').click();assert.equal(await page.locator('#soundButton').textContent(),'Sound on');await page.reload();assert.equal(await page.locator('#soundButton').textContent(),'Sound on');await page.locator('#journalButton').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#journal').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#journal').isVisible(),false);await page.close();
 const review=await browser.newPage({viewport:{width:390,height:844}});await review.goto('http://127.0.0.1:8080/v5/art-review.html');await review.waitForFunction(()=>document.querySelectorAll('#after img').length===4);await review.evaluate(async()=>{await Promise.all([...document.images].map(x=>x.decode()));});assert.equal(await review.locator('#after img').count(),4);for(const img of await review.locator('#after img').all()){const b=await img.boundingBox();assert.equal(b.width,48);assert.equal(b.height,48);}await review.screenshot({path:'test-artifacts/v5/premium-art-review-390.png',fullPage:true});await review.locator('#sampleComparison').screenshot({path:'test-artifacts/v5/refinement-48px.png'});assert.equal(await review.locator('#previous img').count(),4);await review.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
