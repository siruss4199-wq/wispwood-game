'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Evaluate the actual game's rules in a sandbox without running browser code.
// This avoids duplicating the rules in a different test implementation.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script, 'Inline game script must exist');
const uiStart = script.indexOf("const KEY='wispwood-prototype-v1'");
assert.ok(uiStart > 0, 'Could not find boundary between game rules and browser UI');
const context = vm.createContext({});
const names = ['SIZE', 'KINDS', 'TASKS', 'GROVE_TASKS', 'TRAIL', 'CREATURES', 'rescueStage', 'currentCompanion', 'chooseCompanion', 'activeTasks', 'gainXP', 'trailInfo', 'isTrail', 'collected', 'createState', 'merge', 'deliver', 'spawn', 'recycle', 'explore', 'serialize', 'restore'];
vm.runInContext(script.slice(0, uiStart) + '\nglobalThis.game = {' + names.join(',') + '};', context, { timeout: 1000 });
const game = context.game;

test('MVP markup contains game controls and accessible board', () => {
  for (const id of ['board', 'spawnBtn', 'deliverBtn', 'recycleBtn', 'exploreBtn', 'endOverlay', 'resetBtn']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /aria-label="6 by 6 merge board"/);
});

test('a new game has a 6×6 grid, 3 tasks, and no rescue progress', () => {
  const s = game.createState();
  assert.equal(s.board.length, 36);
  assert.equal(s.board.filter(Boolean).length, 9);
  assert.equal(game.TASKS.length, 3);
  assert.equal(s.rescued, false);
  assert.equal(s.explored, false);
});

test('two identical items merge and advance the move counter', () => {
  const s = game.createState();
  assert.equal(game.merge(s, 0, 1).ok, true);
  assert.equal(s.board[0], null);
  assert.equal(s.board[1].kind, 'leaf');
  assert.equal(s.board[1].tier, 1);
  assert.equal(s.moves, 1);
});

test('illegal merges do not change items or moves', () => {
  const s = game.createState();
  assert.equal(game.merge(s, 0, 6).ok, false); // Different kind
  assert.equal(game.merge(s, 0, 0).ok, false); // Same cell
  assert.equal(game.merge(s, -1, 1).ok, false); // Out of bounds
  s.board[2] = { kind: 'leaf', tier: 3 };
  s.board[3] = { kind: 'leaf', tier: 3 };
  assert.equal(game.merge(s, 2, 3).ok, false); // Maximum tier
  assert.equal(s.board[2].tier, 3);
  assert.equal(s.moves, 0);
});

test('deterministic gathering adds one tier-zero item to an empty tile', () => {
  const s = game.createState();
  const r = game.spawn(s, () => 0);
  assert.equal(r.ok, true);
  assert.equal(s.board[r.index].kind, 'leaf');
  assert.equal(s.board[r.index].tier, 0);
  assert.equal(s.spawns, 1);
});

test('gathering rejects a full board', () => {
  const s = game.createState();
  s.board.fill({ kind: 'glow', tier: 0 });
  assert.equal(game.spawn(s, () => 0).ok, false);
  assert.equal(s.spawns, 0);
});

test('all three completed tasks rescue the creature exactly once', () => {
  const s = game.createState();
  game.TASKS.forEach((task, i) => {
    s.board[i] = { kind: task.kind, tier: task.tier };
    const result = game.deliver(s, i);
    assert.equal(result.ok, true);
    assert.equal(s.board[i], null);
  });
  assert.equal(s.completed.length, 3);
  assert.equal(s.rescued, true);
  s.board[0] = { kind: game.TASKS[0].kind, tier: game.TASKS[0].tier };
  assert.equal(game.deliver(s, 0).ok, false);
  assert.equal(s.completed.length, 3);
});

test('exploration stays locked until creature is rescued', () => {
  const s = game.createState();
  assert.equal(game.explore(s), false);
  assert.equal(s.explored, false);
  s.rescued = true;
  assert.equal(game.explore(s), true);
  assert.equal(s.explored, true);
});

test('saved progress can be restored and malformed saves are rejected', () => {
  const s = game.createState();
  s.moves = 11;
  const copy = game.restore(game.serialize(s));
  assert.equal(copy.moves, 11);
  assert.equal(copy.board.length, 36);
  assert.equal(game.restore('{not-json'), null);
  assert.equal(game.restore('{"board":[]}'), null);
  const bad = JSON.parse(game.serialize(s));
  bad.board[0] = { kind: 'unknown', tier: 1 };
  assert.equal(game.restore(JSON.stringify(bad)), null);
});

test('recycling makes a tile empty', () => {
  const s = game.createState();
  assert.equal(game.recycle(s, 0), true);
  assert.equal(s.board[0], null);
  assert.equal(game.recycle(s, 0), false);
});

test('rescue animation targets existing character element and respects reduced motion', () => {
  assert.match(html, /id="character"/);
  assert.doesNotMatch(html, /el\('creature'\)/);
  assert.match(html, /el\('character'\)\.classList\.add\('fx-rescue'\)/);
  assert.match(html, /\.creature\.happy\.fx-rescue/);
  assert.match(html, /prefers-reduced-motion:reduce/);
  assert.match(html, /class="mivra-eye"/);
});

