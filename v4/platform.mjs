let initialized=false;
let started=false;

function sdk(){
  return globalThis.window?.CrazyGames?.SDK??null;
}

async function init(){
  const s=sdk();
  if(initialized)return true;
  if(!s)return false;
  try{
    await s.init();
    initialized=true;
    return true;
  }catch(error){
    console.warn('CrazyGames SDK initialization skipped:',error);
    return false;
  }
}

async function startGameplay(){
  if(started)return;
  const ready=await init();
  if(!ready)return;
  try{
    sdk().game.gameplayStart();
    started=true;
  }catch(error){
    console.warn('CrazyGames gameplayStart skipped:',error);
  }
}

function event(events=[]){
  if(!initialized)return;
  // Basic Launch has no advertisements. Only engagement-safe game signals live here.
  // Full Launch ad hooks can be added after CrazyGames accepts the game.
  if(events.some(e=>e.type==='milestone_completed'||e.type==='producer_unlocked')){
    try{sdk().game.happytime?.();}catch{}
  }
}

async function save(serialized){
  // Standalone saves remain local. Full Launch can opt into CrazyGames Data after acceptance.
  // Keeping this adapter means platform storage can be added without touching game rules.
  return serialized;
}

export const platform={init,startGameplay,event,save};
