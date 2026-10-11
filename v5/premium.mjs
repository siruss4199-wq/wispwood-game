// Phase 1 art-direction sample. No game state, balance or save changes.
import {SPRITE_OVERRIDES,scene as vectorScene} from './art.mjs';
export const FIELDWORKS_SPRITES=Object.freeze(['copper-offcut','grip-tool','split-spanner','pocket-winch']);
export function enablePremium(){
 for(const [tier,name] of FIELDWORKS_SPRITES.entries())SPRITE_OVERRIDES['rig-'+tier]='assets/premium/'+name+'.webp';
}
export function prototypeScene(stage,post=0){
 return stage===0?'<img class="premiumScene" src="assets/premium/landing.webp" width="1200" height="400" alt="A sunlit saltstone coast; fallen stones block the circular Tideglass Vault door." fetchpriority="high">':vectorScene(stage,post);
}
