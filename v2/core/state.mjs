import {CELL_COUNT,PRODUCERS,QUESTS} from './catalog.mjs';

export const SCHEMA=1;
export const STARTER_SEEDS=[26,34];
export const FIRST_REVEALS={producer:33,empty:35};

function crateCell(){return {terrain:'crate',reveal:{type:'empty'},content:null};}

export function createInitialState(){
 const cells=Array.from({length:CELL_COUNT},crateCell);
 for(const index of STARTER_SEEDS){
  cells[index]={terrain:'open',reveal:null,content:{type:'item',chain:'leaf',tier:0}};
 }
 cells[FIRST_REVEALS.producer].reveal={type:'producer',producerId:PRODUCERS.ancientTree.id};
 return {
  schema:SCHEMA,phase:'first_merge',energy:20,maxEnergy:20,moves:0,cratesOpened:0,
  quest:{id:QUESTS.firstHerb.id,completed:false},cells
 };
}

export function cloneState(state){return structuredClone(state);}
export function serialize(state){return JSON.stringify(state);}
export function restore(raw){
 try{
  const s=JSON.parse(raw);
  return s?.schema===SCHEMA&&Array.isArray(s.cells)&&s.cells.length===CELL_COUNT?s:null;
 }catch{return null;}
}
