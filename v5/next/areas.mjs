// The coast, area by area. Crew orders pay coins; on the beach screen coins upgrade each
// place in three stages (user, 2026-10-22: "bielsen taskaas mungu olood undsen storygoo
// upgrade hiimeer baina, teren tusdaa orchinruu ochij upgrade hiih"). Every stage changes
// the picture, adds a line or two of story and gives a reward (energy, a crate, a Tide
// token, a fourth order card or a generator copy; every stage since build 22). Six stages
// give generator copies (build 18): level a generator to 3 with them to bring out the next kind. A place's first
// stage opens once the place before it has its first stage; its later stages follow its own.
// Pure data. Effects are applied by game.mjs.
const place=(id,icon,at,stages,art)=>({id,icon,at,name:stages[0].name,stages,...(art?{art}:{})});
// art: a place drawn stage by stage on the area picture (v5/assets/premium/coast/place-<art>-<stage>.webp,
// build 38); the others still show their icon.
export const AREAS=[
 // map (Build 41n): the coast screen's own picture, painted from above, with each place's stage
 // drawn on it as a separate layer standing on its point (at = where its ground sits, in %).
 {id:'beach',name:'Landing Beach',short:'BEACH',picture:'landing',map:'landing-map',
  intro:[['neri','The storm left us one beach and a lot of sand. Somewhere under the cliff is the Tideglass Vault.'],['ivo','First we make this beach a camp. Bring me parts and I will put them to work.']],
  tasks:[
   place('beach-path','rock',[27,86],[
    {name:'Clear the landing path',cost:40,effect:{kit:['rig',1]},lines:[['ivo','A path from the boats to dry ground. Now the crew can carry real loads.'],['ivo','Somebody left a driftwood crate on it: it is ours now.']]},
    {name:'Lay a boardwalk',cost:70,effect:{copy:'rig'},lines:[['ivo','Planks over the sand. The carts stop sinking.'],['ivo','A Rivet Rover was buried under the old planks! Merge it with yours.']]},
    {name:'Line the path with lanterns',cost:100,effect:{copy:'rig'},lines:[['neri','Lanterns all the way to the boats. Night shifts are safe now.'],['ivo','The first night shift dug up a Rivet Rover the storm had buried. Merge it with ours.']]}],'path'),
   place('beach-tent','crate-salvage',[52,62],[
    {name:'Pitch the camp tent',cost:80,effect:{energy:8},lines:[['neri','Dry blankets and hot tea. Everyone works faster after a rest.'],['ivo','+8 energy for the crew.']]},
    {name:'Add bunks and a stove',cost:100,effect:{copy:'rig'},lines:[['neri','Bunks and a stove. Nobody sleeps on wet sand any more.'],['ivo','Under the old bunks: a rusted Rivet Rover. A little oil and it runs. Merge it with ours.']]},
    {name:'Raise the mess hall',cost:120,effect:{token:1},lines:[['bram','A real mess hall. The crew eats together and plans together.']]}],'tent'),
   place('beach-mast','source-chart',[50,34],[
    {name:'Raise the signal mast',cost:100,effect:{slots:4},lines:[['neri','The mast is up. Camps along the reach can see our signal.'],['bram','More crews will send orders now: a fourth order card.']]},
    {name:'Hang the signal flags',cost:120,effect:{copy:'rig'},lines:[['neri','Flags for every crew along the reach. They know who we are.'],['bram','A neighbouring camp answered with a gift: another Rivet Rover.']]},
    {name:'Fit a lookout nest',cost:150,effect:{token:1},lines:[['tamsin','From the lookout I can see the cliff path, and something glinting beyond it.']]}],'mast'),
   place('beach-workshop','workshop',[21,47],[
    {name:'Restore the Coastal Workshop',cost:100,effect:{copy:'newest'},lines:[['ivo','Tools on the wall, fire in the forge.'],['ivo','In the back of the Workshop: a copy of our newest generator. Merge it in for a stronger one.']]},
    {name:'Fire up the forge',cost:120,effect:{kit:['newest',2]},lines:[['ivo','The forge is hot again. Every tool in camp gets a fresh edge.']]},
    {name:'Open the parts store',cost:150,effect:{kit:['newest',2]},lines:[['ivo','Shelves for every part we make. The Workshop runs like a clock.']]}],'workshop'),
   place('beach-pier','crate-survey',[66,80],[
    {name:'Build the supply pier',cost:120,effect:{kit:['newest',2]},lines:[['bram','A pier means supply boats. The first one brought a sea chest for our newest generator.']]},
    {name:'Add a cargo crane',cost:150,effect:{copy:'newest'},lines:[['bram','A crane on the pier. Supply boats unload in half the time.'],['bram','The first load off the crane: a copy of our newest generator.']]},
    {name:'Moor the supply boat',cost:180,effect:{kit:['newest',3]},lines:[['bram','Our own boat, tied up and ready. The beach is joined to the world again.']]}],'pier'),
   place('beach-beacon','flux-3',[76,40],[
    {name:'Light the beacon',cost:140,effect:{energy:10},lines:[['tamsin','The beacon burns all night. Nobody gets lost on this beach again.'],['ivo','The crew is rested and proud: +10 energy.']]},
    {name:'Mirror the beacon',cost:170,effect:{copy:'newest'},lines:[['tamsin','Brass mirrors double the light. Ships see us from the open sea.'],['tamsin','A trader followed the light in and left us a copy of our newest generator.']]},
    {name:'Crown the beacon',cost:200,effect:{token:1},lines:[['tamsin','The beacon wears a crown of tideglass. It hums when the tide turns.']]}],'beacon'),
   place('beach-cliff','chart-1',[88,56],[
    {name:'Clear the cliff path',cost:160,effect:{energy:3},lines:[['neri','Rockfall cleared. The path climbs halfway up the cliff.']]},
    {name:'Rope the cliff steps',cost:200,effect:{copy:'newest'},lines:[['ivo','Ropes and pegs on every step. Even the carts can climb now.'],['neri','Halfway up we found an old cache: a copy of our newest generator.']]},
    {name:'Open the cliff gate',cost:230,effect:{kit:['newest',3]},lines:[['neri','The cliff gate is open. Up there, the survey worksite and the Vault beyond it.'],['ivo','The beach is a camp now. Good work, everyone.']]}],'cliff')
  ]},
 // Area 2 (build 31, user: "ehleed ediin zasgiig changalaad 2-r busiig nem"): the same shape as the
 // beach, seven places in three stages, built around the Rope Winch. It opens when the beach's
 // last stage is bought; half of its everyday orders want Rope Winch parts (focus).
 // Its stage copies level the Rope Winch (bringing out the Shell Trap) and then the Shell Trap,
 // so the Lantern Kiln comes out before its last stage (build 36: 'Light the door' gives the
 // copy that was missing; the Kiln never came out before).
 {id:'worksite',name:'Survey Worksite',short:'SITE',picture:'worksite',focus:'rope',
  intro:[['neri','Up the cliff at last: the Survey Worksite. Old instruments half-buried in sand, and a door in the rock.'],['ivo','Everything up here is hauled, hoisted or lowered. The Rope Winch will be busy.']],
  tasks:[
   place('ws-camp','crate-survey',[10,50],[
    {name:'Pitch the survey camp',cost:80,effect:{energy:8},lines:[['bram','Tents up on the cliff top. The crew can sleep where it works.'],['ivo','+8 energy for the crew.']]},
    {name:'Stack the instrument crates',cost:100,effect:{kit:['newest',2]},lines:[['neri','Every crate labelled and stacked. One of them was still full: a sea chest for our newest generator.']]},
    {name:'Raise a drafting table',cost:130,effect:{token:1},lines:[['neri','A table for the maps. Now we can plan the whole cliff on paper first.']]}],'ws-camp'),
   place('ws-scope','chart-3',[28,64],[
    {name:'Set up the theodolite',cost:100,effect:{copy:'newest'},lines:[['neri','The old theodolite still turns. It points straight at the door in the rock.'],['ivo','Packed beside it: a copy of our newest generator. Merge it in.']]},
    {name:'Mark the survey lines',cost:130,effect:{energy:5},lines:[['neri','White lines across the whole worksite. Nobody digs in the wrong place again.']]},
    {name:'Chart the whole cliff',cost:140,effect:{kit:['newest',2]},lines:[['neri','The cliff is charted, every ledge and crack. The door sits in the middle of an old quarry.']]}],'ws-scope'),
   place('ws-ropes','rope-1',[14,86],[
    {name:'Coil the hauling ropes',cost:110,effect:{copy:'newest'},lines:[['ivo','Rope everywhere, tangled by the storm. Coiled, it is worth more than gold up here.'],['ivo','Under the last coil: a copy of our newest generator.']]},
    {name:'Splice the long lines',cost:140,effect:{token:1},lines:[['ivo','Spliced lines long enough to reach the beach. Loads can come straight up.']]},
    {name:'Rig the rope store',cost:160,effect:{kit:['rope',3]},lines:[['ivo','A proper rope store, dry and ordered. The Rope Winch never runs short.'],['bram','The store keeper left us a captain\'s trunk for the winch.']]}],'ws-ropes'),
   place('ws-steps','rock',[48,60],[
    {name:'Cut steps through the rocks',cost:130,effect:{energy:10},lines:[['ivo','Steps cut through the boulders. The carts reach the door now.'],['bram','The crew is proud of the work: +10 energy.']]},
    {name:'Fit hand ropes',cost:150,effect:{copy:'newest'},lines:[['ivo','Hand ropes on every step. Safe in the wind, safe in the rain.'],['neri','Wedged under a step: a copy of our newest generator.']]},
    {name:'Pave the quarry floor',cost:170,effect:{kit:['newest',2]},lines:[['bram','A level floor in front of the door. Room for the whole crew and all the tools.']]}],'ws-steps'),
   place('ws-pool','shell-2',[62,84],[
    {name:'Drain the tide pool',cost:140,effect:{kit:['newest',2]},lines:[['tamsin','The pool below the door drains with the tide. Shells everywhere, and something glinting.']]},
    {name:'Sieve the pool bed',cost:170,effect:{token:1},lines:[['tamsin','Sieved sand, sorted shells. One of them hums like the beacon did.']]},
    {name:'Wall in the pool',cost:200,effect:{copy:'newest'},lines:[['tamsin','A stone wall keeps the sea out. The pool is a workshop now.'],['tamsin','At the bottom: a copy of our newest generator.']]}],'ws-pool'),
   place('ws-hoist','source-rope',[89,70],[
    {name:'Raise the rope hoist',cost:160,effect:{energy:10},lines:[['ivo','A hoist on the cliff edge. One pull and the beach sends up anything we need.'],['bram','Supplies came up with the first load: +10 energy.']]},
    {name:'Gear the hoist',cost:200,effect:{copy:'newest'},lines:[['ivo','Brass gears from the Workshop. The hoist lifts twice the load.'],['ivo','The first geared load: a copy of our newest generator.']]},
    {name:'Run the hoist to the door',cost:220,effect:{kit:['newest',3]},lines:[['ivo','A line from the hoist straight to the door. Whatever is behind it, we can move it.']]}],'ws-hoist'),
   place('ws-door','lamp-2',[74,38],[
    {name:'Survey the vault door',cost:180,effect:{energy:5},lines:[['neri','The door is a dial, as tall as three of us. Every ring turns.']]},
    {name:'Light the door',cost:220,effect:{copy:'newest'},lines:[['tamsin','Lanterns all around the dial. The tideglass in it glows back at us.'],['tamsin','We will need lamps of our own up here. Packed with the lanterns: a copy of our newest generator.']]},
    {name:'Map the dial',cost:240,effect:{kit:['newest',3]},lines:[['neri','Every ring of the dial is mapped. Now we know how it opens.'],['bram','The worksite is done. Next: the Vault Entrance itself.']]}],'ws-door')
  ]},
 // Build 47b: Chapter 1's finale (from PR #80's Vault door): the mapped dial, three rings, each turned
 // with its own stage; the inner ring names its materials (a Signal lamp and a Bearing dial). Turning
 // it opens the Vault. Picture: the coast's own Vault (the Home and story art), not PR #80's door.
 {id:'entrance',name:'Vault Entrance',short:'DOOR',picture:'vault-door',
  intro:[['neri','The dial is mapped: three rings, each with its own mechanism.'],['ivo','Bring me the parts for each ring and we turn them one by one.']],
  tasks:[
   place('vault-door','lamp-3',[48.7,50],[
    {name:'Turn the outer ring',cost:240,effect:{energy:10},lines:[['neri','The outer ring turns. Two to go.']]},
    {name:'Turn the middle ring',cost:280,effect:{kit:['newest',3]},lines:[['tamsin','The middle ring is turning. The tideglass in the dial glows brighter.']]},
    {name:'Turn the inner ring',cost:320,gold:[['lamp',3,1],['chart',4,1]],effect:{},lines:[['bram','The inner ring is set. Stand back.']]}])
  ]},
 // Chapter 2, The Silent Observatory (PR #80's chapter, kept by the director on 2026-10-28). Build
 // 47d: inside the open Vault, a short bridge first, the Tide Archive (one place, three stages): its
 // gold orders want the late generators' parts (Shell Trap, Lantern Kiln), and its index points to
 // the Observatory. The wave seal links the archive to the intro's letter without saying who sent it.
 // Picture: PR #80's Observatory interior; the archive sits on its shelves (no archive art yet).
 {id:'vault',name:'The Silent Observatory',short:'VAULT',picture:'observatory',map:'observatory-map',focus:'optic',
  intro:[['tamsin','Records, floor to ceiling, every one sealed against the damp.'],['bram','Lamps first. Then we find out what this place was for.']],
  tasks:[
   place('vault-archive','chart-1',[33,33],[
    {name:'Light the archive',cost:100,gold:[['lamp',2,2]],effect:{energy:8},lines:[['tamsin','Two lanterns and the whole room shows: shelf after shelf of records.']]},
    {name:'Dry the sealed records',cost:120,gold:[['shell',3,1],['lamp',3,1]],effect:{token:1},lines:[['neri','The same wave seal as on your letter, pressed into every cover.'],['bram','Then the letter and this archive belong together. Who sealed them is another question.']]},
    {name:'Read the archive index',cost:140,gold:[['shell',4,1],['lamp',2,1]],effect:{kit:['newest',2]},lines:[['neri','The index points deeper in: instruments, logbooks, an observatory.'],['ivo','Then that is where we go.']]}]),
   // Build 47e: the Observatory itself, PR #80's five places as they were (costs, rewards, authored
   // gold, the sea gate waiting for the array), behind the archive: its hall opens once the index is
   // read. The Lens Bench is earned here (copy:'optic'), and half of the everyday orders want optics
   // once it is out (focus).
   {...place('obs-hall','lamp-1',[50,84],[
    {name:'Light the entrance hall',cost:110,requires:{'vault-archive':3},effect:{energy:8},lines:[['tamsin','These lamps were trimmed by hand, for years. Somebody worked here.']]},
    {name:'Clear the fallen stones',cost:130,effect:{token:1},lines:[['ivo','Somebody built this hall to last. The stones came off the dome, nothing more.']]},
    {name:'Hang the banners',cost:150,effect:{kit:['newest',2]},lines:[['neri','A compass and a crescent on every banner. That mark was on the door too.']]}],'obs-hall')},
   place('obs-desk','chart-3',[22,64],[
    {name:'Right the survey desk',cost:130,effect:{energy:8},lines:[['neri','Logbooks. Hundreds of them, all in the same hand.']]},
    {name:'Unroll the old charts',cost:150,effect:{token:1},lines:[['neri','Every chart here carries the same mark: the fleet that no shipping register remembers.'],['bram','So they worked from here.']]},
    {name:'Read the last logbook',cost:170,effect:{kit:['newest',2]},lines:[['tamsin','The last entry says: "Array silent. Lenses sent to the bench for regrinding." Then nothing.'],['neri','Then we start at the bench.']]}],'obs-desk'),
   place('obs-bench','optic-2',[79,64],[
    {name:'Clear the lens bench',cost:150,effect:{copy:'optic'},lines:[['ivo','A grinding wheel and a box of raw sea glass. We can make lenses again.']]},
    {name:'Fit the grinding wheel',cost:170,effect:{copy:'optic'},lines:[['ivo','The wheel turns true. Merge the new bench with ours: twice the work.']]},
    {name:'Polish the reading lens',cost:190,effect:{kit:['optic',2]},lines:[['neri','The big lens is clear again. Now the array can see.']]}],'obs-bench'),
   place('obs-array','optic-3',[50,50],[
    {name:'Reseat the array crystal',cost:170,gold:[['optic',2,1],['lamp',2,2]],effect:{energy:10},lines:[['tamsin','The crystal is cold. It needs focused light.']]},
    {name:'Align the brass rings',cost:200,gold:[['optic',3,1],['chart',4,1]],effect:{cog:1},lines:[['neri','The rings are set to a bearing, not to a star.']]},
    {name:'Wake the array',cost:230,gold:[['optic',4,1],['lamp',3,1]],effect:{kit:['optic',3]},lines:[['tamsin','It is waking.']]}],'obs-array'),
   place('obs-passage','rope-4',[50,24],[
    {name:'Unbar the inner passage',cost:190,effect:{energy:10},lines:[['bram','Cold air. This passage goes out to the sea.']]},
    {name:'Shore up the tunnel',cost:220,effect:{cog:1},lines:[['ivo','Timber and brass. The same hands as the bench.']]},
    {name:'Open the sea gate',cost:250,requires:{'obs-array':3},gold:[['optic',4,1],['rope',4,1]],effect:{},lines:[['neri','The bearing runs straight through there.']]}],'obs-passage')
  ]},
 // Chapter 3 is not built: listed as coming, never playable (no places; from PR #80).
 {id:'harbour',name:'The Hidden Harbour',picture:'harbour',coming:true,tasks:[]}
];
// The next area opens when this one's last stage is bought (game.mjs restore and load).
export const TASKS=Object.fromEntries(AREAS.flatMap(a=>a.tasks.map(t=>[t.id,{...t,area:a.id}])));
export const STAGES=3;
export const areaOf=id=>AREAS.find(a=>a.id===id);