test('Mivra rescue unlocks Moonlit Grove and changes the active tasks', () => {
 const state=game.createState();
 assert.equal(game.explore(state),false);
 for(let i=0;i<game.TASKS.length;i++){
  const t=game.TASKS[i];state.board[i]={kind:t.kind,tier:t.tier};
  assert.equal(game.deliver(state,i).ok,true);
 }
 assert.equal(state.rescued,true);
 assert.equal(game.explore(state),true);
 assert.equal(game.explore(state),false);
 assert.equal(game.activeTasks(state).length,3);
 assert.equal(game.activeTasks(state)[0].tier,3);
});

test('Bloom, Moonwell, and Aurora rescue Orru exactly once', () => {
 const state=game.createState();state.rescued=true;
 assert.equal(game.explore(state),true);
 for(let i=0;i<game.GROVE_TASKS.length;i++){
  const t=game.GROVE_TASKS[i];state.board[i]={kind:t.kind,tier:t.tier};
  const result=game.deliver(state,i);
  assert.equal(result.ok,true);
  assert.equal(result.friend,'Orru');
 }
 assert.equal(state.orruRescued,true);
 assert.equal(state.groveCompleted.length,3);
 assert.equal(game.collected(state).filter(x=>x.unlocked).length,2);
 state.board[0]={kind:'leaf',tier:3};
 assert.equal(game.deliver(state,0).ok,false);
});

test('legacy v0.3 saves migrate without deleting items or progress', () => {
 const legacy=game.createState();
 delete legacy.groveCompleted;delete legacy.orruRescued;
 legacy.rescued=true;legacy.completed=['heal','drink','light'];
 legacy.explored=true;
 const loaded=game.restore(JSON.stringify(legacy));
 assert.ok(loaded);
 assert.equal(loaded.rescued,true);
 assert.equal(loaded.explored,true);
 assert.equal(loaded.orruRescued,false);
 assert.equal(loaded.board.length,36);
 assert.equal(loaded.groveCompleted.length,0);
});

