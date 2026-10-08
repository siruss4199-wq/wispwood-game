import {CELL_COUNT,PRODUCERS,STORAGE_UPGRADES} from './catalog.mjs';

export const SCHEMA=2;
export const OPEN_START=[18,19,20,21,26,27,28,29,34,35,36,37,42,43,44,45];
export const STARTER_SEEDS=[28,35];
export const TREE_INDEX=27;
export const STARTING_ITEMS=[
 [18,'leaf',1],[19,'wood',0],[20,'leaf',2],[21,'wood',1],
 [26,'leaf',1],[28,'leaf',0],[29,'wood',0],[34,'leaf',2],
 [35,'leaf',0],[36,'wood',1],[37,'leaf',3],[42,'wood',2],
 [43,'leaf',4],[44,'wood',3],[45,'leaf',5]
];
export const COBWEBS=[
 [10,'leaf',2],[11,'wood',1],[12,'leaf',3],[13,'wood',2],
 [17,'leaf',1],[22,'wood',3],[25,'leaf',4],[30,'wood',2],
 [33,'leaf',2],[38,'wood',4],[41,'leaf',3],[46,'wood',1]
];

export function createInitialState(){
 const cells=Array.from({length:CELL_COUNT},()=>({terrain:'locked',content:null}));
 for(const i of OPEN_START)cells[i]={terrain:'open',content:null};
 cells[TREE_INDEX].content={type:'producer',producerId:PRODUCERS.ancientTree.id};
 for(const [i,chain,tier] of STARTING_ITEMS)cells[i].content={type:'item',chain,tier};
 for(const [i,chain,tier] of COBWEBS)cells[i]={terrain:'cobweb',content:{type:'item',chain,tier}};
 return {
  schema:SCHEMA,
  energy:80,maxEnergy:100,
  coins:0,forestLight:0,
  moves:0,ordersCompleted:0,
  milestoneIndex:0,completedMilestones:[],
  producerLevels:{ancientTree:1,moonSpring:0,wispNest:0},
  producerTapCounts:{ancientTree:0,moonSpring:0,wispNest:0},
  storageLevel:0,storage:Array(STORAGE_UPGRADES[0]).fill(null),
  activeOrders:[],nextOrderSerial:1,
  discovered:{'leaf:0':true},
  unlockedCells:OPEN_START.length,
  cells
 };
}

export const cloneState=s=>structuredClone(s);
export const serialize=s=>JSON.stringify(s);
export function restore(raw){
 try{const s=JSON.parse(raw);return s?.schema===SCHEMA&&Array.isArray(s.cells)&&s.cells.length===CELL_COUNT?s:null;}catch{return null;}
}
