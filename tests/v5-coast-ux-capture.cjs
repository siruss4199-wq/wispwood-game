// Capture the same real early-game interactions against baseline and review servers.
// Usage: node tests/v5-coast-ux-capture.cjs /absolute/output/directory
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(process.argv[2]||'coast-captures');fs.mkdirSync(dir,{recursive:true});
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')));
async function beats(p){while(await p.locator('#beat[open]').count())await p.locator('#beatNext').click();}
(async()=>{
 const browser=await chromium.launch();
 try{for(const width of [360,390,430,907]){
 const ctx=await browser.newContext({viewport:{width,height:width===907?510:844},hasTouch:true,isMobile:width<500,reducedMotion:'reduce'}),p=await ctx.newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8080/v5/play.html?new=1');await beats(p);
 const snap=async n=>{await p.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});await p.screenshot({path:path.join(dir,`${width}-${n}.png`),fullPage:true});};
 await snap('01-opening');await p.locator('[data-index="16"]').tap();await snap('02-selected');await p.locator('[data-index="14"]').tap();await snap('03-merge');
 await p.locator('[data-index="21"]').tap();await snap('04-producer');
 await p.locator('[data-order]').first().tap();await snap('05-order');
 await p.locator('#mapButton').tap();await snap('06-beach');await p.locator('[data-back]').tap();
 let delivered=false,restored=false;
 for(let n=0;n<180&&!restored;n++){
 const s=await read(p),a=await p.evaluate(async()=>{const {nextAction}=await import('/tests/v5-next-policy.mjs');return nextAction(JSON.parse(localStorage.getItem('vaultwake-v5-coast')));});if(!a)break;
 const tile=i=>p.locator(`[data-index="${i}"]`),select=async i=>{if(await tile(i).getAttribute('aria-pressed')!=='true')await tile(i).tap();};
 if(a.type==='produce')await tile(s.board.findIndex(x=>x?.type==='source'&&x.id===a.id)).tap();
 else if(a.type==='merge'){await select(a.from);await tile(a.to).tap();}
 else if(a.type==='unseal'){await select(a.from);await tile(a.index).tap();}
 else if(a.type==='openKit'||a.type==='recycle'){await select(a.index);await p.locator(`[data-action="${a.type}"]`).tap();}
 else if(a.type==='deliver'){if(!delivered)await snap('07-ready');await p.locator(`[data-order="${a.id}"]`).tap();if(!delivered)await snap('08-reward');delivered=true;}
 else if(a.type==='restore'){await p.locator('#mapButton').tap();await snap('09-upgrade-ready');await p.locator(`[data-restore="${a.id}"]`).tap();await snap('10-upgrade-story');await beats(p);await snap('11-restored');await p.locator('[data-back]').tap();restored=true;}
 }
 await p.reload();await snap('12-returning');
 const result={width,delivered,restored,errors,geometry:await p.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,board:document.querySelector('#board').getBoundingClientRect().toJSON(),tile:document.querySelector('.tile').getBoundingClientRect().toJSON()}))};
 console.log(JSON.stringify(result));
 if(errors.length||!delivered||!restored)throw Error(`Capture playthrough failed at ${width}`);
 await ctx.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
