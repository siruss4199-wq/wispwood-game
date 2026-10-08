import {CELL_COUNT,PRODUCERS,STORAGE_UPGRADES} from './catalog.mjs';

export const SCHEMA=2;
export const STARTER=[26,34];
export const FIRST_TREE=33;
export const FIRST_CLEARING=[27,28,35,36];

function crate(){
 return {terrain:'crate',reveal:{type:'item',chain:'leaf',tier:0},content:null};
}

export function createInitialState(){
 const cells=Array.from({length:CELL_COUNT},crate);
 for(const i of STARTER)cells[i]={terrain:'open',reveal:null,content:{type:'item',chain:'leaf',tier:0}};
 cells[FIRST_TREE].reveal={type:'producer',producerId:PRODUCERS.ancientTree.id};
 for(const i of FIRST_CLEARING)cells[i].reveal={type:'empty'};
 return {
  schema:SCHEMA,
  phase:'first_merge',
  energy:30,maxEnergy:30,
  coins:0,forestLight:0,
  moves:0,ordersCompleted:0,
  restorationIndex:0,completedRestorations:[],
  producerLevels:{ancientTree:1,moonSpring:0,wispNest:0},
  storageLevel:0,storage:Array(STORAGE_UPGRADES[0].slots).fill(null),
  activeOrders:[],
  discovered:{'leaf:0':true},
  nextOrderSerial:1,
  explorationPoints:0,
  exploredCrates:0,
  cells
 };
}

export function cloneState(s){return structuredClone(s);}
export function serialize(s){return JSON.stringify(s);}
export function restore(raw){
 try{
  const s=JSON.parse(raw);
  return s?.schema===SCHEMA&&Array.isArray(s.cells)&&s.cells.length===CELL_COUNT?s:null;
 }catch{return null;}
}
