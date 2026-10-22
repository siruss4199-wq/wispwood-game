// The coast, area by area. Each area is restored task by task with ◆ stars from
// crew orders; each task changes the picture and adds a line or two of story.
// Pure data. Effects are applied by game.mjs.
export const AREAS=[
 {id:'beach',name:'Landing Beach',picture:'landing',
  intro:[['neri','The storm left us one beach and a lot of sand. Somewhere under the cliff is the Tideglass Vault.'],['ivo','First we make this beach a camp. Bring me parts and I will put them to work.']],
  tasks:[
   {id:'beach-path',name:'Clear the landing path',cost:4,icon:'rock',at:[18,78],
    lines:[['ivo','A path from the boats to dry ground. Now the crew can carry real loads.']]},
   {id:'beach-tent',name:'Pitch the camp tent',cost:6,icon:'crate-salvage',at:[33,70],effect:{energy:10},
    lines:[['neri','Dry blankets and hot tea. Everyone works faster after a rest.'],['ivo','+10 energy for the crew.']]},
   {id:'beach-mast',name:'Raise the signal mast',cost:9,icon:'source-chart',at:[52,58],effect:{source:'chart'},
    lines:[['neri','The mast is up and my Survey Kite can fly from it.'],['neri','Kite parts will lead us to routes nobody has charted.']]},
   {id:'beach-workshop',name:'Restore the Coastal Workshop',cost:12,icon:'workshop',at:[12,52],effect:{producer:'rig'},
    lines:[['ivo','Tools on the wall, fire in the forge.'],['ivo','Rivet Rover gets a proper tune-up: one level up.']]},
   {id:'beach-pier',name:'Build the supply pier',cost:16,icon:'crate-survey',at:[78,74],effect:{kit:['chart',2]},
    lines:[['bram','A pier means supply boats. The first one brought a Medium map satchel.']]},
   {id:'beach-beacon',name:'Light the beacon',cost:20,icon:'flux-3',at:[66,40],effect:{slots:4},
    lines:[['tamsin','The beacon reaches the other camps along the reach.'],['bram','More crews will send orders now: a fourth order card.']]},
   {id:'beach-cliff',name:'Open the cliff path',cost:26,icon:'chart-1',at:[86,30],effect:{area:true},
    lines:[['neri','The cliff path is open. Up there, the survey worksite and the Vault beyond it.'],['ivo','The beach is a camp now. Good work, everyone.']]}
  ]},
 {id:'worksite',name:'Survey Worksite',picture:'worksite',coming:true,tasks:[]},
 {id:'entrance',name:'Vault Entrance',picture:'entrance',coming:true,tasks:[]},
 {id:'vault',name:'The Vault',picture:'vault-open',coming:true,tasks:[]}
];
export const TASKS=Object.fromEntries(AREAS.flatMap(a=>a.tasks.map(t=>[t.id,{...t,area:a.id}])));
export const areaOf=id=>AREAS.find(a=>a.id===id);
