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

export const CHAPTER_QUESTS=[
 {id:'healing-herb',title:'Healing Herb',description:'Create an Herb for Mivra.',chain:'leaf',tier:2,rewardEnergy:3},
 {id:'forest-bloom',title:'Forest Bloom',description:'Grow a Bloom to restore the clearing.',chain:'leaf',tier:3,rewardEnergy:4},
 {id:'moon-flower',title:'Moon Flower',description:'Craft a Moon Flower to rescue Mivra.',chain:'leaf',tier:4,rewardEnergy:5}
];

export const FOREST_ORDERS=[
 {id:'order-herb',title:'Herb Request',description:'Prepare another Herb for the forest.',chain:'leaf',tier:2,rewardEnergy:2},
 {id:'order-bloom',title:'Bloom Request',description:'Prepare a Bloom for the sanctuary.',chain:'leaf',tier:3,rewardEnergy:3},
 {id:'order-flower',title:'Moon Flower Request',description:'Prepare a Moon Flower for the spirits.',chain:'leaf',tier:4,rewardEnergy:4}
];

export function itemDef(item){return CHAINS[item.chain]?.[item.tier]??null;}
