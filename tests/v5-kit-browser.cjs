// Shared by the browser walkthroughs: play a generator-box action the way a person
// does. Tap a box once to select it and again (or "Take a part") for a part; tap a
// box, then its twin or its producer, to merge or feed it.
async function kitAction(page,a){
 const tile=i=>page.locator(`#board [data-index="${i}"]`);
 const pressed=async i=>await tile(i).getAttribute('aria-pressed')==='true';
 if(a.type==='openKit'){
  if(!await pressed(a.index))await tile(a.index).tap();
  await page.locator('#selection [data-action="openKit"]').tap();
  return;
 }
 if(!await pressed(a.from))await tile(a.from).tap();
 await tile(a.index).tap();
}
const KIT_ACTIONS=['openKit','mergeKit','feedKit'];
module.exports={kitAction,KIT_ACTIONS};
