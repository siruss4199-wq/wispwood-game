import {itemDef,producerStage,producerForm} from './core/catalog.mjs';
export function itemArt(chain,tier){
 const d=itemDef(chain,tier);
 return `<img class="craftArt" src="./assets/${d.art}.svg" alt="" draggable="false" width="64" height="64">`;
}
export function producerArt(s,id){
 return `<img class="craftArt workshopArt" src="./assets/${id}-${producerStage(s,id)}.svg" alt="" title="${producerForm(s,id)}" draggable="false" width="64" height="64">`;
}
