// Rewarded ads for Coast Camp (build 34, user: "delguur bolon zar shurtchilgaanii shagnal nem").
// On CrazyGames (SDK v3 on the page) a rewarded ad is requested; the reward is given only
// when the ad finished. Anywhere else (the playtest page, no SDK) the app's stand-in plays
// instead, so the flow can be tried; a real build for CrazyGames loads the SDK script.
// v4/platform.mjs is left as it is: Basic Launch has no ads, and its adapter says so.
let ready=null;
const sdk=()=>globalThis.CrazyGames?.SDK??null;
async function init(){
 const s=sdk();if(!s?.ad?.requestAd)return false;
 ready??=Promise.resolve().then(()=>s.init?.()).then(()=>s.environment!=='disabled',()=>false);
 return ready;
}
// Whether this page shows real ads (true) or the stand-in (false).
export const realAds=async()=>!!sdk()&&await init();
// Resolves 'finished' (give the reward), 'skipped' or 'error'. onStart/onEnd let the app
// mute its sound while an ad plays, as CrazyGames asks.
export async function rewardedAd({onStart=()=>{},onEnd=()=>{},standIn}){
 if(!await realAds())return standIn();
 return new Promise(resolve=>{
  let done=false;const end=r=>{if(done)return;done=true;onEnd();resolve(r);};
  try{sdk().ad.requestAd('rewarded',{adStarted:onStart,adFinished:()=>end('finished'),adError:()=>end('error')});}
  catch{end('error');}
 });
}