test('new chapter 2 interface and modal are present and dismissible', () => {
 for(const id of ['collection','collectionCount','worldHint','sceneLabel','tasksTitle','overlayTitle','overlayText'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/el\('endOverlay'\)\.hidden=true/);
 assert.doesNotMatch(html,/if\(state\.explored\)el\('endOverlay'\)\.hidden=false/);
});

test('restoration trail unlocks only after rescuing Orru', () => {
 const s=game.createState();
 assert.equal(game.isTrail(s),false);
 s.rescued=true;s.explored=true;s.orruRescued=true;
 assert.equal(game.isTrail(s),true);
 assert.equal(game.activeTasks(s).length,3);
 assert.equal(game.trailInfo(s).name,'Whispering Bridge');
});

test('restoration quests advance through all 3 zones exactly once', () => {
 const s=game.createState();s.rescued=true;s.explored=true;s.orruRescued=true;
 for(let zone=0;zone<3;zone++){
  for(let i=0;i<3;i++){
   const task=game.TRAIL[zone].tasks[i];
   s.board[i]={kind:task.kind,tier:task.tier};
   const result=game.deliver(s,i);
   assert.equal(result.ok,true);
   assert.equal(result.completedStage,i===2);
   if(i<2)assert.equal(s.trailIndex,zone);
  }
  assert.equal(s.trailIndex,zone+1);
  assert.equal(s.trailCompleted.length,0);
 }
 assert.equal(game.activeTasks(s).length,0);
 s.board[0]={kind:'glow',tier:3};
 assert.equal(game.deliver(s,0).ok,false);
 assert.equal(s.trailIndex,3);
 assert.ok(s.xp>=300);
});

test('merges grant XP and rescued friends give periodic free items', () => {
 const s=game.createState();
 const first=game.merge(s,0,1);
 assert.equal(first.ok,true);assert.ok(s.xp>0);
 s.rescued=true;s.orruRescued=true;
 s.spawns=7;
 const result=game.spawn(s,()=>0);
 assert.equal(result.ok,true);
 assert.equal(result.helper,'Orru');
 assert.equal(s.bonusItems,1);
 assert.equal(s.spawns,8);
 assert.equal(s.board.filter(Boolean).length,10); // initial 9, merged 2->1, then 2 spawned
});

test('XP levels advance at 75 points with no level gaps', () => {
 const s=game.createState();
 assert.equal(s.level,1);
 game.gainXP(s,75);
 assert.equal(s.level,2);
 game.gainXP(s,150);
 assert.equal(s.level,4);
});

test('old v0.4 saves migrate to restoration progression without resetting board', () => {
 const s=game.createState();
 s.rescued=true;s.explored=true;s.orruRescued=true;
 s.completed=['heal','drink','light'];
 s.groveCompleted=['grove-bloom','grove-well','grove-aurora'];
 delete s.trailIndex;delete s.trailCompleted;delete s.xp;delete s.level;delete s.bonusItems;
 const loaded=game.restore(JSON.stringify(s));
 assert.ok(loaded);assert.equal(loaded.rescued,true);
 assert.equal(loaded.orruRescued,true);
 assert.equal(loaded.trailIndex,0);
 assert.equal(loaded.board.length,36);
 assert.equal(loaded.level,1);
});

test('level, restoration map and creature collection UI exist', () => {
 for(const id of ['trailPanel','trailStops','trailCount','trailDescription','levelLabel','xpLabel','levelBar'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/r\.completedStage/);
 assert.match(html,/r\.helper/);
});

test('merge garden uses semantic item colours and a clear legend', () => {
 for(const cls of ['legend-leaf','legend-dew','legend-glow','board-frame','board-caption','tier-pips'])
  assert.match(html,new RegExp(cls));
 assert.match(html,/\.tile\.leaf\{/);
 assert.match(html,/\.tile\.dew\{/);
 assert.match(html,/\.tile\.glow\{/);
});

test('matching item highlighting excludes selected and maximum-tier items', () => {
 assert.match(html,/i!==selected&&item\.kind===picked\.kind&&item\.tier===picked\.tier&&item\.tier<MAX_TIER/);
 assert.match(html,/cell\.classList\.add\('merge-match'\)/);
 assert.match(html,/aria-pressed/);
 assert.match(html,/prefers-reduced-motion:reduce/);
});

test('rescue stages follow delivered items in either chapter', () => {
 const gameState=game.createState();
 assert.equal(game.rescueStage(gameState,'mivra'),0);
 for(let i=0;i<game.TASKS.length;i++){
  const t=game.TASKS[i];gameState.board[i]={kind:t.kind,tier:t.tier};
  assert.equal(game.deliver(gameState,i).ok,true);
  assert.equal(game.rescueStage(gameState,'mivra'),i+1);
 }
 game.explore(gameState);
 for(let i=0;i<game.GROVE_TASKS.length;i++){
  const t=game.GROVE_TASKS[i];gameState.board[i]={kind:t.kind,tier:t.tier};
  assert.equal(game.deliver(gameState,i).ok,true);
  assert.equal(game.rescueStage(gameState,'orru'),i+1);
 }
});

test('only rescued creatures can be selected and saved', () => {
 const state=game.createState();
 assert.equal(game.chooseCompanion(state,'mivra'),false);
 assert.equal(game.chooseCompanion(state,'orru'),false);
 assert.equal(game.chooseCompanion(state,'unknown'),false);
 state.rescued=true;
 assert.equal(game.chooseCompanion(state,'mivra'),true);
 assert.equal(game.currentCompanion(state),'mivra');
 state.orruRescued=true;
 assert.equal(game.chooseCompanion(state,'orru'),true);
 assert.equal(game.currentCompanion(state),'orru');
 assert.equal(game.restore(game.serialize(state)).activeCompanion,'orru');
});

test('selected Mivra gives Spark and selected Orru gives Seed every eighth gather', () => {
 const state=game.createState();state.rescued=true;state.orruRescued=true;
 assert.equal(game.chooseCompanion(state,'mivra'),true);
 state.spawns=7;
 let result=game.spawn(state,()=>0);
 assert.equal(result.helper,'Mivra');
 assert.equal(state.board[result.bonusIndex].kind,'glow');
 assert.equal(game.chooseCompanion(state,'orru'),true);
 state.spawns=15;
 result=game.spawn(state,()=>0);
 assert.equal(result.helper,'Orru');
 assert.equal(state.board[result.bonusIndex].kind,'leaf');
 assert.equal(state.bonusItems,2);
});

test('bonus is skipped transparently if only one free tile remains', () => {
 const state=game.createState();state.rescued=true;
 assert.equal(game.chooseCompanion(state,'mivra'),true);
 state.board.fill({kind:'leaf',tier:0});
 state.board[0]=null;state.spawns=7;
 const result=game.spawn(state,()=>0);
 assert.equal(result.ok,true);
 assert.equal(result.bonusSkipped,true);
 assert.equal(result.helper,null);
 assert.equal(state.bonusItems,0);
});

test('v0.6 save migration keeps existing progress and assigns a rescued companion', () => {
 const old=game.createState();old.rescued=true;old.explored=true;old.orruRescued=true;
 old.groveCompleted=['grove-bloom','grove-well','grove-aurora'];
 delete old.activeCompanion;
 old.trailIndex=1;old.xp=165;old.level=3;
 const restored=game.restore(JSON.stringify(old));
 assert.equal(restored.activeCompanion,'mivra');
 assert.equal(restored.orruRescued,true);
 assert.equal(restored.trailIndex,1);
 assert.equal(restored.xp,165);
});

test('Sanctuary profiles and visual rescue stages are in the interface', () => {
 for(const id of ['creatureOverlay','creaturePortrait','creatureTitle','creatureRole','creatureAbility','companionSelect','creatureClose','rescueVeil','sceneEffect'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/stage-\x27\+i/);
 assert.match(html,/CREATURE SANCTUARY/);
 assert.match(html,/MIVRA_ART:ORRU_ART/);
 assert.match(html,/prefers-reduced-motion:reduce/);
});
