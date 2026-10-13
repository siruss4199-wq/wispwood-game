// Isolated art overrides: no game state, balance or save changes.
import {SPRITE_OVERRIDES,scene as vectorScene} from './art.mjs';
export const FIELDWORKS_SPRITES=Object.freeze(['copper-offcut','grip-tool','split-spanner','pocket-winch']);
export const CHAPTER_SCENES=Object.freeze(['landing','worksite','entrance','powered','vault-open']);
export const CHAPTER_SPRITES=Object.freeze({'chart-0':'chart-scrap','flux-0':'relic-fragment','source-chart':'survey-kite','source-flux':'echo-crucible','rock':'saltstone','sealed':'buried-ground','chart-1':'route-fold','flux-1':'loop-cell','chart-3':'survey-scope','flux-3':'resonator','crate-relic':'resonance-ampoule'});
const descriptions=['Fallen stones block a golden circular vault on a sunlit turquoise coast.','A coral expedition camp surveys the partially buried coastal vault.','A cleared stone causeway reaches the uncovered vault entrance.','Turquoise channels and concentric gold rings power the sealed vault.','The vault opens onto a deep violet star ocean beyond the sunlit coast.'];
const preloaded=new Set();let vibrant=true;
export function enablePremium(revision='vibrant'){
 vibrant=revision!=='phase1'&&revision!=='r2';
 const suffix=vibrant?'-vibrant':revision==='r2'?'-r2':'';
 for(const [tier,name] of FIELDWORKS_SPRITES.entries())SPRITE_OVERRIDES['rig-'+tier]='assets/premium/'+name+suffix+'.webp';
 for(const [key,name] of Object.entries(CHAPTER_SPRITES)){if(vibrant)SPRITE_OVERRIDES[key]='assets/premium/'+name+'-vibrant.webp';else delete SPRITE_OVERRIDES[key];}
 if(vibrant)SPRITE_OVERRIDES['source-rig']='assets/premium/rivet-rover-vibrant.svg';else delete SPRITE_OVERRIDES['source-rig'];
}
export function prototypeScene(stage,post=0){
 if(!vibrant&&stage>0)return vectorScene(stage,post);
 const name=CHAPTER_SCENES[stage]??CHAPTER_SCENES[4];
 // Warm only the next stage, not the entire chapter. Browser cache shares all uses.
 if(vibrant&&stage<4&&typeof Image!=='undefined'&&!preloaded.has(stage+1)){preloaded.add(stage+1);const next=new Image();next.fetchPriority='low';next.src='assets/premium/'+CHAPTER_SCENES[stage+1]+'-vibrant.webp';}
 return `<img class="premiumScene" data-stage="${stage}" src="assets/premium/${name}${vibrant?'-vibrant':''}.webp" width="1200" height="400" alt="${descriptions[stage]??descriptions[4]}" decoding="async" fetchpriority="${stage===0?'high':'auto'}">`;
}
