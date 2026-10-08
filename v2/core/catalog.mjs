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

export const QUESTS={
 firstHerb:{id:'firstHerb',title:'Healing Herb',chain:'leaf',tier:2}
};

export function itemDef(item){return CHAINS[item.chain]?.[item.tier]??null;}
