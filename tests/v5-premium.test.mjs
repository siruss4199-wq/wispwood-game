import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {FIELDWORKS_SPRITES,CHAPTER_SCENES,CHAPTER_SPRITES,enablePremium,prototypeScene} from '../v5/premium.mjs';
import {art,scene,SPRITE_OVERRIDES} from '../v5/art.mjs';
test('Chapter art overrides remain isolated from legacy review modes and game rules',()=>{
 enablePremium();assert.equal(Object.keys(SPRITE_OVERRIDES).length,9);
 for(let tier=0;tier<8;tier++)assert.match(art({type:'item',family:'rig',tier}),tier<4?/<img[^>]+\.webp/:/<svg/);
 for(const f of ['chart','flux']){assert.match(art({type:'item',family:f,tier:0}),/<img/);for(let tier=1;tier<8;tier++)assert.match(art({type:'item',family:f,tier}),/<svg/);}
 for(let stage=0;stage<5;stage++)assert.ok(prototypeScene(stage).includes(CHAPTER_SCENES[stage]+'-vibrant.webp'));
 assert.match(prototypeScene(0),/premiumScene.*alt=/);
 assert.match(art({type:'item',family:'rig',tier:0}),/copper-offcut-vibrant.webp/);
 assert.match(art({type:'source',id:'rig'}),/rivet-rover-vibrant.svg/);
 for(const id of ['chart','flux'])assert.match(art({type:'source',id}),/<img/);
 assert.match(prototypeScene(0),/landing-vibrant.webp/);
 enablePremium('r2');assert.match(art({type:'item',family:'rig',tier:0}),/copper-offcut-r2.webp/);assert.equal(SPRITE_OVERRIDES['source-rig'],undefined);assert.match(prototypeScene(0),/landing.webp/);
 for(let stage=1;stage<5;stage++)assert.equal(prototypeScene(stage),scene(stage));for(const key of Object.keys(CHAPTER_SPRITES))assert.equal(SPRITE_OVERRIDES[key],undefined);
 enablePremium('phase1');assert.match(art({type:'item',family:'rig',tier:0}),/copper-offcut.webp/);
 for(const key of Object.keys(SPRITE_OVERRIDES))delete SPRITE_OVERRIDES[key];
});
test('local WebP payload is bounded and both entry points load the isolated visual layer',()=>{
 let total=0;for(const name of [...FIELDWORKS_SPRITES.map(n=>n+'-vibrant'),'landing-vibrant','saltstone-tray']){const b=fs.readFileSync(new URL('../v5/assets/premium/'+name+'.webp',import.meta.url));assert.equal(b.toString('ascii',8,12),'WEBP');total+=b.length;}
 assert.ok(total<400000,'prototype asset payload under 400KB');
 for(const name of ['index.html','crazygames.html'])assert.match(fs.readFileSync(new URL('../v5/'+name,import.meta.url),'utf8'),/premium.css/);
});

test('chapter assets have bounded mobile payload and distinct stage files',()=>{
 let total=0;for(const name of [...CHAPTER_SCENES.slice(1),...Object.values(CHAPTER_SPRITES)]){const b=fs.readFileSync(new URL('../v5/assets/premium/'+name+'-vibrant.webp',import.meta.url));assert.equal(b.toString('ascii',8,12),'WEBP');total+=b.length;}
 assert.ok(total<800000,'additional chapter payload stays under 800 KB');
});
