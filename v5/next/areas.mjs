// The coast, area by area. Each area is restored task by task with ★ stars from
// crew orders; each task changes the picture, adds a line or two of story and
// gives a reward (energy, a crate, a fourth order card or a generator level).
// Pure data. Effects are applied by game.mjs.
export const AREAS=[
 {id:'beach',name:'Landing Beach',picture:'landing',
  intro:[['neri','The storm left us one beach and a lot of sand. Somewhere under the cliff is the Tideglass Vault.'],['ivo','First we make this beach a camp. Bring me parts and I will put them to work.']],
  tasks:[
   {id:'beach-path',name:'Clear the landing path',cost:4,icon:'rock',at:[18,78],effect:{kit:['rig',1]},
    lines:[['ivo','A path from the boats to dry ground. Now the crew can carry real loads.'],['ivo','Somebody left a driftwood crate on it: it is ours now.']]},
   {id:'beach-tent',name:'Pitch the camp tent',cost:6,icon:'crate-salvage',at:[33,70],effect:{energy:10},
    lines:[['neri','Dry blankets and hot tea. Everyone works faster after a rest.'],['ivo','+10 energy for the crew.']]},
   {id:'beach-mast',name:'Raise the signal mast',cost:8,icon:'source-chart',at:[52,58],effect:{slots:4},
    lines:[['neri','The mast is up. Camps along the reach can see our signal.'],['bram','More crews will send orders now: a fourth order card.']]},
   {id:'beach-workshop',name:'Restore the Coastal Workshop',cost:10,icon:'workshop',at:[12,52],effect:{producer:'rig'},
    lines:[['ivo','Tools on the wall, fire in the forge.'],['ivo','Rivet Rover gets a proper tune-up: one level up, better parts more often.']]},
   {id:'beach-pier',name:'Build the supply pier',cost:13,icon:'crate-survey',at:[78,74],effect:{kit:['newest',2]},
    lines:[['bram','A pier means supply boats. The first one brought a sea chest for our newest generator.']]},
   {id:'beach-beacon',name:'Light the beacon',cost:16,icon:'flux-3',at:[66,40],effect:{energy:15},
    lines:[['tamsin','The beacon burns all night. Nobody gets lost on this beach again.'],['ivo','The crew is rested and proud: +15 energy.']]},
   {id:'beach-cliff',name:'Open the cliff path',cost:20,icon:'chart-1',at:[86,30],effect:{area:true},
    lines:[['neri','The cliff path is open. Up there, the survey worksite and the Vault beyond it.'],['ivo','The beach is a camp now. Good work, everyone.']]}
  ]},
 {id:'worksite',name:'Survey Worksite',picture:'worksite',coming:true,tasks:[]},
 {id:'entrance',name:'Vault Entrance',picture:'entrance',coming:true,tasks:[]},
 {id:'vault',name:'The Vault',picture:'vault-open',coming:true,tasks:[]}
];
export const TASKS=Object.fromEntries(AREAS.flatMap(a=>a.tasks.map(t=>[t.id,{...t,area:a.id}])));
export const areaOf=id=>AREAS.find(a=>a.id===id);
