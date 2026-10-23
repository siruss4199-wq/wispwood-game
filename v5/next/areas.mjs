// The coast, area by area. Crew orders pay coins; on the beach screen coins upgrade each
// place in three stages (user, 2026-10-22: "bielsen taskaas mungu olood undsen storygoo
// upgrade hiimeer baina, teren tusdaa orchinruu ochij upgrade hiih"). Every stage changes
// the picture and adds a line or two of story; first stages also give a reward (energy, a
// crate, a fourth order card or a generator copy), and five stages give generator copies
// (build 18): level a generator to 3 with them to bring out the next kind. A place's first
// stage opens once the place before it has its first stage; its later stages follow its own.
// Pure data. Effects are applied by game.mjs.
const place=(id,icon,at,stages)=>({id,icon,at,name:stages[0].name,stages});
export const AREAS=[
 {id:'beach',name:'Landing Beach',picture:'landing',
  intro:[['neri','The storm left us one beach and a lot of sand. Somewhere under the cliff is the Tideglass Vault.'],['ivo','First we make this beach a camp. Bring me parts and I will put them to work.']],
  tasks:[
   place('beach-path','rock',[18,78],[
    {name:'Clear the landing path',cost:15,effect:{kit:['rig',1]},lines:[['ivo','A path from the boats to dry ground. Now the crew can carry real loads.'],['ivo','Somebody left a driftwood crate on it: it is ours now.']]},
    {name:'Lay a boardwalk',cost:20,effect:{copy:'rig'},lines:[['ivo','Planks over the sand. The carts stop sinking.'],['ivo','A Rivet Rover was buried under the old planks! Merge it with yours.']]},
    {name:'Line the path with lanterns',cost:30,lines:[['neri','Lanterns all the way to the boats. Night shifts are safe now.']]}]),
   place('beach-tent','crate-salvage',[33,70],[
    {name:'Pitch the camp tent',cost:25,effect:{energy:15},lines:[['neri','Dry blankets and hot tea. Everyone works faster after a rest.'],['ivo','+15 energy for the crew.']]},
    {name:'Add bunks and a stove',cost:30,lines:[['neri','Bunks and a stove. Nobody sleeps on wet sand any more.']]},
    {name:'Raise the mess hall',cost:40,lines:[['bram','A real mess hall. The crew eats together and plans together.']]}]),
   place('beach-mast','source-chart',[52,58],[
    {name:'Raise the signal mast',cost:35,effect:{slots:4},lines:[['neri','The mast is up. Camps along the reach can see our signal.'],['bram','More crews will send orders now: a fourth order card.']]},
    {name:'Hang the signal flags',cost:45,effect:{copy:'rig'},lines:[['neri','Flags for every crew along the reach. They know who we are.'],['bram','A neighbouring camp answered with a gift: another Rivet Rover.']]},
    {name:'Fit a lookout nest',cost:55,lines:[['tamsin','From the lookout I can see the cliff path, and something glinting beyond it.']]}]),
   place('beach-workshop','workshop',[12,52],[
    {name:'Restore the Coastal Workshop',cost:45,effect:{copy:'rig'},lines:[['ivo','Tools on the wall, fire in the forge.'],['ivo','In the back of the Workshop: a second Rivet Rover! Merge the two and you get a stronger one.']]},
    {name:'Fire up the forge',cost:55,lines:[['ivo','The forge is hot again. Every tool in camp gets a fresh edge.']]},
    {name:'Open the parts store',cost:70,lines:[['ivo','Shelves for every part we make. The Workshop runs like a clock.']]}]),
   place('beach-pier','crate-survey',[78,74],[
    {name:'Build the supply pier',cost:55,effect:{kit:['newest',2]},lines:[['bram','A pier means supply boats. The first one brought a sea chest for our newest generator.']]},
    {name:'Add a cargo crane',cost:70,effect:{copy:'newest'},lines:[['bram','A crane on the pier. Supply boats unload in half the time.'],['bram','The first load off the crane: a copy of our newest generator.']]},
    {name:'Moor the supply boat',cost:80,lines:[['bram','Our own boat, tied up and ready. The beach is joined to the world again.']]}]),
   place('beach-beacon','flux-3',[66,40],[
    {name:'Light the beacon',cost:65,effect:{energy:20},lines:[['tamsin','The beacon burns all night. Nobody gets lost on this beach again.'],['ivo','The crew is rested and proud: +20 energy.']]},
    {name:'Mirror the beacon',cost:80,effect:{copy:'newest'},lines:[['tamsin','Brass mirrors double the light. Ships see us from the open sea.'],['tamsin','A trader followed the light in and left us a copy of our newest generator.']]},
    {name:'Crown the beacon',cost:90,lines:[['tamsin','The beacon wears a crown of tideglass. It hums when the tide turns.']]}]),
   place('beach-cliff','chart-1',[86,30],[
    {name:'Clear the cliff path',cost:75,lines:[['neri','Rockfall cleared. The path climbs halfway up the cliff.']]},
    {name:'Rope the cliff steps',cost:90,effect:{copy:'newest'},lines:[['ivo','Ropes and pegs on every step. Even the carts can climb now.'],['neri','Halfway up we found an old cache: a copy of our newest generator.']]},
    {name:'Open the cliff gate',cost:105,lines:[['neri','The cliff gate is open. Up there, the survey worksite and the Vault beyond it.'],['ivo','The beach is a camp now. Good work, everyone.']]}])
  ]},
 {id:'worksite',name:'Survey Worksite',picture:'worksite',coming:true,tasks:[]},
 {id:'entrance',name:'Vault Entrance',picture:'entrance',coming:true,tasks:[]},
 {id:'vault',name:'The Vault',picture:'vault-open',coming:true,tasks:[]}
];
export const TASKS=Object.fromEntries(AREAS.flatMap(a=>a.tasks.map(t=>[t.id,{...t,area:a.id}])));
export const STAGES=3;
export const areaOf=id=>AREAS.find(a=>a.id===id);
