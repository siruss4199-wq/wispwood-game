export const SIZE=8;
export const CELL_COUNT=SIZE*SIZE;
export const MAX_TIER=5;

export const CHAINS={
 leaf:[
  {name:'Seed',emoji:'🌰'},
  {name:'Sprout',emoji:'🌱'},
  {name:'Herb',emoji:'🌿'},
  {name:'Bloom',emoji:'🌸'},
  {name:'Moon Flower',emoji:'🌺'},
  {name:'Ancient Blossom',emoji:'🪷'}
 ]
};

export const PRODUCERS={
 ancientTree:{id:'ancientTree',name:'Ancient Tree',emoji:'🌳',chain:'leaf',outputTier:0,energyCost:1}
};

export const FOREST_ORDERS=[
 {id:'order-herb',title:'Herb Request',description:'Prepare an Herb for a wounded forest spirit.',chain:'leaf',tier:2,rewardCoins:25,rewardLight:2,rewardEnergy:2},
 {id:'order-bloom',title:'Bloom Request',description:'Grow a Bloom for the Lost Clearing.',chain:'leaf',tier:3,rewardCoins:45,rewardLight:3,rewardEnergy:3},
 {id:'order-flower',title:'Moon Flower Request',description:'Craft a Moon Flower for the night spirits.',chain:'leaf',tier:4,rewardCoins:70,rewardLight:5,rewardEnergy:4}
];

export const RESTORATION_PROJECTS=[
 {id:'garden',title:'Wake the Garden',description:'Bring life back to the first patch of forest.',icon:'🌱',chain:'leaf',tier:2,coinCost:40,lightRequired:3,progress:25},
 {id:'bridge',title:'Repair the Bridge',description:'Reconnect the clearing to the old forest path.',icon:'🌉',chain:'leaf',tier:3,coinCost:90,lightRequired:8,progress:25},
 {id:'lanterns',title:'Light the Lanterns',description:'Guide lost spirits safely through the clearing.',icon:'🏮',chain:'leaf',tier:4,coinCost:150,lightRequired:15,progress:25},
 {id:'shelter',title:"Restore Mivra's Shelter",description:'Finish the clearing and give Mivra a home.',icon:'🏡',chain:'leaf',tier:5,coinCost:240,lightRequired:25,progress:25}
];

export const AREA={
 id:'lost-clearing',
 title:'Lost Clearing',
 nextArea:'Moonlit Grove'
};

export function itemDef(item){return CHAINS[item.chain]?.[item.tier]??null;}
