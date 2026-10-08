export const SIZE=8;
export const CELL_COUNT=64;
export const MAX_TIER=7;

const chain=(id,name,items)=>({id,name,items:items.map(([name,emoji],tier)=>({name,emoji,tier}))});
export const CHAINS={
 leaf:chain('leaf','Forest Growth',[['Seed','🌰'],['Sprout','🌱'],['Herb','🌿'],['Fern','🍃'],['Bloom','🌸'],['Moon Flower','🌺'],['Ancient Blossom','🪷'],['Elder Crown','🍀']]),
 wood:chain('wood','Ancient Wood',[['Twig','🪵'],['Branch','🌾'],['Bundle','🧺'],['Carved Wood','🪚'],['Totem','🗿'],['Spirit Totem','🧿'],['Heartwood','🟤'],['Worldroot','🌳']]),
 water:chain('water','Moon Water',[['Drop','💧'],['Dew','🫧'],['Flask','🧴'],['Elixir','🧪'],['Moonwater','🌀'],['Sacred Water','🩵'],['Moonwell','🌊'],['Lunar Chalice','🏺']]),
 crystal:chain('crystal','Crystal Stone',[['Pebble','🪨'],['Shard','🔹'],['Gem','💎'],['Prism','🔷'],['Moon Gem','♦️'],['Star Crystal','💠'],['Soul Crystal','🧊'],['Crown Crystal','👑']]),
 magic:chain('magic','Wisp Light',[['Spark','✨'],['Wisp','🟣'],['Glow Orb','🪩'],['Star Dust','🌟'],['Star Shard','💫'],['Aurora','🌌'],['Spirit Flame','🔥'],['Heart Star','⭐']]),
 relic:chain('relic','Lost Relics',[['Scrap','⚙️'],['Rune','🪬'],['Charm','📿'],['Idol','🪆'],['Tablet','📜'],['Moon Relic','🌙'],['Ancient Key','🗝️'],['Forest Heart','💜']])
};

export const CHAIN_MARKS={leaf:'FG',wood:'WD',water:'WT',crystal:'CR',magic:'MG',relic:'RL'};

export const PRODUCERS={
 ancientTree:{
  id:'ancientTree',name:'Ancient Tree',emoji:'🌳',unlockAt:0,
  chains:['leaf','wood'],
  cycle:[['leaf',0],['leaf',0],['wood',0],['leaf',0],['leaf',1],['wood',0],['leaf',0],['wood',1]]
 },
 moonSpring:{
  id:'moonSpring',name:'Moon Spring',emoji:'⛲',unlockAt:3,
  chains:['water','crystal'],
  cycle:[['water',0],['water',0],['crystal',0],['water',1],['crystal',0],['water',0],['crystal',1],['water',0]]
 },
 wispNest:{
  id:'wispNest',name:'Wisp Nest',emoji:'🪺',unlockAt:8,
  chains:['magic','relic'],
  cycle:[['magic',0],['magic',0],['relic',0],['magic',1],['relic',0],['magic',0],['relic',1],['magic',0]]
 }
};

const M=(id,title,icon,coinCost,lightRequired,requirements,unlock=null)=>({id,title,icon,coinCost,lightRequired,requirements,unlock});
export const MILESTONES=[
 M('garden','Wake the Garden','🌱',80,4,[['leaf',3,1],['wood',1,1]]),
 M('path','Clear the Old Path','🪵',130,7,[['leaf',3,1],['wood',2,1]]),
 M('well','Repair the Forest Well','🪣',190,10,[['leaf',4,1],['wood',2,1]],'moonSpring'),
 M('bridge','Repair the Bridge','🌉',280,14,[['leaf',4,1],['wood',3,1],['water',2,1]]),
 M('lanterns','Restore the Lanterns','🏮',390,19,[['water',3,1],['crystal',2,1]]),
 M('workshop','Rebuild the Workshop','🛠️',520,25,[['wood',4,1],['crystal',3,1]]),
 M('pond','Restore the Moon Pond','🌙',680,32,[['water',4,1],['crystal',3,1]]),
 M('shrine','Awaken the Shrine','⛩️',870,40,[['leaf',5,1],['water',4,1],['crystal',3,1]],'wispNest'),
 M('archive','Open the Lost Archive','📚',1100,49,[['magic',2,1],['relic',2,1],['wood',4,1]]),
 M('observatory','Repair the Observatory','🔭',1380,59,[['magic',3,1],['crystal',4,1],['relic',2,1]]),
 M('cottage','Rebuild Mivra’s Cottage','🏡',1710,70,[['leaf',5,1],['wood',5,1],['magic',3,1]]),
 M('gate','Open the Moon Gate','🚪',2100,82,[['magic',4,1],['relic',3,1],['water',5,1]]),
 M('grove','Restore the Wisp Grove','🌲',2550,95,[['leaf',6,1],['magic',4,1],['crystal',4,1]]),
 M('library','Restore the Rune Library','📖',3050,110,[['relic',4,1],['wood',5,1],['crystal',5,1]]),
 M('sanctuary','Restore the Sanctuary','🕯️',3650,126,[['magic',5,1],['water',5,1],['leaf',6,1]]),
 M('mivra','Restore Mivra’s Shelter','💜',4350,144,[['relic',5,1],['leaf',6,1],['wood',6,1]]),
 M('heartpath','Open the Heart Path','🛤️',5150,163,[['magic',6,1],['crystal',6,1],['water',6,1]]),
 M('heart','Awaken the Heart of Wispwood','🌳',6100,184,[['leaf',7,1],['magic',6,1],['relic',6,1]])
];

export const STORAGE_UPGRADES=[6,8,10,13,16];
export function itemDef(chainId,tier){return CHAINS[chainId]?.items?.[tier]??null;}
export function producerForChain(chainId){return Object.values(PRODUCERS).find(p=>p.chains.includes(chainId))??null;}
