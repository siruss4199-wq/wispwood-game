export const SIZE=8;
export const CELL_COUNT=SIZE*SIZE;
export const MAX_TIER=9;

export const CHAINS={
 leaf:{id:'leaf',name:'Forest Growth',producerId:'ancientTree',items:[
  ['Seed','🌰'],['Sprout','🌱'],['Herb','🌿'],['Fern','🍃'],['Bloom','🌸'],['Moon Flower','🌺'],['Ancient Blossom','🪷'],['Spirit Wreath','🌿'],['Elder Crown','👑'],['Heartwood Relic','🪵']
 ]},
 water:{id:'water',name:'Moon Water',producerId:'moonSpring',items:[
  ['Drop','💧'],['Dew','🫧'],['Flask','🧴'],['Elixir','🧪'],['Moonwater','🔹'],['Crystal Vial','💎'],['Sacred Water','🩵'],['Moonwell','🌊'],['Tidal Sigil','🔷'],['Lunar Chalice','🏺']
 ]},
 magic:{id:'magic',name:'Wisp Light',producerId:'wispNest',items:[
  ['Spark','✨'],['Wisp','🟣'],['Glow Orb','🔮'],['Star Dust','🌟'],['Star Shard','💠'],['Aurora','🌌'],['Spirit Flame','🔥'],['Celestial Core','💫'],['Constellation','🌠'],['Heart Star','⭐']
 ]}
};

export const PRODUCERS={
 ancientTree:{id:'ancientTree',name:'Ancient Tree',emoji:'🌳',chain:'leaf',energyCost:1,unlockNode:0},
 moonSpring:{id:'moonSpring',name:'Moon Spring',emoji:'💧',chain:'water',energyCost:1,unlockNode:3},
 wispNest:{id:'wispNest',name:'Wisp Nest',emoji:'✨',chain:'magic',energyCost:1,unlockNode:6}
};

export const RESTORATION_NODES=[
 ['garden','Wake the Garden','🌱',35,2,'leaf',2],
 ['path','Clear the Forest Path','🪵',55,4,'leaf',3],
 ['well','Repair the Old Well','🪣',80,6,'leaf',3],
 ['bridge','Repair the Bridge','🌉',120,9,'leaf',4],
 ['lanterns','Restore the Lanterns','🏮',160,12,'water',2],
 ['workshop','Rebuild the Workshop','🛠️',210,15,'water',3],
 ['pond','Restore the Moon Pond','🌙',270,19,'water',4],
 ['cottage','Rebuild the Cottage','🏡',340,23,'leaf',5],
 ['shrine','Restore the Shrine','⛩️',430,28,'magic',2],
 ['gate','Open the Moon Gate','🚪',540,34,'magic',3],
 ['sanctuary','Restore the Sanctuary','🕯️',680,41,'magic',4],
 ['shelter',"Restore Mivra's Shelter",'💜',850,50,'leaf',6]
].map(([id,title,icon,coinCost,lightRequired,chain,tier],index)=>({id,title,icon,coinCost,lightRequired,chain,tier,index}));

export const STORAGE_UPGRADES=[
 {slots:5,cost:0},{slots:7,cost:120},{slots:9,cost:260},{slots:12,cost:520}
];

export function itemDef(chain,tier){
 const row=CHAINS[chain]?.items?.[tier];
 return row?{name:row[0],emoji:row[1],chain,tier}:null;
}
