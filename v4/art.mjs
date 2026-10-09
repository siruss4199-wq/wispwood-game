import {producerVisual,frontierVariant,itemHierarchy} from './presentation.mjs';
import {itemDef,producerStage,producerForm} from './core/catalog.mjs';
export function itemArt(chain,tier){
 const d=itemDef(chain,tier);
 return `<img class="craftArt material-${chain} art-${itemHierarchy(tier)}" src="./assets/${d.art}.svg" alt="" draggable="false" width="64" height="64">`;
}
export function producerArt(s,id){
 const visual=producerVisual(s,id);
 return `<span class="workshopStage stage-${visual.stage}" aria-hidden="true"></span><img class="craftArt workshopArt" src="./assets/${visual.asset}.svg" alt="" title="${producerForm(s,id)}" draggable="false" width="64" height="64">`;
}
export function frontierArt(index,next=false){
 return `<img class="frontierArt" src="./assets/frontier-${frontierVariant(index)}.svg" alt="" draggable="false" width="64" height="64"><span class="frontierFog"></span>${next?'<span class="frontierTrail" aria-hidden="true">✧</span>':''}`;
}

export function residentArt(slot=0){
 return `<img class="craftArt" src="./assets/resident-${slot%4}.svg" alt="" draggable="false" width="64" height="64">`;
}
