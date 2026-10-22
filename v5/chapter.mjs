// Chapter 1 data: one coast task at a time. Tasks consume items directly and
// restore a site on the scene. Rewards are capability (energy, rich pulls,
// producer upgrades) and cases of raw parts for the next task, never finished
// mid-tier parts.
export const need=(family,tier,count=1)=>({family,tier,count});

export const PRODUCERS={
 rig:{name:'Rivet Rover',family:'rig',job:'Repair tools for the pier, Workshop and Stone Lift',home:0},
 chart:{name:'Survey Kite',family:'chart',job:'Charts and lenses for navigation',home:5},
 flux:{name:'Echo Crucible',family:'flux',job:'Signal parts for the old machines',home:30}
};

// Sites appear in this order on the coast strip above the board.
export const SITES={
 landing:{name:'Landing path'},
 pier:{name:'Storm pier'},
 table:{name:'Chart table'},
 workshop:{name:'Workshop'},
 crossing:{name:'Crossing'},
 lift:{name:'Stone Lift'},
 beacon:{name:'Tide beacon'},
 rings:{name:'Ring engine'},
 vault:{name:'Tideglass Vault'},
 mast:{name:'Signal mast'}
};

export const TASKS=[
 {id:'path',site:'landing',who:'Ivo',title:'Clear the landing path',
  why:'Storm debris blocks the beach. A Grip tool will lever it aside.',
  needs:[need('rig',1)],reward:{energy:3,case:'salvage'},
  line:'Path is clear. Our camp can finally reach the old pier.'},
 {id:'brace',site:'pier',who:'Ivo',title:'Brace the storm pier',
  why:'The pier sways in the swell. Two Grip tools will brace its supports.',
  needs:[need('rig',1,2)],reward:{energy:4,orders:true},
  line:'The supports hold. The crew is asking for spare parts. Their orders pay in energy.'},
 {id:'deck',site:'pier',who:'Ivo',title:'Lay the pier deck',
  why:'A Split spanner will bolt the new deck in place.',
  needs:[need('rig',2)],reward:{energy:5,unlock:'chart',case:'survey'},
  line:'Neri can launch her Survey Kite from the deck now. Let us see what the coast looks like from above.'},
 {id:'table',site:'table',who:'Neri',title:'Restore the chart table',
  why:'Two Route folds will rebuild Neri\'s chart of this shore.',
  needs:[need('chart',1,2)],reward:{energy:5,case:'salvage',rich:['chart',3]},
  line:'Two charts of the same coast disagree. One shoreline was erased by hand. Someone did not want this place found.'},
 {id:'workshop',site:'workshop',who:'Ivo',title:'Repair the Workshop',
  why:'A Split spanner and a Route fold get Ivo\'s Workshop running again.',
  needs:[need('rig',2),need('chart',1)],reward:{energy:6,case:'survey',upgrade:'rig'},
  line:'The Workshop is back. Rivet Rover now turns out better parts more often.'},
 {id:'survey',site:'crossing',who:'Neri',title:'Chart the safe crossing',
  why:'A Sight lens and a Split spanner let Neri survey the erased channel.',
  needs:[need('chart',2),need('rig',2)],reward:{energy:6,case:'salvage'},
  line:'There are two ways across: the Ridge or the old Conduit. We can only rig one.'},
 {id:'crossing',site:'crossing',who:'Neri',title:'Choose the crossing',
  why:'Two ways across. Each takes one part and makes a different producer stronger.',
  choices:{
   ridge:{label:'Ridge',needs:[need('rig',3)],reward:{upgrade:'rig'},line:'Ivo rigs the Ridge. Below it, something hums: an old Echo Crucible, still warm.'},
   conduit:{label:'Conduit',needs:[need('chart',3)],reward:{upgrade:'chart'},line:'Neri threads the Conduit. At its end sits an old Echo Crucible, still warm.'}
  },
  needs:[],reward:{energy:8,unlock:'flux',case:'relic'}},
 {id:'lift',site:'lift',who:'Ivo',title:'Wake the Stone Lift',
  why:'A Pocket winch to turn it and a Loop cell to power it.',
  needs:[need('rig',3),need('flux',1)],reward:{energy:8,case:'survey',rich:['flux',3]},
  line:'The Lift groans awake and raises a beacon frame out of the sand.'},
 {id:'beacon',site:'beacon',who:'Neri',title:'Raise the tide beacon',
  why:'A Pulse coil and a Sight lens focus the beacon on the old shipping lane.',
  needs:[need('flux',2),need('chart',2)],reward:{energy:8,case:'relic'},
  line:'The beacon answers a pulse from inland. The ring engine is still alive.'},
 {id:'rings',site:'rings',who:'Neri',title:'Wake the ring engine',
  why:'A Resonator and a Survey scope bring the three rings into line.',
  needs:[need('flux',3),need('chart',3)],reward:{energy:10,case:'survey',rich:['rig',3]},
  line:'The rings turn. Their light points at a sealed door in the cliff: the Tideglass Vault.'},
 {id:'vault',site:'vault',who:'Ivo',title:'Open the Tideglass Vault',
  why:'A Pocket winch, a Survey scope and a Resonator, one from each producer.',
  needs:[need('rig',3),need('chart',3),need('flux',3)],reward:{energy:12,case:'locker'},
  line:'Inside, a sky of moving stars. And in its centre, a crown of tide-glass, humming.'},
 {id:'signal',site:'vault',who:'Neri',title:'Listen to the crown',
  why:'The crown is not treasure. It is a signal lens. Listen to what it carries.',
  needs:[],reward:{energy:5,case:'salvage'},
  line:'It is the lost fleet\'s homing call, and something beyond the horizon is answering it. Who is still out there?'},
 {id:'mast',site:'mast',who:'Ivo',title:'Build the signal mast',
  why:'To answer the signal: a Crawler jack, a Bearing dial and a Phase lantern.',
  needs:[need('rig',4),need('chart',4),need('flux',4)],reward:{energy:15},
  line:'The mast is up and the call goes out. Chapter 2 begins when the fleet replies.'}
];

export const taskById=id=>TASKS.find(t=>t.id===id);
// Scene art follows the chapter: landing → camp → entrance → powered rings → open Vault.
export const sceneFor=done=>done<3?0:done<7?1:done<10?2:done<11?3:4;
