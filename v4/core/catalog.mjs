export const SIZE=8;
export const CELL_COUNT=64;
export const MAX_TIER=9;
export const PRODUCER_MAX_LEVEL=5;

// Stable family IDs preserve V4 inventories. Art keys are owned vector assets.
const chain=(id,name,names)=>({id,name,items:names.split('|').map((name,tier)=>({name,tier,art:`${id}-${tier}`,emoji:'',rarity:tier>=8?'heirloom':tier>=5?'rare':'common'}))});
export const CHAINS={
 leaf:chain('leaf','Canopy Weaving','Foldseed|Twinshoot|Veinleaf|Fern Fan|Woven Nest|Petal Canopy|Rainleaf Bower|Crown Arbor|Living Pavilion|Canopy Haven'),
 wood:chain('wood','Rootwright Craft','Root Curl|Forkwood|Bound Staves|Root Peg|Bentwood Frame|Trail Arch|Hollow Shelter|Rootwork Hall|Grove Belfry|Heartwood Lodge'),
 water:chain('water','Dewglass','Dew Bead|Dew Cup|Reed Vial|Coiled Flask|Drift Vessel|Dewglass Basin|Mist Fountain|Rain Choir|Cloud Conservatory|Watersong Spire'),
 crystal:chain('crystal','Echo Stone','Echo Grain|Splitstone|Chime Chip|Tuning Stone|Echo Fork|Resonant Wheel|Chime Array|Echo Beacon|Harmonic Gate|Valley Resonator'),
 magic:chain('magic','Gloamthread','Gloam Fibre|Light Loop|Wisp Spool|Thread Knot|Glow Shuttle|Dusk Loom|Luminous Sail|Nightward Kite|Aurora Awning|Skythread Vault'),
 relic:chain('relic','Memory Imprints','Bark Rubbing|Marked Tile|Memory Seal|Leaf Folio|Bound Ledger|Grove Atlas|Archive Stand|Memory Cabinet|Ancestral Alcove|Living Chronicle')
};
export const COLLECTION_TOTAL=Object.values(CHAINS).reduce((n,c)=>n+c.items.length,0);

export const CHAIN_MARKS={leaf:'FG',wood:'WD',water:'WT',crystal:'CR',magic:'MG',relic:'RL'};

export const PRODUCERS={
 ancientTree:{
  id:'ancientTree',name:'Rootfold Nursery',emoji:'🌳',unlockAt:0,
  chains:['leaf','wood'],
  cycle:[['leaf',0],['wood',0],['leaf',0],['wood',0],['leaf',1],['wood',0],['leaf',0],['wood',1]]
 },
 moonSpring:{
  id:'moonSpring',name:'Dewwheel Cistern',emoji:'⛲',unlockAt:3,
  chains:['water','crystal'],
  cycle:[['water',0],['water',0],['crystal',0],['water',1],['crystal',0],['water',0],['crystal',1],['water',0]]
 },
 wispNest:{
  id:'wispNest',name:'Gloamthread Loom',emoji:'🪺',unlockAt:8,
  chains:['magic','relic'],
  cycle:[['magic',0],['magic',0],['relic',0],['magic',1],['relic',0],['magic',0],['relic',1],['magic',0]]
 }
};

// Each workshop evolves independently with restoration, while upgrades improve yield.
export const PRODUCER_FORMS={
 ancientTree:['Seed Cradle','Rootfold Nursery','Canopy Workshop'],
 moonSpring:['Reed Collector','Dewwheel Cistern','Rain Choir Works'],
 wispNest:['Thread Basket','Gloamthread Loom','Memory Weavery']
};
export function producerStage(s,id){
 const p=PRODUCERS[id];
 return Math.max(0,Math.min(2,Math.floor((s.milestoneIndex-p.unlockAt)/4)));
}
export function producerForm(s,id){return PRODUCER_FORMS[id][producerStage(s,id)];}
export function producerDrop(s,id,tap=s.producerTapCounts[id]??0){
 const p=PRODUCERS[id],level=s.producerLevels[id]??1,stage=producerStage(s,id);
 const specialEvery=[16,14,12][stage];
 const special=(tap+1)%specialEvery===0;
 const [chain,tier]=special?[p.chains[1],2+stage]:p.cycle[tap%p.cycle.length];
 return {chain,tier:Math.min(MAX_TIER,tier+Math.floor((level-1)/2)+(level%2===0&&tap%4===3?1:0)),special};
}

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
 M('heart','Awaken the Heart of Wispwood','🌳',6100,184,[['leaf',9,1],['magic',8,1],['relic',8,1]])
];

export const STORAGE_UPGRADES=[6,8,10,13,16];
export function itemDef(chainId,tier){return CHAINS[chainId]?.items?.[tier]??null;}
export function producerForChain(chainId){return Object.values(PRODUCERS).find(p=>p.chains.includes(chainId))??null;}

