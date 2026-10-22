// The coast map: every place the expedition restores, in story order, with its
// state and the lines the crew says when it is restored. Presentation only:
// camp places use the existing restoration actions and ◆ supplies, expedition
// places are reached on the board. No new currency, flags or save fields.
import {act} from './core.mjs';
import {WORKSHOP_COST,BENCH_COST} from './workshop.mjs';
import {PIER_COST} from './camp.mjs';
import {LOFT_COST,DEEP_SURVEY_COST} from './treasures.mjs';

const say=(who,text)=>({who,text});
export const PLACES=[
 {id:'landing',name:'Landing path',image:'landing-vibrant.webp',done:s=>s.landingStep>=1||s.stage>0,
  lines:[say('Ivo','Path is clear. The camp can breathe again.'),say('Neri','The tide marks here are wrong. On every chart I own, this beach is underwater.')]},
 {id:'workshop',name:'Coastal Workshop',image:s=>s.workshop?.repaired?'workshop-operational.webp':'workshop-damaged.webp',cost:WORKSHOP_COST,action:'restoreWorkshop',done:s=>!!s.workshop?.repaired,
  lines:[say('Ivo','Bellows, vice, anvil. She still works.'),say('Neri','This socket matches the broken Tide Dial we found on the beach.'),say('Ivo','Then the old crew built their instruments right here.')]},
 {id:'pier',name:'Supply Pier',image:'worksite-vibrant.webp',cost:PIER_COST,action:'buildPier',after:'workshop',done:s=>!!s.camp?.pier,
  lines:[say('Ivo','Supply boats can dock now. Cases come straight to the camp.'),say('Neri','The pier points at a gap on the old chart: a harbour someone erased.')]},
 {id:'loft',name:'Charting Loft',image:'charting-loft.webp',cost:LOFT_COST,action:'buildLoft',after:'pier',done:s=>!!s.camp?.loft,
  lines:[say('Neri','From up here I can see the whole reach.'),say('Neri','The Reef Compass points offshore, but the old maps say inland.'),say('Ivo','Maps lie. Compasses don’t.')]},
 {id:'crossing',name:'The crossing',image:'entrance-vibrant.webp',after:'landing',done:s=>s.stage>=2,
  lines:[say('Neri','We are across. The machines on this side were left in the middle of a measurement.'),say('Ivo','Nobody leaves like that unless they are running.')]},
 {id:'lift',name:'Stone Lift',image:'pocket-winch-vibrant.webp',after:'crossing',done:s=>!!s.seals?.stabilization||s.stage>=3,
  lines:[say('Ivo','The Stone Lift moves. Whoever built it meant to come back.'),say('Neri','Then why did they never return?')]},
 {id:'rings',name:'Ring engine',image:'powered-vibrant.webp',after:'lift',done:s=>s.stage>=3,
  lines:[say('Neri','The rings follow the tides, not the stars.'),say('Ivo','And every one of them points at that sealed door.')]},
 {id:'vault',name:'Tideglass Vault',image:'vault-open-vibrant.webp',after:'rings',done:s=>s.stage>=4,
  lines:[say('Neri','It is not a treasure room. These stars chart a coastline that does not exist yet.'),say('Ivo','And someone came back to lock it from the outside.')]},
 {id:'bench',name:'Precision Bench',image:'split-spanner-vibrant.webp',cost:BENCH_COST,action:'upgradeWorkshop',after:'workshop',done:s=>!!s.workshop?.precision,
  lines:[say('Ivo','With the Precision Bench, spare tools become spanners.'),say('Ivo','Out here, we waste nothing.')]},
 {id:'deep',name:'Deep Survey',image:'tide-3.webp',cost:DEEP_SURVEY_COST,action:'upgradeLoft',after:'loft',done:s=>!!s.camp?.deepSurvey,
  lines:[say('Neri','Deep Survey reaches past our oldest maps.'),say('Neri','If the lost fleet left a trail, we will find it now.')]},
 {id:'signal',name:'Fleet signal',image:'tide-4.webp',after:'vault',done:s=>!!s.camp?.fleetViewed,
  lines:[say('Ivo','The Crown is not treasure. It is a homing signal.'),say('Neri','And something beyond the horizon is answering it. Who is still out there?')]}
];
export const placeById=id=>PLACES.find(p=>p.id===id);
export const CAMP_PLACES=PLACES.filter(p=>p.action).map(p=>p.id);

// status: done · ready (build now) · saving (only ◆ missing) · next (the board's
// current expedition step) · locked (an earlier place or milestone first).
export function coastPlaces(s){
 const supplies=s.requests?.supplies??0;
 let nextExpedition=true;
 return PLACES.map(p=>{
  const image=typeof p.image==='function'?p.image(s):p.image;
  const base={id:p.id,name:p.name,image,cost:p.cost??null,action:p.action??null,lines:p.lines};
  if(p.done(s))return {...base,status:'done',note:'Restored'};
  const before=p.after&&placeById(p.after);
  if(before&&!before.done(s))return {...base,status:'locked',note:'After '+before.name};
  if(!p.action){
   const status=nextExpedition?'next':'locked';nextExpedition=false;
   return {...base,status,note:status==='next'?'Your current goal on the board':'Later on the expedition'};
  }
  const trial=act(structuredClone(s),{type:p.action},s.lastAt??0);
  if(trial.ok)return {...base,status:'ready',note:'Build · '+p.cost+' ◆'};
  if(supplies<p.cost)return {...base,status:'saving',note:'Need '+(p.cost-supplies)+' more ◆ from orders',missing:p.cost-supplies};
  return {...base,status:'locked',note:trial.message};
 });
}
export const readyPlaces=s=>coastPlaces(s).filter(p=>p.status==='ready');
export const doneIds=s=>PLACES.filter(p=>p.done(s)).map(p=>p.id);
