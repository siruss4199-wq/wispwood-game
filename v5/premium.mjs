// Isolated art overrides: no game state, balance or save changes.
import {SPRITE_OVERRIDES,scene as vectorScene} from './art.mjs';
export const FIELDWORKS_SPRITES=Object.freeze(['copper-offcut','grip-tool','split-spanner','pocket-winch']);
let vibrant=true;
export function enablePremium(revision='vibrant'){
 vibrant=revision!=='phase1'&&revision!=='r2';
 const suffix=vibrant?'-vibrant':revision==='r2'?'-r2':'';
 for(const [tier,name] of FIELDWORKS_SPRITES.entries())SPRITE_OVERRIDES['rig-'+tier]='assets/premium/'+name+suffix+'.webp';
 if(vibrant)SPRITE_OVERRIDES['source-rig']='assets/premium/rivet-rover-vibrant.svg';
 else delete SPRITE_OVERRIDES['source-rig'];
}
export function prototypeScene(stage,post=0){
 return stage===0?`<img class="premiumScene" src="assets/premium/landing${vibrant?'-vibrant':''}.webp" width="1200" height="400" alt="A sunlit saltstone coast; fallen stones block the circular Tideglass Vault door." fetchpriority="high">`:vectorScene(stage,post);
}
