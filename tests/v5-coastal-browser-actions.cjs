const assert=require('node:assert/strict');
const {kitAction,KIT_ACTIONS}=require('./v5-kit-browser.cjs');
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
async function perform(page,a){
 const s=await read(page);
 const tile=i=>page.locator(`#board [data-index="${i}"]`);
 const clearSelection=async()=>{const old=page.locator('#board .selected.item,#board .selected.glyph,#board .selected.brace');if(await old.count())await old.tap();};
 if(a.type==='merge'){
  await clearSelection();await tile(a.from).tap();await tile(a.to).tap();
 }else if(a.type==='produce'||a.type==='service'){
  await clearSelection();await tile(s.board.findIndex(x=>x?.type==='source'&&x.id===a.id)).tap();
  if(a.type==='service')await page.locator('#selection [data-action="service"]').tap();
 }else if(a.type==='request')await page.locator(`[data-request="${a.id}"]`).tap();
 else if(a.type==='prepareInstrument')await page.locator(`[data-instrument="${a.family}"]`).tap();
 else if(a.type==='goal')await page.locator(s.stage===3&&!s.journey.kit?`[data-kit="${a.kit??'field'}"]`:'#goalButton').tap();
 else if(a.type==='breach')await page.locator(`[data-route="${s.board[a.index].id}"]`).tap();
 else if(a.type==='restoreWorkshop')await page.locator('#workshop').tap();
 else if(['buildPier','buildLoft','upgradeLoft','restoreEngine','useEnriched'].includes(a.type))await page.locator('#goalButton').tap();
 else if(a.type==='recoverTide'){await page.locator('#campPierWorld').tap();await page.locator('#selection [data-action="recoverTide"]').tap();}
 else if(a.type==='ration')await page.locator('#rationButton').tap();
 else if(a.type==='crate'){await clearSelection();await tile(a.index).tap();}
 else if(KIT_ACTIONS.includes(a.type))await kitAction(page,a);
 else if(a.type==='recycle'){await clearSelection();await tile(a.index).tap();await page.locator('#selection [data-action="recycle"]').tap();}
 else if(['deploy','prime','power'].includes(a.type)){
  await clearSelection();const index=a.index??s.board.findIndex(x=>x?.type==='site'&&x.kind==='winch');
  const button=page.locator(`[data-engine-action="${a.type}"][data-site-index="${index}"]`);
  if(await button.count())await button.tap();
  else {await tile(index).tap();if((await read(page)).moves===s.moves)await page.locator(`#selection [data-action="${a.type}"]`).tap();}
 }else throw Error('Unsupported visible action '+JSON.stringify(a));
 await page.waitForFunction(n=>JSON.parse(localStorage.getItem('vaultwake-v5')).moves>n,s.moves,{timeout:5000});
 const after=await read(page);assert.equal(after.moves,s.moves+1,JSON.stringify(a));
 if(await page.locator('#celebration').isVisible())await page.locator('#celebration .continue').tap();
 return after;
}
async function advanceToVault(page){
 for(let n=0;(await read(page)).stage<4&&n<250;n++){
  const a=await page.evaluate(async()=>{const {choose}=await import('/tests/v5-policy.mjs');return choose(JSON.parse(localStorage.getItem('vaultwake-v5')),{sideFirst:false,decode:false,receiver:'scope'});});
  await perform(page,a);
 }
 assert.equal((await read(page)).stage,4);
}
module.exports={read,perform,advanceToVault};
