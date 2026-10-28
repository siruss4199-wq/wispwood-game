// Coast Camp opens on Home (Build 46p): every page load ends on Home, and the board is reached by
// its main button (Play for a new camp, Continue for a save), as a player does. Board tests call
// throughHome(page) once: after each goto or reload of the game page it presses that button.
// Pages that are not the game (no #home) are left alone.
async function enterHome(page){
 if(!await page.locator('#home').count())return;
 await page.waitForSelector('#homePlay:not([hidden])',{timeout:20000});
 await page.locator('#homePlay').click();
 await page.waitForSelector('#home',{state:'hidden',timeout:20000});
}
function throughHome(page){
 for(const k of ['goto','reload']){const f=page[k].bind(page);page[k]=async(...a)=>{const r=await f(...a);await enterHome(page);return r;};}
 return page;
}
module.exports={enterHome,throughHome};
