import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../v4/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');

test('CrazyGames entry uses the current v3 SDK and enters gameplay directly',()=>{
  const html=read('crazygames.html');
  assert.match(html,/crazygames-sdk-v3\.js/);
  assert.match(html,/id="board"/);
  assert.doesNotMatch(html,/Start Game|Play Now|main menu/i);
});

test('platform adapter reports gameplay start without enabling Basic Launch ads',()=>{
  const adapter=read('platform.mjs');
  assert.match(adapter,/await s\.init\(\)/);
  assert.match(adapter,/gameplayStart/);
  assert.match(adapter,/if\(initialized\)return true/);
  assert.doesNotMatch(adapter,/requestAd|ad\.request|rewardedAd|midgame/);
});

test('CrazyGames build is far below the 20 MB mobile-homepage initial-download target',()=>{
  const files=['crazygames.html','style.css','app.mjs','platform.mjs','core/catalog.mjs','core/state.mjs','core/engine.mjs'];
  const total=files.reduce((n,name)=>n+fs.statSync(new URL(name,root)).size,0);
  assert.ok(total<20*1024*1024,'initial local payload bytes='+total);
});

test('desktop styling explicitly supports the common embedded viewport',()=>{
  const css=read('style.css');
  assert.match(css,/min-width:760px/);
  assert.match(css,/grid-template-areas/);
  assert.match(css,/width:min\(100%,430px\)/);
});
