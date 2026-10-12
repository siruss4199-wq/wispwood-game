import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {FIELDWORKS_SPRITES,enablePremium,prototypeScene} from '../v5/premium.mjs';
import {art,scene,SPRITE_OVERRIDES} from '../v5/art.mjs';
test('Vibrant slice changes four items and one producer, never other families or later scenes',()=>{
 enablePremium();assert.deepEqual(Object.keys(SPRITE_OVERRIDES),['rig-0','rig-1','rig-2','rig-3','source-rig']);
 for(let tier=0;tier<8;tier++)assert.match(art({type:'item',family:'rig',tier}),tier<4?/<img[^>]+\.webp/:/<svg/);
 for(const f of ['chart','flux'])assert.match(art({type:'item',family:f,tier:0}),/<svg/);
 for(let stage=1;stage<5;stage++)assert.equal(prototypeScene(stage),scene(stage));
 assert.match(prototypeScene(0),/premiumScene.*alt=/);
 assert.match(art({type:'item',family:'rig',tier:0}),/copper-offcut-vibrant.webp/);
 assert.match(art({type:'source',id:'rig'}),/rivet-rover-vibrant.svg/);
 for(const id of ['chart','flux'])assert.match(art({type:'source',id}),/<svg/);
 assert.match(prototypeScene(0),/landing-vibrant.webp/);
 enablePremium('r2');assert.match(art({type:'item',family:'rig',tier:0}),/copper-offcut-r2.webp/);assert.equal(SPRITE_OVERRIDES['source-rig'],undefined);assert.match(prototypeScene(0),/landing.webp/);
 enablePremium('phase1');assert.match(art({type:'item',family:'rig',tier:0}),/copper-offcut.webp/);
 for(const key of Object.keys(SPRITE_OVERRIDES))delete SPRITE_OVERRIDES[key];
});
test('local WebP payload is bounded and both entry points load the isolated visual layer',()=>{
 let total=0;for(const name of [...FIELDWORKS_SPRITES.map(n=>n+'-vibrant'),'landing-vibrant','saltstone-tray']){const b=fs.readFileSync(new URL('../v5/assets/premium/'+name+'.webp',import.meta.url));assert.equal(b.toString('ascii',8,12),'WEBP');total+=b.length;}
 assert.ok(total<400000,'prototype asset payload under 400KB');
 for(const name of ['index.html','crazygames.html'])assert.match(fs.readFileSync(new URL('../v5/'+name,import.meta.url),'utf8'),/premium.css/);
});
